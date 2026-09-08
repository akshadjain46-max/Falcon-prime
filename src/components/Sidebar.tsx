import React from 'react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  caseCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  caseCount,
}) => {
  const navItems: {
    id: NavigationTab;
    label: string;
    icon: string;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'data-collection',
      label: 'Data Collection',
      icon: 'analytics',
    },
    {
      id: 'relationship-mapping',
      label: 'City Investigation Core',
      icon: 'hub',
      badge: 'LIVE MAP',
      badgeColor: 'bg-[#adc6ff]/20 text-[#adc6ff] border-[#adc6ff]/40',
    },
    {
      id: 'case-manager',
      label: 'Linked Cases Matrix',
      icon: 'folder_open',
      badge: `${caseCount} Active`,
      badgeColor: 'bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/40',
    },
    {
      id: 'pattern-detection',
      label: 'Pattern Detection',
      icon: 'radar',
    },
    {
      id: 'subscriptions',
      label: 'Account & Subscriptions',
      icon: 'shield',
      badge: 'TOP SECRET',
      badgeColor: 'bg-[#ffb95f]/20 text-[#ffb95f] border-[#ffb95f]/40',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'description',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#080808] border-r border-[#1a1a1a] z-50 flex flex-col select-none">
      {/* Brand Header */}
      <div 
        onClick={() => onSelectTab('data-collection')}
        className="p-4 flex items-center gap-3 border-b border-[#1a1a1a] cursor-pointer group"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-[16px] font-bold tracking-tight text-[#e0e0e0] leading-none">
            Falcon
          </h1>
          <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mt-1">
            INTELLIGENCE CORE
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 pt-4">
        <h2 className="text-[11px] uppercase text-gray-500 font-bold mb-3 tracking-widest">Navigation Modules</h2>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all group ${
                isActive
                  ? 'border-l-2 border-blue-500 bg-[#111] text-blue-400 font-semibold shadow-sm'
                  : 'text-gray-400 hover:bg-[#111] hover:text-[#e0e0e0]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-[19px] transition-transform ${
                    isActive ? 'scale-105 text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                    isActive
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-800/40'
                      : 'bg-[#151518] text-gray-400 border border-gray-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Telemetry Status Footer */}
      <div className="p-4 border-t border-[#1a1a1a] space-y-2.5 bg-[#080808]">
        <div className="bg-[#111] p-3 rounded-lg border border-blue-900/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-semibold text-[#e0e0e0]">Active Ingest Pipeline</span>
            <span className="px-1.5 py-0.2 bg-blue-900/40 text-blue-400 text-[9px] rounded font-mono font-bold">100% OK</span>
          </div>
          <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden my-1.5">
            <div className="bg-blue-500 h-full w-[94%] rounded-full"></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>TLS 1.3 ENCRYPTED</span>
            <span className="text-emerald-400">SYNCED</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-gray-500 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="font-bold tracking-wider">AEGIS v4.8 SECURE</span>
          </div>
          <span>GRID ID: 9022-A</span>
        </div>
      </div>
    </aside>
  );
};
