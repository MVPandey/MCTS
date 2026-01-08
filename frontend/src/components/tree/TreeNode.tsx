import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { TreeNodeData } from '@/stores/treeStore';
import { cn, formatScore } from '@/lib/utils';

export const TreeNode = memo(function TreeNode({ data }: NodeProps<TreeNodeData>) {
  const { strategy, userIntent, score, status, isSelected, isBestPath, depth } = data;

  const statusStyles = {
    active: 'border-blue-500/50 bg-blue-500/5',
    expanding: 'border-yellow-500 bg-yellow-500/10 animate-pulse',
    scored: 'border-green-500/50 bg-green-500/5',
    pruned: 'border-red-500/30 bg-red-500/5 opacity-50',
    error: 'border-red-500 bg-red-500/10',
  };

  return (
    <div
      className={cn(
        'px-2 py-1.5 rounded-lg border-2 min-w-[140px] max-w-[180px] bg-card transition-all duration-200',
        statusStyles[status],
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        isBestPath && 'border-green-500 shadow-lg shadow-green-500/20'
      )}
    >
      {/* Input handle */}
      {depth > 0 && (
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      )}

      {/* Strategy label */}
      <div className="font-medium text-xs leading-tight text-foreground line-clamp-2">{strategy || 'Root'}</div>

      {/* User intent badge */}
      {userIntent && (
        <Badge variant="outline" className="mt-1 text-[10px] truncate max-w-full">
          {userIntent}
        </Badge>
      )}

      {/* Score bar */}
      {score !== null && (
        <div className="mt-1.5">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Score</span>
            <span
              className={cn(
                'font-medium',
                score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
              )}
            >
              {formatScore(score)}/10
            </span>
          </div>
          <Progress
            value={score * 10}
            className={cn(
              'h-1.5',
              score >= 7 ? '[&>div]:bg-green-500' : score >= 5 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
            )}
          />
        </div>
      )}

      {/* Status indicator for expanding */}
      {status === 'expanding' && (
        <div className="mt-2 text-xs text-yellow-400 animate-pulse">Expanding...</div>
      )}

      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
});
