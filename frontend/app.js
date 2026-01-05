/**
 * DTS Visualizer - Frontend Application
 */

// State
let ws = null;
let state = 'idle'; // idle | running | complete | error
let deepResearchEnabled = false;
let explorationData = null; // Stores full exploration result for browsing
let availableModels = [];
let defaultModel = null;
let stats = {
    strategies: 0,
    nodes: 0,
    pruned: 0,
    round: 1,
    totalRounds: 1,
    bestScore: 0,
};

// DOM Elements
const views = {
    config: document.getElementById('config-view'),
    progress: document.getElementById('progress-view'),
    results: document.getElementById('results-view'),
    error: document.getElementById('error-view'),
};

// Initialize WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (state === 'running') {
            showError('Connection lost. Please try again.');
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showError('Connection error. Please refresh the page.');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
}

// Handle incoming WebSocket messages
function handleMessage(message) {
    const { type, data } = message;

    switch (type) {
        case 'search_started':
            handleSearchStarted(data);
            break;
        case 'phase':
            handlePhase(data);
            break;
        case 'strategy_generated':
            handleStrategyGenerated(data);
            break;
        case 'intent_generated':
            handleIntentGenerated(data);
            break;
        case 'research_log':
            handleResearchLog(data);
            break;
        case 'round_started':
            handleRoundStarted(data);
            break;
        case 'node_added':
            handleNodeAdded(data);
            break;
        case 'node_updated':
            handleNodeUpdated(data);
            break;
        case 'nodes_pruned':
            handleNodesPruned(data);
            break;
        case 'token_update':
            handleTokenUpdate(data);
            break;
        case 'complete':
            handleComplete(data);
            break;
        case 'error':
            showError(data.message);
            break;
        case 'pong':
            // Heartbeat response
            break;
        default:
            console.log('Unknown message type:', type, data);
    }
}

// Event Handlers
function handleSearchStarted(data) {
    stats.totalRounds = data.total_rounds;
    addLog('search', `Starting exploration: "${data.goal.substring(0, 50)}..."`);
}

function handlePhase(data) {
    const phaseMessages = {
        'initializing': 'Initializing tree structure...',
        'researching': 'Conducting deep research...',
        'generating_strategies': 'Generating conversation strategies...',
        'generating_intents': 'Generating user intents...',
        'expanding': 'Expanding conversation branches...',
        'scoring': 'Scoring trajectories with judges...',
        'pruning': 'Pruning low-scoring branches...',
        'complete': 'Exploration complete!',
    };

    const message = phaseMessages[data.phase] || data.message;
    document.getElementById('progress-title').textContent = message;
    document.getElementById('progress-subtitle').textContent = data.message || '';

    // Update progress bar based on phase
    const phaseProgress = {
        'initializing': 5,
        'researching': 10,
        'generating_strategies': 20,
        'generating_intents': 35,
        'expanding': 50,
        'scoring': 75,
        'pruning': 90,
        'complete': 100,
    };
    updateProgressBar(phaseProgress[data.phase] || 0);

    addLog('phase', message);
}

function handleResearchLog(data) {
    addLog('research', data.message);
}

function handleStrategyGenerated(data) {
    stats.strategies++;
    document.getElementById('stat-strategies').textContent = stats.strategies;
    addLog('strategy', `Strategy ${data.index}/${data.total}: "${data.tagline}"`);
}

function handleIntentGenerated(data) {
    addLog('intent', `Intent: "${data.label}" [${data.emotional_tone}/${data.cognitive_stance}] for "${data.strategy}"`);
}

function handleRoundStarted(data) {
    stats.round = data.round;
    document.getElementById('stat-round').textContent = `${data.round}/${data.total_rounds}`;
    addLog('round', `Round ${data.round} of ${data.total_rounds}`);
}

function handleNodeAdded(data) {
    stats.nodes++;
    document.getElementById('stat-nodes').textContent = stats.nodes;

    // user_intent can be a string or an object with .label property
    let intentLabel = '';
    if (data.user_intent) {
        intentLabel = typeof data.user_intent === 'string'
            ? data.user_intent
            : data.user_intent.label || data.user_intent;
    }
    const intent = intentLabel ? ` [${intentLabel}]` : '';
    addLog('node', `+ Node: "${data.strategy}"${intent}`);
}

function handleNodeUpdated(data) {
    const score = data.score.toFixed(1);
    const status = data.passed ? 'passed' : 'below threshold';

    if (data.score > stats.bestScore) {
        stats.bestScore = data.score;
        document.getElementById('progress-score').textContent = score;
    }

    addLog('score', `Score: ${score}/10 (${status})`);
}

function handleNodesPruned(data) {
    const count = data.ids.length;
    stats.pruned += count;
    document.getElementById('stat-pruned').textContent = stats.pruned;
    addLog('prune', `Pruned ${count} branches`);
}

function handleTokenUpdate(data) {
    // Optional: could show live token count
}

function handleComplete(data) {
    state = 'complete';
    explorationData = data.exploration;

    // Update results view
    document.getElementById('results-score').textContent = data.best_score.toFixed(1);

    // Model names (can be multiple now)
    if (data.token_usage && data.token_usage.models_used && data.token_usage.models_used.length > 0) {
        const models = data.token_usage.models_used;
        const modelText = models.length === 1 ? `Model: ${models[0]}` : `Models: ${models.join(', ')}`;
        document.getElementById('results-model').textContent = modelText;
    }

    // Get best branch info from exploration data
    const exploration = data.exploration;
    if (exploration && exploration.branches && exploration.branches.length > 0) {
        // Select best branch by default
        populateBranchSelector(exploration.branches, data.best_node_id);
    }

    // Find the best node to get user intent and scores
    if (exploration && exploration.branches) {
        const bestBranch = exploration.branches.find(b => b.id === data.best_node_id);
        if (bestBranch) {
            displayBranchDetails(bestBranch);
        }
    }

    // Render conversation
    renderConversation(data.best_messages);

    // Deep research report
    if (exploration && exploration.research_report) {
        document.getElementById('research-panel').classList.remove('hidden');
        document.getElementById('research-report').innerHTML = formatMarkdown(exploration.research_report);
    } else {
        document.getElementById('research-panel').classList.add('hidden');
    }

    // Token usage
    if (data.token_usage) {
        displayUsageStats(data.token_usage);
    }

    showView('results');
}

function populateBranchSelector(branches, selectedId) {
    const selector = document.getElementById('branch-selector');
    selector.innerHTML = '<option value="">Select a branch...</option>';

    // Sort branches by score descending
    const sorted = [...branches].sort((a, b) => b.scores.aggregated - a.scores.aggregated);

    sorted.forEach((branch, index) => {
        const option = document.createElement('option');
        option.value = branch.id;
        const status = branch.status === 'pruned' ? ' [pruned]' : '';
        const score = branch.scores.aggregated.toFixed(1);
        option.textContent = `#${index + 1} ${branch.strategy.tagline} (${score})${status}`;
        if (branch.id === selectedId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    document.getElementById('branch-count').textContent = `${branches.length} branches`;
}

function selectBranch(branchId) {
    if (!branchId || !explorationData || !explorationData.branches) return;

    const branch = explorationData.branches.find(b => b.id === branchId);
    if (!branch) return;

    displayBranchDetails(branch);
    renderConversation(branch.trajectory);
}

function displayBranchDetails(branch) {
    // Show branch info panel
    document.getElementById('selected-branch-info').classList.remove('hidden');

    // Strategy and intent
    document.getElementById('branch-strategy').textContent = branch.strategy.tagline;
    if (branch.user_intent) {
        document.getElementById('branch-intent').textContent =
            `${branch.user_intent.label} (${branch.user_intent.emotional_tone})`;
        document.getElementById('results-intent').textContent = branch.user_intent.label;
    } else {
        document.getElementById('branch-intent').textContent = 'No user intent';
        document.getElementById('results-intent').textContent = '--';
    }

    // Score and status
    const score = branch.scores.aggregated.toFixed(1);
    document.getElementById('branch-score').textContent = score;
    document.getElementById('branch-score').className =
        `text-lg font-semibold ${branch.status === 'pruned' ? 'text-red-400' : 'text-green-400'}`;

    const statusEl = document.getElementById('branch-status');
    statusEl.textContent = branch.status === 'pruned' ? 'Pruned' : 'Active';
    statusEl.className = `text-xs ${branch.status === 'pruned' ? 'text-red-400' : 'text-green-400'}`;

    // Judge scores
    displayJudgeScores(branch.scores);
}

function displayJudgeScores(scores) {
    const panel = document.getElementById('judge-scores-panel');
    const container = document.getElementById('judge-scores');
    const summary = document.getElementById('judge-summary');

    if (!scores || !scores.individual || scores.individual.length === 0) {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');
    container.innerHTML = '';

    // Show individual scores
    scores.individual.forEach((score, index) => {
        const badge = document.createElement('span');
        const color = score >= 7 ? 'bg-green-600' : score >= 5 ? 'bg-yellow-600' : 'bg-red-600';
        badge.className = `${color} text-white text-sm px-3 py-1 rounded-full`;
        badge.textContent = `Judge ${index + 1}: ${score.toFixed(1)}`;
        container.appendChild(badge);
    });

    // Build summary with aggregated score
    let summaryHtml = `<div class="text-sm text-gray-300">Aggregated: ${scores.aggregated.toFixed(1)}/10</div>`;

    // Add critiques if available
    if (scores.critiques) {
        const critiques = scores.critiques;

        if (critiques.weaknesses && critiques.weaknesses.length > 0) {
            summaryHtml += `
                <div class="mt-3">
                    <div class="text-xs text-red-400 font-medium mb-1">Weaknesses:</div>
                    <ul class="text-xs text-gray-400 space-y-1">
                        ${critiques.weaknesses.map(w => `<li>• ${escapeHtml(w)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (critiques.strengths && critiques.strengths.length > 0) {
            summaryHtml += `
                <div class="mt-2">
                    <div class="text-xs text-green-400 font-medium mb-1">Strengths:</div>
                    <ul class="text-xs text-gray-400 space-y-1">
                        ${critiques.strengths.map(s => `<li>• ${escapeHtml(s)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (critiques.key_moment) {
            summaryHtml += `
                <div class="mt-2">
                    <div class="text-xs text-blue-400 font-medium">Key Moment:</div>
                    <div class="text-xs text-gray-400">${escapeHtml(critiques.key_moment)}</div>
                </div>
            `;
        }

        if (critiques.biggest_missed_opportunity) {
            summaryHtml += `
                <div class="mt-2">
                    <div class="text-xs text-amber-400 font-medium">Missed Opportunity:</div>
                    <div class="text-xs text-gray-400">${escapeHtml(critiques.biggest_missed_opportunity)}</div>
                </div>
            `;
        }

        if (critiques.summary) {
            summaryHtml += `
                <div class="mt-2">
                    <div class="text-xs text-purple-400 font-medium">Summary:</div>
                    <div class="text-xs text-gray-400">${escapeHtml(critiques.summary)}</div>
                </div>
            `;
        }
    }

    summary.classList.remove('hidden');
    summary.innerHTML = summaryHtml;
}

function displayUsageStats(usage) {
    const totals = usage.totals;
    document.getElementById('tokens-input').textContent = formatNumber(totals.input_tokens);
    document.getElementById('tokens-output').textContent = formatNumber(totals.output_tokens);
    document.getElementById('tokens-requests').textContent = formatNumber(totals.total_requests);
    document.getElementById('tokens-cost').textContent = `$${totals.total_cost_usd.toFixed(4)}`;

    // Phase breakdown
    if (usage.by_phase) {
        const breakdown = document.getElementById('usage-breakdown');
        const phaseContainer = document.getElementById('phase-breakdown');
        breakdown.classList.remove('hidden');
        phaseContainer.innerHTML = '';

        const phases = [
            ['Strategy Gen', usage.by_phase.strategy_generation],
            ['Intent Gen', usage.by_phase.intent_generation],
            ['User Sim', usage.by_phase.user_simulation],
            ['Assistant Gen', usage.by_phase.assistant_generation],
            ['Judging', usage.by_phase.judging],
        ];

        phases.forEach(([name, phase]) => {
            if (phase && phase.requests > 0) {
                const row = document.createElement('div');
                row.className = 'flex justify-between text-gray-400';
                row.innerHTML = `
                    <span>${name}</span>
                    <span>${phase.requests} reqs | ${formatNumber(phase.input_tokens)} in | ${formatNumber(phase.output_tokens)} out</span>
                `;
                phaseContainer.appendChild(row);
            }
        });

        // External research cost
        if (usage.by_phase.research && usage.by_phase.research.external_cost_usd > 0) {
            const row = document.createElement('div');
            row.className = 'flex justify-between text-amber-400';
            row.innerHTML = `
                <span>Research (external)</span>
                <span>$${usage.by_phase.research.external_cost_usd.toFixed(4)}</span>
            `;
            phaseContainer.appendChild(row);
        }
    }
}

function toggleResearchReport() {
    const content = document.getElementById('research-content');
    const icon = document.getElementById('research-toggle-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '−';
    } else {
        content.classList.add('hidden');
        icon.textContent = '+';
    }
}

function formatMarkdown(text) {
    if (!text) return '';

    // Check if marked.js and DOMPurify are loaded
    const hasMarked = typeof marked !== 'undefined' && typeof marked.parse === 'function';
    const hasDOMPurify = typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function';

    if (hasMarked && hasDOMPurify) {
        try {
            // Configure marked for better rendering
            marked.setOptions({
                breaks: true,        // Convert \n to <br>
                gfm: true,           // GitHub Flavored Markdown
            });
            const html = marked.parse(text);
            return DOMPurify.sanitize(html, {
                ADD_ATTR: ['target'],  // Allow target="_blank" on links
            });
        } catch (e) {
            console.error('Markdown parsing error:', e);
        }
    } else {
        console.warn('Markdown libraries not loaded:', { hasMarked, hasDOMPurify });
    }

    // Fallback: basic markdown formatting if libraries not loaded
    return text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-dark-bg p-3 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="bg-dark-bg px-1 rounded">$1</code>')
        .replace(/^### (.*$)/gm, '<h4 class="text-md font-medium mt-3 mb-1 text-white">$1</h4>')
        .replace(/^## (.*$)/gm, '<h3 class="text-lg font-medium mt-4 mb-2 text-white">$1</h3>')
        .replace(/^# (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2 text-white">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\- (.*$)/gm, '<li class="ml-4">• $1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank">$1</a>')
        .replace(/\n\n/g, '</p><p class="mt-3">')
        .replace(/\n/g, '<br>');
}

// UI Functions
function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.add('hidden');
    });
    views[viewName].classList.remove('hidden');
}

function showError(message) {
    state = 'error';
    document.getElementById('error-message').textContent = message;
    showView('error');
}

function updateProgressBar(percent) {
    document.getElementById('progress-bar').style.width = `${percent}%`;
}

function addLog(type, message) {
    const log = document.getElementById('activity-log');
    const entry = document.createElement('div');

    const colors = {
        search: 'text-blue-400',
        phase: 'text-purple-400',
        research: 'text-amber-400',
        strategy: 'text-green-400',
        intent: 'text-pink-400',
        round: 'text-yellow-400',
        node: 'text-cyan-400',
        score: 'text-orange-400',
        prune: 'text-red-400',
    };

    const icons = {
        search: '>>',
        phase: '--',
        research: '~~',
        strategy: '++',
        intent: '<>',
        round: '##',
        node: '++',
        score: '**',
        prune: 'xx',
    };

    entry.className = `${colors[type] || 'text-gray-400'}`;
    entry.textContent = `${icons[type] || '--'} ${message}`;

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function renderConversation(messages) {
    const container = document.getElementById('conversation');
    container.innerHTML = '';

    messages.forEach(msg => {
        // Skip messages with no content
        const content = msg.content || '';
        if (!content.trim()) return;

        const div = document.createElement('div');
        const isUser = msg.role === 'user';

        div.className = `flex ${isUser ? 'justify-start' : 'justify-end'}`;
        div.innerHTML = `
            <div class="${isUser ? 'bg-gray-800' : 'bg-blue-600/20'} rounded-lg px-4 py-3 max-w-[85%]">
                <div class="text-xs ${isUser ? 'text-gray-500' : 'text-blue-400'} mb-1">
                    ${isUser ? 'User' : 'Assistant'}
                </div>
                <div class="text-sm text-gray-200 whitespace-pre-wrap">${escapeHtml(content)}</div>
            </div>
        `;

        container.appendChild(div);
    });
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Actions
function startExploration() {
    const goal = document.getElementById('goal').value.trim();
    const firstMessage = document.getElementById('first-message').value.trim();

    if (!goal) {
        alert('Please enter a conversation goal');
        return;
    }
    if (!firstMessage) {
        alert('Please enter a first message');
        return;
    }

    // Reset stats
    stats = {
        strategies: 0,
        nodes: 0,
        pruned: 0,
        round: 1,
        totalRounds: 1,
        bestScore: 0,
    };

    // Clear log
    document.getElementById('activity-log').innerHTML = '';
    document.getElementById('progress-score').textContent = '--';
    updateProgressBar(0);

    // Update stat displays
    document.getElementById('stat-strategies').textContent = '0';
    document.getElementById('stat-nodes').textContent = '0';
    document.getElementById('stat-pruned').textContent = '0';
    document.getElementById('stat-round').textContent = '1';

    // Build config
    const models = getSelectedModels();
    const config = {
        goal: goal,
        first_message: firstMessage,
        init_branches: parseInt(document.getElementById('init-branches').value) || 6,
        turns_per_branch: parseInt(document.getElementById('turns').value) || 5,
        user_intents_per_branch: parseInt(document.getElementById('intents').value) || 3,
        prune_threshold: parseFloat(document.getElementById('threshold').value) || 6.5,
        scoring_mode: document.getElementById('scoring-mode').value || 'comparative',
        rounds: parseInt(document.getElementById('rounds').value) || 1,
        deep_research: deepResearchEnabled,
        ...models,
    };

    // Connect and send
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        ws.onopen = () => {
            sendStartSearch(config);
        };
    } else {
        sendStartSearch(config);
    }

    state = 'running';
    showView('progress');
}

function sendStartSearch(config) {
    ws.send(JSON.stringify({
        type: 'start_search',
        config: config,
    }));
}

function resetToConfig() {
    state = 'idle';
    explorationData = null;

    // Reset UI elements
    document.getElementById('branch-selector').innerHTML = '<option value="">Select a branch...</option>';
    document.getElementById('selected-branch-info').classList.add('hidden');
    document.getElementById('judge-scores-panel').classList.add('hidden');
    document.getElementById('research-panel').classList.add('hidden');
    document.getElementById('research-content').classList.add('hidden');
    document.getElementById('research-toggle-icon').textContent = '+';
    document.getElementById('usage-breakdown').classList.add('hidden');

    showView('config');
}

function toggleParams() {
    const advanced = document.getElementById('advanced-params');
    const modelSettings = document.getElementById('model-settings');
    const btn = document.getElementById('toggle-params');

    if (advanced.classList.contains('hidden')) {
        advanced.classList.remove('hidden');
        modelSettings.classList.remove('hidden');
        btn.textContent = 'Hide advanced';
    } else {
        advanced.classList.add('hidden');
        modelSettings.classList.add('hidden');
        btn.textContent = 'Show advanced';
    }
}

function toggleDeepResearch() {
    deepResearchEnabled = !deepResearchEnabled;
    const label = document.getElementById('deep-research-label');
    const indicator = document.getElementById('deep-research-indicator');
    const btn = document.getElementById('deep-research-toggle');

    if (deepResearchEnabled) {
        label.textContent = 'On';
        indicator.classList.remove('bg-gray-600');
        indicator.classList.add('bg-green-500');
        btn.classList.add('border-green-500');
        btn.classList.remove('text-gray-400');
        btn.classList.add('text-green-400');
    } else {
        label.textContent = 'Off';
        indicator.classList.remove('bg-green-500');
        indicator.classList.add('bg-gray-600');
        btn.classList.remove('border-green-500');
        btn.classList.remove('text-green-400');
        btn.classList.add('text-gray-400');
    }
}

// Model Settings
function toggleModelSettings() {
    const content = document.getElementById('model-settings-content');
    const icon = document.getElementById('model-settings-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '−';
    } else {
        content.classList.add('hidden');
        icon.textContent = '+';
    }
}

async function fetchModels() {
    const loadingEl = document.getElementById('models-loading');
    const errorEl = document.getElementById('models-error');

    try {
        const response = await fetch('/api/models');
        const data = await response.json();

        if (data.error) {
            loadingEl.classList.add('hidden');
            errorEl.textContent = `Failed to load models: ${data.error}`;
            errorEl.classList.remove('hidden');
            return;
        }

        availableModels = data.models || [];
        defaultModel = data.default_model;

        // Hide loading, populate dropdowns
        loadingEl.classList.add('hidden');
        populateModelDropdowns();

    } catch (e) {
        console.error('Error fetching models:', e);
        loadingEl.classList.add('hidden');
        errorEl.textContent = 'Failed to load models. Check console for details.';
        errorEl.classList.remove('hidden');
    }
}

function populateModelDropdowns() {
    const selectors = ['strategy-model', 'simulator-model', 'judge-model'];

    selectors.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = `<option value="">Use Default${defaultModel ? ` (${defaultModel})` : ''}</option>`;

        // Group models by provider
        const grouped = {};
        availableModels.forEach(model => {
            const parts = model.id.split('/');
            const provider = parts.length > 1 ? parts[0] : 'other';
            if (!grouped[provider]) grouped[provider] = [];
            grouped[provider].push(model);
        });

        // Add grouped options
        Object.keys(grouped).sort().forEach(provider => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);

            grouped[provider].forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                const ctx = model.context_length ? ` (${formatNumber(model.context_length)} ctx)` : '';
                const cost = model.prompt_cost ? ` $${model.prompt_cost.toFixed(2)}/M` : '';
                option.textContent = `${model.name}${ctx}${cost}`;
                optgroup.appendChild(option);
            });

            select.appendChild(optgroup);
        });

        // Add change listener for info display
        select.addEventListener('change', () => updateModelInfo(id));
    });
}

function updateModelInfo(selectId) {
    const select = document.getElementById(selectId);
    const infoEl = document.getElementById(selectId + '-info');
    const modelId = select.value;

    if (!modelId) {
        infoEl.textContent = '';
        return;
    }

    const model = availableModels.find(m => m.id === modelId);
    if (model) {
        const ctx = model.context_length ? `${formatNumber(model.context_length)} context` : '';
        const promptCost = model.prompt_cost ? `$${model.prompt_cost.toFixed(2)}/M input` : '';
        const completionCost = model.completion_cost ? `$${model.completion_cost.toFixed(2)}/M output` : '';
        const parts = [ctx, promptCost, completionCost].filter(Boolean);
        infoEl.textContent = parts.join(' • ');
    } else {
        infoEl.textContent = '';
    }
}

function getSelectedModels() {
    return {
        strategy_model: document.getElementById('strategy-model').value || null,
        simulator_model: document.getElementById('simulator-model').value || null,
        judge_model: document.getElementById('judge-model').value || null,
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    fetchModels();
});
