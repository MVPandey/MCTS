"""Deep research component using GPT Researcher."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Callable

from backend.utils.config import config

logger = logging.getLogger(__name__)


def _log(phase: str, message: str, indent: int = 0) -> None:
    """Print a formatted log message."""
    prefix = "  " * indent
    print(f"[DTS:{phase}] {prefix}{message}")


class DeepResearcher:
    """
    Conducts deep research using gpt-researcher package.

    Provides domain context for strategy generation by researching
    the conversation goal and initial message.
    """

    def __init__(
        self,
        cache_dir: str = ".cache/research",
        on_cost: Callable[[float], None] | None = None,
    ) -> None:
        """
        Initialize the researcher.

        Args:
            cache_dir: Directory for caching research results.
            on_cost: Callback for tracking external USD costs.
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._on_cost = on_cost

    async def research(
        self,
        goal: str,
        first_message: str,
        report_type: str = "research_report",
    ) -> str:
        """
        Conduct research on the conversation goal and context.

        Args:
            goal: Conversation goal/objective.
            first_message: Initial user message for context.
            report_type: GPT Researcher report type.

        Returns:
            Research report as string context.

        Raises:
            ValueError: If required API keys are missing.
            RuntimeError: If gpt-researcher is not installed.
        """
        # Check cache first
        cache_key = self._get_cache_key(goal, first_message)
        cached = self._load_cache(cache_key)
        if cached:
            _log("RESEARCH", f"Cache hit: {cache_key[:8]}...", indent=1)
            return cached

        # Validate dependencies and setup environment
        self._validate_requirements()
        self._setup_environment()

        # Construct research query
        query = self._build_query(goal, first_message)

        # Run research
        try:
            from gpt_researcher import GPTResearcher

            _log("RESEARCH", f"Starting deep research for: {goal[:50]}...", indent=1)

            researcher = GPTResearcher(
                query=query,
                report_type=report_type,
            )

            await researcher.conduct_research()
            report = await researcher.write_report()

            # Track external cost
            cost = researcher.get_costs()
            if self._on_cost and cost:
                self._on_cost(cost)
                _log("RESEARCH", f"Research cost: ${cost:.4f}", indent=1)

            # Cache result
            self._save_cache(cache_key, report)
            _log(
                "RESEARCH", f"Research complete, cached as {cache_key[:8]}...", indent=1
            )

            return report

        except ImportError:
            raise RuntimeError(
                "gpt-researcher not installed. Run: pip install gpt-researcher"
            )

    def _setup_environment(self) -> None:
        """
        Inject config values into os.environ for gpt-researcher.

        GPT Researcher reads directly from environment variables,
        so we need to bridge our Pydantic config to os.environ.
        """
        print("[DEBUG] Setting up environment for GPT Researcher...")
        print(f"[DEBUG] config.openai_api_key exists: {bool(config.openai_api_key)}")
        print(f"[DEBUG] config.tavily_api_key exists: {bool(config.tavily_api_key)}")
        print(f"[DEBUG] config.fast_llm: {config.fast_llm}")
        print(f"[DEBUG] config.smart_llm: {config.smart_llm}")
        print(f"[DEBUG] config.strategic_llm: {config.strategic_llm}")

        # OpenRouter API key
        if config.openai_api_key:
            os.environ["OPENROUTER_API_KEY"] = config.openrouter_api_key
            os.environ["OPENAI_BASE_URL"] = config.openai_base_url
            print(f"[DEBUG] Set OPENAI_BASE_URL: {config.openai_base_url}")
            print(f"[DEBUG] Set OPENROUTER_API_KEY: {config.openai_api_key[:10]}...")

        # LLM configurations for gpt-researcher
        if config.fast_llm:
            os.environ["FAST_LLM"] = config.fast_llm
        if config.smart_llm:
            os.environ["SMART_LLM"] = config.smart_llm
        if config.strategic_llm:
            os.environ["STRATEGIC_LLM"] = config.strategic_llm

        # Tavily for web search
        if config.tavily_api_key:
            os.environ["TAVILY_API_KEY"] = config.tavily_api_key
            print(f"[DEBUG] Set TAVILY_API_KEY: {config.tavily_api_key[:10]}...")

        # Embedding configuration
        if config.embedding_api_key:
            os.environ["EMBEDDING_API_KEY"] = config.embedding_api_key
        if config.embedding_model_name:
            os.environ["EMBEDDING_MODEL"] = config.embedding_model_name

        print("[DEBUG] Environment setup complete")

    def _validate_requirements(self) -> None:
        """Validate required API keys are present."""
        if not config.openai_api_key:
            raise ValueError("OPENAI_API_KEY required for deep_research=True.")
        if not config.tavily_api_key:
            raise ValueError(
                "TAVILY_API_KEY required for deep_research=True. "
                "Get one at https://tavily.com"
            )

    def _build_query(self, goal: str, first_message: str) -> str:
        """Build research query from goal and context."""
        return (
            f"Research strategic approaches and domain knowledge for achieving: {goal}. "
            f"Context: The conversation starts with the user saying: '{first_message}'. "
            "Focus on: psychological tactics, persuasion techniques, domain facts, "
            "potential objections and counter-arguments, and negotiation strategies."
        )

    def _get_cache_key(self, goal: str, first_message: str) -> str:
        """Generate cache key from inputs."""
        composite = f"{goal}::{first_message}"
        return hashlib.sha256(composite.encode()).hexdigest()

    def _load_cache(self, key: str) -> str | None:
        """Load cached research result."""
        path = self.cache_dir / f"{key}.json"
        if path.exists():
            try:
                data = json.loads(path.read_text())
                return data.get("report")
            except Exception:
                return None
        return None

    def _save_cache(self, key: str, report: str) -> None:
        """Save research result to cache."""
        path = self.cache_dir / f"{key}.json"
        try:
            path.write_text(json.dumps({"report": report}))
        except Exception as e:
            logger.warning(f"Failed to cache research: {e}")
