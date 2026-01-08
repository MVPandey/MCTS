import { useRef } from 'react';
import { GitBranch, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/stores';

export function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const result = useSearchStore((s) => s.result);
  const exportToJson = useSearchStore((s) => s.exportToJson);
  const importFromJson = useSearchStore((s) => s.importFromJson);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importFromJson(file);
    } catch (err) {
      alert('Failed to import file. Please check the format.');
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <GitBranch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">DTS Visualizer</h1>
          <p className="text-xs text-muted-foreground">Dialogue Tree Search</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </Button>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportToJson}
          disabled={!result}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </header>
  );
}
