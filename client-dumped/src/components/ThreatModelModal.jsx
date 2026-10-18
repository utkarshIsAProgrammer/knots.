import React, { useState } from 'react';

export default function ThreatModelModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('arch');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#191917]/15 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#191917] tracking-tight">How Knots Protects Your Privacy</h3>
            <p className="text-[11px] text-[#6c6c64]">
              Private, secure messaging without tracking or data collection
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[3px] bg-[#191917]/5 border border-[#191917]/15 flex items-center justify-center text-[#6c6c64] hover:text-[#191917] hover:bg-[#191917]/8 transition-colors"
          >
            <iconify-icon icon="solar:close-circle-bold-duotone" class="text-xl"></iconify-icon>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex px-4 pt-3 gap-2 border-b border-[#191917]/10">
          <button
            onClick={() => setActiveTab('arch')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-medium transition-all ${
              activeTab === 'arch'
                ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
            }`}
          >
            How It Works
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-medium transition-all ${
              activeTab === 'crypto'
                ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
            }`}
          >
            Encryption
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-medium transition-all ${
              activeTab === 'privacy'
                ? 'bg-[#191917] text-[#f6f5f2] font-semibold'
                : 'bg-[#191917]/5 text-[#6c6c64] hover:text-[#191917]'
            }`}
          >
            No Tracking
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
          {activeTab === 'arch' && (
            <div className="flex flex-col gap-3">
              <div className="borealis-card p-4 space-y-1.5">
                <div className="text-xs font-semibold text-[#191917] flex items-center gap-2">
                  <iconify-icon icon="solar:server-square-bold-duotone" class="text-base text-[#191917]"></iconify-icon>
                  <span>Private by Design</span>
                </div>
                <p className="text-xs text-[#3f3f3a] leading-relaxed">
                  Unlike traditional chat apps, the server cannot read your messages. It only relays encrypted data between devices, so nobody in between can ever see what you write.
                </p>
              </div>

              <div className="borealis-card p-4 space-y-1.5 border-[#191917]/15">
                <div className="text-xs font-semibold text-[#191917] flex items-center gap-2">
                  <iconify-icon icon="solar:shield-check-bold-duotone" class="text-base"></iconify-icon>
                  <span>Data Protection</span>
                </div>
                <p className="text-xs text-[#3f3f3a] leading-relaxed">
                  Even if the server was inspected, only unreadable encrypted content exists. Your private keys never leave your device.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'crypto' && (
            <div className="flex flex-col gap-3">
              <div className="borealis-card p-4 space-y-2">
                <div className="text-xs font-semibold text-[#191917] flex items-center gap-2">
                  <iconify-icon icon="solar:key-square-bold-duotone" class="text-base"></iconify-icon>
                  <span>Security Features</span>
                </div>
                <ul className="text-xs text-[#3f3f3a] space-y-1.5">
                  <li><strong className="text-[#191917]">Device Encryption:</strong> Messages are locked before they leave your device.</li>
                  <li><strong className="text-[#191917]">Unique Key per Message:</strong> Each message uses fresh encryption keys.</li>
                  <li><strong className="text-[#191917]">Tamper Protection:</strong> Messages cannot be altered in transit without detection.</li>
                </ul>
              </div>

              <div className="borealis-card p-4 space-y-1.5">
                <div className="text-xs font-semibold text-[#191917] flex items-center gap-2">
                  <iconify-icon icon="solar:laptop-minimalistic-bold-duotone" class="text-base text-[#191917]"></iconify-icon>
                  <span>On-Device Storage</span>
                </div>
                <p className="text-xs text-[#3f3f3a] leading-relaxed">
                  All encryption happens directly on your phone or tablet. Your private keys stay safely stored in your device's browser vault.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="flex flex-col gap-3">
              <div className="borealis-card p-4 space-y-1.5">
                <div className="text-xs font-semibold text-[#191917] flex items-center gap-2">
                  <iconify-icon icon="solar:user-cross-bold-duotone" class="text-base"></iconify-icon>
                  <span>No Personal Information</span>
                </div>
                <p className="text-xs text-[#3f3f3a] leading-relaxed">
                  Knots never asks for your phone number, email address, real name, or password. You are identified solely by an anonymous Knots ID.
                </p>
              </div>

              <div className="borealis-card p-4 space-y-1.5">
                <div className="text-xs font-semibold text-[#191917] flex items-center gap-2">
                  <iconify-icon icon="solar:fire-bold-duotone" class="text-base text-[#191917]"></iconify-icon>
                  <span>Automatic Message Disappearance</span>
                </div>
                <p className="text-xs text-[#3f3f3a] leading-relaxed">
                  You can set messages to self-destruct after 30 seconds, 1 hour, or 24 hours. Messages automatically vanish from both devices and the server.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#191917] text-[#f6f5f2] font-semibold text-xs rounded-[4px] hover:bg-[#3f3f3a] transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
