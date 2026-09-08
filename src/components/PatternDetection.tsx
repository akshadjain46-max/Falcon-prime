import React, { useState, useEffect } from 'react';
import { CorrelationInsight, CaseItem } from '../types';
import { ExtractedDocumentData } from '../utils/documentAnalyzer';

interface PatternDetectionProps {
  insights: CorrelationInsight[];
  cases?: CaseItem[];
  documents?: ExtractedDocumentData[];
}

export const PatternDetection: React.FC<PatternDetectionProps> = ({
  insights,
  cases = [],
  documents = [],
}) => {
  const [selectedInsight, setSelectedInsight] = useState<CorrelationInsight | null>(
    insights.length > 0 ? insights[0] : null
  );

  useEffect(() => {
    if (insights.length > 0 && !selectedInsight) {
      setSelectedInsight(insights[0]);
    } else if (insights.length === 0) {
      setSelectedInsight(null);
    }
  }, [insights]);

  // Dynamically compute syndicate members from analyzed documents & cases
  const suspectMap = new Map<string, {
    name: string;
    role: string;
    threat: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    match: string;
    cases: Set<string>;
    sourceTypes: Set<string>;
  }>();

  // Populate from cases
  cases.forEach((c) => {
    c.linkedSuspects.forEach((name) => {
      if (!suspectMap.has(name)) {
        suspectMap.set(name, {
          name,
          role: 'Primary Person of Interest',
          threat: 'HIGH',
          match: `${c.confidenceScore}%`,
          cases: new Set<string>(),
          sourceTypes: new Set<string>()
        });
      }
      const entry = suspectMap.get(name)!;
      entry.cases.add(c.caseNumber);
    });
  });

  // Enhance from parsed documents
  documents.forEach((doc) => {
    doc.persons.forEach((p) => {
      if (!suspectMap.has(p.name)) {
        suspectMap.set(p.name, {
          name: p.name,
          role: p.role || 'Forensic Entity',
          threat: 'MEDIUM',
          match: `${doc.confidenceScore}%`,
          cases: new Set<string>(),
          sourceTypes: new Set<string>()
        });
      }
      const entry = suspectMap.get(p.name)!;
      if (p.role && entry.role === 'Primary Person of Interest') {
        entry.role = p.role;
      }
      entry.sourceTypes.add(doc.sourceType);
    });
  });

  // Calculate threat levels based on cross-link count
  const dynamicSyndicateMembers = Array.from(suspectMap.values()).map((entry) => {
    const caseCount = entry.cases.size;
    const isCritical = caseCount >= 2 || entry.role.toLowerCase().includes('kingpin') || entry.role.toLowerCase().includes('leader');
    return {
      name: entry.name,
      role: entry.role,
      threat: isCritical ? 'CRITICAL' : caseCount >= 1 ? 'HIGH' : 'MEDIUM',
      match: entry.match,
      cases: Array.from(entry.cases)
    };
  }).sort((a, b) => (b.threat === 'CRITICAL' ? 1 : 0) - (a.threat === 'CRITICAL' ? 1 : 0));

  // Dynamically compute chronological timeline from extracted documents
  const dynamicTimelineEvents: { time: string; type: string; text: string; location: string }[] = [];

  documents.forEach((doc) => {
    if (doc.extractedEvents && doc.extractedEvents.length > 0) {
      doc.extractedEvents.forEach((ev) => {
        dynamicTimelineEvents.push({
          time: ev.time,
          type: doc.sourceType,
          text: ev.text,
          location: ev.location || doc.filename
        });
      });
    } else {
      dynamicTimelineEvents.push({
        time: 'Logged',
        type: doc.sourceType,
        text: doc.summary,
        location: doc.locations[0]?.name || doc.filename
      });
    }
  });

  return (
    <div className="flex flex-col w-full p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
            <span className="material-symbols-outlined text-[24px]">radar</span>
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#e0e0e0]">AI Pattern & Anomaly Detection Radar</h1>
            <p className="text-[12px] text-gray-400">
              Cross-correlation of suspects, call graphs, financial flows, and document timelines.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-800/40">
          NEURAL ENGINE ACTIVE ({insights.length} CORRELATION INSIGHTS)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Syndicate Hierarchy Profile */}
        <div className="lg:col-span-6 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-5 shadow-xl">
          <h2 className="text-[15px] font-bold text-[#e0e0e0] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400">group</span>
            Identified Suspect Hierarchy ({dynamicSyndicateMembers.length})
          </h2>

          {dynamicSyndicateMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-mono text-xs border border-dashed border-gray-800 rounded-lg">
              No suspect profiles detected. Ingest police reports, FIRs, or intelligence notes to construct hierarchy.
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {dynamicSyndicateMembers.map((member) => (
                <div key={member.name} className="p-3 rounded-lg bg-[#111] border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-bold text-[14px] text-[#e0e0e0]">{member.name}</h3>
                      <p className="text-[11px] text-blue-400 font-mono">{member.role}</p>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                        member.threat === 'CRITICAL'
                          ? 'bg-red-950/40 text-red-400 border-red-800/40'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                      }`}
                    >
                      {member.threat} THREAT
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-gray-500">
                    <span>Forensic Match: <strong className="text-emerald-400">{member.match}</strong></span>
                    <div className="flex gap-1">
                      {member.cases.map((c) => (
                        <span key={c} className="bg-[#151518] text-[#e0e0e0] px-1.5 py-0.5 rounded border border-gray-800 text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline Sequence Reconstruction */}
        <div className="lg:col-span-6 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-5 shadow-xl">
          <h2 className="text-[15px] font-bold text-[#e0e0e0] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">timeline</span>
            Chronological Incident Timeline ({dynamicTimelineEvents.length} Events)
          </h2>

          {dynamicTimelineEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-mono text-xs border border-dashed border-gray-800 rounded-lg">
              No chronological events parsed yet. Ingest documents with timestamps or event logs to reconstruct incident timelines.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-gray-800 space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {dynamicTimelineEvents.map((ev, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#050505] border-2 border-blue-500 group-hover:bg-blue-500 transition-colors"></div>

                  <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">{ev.time}</span>
                      <span className="text-[9px] font-mono bg-[#151518] text-blue-300 px-2 py-0.5 rounded border border-gray-800">
                        {ev.type}
                      </span>
                    </div>
                    <p className="text-[12px] font-semibold text-[#e0e0e0] leading-snug">{ev.text}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">📍 {ev.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
