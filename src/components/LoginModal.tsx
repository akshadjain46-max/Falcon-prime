import React, { useState } from 'react';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (profile: UserProfile) => void;
  defaultUser: UserProfile;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLogin,
  defaultUser,
}) => {
  const [badgeId, setBadgeId] = useState(defaultUser.badgeNumber);
  const [accessKey, setAccessKey] = useState('••••••••••••');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  if (!isOpen) return null;

  const handleBiometricAuth = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsScanning(false);
            onLogin(defaultUser);
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      ...defaultUser,
      badgeNumber: badgeId || defaultUser.badgeNumber
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top glow accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500"></div>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
          <img
            alt="Aegis Logo"
            className="h-10 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoe3Bm-YLpwq1zEyqPnAMRW5UKPJfczwjzXOJ-ABf3Ryv-OX6tyBrcVC3TQ2PfaJPR2PVp4SKVhGJxNMIbWUH-Xbni4ZDsZWgsjAjkKWDyVb7_ywS9YomRxf9V_DkejUx4aXc2fXCe12UFt_RjUUgJGQrMuRhiQVrv9DkccZeyqqx7NxHbCKrbG2LNUI4DJ92F81iE6ur4XQkzaE0hKKgswcTPXffQcsHGh2rJ4ANMzKavkbrxD7YE5A"
          />
          <div>
            <h2 className="text-[17px] font-bold text-[#e0e0e0] uppercase tracking-wider">Falcon Intelligence</h2>
            <p className="text-[11px] font-mono text-gray-500">FEDERAL FORENSIC TERMINAL ACCESS</p>
          </div>
        </div>

        {/* Investigator Card Preview */}
        <div className="bg-[#111] p-4 rounded-lg border border-gray-800 mb-6 flex items-center gap-4">
          <img
            src={defaultUser.avatarUrl}
            alt={defaultUser.name}
            className="w-14 h-14 rounded-lg border border-blue-500/40 object-cover"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-mono font-bold bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">
              {defaultUser.clearanceLevel}
            </span>
            <h3 className="font-bold text-[14px] text-[#e0e0e0] truncate mt-1">{defaultUser.name}</h3>
            <p className="text-[11px] text-gray-400 font-mono truncate">{defaultUser.role} • {defaultUser.badgeNumber}</p>
          </div>
        </div>

        {/* Biometric Scan Section */}
        {isScanning ? (
          <div className="py-8 text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-emerald-400 animate-pulse">fingerprint</span>
              <div className="absolute inset-0 border-2 border-emerald-400 rounded-full animate-ping opacity-30"></div>
            </div>
            <div>
              <p className="font-bold text-[14px] text-[#e0e0e0]">Verifying Biometric Keychain...</p>
              <p className="text-[12px] font-mono text-emerald-400 mt-1">{scanProgress}% Match Confirmed</p>
            </div>
            <div className="w-48 mx-auto bg-[#050505] h-1.5 rounded-full overflow-hidden border border-gray-800">
              <div className="bg-emerald-500 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }}></div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStandardSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Badge / Credential ID
              </label>
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 text-sm font-mono text-[#e0e0e0] focus:border-blue-500 focus:outline-none"
                placeholder="NY-8842-INV"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Security Passcode
              </label>
              <input
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 text-sm font-mono text-[#e0e0e0] focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="w-full bg-[#151518] hover:bg-[#1f1f24] border border-gray-800 text-emerald-400 py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                Biometric Login
              </button>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">key</span>
                Authenticate
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-800/80 flex justify-between items-center text-[10px] text-gray-500 font-mono">
          <span>SECURE PROTOCOL: AEGIS-7</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ENCRYPTED SESSION
          </span>
        </div>
      </div>
    </div>
  );
};
