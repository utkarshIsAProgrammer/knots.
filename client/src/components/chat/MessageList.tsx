import { memo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { DateDivider } from './DateDivider';
import { Avatar } from '../ui/Avatar';
import type { StoredMessage } from '../../lib/storage/db';

interface MessageListProps {
  messages: StoredMessage[];
  me: string;
  peer?: string;
  isTyping?: boolean;
  isRecording?: boolean;
  onReply: (message: StoredMessage) => void;
  onForward?: (message: StoredMessage) => void;
  onEdit: (message: StoredMessage) => void;
  onDelete: (message: StoredMessage) => void;
  onReact: (message: StoredMessage, emoji: string) => void;
  onRetry?: (message: StoredMessage) => void;
  onJumpToMessage?: (id: string) => void;
  highlightedId?: string | null;
}

export const MessageList = memo(function MessageList({
  messages,
  me,
  peer,
  isTyping,
  isRecording,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReact,
  onRetry,
  onJumpToMessage,
  highlightedId
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5 px-4 py-4">
      <AnimatePresence initial={false}>
        {messages.map((message, i) => {
          const previous = messages[i - 1];
          const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.12 }}
            >
              {newDay && <DateDivider ts={message.createdAt} />}
              <div className={i > 0 && !newDay ? 'pt-4' : ''}>
                <MessageBubble
                  message={message}
                  mine={(message.senderId || '').trim().toLowerCase() === (me || '').trim().toLowerCase()}
                  me={me}
                  onReply={onReply}
                  onForward={onForward}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onRetry={onRetry}
                  onJumpToMessage={onJumpToMessage}
                  highlighted={message.id === highlightedId}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Instagram/WhatsApp-style bottom typing & voice recording indicator bubble */}
      <AnimatePresence>
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="flex items-end gap-2 pt-1 pb-1"
          >
            {peer && <Avatar knotId={peer} size="xs" />}
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-xs bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-emerald-600 dark:text-emerald-400 shadow-sm backdrop-blur-sm">
              <div className="relative flex items-center justify-center">
                <span className="absolute h-3 w-3 rounded-full bg-emerald-500/40 animate-ping" />
                <Mic size={14} className="shrink-0 relative z-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[12px] font-medium tracking-tight">recording audio…</span>
              <div className="flex items-center gap-0.5 ml-1">
                <span className="h-2 w-0.5 rounded-full bg-emerald-500/80 animate-pulse [animation-duration:600ms]" />
                <span className="h-3.5 w-0.5 rounded-full bg-emerald-500/80 animate-pulse [animation-duration:400ms]" />
                <span className="h-2 w-0.5 rounded-full bg-emerald-500/80 animate-pulse [animation-duration:750ms]" />
                <span className="h-3 w-0.5 rounded-full bg-emerald-500/80 animate-pulse [animation-duration:500ms]" />
              </div>
            </div>
          </motion.div>
        ) : isTyping ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="flex items-end gap-2 pt-1 pb-1"
          >
            {peer && <Avatar knotId={peer} size="xs" />}
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs bg-zinc-200/90 dark:bg-zinc-800/90 px-3.5 py-2.5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 animate-bounce" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div ref={endRef} className="h-2" />
    </div>
  );
});
