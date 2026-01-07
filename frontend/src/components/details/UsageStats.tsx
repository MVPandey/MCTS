import { useSearchStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatNumber, formatCurrency } from '@/lib/utils';

export function UsageStats() {
  const tokenUsage = useSearchStore((s) => s.tokenUsage);

  if (!tokenUsage) return null;

  const { totals, by_phase } = tokenUsage;

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold">{formatNumber(totals.input_tokens)}</div>
            <div className="text-xs text-muted-foreground">Input</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{formatNumber(totals.output_tokens)}</div>
            <div className="text-xs text-muted-foreground">Output</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{formatNumber(totals.total_requests)}</div>
            <div className="text-xs text-muted-foreground">Requests</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-400">{formatCurrency(totals.total_cost_usd)}</div>
            <div className="text-xs text-muted-foreground">Cost</div>
          </div>
        </div>

        {/* Phase breakdown */}
        <div className="space-y-1 text-xs font-mono">
          <div className="text-muted-foreground mb-2">By Phase:</div>
          {Object.entries(by_phase).map(([phase, usage]) => {
            if (usage.requests === 0) return null;
            return (
              <div key={phase} className="flex justify-between text-muted-foreground">
                <span className="capitalize">{phase.replace(/_/g, ' ')}</span>
                <span>
                  {usage.requests} reqs | {formatNumber(usage.input_tokens)} in | {formatNumber(usage.output_tokens)}{' '}
                  out
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
