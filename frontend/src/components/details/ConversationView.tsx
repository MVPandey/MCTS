import type { Message } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ConversationViewProps {
  messages: Message[];
}

export function ConversationView({ messages }: ConversationViewProps) {
  // Filter out empty messages
  const filteredMessages = messages.filter((m) => m.content?.trim());

  if (filteredMessages.length === 0) {
    return (
      <Card className="bg-background">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No messages in this conversation
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Conversation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-4 pt-0 space-y-3">
            {filteredMessages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[85%]',
          isUser ? 'bg-muted' : 'bg-primary/20'
        )}
      >
        <div className={cn('text-xs mb-1', isUser ? 'text-muted-foreground' : 'text-primary')}>
          {isUser ? 'User' : 'Assistant'}
        </div>
        <div className="text-sm text-foreground whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}
