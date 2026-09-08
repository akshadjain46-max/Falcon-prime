import React, { useState } from 'react';
import { MapLocationNode, CaseItem } from '../../types';
import { MapPin, AlertTriangle, Shield, Building, Radio, Compass, Layers, ExternalLink } from 'lucide-react';

interface GeographicMatrixViewProps {
  locations: MapLocationNode[];
  cases: CaseItem[];
  onSelectLocation?: (loc: MapLocationNode) => void;
}

export const GeographicMatrixView: React.FC<GeographicMatrixViewProps> = ({
  locations,
  cases,
  onSelectLocation
}) => {
  const [selectedLoc, setSelectedLoc] = useState<MapLocationNode | null>(locations[0] || null);
  const [activeDistrictFilter, setActiveDistrictFilter] = useState<string>('ALL');

  const districts = Array.from(new Set(locations.map(l => l.district)));

  const filteredLocations = activeDistrictFilter === 'ALL'
    ? locations
    : locations.filter(l => l.district === activeDistrictFilter);

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0c10] overflow-hidden">
      {/* Top Filter Bar */}
      <div className="px-6 py-3 border-b border-[#1c2230] bg-[#10131a] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Geographic Incident Matrix</span>
          </div>
          <span className="text-neutral-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">Sector Filter:</span>
            <select
              value={activeDistrictFilter}
              onChange={(e) => setActiveDistrictFilter(e.target.value)}
              className="bg-[#171b26] border border-[#273042] text-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Sectors ({locations.length} Locations)</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-neutral-400 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" /> Critical Hotspot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Surveillance Alert
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" /> Active Relay
          </span>
        </div>
      </div>

      {/* Main Map + Details Panel Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Canvas Vector Area */}
        <div className="flex-1 relative bg-[#07090d] overflow-hidden flex items-center justify-center">
          {/* Subtle Vector Grid Background */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#1e2738 1px, transparent 1px), linear-gradient(to right, #1e2738 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Coordinate Overlay */}
          <div className="absolute top-4 left-4 font-mono text-[10px] text-neutral-500 space-y-1 pointer-events-none">
            <div>GRID ORIGIN: 40.7128° N, 74.0060° W</div>
            <div>VERIFIED GEOGRAPHIC NODES: {filteredLocations.length}</div>
            <div>SURVEILLANCE SECTORS: {districts.length}</div>
          </div>

          {/* Vector Map Surface */}
          <div className="relative w-[85%] h-[85%] border border-[#1d2536] bg-[#0c0f16]/90 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Subtle district perimeter outlines */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <svg className="w-full h-full">
                <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#28354d" strokeDasharray="4 4" />
                <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#28354d" strokeDasharray="4 4" />
                <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#28354d" strokeWidth="1" strokeDasharray="6 6" />
              </svg>
            </div>

            {/* Render Verified Location Markers */}
            {filteredLocations.map((loc) => {
              const isSelected = selectedLoc?.id === loc.id;
              const posX = `${Math.min(92, Math.max(8, loc.coords.x))}%`;
              const posY = `${Math.min(90, Math.max(10, loc.coords.y))}%`;

              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    setSelectedLoc(loc);
                    if (onSelectLocation) onSelectLocation(loc);
                  }}
                  style={{ left: posX, top: posY }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 group z-10`}
                >
                  <div className="flex flex-col items-center">
                    {/* Marker Ring */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-transform ${
                        isSelected
                          ? 'bg-sky-500 text-white scale-110 ring-4 ring-sky-500/30'
                          : loc.threatLevel === 'CRITICAL'
                          ? 'bg-red-950/80 text-red-400 border border-red-500/60 hover:scale-105'
                          : loc.threatLevel === 'HIGH'
                          ? 'bg-orange-950/80 text-orange-400 border border-orange-500/60 hover:scale-105'
                          : 'bg-[#1b2230] text-sky-400 border border-[#2e3a52] hover:scale-105'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>

                    {/* Compact Label */}
                    <div
                      className={`mt-1.5 px-2 py-0.5 rounded text-[11px] font-mono tracking-tight whitespace-nowrap shadow-md transition-colors ${
                        isSelected
                          ? 'bg-sky-500 text-white font-semibold'
                          : 'bg-[#10141d]/90 text-neutral-300 border border-[#232c3d]'
                      }`}
                    >
                      {loc.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel for Location */}
        <div className="w-80 border-l border-[#1c2230] bg-[#0d1017] p-5 overflow-y-auto space-y-5">
          {selectedLoc ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getThreatBadge(selectedLoc.threatLevel)}`}>
                    THREAT: {selectedLoc.threatLevel}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {selectedLoc.district}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mt-2">
                  {selectedLoc.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {selectedLoc.details.address}
                </p>
              </div>

              {/* Status Details */}
              <div className="bg-[#141822] border border-[#22293b] rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                  <span>Surveillance State:</span>
                  <span className="text-sky-400 font-semibold">{selectedLoc.status}</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                  <span>Coordinates:</span>
                  <span className="text-neutral-300">{selectedLoc.coords.x.toFixed(1)}% X, {selectedLoc.coords.y.toFixed(1)}% Y</span>
                </div>
                {selectedLoc.details.targetSuspect && (
                  <div className="text-[11px] font-mono text-neutral-400 flex items-center justify-between">
                    <span>Target Suspect:</span>
                    <span className="text-amber-400 font-semibold">{selectedLoc.details.targetSuspect}</span>
                  </div>
                )}
              </div>

              {/* Telemetry Extract */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-neutral-300">Forensic Telemetry</span>
                <div className="p-3 bg-[#11151f] border border-[#1f2638] rounded-lg text-xs font-mono text-neutral-300 leading-relaxed">
                  {selectedLoc.details.telemetry}
                </div>
              </div>

              {/* Associated Cases */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-neutral-300">Linked Active Cases</span>
                <div className="space-y-1.5">
                  {cases.filter(c => selectedLoc.associatedCaseIds.includes(c.id)).map(c => (
                    <div key={c.id} className="p-2.5 rounded bg-[#151924] border border-[#232b3d] text-xs">
                      <div className="font-semibold text-white font-mono">{c.caseNumber}</div>
                      <div className="text-neutral-400 truncate text-[11px] mt-0.5">{c.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-neutral-500 text-xs">
              Select a location marker on the matrix to inspect forensic coordinates and associated cases.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
