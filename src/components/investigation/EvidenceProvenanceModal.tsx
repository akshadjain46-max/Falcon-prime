import React from 'react';
import { FileText, X, ShieldAlert, Calendar, Hash, ExternalLink } from 'lucide-react';
import { SourceEvidenceRef } from '../../types';

interface EvidenceProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityType: string;
  evidenceRefs: SourceEvidenceRef[];
  confidence: number;
}

export const EvidenceProvenanceModal: React.FC<EvidenceProvenanceModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityType,
  evidenceRefs,
  confidence
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#12141a] border border-[#2a3040] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#222836] flex items-center justify-between bg-[#161a24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4d8eff]/15 text-[#4d8eff] border border-[#4d8eff]/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-wider px-2 py-0.5 rounded bg-[#202738] text-[#a5b4fc] border border-[#2f3952]">
                  {entityType}
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {confidence}% Provenance Confidence
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mt-1">
                Source Evidence Audit: {entityName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#202738] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="text-xs text-neutral-400 leading-relaxed bg-[#0d1017] p-3 rounded-lg border border-[#1e2536]">
            Every entity and relationship node in FALCON is grounded in uploaded source evidence. Below are the verified primary citations, timestamps, and extracted excerpts establishing this entity's presence in the investigation.
          </div>

          <div className="space-y-3">
            {evidenceRefs.length === 0 ? (
              <div className="text-sm text-neutral-500 text-center py-8">
                No direct document provenance references found.
              </div>
            ) : (
              evidenceRefs.map((ref, idx) => (
                <div
                  key={idx}
                  className="bg-[#171b26] border border-[#262e42] rounded-lg p-4 space-y-2 hover:border-[#3b4664] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[#222a3d] text-sky-300 border border-[#303c58]">
                        {ref.sourceType || 'FILE'}
                      </span>
                      <span className="font-medium text-neutral-200 font-mono">
                        {ref.docName}
                      </span>
                    </div>
                    {ref.timestamp && (
                      <span className="text-neutral-500 font-mono text-[11px] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {ref.timestamp}
                      </span>
                    )}
                  </div>

                  {ref.snippet && (
                    <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1d2333] font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      <span className="text-neutral-500 select-none">"</span>
                      {ref.snippet}
                      <span className="text-neutral-500 select-none">"</span>
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2 pt-1">
                    <span className="flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />
                      DOC_ID: {ref.docId.slice(0, 14)}...
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">Authenticated Record</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#222836] bg-[#161a24] flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono">
            Total Authenticated Citations: {evidenceRefs.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#252c3d] text-white hover:bg-[#30394f] transition-colors font-medium text-xs"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
