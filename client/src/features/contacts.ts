import { create } from 'zustand';
import { api } from '../lib/api/client';
import type { Contact, ContactRequest } from '../lib/api/types';
import { shortKnotId } from '../lib/format';
import { loadContacts, patchContact, removeContact, upsertContact } from '../lib/storage/db';
import { toast } from './toast';

interface ContactsState {
  contacts: Contact[];
  incoming: ContactRequest[];
  outgoing: ContactRequest[];
  loading: boolean;
  /** True once the first load has finished, so background refreshes stay silent. */
  hydrated: boolean;
  load: () => Promise<void>;
  sendRequest: (toKnotId: string, memo?: string) => Promise<boolean>;
  respond: (requestId: string, action: 'accept' | 'reject' | 'block') => Promise<void>;
  setAlias: (knotId: string, alias: string) => Promise<void>;
  toggleMute: (knotId: string) => Promise<void>;
  remove: (knotId: string) => Promise<void>;
  addLocal: (knotId: string) => Promise<void>;
  clear: () => void;
}

export const useContacts = create<ContactsState>((set, get) => ({
  contacts: [],
  incoming: [],
  outgoing: [],
  loading: false,
  hydrated: false,

  clear: () => set({ contacts: [], incoming: [], outgoing: [], loading: false, hydrated: false }),

  load: async () => {
    const me = (await import('./identity')).useIdentity.getState().identity;
    if (!me) return;
    const first = !get().hydrated;
    if (first) set({ loading: true });
    try {
      const local = await loadContacts();
      const byId = new Map(local.map((c) => [c.knot_id, c]));

      const res = await api.getContactRequests(me.knotId);
      const accepted = [...res.incoming, ...res.outgoing].filter((r) => r.status === 'accepted');

      for (const req of accepted) {
        const peer =
          req.from_knot_id.toLowerCase() === me.knotId.toLowerCase()
            ? req.to_knot_id
            : req.from_knot_id;
        const existing = byId.get(peer);
        if (!existing || existing.status !== 'accepted') {
          const contact: Contact = {
            ...(existing || {}),
            knot_id: peer,
            alias: existing?.alias || shortKnotId(peer),
            status: 'accepted',
            created_at: existing?.created_at || new Date().toISOString()
          };
          byId.set(peer, contact);
          await upsertContact(contact);
        }
      }

      // Purge any pending or non-accepted contacts from the local contacts vault
      // so pending requests never appear in the chat list as "Request pending"
      for (const [id, c] of byId.entries()) {
        if (c.status !== 'accepted') {
          byId.delete(id);
          await removeContact(id).catch(() => undefined);
        }
      }

      set({
        contacts: Array.from(byId.values()),
        incoming: res.incoming.filter((r) => r.status === 'pending'),
        outgoing: res.outgoing.filter((r) => r.status === 'pending')
      });
    } catch {
      // Relay unreachable — fall back to the local vault only.
      const local = await loadContacts();
      set({ contacts: local.filter((c) => c.status === 'accepted') });
    } finally {
      set({ loading: false, hydrated: true });
    }
  },

  sendRequest: async (toKnotId, memo) => {
    const me = (await import('./identity')).useIdentity.getState().identity;
    if (!me) return false;
    try {
      await api.sendContactRequest(me.knotId, toKnotId, memo);
      toast.success('Request sent', "We'll let you know when they accept.");
      await get().load();
      return true;
    } catch (err) {
      toast.error('Could not send request', (err as Error).message);
      return false;
    }
  },

  respond: async (requestId, action) => {
    try {
      const incomingReq = get().incoming.find((r) => r._id === requestId);
      await api.respondContactRequest(requestId, action);
      if (action === 'accept' && incomingReq) {
        const peer = incomingReq.from_knot_id;
        const local = await loadContacts();
        const existing = local.find((c) => c.knot_id.toLowerCase() === peer.toLowerCase());
        const contact: Contact = {
          ...(existing || {}),
          knot_id: peer,
          alias: existing?.alias || shortKnotId(peer),
          status: 'accepted',
          created_at: existing?.created_at || new Date().toISOString()
        };
        await upsertContact(contact);
      }
      toast.success(action === 'accept' ? 'Request accepted' : action === 'block' ? 'Contact blocked' : 'Request declined');
      await get().load();
    } catch (err) {
      toast.error('Action failed', (err as Error).message);
    }
  },

  setAlias: async (knotId, alias) => {
    await patchContact(knotId, { alias });
    set((s) => ({ contacts: s.contacts.map((c) => (c.knot_id === knotId ? { ...c, alias } : c)) }));
  },

  toggleMute: async (knotId) => {
    const pLower = (knotId || '').trim().toLowerCase();
    const current = get().contacts.find((c) => (c.knot_id || '').trim().toLowerCase() === pLower);
    const muted = !current?.muted;
    const targetId = current?.knot_id || knotId;
    await patchContact(targetId, { muted });
    set((s) => ({
      contacts: s.contacts.map((c) =>
        (c.knot_id || '').trim().toLowerCase() === pLower ? { ...c, muted } : c
      )
    }));
    toast.info(muted ? 'Notifications muted' : 'Notifications unmuted');
  },

  remove: async (knotId) => {
    await removeContact(knotId);
    set((s) => ({ contacts: s.contacts.filter((c) => c.knot_id !== knotId) }));
  },

  addLocal: async (knotId) => {
    const alias = shortKnotId(knotId);
    const contact: Contact = { knot_id: knotId, alias, status: 'accepted', created_at: new Date().toISOString() };
    await upsertContact(contact);
    set((s) => ({ contacts: [...s.contacts.filter((c) => c.knot_id !== knotId), contact] }));
  }
}));
