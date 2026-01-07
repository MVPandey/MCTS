import { GitBranch } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <GitBranch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">DTS Visualizer</h1>
          <p className="text-xs text-muted-foreground">Dialogue Tree Search</p>
        </div>
      </div>
    </header>
  );
}
