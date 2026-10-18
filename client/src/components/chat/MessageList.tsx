import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { DateDivider } from './DateDivider';
import type { StoredMessage } from '../../lib/storage/db';

interface MessageListProps {
  messages: StoredMessage[];
  me: string;
  onReply: (message: StoredMessage) => void;
  onEdit: (message: StoredMessage) => void;
  onDelete: (message: StoredMessage) => void;
  onReact: (message: StoredMessage, emoji: string) => void;
}

export function MessageList({ messages, me, onReply, onEdit, onDelete, onReact }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [count]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5 px-4 py-4">
      <AnimatePresence initial={false}>
        {messages.map((message, i) => {
          const previous = messages[i - 1];
          const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          return (
            <motion.div
              key={message.id}
              layout="position"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              {newDay && <DateDivider ts={message.createdAt} />}
              <div className={i > 0 && !newDay ? 'pt-4' : ''}>
                <MessageBubble
                  message={message}
                  mine={(message.senderId || '').trim().toLowerCase() === (me || '').trim().toLowerCase()}
                  me={me}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={endRef} className="h-2" />
    </div>
  );
}
