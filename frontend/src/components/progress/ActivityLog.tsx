import { useSearchStore, type LogType } from '@/stores';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';

const logColors: Record<LogType, string> = {
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

const logIcons: Record<LogType, string> = {
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

export function ActivityLog() {
  const logs = useSearchStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-48" ref={scrollRef}>
          <div className="p-4 pt-0 space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">Waiting to start...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={logColors[log.type]}>
                  <span className="opacity-70">{logIcons[log.type]}</span> {log.message}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
