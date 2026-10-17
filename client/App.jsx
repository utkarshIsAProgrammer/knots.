import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

import SidebarHeader from './src/components/SidebarHeader.jsx';
import ContactList from './src/components/ContactList.jsx';
import ChatView from './src/components/ChatView.jsx';
import PeerProfileDrawer from './src/components/PeerProfileDrawer.jsx';
import NewChatModal from './src/components/NewChatModal.jsx';
import MyProfileModal from './src/components/MyProfileModal.jsx';
import NetworkRadarModal from './src/components/NetworkRadarModal.jsx';
import ThreatModelModal from './src/components/ThreatModelModal.jsx';
import BurnConfirmModal from './src/components/BurnConfirmModal.jsx';
import NetworkRadar from './src/components/NetworkRadar.jsx';
import SecurityVault from './src/components/SecurityVault.jsx';
import KnotsLanding from './src/components/landing/KnotsLanding.jsx';

import {
  generateIdentity,
  loadStoredIdentity,
  saveStoredIdentity,
  loadStoredContacts,
  saveStoredContacts,
  loadStoredMessages,
  saveStoredMessages,
  purgeAllLocalVault,
  encryptPayload,
  decryptPayload
} from './src/crypto/webcrypto.js';

import { api } from './src/services/api.js';

export default function App() {
  const [identity, setIdentity] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState({});
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [discoveredNodes, setDiscoveredNodes] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [relayStatus, setRelayStatus] = useState(null);

  // Presence & Typing State
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // Mobile App Navigation State
  const [mobileTab, setMobileTab] = useState('chats'); // 'chats' | 'radar' | 'vault' | 'profile'
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Modals & Panels
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [radarOpen, setRadarOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [panicOpen, setPanicOpen] = useState(false);

  // Editorial landing is the entry surface; "Open Knots" reveals the messenger.
  const [entered, setEntered] = useState(false);

  // Screen resize listener for mobile Android detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio tone on transmission/reception
  const playPing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  // 1. Initial Identity Initialization & Registration
  useEffect(() => {
    async function initIdentity() {
      let currentId = loadStoredIdentity();
      if (!currentId) {
        currentId = await generateIdentity('base58');
        saveStoredIdentity(currentId);
      }
      setIdentity(currentId);
      setContacts(loadStoredContacts());
      setMessages(loadStoredMessages());

      try {
        await api.registerKnot(currentId);
      } catch (err) {
        console.warn('Registration note:', err.message);
      }
    }
    initIdentity();
  }, []);

  // 2. Periodic Polling Loop
  const syncRelay = useCallback(async () => {
    if (!identity?.knotId) return;

    // Send heartbeat
    api.sendPresenceHeartbeat(identity.knotId).catch(() => {});

    // Health
    try {
      const health = await api.checkHealth();
      setRelayStatus(health);
    } catch {}

    // Network stats & nodes
    try {
      const stats = await api.fetchNetworkStats();
      if (stats?.success) setNetworkStats(stats);

      const nodesRes = await api.fetchNetworkNodes();
      if (nodesRes?.users) setDiscoveredNodes(nodesRes.users);
    } catch {}

    // Contact requests
    try {
      const reqRes = await api.fetchContactRequests(identity.knotId);
      if (reqRes?.success) {
        setIncomingRequests(reqRes.incoming?.filter(r => r.status === 'pending') || []);
        setOutgoingRequests(reqRes.outgoing || []);
      }
    } catch {}

    // Active Contact Presence & Typing
    if (activeContact?.knot_id) {
      try {
        const pres = await api.getPresence(activeContact.knot_id, identity.knotId);
        if (pres?.success) {
          setIsPeerOnline(pres.isOnline);
          setIsPeerTyping(pres.isTyping);
        }
        api.markReadAll(identity.knotId, activeContact.knot_id).catch(() => {});
      } catch {}
    }

    // Offline queue messages
    try {
      const msgRes = await api.fetchOfflineMessages(identity.knotId);
      if (msgRes?.success && msgRes.messages?.length > 0) {
        let newMsgsAdded = false;
        let playSound = false;
        const updatedMessages = { ...loadStoredMessages() };
        const storedContacts = loadStoredContacts();

        for (const rawMsg of msgRes.messages) {
          const senderId = rawMsg.sender_knot_id;
          if (!updatedMessages[senderId]) updatedMessages[senderId] = [];

          const existingIndex = updatedMessages[senderId].findIndex(m => String(m.id) === String(rawMsg._id));

          // If deleted on the wire, purge from local messages
          if (rawMsg.status === 'deleted') {
            if (existingIndex >= 0) {
              updatedMessages[senderId].splice(existingIndex, 1);
              newMsgsAdded = true;
            }
            continue;
          }

          if (existingIndex < 0) {
            let expiresAt = null;
            if (rawMsg.expires_at) {
              expiresAt = new Date(rawMsg.expires_at).getTime();
            } else if (rawMsg.ttlSeconds) {
              expiresAt = new Date(rawMsg.created_at).getTime() + (rawMsg.ttlSeconds * 1000);
            }

            if (expiresAt && expiresAt <= Date.now()) {
              if (rawMsg._id) {
                api.ackMessage(rawMsg._id).catch(() => {});
              }
              continue;
            }

            const plaintext = await decryptPayload(rawMsg.ciphertext, rawMsg.nonce || '', 'KNOTS_DEFAULT_SHARED_SECRET');

            updatedMessages[senderId].push({
              id: rawMsg._id,
              senderKnotId: senderId,
              plaintext,
              ciphertext: rawMsg.ciphertext,
              iv: rawMsg.nonce,
              tag: rawMsg.tag,
              reply_to: rawMsg.reply_to || null,
              type: rawMsg.type || 'text',
              sticker: rawMsg.sticker || null,
              reactions: rawMsg.reactions || [],
              edited: rawMsg.edited || false,
              status: rawMsg.status || 'queued',
              ttl: rawMsg.ttlSeconds || null,
              expiresAt,
              timestamp: new Date(rawMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            newMsgsAdded = true;

            // Check if contact is muted
            const senderContact = storedContacts.find(c => c.knot_id === senderId);
            if (!senderContact?.muted) {
              playSound = true;
            }

            if (rawMsg._id) {
              api.ackMessage(rawMsg._id).catch(() => {});
            }
          } else {
            const existingMsg = updatedMessages[senderId][existingIndex];
            if (rawMsg.edited && rawMsg.ciphertext && rawMsg.ciphertext !== existingMsg.ciphertext) {
              const updatedPlaintext = await decryptPayload(rawMsg.ciphertext, rawMsg.nonce || '', 'KNOTS_DEFAULT_SHARED_SECRET');
              existingMsg.plaintext = updatedPlaintext;
              existingMsg.ciphertext = rawMsg.ciphertext;
              existingMsg.edited = true;
              newMsgsAdded = true;
            }
            if (rawMsg.reactions && JSON.stringify(rawMsg.reactions) !== JSON.stringify(existingMsg.reactions || [])) {
              existingMsg.reactions = rawMsg.reactions;
              newMsgsAdded = true;
            }
            if (rawMsg.status && rawMsg.status !== existingMsg.status) {
              existingMsg.status = rawMsg.status;
              newMsgsAdded = true;
            }
          }
        }

        if (newMsgsAdded) {
          if (playSound) playPing();
          setMessages(updatedMessages);
          saveStoredMessages(updatedMessages);
        }
      }
    } catch (err) {
      console.warn('Offline queue poll error:', err.message);
    }

    // Sync outgoing sent messages' read statuses, reactions, and deletions
    try {
      const sentRes = await api.fetchSentStatuses(identity.knotId);
      if (sentRes?.success && sentRes.statuses?.length > 0) {
        let sentUpdated = false;
        const currentMsgs = { ...loadStoredMessages() };
        for (const item of sentRes.statuses) {
          const recipientId = item.recipient_knot_id;
          if (currentMsgs[recipientId]) {
            const msgIdx = currentMsgs[recipientId].findIndex(
              m => String(m.id) === String(item._id || item.id)
            );
            if (msgIdx >= 0) {
              if (item.status === 'deleted') {
                currentMsgs[recipientId].splice(msgIdx, 1);
                sentUpdated = true;
                continue;
              }
              const currentMsg = currentMsgs[recipientId][msgIdx];
              if (item.status && currentMsg.status !== item.status) {
                currentMsg.status = item.status;
                sentUpdated = true;
              }
              if (item.reactions && JSON.stringify(currentMsg.reactions || []) !== JSON.stringify(item.reactions || [])) {
                currentMsg.reactions = item.reactions;
                sentUpdated = true;
              }
              if (item.edited && item.ciphertext && item.ciphertext !== currentMsg.ciphertext) {
                currentMsg.edited = true;
                sentUpdated = true;
              }
            }
          }
        }
        if (sentUpdated) {
          setMessages(currentMsgs);
          saveStoredMessages(currentMsgs);
        }
      }
    } catch (err) {
      // silent catch for sent status sync
    }
  }, [identity?.knotId, activeContact?.knot_id]);

  useEffect(() => {
    if (!entered) return undefined;
    syncRelay();
    const interval = setInterval(syncRelay, 2500);
    return () => clearInterval(interval);
  }, [syncRelay, entered]);

  // 2b. Auto-burn / Self-destruct interval (1s)
  useEffect(() => {
    const burnInterval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        let hasExpired = false;
        const newMap = {};
        for (const [knotId, msgList] of Object.entries(prev)) {
          if (Array.isArray(msgList)) {
            const filtered = msgList.filter(msg => {
              if (msg.expiresAt && msg.expiresAt <= now) {
                hasExpired = true;
                return false;
              }
              return true;
            });
            newMap[knotId] = filtered;
          }
        }
        if (hasExpired) {
          saveStoredMessages(newMap);
          return newMap;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(burnInterval);
  }, []);

  // 3. Initiate Contact Request
  const handleSendRequest = async (targetKnotId, memo) => {
    if (targetKnotId === identity.knotId) {
      throw new Error('Cannot send contact handshake to yourself.');
    }
    const res = await api.sendContactRequest(identity.knotId, targetKnotId, memo);
    await syncRelay();
    return res;
  };

  // 4. Respond to Contact Request
  const handleRespondRequest = async (requestId, action, peerKnotId) => {
    await api.respondContactRequest(requestId, action);
    if (action === 'accept') {
      const newContact = {
        knot_id: peerKnotId,
        alias: peerKnotId.slice(0, 16),
        status: 'accepted',
        unreadCount: 0,
        muted: false,
        accepted_at: new Date().toISOString()
      };
      const updated = [...contacts.filter(c => c.knot_id !== peerKnotId), newContact];
      setContacts(updated);
      saveStoredContacts(updated);
      setActiveContact(newContact);
      playPing();
    } else if (action === 'reject') {
      await syncRelay();
    }
  };

  // 5. Send Encrypted Message
  const handleSendMessage = async (recipientKnotId, plaintext, ttlSeconds, replyTo = null, type = 'text', sticker = null) => {
    const encResult = await encryptPayload(plaintext, 'KNOTS_DEFAULT_SHARED_SECRET');

    const res = await api.sendEncryptedMessage({
      recipientKnotId,
      senderKnotId: identity.knotId,
      ciphertext: encResult.ciphertext,
      nonce: encResult.iv,
      tag: encResult.tag,
      chainCounter: (messages[recipientKnotId]?.length || 0) + 1,
      ttlSeconds,
      replyTo,
      type,
      sticker
    });

    const now = Date.now();
    const expiresAt = ttlSeconds ? now + (ttlSeconds * 1000) : null;

    const newMsg = {
      id: res.messageId || now.toString(),
      senderKnotId: identity.knotId,
      plaintext,
      ciphertext: encResult.ciphertext,
      iv: encResult.iv,
      tag: encResult.tag,
      reply_to: replyTo,
      type,
      sticker,
      reactions: [],
      status: 'queued',
      ttl: ttlSeconds,
      expiresAt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = {
      ...messages,
      [recipientKnotId]: [...(messages[recipientKnotId] || []), newMsg]
    };
    setMessages(updated);
    saveStoredMessages(updated);
    playPing();
  };

  // 6. Message Reaction
  const handleReactMessage = async (messageId, emoji) => {
    if (!activeContact) return;
    const recipientKnotId = activeContact.knot_id;

    const currentMsgs = messages[recipientKnotId] || [];
    const updated = currentMsgs.map(m => {
      if (String(m.id) === String(messageId)) {
        let reactions = m.reactions ? [...m.reactions] : [];
        const existingIdx = reactions.findIndex(r => r.knotId === identity.knotId);
        if (existingIdx >= 0) {
          if (reactions[existingIdx].emoji === emoji) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions[existingIdx] = { emoji, knotId: identity.knotId };
          }
        } else {
          reactions.push({ emoji, knotId: identity.knotId });
        }
        return { ...m, reactions };
      }
      return m;
    });

    const allUpdated = { ...messages, [recipientKnotId]: updated };
    setMessages(allUpdated);
    saveStoredMessages(allUpdated);

    if (messageId) {
      api.reactToMessage(messageId, emoji, identity.knotId).catch(() => {});
    }
  };

  // 7. Edit Message
  const handleEditMessage = async (messageId, newPlaintext) => {
    if (!activeContact) return;
    const recipientKnotId = activeContact.knot_id;
    const encResult = await encryptPayload(newPlaintext, 'KNOTS_DEFAULT_SHARED_SECRET');

    const currentMsgs = messages[recipientKnotId] || [];
    const updated = currentMsgs.map(m => {
      if (String(m.id) === String(messageId)) {
        return {
          ...m,
          plaintext: newPlaintext,
          ciphertext: encResult.ciphertext,
          iv: encResult.iv,
          tag: encResult.tag,
          edited: true
        };
      }
      return m;
    });

    const allUpdated = { ...messages, [recipientKnotId]: updated };
    setMessages(allUpdated);
    saveStoredMessages(allUpdated);

    api.editMessage(messageId, {
      senderKnotId: identity.knotId,
      ciphertext: encResult.ciphertext,
      nonce: encResult.iv,
      tag: encResult.tag
    }).catch(err => console.warn('Edit sync error:', err.message));
  };

  // 8. Delete Message for Everyone
  const handleDeleteMessage = async (messageId) => {
    if (!activeContact) return;
    const recipientKnotId = activeContact.knot_id;

    const currentMsgs = messages[recipientKnotId] || [];
    const updated = currentMsgs.filter(m => String(m.id) !== String(messageId));

    const allUpdated = { ...messages, [recipientKnotId]: updated };
    setMessages(allUpdated);
    saveStoredMessages(allUpdated);

    api.deleteMessage(messageId, identity.knotId).catch(err => console.warn('Delete sync error:', err.message));
  };

  // 9. Instant Clear Chat History (messages only)
  const handleClearChat = async () => {
    if (!activeContact) return;
    const recipientKnotId = activeContact.knot_id;

    const allUpdated = { ...messages, [recipientKnotId]: [] };
    setMessages(allUpdated);
    saveStoredMessages(allUpdated);

    api.clearChat(identity.knotId, recipientKnotId).catch(err => console.warn('Clear chat sync error:', err.message));
  };

  // 10. Mute / Unmute Chat for a specific person
  const handleToggleMuteContact = (knotId) => {
    const updated = contacts.map(c => {
      if (c.knot_id === knotId) {
        return { ...c, muted: !c.muted };
      }
      return c;
    });
    setContacts(updated);
    saveStoredContacts(updated);
    if (activeContact?.knot_id === knotId) {
      setActiveContact(prev => prev ? { ...prev, muted: !prev.muted } : prev);
    }
  };

  // 11. Delete Entire Chat & Contact for a specific person
  const handleDeleteEntireChat = async (knotId) => {
    // Clear messages locally
    const updatedMsgs = { ...messages };
    delete updatedMsgs[knotId];
    setMessages(updatedMsgs);
    saveStoredMessages(updatedMsgs);

    // Remove contact from list
    const updatedContacts = contacts.filter(c => c.knot_id !== knotId);
    setContacts(updatedContacts);
    saveStoredContacts(updatedContacts);

    // Reset active contact if open
    if (activeContact?.knot_id === knotId) {
      setActiveContact(null);
      setDetailsOpen(false);
    }

    // Clear on backend relay
    if (identity?.knotId) {
      api.clearChat(identity.knotId, knotId).catch(err => console.warn('Clear chat sync error:', err.message));
    }
  };

  // 12. Typing Indicator
  const handleSendTyping = (targetKnotId) => {
    if (!identity?.knotId) return;
    api.sendPresenceHeartbeat(identity.knotId, targetKnotId).catch(() => {});
  };

  // 13. Block Contact
  const handleBlockContact = (knotId) => {
    const updated = contacts.map(c => c.knot_id === knotId ? { ...c, status: 'blocked' } : c);
    setContacts(updated);
    saveStoredContacts(updated);
    if (activeContact?.knot_id === knotId) {
      setActiveContact(null);
      setDetailsOpen(false);
    }
  };

  // 14. Update Contact Alias
  const handleUpdateAlias = (knotId, alias) => {
    const updated = contacts.map(c => c.knot_id === knotId ? { ...c, alias } : c);
    setContacts(updated);
    saveStoredContacts(updated);
    if (activeContact?.knot_id === knotId) {
      setActiveContact({ ...activeContact, alias });
    }
  };

  // 15. Key Rotation
  const handleRotateKeys = async () => {
    const freshIdentity = await generateIdentity('base58');
    await api.rotateKeys({
      oldKnotId: identity.knotId,
      newKnotId: freshIdentity.knotId,
      newPublicKey: freshIdentity.publicKey,
      newEd25519Key: freshIdentity.ed25519Key
    });

    saveStoredIdentity(freshIdentity);
    setIdentity(freshIdentity);
    await syncRelay();
  };

  // 16. Panic Button / Hard Purge
  const handleConfirmBurn = async () => {
    try {
      if (identity?.knotId) {
        await api.purgeKnot(identity.knotId).catch(() => {});
      }
    } finally {
      purgeAllLocalVault();
      setContacts([]);
      setMessages({});
      setActiveContact(null);
      setDetailsOpen(false);
      setIncomingRequests([]);
      setOutgoingRequests([]);

      const newIdentity = await generateIdentity('base58');
      saveStoredIdentity(newIdentity);
      setIdentity(newIdentity);
      await api.registerKnot(newIdentity).catch(() => {});
      await syncRelay();
    }
  };

  const handleGoHome = () => {
    setActiveContact(null);
    setDetailsOpen(false);
  };

  const isRelayOnline = relayStatus?.status === 'ok';

  if (!entered) {
    return <KnotsLanding onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="knots-shell text-[#191917] h-screen w-screen flex flex-col overflow-hidden bg-[#f5f4f1] relative select-none">
      {/* ========================================================================= */}
      {/* MOBILE EXPERIENCE (< 768px): Native Android App Look & Feel */}
      {/* ========================================================================= */}
      {isMobile ? (
        activeContact ? (
          /* Full Screen Chat View with Android Back Navigation */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ChatView
              activeContact={activeContact}
              messages={messages}
              onSendMessage={handleSendMessage}
              onReactMessage={handleReactMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onClearChat={handleClearChat}
              onToggleMute={handleToggleMuteContact}
              onDeleteEntireChat={handleDeleteEntireChat}
              identity={identity}
              onOpenNewChat={() => setNewChatOpen(true)}
              onToggleDetails={() => setDetailsOpen(!detailsOpen)}
              detailsOpen={detailsOpen}
              isPeerOnline={isPeerOnline}
              isPeerTyping={isPeerTyping}
              onSendTyping={handleSendTyping}
              onGoHome={handleGoHome}
            />

            {/* Peer Profile Drawer (Mobile Sheet) */}
            {detailsOpen && (
              <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
                <PeerProfileDrawer
                  contact={activeContact}
                  onClose={() => setDetailsOpen(false)}
                  onBlockContact={handleBlockContact}
                  onUpdateAlias={handleUpdateAlias}
                  onToggleMute={handleToggleMuteContact}
                  onClearChat={handleClearChat}
                  onDeleteEntireChat={handleDeleteEntireChat}
                />
              </div>
            )}
          </div>
        ) : (
          /* Mobile Tabs Shell */
          <div className="flex-1 flex flex-col h-full overflow-hidden pb-[68px]">
            {/* Android Top App Bar (Solid, Sharp, High Contrast) */}
            <header className="h-14 px-4 border-b border-[#191917]/15 bg-[#ffffff] flex items-center justify-between shrink-0 z-30">
              <div
                onClick={handleGoHome}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-[#191917] border border-[#191917]">
                  <iconify-icon icon="solar:star-fall-bold-duotone" class="text-lg text-[#ffffff]"></iconify-icon>
                </div>
                <span className="text-lg text-[#191917]" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}>
                  Knots.
                </span>
              </div>

              {/* Status Indicator & Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#ffffff] border border-[#191917]/20 px-2.5 py-1 rounded-full leading-none">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isRelayOnline ? 'bg-[#191917] animate-pulse' : 'bg-[#a9a99f]'}`}></span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#191917] font-medium leading-none">
                    {isRelayOnline ? 'Online' : 'Sync'}
                  </span>
                </div>

                <button
                  onClick={() => setDossierOpen(true)}
                  className="w-8 h-8 rounded-[4px] bg-[#ffffff] border border-[#191917]/20 flex items-center justify-center text-[#191917] hover:bg-[#f5f4f1] transition-colors"
                >
                  <iconify-icon icon="solar:shield-warning-bold-duotone" class="text-base"></iconify-icon>
                </button>
              </div>
            </header>

            {/* Mobile Tab Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
              {mobileTab === 'chats' && (
                <>
                  <ContactList
                    contacts={contacts}
                    activeContact={activeContact}
                    onSelectContact={(c) => {
                      setActiveContact(c);
                      setDetailsOpen(false);
                    }}
                    incomingRequests={incomingRequests}
                    onRespondRequest={handleRespondRequest}
                    messages={messages}
                    onOpenNewChat={() => setNewChatOpen(true)}
                    onOpenRadar={() => setMobileTab('discover')}
                    onToggleMute={handleToggleMuteContact}
                    onDeleteEntireChat={handleDeleteEntireChat}
                  />

                  {/* Android Floating Action Button (FAB) for Start Chat */}
                  <button
                    onClick={() => setNewChatOpen(true)}
                    className="android-fab"
                  >
                    <iconify-icon icon="solar:pen-new-square-bold-duotone" class="text-2xl text-[#ffffff]"></iconify-icon>
                  </button>
                </>
              )}

              {mobileTab === 'discover' && (
                <NetworkRadar
                  networkStats={networkStats}
                  discoveredNodes={discoveredNodes}
                  onInitiateHandshake={handleSendRequest}
                  myKnotId={identity?.knotId}
                />
              )}

              {mobileTab === 'vault' && (
                <SecurityVault
                  identity={identity}
                  onRotateKeys={handleRotateKeys}
                  onOpenPanic={() => setPanicOpen(true)}
                />
              )}

              {mobileTab === 'profile' && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3 borealis-card p-4">
                    <div className="w-14 h-14 rounded-[4px] bg-[#191917] border border-[#191917] flex items-center justify-center text-lg font-mono text-[#ffffff] relative shrink-0">
                      {identity?.knotId ? identity.knotId.slice(4, 6) : 'ME'}
                      <span className="w-3 h-3 rounded-full bg-[#ffffff] border-2 border-[#191917] absolute -bottom-0.5 -right-0.5"></span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm text-[#191917]">
                        My Knots ID
                      </div>
                      <div className="text-[11px] font-mono text-[#6c6c64] truncate mt-0.5">
                        {identity?.knotId}
                      </div>
                    </div>
                  </div>

                  <SecurityVault
                    identity={identity}
                    onRotateKeys={handleRotateKeys}
                    onOpenPanic={() => setPanicOpen(true)}
                  />
                </div>
              )}
            </main>

            {/* Android Bottom Navigation Bar */}
            <nav className="android-bottom-nav">
              <button
                onClick={() => setMobileTab('chats')}
                className={`android-nav-item ${mobileTab === 'chats' ? 'active' : ''}`}
              >
                <div className="nav-icon-pill">
                  <iconify-icon icon="solar:chat-round-line-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <span>Chats</span>
              </button>

              <button
                onClick={() => setMobileTab('discover')}
                className={`android-nav-item ${mobileTab === 'discover' ? 'active' : ''}`}
              >
                <div className="nav-icon-pill">
                  <iconify-icon icon="solar:compass-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <span>Discover</span>
              </button>

              <button
                onClick={() => setMobileTab('vault')}
                className={`android-nav-item ${mobileTab === 'vault' ? 'active' : ''}`}
              >
                <div className="nav-icon-pill">
                  <iconify-icon icon="solar:shield-check-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <span>Vault</span>
              </button>

              <button
                onClick={() => setMobileTab('profile')}
                className={`android-nav-item ${mobileTab === 'profile' ? 'active' : ''}`}
              >
                <div className="nav-icon-pill">
                  <iconify-icon icon="solar:user-circle-bold-duotone" class="text-xl"></iconify-icon>
                </div>
                <span>Profile</span>
              </button>
            </nav>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* TABLET & DESKTOP MASTER-DETAIL LAYOUT */
        /* ========================================================================= */
        <div className="flex-1 flex h-full overflow-hidden">
          {/* Left Master Sidebar */}
          <aside className="w-80 lg:w-96 border-r border-[#191917]/15 bg-[#f5f4f1] flex flex-col h-full shrink-0 z-20">
            <SidebarHeader
              identity={identity}
              onOpenProfile={() => setProfileOpen(true)}
              onOpenNewChat={() => setNewChatOpen(true)}
              onOpenDossier={() => setDossierOpen(true)}
              networkStats={networkStats}
              relayStatus={relayStatus}
              onGoHome={handleGoHome}
            />

            <ContactList
              contacts={contacts}
              activeContact={activeContact}
              onSelectContact={(c) => {
                setActiveContact(c);
                setDetailsOpen(false);
              }}
              incomingRequests={incomingRequests}
              onRespondRequest={handleRespondRequest}
              messages={messages}
              onOpenNewChat={() => setNewChatOpen(true)}
              onOpenRadar={() => setRadarOpen(true)}
              onToggleMute={handleToggleMuteContact}
              onDeleteEntireChat={handleDeleteEntireChat}
            />
          </aside>

          {/* Center Main Chat Canvas / Borealis Standby Dashboard */}
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <ChatView
              activeContact={activeContact}
              messages={messages}
              onSendMessage={handleSendMessage}
              onReactMessage={handleReactMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onClearChat={handleClearChat}
              onToggleMute={handleToggleMuteContact}
              onDeleteEntireChat={handleDeleteEntireChat}
              identity={identity}
              onOpenNewChat={() => setNewChatOpen(true)}
              onToggleDetails={() => setDetailsOpen(!detailsOpen)}
              detailsOpen={detailsOpen}
              isPeerOnline={isPeerOnline}
              isPeerTyping={isPeerTyping}
              onSendTyping={handleSendTyping}
              onGoHome={handleGoHome}
            />
          </main>

          {/* Right Peer Profile Drawer */}
          {detailsOpen && activeContact && (
            <PeerProfileDrawer
              contact={activeContact}
              onClose={() => setDetailsOpen(false)}
              onBlockContact={handleBlockContact}
              onUpdateAlias={handleUpdateAlias}
              onToggleMute={handleToggleMuteContact}
              onClearChat={handleClearChat}
              onDeleteEntireChat={handleDeleteEntireChat}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      <NewChatModal
        isOpen={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSendRequest={handleSendRequest}
        discoveredNodes={discoveredNodes}
        myKnotId={identity?.knotId}
      />

      <MyProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        identity={identity}
        onRotateKeys={handleRotateKeys}
        onOpenPanic={() => setPanicOpen(true)}
      />

      <NetworkRadarModal
        isOpen={radarOpen}
        onClose={() => setRadarOpen(false)}
        networkStats={networkStats}
        discoveredNodes={discoveredNodes}
        onInitiateHandshake={handleSendRequest}
        myKnotId={identity?.knotId}
      />

      <ThreatModelModal
        isOpen={dossierOpen}
        onClose={() => setDossierOpen(false)}
      />

      <BurnConfirmModal
        isOpen={panicOpen}
        onClose={() => setPanicOpen(false)}
        onConfirmBurn={handleConfirmBurn}
        knotId={identity?.knotId}
      />
    </div>
  );
}
