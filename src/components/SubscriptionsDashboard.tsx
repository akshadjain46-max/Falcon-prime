import React, { useState } from 'react';
import { SubscriptionItem, UserProfile } from '../types';

interface SubscriptionsDashboardProps {
  user: UserProfile;
  subscriptions: SubscriptionItem[];
  onUpdateSubscription: (id: string, newStatus: 'ACTIVE' | 'RENEWING_SOON' | 'STANDBY') => void;
  documentCount?: number;
}

export const SubscriptionsDashboard: React.FC<SubscriptionsDashboardProps> = ({
  user,
  subscriptions,
  documentCount = 0,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const categories = ['ALL', 'Core System License', 'Telecom & Tower Telemetry', 'Visual Forensics', 'Financial Forensics', 'Law Enforcement Intelligence'];

  const filteredSubs = selectedCategory === 'ALL' 
    ? subscriptions 
    : subscriptions.filter((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col w-full p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-[#0c0c0e] border border-blue-500/80 text-[#e0e0e0] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-blue-400">tune</span>
          <span className="text-[13px] font-mono">{toastMsg}</span>
        </div>
      )}

      {/* User Clearance & Account Status Hero Card */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Avatar & Persona */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-20 h-20 rounded-lg border-2 border-blue-500/80 object-cover shadow-xl"
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-400 font-mono">
                ONLINE
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[20px] font-bold text-[#e0e0e0]">{user.name}</h1>
                <span className="text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-800/40">
                  {user.accountStatus}
                </span>
              </div>
              <p className="text-[13px] text-blue-400 font-semibold">{user.role} • {user.badgeNumber}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">{user.department}</p>
            </div>
          </div>

          {/* Quick Account Status Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-[#111] p-3 rounded-lg border border-gray-800 text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Security Clearance</span>
              <span className="text-[11px] font-bold text-emerald-400 font-mono mt-1 block">LEVEL 4 - TOP SECRET</span>
            </div>

            <div className="bg-[#111] p-3 rounded-lg border border-gray-800 text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Active Feeds</span>
              <span className="text-[15px] font-bold text-blue-400 font-mono mt-0.5 block">{subscriptions.length} Systems</span>
            </div>

            <div className="bg-[#111] p-3 rounded-lg border border-gray-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase block">Ingested Documents</span>
              <span className="text-[15px] font-bold text-emerald-400 font-mono mt-0.5 block">{documentCount} Files</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Section Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-[17px] font-bold text-[#e0e0e0]">Active Forensic Subscriptions & Feeds</h2>
          <p className="text-[12px] text-gray-400">
            Managed intelligence feeds, hardware telemetries, and multi-jurisdiction databases.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 bg-[#0a0a0a] p-1 rounded-lg border border-[#1a1a1a]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-gray-400 hover:text-[#e0e0e0]'
              }`}
            >
              {cat === 'ALL' ? 'All Active Feeds' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubs.map((sub) => (
          <div
            key={sub.id}
            className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-5 shadow-lg flex flex-col justify-between hover:border-gray-700 transition-all group"
          >
            <div>
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">{sub.iconName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">{sub.category}</span>
                    <h3 className="font-bold text-[14px] text-[#e0e0e0] leading-snug">{sub.title}</h3>
                  </div>
                </div>

                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                  {sub.status}
                </span>
              </div>

              {/* Tier & Renewal */}
              <div className="bg-[#111] p-3 rounded-lg border border-gray-800 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service Level:</span>
                  <span className="font-bold text-blue-400">{sub.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Billing Cycle:</span>
                  <span className="font-mono text-[#e0e0e0]">{sub.renewalDate}</span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-1.5 mb-4">
                {sub.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 font-mono">
                    <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500">ID: {sub.id}</span>
              <button
                onClick={() => showToast(`Diagnostics running for ${sub.title}. Uplink status: 100% HEALTH.`)}
                className="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Run Diagnostics</span>
                <span className="material-symbols-outlined text-[14px]">tune</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Security Credentials & API Gateway Section */}
      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
          <div>
            <h3 className="text-[15px] font-bold text-[#e0e0e0]">Investigator Security Credentials & API Tokens</h3>
            <p className="text-[12px] text-gray-400">Use these credentials to authorize field laptops and tactical patrol squad uplinks.</p>
          </div>
          <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">
            TLS 1.3 CERTIFIED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#111] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 block">PRIMARY JWT ACCESS KEY:</span>
              <span className="text-xs font-mono text-[#e0e0e0]">eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...8842</span>
            </div>
            <button
              onClick={() => copyToClipboard('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.aegis.investigator.9042', 'jwt')}
              className="px-2.5 py-1 rounded-lg bg-[#151518] text-xs font-mono text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer border border-gray-800"
            >
              {copiedKey === 'jwt' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="bg-[#111] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 block">SS7 TELECOM PROXY ENDPOINT:</span>
              <span className="text-xs font-mono text-[#e0e0e0]">wss://ss7-carrier-relay.aegis.gov:8443/v4</span>
            </div>
            <button
              onClick={() => copyToClipboard('wss://ss7-carrier-relay.aegis.gov:8443/v4', 'ss7')}
              className="px-2.5 py-1 rounded-lg bg-[#151518] text-xs font-mono text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer border border-gray-800"
            >
              {copiedKey === 'ss7' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
