import { create } from 'zustand';

export type Section = 'chats' | 'vault' | 'profile';
export type Overlay =
  | 'peer'
  | 'myProfile'
  | 'threat'
  | 'rotate'
  | 'burn'
  | 'newChat'
  | 'stickerTray'
  | null;

export type ContactFilter = 'all' | 'requests';

interface UIState {
  section: Section;
  setSection: (section: Section) => void;

  /** Currently open conversation (Knots ID of the peer). */
  activeThread: string | null;
  openThread: (knotId: string) => void;
  closeThread: () => void;

  overlay: Overlay;
  overlayPeer: string | null;
  openOverlay: (overlay: Exclude<Overlay, null>, peer?: string) => void;
  closeOverlay: () => void;

  contactFilter: ContactFilter;
  setContactFilter: (filter: ContactFilter) => void;
}

export const useUI = create<UIState>((set) => ({
  section: 'chats',
  setSection: (section) => set({ section }),

  activeThread: null,
  openThread: (knotId) => set({ activeThread: knotId }),
  closeThread: () => set({ activeThread: null }),

  overlay: null,
  overlayPeer: null,
  openOverlay: (overlay, peer) => set({ overlay, overlayPeer: peer ?? null }),
  closeOverlay: () => set({ overlay: null, overlayPeer: null }),

  contactFilter: 'all',
  setContactFilter: (contactFilter) => set({ contactFilter })
}));
