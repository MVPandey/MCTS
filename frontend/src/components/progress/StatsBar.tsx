import { useSearchStore } from '@/stores';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatScore } from '@/lib/utils';

export function StatsBar() {
  const { stats, currentPhase } = useSearchStore();

  // Calculate progress percentage based on phase
  const phaseProgress: Record<string, number> = {
    initializing: 5,
    researching: 15,
    generating_strategies: 25,
    generating_intents: 40,
    expanding: 60,
    scoring: 80,
    pruning: 90,
    complete: 100,
  };

  const progress = currentPhase ? phaseProgress[currentPhase] || 0 : 0;

  return (
    <Card className="bg-background">
      <CardContent className="pt-4 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="capitalize">{currentPhase?.replace(/_/g, ' ') || 'Idle'}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold">{stats.strategies}</div>
            <div className="text-xs text-muted-foreground">Strategies</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{stats.nodes}</div>
            <div className="text-xs text-muted-foreground">Nodes</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{stats.pruned}</div>
            <div className="text-xs text-muted-foreground">Pruned</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">
              {stats.bestScore > 0 ? formatScore(stats.bestScore) : '--'}
            </div>
            <div className="text-xs text-muted-foreground">Best</div>
          </div>
        </div>

        {/* Round indicator */}
        <div className="text-xs text-center text-muted-foreground">
          Round {stats.currentRound} of {stats.totalRounds}
        </div>
      </CardContent>
    </Card>
  );
}
