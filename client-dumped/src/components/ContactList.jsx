import React, { useState } from 'react';
import ContactItem from './ContactItem.jsx';

export default function ContactList({
  contacts,
  activeContact,
  onSelectContact,
  incomingRequests,
  onRespondRequest,
  messages,
  onOpenNewChat,
  onOpenRadar,
  onToggleMute,
  onDeleteEntireChat
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'requests'

  const filteredContacts = contacts.filter(c =>
    (c.alias || c.knot_id).toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative flex items-center">
          <iconify-icon
            icon="solar:magnifer-bold-duotone"
            class="absolute left-3.5 text-base text-[#6c6c64] pointer-events-none"
          ></iconify-icon>

          <input
            type="text"
            placeholder="Search chats or Knots IDs..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-[#ffffff] border border-[#191917]/15 rounded-[4px] pl-10 pr-4 py-2 text-xs text-[#191917] placeholder-[#a9a99f] focus:outline-none focus:border-[#191917]/30 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center px-4 py-1.5 gap-2 border-b border-[#191917]/15">
        <button
          onClick={() => setActiveTab('chats')}
          className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-all ${
            activeTab === 'chats'
              ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
              : 'bg-[#191917]/5 text-[#3f3f3a] hover:text-[#191917] hover:bg-[#191917]/8'
          }`}
        >
          Chats
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
              : 'bg-[#191917]/5 text-[#3f3f3a] hover:text-[#191917] hover:bg-[#191917]/8'
          }`}
        >
          <span>Requests</span>
          {incomingRequests?.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#191917] text-[#f6f5f2] text-[9px] flex items-center justify-center font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>

        {onOpenRadar && (
          <button
            onClick={onOpenRadar}
            className="ml-auto px-2.5 py-1 rounded-[3px] text-xs font-medium bg-[#191917]/5 text-[#3f3f3a] hover:text-[#191917] hover:bg-[#191917]/8 transition-all flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#191917]"></span>
            <span>Discover</span>
          </button>
        )}
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-y-auto py-1">
        {activeTab === 'requests' ? (
          <div className="p-4 flex flex-col gap-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#6c6c64]">
              Pending Chat Requests ({incomingRequests?.length || 0})
            </div>

            {(!incomingRequests || incomingRequests.length === 0) ? (
              <div className="py-12 text-center text-[#6c6c64] text-xs">
                No pending chat requests.
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div
                  key={req._id || req.requestId}
                  className="borealis-card p-3.5 flex flex-col gap-2.5"
                >
                  <div className="text-xs font-mono font-bold text-[#191917] break-all">
                    {req.from_knot_id}
                  </div>
                  {req.memo && (
                    <div className="text-xs text-[#3f3f3a] italic bg-[#191917]/5 p-2 rounded-[3px]">
                      "{req.memo}"
                    </div>
                  )}

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => onRespondRequest(req._id || req.requestId, 'accept', req.from_knot_id)}
                      className="flex-1 py-1.5 bg-[#191917] text-[#f6f5f2] rounded-[3px] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onRespondRequest(req._id || req.requestId, 'reject', req.from_knot_id)}
                      className="flex-1 py-1.5 bg-[#191917]/5 border border-[#191917]/15 text-[#191917] rounded-[3px] text-xs font-medium hover:bg-[#191917]/8 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Contacts Stream */
          filteredContacts.length === 0 ? (
            <div className="py-16 px-6 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-[4px] bg-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-[#3f3f3a]">
                <iconify-icon icon="solar:chat-round-line-bold-duotone" class="text-2xl"></iconify-icon>
              </div>

              <div>
                <div className="text-sm font-semibold text-[#191917]">No Conversations Yet</div>
                <div className="text-xs text-[#6c6c64] mt-1 max-w-[200px] leading-relaxed">
                  Start a new private chat with anyone on Knots.
                </div>
              </div>

              <button
                onClick={onOpenNewChat}
                className="mt-2 px-4 py-2 bg-[#191917] text-[#f6f5f2] rounded-[3px] text-xs font-semibold hover:bg-[#3f3f3a] transition-colors"
              >
                + New Chat
              </button>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const contactMsgs = messages[contact.knot_id] || [];
              const lastMsg = contactMsgs[contactMsgs.length - 1];

              return (
                <ContactItem
                  key={contact.knot_id}
                  contact={contact}
                  isSelected={activeContact?.knot_id === contact.knot_id}
                  onSelect={() => onSelectContact(contact)}
                  lastMessage={lastMsg}
                  onToggleMute={onToggleMute}
                  onDeleteEntireChat={onDeleteEntireChat}
                />
              );
            })
          )
        )}
      </div>
    </div>
  );
}
