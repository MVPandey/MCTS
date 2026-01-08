import { useSearchStore, useUIStore } from '@/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BranchSelector } from './BranchSelector';
import { ConversationView } from './ConversationView';
import { JudgeScores } from './JudgeScores';
import { UsageStats } from './UsageStats';
import { ResearchReport } from './ResearchReport';

export function DetailsPanel() {
  const status = useSearchStore((s) => s.status);
  const exploration = useSearchStore((s) => s.exploration);
  const selectedBranchId = useUIStore((s) => s.selectedBranchId);

  // Find selected branch
  const selectedBranch = exploration?.branches.find((b) => b.id === selectedBranchId);

  if (status === 'idle') {
    return (
      <div className="h-full flex items-center justify-center bg-card border-l border-border">
        <div className="text-center text-muted-foreground p-4">
          <div className="text-sm">Details will appear here</div>
          <div className="text-xs mt-1">Select a node in the tree to view its conversation</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Research Report (if available) */}
          {exploration?.research_report && (
            <ResearchReport content={exploration.research_report} />
          )}

          {/* Branch Selector */}
          {exploration && exploration.branches.length > 0 && <BranchSelector />}

          {/* Conversation View */}
          {selectedBranch && (
            <>
              <ConversationView messages={selectedBranch.trajectory} />
              <JudgeScores scores={selectedBranch.scores} />
            </>
          )}

          {/* Usage Stats */}
          {status === 'complete' && <UsageStats />}
        </div>
      </ScrollArea>
    </div>
  );
}
