import { create } from 'zustand';
import { api } from '../lib/api/client';
import type { Identity } from '../lib/api/types';
import {
  deriveMnemonicFromCredentials,
  generateIdentity,
  importIdentityFromMnemonic
} from '../lib/crypto/webcrypto';
import { db, getSetting, loadIdentity, purgeVault, saveIdentity, setSetting } from '../lib/storage/db';
import { toast } from './toast';

interface IdentityState {
  identity: Identity | null;
  alias: string;
  email: string;
  /** The username used to sign in — kept apart from the editable display name. */
  authUser: string;
  /** How this identity can be unlocked again. */
  authMethod: 'password' | 'phrase';
  /** Seed for the generated profile icon. */
  avatarSeed: string;
  ready: boolean;
  busy: boolean;
  relayOk: boolean;

  bootstrap: () => Promise<void>;
  create: (type?: 'base58' | 'mnemonic') => Promise<Identity>;
  recover: (mnemonic: string) => Promise<Identity>;
  /** Register a new identity with a globally unique username + password. */
  signUp: (username: string, password: string, email?: string) => Promise<Identity>;
  /** Sign back into an existing identity with username + password verification. */
  signIn: (username: string, password: string) => Promise<Identity>;
  /** Forget this device. Your username + password bring the identity back. */
  signOut: () => Promise<void>;
  /** Check a password against this identity without storing the password itself. */
  verifyPassword: (password: string) => Promise<boolean>;
  registerIdentity: (identity: Identity) => Promise<void>;
  rotate: () => Promise<void>;
  burn: () => Promise<void>;
  setAlias: (alias: string) => void;
  refreshRelay: () => Promise<void>;
}

/** A fresh random seed for the generated profile icon. */
function newAvatarSeed(): string {
  return crypto.randomUUID();
}

export const useIdentity = create<IdentityState>((set, get) => ({
  identity: null,
  alias: '',
  email: '',
  authUser: '',
  authMethod: 'phrase',
  avatarSeed: '',
  ready: false,
  busy: false,
  relayOk: false,

  bootstrap: async () => {
    const [identity, alias, email, authUser, authMethod, avatarSeed] = await Promise.all([
      loadIdentity(),
      getSetting<string>('alias', ''),
      getSetting<string>('email', ''),
      getSetting<string>('authUser', ''),
      getSetting<'password' | 'phrase'>('authMethod', 'phrase'),
      getSetting<string>('avatarSeed', '')
    ]);
    set({ identity, alias, email, authUser, authMethod, avatarSeed, ready: true });
    if (identity) void get().refreshRelay();
  },

  refreshRelay: async () => {
    const health = await api.health();
    set({ relayOk: health.status === 'ok' });
  },

  registerIdentity: async (identity) => {
    try {
      await api.register(identity);
      set({ relayOk: true });
    } catch (err) {
      set({ relayOk: false });
      toast.warn('Saved on this device only', (err as Error).message);
    }
  },

  create: async (type = 'base58') => {
    set({ busy: true });
    try {
      const identity = await generateIdentity(type);
      const avatarSeed = get().avatarSeed || newAvatarSeed();
      await Promise.all([
        saveIdentity(identity),
        setSetting('avatarSeed', avatarSeed),
        setSetting('authMethod', 'phrase'),
        setSetting('authUser', '')
      ]);
      set({ identity, avatarSeed, authMethod: 'phrase', authUser: '' });
      await get().registerIdentity(identity);
      toast.success('Your identity is ready', 'Share your Knots ID to connect.');
      return identity;
    } finally {
      set({ busy: false });
    }
  },

  recover: async (mnemonic) => {
    set({ busy: true });
    try {
      const identity = await importIdentityFromMnemonic(mnemonic);
      const avatarSeed = get().avatarSeed || newAvatarSeed();
      await Promise.all([
        saveIdentity(identity),
        setSetting('avatarSeed', avatarSeed),
        setSetting('authMethod', 'phrase'),
        setSetting('authUser', '')
      ]);
      set({ identity, avatarSeed, authMethod: 'phrase', authUser: '' });
      await get().registerIdentity(identity);
      toast.success('Welcome back', 'Your identity was restored on this device.');
      return identity;
    } finally {
      set({ busy: false });
    }
  },

  signUp: async (username, password, email) => {
    set({ busy: true });
    try {
      const trimmedUser = username.trim();
      const mnemonic = await deriveMnemonicFromCredentials(trimmedUser, password);
      const identity = await importIdentityFromMnemonic(mnemonic);
      const avatarSeed = get().avatarSeed || newAvatarSeed();

      // Enforce unique username on relay before saving to local vault
      await api.registerWithUsername({
        username: trimmedUser,
        knotId: identity.knotId,
        publicKey: identity.publicKey,
        x25519Key: identity.x25519Key,
        ed25519Key: identity.ed25519Key,
        mnemonic: identity.mnemonic
      });

      await Promise.all([
        saveIdentity(identity),
        setSetting('alias', trimmedUser),
        setSetting('authUser', trimmedUser),
        setSetting('authMethod', 'password'),
        setSetting('avatarSeed', avatarSeed),
        email !== undefined ? setSetting('email', email.trim()) : Promise.resolve()
      ]);

      set({
        identity,
        alias: trimmedUser,
        authUser: trimmedUser,
        authMethod: 'password',
        avatarSeed,
        email: email !== undefined ? email.trim() : get().email,
        relayOk: true
      });

      toast.success(`Identity created: ${trimmedUser}`, 'Your sovereign keys are ready.');
      return identity;
    } catch (err) {
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  signIn: async (username, password) => {
    set({ busy: true });
    try {
      const trimmedUser = username.trim();
      const mnemonic = await deriveMnemonicFromCredentials(trimmedUser, password);
      const identity = await importIdentityFromMnemonic(mnemonic);

      // Verify identity against registered username on relay
      const loginRes = await api.loginWithUsername({
        username: trimmedUser,
        knotId: identity.knotId
      });

      const alias = loginRes.displayName || trimmedUser;
      const avatarSeed = get().avatarSeed || newAvatarSeed();

      await Promise.all([
        saveIdentity(identity),
        setSetting('alias', alias),
        setSetting('authUser', trimmedUser),
        setSetting('authMethod', 'password'),
        setSetting('avatarSeed', avatarSeed)
      ]);

      set({
        identity,
        alias,
        authUser: trimmedUser,
        authMethod: 'password',
        avatarSeed,
        relayOk: true
      });

      toast.success(`Welcome back, ${alias}`, 'Your keys were restored on this device.');
      return identity;
    } catch (err) {
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  verifyPassword: async (password) => {
    const { identity, authUser, authMethod } = get();
    if (!identity || authMethod !== 'password' || !authUser || !password) return false;
    const mnemonic = await deriveMnemonicFromCredentials(authUser, password);
    const probe = await importIdentityFromMnemonic(mnemonic);
    return probe.knotId === identity.knotId;
  },

  signOut: async () => {
    const { useChat } = await import('./chat');
    const { useContacts } = await import('./contacts');
    const { usePresence } = await import('./presence');
    const { useUI } = await import('./ui');
    usePresence.getState().stop();
    useChat.getState().clear();
    useContacts.getState().clear();
    useUI.getState().closeThread();
    await db.identity.clear();
    await setSetting('authUser', '');
    set({ identity: null, alias: '', email: '', authUser: '', authMethod: 'phrase', avatarSeed: '' });
    toast.info('Signed out', 'Sign in again with your username and password.');
  },

  rotate: async () => {
    const current = get().identity;
    if (!current) return;
    set({ busy: true });
    try {
      const next = await generateIdentity('base58');
      await api.rotateKeys({
        oldKnotId: current.knotId,
        newKnotId: next.knotId,
        newPublicKey: next.publicKey,
        newEd25519Key: next.ed25519Key
      });
      await saveIdentity(next);
      const avatarSeed = newAvatarSeed();
      await Promise.all([
        setSetting('avatarSeed', avatarSeed),
        setSetting('authMethod', 'phrase'),
        setSetting('authUser', '')
      ]);
      set({ identity: next, avatarSeed, authMethod: 'phrase', authUser: '' });
      toast.success('New Knots ID ready', 'Your contacts need your new ID to reach you.');
      toast.info('Recovery phrase updated', 'The new identity is recovered with its 12-word phrase.');
    } catch (err) {
      toast.error('Could not rotate keys', (err as Error).message);
      throw err;
    } finally {
      set({ busy: false });
    }
  },

  burn: async () => {
    const current = get().identity;
    if (!current) return;
    set({ busy: true });
    try {
      await api.purge(current.knotId).catch(() => undefined);
      await purgeVault();
      set({ identity: null, alias: '', email: '', authUser: '', authMethod: 'phrase', avatarSeed: '' });
      toast.info('Identity deleted', 'Everything was removed from this device and the server.');
    } finally {
      set({ busy: false });
    }
  },

  setAlias: (alias) => {
    set({ alias });
    void setSetting('alias', alias);
  }
}));
