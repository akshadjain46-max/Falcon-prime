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
