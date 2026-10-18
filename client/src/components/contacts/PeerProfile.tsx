import { useEffect, useState } from 'react';
import { BellOff, Bell, ShieldBan, Trash2, UserMinus } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sheet } from '../ui/Sheet';
import { Badge } from '../ui/Badge';
import { useContacts } from '../../features/contacts';
import { useChat } from '../../features/chat';
import { usePresence } from '../../features/presence';
import { useIdentity } from '../../features/identity';
import { shortKnotId } from '../../lib/format';
import { toast } from '../../features/toast';

export function PeerProfileSheet({ peer, onClose }: { peer: string | null; onClose: () => void }) {
  const contact = useContacts((s) => s.contacts.find((c) => c.knot_id === peer));
  const { setAlias, toggleMute, remove } = useContacts();
  const purgeThread = useChat((s) => s.purgeThread);
  const presence = usePresence((s) => (peer ? s.peers[peer] : undefined));
  const me = useIdentity((s) => s.identity);

  const [alias, setAliasDraft] = useState('');

  useEffect(() => {
    setAliasDraft(contact?.alias ?? '');
  }, [contact?.alias, peer]);

  // Debounced auto-save so typing nickname directly reflects to the default name everywhere
  useEffect(() => {
    if (!peer) return;
    const trimmed = alias.trim();
    if (trimmed === (contact?.alias ?? '')) return;
    const t = setTimeout(() => {
      void setAlias(peer, trimmed);
    }, 350);
    return () => clearTimeout(t);
  }, [alias, peer, contact?.alias, setAlias]);

  if (!peer) return null;

  const close = () => onClose();

  return (
    <Sheet open={!!peer} onClose={close} title="Contact details">
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          <Avatar knotId={peer} size="xl" online={presence?.isOnline} />
          <div>
            <p className="text-[18px] font-semibold tracking-[-0.02em]">
              {alias.trim() || contact?.alias || shortKnotId(peer)}
            </p>
            <p className={`text-[12.5px] font-medium ${presence?.isOnline ? 'text-[var(--success)]' : 'text-[var(--text-3)]'}`}>
              {presence?.isOnline ? 'online' : 'offline'}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge tone={contact?.status === 'accepted' ? 'success' : 'warning'}>{contact?.status ?? 'unknown'}</Badge>
            {contact?.muted && <Badge tone="default">muted</Badge>}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-white">Anonymous Connection</p>
            <p className="text-[11.5px] text-zinc-400">End-to-end encrypted · Zero metadata shared</p>
          </div>
        </div>

        <Input
          label="Nickname"
          value={alias}
          onChange={(e) => setAliasDraft(e.target.value)}
          onBlur={() => {
            const trimmed = alias.trim();
            if (peer && trimmed !== (contact?.alias ?? '')) {
              void setAlias(peer, trimmed);
            }
          }}
          hint="Only stored on your device."
          placeholder={shortKnotId(peer)}
        />

        <div className="space-y-2">
          <Button variant="glass" className="w-full justify-start" onClick={() => void toggleMute(peer)}>
            {contact?.muted ? <Bell size={16} /> : <BellOff size={16} />}
            {contact?.muted ? 'Unmute notifications' : 'Mute notifications'}
          </Button>
          <Button
            variant="glass"
            className="w-full justify-start"
            onClick={() => {
              if (me) void purgeThread(peer, me.knotId);
              toast.success('Chat cleared', 'Your local history and saved copies were removed.');
              close();
            }}
          >
            <Trash2 size={16} /> Clear chat
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => {
              void remove(peer);
              toast.info('Contact removed', 'You can connect again any time.');
              close();
            }}
          >
            <UserMinus size={16} /> Remove contact
          </Button>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-3.5 py-3">
          <ShieldBan size={15} className="mt-0.5 shrink-0 text-zinc-400" />
          <p className="text-[12px] leading-relaxed text-zinc-400">
            Blocking stops this person from sending you new requests. Messages already delivered can&apos;t be
            recalled — clear the chat to remove them from this device.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
