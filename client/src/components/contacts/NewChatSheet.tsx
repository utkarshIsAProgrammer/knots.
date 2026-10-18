import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useContacts } from '../../features/contacts';
import { useIdentity } from '../../features/identity';

export function NewChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sendRequest = useContacts((s) => s.sendRequest);
  const me = useIdentity((s) => s.identity);
  const [target, setTarget] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget('');
      setMemo('');
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    const id = target.trim();
    if (!id) return setError('Enter a Knots ID to continue.');
    if (id.toLowerCase() === me?.knotId.toLowerCase()) return setError('That is your own Knots ID.');
    setBusy(true);
    const ok = await sendRequest(id, memo.trim() || undefined);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New connection"
      description="There's no search or directory. You can only reach someone if they've given you their Knots ID."
      footer={
        <Button variant="primary" className="w-full" loading={busy} onClick={submit}>
          <Send size={16} /> Send request
        </Button>
      }
    >
      <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Input
          label="Knots ID"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setError(null);
          }}
          placeholder="KNT-XXXX-XXXX-XXXX-XXXX"
          error={error}
          mono
          hint="Exactly as they shared it. Without it, you can't find them."
        />
        <Input
          label="Note (optional)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Who you are, or why you're reaching out"
          hint="They see this before they accept."
        />
      </form>
    </Sheet>
  );
}
