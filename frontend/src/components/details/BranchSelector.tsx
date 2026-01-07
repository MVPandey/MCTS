import { useSearchStore, useUIStore } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatScore } from '@/lib/utils';

export function BranchSelector() {
  const exploration = useSearchStore((s) => s.exploration);
  const selectedBranchId = useUIStore((s) => s.selectedBranchId);
  const setSelectedBranch = useUIStore((s) => s.setSelectedBranch);

  if (!exploration) return null;

  // Sort branches by score descending
  const sortedBranches = [...exploration.branches].sort(
    (a, b) => b.scores.aggregated - a.scores.aggregated
  );

  const selectedBranch = sortedBranches.find((b) => b.id === selectedBranchId);

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Browse Branches</CardTitle>
          <span className="text-xs text-muted-foreground">{sortedBranches.length} branches</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Select value={selectedBranchId || ''} onValueChange={setSelectedBranch}>
          <SelectTrigger>
            <SelectValue placeholder="Select a branch..." />
          </SelectTrigger>
          <SelectContent>
            {sortedBranches.map((branch, index) => (
              <SelectItem key={branch.id} value={branch.id}>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="truncate max-w-[150px]">{branch.strategy.tagline}</span>
                  <span
                    className={
                      branch.status === 'pruned'
                        ? 'text-red-400'
                        : branch.scores.aggregated >= 7
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }
                  >
                    ({formatScore(branch.scores.aggregated)})
                  </span>
                  {branch.status === 'pruned' && (
                    <Badge variant="destructive" className="text-xs py-0">
                      pruned
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Selected branch info */}
        {selectedBranch && (
          <div className="mt-3 p-3 bg-card rounded-lg border border-border">
            <div className="font-medium text-sm">{selectedBranch.strategy.tagline}</div>
            <div className="text-xs text-muted-foreground mt-1">{selectedBranch.strategy.description}</div>
            {selectedBranch.user_intent && (
              <div className="mt-2 flex gap-2">
                <Badge variant="info" className="text-xs">
                  {selectedBranch.user_intent.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedBranch.user_intent.emotional_tone}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
