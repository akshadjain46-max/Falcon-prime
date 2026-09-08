export type NavigationTab = 
  | 'data-collection' 
  | 'relationship-mapping' 
  | 'case-manager' 
  | 'pattern-detection' 
  | 'subscriptions' 
  | 'reports';

export interface UserProfile {
  id: string;
  name: string;
  badgeNumber: string;
  role: string;
  department: string;
  clearanceLevel: 'LEVEL 1 - BASIC' | 'LEVEL 2 - CONFIDENTIAL' | 'LEVEL 3 - SECRET' | 'LEVEL 4 - TOP SECRET' | 'LEVEL 5 - SPECIAL ACCESS';
  avatarUrl: string;
  email: string;
  lastLogin: string;
  tokenBalance: number;
  accountStatus: 'ACTIVE' | 'AUDIT_PENDING' | 'MAINTENANCE';
}

export interface SubscriptionItem {
  id: string;
  title: string;
  category: string;
  tier: string;
  status: 'ACTIVE' | 'RENEWING_SOON' | 'STANDBY';
  renewalDate: string;
  usagePercent: number;
  quotaDescription: string;
  iconName: string;
  costPerMonth: string;
  features: string[];
}

export type DataSourceType = 'FIR' | 'CDR' | 'FINANCIAL' | 'CCTV' | 'SOCIAL' | 'CRIMINAL';

export interface DataSourceNode {
  id: DataSourceType;
  title: string;
  shortName: string;
  description: string;
  color: string;
  glowColor: string;
  bgHex: string;
  icon: string;
  packetRate: number; // packets/sec
  totalRecords: string;
  status: 'ONLINE' | 'STREAMING' | 'INGESTING' | 'SYNCED';
  sampleEvents: string[];
  activePings: number;
}

export interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  status: 'ACTIVE' | 'CRITICAL' | 'MONITORING' | 'SOLVED';
  dateOpened: string;
  leadInvestigator: string;
  summary: string;
  location: string;
  coordinates: { x: number; y: number; lat: number; lng: number };
  linkedSuspects: string[];
  linkedPhoneNumbers: string[];
  linkedBankAccounts: string[];
  linkedVehicles: string[];
  evidenceCount: number;
  linkedCaseIds: string[]; // Connected to other cases
  confidenceScore: number;
}

export interface MapLocationNode {
  id: string;
  name: string;
  district: string;
  type: 'SAFEHOUSE' | 'FINANCIAL_NODE' | 'PORT_CONTAINER' | 'CELL_TOWER' | 'CCTV_HUB' | 'POLICE_PRECINCT' | 'AIRPORT_CARGO';
  coords: { x: number; y: number }; // percentage on 100x100 grid
  status: 'SURVEILLANCE_ACTIVE' | 'HIGH_ALERT' | 'NORMAL' | 'INTERCEPTING';
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  associatedCaseIds: string[];
  associatedSources: DataSourceType[];
  details: {
    address: string;
    lastPing: string;
    targetSuspect?: string;
    cctvLive: boolean;
    cctvFeedUrl?: string;
    telemetry: string;
  };
}

export interface DataPacket {
  id: string;
  sourceType: DataSourceType;
  sourceCoords: { x: number; y: number };
  targetCoords: { x: number; y: number };
  progress: number; // 0 to 1
  speed: number;
  label: string;
  payload: {
    entity: string;
    dataPoint: string;
    confidence: number;
    timestamp: string;
    caseId?: string;
  };
}

export interface ProcessingQueueItem {
  id: string;
  filename: string;
  type: DataSourceType;
  status: 'NLP Extracting' | 'Processing' | 'Uploading' | 'Indexed' | 'Complete';
  progress: number;
  counts: {
    persons?: number;
    locations?: number;
    calls?: number;
    payments?: number;
    accounts?: number;
  };
  badgeColor: string;
  timestamp: string;
}

export interface CorrelationInsight {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  description: string;
  sourceTypes: DataSourceType[];
  caseIds: string[];
  entities: string[];
}

export interface ExtractedDocumentData {
  id: string;
  filename: string;
  sourceType: DataSourceType;
  rawText: string;
  timestamp: string;
  fileSize?: string;
  persons: { name: string; role?: string; aliases?: string[] }[];
  phoneNumbers: string[];
  bankAccounts: string[];
  vehicles: { plate: string; model?: string; color?: string }[];
  locations: { name: string; address?: string; x: number; y: number; threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[];
  events: { time: string; description: string; location?: string }[];
  emails?: string[];
  organizations?: string[];
  summary: string;
  confidenceScore: number;
}

// ---------------------------------------------------------------------------
// Criminal Investigation Relationship Graph / Link Analysis Types
// ---------------------------------------------------------------------------

export type GraphEntityType = 
  | 'PERSON'
  | 'PHONE'
  | 'VEHICLE'
  | 'BANK_ACCOUNT'
  | 'EMAIL'
  | 'LOCATION'
  | 'ORGANIZATION'
  | 'CASE'
  | 'EVENT'
  | 'EVIDENCE';

export interface SourceEvidenceRef {
  docId: string;
  docName: string;
  sourceType?: DataSourceType;
  snippet?: string;
  timestamp?: string;
}

export interface GraphEntityNode {
  id: string; // normalized unique ID (e.g. 'person_marcus_chen', 'phone_19175550192')
  entityType: GraphEntityType;
  displayName: string;
  subtitle?: string;
  metadata: Record<string, any>;
  sourceDocIds: string[];
  sourceEvidenceRefs: SourceEvidenceRef[];
  confidence: number; // 0 - 100
  caseIds: string[];
  caseNumbers: string[];
  clusterId: string; // e.g. 'Cluster A'
  clusterName: string;
  clusterColor: string;
  isBridge?: boolean; // bridge between 2 or more clusters / cases
  isHighConnectivity?: boolean; // "High Connectivity" or "Important Network Node"
  degree: number; // count of connected edges
  // D3 force simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphRelationshipEdge {
  id: string;
  source: string | GraphEntityNode; // string initially, converted to node reference by D3
  target: string | GraphEntityNode;
  sourceId: string; // always string ID
  targetId: string; // always string ID
  label: string; // e.g. "owns", "uses", "transacted with", "located at", "involved in"
  strength: number; // 0 - 100
  strengthLevel: 'WEAK' | 'MEDIUM' | 'STRONG';
  sourceDocIds: string[];
  sourceEvidenceRefs: SourceEvidenceRef[];
  evidenceSnippet?: string;
  caseIds: string[];
  direction?: 'BIDIRECTIONAL' | 'SOURCE_TO_TARGET';
}

export interface NetworkIntelligenceStats {
  totalEntities: number;
  totalRelationships: number;
  totalCases: number;
  totalClusters: number;
  highConnectivityCount: number;
  mostConnectedEntities: { id: string; name: string; type: GraphEntityType; degree: number }[];
  strongestRelationships: { id: string; source: string; target: string; label: string; strength: number }[];
  bridgeEntities: { id: string; name: string; type: GraphEntityType; clusterCount: number }[];
  crossCaseEntitiesCount: number;
}

export interface GraphFilterState {
  allowedTypes: Record<GraphEntityType, boolean>;
  minStrength: number; // 0, 30, 70
  selectedCaseId: string | 'ALL';
  selectedClusterId: string | 'ALL';
  minConfidence: number; // 0 - 100
  searchQuery: string;
  onlyHighConnectivity: boolean;
}

