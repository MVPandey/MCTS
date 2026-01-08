import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

interface ResearchReportProps {
  content: string;
}

export function ResearchReport({ content }: ResearchReportProps) {
  const sanitizedHtml = useMemo(() => {
    // Configure marked for better rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    const rawHtml = marked.parse(content) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [content]);

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Research Report
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        <ScrollArea className="max-h-[400px]">
          <div
            className="prose prose-sm prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground
              prose-ul:text-muted-foreground prose-ol:text-muted-foreground
              prose-li:marker:text-muted-foreground
              prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-muted prose-pre:border prose-pre:border-border
              prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
