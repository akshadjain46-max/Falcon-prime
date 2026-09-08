import React, { useState, useEffect } from 'react';
import { CaseItem, NavigationTab } from '../types';

interface CaseManagerProps {
  cases: CaseItem[];
  onAddCase: (newCase: CaseItem) => void;
  onSelectTab: (tab: NavigationTab) => void;
}

export const CaseManager: React.FC<CaseManagerProps> = ({
  cases,
  onAddCase,
  onSelectTab,
}) => {
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(cases.length > 0 ? cases[0] : null);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);

  // New Case Form State
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState(`CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('');
  const [suspects, setSuspects] = useState('');
  const [phones, setPhones] = useState('');
  const [vehicles, setVehicles] = useState('');
  const [accounts, setAccounts] = useState('');

  useEffect(() => {
    if (cases.length > 0) {
      if (!selectedCase || !cases.find(c => c.id === selectedCase.id)) {
        setSelectedCase(cases[0]);
      }
    } else {
      setSelectedCase(null);
    }
  }, [cases]);

  // Compute Dynamic Cross-Case Linkage Matrix
  const suspectTally: Record<string, number> = {};
  const vehicleTally: Record<string, number> = {};
  const accountTally: Record<string, number> = {};
  const locationTally: Record<string, number> = {};

  cases.forEach(c => {
    c.linkedSuspects.forEach(s => { suspectTally[s] = (suspectTally[s] || 0) + 1; });
    c.linkedVehicles.forEach(v => { vehicleTally[v] = (vehicleTally[v] || 0) + 1; });
    c.linkedBankAccounts.forEach(a => { accountTally[a] = (accountTally[a] || 0) + 1; });
    if (c.location) { locationTally[c.location] = (locationTally[c.location] || 0) + 1; }
  });

  const getTopEntity = (tally: Record<string, number>) => {
    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : null;
  };

  const topSuspect = getTopEntity(suspectTally);
  const topVehicle = getTopEntity(vehicleTally);
  const topAccount = getTopEntity(accountTally);
  const topLocation = getTopEntity(locationTally);

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newCaseItem: CaseItem = {
      id: `case_${Date.now()}`,
      caseNumber,
      title,
      status: 'ACTIVE',
      dateOpened: new Date().toISOString().split('T')[0],
      leadInvestigator: 'Det. Lead Analyst',
      summary: summary || 'Newly compiled multi-source intelligence case file.',
      location: location || 'Metropolitan Sector',
      coordinates: {
        x: Math.floor(20 + Math.random() * 60),
        y: Math.floor(20 + Math.random() * 60),
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1
      },
      linkedSuspects: suspects ? suspects.split(',').map((s) => s.trim()).filter(Boolean) : [],
      linkedPhoneNumbers: phones ? phones.split(',').map((p) => p.trim()).filter(Boolean) : [],
      linkedBankAccounts: accounts ? accounts.split(',').map((a) => a.trim()).filter(Boolean) : [],
      linkedVehicles: vehicles ? vehicles.split(',').map((v) => v.trim()).filter(Boolean) : [],
      evidenceCount: 1,
      linkedCaseIds: cases.slice(0, 2).map(c => c.id),
      confidenceScore: 88.0
    };

    onAddCase(newCaseItem);
    setShowNewCaseModal(false);
    setSelectedCase(newCaseItem);
    setTitle('');
    setSummary('');
    setLocation('');
    setSuspects('');
    setPhones('');
    setVehicles('');
    setAccounts('');
  };

  return (
    <div className="flex flex-col w-full p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Header Banner */}
      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[26px]">folder_shared</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-[#e0e0e0]">Linked Case Files & Cross-Jurisdiction Matrix</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40">
                {cases.length} CONNECTED CASES
              </span>
            </div>
            <p className="text-[12px] text-gray-400">
              {cases.length > 0
                ? `Cross-referencing entities across ${cases.length} active investigations derived from ingested documents.`
                : 'No active case dossiers yet. Ingest documents in Data Collection to automatically compile cases.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCaseModal(true)}
            className="flex items-center gap-1.5 bg-[#151518] hover:bg-[#1a1a1f] border border-gray-800 text-[#e0e0e0] px-4 py-2 rounded-lg text-[13px] font-bold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Manual Link Case</span>
          </button>

          <button
            onClick={() => onSelectTab('relationship-mapping')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[13px] font-bold transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">radar</span>
            <span>Launch City Investigation Core</span>
          </button>
        </div>
      </div>

      {/* Dynamic Case Linkage Synergy Matrix */}
      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">account_tree</span>
          Cross-Case Correlation Web
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 font-mono text-[10px] block mb-1">COMMON SUSPECT LINK:</span>
            <p className="font-bold text-[#e0e0e0] text-[13px] truncate">
              {topSuspect ? topSuspect.name : 'Awaiting Data'}
            </p>
            <p className="text-[11px] text-emerald-400 font-mono mt-1">
              {topSuspect ? `Appears in ${topSuspect.count} of ${cases.length} Cases` : 'No suspects recorded'}
            </p>
          </div>

          <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 font-mono text-[10px] block mb-1">COMMON VEHICLE SIGHTING:</span>
            <p className="font-bold text-[#e0e0e0] text-[13px] truncate">
              {topVehicle ? topVehicle.name : 'Awaiting Data'}
            </p>
            <p className="text-[11px] text-blue-400 font-mono mt-1">
              {topVehicle ? `Detected in ${topVehicle.count} Files` : 'No vehicles detected'}
            </p>
          </div>

          <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 font-mono text-[10px] block mb-1">FINANCIAL SHELL LINK:</span>
            <p className="font-bold text-[#e0e0e0] text-[13px] truncate">
              {topAccount ? topAccount.name : 'Awaiting Data'}
            </p>
            <p className="text-[11px] text-red-400 font-mono mt-1">
              {topAccount ? `Flagged in ${topAccount.count} Inquiries` : 'No accounts logged'}
            </p>
          </div>

          <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
            <span className="text-gray-500 font-mono text-[10px] block mb-1">PRIMARY CONVERGENCE NODE:</span>
            <p className="font-bold text-[#e0e0e0] text-[13px] truncate">
              {topLocation ? topLocation.name : 'Awaiting Data'}
            </p>
            <p className="text-[11px] text-amber-400 font-mono mt-1">
              {topLocation ? `Associated with ${topLocation.count} Case(s)` : 'No locations mapped'}
            </p>
          </div>
        </div>
      </div>

      {/* Case Grid and Details Split View */}
      {cases.length === 0 ? (
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-12 text-center space-y-4 shadow-xl">
          <span className="material-symbols-outlined text-gray-600 text-[48px]">folder_off</span>
          <h3 className="text-lg font-bold text-[#e0e0e0]">No Investigation Cases Synthesized</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Upload documents (FIRs, CDRs, Financial, CCTV logs) in Data Collection to automatically extract entities and correlate them into connected cases.
          </p>
          <button
            onClick={() => onSelectTab('data-collection')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Go to Data Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cases List */}
          <div className="lg:col-span-5 space-y-3">
            {cases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#151518] border-blue-500 shadow-xl'
                      : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-gray-700 hover:bg-[#111]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-800/40">
                        {c.caseNumber}
                      </span>
                      <h3 className="font-bold text-[14px] text-[#e0e0e0] mt-1.5">{c.title}</h3>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        c.status === 'CRITICAL'
                          ? 'bg-red-950/40 text-red-400 border-red-800/40'
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-[12px] text-gray-400 line-clamp-2 mb-3">{c.summary}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-2 border-t border-gray-800">
                    <span>📍 {c.location}</span>
                    <span className="text-emerald-400">Match Score: {c.confidenceScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Case Deep-Dive Dossier */}
          {selectedCase && (
            <div className="lg:col-span-7">
              <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-6 shadow-xl space-y-5">
                <div className="flex justify-between items-start pb-4 border-b border-gray-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono text-blue-400 font-bold">{selectedCase.caseNumber}</span>
                      <span className="text-[10px] text-gray-500">Opened: {selectedCase.dateOpened}</span>
                    </div>
                    <h2 className="text-[17px] font-bold text-[#e0e0e0]">{selectedCase.title}</h2>
                    <p className="text-[12px] text-gray-400 mt-1">Lead: {selectedCase.leadInvestigator}</p>
                  </div>

                  <button
                    onClick={() => onSelectTab('relationship-mapping')}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Track on Map</span>
                    <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                  </button>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase text-gray-500 font-mono mb-1">Case Narrative</h4>
                  <p className="text-[13px] text-[#e0e0e0] leading-relaxed bg-[#111] p-3 rounded-lg border border-gray-800">
                    {selectedCase.summary}
                  </p>
                </div>

                {/* Linked Suspects */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase text-gray-500 font-mono mb-2">
                    Key Suspects Under Surveillance ({selectedCase.linkedSuspects.length})
                  </h4>
                  {selectedCase.linkedSuspects.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono">No suspects identified yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.linkedSuspects.map((suspect) => (
                        <div key={suspect} className="bg-[#151518] border border-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-400 text-[16px]">person_alert</span>
                          <span className="text-xs font-bold text-[#e0e0e0]">{suspect}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Physical & Digital Assets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                    <h5 className="text-[10px] font-mono text-gray-500 uppercase mb-1">
                      Monitored Burner Numbers ({selectedCase.linkedPhoneNumbers.length})
                    </h5>
                    {selectedCase.linkedPhoneNumbers.length === 0 ? (
                      <p className="text-xs text-gray-500 font-mono">No numbers linked</p>
                    ) : (
                      <ul className="space-y-1">
                        {selectedCase.linkedPhoneNumbers.map((phone) => (
                          <li key={phone} className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">phone_in_talk</span>
                            {phone}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                    <h5 className="text-[10px] font-mono text-gray-500 uppercase mb-1">
                      Identified Vehicles & ALPR ({selectedCase.linkedVehicles.length})
                    </h5>
                    {selectedCase.linkedVehicles.length === 0 ? (
                      <p className="text-xs text-gray-500 font-mono">No vehicles linked</p>
                    ) : (
                      <ul className="space-y-1">
                        {selectedCase.linkedVehicles.map((v) => (
                          <li key={v} className="text-xs font-mono text-blue-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">directions_car</span>
                            {v}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Connected Cases Badges */}
                {selectedCase.linkedCaseIds.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-[11px] font-bold uppercase text-gray-500 font-mono mb-2">Connected Cross-Files</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCase.linkedCaseIds.map((cid) => {
                        const linked = cases.find((c) => c.id === cid);
                        return linked ? (
                          <span
                            key={cid}
                            onClick={() => setSelectedCase(linked)}
                            className="text-xs font-mono bg-[#151518] hover:bg-blue-600 hover:text-white text-[#e0e0e0] px-3 py-1 rounded-lg border border-gray-800 cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            {linked.caseNumber}: {linked.title.slice(0, 20)}...
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Case Creation Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-gray-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="font-bold text-[16px] text-[#e0e0e0]">Link New Investigation File</h3>
              <button onClick={() => setShowNewCaseModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Harbor Logistics Pier Contraband"
                  className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-sm text-[#e0e0e0] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Case Identifier</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-xs font-mono text-[#e0e0e0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Primary Incident Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Harbor Terminal 4"
                    className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-xs text-[#e0e0e0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Suspects (comma separated)</label>
                <input
                  type="text"
                  value={suspects}
                  onChange={(e) => setSuspects(e.target.value)}
                  placeholder="e.g. Marcus Chen, Elena Rostova"
                  className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-xs text-[#e0e0e0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Phone Numbers</label>
                  <input
                    type="text"
                    value={phones}
                    onChange={(e) => setPhones(e.target.value)}
                    placeholder="+1-917-555-0192"
                    className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-xs text-[#e0e0e0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Vehicles / Plates</label>
                  <input
                    type="text"
                    value={vehicles}
                    onChange={(e) => setVehicles(e.target.value)}
                    placeholder="Plate 7XYZ89"
                    className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-xs text-[#e0e0e0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Narrative Summary</label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Details on evidence and telemetry intersections..."
                  className="w-full bg-[#050505] border border-gray-800 rounded-lg p-2 text-xs text-[#e0e0e0] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#151518] text-xs font-bold text-gray-300 hover:bg-[#1a1a1f] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 cursor-pointer"
                >
                  Create & Link Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
