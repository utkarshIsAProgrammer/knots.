import { Moon, Sun } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Standby } from './Standby';
import { ContactPanel } from '../contacts/ContactPanel';
import { ChatView } from '../chat/ChatView';
import { SecurityVault } from '../security/SecurityVault';
import { MyProfile } from '../identity/MyProfile';
import { PeerProfileSheet } from '../contacts/PeerProfile';
import { NewChatSheet } from '../contacts/NewChatSheet';
import { ThreatModelSheet } from '../security/ThreatModel';
import { BurnConfirmDialog } from '../security/SecurityVault';
import { KnotMark, Wordmark } from '../ui/Logo';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useUI } from '../../features/ui';
import { useTheme } from '../../features/theme';
import { useIsDesktop } from '../../lib/hooks';

/** Brand + theme toggle for small screens and tablets, where the sidebar is hidden. */
function MobileHeader() {
  const { resolved, toggle } = useTheme();

  return (
    <header className="relative z-30 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#000000] px-4 py-2.5 lg:hidden backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <KnotMark className="h-7 w-7" />
        <Wordmark />
      </div>
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#000000] text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10"
      >
        {resolved === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}

export function AppShell() {
  const isDesktop = useIsDesktop();
  const section = useUI((s) => s.section);
  const activeThread = useUI((s) => s.activeThread);
  const closeThread = useUI((s) => s.closeThread);
  const overlay = useUI((s) => s.overlay);
  const overlayPeer = useUI((s) => s.overlayPeer);
  const closeOverlay = useUI((s) => s.closeOverlay);

  const surface = section === 'vault' ? <SecurityVault /> : <MyProfile />;

  const chatView = (
    <ErrorBoundary onReset={closeThread}>
      <ChatView />
    </ErrorBoundary>
  );

  const content = isDesktop ? (
    section === 'chats' ? (
      activeThread ? (
        chatView
      ) : (
        <Standby />
      )
    ) : (
      surface
    )
  ) : section === 'chats' ? (
    activeThread ? (
      chatView
    ) : (
      <div className="h-full pb-[calc(env(safe-area-inset-bottom)+5.75rem)]">
        <ContactPanel />
      </div>
    )
  ) : (
    <div className="h-full pb-[calc(env(safe-area-inset-bottom)+5.75rem)]">{surface}</div>
  );

  return (
    <>
      <div className="relative z-10 flex h-full flex-col">
        {!activeThread && <MobileHeader />}
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-[#000000]">{content}</main>
          <TabBar />
        </div>
      </div>

      <PeerProfileSheet peer={overlay === 'peer' ? overlayPeer : null} onClose={closeOverlay} />
      <NewChatSheet open={overlay === 'newChat'} onClose={closeOverlay} />
      <ThreatModelSheet open={overlay === 'threat'} onClose={closeOverlay} />
      <BurnConfirmDialog open={overlay === 'burn'} onClose={closeOverlay} />
    </>
  );
}
