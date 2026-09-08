import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  CaseItem, 
  CorrelationInsight, 
  DataSourceNode, 
  ExtractedDocumentData, 
  GraphEntityNode, 
  GraphEntityType, 
  GraphFilterState, 
  GraphRelationshipEdge, 
  MapLocationNode, 
  NavigationTab, 
  NetworkIntelligenceStats,
  SourceEvidenceRef
} from '../types';
import { buildInvestigationGraph } from '../utils/graphBuilder';
import { EvidenceProvenanceModal } from './investigation/EvidenceProvenanceModal';
import { GeographicMatrixView } from './investigation/GeographicMatrixView';
import { 
  User, 
  Phone, 
  Car, 
  Landmark, 
  Mail, 
  MapPin, 
  Building2, 
  FolderOpen, 
  Clock, 
  FileText, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Layers, 
  Sliders, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Network, 
  Compass, 
  X, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Share2,
  Info
} from 'lucide-react';

interface CityMapInvestigationProps {
  cases: CaseItem[];
  documents?: ExtractedDocumentData[];
  dataSources: DataSourceNode[];
  locations: MapLocationNode[];
  onSelectLocation?: (loc: MapLocationNode) => void;
  insights: CorrelationInsight[];
  onSelectTab?: (tab: NavigationTab) => void;
  onLoadSampleDataset?: () => void;
}

// Color palettes for entity types
export const ENTITY_COLORS: Record<GraphEntityType, { stroke: string; fill: string; text: string; bg: string }> = {
  PERSON: { stroke: '#38bdf8', fill: '#0369a1', text: '#bae6fd', bg: 'bg-sky-950/40 text-sky-400 border-sky-800/40' },
  PHONE: { stroke: '#fbbf24', fill: '#b45309', text: '#fef3c7', bg: 'bg-amber-950/40 text-amber-400 border-amber-800/40' },
  VEHICLE: { stroke: '#2dd4bf', fill: '#0f766e', text: '#ccfbf1', bg: 'bg-teal-950/40 text-teal-400 border-teal-800/40' },
  BANK_ACCOUNT: { stroke: '#34d399', fill: '#047857', text: '#d1fae5', bg: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' },
  EMAIL: { stroke: '#818cf8', fill: '#4338ca', text: '#e0e7ff', bg: 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40' },
  LOCATION: { stroke: '#fb923c', fill: '#c2410c', text: '#ffedd5', bg: 'bg-orange-950/40 text-orange-400 border-orange-800/40' },
  ORGANIZATION: { stroke: '#c084fc', fill: '#7e22ce', text: '#f3e8ff', bg: 'bg-purple-950/40 text-purple-400 border-purple-800/40' },
  CASE: { stroke: '#facc15', fill: '#a16207', text: '#fef9c3', bg: 'bg-yellow-950/40 text-yellow-400 border-yellow-800/40' },
  EVENT: { stroke: '#f472b6', fill: '#be185d', text: '#fce7f3', bg: 'bg-pink-950/40 text-pink-400 border-pink-800/40' },
  EVIDENCE: { stroke: '#94a3b8', fill: '#334155', text: '#f1f5f9', bg: 'bg-slate-800/60 text-slate-300 border-slate-700/60' },
};

export const CityMapInvestigation: React.FC<CityMapInvestigationProps> = ({
  cases,
  documents = [],
  dataSources,
  locations,
  onSelectLocation,
  insights,
  onSelectTab,
  onLoadSampleDataset
}) => {
  // View mode: Link Analysis Graph (primary) vs Geographic Matrix (secondary)
  const [viewMode, setViewMode] = useState<'GRAPH' | 'MAP'>('GRAPH');

  // Interactive Selection State
  const [selectedNode, setSelectedNode] = useState<GraphEntityNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphRelationshipEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphEntityNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphRelationshipEdge | null>(null);
  const [isolatedNeighborhoodId, setIsolatedNeighborhoodId] = useState<string | null>(null);

  // Provenance Audit Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditEntity, setAuditEntity] = useState<{ name: string; type: string; refs: SourceEvidenceRef[]; confidence: number } | null>(null);

  // Network Analytics Drawer
  const [showNetworkIntelligenceModal, setShowNetworkIntelligenceModal] = useState(false);

  // Visualization Preferences
  const [showLabels, setShowLabels] = useState(true);
  const [colorMode, setColorMode] = useState<'TYPE' | 'CLUSTER'>('TYPE');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Filters State
  const [allowedTypes, setAllowedTypes] = useState<Record<GraphEntityType, boolean>>({
    PERSON: true,
    PHONE: true,
    VEHICLE: true,
    BANK_ACCOUNT: true,
    EMAIL: true,
    LOCATION: true,
    ORGANIZATION: true,
    CASE: true,
    EVENT: true,
    EVIDENCE: true
  });
  const [minStrength, setMinStrength] = useState<number>(0);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('ALL');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>('ALL');
  const [onlyHighConnectivity, setOnlyHighConnectivity] = useState(false);

  // Canvas Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomGroupRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphEntityNode, GraphRelationshipEdge> | null>(null);

  // 1. Build Master Graph from Actual Ingested Investigation Data
  const { masterNodes, masterEdges, networkStats } = useMemo(() => {
    const { nodes, edges, stats } = buildInvestigationGraph(documents, cases, locations, insights);
    return { masterNodes: nodes, masterEdges: edges, networkStats: stats };
  }, [documents, cases, locations, insights]);

  // 2. Filter Graph based on Active Investigator Filters
  const { filteredNodes, filteredEdges } = useMemo(() => {
    // Filter nodes
    let nodes = masterNodes.filter((n) => {
      if (!allowedTypes[n.entityType]) return false;
      if (selectedCaseFilter !== 'ALL' && !n.caseIds.includes(selectedCaseFilter)) return false;
      if (selectedClusterFilter !== 'ALL' && n.clusterId !== selectedClusterFilter) return false;
      if (onlyHighConnectivity && !n.isHighConnectivity) return false;
      return true;
    });

    const activeNodeIds = new Set(nodes.map(n => n.id));

    // Filter edges
    let edges = masterEdges.filter((e) => {
      const sId = typeof e.source === 'string' ? e.source : (e.source as any).id || e.sourceId;
      const tId = typeof e.target === 'string' ? e.target : (e.target as any).id || e.targetId;

      if (!activeNodeIds.has(sId) || !activeNodeIds.has(tId)) return false;
      if (e.strength < minStrength) return false;
      if (selectedCaseFilter !== 'ALL' && !e.caseIds.includes(selectedCaseFilter)) return false;
      return true;
    });

    // If neighborhood isolation is active, keep only 1-hop connections
    if (isolatedNeighborhoodId) {
      const neighborIds = new Set<string>([isolatedNeighborhoodId]);
      edges.forEach((e) => {
        const sId = typeof e.source === 'string' ? e.source : (e.source as any).id || e.sourceId;
        const tId = typeof e.target === 'string' ? e.target : (e.target as any).id || e.targetId;
        if (sId === isolatedNeighborhoodId) neighborIds.add(tId);
        if (tId === isolatedNeighborhoodId) neighborIds.add(sId);
      });
      nodes = nodes.filter(n => neighborIds.has(n.id));
      edges = edges.filter(e => {
        const sId = typeof e.source === 'string' ? e.source : (e.source as any).id || e.sourceId;
        const tId = typeof e.target === 'string' ? e.target : (e.target as any).id || e.targetId;
        return neighborIds.has(sId) && neighborIds.has(tId);
      });
    }

    return { filteredNodes: nodes, filteredEdges: edges };
  }, [
    masterNodes,
    masterEdges,
    allowedTypes,
    selectedCaseFilter,
    selectedClusterFilter,
    minStrength,
    onlyHighConnectivity,
    isolatedNeighborhoodId
  ]);

  // Compute connected node & edge IDs for selection / hover highlights
  const connectedNodeIds = useMemo(() => {
    const focusId = selectedNode?.id || hoveredNode?.id;
    if (!focusId) return null;

    const set = new Set<string>([focusId]);
    filteredEdges.forEach((e) => {
      const sId = typeof e.source === 'string' ? e.source : (e.source as any).id || e.sourceId;
      const tId = typeof e.target === 'string' ? e.target : (e.target as any).id || e.targetId;
      if (sId === focusId) set.add(tId);
      if (tId === focusId) set.add(sId);
    });
    return set;
  }, [selectedNode, hoveredNode, filteredEdges]);

  const connectedEdgeIds = useMemo(() => {
    const focusId = selectedNode?.id || hoveredNode?.id;
    if (!focusId) return null;

    const set = new Set<string>();
    filteredEdges.forEach((e) => {
      const sId = typeof e.source === 'string' ? e.source : (e.source as any).id || e.sourceId;
      const tId = typeof e.target === 'string' ? e.target : (e.target as any).id || e.targetId;
      if (sId === focusId || tId === focusId) set.add(e.id);
    });
    return set;
  }, [selectedNode, hoveredNode, filteredEdges]);

  // Search Results
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return filteredNodes.filter(n => 
      n.displayName.toLowerCase().includes(q) ||
      (n.subtitle && n.subtitle.toLowerCase().includes(q)) ||
      n.id.toLowerCase().includes(q)
    );
  }, [filteredNodes, searchQuery]);

  // Zoom to a specific node
  const focusOnNode = useCallback((node: GraphEntityNode) => {
    if (!svgRef.current || !zoomBehaviorRef.current || node.x === undefined || node.y === undefined) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    const scale = 1.35;
    const transform = d3.zoomIdentity
      .translate(width / 2 - node.x * scale, height / 2 - node.y * scale)
      .scale(scale);

    svg.transition().duration(650).call(zoomBehaviorRef.current.transform, transform);
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Fit all active nodes into screen
  const fitGraphToScreen = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || filteredNodes.length === 0) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    filteredNodes.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
    });

    if (minX === Infinity) return;

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const scale = Math.min(2.0, Math.max(0.35, 0.85 / Math.max(graphWidth / width, graphHeight / height)));
    const transform = d3.zoomIdentity
      .translate(width / 2 - midX * scale, height / 2 - midY * scale)
      .scale(scale);

    svg.transition().duration(600).call(zoomBehaviorRef.current.transform, transform);
  }, [filteredNodes]);

  // Reset graph layout (unpin fixed nodes)
  const resetLayout = useCallback(() => {
    filteredNodes.forEach(n => {
      n.fx = null;
      n.fy = null;
    });
    if (simulationRef.current) {
      simulationRef.current.alpha(0.8).restart();
    }
    setTimeout(fitGraphToScreen, 300);
  }, [filteredNodes, fitGraphToScreen]);

  // Zoom controls
  const handleZoom = (direction: 'IN' | 'OUT') => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const factor = direction === 'IN' ? 1.35 : 0.75;
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  // Helper to open evidence provenance modal
  const openEvidenceAudit = (node: GraphEntityNode) => {
    setAuditEntity({
      name: node.displayName,
      type: node.entityType,
      refs: node.sourceEvidenceRefs,
      confidence: node.confidence
    });
    setAuditModalOpen(true);
  };

  // Setup D3 Force Simulation
  useEffect(() => {
    if (viewMode !== 'GRAPH' || !svgRef.current || !zoomGroupRef.current) return;

    const svgElement = svgRef.current;
    const gElement = zoomGroupRef.current;
    const width = svgElement.clientWidth || 900;
    const height = svgElement.clientHeight || 650;

    const svg = d3.select(svgElement);
    const g = d3.select(gElement);

    // Setup Zoom Behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Clone data for simulation so D3 doesn't mutate outside state unpredictably
    const simNodes: GraphEntityNode[] = filteredNodes.map(n => ({
      ...n,
      x: n.x !== undefined ? n.x : width / 2 + (Math.random() - 0.5) * 350,
      y: n.y !== undefined ? n.y : height / 2 + (Math.random() - 0.5) * 350
    }));

    const nodeById = new Map<string, GraphEntityNode>();
    simNodes.forEach(n => nodeById.set(n.id, n));

    const simEdges: any[] = filteredEdges
      .map(e => {
        const s = nodeById.get(e.sourceId);
        const t = nodeById.get(e.targetId);
        if (!s || !t) return null;
        return {
          ...e,
          source: s,
          target: t
        };
      })
      .filter(Boolean);

    // Force Simulation Setup
    const simulation = d3.forceSimulation<GraphEntityNode, any>(simNodes)
      .force('link', d3.forceLink<GraphEntityNode, any>(simEdges)
        .id(d => d.id)
        .distance(d => (d.strengthLevel === 'STRONG' ? 95 : d.strengthLevel === 'MEDIUM' ? 140 : 185))
        .strength(0.35)
      )
      .force('charge', d3.forceManyBody().strength(d => ((d as any).isHighConnectivity ? -580 : -340)))
      .force('collide', d3.forceCollide<GraphEntityNode>().radius(d => (d.isHighConnectivity ? 46 : 34)).iterations(2))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.04))
      .alphaDecay(0.028);

    simulationRef.current = simulation as any;

    // Tick Handler: updates DOM elements efficiently
    simulation.on('tick', () => {
      g.selectAll<SVGLineElement, any>('.graph-edge-line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      g.selectAll<SVGGElement, any>('.graph-edge-label')
        .attr('transform', d => {
          const mx = (d.source.x + d.target.x) / 2;
          const my = (d.source.y + d.target.y) / 2;
          return `translate(${mx}, ${my})`;
        });

      g.selectAll<SVGGElement, any>('.graph-node')
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Fit once simulation has warmed up slightly
    let tickCount = 0;
    const initialWarmup = () => {
      tickCount++;
      if (tickCount === 25) {
        fitGraphToScreen();
      }
    };
    simulation.on('tick.warmup', initialWarmup);

    return () => {
      simulation.stop();
    };
  }, [filteredNodes.length, filteredEdges.length, viewMode]);

  // Drag Behavior for Nodes
  const handleDragStart = (event: any, d: GraphEntityNode) => {
    if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.2).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  const handleDrag = (event: any, d: GraphEntityNode) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const handleDragEnd = (event: any, d: GraphEntityNode) => {
    if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
    // Keep node fixed where investigator positioned it
    d.fx = event.x;
    d.fy = event.y;
  };

  // Node Icon Helper
  const getEntityIcon = (type: GraphEntityType, size: number = 16) => {
    switch (type) {
      case 'PERSON': return <User style={{ width: size, height: size }} />;
      case 'PHONE': return <Phone style={{ width: size, height: size }} />;
      case 'VEHICLE': return <Car style={{ width: size, height: size }} />;
      case 'BANK_ACCOUNT': return <Landmark style={{ width: size, height: size }} />;
      case 'EMAIL': return <Mail style={{ width: size, height: size }} />;
      case 'LOCATION': return <MapPin style={{ width: size, height: size }} />;
      case 'ORGANIZATION': return <Building2 style={{ width: size, height: size }} />;
      case 'CASE': return <FolderOpen style={{ width: size, height: size }} />;
      case 'EVENT': return <Clock style={{ width: size, height: size }} />;
      case 'EVIDENCE': return <FileText style={{ width: size, height: size }} />;
    }
  };

  // Connected entities for selected node
  const selectedNodeConnectedEntities = useMemo(() => {
    if (!selectedNode) return [];
    const results: { node: GraphEntityNode; edge: GraphRelationshipEdge }[] = [];

    masterEdges.forEach((e) => {
      const sId = typeof e.source === 'string' ? e.source : (e.source as any).id || e.sourceId;
      const tId = typeof e.target === 'string' ? e.target : (e.target as any).id || e.targetId;

      if (sId === selectedNode.id) {
        const targetNode = masterNodes.find(n => n.id === tId);
        if (targetNode) results.push({ node: targetNode, edge: e });
      } else if (tId === selectedNode.id) {
        const sourceNode = masterNodes.find(n => n.id === sId);
        if (sourceNode) results.push({ node: sourceNode, edge: e });
      }
    });

    return results;
  }, [selectedNode, masterNodes, masterEdges]);

  // Unique clusters list
  const clustersList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; count: number }>();
    masterNodes.forEach((n) => {
      if (!map.has(n.clusterId)) {
        map.set(n.clusterId, { id: n.clusterId, name: n.clusterName, color: n.clusterColor, count: 0 });
      }
      map.get(n.clusterId)!.count++;
    });
    return Array.from(map.values());
  }, [masterNodes]);

  return (
    <div className="h-full flex flex-col bg-[#07090e] text-[#e2e8f0] select-none overflow-hidden relative font-sans">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & NAVIGATION BAR                                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="px-6 py-3 border-b border-[#1b2230] bg-[#0c0f16]/95 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-wider uppercase text-white font-mono">
                  City Investigation Core
                </h1>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#1e2638] text-sky-300 border border-[#2c3852]">
                  CRIMINAL NETWORK ANALYSIS
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Multimodal Link-Analysis Engine • Evidence Grounded
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1f2738] mx-1" />

          {/* Primary View Switcher: Graph vs Map */}
          <div className="flex items-center bg-[#131722] border border-[#232c3d] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('GRAPH')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'GRAPH'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Link Analysis Graph</span>
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'MAP'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Geographic Matrix</span>
            </button>
          </div>
        </div>

        {/* Live Forensic Intelligence Statistics Bar */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 bg-[#111520] border border-[#1f2738] px-3.5 py-1 rounded-lg font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">ENTITIES:</span>
              <span className="font-bold text-sky-400">{networkStats.totalEntities}</span>
            </div>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">RELATIONSHIPS:</span>
              <span className="font-bold text-emerald-400">{networkStats.totalRelationships}</span>
            </div>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">CASES:</span>
              <span className="font-bold text-yellow-400">{networkStats.totalCases}</span>
            </div>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">CLUSTERS:</span>
              <span className="font-bold text-purple-400">{networkStats.totalClusters}</span>
            </div>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">HIGH-CONNECTIVITY:</span>
              <span className="font-bold text-amber-400">{networkStats.highConnectivityCount}</span>
            </div>
          </div>

          <button
            onClick={() => setShowNetworkIntelligenceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182030] text-sky-300 border border-[#2b3752] hover:bg-[#202b40] transition-colors text-xs font-medium"
            title="Inspect Network Intelligence"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Network Intelligence</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. SUB-TOOLBAR: SEARCH, FILTERS, CONTROLS, & ACTIVE PREFERENCES        */}
      {/* ---------------------------------------------------------------------- */}
      {viewMode === 'GRAPH' && (
        <div className="px-6 py-2.5 border-b border-[#181f2c] bg-[#0e111a] flex flex-wrap items-center justify-between gap-3 text-xs z-10">
          <div className="flex items-center gap-2.5 flex-1 max-w-xl">
            {/* Entity Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search entities (e.g. Marcus, 7XYZ89, +1-917, Harbor)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-[#141924] border border-[#242e40] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Search Dropdown / Autocomplete Matches */}
              {searchMatches.length > 0 && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#121622] border border-[#273248] rounded-lg shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-mono text-neutral-400 border-b border-[#1e2638] bg-[#0f121c]">
                    Found {searchMatches.length} matching entities:
                  </div>
                  {searchMatches.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        focusOnNode(m);
                        setSearchQuery('');
                      }}
                      className="px-3 py-2 flex items-center justify-between hover:bg-[#1c2438] cursor-pointer transition-colors border-b border-[#192132] last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`p-1 rounded text-[10px] border ${ENTITY_COLORS[m.entityType].bg}`}>
                          {m.entityType}
                        </span>
                        <span className="text-white font-medium truncate text-xs">
                          {m.displayName}
                        </span>
                        {m.subtitle && (
                          <span className="text-neutral-500 text-[11px] truncate">
                            • {m.subtitle}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 ml-2">
                        {m.degree} links
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filters Toggle Button */}
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                filterPanelOpen
                  ? 'bg-sky-600/20 text-sky-300 border-sky-500/40'
                  : 'bg-[#141924] text-neutral-300 border-[#242e40] hover:bg-[#1a2130]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(onlyHighConnectivity || minStrength > 0 || selectedCaseFilter !== 'ALL' || selectedClusterFilter !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-sky-400" />
              )}
            </button>
          </div>

          {/* Quick Graph Control Action Tools */}
          <div className="flex items-center gap-2">
            {/* Show/Hide Relationship Labels */}
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                showLabels
                  ? 'bg-[#182030] text-neutral-200 border-[#2b3752]'
                  : 'bg-[#121620] text-neutral-500 border-[#1c2436]'
              }`}
              title="Toggle Relationship Labels"
            >
              {showLabels ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Labels</span>
            </button>

            {/* Color Mode Toggle */}
            <button
              onClick={() => setColorMode(colorMode === 'TYPE' ? 'CLUSTER' : 'TYPE')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141924] text-neutral-300 border border-[#242e40] hover:bg-[#1a2130] transition-colors text-xs"
              title="Toggle Color Mode (Entity Type vs Cluster Group)"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">
                {colorMode === 'TYPE' ? 'By Type' : 'By Cluster'}
              </span>
            </button>

            <div className="h-4 w-px bg-[#1f2738] mx-0.5" />

            {/* Fit Graph */}
            <button
              onClick={fitGraphToScreen}
              className="p-1.5 rounded-lg bg-[#141924] text-neutral-300 border border-[#242e40] hover:bg-[#1a2130] hover:text-white transition-colors"
              title="Fit Graph to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Zoom In & Out */}
            <button
              onClick={() => handleZoom('IN')}
              className="p-1.5 rounded-lg bg-[#141924] text-neutral-300 border border-[#242e40] hover:bg-[#1a2130] hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('OUT')}
              className="p-1.5 rounded-lg bg-[#141924] text-neutral-300 border border-[#242e40] hover:bg-[#1a2130] hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Reset Layout */}
            <button
              onClick={resetLayout}
              className="p-1.5 rounded-lg bg-[#141924] text-neutral-300 border border-[#242e40] hover:bg-[#1a2130] hover:text-white transition-colors"
              title="Reset Force Layout & Unpin"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. EXPANDABLE FILTER DRAWER                                            */}
      {/* ---------------------------------------------------------------------- */}
      {viewMode === 'GRAPH' && filterPanelOpen && (
        <div className="px-6 py-4 border-b border-[#1d2638] bg-[#0a0d14] text-xs space-y-3 z-10 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Entity Type Toggles */}
            <div className="space-y-1.5 flex-1">
              <span className="font-mono text-[11px] text-neutral-400 font-medium">
                FILTER BY ENTITY TYPE:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(allowedTypes) as GraphEntityType[]).map((type) => {
                  const count = masterNodes.filter(n => n.entityType === type).length;
                  const isActive = allowedTypes[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setAllowedTypes(prev => ({ ...prev, [type]: !prev[type] }))}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono transition-all ${
                        isActive
                          ? `${ENTITY_COLORS[type].bg} font-semibold shadow-sm`
                          : 'bg-[#10141e] text-neutral-600 border-[#1a202e] opacity-60 hover:opacity-100'
                      }`}
                    >
                      {getEntityIcon(type, 12)}
                      <span>{type}</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-neutral-300">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Relationship Strength Filter */}
            <div className="space-y-1.5 min-w-[170px]">
              <span className="font-mono text-[11px] text-neutral-400 font-medium">
                MIN RELATIONSHIP STRENGTH:
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={minStrength}
                  onChange={(e) => setMinStrength(Number(e.target.value))}
                  className="w-full bg-[#141924] border border-[#242e40] text-neutral-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value={0}>All Links (Weak, Medium, Strong)</option>
                  <option value={45}>Medium & Strong Only (45%+)</option>
                  <option value={75}>Strong Links Only (75%+)</option>
                </select>
              </div>
            </div>

            {/* Case Filter */}
            <div className="space-y-1.5 min-w-[180px]">
              <span className="font-mono text-[11px] text-neutral-400 font-medium">
                CASE ISOLATION:
              </span>
              <select
                value={selectedCaseFilter}
                onChange={(e) => setSelectedCaseFilter(e.target.value)}
                className="w-full bg-[#141924] border border-[#242e40] text-neutral-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="ALL">All Cases ({cases.length} Cases)</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber}: {c.title.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Cluster Filter */}
            <div className="space-y-1.5 min-w-[160px]">
              <span className="font-mono text-[11px] text-neutral-400 font-medium">
                COMMUNITY CLUSTER:
              </span>
              <select
                value={selectedClusterFilter}
                onChange={(e) => setSelectedClusterFilter(e.target.value)}
                className="w-full bg-[#141924] border border-[#242e40] text-neutral-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="ALL">All Clusters ({clustersList.length})</option>
                {clustersList.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.id} ({cl.count} Entities)
                  </option>
                ))}
              </select>
            </div>

            {/* High Connectivity Only Switch */}
            <div className="flex items-center gap-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={onlyHighConnectivity}
                  onChange={(e) => setOnlyHighConnectivity(e.target.checked)}
                  className="rounded bg-[#141924] border-[#242e40] text-sky-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>High-Connectivity Only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. MAIN CONTENT AREA (GRAPH CANVAS OR GEOGRAPHIC MATRIX)               */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'MAP' ? (
          <div className="flex-1 h-full">
            <GeographicMatrixView
              locations={locations}
              cases={cases}
              onSelectLocation={onSelectLocation}
            />
          </div>
        ) : (
          <>
            {/* EMPTY STATE: If 0 Documents uploaded */}
            {masterNodes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#07090e]">
                <div className="max-w-md p-8 rounded-2xl bg-[#0e121b] border border-[#1e273a] shadow-2xl space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
                    <Network className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-mono">
                    Awaiting Investigation Documents
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    The Criminal Investigation Graph is dynamically generated from verified evidence files (FIRs, CDRs, Bank Records, ALPR CCTV, Social Intel). Upload documents to extract entities and map relationships.
                  </p>
                  <div className="pt-2 flex flex-col gap-2.5">
                    {onLoadSampleDataset && (
                      <button
                        onClick={onLoadSampleDataset}
                        className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Load Multi-Source Investigation Dataset</span>
                      </button>
                    )}
                    {onSelectTab && (
                      <button
                        onClick={() => onSelectTab('data-collection')}
                        className="w-full py-2 px-4 rounded-lg bg-[#182030] hover:bg-[#222d42] text-neutral-300 font-medium text-xs border border-[#2b3852] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-neutral-400" />
                        <span>Go to Data Collection Ingest</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* D3 SVG Interactive Graph Canvas */
              <div className="flex-1 relative overflow-hidden bg-[#06080d]">
                {/* Subtle forensic grid lines */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(#243048 1px, transparent 1px)`,
                    backgroundSize: '32px 32px'
                  }}
                />

                {/* Graph Legend & Status Badge Overlay */}
                <div className="absolute top-3 left-4 pointer-events-none z-10 flex flex-col gap-1.5 font-mono text-[10px] text-neutral-500">
                  <div className="bg-[#0b0f17]/80 backdrop-blur-sm border border-[#1b2334] px-2.5 py-1.5 rounded-lg flex items-center gap-3">
                    <span className="text-neutral-400 font-medium">SHOWING:</span>
                    <span className="text-white font-bold">{filteredNodes.length}</span> Entities
                    <span>•</span>
                    <span className="text-white font-bold">{filteredEdges.length}</span> Evidence Links
                    {isolatedNeighborhoodId && (
                      <span className="text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800">
                        1-Hop Subgraph Active
                      </span>
                    )}
                  </div>

                  {/* High Connectivity Notice */}
                  <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-amber-400/80 bg-amber-400/20" />
                    <span>Gold Ring: High Connectivity / Important Node</span>
                  </div>
                </div>

                {/* SVG Graph Surface */}
                <svg
                  ref={svgRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  onClick={(e) => {
                    // Click on background deselects
                    if (e.target === svgRef.current) {
                      setSelectedNode(null);
                      setSelectedEdge(null);
                      setIsolatedNeighborhoodId(null);
                    }
                  }}
                >
                  <defs>
                    {/* Glow filter for highlighted nodes */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <g ref={zoomGroupRef}>
                    {/* 1. EDGES / RELATIONSHIP LINES */}
                    <g className="edges-layer">
                      {filteredEdges.map((edge) => {
                        const sId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id || edge.sourceId;
                        const tId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id || edge.targetId;

                        const isConnected = connectedEdgeIds ? connectedEdgeIds.has(edge.id) : true;
                        const isSelected = selectedEdge?.id === edge.id;
                        const isDimmed = (connectedNodeIds !== null || selectedEdge !== null) && !isConnected && !isSelected;

                        const strokeColor = isSelected
                          ? '#38bdf8'
                          : edge.strengthLevel === 'STRONG'
                          ? '#10b981'
                          : edge.strengthLevel === 'MEDIUM'
                          ? '#475569'
                          : '#334155';

                        const strokeWidth = isSelected
                          ? 4.0
                          : edge.strengthLevel === 'STRONG'
                          ? 3.2
                          : edge.strengthLevel === 'MEDIUM'
                          ? 2.0
                          : 1.2;

                        const opacity = isDimmed ? 0.08 : isSelected ? 1.0 : isConnected ? 0.85 : 0.45;

                        return (
                          <g key={edge.id}>
                            <line
                              className="graph-edge-line cursor-pointer transition-opacity duration-150"
                              stroke={strokeColor}
                              strokeWidth={strokeWidth}
                              strokeOpacity={opacity}
                              strokeDasharray={edge.strengthLevel === 'WEAK' ? '4 3' : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEdge(edge);
                                setSelectedNode(null);
                              }}
                              onMouseEnter={() => setHoveredEdge(edge)}
                              onMouseLeave={() => setHoveredEdge(null)}
                            />

                            {/* Optional Relationship Labels */}
                            {showLabels && (
                              <g
                                className="graph-edge-label pointer-events-none transition-opacity duration-150 select-none"
                                opacity={isDimmed ? 0 : 0.9}
                              >
                                <rect
                                  x={-(edge.label.length * 3.4 + 6)}
                                  y="-9"
                                  width={edge.label.length * 6.8 + 12}
                                  height="18"
                                  rx="4"
                                  fill="#0a0d14"
                                  stroke={isSelected ? '#38bdf8' : '#1e273a'}
                                  strokeWidth="1"
                                />
                                <text
                                  textAnchor="middle"
                                  dy="3.5"
                                  fill={isSelected ? '#7dd3fc' : '#94a3b8'}
                                  fontSize="9.5"
                                  fontFamily="monospace"
                                  fontWeight="500"
                                >
                                  {edge.label}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>

                    {/* 2. NODES */}
                    <g className="nodes-layer">
                      {filteredNodes.map((node) => {
                        const isSelected = selectedNode?.id === node.id;
                        const isConnected = connectedNodeIds ? connectedNodeIds.has(node.id) : true;
                        const isDimmed = connectedNodeIds !== null && !isConnected && !isSelected;

                        const colors = ENTITY_COLORS[node.entityType];
                        const displayColor = colorMode === 'CLUSTER' ? node.clusterColor : colors.stroke;
                        const fillColor = colorMode === 'CLUSTER' ? `${node.clusterColor}33` : colors.fill;

                        const radius = node.isHighConnectivity ? 22 : 18;

                        return (
                          <g
                            key={node.id}
                            className="graph-node cursor-pointer transition-opacity duration-150"
                            opacity={isDimmed ? 0.14 : 1.0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(node);
                              setSelectedEdge(null);
                            }}
                            onMouseEnter={() => setHoveredNode(node)}
                            onMouseLeave={() => setHoveredNode(null)}
                            ref={(el) => {
                              if (el) {
                                d3.select(el).call(
                                  d3.drag<SVGGElement, GraphEntityNode>()
                                    .on('start', (event) => handleDragStart(event, node))
                                    .on('drag', (event) => handleDrag(event, node))
                                    .on('end', (event) => handleDragEnd(event, node)) as any
                                );
                              }
                            }}
                          >
                            {/* High Connectivity Outer Halo */}
                            {node.isHighConnectivity && (
                              <circle
                                r={radius + 8}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                                opacity={isDimmed ? 0.2 : 0.75}
                              />
                            )}

                            {/* Bridge Diamond Ring */}
                            {node.isBridge && !node.isHighConnectivity && (
                              <circle
                                r={radius + 6}
                                fill="none"
                                stroke="#a855f7"
                                strokeWidth="1.5"
                                opacity={isDimmed ? 0.2 : 0.6}
                              />
                            )}

                            {/* Selected Pulse Ring */}
                            {isSelected && (
                              <circle
                                r={radius + 12}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="2.5"
                                opacity="0.9"
                                filter="url(#glow)"
                              />
                            )}

                            {/* Primary Node Circle */}
                            <circle
                              r={radius}
                              fill={fillColor}
                              stroke={isSelected ? '#ffffff' : displayColor}
                              strokeWidth={isSelected ? 3 : 2}
                              filter={isSelected ? 'url(#glow)' : undefined}
                            />

                            {/* Node Center Icon / Glyph */}
                            <g transform="translate(-8, -8)" pointerEvents="none" color={colors.text}>
                              {getEntityIcon(node.entityType, 16)}
                            </g>

                            {/* High Connectivity Badge */}
                            {node.isHighConnectivity && (
                              <g transform="translate(0, -28)" pointerEvents="none">
                                <rect
                                  x="-44"
                                  y="-8"
                                  width="88"
                                  height="16"
                                  rx="3"
                                  fill="#171104"
                                  stroke="#d97706"
                                  strokeWidth="1"
                                />
                                <text
                                  textAnchor="middle"
                                  dy="3.5"
                                  fill="#fde68a"
                                  fontSize="8"
                                  fontFamily="monospace"
                                  fontWeight="700"
                                >
                                  HIGH CONNECTIVITY
                                </text>
                              </g>
                            )}

                            {/* Node Title Label (Below) */}
                            <g transform={`translate(0, ${radius + 14})`} pointerEvents="none">
                              <rect
                                x={-(node.displayName.length * 3.4 + 6)}
                                y="-7"
                                width={node.displayName.length * 6.8 + 12}
                                height="15"
                                rx="3"
                                fill="#07090ec0"
                                stroke={isSelected ? displayColor : '#1f2738'}
                                strokeWidth="0.8"
                              />
                              <text
                                textAnchor="middle"
                                dy="4"
                                fill={isSelected ? '#ffffff' : '#e2e8f0'}
                                fontSize="10"
                                fontFamily="sans-serif"
                                fontWeight={isSelected ? '600' : '400'}
                              >
                                {node.displayName.length > 24 ? `${node.displayName.slice(0, 22)}...` : node.displayName}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  </g>
                </svg>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 5. RIGHT DETAILS INSPECTOR PANEL (NODE OR EDGE SELECTION)           */}
            {/* ------------------------------------------------------------------ */}
            {(selectedNode || selectedEdge) && (
              <div className="w-88 xl:w-96 border-l border-[#1b2230] bg-[#0c0f16] flex flex-col h-full overflow-hidden shadow-2xl z-20">
                {/* Panel Header */}
                <div className="px-5 py-3.5 border-b border-[#1c2436] bg-[#10141e] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                      {selectedNode ? 'Entity Profile' : 'Relationship Link'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedNode(null);
                      setSelectedEdge(null);
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#1a2130]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel Scrollable Content */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                  {/* === A. NODE DETAILS === */}
                  {selectedNode && (
                    <>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${ENTITY_COLORS[selectedNode.entityType].bg}`}>
                            {selectedNode.entityType}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            {selectedNode.confidence}% CONFIDENCE
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-white mt-2 leading-tight">
                          {selectedNode.displayName}
                        </h2>
                        {selectedNode.subtitle && (
                          <p className="text-xs text-neutral-400 font-mono mt-1">
                            {selectedNode.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Network Role Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.isHighConnectivity && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            High Connectivity ({selectedNode.degree} Edges)
                          </span>
                        )}
                        {selectedNode.isBridge && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-700/60">
                            Inter-Case Bridge Node
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161c28] text-neutral-300 border border-[#252f44]">
                          {selectedNode.clusterName}
                        </span>
                      </div>

                      {/* Metadata Overview */}
                      <div className="bg-[#121622] border border-[#20283a] rounded-lg p-3 space-y-2">
                        <span className="text-[11px] font-mono text-neutral-400 font-medium block border-b border-[#1c2436] pb-1">
                          Extracted Entity Metadata
                        </span>
                        {Object.entries(selectedNode.metadata).map(([k, v]) => {
                          if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
                          return (
                            <div key={k} className="flex items-start justify-between text-xs gap-2">
                              <span className="text-neutral-500 font-mono text-[11px] capitalize">{k}:</span>
                              <span className="text-neutral-200 font-mono text-right truncate max-w-[190px]">{String(v)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Source Provenance & Evidence Citations */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-300">
                            Source Evidence Provenance
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500">
                            {selectedNode.sourceEvidenceRefs.length} Citations
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {selectedNode.sourceEvidenceRefs.slice(0, 3).map((ref, idx) => (
                            <div key={idx} className="p-2.5 rounded bg-[#10141e] border border-[#1e273a] text-xs space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                                <span className="text-sky-400 font-medium truncate">{ref.docName}</span>
                                <span>{ref.timestamp}</span>
                              </div>
                              {ref.snippet && (
                                <p className="text-[11px] text-neutral-300 font-mono truncate">
                                  "{ref.snippet}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => openEvidenceAudit(selectedNode)}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#192234] hover:bg-[#222e44] text-sky-300 text-xs font-medium border border-[#2d3a54] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Audit Primary Evidence Provenance</span>
                        </button>
                      </div>

                      {/* Connected Entities in Network */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-300">
                            Connected Network Entities ({selectedNodeConnectedEntities.length})
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {selectedNodeConnectedEntities.map(({ node, edge }) => (
                            <div
                              key={node.id}
                              onClick={() => focusOnNode(node)}
                              className="p-2 rounded bg-[#121622] hover:bg-[#1c2438] border border-[#1f283a] cursor-pointer transition-colors flex items-center justify-between text-xs group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`p-1 rounded text-[9px] border ${ENTITY_COLORS[node.entityType].bg}`}>
                                  {getEntityIcon(node.entityType, 11)}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-neutral-200 font-medium truncate group-hover:text-sky-300">
                                    {node.displayName}
                                  </div>
                                  <div className="text-[10px] font-mono text-neutral-500">
                                    Link: {edge.label}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions: Isolate Subgraph */}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            if (isolatedNeighborhoodId === selectedNode.id) {
                              setIsolatedNeighborhoodId(null);
                            } else {
                              setIsolatedNeighborhoodId(selectedNode.id);
                            }
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                            isolatedNeighborhoodId === selectedNode.id
                              ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                              : 'bg-[#151b26] text-neutral-300 border-[#242f42] hover:bg-[#1c2436]'
                          }`}
                        >
                          <Network className="w-3.5 h-3.5" />
                          <span>
                            {isolatedNeighborhoodId === selectedNode.id
                              ? 'Reset Neighborhood Isolation'
                              : 'Isolate 1-Hop Neighborhood'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* === B. EDGE / RELATIONSHIP DETAILS === */}
                  {selectedEdge && (
                    <>
                      <div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/60">
                          VERIFIED RELATIONSHIP
                        </span>
                        <h2 className="text-base font-bold text-white mt-2 leading-tight">
                          {masterNodes.find(n => n.id === selectedEdge.sourceId)?.displayName || selectedEdge.sourceId}
                          <span className="text-sky-400 mx-2">── {selectedEdge.label} ──</span>
                          {masterNodes.find(n => n.id === selectedEdge.targetId)?.displayName || selectedEdge.targetId}
                        </h2>
                      </div>

                      {/* Relationship Strength Meter */}
                      <div className="bg-[#121622] border border-[#20283a] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400 font-mono">Link Confidence:</span>
                          <span className={`font-bold font-mono ${
                            selectedEdge.strengthLevel === 'STRONG' ? 'text-emerald-400' : 'text-sky-400'
                          }`}>
                            {selectedEdge.strengthLevel} ({selectedEdge.strength}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1a2232] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              selectedEdge.strengthLevel === 'STRONG' ? 'bg-emerald-400' : 'bg-sky-400'
                            }`}
                            style={{ width: `${selectedEdge.strength}%` }}
                          />
                        </div>
                      </div>

                      {/* Verified Evidence Excerpt */}
                      {selectedEdge.evidenceSnippet && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold text-neutral-300">
                            Corroborating Evidence Snippet
                          </span>
                          <div className="p-3 bg-[#0d1017] border border-[#1e273a] rounded-lg font-mono text-xs text-neutral-300 leading-relaxed">
                            "{selectedEdge.evidenceSnippet}"
                          </div>
                        </div>
                      )}

                      {/* Source Documents */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-neutral-300">
                          Primary Ingest Citations
                        </span>
                        <div className="space-y-1.5">
                          {selectedEdge.sourceEvidenceRefs.map((ref, idx) => (
                            <div key={idx} className="p-2.5 rounded bg-[#10141e] border border-[#1e273a] text-xs">
                              <div className="font-mono text-sky-400 font-medium">{ref.docName}</div>
                              <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                                Logged: {ref.timestamp || 'Direct Evidence Extracted'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. MODALS & AUXILIARY DRAWERS                                          */}
      {/* ---------------------------------------------------------------------- */}
      {/* Evidence Provenance Modal */}
      {auditEntity && (
        <EvidenceProvenanceModal
          isOpen={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
          entityName={auditEntity.name}
          entityType={auditEntity.type}
          evidenceRefs={auditEntity.refs}
          confidence={auditEntity.confidence}
        />
      )}

      {/* Network Intelligence Summary Modal */}
      {showNetworkIntelligenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#10131c] border border-[#242e42] rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1c2436] bg-[#141824] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Network Intelligence Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setShowNetworkIntelligenceModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Calculated Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-[#151926] p-3 rounded-lg border border-[#232b3e]">
                  <div className="text-neutral-500 text-[11px]">Total Extracted Entities</div>
                  <div className="text-xl font-bold text-sky-400 mt-1">{networkStats.totalEntities}</div>
                </div>
                <div className="bg-[#151926] p-3 rounded-lg border border-[#232b3e]">
                  <div className="text-neutral-500 text-[11px]">Validated Relationships</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{networkStats.totalRelationships}</div>
                </div>
                <div className="bg-[#151926] p-3 rounded-lg border border-[#232b3e]">
                  <div className="text-neutral-500 text-[11px]">Connected Clusters</div>
                  <div className="text-xl font-bold text-purple-400 mt-1">{networkStats.totalClusters}</div>
                </div>
                <div className="bg-[#151926] p-3 rounded-lg border border-[#232b3e]">
                  <div className="text-neutral-500 text-[11px]">Cross-Case Bridge Nodes</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{networkStats.bridgeEntities.length}</div>
                </div>
              </div>

              {/* Most Connected Network Entities */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-300 font-mono text-[11px]">
                  MOST CONNECTED ENTITIES (HIGH CONNECTIVITY)
                </span>
                <div className="space-y-1.5">
                  {networkStats.mostConnectedEntities.map((ent) => (
                    <div key={ent.id} className="p-2.5 rounded bg-[#151a26] border border-[#232c3f] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded text-[9px] border ${ENTITY_COLORS[ent.type].bg}`}>
                          {ent.type}
                        </span>
                        <span className="text-white font-medium">{ent.name}</span>
                      </div>
                      <span className="font-mono text-amber-400 font-bold">{ent.degree} Links</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strongest Relationships */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-300 font-mono text-[11px]">
                  STRONGEST GROUNDED RELATIONSHIPS
                </span>
                <div className="space-y-1.5">
                  {networkStats.strongestRelationships.map((rel) => (
                    <div key={rel.id} className="p-2.5 rounded bg-[#151a26] border border-[#232c3f] flex items-center justify-between">
                      <div className="text-neutral-300">
                        <span className="font-medium text-white">{rel.source}</span>
                        <span className="text-sky-400 mx-1.5 text-[11px]">── {rel.label} ──</span>
                        <span className="font-medium text-white">{rel.target}</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">{rel.strength}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#1c2436] bg-[#141824] flex justify-end">
              <button
                onClick={() => setShowNetworkIntelligenceModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#222a3d] text-white hover:bg-[#2d374f] text-xs font-medium"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
