import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TreeCanvas } from '../tree/TreeCanvas';
import { DetailsPanel } from '../details/DetailsPanel';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Dashboard() {
  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        <Header />

        <PanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel: Config + Progress */}
          <Panel defaultSize={25} minSize={20} maxSize={35}>
            <Sidebar />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Center Panel: Tree Visualization */}
          <Panel defaultSize={45} minSize={30}>
            <TreeCanvas />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Right Panel: Details */}
          <Panel defaultSize={30} minSize={25}>
            <DetailsPanel />
          </Panel>
        </PanelGroup>
      </div>
    </TooltipProvider>
  );
}
