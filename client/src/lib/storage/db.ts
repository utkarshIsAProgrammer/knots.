// Local-only vault. Everything here lives in the browser's IndexedDB and is
// never transmitted. Wiping this device wipes the identity — by design.

import Dexie, { type Table } from 'dexie';
import type { Contact, Identity, Message } from '../api/types';

/** A message as persisted locally: adds the conversation thread key. */
export type StoredMessage = Message & { thread: string };

export interface Setting {
  key: string;
  value: unknown;
}

class KnotsDatabase extends Dexie {
  identity!: Table<Identity, string>;
  contacts!: Table<Contact, string>;
  messages!: Table<StoredMessage, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('knots_vault_v1');
    this.version(1).stores({
      identity: 'knotId',
      contacts: 'knot_id, status, lastMessageAt',
      messages: 'id, thread, createdAt, expiresAt',
      settings: 'key'
    });
  }
}

export const db = new KnotsDatabase();

/* ----------------------------- identity ----------------------------- */

export async function loadIdentity(): Promise<Identity | null> {
  const all = await db.identity.toArray();
  return all[0] ?? null;
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await db.identity.clear();
  await db.identity.put(identity);
}

/* ----------------------------- contacts ----------------------------- */

export async function loadContacts(): Promise<Contact[]> {
  return db.contacts.toArray();
}

export async function upsertContact(contact: Contact): Promise<void> {
  await db.contacts.put(contact);
}

export async function patchContact(knotId: string, patch: Partial<Contact>): Promise<void> {
  await db.contacts.update(knotId, patch);
}

export async function removeContact(knotId: string): Promise<void> {
  await db.contacts.delete(knotId);
}

/* ----------------------------- messages ----------------------------- */

export async function loadThread(thread: string): Promise<StoredMessage[]> {
  return db.messages.where('thread').equals(thread).sortBy('createdAt');
}

export async function loadAllMessages(): Promise<StoredMessage[]> {
  return db.messages.orderBy('createdAt').toArray();
}

export async function putMessage(message: StoredMessage): Promise<void> {
  await db.messages.put(message);
}

export async function patchMessage(id: string, patch: Partial<StoredMessage>): Promise<void> {
  await db.messages.update(id, patch);
}

export async function deleteMessageLocal(id: string): Promise<void> {
  await db.messages.delete(id);
}

export async function clearThread(thread: string): Promise<void> {
  await db.messages.where('thread').equals(thread).delete();
}

/** Drop any messages whose burn timer has elapsed using indexed search. */
export async function sweepExpired(): Promise<number> {
  const now = Date.now();
  const expiredKeys = await db.messages.where('expiresAt').between(1, now, true, true).primaryKeys();
  if (expiredKeys.length) {
    await db.messages.bulkDelete(expiredKeys);
  }
  return expiredKeys.length;
}

/* ----------------------------- settings ----------------------------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/* ------------------------------ panic ------------------------------- */

export async function purgeVault(): Promise<void> {
  await Promise.all([
    db.identity.clear(),
    db.contacts.clear(),
    db.messages.clear(),
    db.settings.clear()
  ]);
}
