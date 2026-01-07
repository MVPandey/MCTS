import { memo } from 'react';
import { getBezierPath, type EdgeProps } from 'reactflow';
import { cn } from '@/lib/utils';

interface TreeEdgeData {
  isPruned: boolean;
  isBestPath: boolean;
}

export const TreeEdge = memo(function TreeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<TreeEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isPruned = data?.isPruned ?? false;
  const isBestPath = data?.isBestPath ?? false;

  return (
    <path
      id={id}
      d={edgePath}
      className={cn(
        'fill-none transition-all duration-300',
        isPruned ? 'stroke-red-500/30 stroke-1' : 'stroke-muted-foreground stroke-2',
        isBestPath && 'stroke-green-500 stroke-[3px]'
      )}
    />
  );
});
