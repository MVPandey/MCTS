import { useSearchStore } from '@/stores';
import { ConfigForm } from '../config/ConfigForm';
import { StatsBar } from '../progress/StatsBar';
import { ActivityLog } from '../progress/ActivityLog';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Sidebar() {
  const status = useSearchStore((s) => s.status);
  const isRunning = status === 'running';

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <ConfigForm />

          {/* Show stats and log during search */}
          {(isRunning || status === 'complete') && (
            <>
              <StatsBar />
              <ActivityLog />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
