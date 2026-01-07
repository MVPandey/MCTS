import type { BranchScores } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatScore, cn } from '@/lib/utils';

interface JudgeScoresProps {
  scores: BranchScores;
}

export function JudgeScores({ scores }: JudgeScoresProps) {
  const { individual, aggregated, critiques } = scores;

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Judge Scores</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Individual scores */}
        <div className="flex gap-2">
          {individual.map((score, index) => (
            <Badge
              key={index}
              variant={score >= 7 ? 'success' : score >= 5 ? 'warning' : 'destructive'}
              className="text-sm px-3 py-1"
            >
              Judge {index + 1}: {formatScore(score)}
            </Badge>
          ))}
        </div>

        {/* Aggregated score */}
        <div className="text-sm">
          <span className="text-muted-foreground">Aggregated: </span>
          <span
            className={cn(
              'font-semibold',
              aggregated >= 7 ? 'text-green-400' : aggregated >= 5 ? 'text-yellow-400' : 'text-red-400'
            )}
          >
            {formatScore(aggregated)}/10
          </span>
        </div>

        {/* Critiques */}
        {critiques && (
          <div className="space-y-2 text-xs">
            {critiques.weaknesses && critiques.weaknesses.length > 0 && (
              <div>
                <div className="text-red-400 font-medium mb-1">Weaknesses:</div>
                <ul className="text-muted-foreground space-y-0.5">
                  {critiques.weaknesses.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {critiques.strengths && critiques.strengths.length > 0 && (
              <div>
                <div className="text-green-400 font-medium mb-1">Strengths:</div>
                <ul className="text-muted-foreground space-y-0.5">
                  {critiques.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {critiques.key_moment && (
              <div>
                <div className="text-blue-400 font-medium">Key Moment:</div>
                <div className="text-muted-foreground">{critiques.key_moment}</div>
              </div>
            )}

            {critiques.biggest_missed_opportunity && (
              <div>
                <div className="text-amber-400 font-medium">Missed Opportunity:</div>
                <div className="text-muted-foreground">{critiques.biggest_missed_opportunity}</div>
              </div>
            )}

            {critiques.summary && (
              <div>
                <div className="text-purple-400 font-medium">Summary:</div>
                <div className="text-muted-foreground">{critiques.summary}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
