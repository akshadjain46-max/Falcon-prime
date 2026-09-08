import React, { useState, useRef } from 'react';
import { DataSourceType, ProcessingQueueItem, NavigationTab, CaseItem } from '../types';
import { ExtractedDocumentData, parseDocumentContent, SAMPLE_INVESTIGATION_DOCUMENTS } from '../utils/documentAnalyzer';

interface DataCollectionProps {
  documents: ExtractedDocumentData[];
  cases: CaseItem[];
  queue: ProcessingQueueItem[];
  onIngestDocument: (doc: ExtractedDocumentData) => void;
  onIngestMultipleDocuments: (docs: ExtractedDocumentData[]) => void;
  onClearAllData: () => void;
  onLoadSampleDataset: () => void;
  onSelectTab: (tab: NavigationTab) => void;
}

export const DataCollection: React.FC<DataCollectionProps> = ({
  documents,
  cases,
  queue,
  onIngestDocument,
  onIngestMultipleDocuments,
  onClearAllData,
  onLoadSampleDataset,
  onSelectTab,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showManualInputModal, setShowManualInputModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<DataSourceType>('FIR');
  const [manualContent, setManualContent] = useState('');
  const [inspectingDoc, setInspectingDoc] = useState<ExtractedDocumentData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cardFileInputRef = useRef<{ [key in DataSourceType]?: HTMLInputElement | null }>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Calculate real metrics from actual documents
  const allSuspects = new Set<string>();
  const allPhones = new Set<string>();
  const allAccounts = new Set<string>();
  const allPlates = new Set<string>();
  const allLocations = new Set<string>();

  documents.forEach((doc) => {
    doc.persons.forEach(p => allSuspects.add(p.name));
    doc.phoneNumbers.forEach(p => allPhones.add(p));
    doc.bankAccounts.forEach(a => allAccounts.add(a));
    doc.vehicles.forEach(v => allPlates.add(v.plate));
    doc.locations.forEach(l => allLocations.add(l.name));
  });

  const totalEntitiesCount = allSuspects.size + allPhones.size + allAccounts.size + allPlates.size + allLocations.size;

  // Process a real uploaded file
  const processUploadedFile = async (file: File, explicitType?: DataSourceType) => {
    try {
      const content = await file.text();
      let extracted: ExtractedDocumentData = parseDocumentContent(file.name, content, explicitType);

      // Attempt server-side Gemini enhancement if server endpoint is available
      try {
        const response = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content,
            sourceType: extracted.sourceType
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.geminiUsed && resJson.data) {
            const ai = resJson.data;
            if (ai.summary) extracted.summary = ai.summary;
            if (Array.isArray(ai.persons) && ai.persons.length > 0) extracted.persons = ai.persons;
            if (Array.isArray(ai.phoneNumbers) && ai.phoneNumbers.length > 0) extracted.phoneNumbers = ai.phoneNumbers;
            if (Array.isArray(ai.bankAccounts) && ai.bankAccounts.length > 0) extracted.bankAccounts = ai.bankAccounts;
            if (Array.isArray(ai.vehicles) && ai.vehicles.length > 0) extracted.vehicles = ai.vehicles;
            if (Array.isArray(ai.locations) && ai.locations.length > 0) {
              extracted.locations = ai.locations.map((l: any, idx: number) => ({
                name: l.name || `Location ${idx + 1}`,
                address: l.address || l.name,
                x: 20 + ((idx * 23) % 60),
                y: 20 + ((idx * 19) % 60),
                threatLevel: l.threatLevel || 'HIGH'
              }));
            }
          }
        }
      } catch (err) {
        // Fallback gracefully to local extraction
        console.warn('Server AI endpoint unavailable, using local extractor:', err);
      }

      return extracted;
    } catch (err) {
      console.error('File parsing error:', err);
      showToast(`Error parsing file: ${file.name}`);
      return null;
    }
  };

  const handleFilesSelected = async (files: FileList | null, explicitType?: DataSourceType) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    const parsedDocs: ExtractedDocumentData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const parsed = await processUploadedFile(file, explicitType);
      if (parsed) {
        parsedDocs.push(parsed);
      }
    }

    if (parsedDocs.length > 0) {
      onIngestMultipleDocuments(parsedDocs);
      showToast(`Successfully analyzed ${parsedDocs.length} document(s) into forensics core`);
    }
    setIsProcessing(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContent.trim()) return;

    const fname = manualTitle.trim() ? `${manualTitle.trim().replace(/\s+/g, '_')}.txt` : `Manual_${manualType}_Report_${Date.now().toString().slice(-4)}.txt`;
    const extracted = parseDocumentContent(fname, manualContent, manualType);

    onIngestDocument(extracted);
    showToast(`Analyzed manual document: "${fname}"`);
    setManualTitle('');
    setManualContent('');
    setShowManualInputModal(false);
  };

  return (
    <div className="flex flex-col w-full p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-[#0c0c0e] border border-emerald-500/80 text-[#e0e0e0] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="text-[13px] font-mono">{toastMsg}</span>
        </div>
      )}

      {/* Hidden Global File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.csv,.json,.pdf,.log,.tsv,.xml,.docx"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Top Banner & Fast Actions */}
      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400">
            <span className="material-symbols-outlined text-[24px]">dataset</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-[#e0e0e0]">Multi-Source Forensic Document Ingestion</h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40">
                DYNAMIC ANALYZER
              </span>
            </div>
            <p className="text-[12px] text-gray-400">
              Ingests and cross-correlates raw text, logs, FIRs, CDRs, and Financial files without hardcoded data.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowManualInputModal(true)}
            className="flex items-center gap-1.5 bg-[#151518] hover:bg-[#1a1a1f] border border-gray-800 text-[#e0e0e0] px-3.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-400">edit_note</span>
            <span>Paste / Direct Input</span>
          </button>

          <button
            onClick={onLoadSampleDataset}
            className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-300 px-3.5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer"
            title="Ingests 4 realistic cross-source documents into the engine"
          >
            <span className="material-symbols-outlined text-[16px]">file_open</span>
            <span>Load Sample Investigation Files</span>
          </button>

          {documents.length > 0 && (
            <button
              onClick={onClearAllData}
              className="flex items-center gap-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer"
              title="Wipe all analyzed documents and reset to zero state"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Reset Engine</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('relationship-mapping')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[12px] font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Launch City Core</span>
          </button>
        </div>
      </div>

      {/* Dynamic Stats Overview - strictly derived from ingested documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Entities */}
        <div className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a] hover:border-gray-700 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Entities Discovered
            </span>
            <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform text-[20px]">
              hub
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-[#e0e0e0] tracking-tight">{totalEntitiesCount}</span>
            <span className="text-[12px] font-semibold text-emerald-400">
              {allSuspects.size} suspects • {allPhones.size} phones • {allPlates.size} plates
            </span>
          </div>
        </div>

        {/* Active Investigations */}
        <div className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a] hover:border-gray-700 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Synthesized Cases
            </span>
            <span className="material-symbols-outlined text-amber-400 group-hover:scale-110 transition-transform text-[20px]">
              policy
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-[#e0e0e0] tracking-tight">{cases.length}</span>
            <span className="text-[12px] text-gray-400">
              {cases.length > 0 ? 'Linked to documents' : 'Awaiting documents'}
            </span>
          </div>
        </div>

        {/* Ingested Documents */}
        <div className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a] hover:border-gray-700 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Ingested Documents
            </span>
            <span className="material-symbols-outlined text-emerald-400 group-hover:scale-110 transition-transform text-[20px]">
              description
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold text-[#e0e0e0] tracking-tight">{documents.length}</span>
            <span className="text-[12px] font-semibold text-emerald-400">
              {documents.length > 0 ? 'Parsed & indexed' : 'Zero files loaded'}
            </span>
          </div>
        </div>

        {/* Extracted Locations */}
        <div className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a] hover:border-gray-700 transition-colors group relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Geolocated Hotspots
            </span>
            <span className="material-symbols-outlined text-purple-400 group-hover:scale-110 transition-transform text-[20px]">
              location_on
            </span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-[28px] font-bold text-[#e0e0e0] tracking-tight">{allLocations.size}</span>
            <span className="text-[12px] text-gray-400">Mapped on city grid</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Source Ingestion Hub */}
        <div className="xl:col-span-8 flex flex-col space-y-6">
          {/* Universal Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center bg-[#0a0a0a] ${
              isDragging
                ? 'border-blue-500 bg-blue-950/20'
                : 'border-gray-800 hover:border-blue-500/70 hover:bg-[#0e0e12]'
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-900/30 border border-blue-800/40 flex items-center justify-center text-blue-400 mb-3">
              <span className="material-symbols-outlined text-[30px]">cloud_upload</span>
            </div>
            <h3 className="text-[16px] font-bold text-[#e0e0e0]">
              {isProcessing ? 'Analyzing and Extracting Document Entities...' : 'Drop Intelligence Files Here, or Click to Browse'}
            </h3>
            <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">
              Supports FIR incident reports, CDR telecom dumps (.csv), SWIFT wire statements (.json), CCTV logs, and intelligence notes (.txt, .pdf, .log).
            </p>
            <div className="mt-4 inline-flex items-center gap-3 text-[11px] font-mono text-gray-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Regex & Entity Extraction</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Cross-Case Linkage</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Gemini AI Assisted</span>
            </div>
          </div>

          {/* Categorized Ingestion Cards */}
          <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#1a1a1a] bg-[#0c0c0e] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-bold text-[#e0e0e0]">Targeted Source Ingestion</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-800/40 uppercase">
                  6 Feeds Available
                </span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Police Reports & FIRs */}
              <div
                onClick={() => {
                  const input = cardFileInputRef.current['FIR'];
                  if (input) input.click();
                }}
                className="p-4 rounded-lg border border-gray-800 bg-[#111] hover:border-emerald-500/70 cursor-pointer transition-all flex flex-col h-full group"
              >
                <input
                  ref={(el) => { cardFileInputRef.current['FIR'] = el; }}
                  type="file"
                  multiple
                  accept=".txt,.pdf,.docx,.log"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, 'FIR')}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-950/40 flex items-center justify-center text-emerald-400 border border-emerald-800/40">
                    <span className="material-symbols-outlined text-[22px]">description</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#e0e0e0] text-[14px]">Police Reports & FIRs</h3>
                    <p className="text-gray-400 text-[11px]">FIR extracts, incident narratives, witness notes</p>
                  </div>
                </div>

                <div className="mt-auto border border-dashed border-gray-800 rounded-lg p-3 text-center group-hover:bg-[#151518] group-hover:border-emerald-700/60 transition-colors">
                  <span className="material-symbols-outlined text-gray-500 mb-1 group-hover:text-emerald-400 text-[20px]">upload_file</span>
                  <p className="font-mono text-gray-400 text-[11px]">Click to upload FIR document</p>
                </div>
              </div>

              {/* 2. CDR & Telecom Data */}
              <div
                onClick={() => {
                  const input = cardFileInputRef.current['CDR'];
                  if (input) input.click();
                }}
                className="p-4 rounded-lg border border-gray-800 bg-[#111] hover:border-amber-500/70 cursor-pointer transition-all flex flex-col h-full group"
              >
                <input
                  ref={(el) => { cardFileInputRef.current['CDR'] = el; }}
                  type="file"
                  multiple
                  accept=".csv,.txt,.log,.tsv"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, 'CDR')}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-950/40 flex items-center justify-center text-amber-400 border border-amber-800/40">
                    <span className="material-symbols-outlined text-[22px]">cell_tower</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#e0e0e0] text-[14px]">CDR & Telecom Records</h3>
                    <p className="text-gray-400 text-[11px]">Call records, IMEI logs, tower triangulation</p>
                  </div>
                </div>

                <div className="mt-auto border border-dashed border-gray-800 rounded-lg p-3 text-center group-hover:bg-[#151518] group-hover:border-amber-700/60 transition-colors">
                  <span className="material-symbols-outlined text-gray-500 mb-1 group-hover:text-amber-400 text-[20px]">upload_file</span>
                  <p className="font-mono text-gray-400 text-[11px]">Click to upload CDR CSV or text</p>
                </div>
              </div>

              {/* 3. Financial Forensics */}
              <div
                onClick={() => {
                  const input = cardFileInputRef.current['FINANCIAL'];
                  if (input) input.click();
                }}
                className="p-4 rounded-lg border border-gray-800 bg-[#111] hover:border-red-500/70 cursor-pointer transition-all flex flex-col h-full group"
              >
                <input
                  ref={(el) => { cardFileInputRef.current['FINANCIAL'] = el; }}
                  type="file"
                  multiple
                  accept=".json,.csv,.txt,.log"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, 'FINANCIAL')}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-950/40 flex items-center justify-center text-red-400 border border-red-800/40">
                    <span className="material-symbols-outlined text-[22px]">account_balance</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#e0e0e0] text-[14px]">Financial Records</h3>
                    <p className="text-gray-400 text-[11px]">SWIFT transfers, bank logs, crypto wallets</p>
                  </div>
                </div>

                <div className="mt-auto border border-dashed border-gray-800 rounded-lg p-3 text-center group-hover:bg-[#151518] group-hover:border-red-700/60 transition-colors">
                  <span className="material-symbols-outlined text-gray-500 mb-1 group-hover:text-red-400 text-[20px]">upload_file</span>
                  <p className="font-mono text-gray-400 text-[11px]">Click to upload Financial audit or JSON</p>
                </div>
              </div>

              {/* 4. CCTV & ALPR Matrix */}
              <div
                onClick={() => {
                  const input = cardFileInputRef.current['CCTV'];
                  if (input) input.click();
                }}
                className="p-4 rounded-lg border border-gray-800 bg-[#111] hover:border-blue-500/70 cursor-pointer transition-all flex flex-col h-full group"
              >
                <input
                  ref={(el) => { cardFileInputRef.current['CCTV'] = el; }}
                  type="file"
                  multiple
                  accept=".log,.txt,.csv,.json"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files, 'CCTV')}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-950/40 flex items-center justify-center text-blue-400 border border-blue-800/40">
                    <span className="material-symbols-outlined text-[22px]">videocam</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#e0e0e0] text-[14px]">CCTV & ALPR Matrix</h3>
                    <p className="text-gray-400 text-[11px]">Plate reader hits, camera logs, facial vectors</p>
                  </div>
                </div>

                <div className="mt-auto border border-dashed border-gray-800 rounded-lg p-3 text-center group-hover:bg-[#151518] group-hover:border-blue-700/60 transition-colors">
                  <span className="material-symbols-outlined text-gray-500 mb-1 group-hover:text-blue-400 text-[20px]">upload_file</span>
                  <p className="font-mono text-gray-400 text-[11px]">Click to upload CCTV / ALPR sensor log</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Processing Queue & Ingested Documents List */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] overflow-hidden h-full flex flex-col shadow-xl">
            <div className="p-4 border-b border-[#1a1a1a] bg-[#0c0c0e] flex justify-between items-center">
              <h2 className="text-[15px] font-bold text-[#e0e0e0]">Analyzed Documents</h2>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-800/40">
                {documents.length} Files
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50 max-h-[640px]">
              {documents.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <span className="material-symbols-outlined text-gray-600 text-[36px]">folder_off</span>
                  <p className="text-sm font-semibold text-gray-400">No Documents Ingested</p>
                  <p className="text-xs text-gray-500">
                    Upload documents or click "Load Sample Investigation Files" above to parse and extract forensic entities.
                  </p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-[#111] transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[17px] text-blue-400">
                          {doc.sourceType === 'FIR'
                            ? 'description'
                            : doc.sourceType === 'CDR'
                            ? 'cell_tower'
                            : doc.sourceType === 'FINANCIAL'
                            ? 'account_balance'
                            : doc.sourceType === 'CCTV'
                            ? 'videocam'
                            : doc.sourceType === 'SOCIAL'
                            ? 'public'
                            : 'database'}
                        </span>
                        <span className="font-mono text-[#e0e0e0] text-[12px] truncate max-w-[170px]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border bg-emerald-950/40 text-emerald-400 border-emerald-800/40 uppercase">
                        INDEXED
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">
                      {doc.summary}
                    </p>

                    {/* Extracted Entity Counters */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {doc.persons.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#151518] border border-gray-800 font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">person</span> {doc.persons.length}
                        </span>
                      )}
                      {doc.phoneNumbers.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#151518] border border-gray-800 font-mono text-[10px] text-amber-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">call</span> {doc.phoneNumbers.length}
                        </span>
                      )}
                      {doc.bankAccounts.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#151518] border border-gray-800 font-mono text-[10px] text-red-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">account_balance</span> {doc.bankAccounts.length}
                        </span>
                      )}
                      {doc.vehicles.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#151518] border border-gray-800 font-mono text-[10px] text-blue-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">directions_car</span> {doc.vehicles.length}
                        </span>
                      )}
                      {doc.locations.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#151518] border border-gray-800 font-mono text-[10px] text-purple-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">location_on</span> {doc.locations.length}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-800/40 text-[10px] text-gray-500 font-mono">
                      <span>Confidence: {doc.confidenceScore}%</span>
                      <button
                        onClick={() => setInspectingDoc(doc)}
                        className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                        Inspect Entities
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Direct Text Ingestion Modal */}
      {showManualInputModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-gray-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">edit_note</span>
                <h3 className="font-bold text-[16px] text-[#e0e0e0]">Direct Report / Log Ingestion</h3>
              </div>
              <button onClick={() => setShowManualInputModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Document Title / File Ref
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="FIR_Downtown_Warehouse_BreakIn"
                    className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 text-xs text-[#e0e0e0] font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Detected Source Category
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as DataSourceType)}
                    className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 text-xs text-[#e0e0e0] font-mono focus:border-blue-500 focus:outline-none"
                  >
                    <option value="FIR">Police Report / FIR</option>
                    <option value="CDR">CDR & Telecom Log</option>
                    <option value="FINANCIAL">Financial Statement / Wire</option>
                    <option value="CCTV">CCTV / ALPR Capture Log</option>
                    <option value="SOCIAL">Social Intelligence Note</option>
                    <option value="CRIMINAL">Criminal Record / Prior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Document Raw Text / Forensic Data
                </label>
                <textarea
                  rows={8}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Paste police incident report, call detail records, witness statements, bank wire receipts, or ALPR logs here..."
                  className="w-full bg-[#111] border border-gray-800 rounded-lg p-3 text-xs text-[#e0e0e0] font-mono focus:border-blue-500 focus:outline-none leading-relaxed"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowManualInputModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#151518] text-xs font-bold text-gray-300 hover:bg-[#1a1a1f] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  Parse & Ingest Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Inspector Modal */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-gray-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start pb-3 border-b border-gray-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                    {inspectingDoc.sourceType}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {inspectingDoc.confidenceScore}% CONFIDENCE
                  </span>
                </div>
                <h3 className="font-bold text-[16px] text-[#e0e0e0]">{inspectingDoc.filename}</h3>
              </div>
              <button onClick={() => setInspectingDoc(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Summary */}
              <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 font-mono block mb-1">FORENSIC SUMMARY:</span>
                <p className="text-gray-300 leading-relaxed">{inspectingDoc.summary}</p>
              </div>

              {/* Extracted Entities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                  <span className="text-emerald-400 font-mono block mb-1.5 font-bold">IDENTIFIED PERSONS ({inspectingDoc.persons.length})</span>
                  {inspectingDoc.persons.length === 0 ? (
                    <span className="text-gray-500 font-mono">None detected</span>
                  ) : (
                    <div className="space-y-1">
                      {inspectingDoc.persons.map((p, i) => (
                        <div key={i} className="text-[#e0e0e0] font-semibold flex justify-between">
                          <span>{p.name}</span>
                          <span className="text-gray-500 font-mono text-[10px]">{p.role || 'Suspect'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                  <span className="text-amber-400 font-mono block mb-1.5 font-bold">TELECOM IDENTIFIERS ({inspectingDoc.phoneNumbers.length})</span>
                  {inspectingDoc.phoneNumbers.length === 0 ? (
                    <span className="text-gray-500 font-mono">None detected</span>
                  ) : (
                    <div className="space-y-1">
                      {inspectingDoc.phoneNumbers.map((ph, i) => (
                        <div key={i} className="text-[#e0e0e0] font-mono text-[11px]">{ph}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                  <span className="text-red-400 font-mono block mb-1.5 font-bold">FINANCIAL ACCOUNTS ({inspectingDoc.bankAccounts.length})</span>
                  {inspectingDoc.bankAccounts.length === 0 ? (
                    <span className="text-gray-500 font-mono">None detected</span>
                  ) : (
                    <div className="space-y-1">
                      {inspectingDoc.bankAccounts.map((acct, i) => (
                        <div key={i} className="text-[#e0e0e0] font-mono text-[11px]">{acct}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                  <span className="text-blue-400 font-mono block mb-1.5 font-bold">VEHICLES & PLATES ({inspectingDoc.vehicles.length})</span>
                  {inspectingDoc.vehicles.length === 0 ? (
                    <span className="text-gray-500 font-mono">None detected</span>
                  ) : (
                    <div className="space-y-1">
                      {inspectingDoc.vehicles.map((v, i) => (
                        <div key={i} className="text-[#e0e0e0] font-mono text-[11px]">
                          [Plate: {v.plate}] - {v.color || ''} {v.model || 'Vehicle'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Raw Document Text */}
              <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                <span className="text-gray-500 font-mono block mb-1">RAW DOCUMENT CONTENT:</span>
                <pre className="text-gray-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-[#080808] p-2.5 rounded border border-gray-900">
                  {inspectingDoc.rawText}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setInspectingDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#151518] text-xs font-bold text-gray-300 hover:bg-[#1a1a1f] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
