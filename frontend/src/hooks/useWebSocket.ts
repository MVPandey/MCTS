import { useEffect, useRef, useCallback } from 'react';
import { useSearchStore, useTreeStore, useConfigStore, useUIStore } from '@/stores';
import type { WSMessage, WSEventType, WSEventMap } from '@/types';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  // Handle incoming messages - use getState() inside handlers for fresh state
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as WSMessage;
      const { type, data } = message;

      // Get fresh store references for each message
      const searchStore = useSearchStore.getState();
      const treeStore = useTreeStore.getState();
      const uiStore = useUIStore.getState();

      switch (type as WSEventType) {
        case 'search_started': {
          const d = data as WSEventMap['search_started'];
          searchStore.updateStats({ totalRounds: d.total_rounds });
          searchStore.addLog('search', `Starting exploration: "${d.goal.slice(0, 50)}..."`);
          treeStore.initializeTree();
          break;
        }
        case 'phase': {
          const d = data as WSEventMap['phase'];
          searchStore.setPhase(d.phase);
          searchStore.addLog('phase', d.message);
          break;
        }
        case 'strategy_generated': {
          const d = data as WSEventMap['strategy_generated'];
          searchStore.incrementStat('strategies');
          searchStore.addLog('strategy', `Strategy ${d.index}/${d.total}: "${d.tagline}"`);
          break;
        }
        case 'intent_generated': {
          const d = data as WSEventMap['intent_generated'];
          searchStore.addLog('intent', `Intent: "${d.label}" [${d.emotional_tone}] for "${d.strategy}"`);
          break;
        }
        case 'round_started': {
          const d = data as WSEventMap['round_started'];
          searchStore.updateStats({ currentRound: d.round, totalRounds: d.total_rounds });
          searchStore.addLog('round', `Round ${d.round} of ${d.total_rounds}`);
          break;
        }
        case 'node_added': {
          const d = data as WSEventMap['node_added'];
          treeStore.addNode(d);
          searchStore.incrementStat('nodes');
          const intent = d.user_intent ? ` [${d.user_intent}]` : '';
          searchStore.addLog('node', `+ Node: "${d.strategy || 'root'}"${intent}`);
          break;
        }
        case 'node_updated': {
          const d = data as WSEventMap['node_updated'];
          treeStore.updateNode(d);
          const currentBest = useSearchStore.getState().stats.bestScore;
          if (d.score > currentBest) {
            searchStore.updateStats({ bestScore: d.score });
          }
          const status = d.passed ? 'passed' : 'below threshold';
          searchStore.addLog('score', `Score: ${d.score.toFixed(1)}/10 (${status})`);
          break;
        }
        case 'nodes_pruned': {
          const d = data as WSEventMap['nodes_pruned'];
          treeStore.pruneNodes(d.ids);
          const currentPruned = useSearchStore.getState().stats.pruned;
          searchStore.updateStats({ pruned: currentPruned + d.ids.length });
          searchStore.addLog('prune', `Pruned ${d.ids.length} branches`);
          break;
        }
        case 'token_update':
          // Optional: handle live token updates
          break;
        case 'research_log': {
          const d = data as WSEventMap['research_log'];
          searchStore.addLog('research', d.message);
          break;
        }
        case 'complete': {
          const d = data as WSEventMap['complete'];
          searchStore.setResult(d);
          searchStore.addLog('phase', 'Exploration complete!');
          // Set best path highlighting
          if (d.best_node_id) {
            treeStore.setBestPath(d.best_node_id);
            uiStore.setSelectedBranch(d.best_node_id);
          }
          break;
        }
        case 'error': {
          const d = data as WSEventMap['error'];
          searchStore.setError(d.message);
          searchStore.addLog('phase', `Error: ${d.message}`);
          break;
        }
        case 'pong':
          // Heartbeat response, ignore
          break;
        default:
          console.log('Unknown WebSocket message type:', type);
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  }, []);

  // Connection management
  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnect if search was running
      if (useSearchStore.getState().status === 'running') {
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };

    ws.onmessage = handleMessage;

    wsRef.current = ws;
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const startSearch = useCallback(() => {
    // Reset state
    useSearchStore.getState().reset();
    useTreeStore.getState().reset();

    // Set status to running
    useSearchStore.getState().setStatus('running');

    // Ensure connection
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
      // Wait for connection then send
      const checkAndSend = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendStartMessage();
        } else {
          setTimeout(checkAndSend, 100);
        }
      };
      checkAndSend();
    } else {
      sendStartMessage();
    }
  }, [connect]);

  const sendStartMessage = useCallback(() => {
    const request = useConfigStore.getState().toRequest();
    wsRef.current?.send(
      JSON.stringify({
        type: 'start_search',
        config: request,
      })
    );
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    startSearch,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
