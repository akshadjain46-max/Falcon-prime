import React, { useState } from 'react';
import { MapLocationNode } from '../types';

interface LocationDetailsModalProps {
  location: MapLocationNode | null;
  onClose: () => void;
}

export const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  location,
  onClose,
}) => {
  const [dispatched, setDispatched] = useState(false);

  if (!location) return null;

  const handleDispatch = () => {
    setDispatched(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c0c0e] border border-gray-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-start pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                {location.district}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                  location.threatLevel === 'CRITICAL'
                    ? 'bg-red-950/40 text-red-400 border-red-800/40'
                    : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                }`}
              >
                {location.threatLevel} THREAT
              </span>
            </div>
            <h3 className="font-bold text-[17px] text-[#e0e0e0]">{location.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 font-mono block mb-1">PHYSICAL ADDRESS & COORDINATES:</span>
            <p className="text-[#e0e0e0] font-semibold">{location.details.address}</p>
            <p className="text-emerald-400 font-mono mt-1">GRID COORDS: X: {location.coords.x}% | Y: {location.coords.y}%</p>
          </div>

          <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 font-mono block mb-1">LIVE TELEMETRY INTERCEPT:</span>
            <p className="text-gray-300 leading-relaxed">{location.details.telemetry}</p>
            <span className="text-[10px] text-gray-500 font-mono mt-2 block">Last Signal Intercept: {location.details.lastPing}</span>
          </div>

          {location.details.targetSuspect && (
            <div className="bg-[#111] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-gray-500 font-mono block">PRIMARY SUSPECT OF INTEREST:</span>
                <span className="font-bold text-red-400 text-sm">{location.details.targetSuspect}</span>
              </div>
              <span className="text-[10px] font-mono bg-red-950/40 text-red-400 px-2 py-1 rounded border border-red-800/40">
                MONITORED
              </span>
            </div>
          )}

          <div className="pt-2">
            <span className="text-gray-500 font-mono block mb-2">FEEDING DATA SOURCES:</span>
            <div className="flex flex-wrap gap-2">
              {location.associatedSources.map((source) => (
                <span key={source} className="bg-[#151518] text-blue-300 font-mono text-[11px] px-2.5 py-1 rounded-lg border border-gray-800">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#151518] text-xs font-bold text-gray-300 hover:bg-[#1a1a1f] cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={handleDispatch}
            disabled={dispatched}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dispatched
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {dispatched ? 'Unit Dispatched!' : 'Dispatch Tactical Unit'}
          </button>
        </div>
      </div>
    </div>
  );
};
