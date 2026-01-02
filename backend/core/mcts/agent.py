"""MCTS Agent for conversational AI."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Literal

from backend.core.mcts.aggregator import aggregate_majority_vote
from backend.core.mcts.tree import MCTSTree, generate_node_id
from backend.core.mcts.types import (
    AggregatedScore,
    BranchStrategy,
    MCTSNode,
    MCTSRunResult,
    NodeStatus,
    TokenTracker,
    UserIntent,
)
from backend.core.prompts import prompts
from backend.llm.client import LLM
from backend.llm.types import Completion, Message

# Scoring mode type
ScoringMode = Literal["absolute", "comparative"]

logger = logging.getLogger(__name__)


def _log(phase: str, message: str, indent: int = 0) -> None:
    """Print a formatted log message with phase indicator."""
    prefix = "  " * indent
    print(f"[MCTS:{phase}] {prefix}{message}")


class MCTSAgent:
    """
    Monte Carlo Tree Search agent for conversational AI.

    Explores multiple conversation branches in parallel, scores them with
    multiple judges, and prunes to focus on promising paths.

    Usage:
        agent = MCTSAgent(
            llm=llm,
            goal="Help user debug their code",
            first_message="I'm having trouble with my Python script",
            init_branch=6,
            deep_research=False,
        )
        result = await agent.run(rounds=2)
        print(result.best_messages)
    """

    def __init__(
        self,
        *,
        llm: LLM,
        goal: str,
        first_message: str,
        init_branch: int = 6,
        deep_research: bool = False,
        turns_per_branch: int = 5,
        user_intents_per_branch: int = 3,
        scoring_mode: ScoringMode = "comparative",
        prune_threshold: float = 6.5,
        keep_top_k: int | None = None,
        min_survivors: int = 1,
        max_concurrency: int = 16,
        model: str | None = None,
        temperature: float = 0.7,
        judge_temperature: float = 0.3,
    ) -> None:
        """
        Initialize the MCTS agent.

        Args:
            llm: LLM client for completions.
            goal: Conversation goal/objective.
            first_message: Initial user message to start the conversation.
            init_branch: Number of initial branches to create.
            deep_research: Whether to include deep research context.
            turns_per_branch: Number of turns (user+assistant) per expansion.
            user_intents_per_branch: Number of user intents to fork per expansion (1 = no forking).
            scoring_mode: "absolute" (3 independent judges) or "comparative" (forced ranking).
            prune_threshold: Score threshold for pruning (0-10).
            keep_top_k: Keep only top K branches after pruning (optional).
            min_survivors: Minimum branches to keep even if below threshold.
            max_concurrency: Maximum concurrent LLM calls.
            model: Model to use for completions.
            temperature: Temperature for conversation generation.
            judge_temperature: Temperature for judge evaluations (lower = more deterministic).
        """
        self.llm = llm
        self.goal = goal
        self.first_message = first_message
        self.init_branch = init_branch
        self.deep_research = deep_research
        self.turns_per_branch = turns_per_branch
        self.user_intents_per_branch = user_intents_per_branch
        self.scoring_mode = scoring_mode
        self.prune_threshold = prune_threshold
        self.keep_top_k = keep_top_k
        self.min_survivors = min_survivors
        self.max_concurrency = max_concurrency
        # Auto-detect model from LLM client if not explicitly provided
        self.model = model or getattr(llm, "_default_model", None)
        self.temperature = temperature
        self.judge_temperature = judge_temperature

        self._sem = asyncio.Semaphore(max_concurrency)
        self._tree: MCTSTree | None = None
        self._token_tracker = TokenTracker(model_name=self.model or "unknown")

    async def run(self, rounds: int = 1) -> MCTSRunResult:
        """
        Execute the MCTS search.

        Args:
            rounds: Number of expansion/pruning rounds.

        Returns:
            MCTSRunResult with best trajectory and tree statistics.
        """
        print("\n" + "=" * 60)
        print("MCTS AGENT - Starting Search")
        print("=" * 60)
        _log("INIT", f"Goal: {self.goal[:50]}...")
        _log(
            "INIT",
            f"Branches: {self.init_branch} | Turns: {self.turns_per_branch} | Rounds: {rounds}",
        )
        if self.user_intents_per_branch > 1:
            _log(
                "INIT",
                f"User intent forking: {self.user_intents_per_branch} intents per branch",
            )
        _log("INIT", f"Scoring mode: {self.scoring_mode}")

        # Initialize tree with root and initial branches
        _log("INIT", "Creating tree structure...")
        tree = await self._initialize_tree()
        self._tree = tree

        total_pruned = 0

        for round_num in range(rounds):
            print("\n" + "-" * 40)
            _log("ROUND", f"Round {round_num + 1}/{rounds}")
            print("-" * 40)

            # Get active leaves to expand
            active_leaves = tree.active_leaves()
            if not active_leaves:
                logger.warning("No active leaves to expand")
                break

            # Skip root node (it has no strategy)
            expandable = [n for n in active_leaves if n.strategy is not None]
            if not expandable:
                logger.warning("No expandable nodes (no strategies)")
                break

            # Expand all branches in parallel
            _log(
                "EXPAND",
                f"Expanding {len(expandable)} branches ({self.turns_per_branch} turns each)...",
            )
            expanded_nodes = await self._expand_branches_parallel(
                expandable, turns=self.turns_per_branch
            )
            _log("EXPAND", f"Completed {len(expanded_nodes)} expansions", indent=1)

            # Score all expanded branches
            if self.scoring_mode == "comparative":
                _log(
                    "JUDGE", f"Comparative ranking of {len(expanded_nodes)} branches..."
                )
                scores_by_id = await self._judge_branches_comparative(expanded_nodes)
            else:
                _log(
                    "JUDGE",
                    f"Scoring {len(expanded_nodes)} branches (3 judges each)...",
                )
                scores_by_id = await self._judge_branches_parallel(expanded_nodes)

            # Log scores
            for node in expanded_nodes:
                if node.id in scores_by_id:
                    score = scores_by_id[node.id]
                    strategy_name = (
                        node.strategy.tagline if node.strategy else "unknown"
                    )
                    intent_label = (
                        f" [{node.user_intent.label}]" if node.user_intent else ""
                    )
                    _log(
                        "JUDGE",
                        f"'{strategy_name}'{intent_label}: {score.aggregated_score:.1f}/10 (votes: {score.individual_scores})",
                        indent=1,
                    )

            # Backpropagate scores
            for node in expanded_nodes:
                if node.id in scores_by_id:
                    score = scores_by_id[node.id].aggregated_score
                    tree.backpropagate(node.id, score)

            # Prune low-scoring branches
            _log("PRUNE", f"Pruning (threshold: {self.prune_threshold})...")
            survivors = self._prune(expanded_nodes, scores_by_id)
            pruned_count = len(expanded_nodes) - len(survivors)
            total_pruned += pruned_count
            _log(
                "PRUNE",
                f"Kept {len(survivors)} branches, pruned {pruned_count}",
                indent=1,
            )

            for node in survivors:
                strategy_name = node.strategy.tagline if node.strategy else "unknown"
                intent_label = (
                    f" [{node.user_intent.label}]" if node.user_intent else ""
                )
                _log("PRUNE", f"Survivor: '{strategy_name}'{intent_label}", indent=2)

        # Find best result
        best_node = tree.best_leaf_by_score()

        print("\n" + "=" * 60)
        _log("DONE", "Search complete!")
        if best_node:
            best_strategy = best_node.strategy.tagline if best_node.strategy else "root"
            _log(
                "DONE",
                f"Best branch: '{best_strategy}' with score {best_node.stats.aggregated_score:.1f}/10",
            )
        print("=" * 60 + "\n")

        # Print token usage summary
        self._token_tracker.print_summary()

        return MCTSRunResult(
            best_node_id=best_node.id if best_node else None,
            best_score=best_node.stats.aggregated_score if best_node else 0.0,
            best_messages=list(best_node.messages) if best_node else [],
            all_nodes=tree.all_nodes(),
            pruned_count=total_pruned,
            token_usage=self._token_tracker.to_dict(),
            total_rounds=rounds,
        )

    async def _initialize_tree(self) -> MCTSTree:
        """Initialize tree with root node and generate initial branches."""
        # Create root node
        root = MCTSNode(
            id=generate_node_id(),
            depth=0,
            messages=[Message.user(self.first_message)],
        )
        tree = MCTSTree.create(root)

        # Generate initial branch strategies
        _log("INIT", "Generating branch strategies...", indent=1)
        strategies = await self._generate_initial_branches()
        _log("INIT", f"Generated {len(strategies)} strategies:", indent=1)

        for i, strategy in enumerate(strategies, 1):
            _log("INIT", f"{i}. {strategy.tagline}", indent=2)

        # Create child nodes for each strategy
        for strategy in strategies:
            child = MCTSNode(
                id=generate_node_id(),
                strategy=strategy,
                messages=[Message.user(self.first_message)],
            )
            tree.add_child(root.id, child)

        _log("INIT", f"Tree initialized with {len(strategies)} branches", indent=1)
        return tree

    async def _generate_initial_branches(self) -> list[BranchStrategy]:
        """Generate initial branch strategies using the tree generator prompt."""
        deep_research_context = self._get_deep_research_context()

        prompt = prompts.conversation_tree_generator(
            num_nodes=self.init_branch,
            conversation_goal=self.goal,
            conversation_context=self.first_message,
            deep_research_context=deep_research_context,
        )

        completion = await self._call_llm_json(prompt, phase="strategy")

        if not completion:
            logger.error("Failed to generate initial branches")
            return []

        strategies = []
        nodes_data = completion.get("nodes", {})

        for tagline, description in nodes_data.items():
            strategies.append(
                BranchStrategy(tagline=tagline, description=str(description))
            )

        return strategies

    async def _generate_user_intents(
        self, history: list[Message], num_intents: int
    ) -> list[UserIntent]:
        """Generate diverse user response intents for branch forking."""
        prompt = prompts.user_intent_generator(
            num_intents=num_intents,
            conversation_goal=self.goal,
            conversation_history=self._format_history(history),
        )

        completion = await self._call_llm_json(prompt, phase="intent")

        if not completion:
            logger.warning("Failed to generate user intents, returning empty list")
            return []

        intents = []
        intents_data = completion.get("intents", [])

        for intent_data in intents_data:
            try:
                intents.append(
                    UserIntent(
                        id=intent_data.get("id", "unknown"),
                        label=intent_data.get("label", "Unknown"),
                        description=intent_data.get("description", ""),
                        emotional_tone=intent_data.get("emotional_tone", "neutral"),
                        cognitive_stance=intent_data.get("cognitive_stance", "neutral"),
                    )
                )
            except Exception as e:
                logger.warning(f"Failed to parse intent: {e}")
                continue

        return intents

    async def _expand_branches_parallel(
        self,
        nodes: list[MCTSNode],
        turns: int,
    ) -> list[MCTSNode]:
        """
        Expand all branches in parallel with user intent forking.

        For each node:
        1. Generate N diverse user intents (if user_intents_per_branch > 1)
        2. Fork into N child nodes, each with a different intent
        3. Expand each child linearly for `turns` turns

        Returns all expanded child nodes (forked branches).
        """
        if self.user_intents_per_branch <= 1:
            # No forking - original behavior
            tasks = [self._expand_branch_linear(node, turns) for node in nodes]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            expanded = []
            for node, result in zip(nodes, results):
                if isinstance(result, Exception):
                    logger.error(f"Error expanding node {node.id}: {result}")
                    node.status = NodeStatus.ERROR
                else:
                    expanded.append(result)
            return expanded

        # With forking: SCATTER-GATHER pattern for maximum parallelism
        # Step 1: Generate intents for ALL nodes simultaneously
        _log(
            "FORK",
            f"Generating {self.user_intents_per_branch} user intents for {len(nodes)} nodes in parallel...",
            indent=1,
        )
        intent_tasks = [
            self._generate_user_intents(node.messages, self.user_intents_per_branch)
            for node in nodes
        ]
        all_intents = await asyncio.gather(*intent_tasks, return_exceptions=True)

        # Step 2: Create expansion workload (flatten all fork tasks)
        expansion_tasks: list[asyncio.Task] = []
        fork_children: list[MCTSNode] = []
        fallback_nodes: list[MCTSNode] = []

        for node, intents_result in zip(nodes, all_intents):
            # Handle intent generation failures
            if isinstance(intents_result, Exception):
                logger.warning(
                    f"Intent generation failed for node {node.id}: {intents_result}"
                )
                fallback_nodes.append(node)
                continue

            intents = intents_result
            if not intents:
                logger.warning(
                    f"No intents generated for node {node.id}, expanding without fork"
                )
                fallback_nodes.append(node)
                continue

            # Log the generated intents
            strategy_name = node.strategy.tagline if node.strategy else "root"
            _log("FORK", f"'{strategy_name}': {len(intents)} intents", indent=2)
            for intent in intents:
                _log("FORK", f"  [{intent.emotional_tone}] {intent.label}", indent=2)

            # Create forked child nodes and queue expansion tasks
            for intent in intents:
                child = MCTSNode(
                    id=generate_node_id(),
                    parent_id=node.id,
                    depth=node.depth + 1,
                    strategy=node.strategy,
                    user_intent=intent,
                    messages=list(node.messages),
                )
                fork_children.append(child)
                if self._tree:
                    self._tree.add_child(node.id, child)
                expansion_tasks.append(
                    self._expand_branch_with_intent(child, turns, intent)
                )

        # Add fallback linear expansions
        for node in fallback_nodes:
            expansion_tasks.append(self._expand_branch_linear(node, turns))

        # Step 3: Execute ALL expansions with as_completed for resilience
        # This allows processing results as they arrive and handles timeouts gracefully
        _log(
            "FORK",
            f"Expanding {len(expansion_tasks)} branches (as_completed)...",
            indent=1,
        )

        all_expanded: list[MCTSNode] = []
        completed_count = 0
        failed_count = 0
        timeout_per_task = 120.0  # 2 minutes per expansion

        for coro in asyncio.as_completed(
            expansion_tasks, timeout=timeout_per_task * len(expansion_tasks)
        ):
            try:
                result = await asyncio.wait_for(coro, timeout=timeout_per_task)
                if isinstance(result, MCTSNode):
                    all_expanded.append(result)
                    completed_count += 1
            except asyncio.TimeoutError:
                logger.warning("Expansion task timed out, treating as failed branch")
                failed_count += 1
            except Exception as e:
                logger.error(f"Error expanding branch: {e}")
                failed_count += 1

        _log(
            "FORK",
            f"Completed: {completed_count} | Failed/Timeout: {failed_count}",
            indent=1,
        )

        return all_expanded

    # Termination signals that indicate conversation should end early
    TERMINATION_SIGNALS = [
        "goodbye",
        "bye",
        "i'm done",
        "i have to go",
        "thanks, bye",
        "i'm leaving",
        "end conversation",
        "stop",
        "quit",
        "exit",
        "i give up",
        "forget it",
        "never mind",
        "this isn't working",
        "i'm confused",
        "you're not helping",
        "i don't understand",
    ]

    def _should_terminate_early(self, user_response: str) -> bool:
        """Check if user response signals conversation should terminate."""
        response_lower = user_response.lower().strip()
        for signal in self.TERMINATION_SIGNALS:
            if signal in response_lower:
                return True
        # Also check for very short frustrated responses
        if len(response_lower) < 20 and any(
            w in response_lower for w in ["no", "nope", "wrong", "bad", "ugh"]
        ):
            return True
        return False

    async def _expand_branch_linear(self, node: MCTSNode, turns: int) -> MCTSNode:
        """
        Expand a branch linearly (no forking) for n turns.

        Each turn consists of:
        1. Simulate user response (no specific intent)
        2. Generate assistant response (goal-directed, following strategy)

        Supports EARLY EXIT: terminates if user signals end of conversation.
        """
        history = list(node.messages)

        for turn_idx in range(turns):
            # A. Simulate user response (no specific intent)
            user_response = await self._simulate_user(history)
            history.append(Message.user(user_response))
            _log(
                "EXPAND",
                f"[Turn {turn_idx + 1}] User: {user_response[:100]}...",
                indent=2,
            )

            # Early exit check: did user signal termination?
            if self._should_terminate_early(user_response):
                _log(
                    "EXPAND",
                    f"[Turn {turn_idx + 1}] EARLY EXIT: User signaled termination",
                    indent=2,
                )
                node.status = NodeStatus.TERMINAL
                break

            # B. Generate assistant response following strategy
            assistant_response = await self._generate_assistant(history, node.strategy)
            history.append(Message.assistant(assistant_response))
            _log(
                "EXPAND",
                f"[Turn {turn_idx + 1}] Assistant: {assistant_response[:100]}...",
                indent=2,
            )

        # Update node with expanded trajectory
        node.messages = history
        return node

    async def _expand_branch_with_intent(
        self, node: MCTSNode, turns: int, first_intent: UserIntent
    ) -> MCTSNode:
        """
        Expand a branch where the first user response follows a specific intent.

        After the first turn, subsequent user responses are generated freely.
        Supports EARLY EXIT: terminates if user signals end of conversation.
        """
        history = list(node.messages)

        for turn_idx in range(turns):
            # A. Simulate user response
            if turn_idx == 0:
                # First turn: use the specific intent
                user_response = await self._simulate_user(
                    history, user_intent=first_intent
                )
                _log(
                    "EXPAND",
                    f"[Turn 1][{first_intent.label}] User: {user_response[:100]}...",
                    indent=2,
                )
            else:
                # Subsequent turns: free simulation
                user_response = await self._simulate_user(history)
                _log(
                    "EXPAND",
                    f"[Turn {turn_idx + 1}] User: {user_response[:100]}...",
                    indent=2,
                )

            history.append(Message.user(user_response))

            # Early exit check: did user signal termination?
            if self._should_terminate_early(user_response):
                _log(
                    "EXPAND",
                    f"[Turn {turn_idx + 1}] EARLY EXIT: User signaled termination",
                    indent=2,
                )
                node.status = NodeStatus.TERMINAL
                break

            # B. Generate assistant response following strategy
            assistant_response = await self._generate_assistant(history, node.strategy)
            history.append(Message.assistant(assistant_response))
            _log(
                "EXPAND",
                f"[Turn {turn_idx + 1}] Assistant: {assistant_response[:100]}...",
                indent=2,
            )

        # Update node with expanded trajectory
        node.messages = history
        return node

    async def _simulate_user(
        self,
        history: list[Message],
        user_intent: UserIntent | None = None,
    ) -> str:
        """
        Simulate a user response.

        Args:
            history: Conversation history so far.
            user_intent: Optional specific intent for the user response.
        """
        # Convert UserIntent to dict format expected by the prompt
        intent_dict = None
        if user_intent:
            intent_dict = {
                "label": user_intent.label,
                "description": user_intent.description,
                "emotional_tone": user_intent.emotional_tone,
                "cognitive_stance": user_intent.cognitive_stance,
            }

        system_prompt = prompts.user_simulation(
            conversation_goal=self.goal,
            conversation_history=self._format_history(history),
            user_intent=intent_dict,
        )
        messages = [Message.system(system_prompt)] + history

        completion = await self._call_llm(messages, phase="user")
        return completion.message.content or ""

    async def _generate_assistant(
        self,
        history: list[Message],
        strategy: BranchStrategy | None,
    ) -> str:
        """Generate an assistant response following the strategy."""
        system_prompt = prompts.assistant_continuation(
            conversation_goal=self.goal,
            conversation_history=self._format_history(history),
            strategy_tagline=strategy.tagline if strategy else "",
            strategy_description=strategy.description if strategy else "",
        )

        messages = [Message.system(system_prompt)] + history
        completion = await self._call_llm(messages, phase="assistant")
        return completion.message.content or ""

    async def _judge_branches_parallel(
        self,
        nodes: list[MCTSNode],
    ) -> dict[str, AggregatedScore]:
        """Score all branches with 3 parallel judges each."""
        tasks = [self._judge_branch(node) for node in nodes]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        scores_by_id: dict[str, AggregatedScore] = {}

        for node, result in zip(nodes, results):
            if isinstance(result, Exception):
                logger.error(f"Error judging node {node.id}: {result}")
                # Assign minimum score on error
                scores_by_id[node.id] = AggregatedScore(
                    individual_scores=[0.0, 0.0, 0.0],
                    aggregated_score=0.0,
                    pass_threshold=self.prune_threshold,
                    pass_votes=0,
                    passed=False,
                )
            else:
                scores_by_id[node.id] = result
                # Update node stats
                node.stats.judge_scores = result.individual_scores
                node.stats.aggregated_score = result.aggregated_score

        return scores_by_id

    async def _judge_branch(self, node: MCTSNode) -> AggregatedScore:
        """Run 3 parallel judges on a branch and aggregate scores."""
        # Format conversation history for judge
        history_str = self._format_history(node.messages)

        prompt = prompts.trajectory_outcome_judge(
            conversation_goal=self.goal,
            conversation_history=history_str,
        )

        # Run 3 judges in parallel
        tasks = [
            self._call_llm_json(
                prompt, temperature=self.judge_temperature, phase="judge"
            )
            for _ in range(3)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        _log("JUDGE", f"Results: {results}", indent=2)

        scores: list[float] = []
        for result in results:
            if isinstance(result, Exception):
                logger.warning(f"Judge failed: {result}")
                scores.append(0.0)
            elif result and "total_score" in result:
                scores.append(float(result["total_score"]))
            else:
                scores.append(0.0)

        # Ensure we have exactly 3 scores
        while len(scores) < 3:
            scores.append(0.0)

        return aggregate_majority_vote(scores[:3], pass_threshold=self.prune_threshold)

    async def _judge_branches_comparative(
        self,
        nodes: list[MCTSNode],
    ) -> dict[str, AggregatedScore]:
        """
        Score branches using comparative/ranking-based judging.

        Instead of scoring each branch independently, this method:
        1. Groups sibling nodes (nodes with the same parent/strategy)
        2. For each group, runs a comparative judge that force-ranks them IN PARALLEL
        3. Assigns scores based on rank position

        This produces more discriminative scores than absolute judging.
        """
        if len(nodes) <= 1:
            # Fall back to absolute for single node
            return await self._judge_branches_parallel(nodes)

        # Group nodes by parent (siblings compete against each other)
        groups: dict[str, list[MCTSNode]] = {}
        for node in nodes:
            parent_id = node.parent_id or "root"
            if parent_id not in groups:
                groups[parent_id] = []
            groups[parent_id].append(node)

        # Separate single-node groups (use absolute scoring) from multi-node groups
        single_node_groups: list[MCTSNode] = []
        multi_node_groups: list[tuple[str, list[MCTSNode]]] = []

        for parent_id, group in groups.items():
            if len(group) == 1:
                single_node_groups.append(group[0])
            else:
                multi_node_groups.append((parent_id, group))

        # PARALLEL: Judge all groups simultaneously
        judge_tasks = []

        # Queue single-node absolute scoring tasks
        for node in single_node_groups:
            judge_tasks.append(self._judge_single_node_absolute(node))

        # Queue multi-node comparative scoring tasks
        for parent_id, group in multi_node_groups:
            judge_tasks.append(self._judge_group_comparative(parent_id, group))

        _log(
            "JUDGE",
            f"Judging {len(single_node_groups)} single nodes + {len(multi_node_groups)} groups in parallel...",
            indent=1,
        )

        # Execute all judging in parallel
        results = await asyncio.gather(*judge_tasks, return_exceptions=True)

        # Merge all results
        scores_by_id: dict[str, AggregatedScore] = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Judge task failed: {result}")
                continue
            scores_by_id.update(result)

        return scores_by_id

    async def _judge_single_node_absolute(
        self, node: MCTSNode
    ) -> dict[str, AggregatedScore]:
        """Judge a single node using absolute scoring."""
        result = await self._judge_branch(node)
        node.stats.judge_scores = result.individual_scores
        node.stats.aggregated_score = result.aggregated_score
        return {node.id: result}

    async def _judge_group_comparative(
        self, parent_id: str, group: list[MCTSNode]
    ) -> dict[str, AggregatedScore]:
        """Judge a group of sibling nodes using comparative ranking."""
        _log(
            "JUDGE",
            f"Comparative ranking of {len(group)} siblings (parent: {parent_id[:8]}...)",
            indent=1,
        )

        # Prepare trajectories for comparative prompt
        trajectories = []
        for node in group:
            trajectories.append(
                {
                    "id": node.id,
                    "intent_label": node.user_intent.label
                    if node.user_intent
                    else "unknown",
                    "history": self._format_history(node.messages),
                }
            )

        prompt = prompts.comparative_trajectory_judge(
            conversation_goal=self.goal,
            trajectories=trajectories,
        )

        # Run comparative judge
        result = await self._call_llm_json(
            prompt, temperature=self.judge_temperature, phase="judge"
        )

        scores_by_id: dict[str, AggregatedScore] = {}

        if not result or "ranking" not in result:
            logger.warning(
                f"Comparative judge failed for group {parent_id}, falling back to absolute"
            )
            # Fallback to absolute scoring for this group (in parallel)
            fallback_tasks = [self._judge_branch(node) for node in group]
            fallback_results = await asyncio.gather(
                *fallback_tasks, return_exceptions=True
            )
            for node, fb_result in zip(group, fallback_results):
                if isinstance(fb_result, Exception):
                    logger.error(f"Fallback judge failed for {node.id}: {fb_result}")
                    fb_result = AggregatedScore(
                        individual_scores=[0.0, 0.0, 0.0],
                        aggregated_score=0.0,
                        pass_threshold=self.prune_threshold,
                        pass_votes=0,
                        passed=False,
                    )
                scores_by_id[node.id] = fb_result
                node.stats.judge_scores = fb_result.individual_scores
                node.stats.aggregated_score = fb_result.aggregated_score
            return scores_by_id

        # Parse ranking results
        ranking = result.get("ranking", [])
        critiques = result.get("critiques", {})

        # Log critiques
        for node_id, critique in critiques.items():
            weaknesses = critique.get("weaknesses", [])
            if weaknesses:
                _log("JUDGE", f"Critiques for {node_id[:8]}: {weaknesses}", indent=2)

        # Assign scores from ranking
        for rank_entry in ranking:
            node_id = rank_entry.get("trajectory_id", "")
            rank = rank_entry.get("rank", 999)
            score = rank_entry.get("score", 0.0)
            reason = rank_entry.get("reason", "")

            # Find the node
            node = next((n for n in group if n.id == node_id), None)
            if not node:
                logger.warning(f"Could not find node {node_id} from ranking")
                continue

            _log(
                "JUDGE",
                f"Rank {rank}: '{node.strategy.tagline if node.strategy else 'unknown'}' "
                f"[{node.user_intent.label if node.user_intent else '?'}] = {score}/10 - {reason}",
                indent=2,
            )

            # Create AggregatedScore
            agg_score = AggregatedScore(
                individual_scores=[score, score, score],
                aggregated_score=score,
                pass_threshold=self.prune_threshold,
                pass_votes=3 if score >= self.prune_threshold else 0,
                passed=score >= self.prune_threshold,
            )
            scores_by_id[node_id] = agg_score
            node.stats.judge_scores = [score]
            node.stats.aggregated_score = score

        # Handle any nodes not in the ranking
        for node in group:
            if node.id not in scores_by_id:
                logger.warning(f"Node {node.id} not found in ranking, assigning 0")
                scores_by_id[node.id] = AggregatedScore(
                    individual_scores=[0.0, 0.0, 0.0],
                    aggregated_score=0.0,
                    pass_threshold=self.prune_threshold,
                    pass_votes=0,
                    passed=False,
                )
                node.stats.judge_scores = [0.0]
                node.stats.aggregated_score = 0.0

        return scores_by_id

    def _prune(
        self,
        nodes: list[MCTSNode],
        scores_by_id: dict[str, AggregatedScore],
    ) -> list[MCTSNode]:
        """
        Prune low-scoring branches.

        Strategy:
        1. Keep nodes with aggregated_score >= prune_threshold
        2. If keep_top_k set, limit to top K
        3. Always keep at least min_survivors
        """
        if not nodes:
            return []

        # Step 1: Threshold filter
        survivors = [
            n
            for n in nodes
            if n.id in scores_by_id
            and scores_by_id[n.id].aggregated_score >= self.prune_threshold
        ]

        # Step 2: Top-K cap (optional)
        if self.keep_top_k and len(survivors) > self.keep_top_k:
            survivors.sort(
                key=lambda n: scores_by_id[n.id].aggregated_score,
                reverse=True,
            )
            survivors = survivors[: self.keep_top_k]

        # Step 3: Min survivors safety
        if len(survivors) < self.min_survivors:
            ranked = sorted(
                nodes,
                key=lambda n: scores_by_id.get(
                    n.id,
                    AggregatedScore(
                        individual_scores=[0, 0, 0],
                        aggregated_score=0,
                        pass_threshold=self.prune_threshold,
                        pass_votes=0,
                        passed=False,
                    ),
                ).aggregated_score,
                reverse=True,
            )
            survivors = ranked[: self.min_survivors]

        # Mark pruned nodes
        survivor_ids = {n.id for n in survivors}
        for n in nodes:
            if n.id not in survivor_ids:
                n.status = NodeStatus.PRUNED
                score = scores_by_id.get(n.id)
                if score:
                    n.prune_reason = (
                        f"score {score.aggregated_score:.1f} < {self.prune_threshold}"
                    )
                else:
                    n.prune_reason = "scoring failed"

        return survivors

    def _get_deep_research_context(self) -> str | None:
        """Get deep research context (stub for now)."""
        if not self.deep_research:
            return None
        # TODO: Implement retrieval pipeline
        return "Relevant domain research context available."

    def _format_history(self, messages: list[Message]) -> str:
        """Format message history as a string for prompts."""
        lines = []
        for msg in messages:
            role = msg.role.capitalize()
            content = msg.content or ""
            lines.append(f"{role}: {content}")
        return "\n\n".join(lines)

    async def _call_llm(
        self,
        messages: list[Message],
        temperature: float | None = None,
        phase: str = "other",
        **kwargs: Any,
    ) -> Completion:
        """Make an LLM call with concurrency control and token tracking."""
        async with self._sem:
            completion = await self.llm.complete(
                messages,
                model=self.model,
                temperature=temperature or self.temperature,
                **kwargs,
            )
            # Track tokens by phase
            self._track_usage(completion, phase)
            return completion

    async def _call_llm_json(
        self,
        prompt: str,
        temperature: float | None = None,
        phase: str = "other",
        **kwargs: Any,
    ) -> dict[str, Any] | None:
        """Make an LLM call expecting JSON output with token tracking."""
        async with self._sem:
            try:
                completion = await self.llm.complete(
                    [Message.user(prompt)],
                    model=self.model,
                    temperature=temperature or self.temperature,
                    structured_output=True,
                    **kwargs,
                )
                # Track tokens by phase
                self._track_usage(completion, phase)
                return completion.data
            except Exception as e:
                logger.error(f"JSON LLM call failed: {e}")
                return None

    def _track_usage(self, completion: Completion, phase: str) -> None:
        """Track token usage for a completion by phase."""
        if not completion.usage:
            return

        tracker = self._token_tracker
        if phase == "strategy":
            tracker.strategy_generation.add(completion.usage)
        elif phase == "intent":
            tracker.intent_generation.add(completion.usage)
        elif phase == "user":
            tracker.user_simulation.add(completion.usage)
        elif phase == "assistant":
            tracker.assistant_generation.add(completion.usage)
        elif phase == "judge":
            tracker.judging.add(completion.usage)

    @property
    def tree(self) -> MCTSTree | None:
        """Get the current tree (available after run())."""
        return self._tree
