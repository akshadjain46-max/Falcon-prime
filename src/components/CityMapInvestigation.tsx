import React, { useState, useEffect, useRef } from 'react';
import { CaseItem, DataSourceNode, DataSourceType, MapLocationNode, CorrelationInsight } from '../types';

interface CityMapInvestigationProps {
  cases: CaseItem[];
  dataSources: DataSourceNode[];
  locations: MapLocationNode[];
  onSelectLocation: (loc: MapLocationNode) => void;
  insights: CorrelationInsight[];
}

interface Particle {
  id: string;
  sourceType: DataSourceType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  controlX: number;
  controlY: number;
  progress: number;
  speed: number;
  color: string;
  label: string;
  size: number;
}

export const CityMapInvestigation: React.FC<CityMapInvestigationProps> = ({
  cases,
  dataSources,
  locations,
  onSelectLocation,
  insights
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1);
  const [activeSourceFilter, setActiveSourceFilter] = useState<DataSourceType | 'ALL'>('ALL');
  const [selectedCaseId, setSelectedCaseId] = useState<string | 'ALL'>('ALL');
  const [surgeTrigger, setSurgeTrigger] = useState(0);
  const [activeInsight, setActiveInsight] = useState<CorrelationInsight | null>(insights.length > 0 ? insights[0] : null);
  const [hoveredLocation, setHoveredLocation] = useState<MapLocationNode | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // Calculate dynamic synthesized count from actual evidence & entities
  const computedEntitiesCount = cases.reduce(
    (acc, c) => acc + c.evidenceCount + c.linkedSuspects.length + c.linkedPhoneNumbers.length + c.linkedBankAccounts.length,
    0
  );
  const [synthesizedCount, setSynthesizedCount] = useState<number>(computedEntitiesCount);
  const [selectedLiveCam, setSelectedLiveCam] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const corePulseRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (insights.length > 0 && !activeInsight) {
      setActiveInsight(insights[0]);
    } else if (insights.length === 0) {
      setActiveInsight(null);
    }
  }, [insights]);

  useEffect(() => {
    setSynthesizedCount(computedEntitiesCount);
  }, [computedEntitiesCount]);

  // Position lookup for the 6 perimeter source hubs (in percentage 0-100)
  const sourcePositions: Record<DataSourceType, { x: number; y: number }> = {
    FIR: { x: 12, y: 15 },
    CDR: { x: 88, y: 15 },
    FINANCIAL: { x: 8, y: 52 },
    CCTV: { x: 92, y: 52 },
    SOCIAL: { x: 14, y: 88 },
    CRIMINAL: { x: 86, y: 88 }
  };

  // Central Core Position
  const corePos = { x: 50, y: 50 };

  // Generate dynamic packet payloads from actual case entities
  const getDynamicPayloads = (type: DataSourceType): string[] => {
    const payloads: string[] = [];
    cases.forEach((c) => {
      if (type === 'FIR') {
        if (c.linkedSuspects.length > 0) payloads.push(`Suspect [${c.linkedSuspects[0]}] Logged`);
        payloads.push(`${c.caseNumber} Narrative Extracted`);
      } else if (type === 'CDR') {
        if (c.linkedPhoneNumbers.length > 0) payloads.push(`Phone ${c.linkedPhoneNumbers[0]} Ping`);
        payloads.push(`Tower Triangulation Active`);
      } else if (type === 'FINANCIAL') {
        if (c.linkedBankAccounts.length > 0) payloads.push(`Account ${c.linkedBankAccounts[0]}`);
        payloads.push(`Financial Wire Checked`);
      } else if (type === 'CCTV') {
        if (c.linkedVehicles.length > 0) payloads.push(`ALPR: ${c.linkedVehicles[0]}`);
        payloads.push(`Camera Vector Match`);
      } else if (type === 'SOCIAL') {
        payloads.push(`Comms Metadata Matched`);
        payloads.push(`Social Trace Geocoded`);
      } else if (type === 'CRIMINAL') {
        payloads.push(`Warrant / Prior Record Cross-ref`);
        payloads.push(`NCIC Biometric Verification`);
      }
    });

    return payloads.length > 0 ? payloads : [`${type} Stream Synchronized`];
  };

  // Primary suspect for surveillance HUD
  const topSuspect = cases.length > 0 && cases[0].linkedSuspects.length > 0
    ? cases[0].linkedSuspects[0].toUpperCase()
    : 'TARGET OF INTEREST';

  // Spawn data packets
  const spawnPacket = (type: DataSourceType, isSurge = false) => {
    const src = sourcePositions[type];
    const sourceData = dataSources.find((s) => s.id === type);
    const color = sourceData ? sourceData.color : '#4d8eff';
    const payloads = getDynamicPayloads(type);
    const label = payloads[Math.floor(Math.random() * payloads.length)];

    const midX = (src.x + corePos.x) / 2;
    const midY = (src.y + corePos.y) / 2;
    const offsetX = (Math.random() - 0.5) * 16;
    const offsetY = (Math.random() - 0.5) * 16;

    const newParticle: Particle = {
      id: `p_${Math.random()}`,
      sourceType: type,
      startX: src.x,
      startY: src.y,
      targetX: corePos.x,
      targetY: corePos.y,
      controlX: midX + offsetX,
      controlY: midY + offsetY,
      progress: 0,
      speed: (0.004 + Math.random() * 0.004) * streamSpeed * (isSurge ? 2.5 : 1),
      color,
      label,
      size: isSurge ? 4 : 3
    };

    particlesRef.current.push(newParticle);
  };

  // Periodic packet spawning
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const types: DataSourceType[] = ['FIR', 'CDR', 'FINANCIAL', 'CCTV', 'SOCIAL', 'CRIMINAL'];
      types.forEach((type) => {
        if (activeSourceFilter === 'ALL' || activeSourceFilter === type) {
          if (Math.random() > 0.3) {
            spawnPacket(type);
          }
        }
      });
    }, 600 / streamSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, streamSpeed, activeSourceFilter, dataSources, cases]);

  // Surge trigger
  useEffect(() => {
    if (surgeTrigger > 0) {
      const types: DataSourceType[] = ['FIR', 'CDR', 'FINANCIAL', 'CCTV', 'SOCIAL', 'CRIMINAL'];
      for (let i = 0; i < 24; i++) {
        const randType = types[Math.floor(Math.random() * types.length)];
        spawnPacket(randType, true);
      }
    }
  }, [surgeTrigger]);

  // Render Canvas Loop (Realistic Animated City Map + Flow Beams + Particles)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let tick = 0;

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;

      // Clear with deep tactical background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // 1. Draw Tactical City Grid & Road Infrastructure
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 2. Draw Realistic City Map Blocks & Coastline
      ctx.fillStyle = 'rgba(10, 20, 35, 0.5)';
      ctx.beginPath();
      ctx.moveTo(w * 0.65, h);
      ctx.bezierCurveTo(w * 0.7, h * 0.75, w * 0.8, h * 0.65, w, h * 0.6);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Water shoreline line
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Major Arterial Highway Routes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      // Expressway 1
      ctx.moveTo(0, h * 0.4);
      ctx.bezierCurveTo(w * 0.3, h * 0.45, w * 0.7, h * 0.55, w, h * 0.7);
      ctx.stroke();
      // Expressway 2
      ctx.beginPath();
      ctx.moveTo(w * 0.45, 0);
      ctx.bezierCurveTo(w * 0.5, h * 0.4, w * 0.52, h * 0.7, w * 0.7, h);
      ctx.stroke();

      // Moving Traffic Blips along Arterials
      const carOffset1 = (tick * 1.5) % w;
      const carOffset2 = ((tick * 1.2) + 200) % w;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(carOffset1, h * 0.4 + Math.sin(carOffset1 * 0.005) * 30, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(carOffset2, h * 0.4 + Math.sin(carOffset2 * 0.005) * 30, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Radar Sweep Effect over the City Map
      const radarAngle = (tick * 0.015 * streamSpeed) % (Math.PI * 2);
      const centerX = w * (corePos.x / 100);
      const centerY = h * (corePos.y / 100);
      const radarRadius = Math.min(w, h) * 0.42;

      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radarRadius);
      gradient.addColorStop(0, 'rgba(37, 99, 235, 0.0)');
      gradient.addColorStop(0.8, 'rgba(37, 99, 235, 0.04)');
      gradient.addColorStop(1, 'rgba(37, 99, 235, 0.12)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radarRadius, radarAngle, radarAngle + 0.35);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Radar outer concentric range rings
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      [0.2, 0.4, 0.6, 0.8, 1.0].forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radarRadius * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // 4. Draw Linked Cases Connections (Cross-Case Correlation Web)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const locA = locations[i];
          const locB = locations[j];
          const hasCommonCase = locA.associatedCaseIds.some((c) => locB.associatedCaseIds.includes(c));
          if (hasCommonCase) {
            const ax = w * (locA.coords.x / 100);
            const ay = h * (locA.coords.y / 100);
            const bx = w * (locB.coords.x / 100);
            const by = h * (locB.coords.y / 100);

            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }
      ctx.setLineDash([]);

      // 5. Draw Glowing Cybernetic Ingestion Lines from 6 Perimeter Hubs to Core
      const types: DataSourceType[] = ['FIR', 'CDR', 'FINANCIAL', 'CCTV', 'SOCIAL', 'CRIMINAL'];
      types.forEach((type) => {
        if (activeSourceFilter === 'ALL' || activeSourceFilter === type) {
          const src = sourcePositions[type];
          const sx = w * (src.x / 100);
          const sy = h * (src.y / 100);
          const sourceData = dataSources.find((s) => s.id === type);
          const col = sourceData ? sourceData.color : '#3b82f6';

          ctx.save();
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            w * ((src.x + corePos.x) / 200),
            h * ((src.y + corePos.y) / 200) + (type === 'FIR' || type === 'CDR' ? -20 : 20),
            centerX,
            centerY
          );
          ctx.stroke();
          ctx.restore();
        }
      });

      // 6. Update and Draw Moving Data Packets
      if (isPlaying) {
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.progress += p.speed;

          if (p.progress >= 1) {
            corePulseRef.current = 1;
            setSynthesizedCount((prev) => prev + 1);
            particlesRef.current.splice(i, 1);
            continue;
          }

          const sx = w * (p.startX / 100);
          const sy = h * (p.startY / 100);
          const cx = w * (p.controlX / 100);
          const cy = h * (p.controlY / 100);
          const tx = w * (p.targetX / 100);
          const ty = h * (p.targetY / 100);

          const t = p.progress;
          const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
          const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;

          ctx.save();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();

          if (p.progress > 0.15 && p.progress < 0.85 && (i % 2 === 0)) {
            ctx.fillStyle = 'rgba(8, 8, 8, 0.9)';
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            const textWidth = ctx.measureText(p.label).width;
            ctx.fillRect(px + 8, py - 12, textWidth + 12, 16);
            ctx.strokeRect(px + 8, py - 12, textWidth + 12, 16);

            ctx.fillStyle = '#e0e0e0';
            ctx.font = '10px JetBrains Mono';
            ctx.fillText(p.label, px + 14, py);
          }
          ctx.restore();
        }
      }

      // 7. Draw Central Investigation Fusion Core
      ctx.save();
      const corePulse = Math.sin(tick * 0.05) * 4;
      const hitPulse = corePulseRef.current * 8;
      if (corePulseRef.current > 0) {
        corePulseRef.current = Math.max(0, corePulseRef.current - 0.04);
      }

      const coreGlow = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, 65 + corePulse + hitPulse);
      coreGlow.addColorStop(0, 'rgba(37, 99, 235, 0.5)');
      coreGlow.addColorStop(0.5, 'rgba(37, 99, 235, 0.2)');
      coreGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 70 + corePulse + hitPulse, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Cyber Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tick * 0.02);
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner Core Solid
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 8. Draw Incident Locations on the Map
      locations.forEach((loc) => {
        const lx = w * (loc.coords.x / 100);
        const ly = h * (loc.coords.y / 100);
        const isHovered = hoveredLocation?.id === loc.id;

        ctx.save();
        ctx.fillStyle = loc.threatLevel === 'CRITICAL' ? '#ef4444' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(lx, ly, isHovered ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Ring for Hotspots
        ctx.strokeStyle = loc.threatLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lx, ly, (isHovered ? 14 : 9) + Math.sin(tick * 0.08) * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e0e0e0';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(loc.name, lx, ly - 14);

        if (loc.details.cctvLive) {
          ctx.fillStyle = '#60a5fa';
          ctx.font = '9px JetBrains Mono';
          ctx.fillText('● LIVE CCTV', lx, ly + 16);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, streamSpeed, activeSourceFilter, selectedCaseId, locations, hoveredLocation, cases]);

  return (
    <div className="flex flex-col w-full p-6 space-y-5 max-w-[1600px] mx-auto select-none">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-[#0c0c0e] border border-blue-500/80 text-[#e0e0e0] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined text-blue-400">info</span>
          <span className="text-[13px] font-mono">{toastMsg}</span>
        </div>
      )}

      {/* Top Banner with Control Bar & Case Linkage Summary */}
      <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400 border border-blue-800/40">
            <span className="material-symbols-outlined text-[24px]">hub</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold text-[#e0e0e0]">Aegis Multi-Source Investigation Core</h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                ACTIVE FUSION
              </span>
            </div>
            <p className="text-[12px] text-gray-400 font-mono">
              Synthesizing perimeter intelligence feeds across {cases.length} linked criminal cases.
            </p>
          </div>
        </div>

        {/* Stream Playback Controls */}
        <div className="flex items-center gap-3">
          {/* Linked Case Filter Dropdown */}
          <div className="flex items-center gap-1 bg-[#111] px-3 py-1.5 rounded-lg border border-gray-800 text-xs">
            <span className="text-gray-500 font-mono">CASE:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-transparent text-blue-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All {cases.length} Cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0c0c0e] text-[#e0e0e0]">
                  {c.caseNumber} - {c.title.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>

          {/* Speed Toggle */}
          <div className="flex items-center bg-[#111] rounded-lg border border-gray-800 p-0.5">
            {[1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setStreamSpeed(speed)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                  streamSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-[#e0e0e0]'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${
              isPlaying
                ? 'bg-[#151518] text-amber-400 border-amber-800/40 hover:bg-amber-950/20'
                : 'bg-emerald-600 text-white border-emerald-500'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
            <span>{isPlaying ? 'Pause Flow' : 'Resume Flow'}</span>
          </button>

          {/* Surge Data Button */}
          <button
            onClick={() => setSurgeTrigger((prev) => prev + 1)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-[12px] font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] animate-bounce">bolt</span>
            <span>Surge Data Stream</span>
          </button>
        </div>
      </div>

      {/* Main Investigation Stage (City Map + 6 Perimeter Data Source Hubs) */}
      <div className="relative w-full h-[660px] bg-[#050505] rounded-xl border border-gray-800 overflow-hidden shadow-2xl" ref={containerRef}>
        {/* The Animated Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 z-0 cursor-crosshair" />

        {/* 6 Perimeter Data Source Overlay Cards */}
        {dataSources.map((source) => {
          const pos = sourcePositions[source.id];
          const isSelected = activeSourceFilter === source.id;

          return (
            <div
              key={source.id}
              onClick={() => setActiveSourceFilter(isSelected ? 'ALL' : source.id)}
              className={`w-64 p-3 rounded-lg border backdrop-blur-md transition-all cursor-pointer shadow-xl ${
                isSelected
                  ? 'bg-[#0c0c0e]/95 border-2 shadow-2xl scale-105'
                  : 'bg-[#0a0a0c]/85 border-gray-800 hover:border-gray-600 hover:bg-[#111114]/90'
              }`}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                borderColor: isSelected ? source.color : undefined
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center font-bold"
                    style={{ backgroundColor: source.bgHex, color: source.color }}
                  >
                    <span className="material-symbols-outlined text-[16px]">{source.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#e0e0e0] leading-tight">{source.shortName}</h4>
                    <span className="text-[9px] font-mono text-gray-500">{source.totalRecords}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: source.color }}></span>
                  <span className="text-[9px] font-mono font-bold uppercase" style={{ color: source.color }}>
                    {source.status}
                  </span>
                </div>
              </div>

              {/* Sample Event Ticker */}
              <div className="bg-[#050505] p-1.5 rounded border border-gray-800/80 mb-2">
                <p className="text-[10px] font-mono text-gray-300 truncate" title={source.sampleEvents[0]}>
                  {source.sampleEvents[0]}
                </p>
              </div>

              {/* Ingestion Rate & Surge Trigger */}
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-500">Flow: {source.packetRate * streamSpeed} pkts/s</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    spawnPacket(source.id, true);
                  }}
                  className="px-2 py-0.5 rounded bg-[#151518] hover:bg-blue-600 hover:text-white text-blue-400 transition-colors font-bold border border-gray-800"
                >
                  ⚡ Pulse
                </button>
              </div>
            </div>
          );
        })}

        {/* Central Investigation Fusion Core Overlay HUD */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${corePos.x}%`,
            top: `${corePos.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="mt-20 text-center">
            <span className="px-3 py-1 rounded-full bg-[#0a0a0a]/90 text-blue-400 font-mono text-[10px] font-bold border border-blue-800/50 shadow-lg">
              CORE SYNTHESIS: {synthesizedCount.toLocaleString()} ENTITIES
            </span>
          </div>
        </div>

        {/* Map Location Hotspots & Click Handlers */}
        {locations.map((loc) => (
          <div
            key={loc.id}
            style={{
              position: 'absolute',
              left: `${loc.coords.x}%`,
              top: `${loc.coords.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25
            }}
            onMouseEnter={() => setHoveredLocation(loc)}
            onMouseLeave={() => setHoveredLocation(null)}
            onClick={() => {
              onSelectLocation(loc);
              if (loc.details.cctvLive) {
                setSelectedLiveCam(loc.details.cctvFeedUrl || 'CAM_STREAM_01');
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer group"
          >
            {/* Tooltip on hover */}
            {hoveredLocation?.id === loc.id && (
              <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-64 bg-[#0c0c0e] border border-blue-500/60 rounded-lg p-3 shadow-2xl pointer-events-auto z-30 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[13px] text-[#e0e0e0]">{loc.name}</h4>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      loc.threatLevel === 'CRITICAL'
                        ? 'bg-red-950/40 text-red-400 border border-red-800/40'
                        : 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                    }`}
                  >
                    {loc.threatLevel}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">{loc.details.address}</p>
                <div className="text-[10px] font-mono text-gray-400 bg-[#050505] p-1.5 rounded border border-gray-800">
                  {loc.details.telemetry}
                </div>
                <div className="mt-2 flex justify-between items-center text-[10px] text-blue-400">
                  <span>Click for Full Forensic Dossier</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Bottom Real-time Stream Ticker */}
        <div className="absolute bottom-3 left-6 right-6 z-20 bg-[#0a0a0a]/95 border border-[#1a1a1a] rounded-lg p-2.5 backdrop-blur-md flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold">LIVE TELEMETRY STREAM:</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-6 text-[11px] font-mono text-[#e0e0e0] whitespace-nowrap animate-marquee">
              {cases.length > 0 ? (
                cases.map((c, idx) => (
                  <span key={idx} className={idx % 2 === 0 ? "text-blue-400" : "text-amber-400"}>
                    [{c.caseNumber}] {c.title}: {c.linkedSuspects[0] || 'Unknown'} - {c.linkedVehicles[0] || 'Vehicle Monitored'}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">Ingest documents in Data Collection to activate multi-channel telemetry streams...</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono">LATENCY: 12ms</span>
            <span className="text-[10px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
              {dataSources.filter(d => d.status === 'CONNECTED').length}/6 SOURCES FLOWING
            </span>
          </div>
        </div>
      </div>

      {/* Cross-Case Intelligence Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {insights.length === 0 ? (
          <div className="col-span-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 text-center text-gray-500 font-mono text-xs">
            Awaiting multi-document correlation insights. Upload documents in Data Collection to discover cross-case linkages.
          </div>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              onClick={() => setActiveInsight(insight)}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                activeInsight?.id === insight.id
                  ? 'border-l-2 border-blue-500 bg-[#111] border-gray-800 shadow-xl'
                  : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-gray-700 hover:bg-[#111]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      insight.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                    }`}
                  >
                    {insight.severity === 'CRITICAL' ? 'warning' : 'info'}
                  </span>
                  <h3 className="font-bold text-[14px] text-[#e0e0e0]">{insight.title}</h3>
                </div>
                <span className="text-[9px] font-mono text-gray-500">{insight.timestamp}</span>
              </div>

              <p className="text-[12px] text-gray-400 leading-relaxed mb-3">{insight.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {insight.sourceTypes.map((st) => (
                  <span
                    key={st}
                    className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#151518] border border-gray-800 text-blue-400"
                  >
                    {st}
                  </span>
                ))}
                {insight.entities.map((ent) => (
                  <span
                    key={ent}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#111] border border-gray-800 text-emerald-400"
                  >
                    {ent}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live CCTV Video Feed Simulator Modal */}
      {selectedLiveCam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-gray-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h3 className="font-bold text-[15px] text-[#e0e0e0] font-mono">
                  LIVE INTERCEPT: {selectedLiveCam}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLiveCam(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Tactical Video Player Box */}
            <div className="relative bg-black rounded-lg aspect-video flex flex-col justify-between p-4 border border-gray-800 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-10 w-full animate-scanline pointer-events-none"></div>

              <div className="flex justify-between items-start text-xs font-mono text-emerald-400 z-10">
                <span>REC ● 1080P @ 60FPS</span>
                <span>OPTICAL AI SENSOR ACTIVE</span>
              </div>

              {/* Target Bounding Box */}
              <div className="absolute top-1/3 left-1/3 w-36 h-36 border-2 border-red-500 rounded flex flex-col justify-between p-1 bg-red-950/20">
                <span className="text-[9px] font-mono font-bold bg-red-500 text-white px-1 self-start truncate max-w-full">
                  TARGET: {topSuspect}
                </span>
                <span className="text-[9px] font-mono text-red-200 self-end">
                  MATCH: 95.8%
                </span>
              </div>

              <div className="flex justify-between items-end text-xs font-mono text-gray-500 z-10">
                <span>AEGIS SURVEILLANCE GRID</span>
                <span className="text-blue-400">OPTICAL AI ACTIVE</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLiveCam(null)}
                className="px-4 py-2 rounded-lg bg-[#151518] text-[#e0e0e0] text-xs font-bold hover:bg-gray-800 border border-gray-800 cursor-pointer"
              >
                Close Feed
              </button>
              <button
                onClick={() => {
                  showToast(`Surveillance frame captured and archived to investigation dossier`);
                  setSelectedLiveCam(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Archive Snapshot to Case File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
