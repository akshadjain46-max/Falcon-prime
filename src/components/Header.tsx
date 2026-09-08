import React, { useState } from 'react';
import { UserProfile, NavigationTab } from '../types';

interface HeaderProps {
  user: UserProfile;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onSearch: (query: string) => void;
  onLogout: () => void;
  notificationCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSelectTab,
  onSearch,
  onLogout,
  notificationCount
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-[#0a0a0a] backdrop-blur-md border-b border-[#1a1a1a] z-40 px-6 flex items-center justify-between">
      {/* Search intelligence nodes */}
      <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#111] px-4 py-1.5 rounded-lg border border-gray-800 w-96 focus-within:border-blue-500/70 transition-all">
        <span className="material-symbols-outlined text-gray-500 text-[20px] mr-2 select-none">search</span>
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search intelligence nodes, suspects, plates, IMEIs..."
          className="bg-transparent border-none text-[13px] text-[#e0e0e0] placeholder-gray-500 focus:outline-none w-full"
        />
      </form>

      {/* Right Action Icons & User Profile */}
      <div className="flex items-center gap-5">
        {/* Quick Mode Switcher Pills */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#111] p-1 rounded-lg border border-gray-800">
          <button
            onClick={() => onSelectTab('relationship-mapping')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-900/30 hover:bg-blue-900/50 transition-colors"
            title="Launch Animated City Map Investigation"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Live City Core</span>
          </button>

          <button
            onClick={() => onSelectTab('case-manager')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-900/20 transition-colors"
            title="Linked Cases Matrix"
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            <span>4 Linked Cases</span>
          </button>
        </div>

        {/* Notifications Icon with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-[#e0e0e0] hover:bg-[#151518] rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0c0c0e] border border-gray-800 rounded-lg shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800 mb-2">
                <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Live System Alerts</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono">6 Nodes Active</span>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="p-2.5 rounded bg-[#151518] border border-red-900/30 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-400 text-[18px]">warning</span>
                  <div>
                    <p className="font-semibold text-red-200">Cross-Case Alert: Viktor Vance</p>
                    <p className="text-[11px] text-gray-400">ALPR Cam #22 spotted Black SUV [7XYZ89] on Grand Central Ave.</p>
                    <span className="text-[9px] text-gray-500 font-mono">2 mins ago</span>
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#151518] border border-emerald-900/30 flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">cell_tower</span>
                  <div>
                    <p className="font-semibold text-emerald-300">CDR Ingestion Complete</p>
                    <p className="text-[11px] text-gray-400">842 call records parsed into correlation graph.</p>
                    <span className="text-[9px] text-gray-500 font-mono">5 mins ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile Section */}
        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-4 border-l border-[#1a1a1a] cursor-pointer group hover:opacity-90 transition-opacity"
          >
            <div className="text-right">
              <span className="text-[10px] uppercase text-gray-500 font-bold block tracking-wider">Account Status</span>
              <span className="text-[12px] text-blue-400 font-mono font-bold">{user.clearanceLevel || 'LEVEL 4 - CLEARANCE'}</span>
            </div>
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-9 h-9 rounded-full border border-gray-700 bg-gray-900 object-cover group-hover:border-blue-500 transition-colors"
            />
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0c0c0e] border border-gray-800 rounded-lg shadow-2xl p-4 z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-800 mb-3">
                <img src={user.avatarUrl} alt={user.name} className="w-11 h-11 rounded-full border border-gray-700 bg-gray-900 object-cover" />
                <div>
                  <h4 className="font-bold text-[14px] text-[#e0e0e0]">{user.name}</h4>
                  <p className="text-[11px] font-mono text-blue-400">{user.badgeNumber}</p>
                  <span className="inline-block mt-1 text-[9px] font-bold bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                    {user.clearanceLevel}
                  </span>
                </div>
              </div>

              <div className="space-y-1 mb-3 text-[13px]">
                <button
                  onClick={() => {
                    onSelectTab('subscriptions');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-[#151518] text-[#e0e0e0] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-blue-400">card_membership</span>
                    <span>Active Subscriptions</span>
                  </span>
                  <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded font-mono">5 ACTIVE</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTab('subscriptions');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-[#151518] text-[#e0e0e0] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-400">verified_user</span>
                    <span>Account Clearance</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">LVL 4</span>
                </button>
              </div>

              <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-mono">ID: {user.id}</span>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
                >
                  <span className="material-symbols-outlined text-[14px]">logout</span>
                  Switch Agent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
