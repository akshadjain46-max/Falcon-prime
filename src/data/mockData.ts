import { CaseItem, CorrelationInsight, DataSourceNode, MapLocationNode, ProcessingQueueItem, SubscriptionItem, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  id: 'usr_882941',
  name: 'Det. J. Miller',
  badgeNumber: 'NY-8842-INV',
  role: 'Lead Investigator',
  department: 'Federal Cyber Forensics & Major Syndicate Bureau',
  clearanceLevel: 'LEVEL 4 - TOP SECRET',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpVsPvmhsW-pSTSP33ahwyw5lkNne7rL_U4inVk4QX6FcGji9Q8jfF08apR-Et85D1fDB9lfUvzhZJY3wEOJsUN5134eCsTtPhLF8CYDDn8Qdo3SXW5wj2utx2d_kpwwUOyPYtqPgARKp_ta8xIy_hm1SIinXYdjGqDik5QXgVLJqnbvWEI8VviJUJnns33delN_lP57wkwEOB890z5S8xM18auTarYYayAOQf0NlX1zh7gIQJJQVcog',
  email: 'j.miller@aegis.gov.security',
  lastLogin: 'Today at 08:42:19 EST',
  tokenBalance: 45920,
  accountStatus: 'ACTIVE',
};

export const INITIAL_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: 'sub_forensics_enterprise',
    title: 'Aegis Sentinel Forensics Enterprise Suite',
    category: 'Core System License',
    tier: 'Platinum Tier (Multi-Agency)',
    status: 'ACTIVE',
    renewalDate: 'Nov 14, 2026',
    usagePercent: 68,
    quotaDescription: 'Unlimited case records, 50 Concurrent Data Pipelines',
    iconName: 'shield',
    costPerMonth: '$4,850/mo (Government Grant)',
    features: [
      'Central Investigation Fusion Core v5.4',
      'Cross-Case NLP Graph Linking Engine',
      'Real-time Entity Clustering & Geo-tracking',
      'Full Forensic Chain-of-Custody Logging'
    ]
  },
  {
    id: 'sub_cdr_telecom_relay',
    title: 'National CDR & Telecom Carrier Grid Relay',
    category: 'Telecom & Tower Telemetry',
    tier: 'Tier 1 Real-time Uplink',
    status: 'ACTIVE',
    renewalDate: 'Dec 01, 2026',
    usagePercent: 82,
    quotaDescription: '842,500 / 1,000,000 Tower pings consumed',
    iconName: 'cell_tower',
    costPerMonth: '$2,200/mo',
    features: [
      'Direct SS7 & 5G Base Station Triangulation',
      'Encrypted Burner Phone IMEIs Intercept',
      'Call Graph & Contact Frequency Analysis',
      'Automated Cell Tower Handoff Tracker'
    ]
  },
  {
    id: 'sub_cctv_facial_mesh',
    title: 'Metro CCTV & Automated License Plate Reader (ALPR) Mesh',
    category: 'Visual Forensics',
    tier: 'Citywide High-Def Live Stream',
    status: 'ACTIVE',
    renewalDate: 'Jan 15, 2027',
    usagePercent: 91,
    quotaDescription: '2,400 Live City Feeds Connected (94.8% AI Face Match)',
    iconName: 'videocam',
    costPerMonth: '$3,400/mo',
    features: [
      'Sub-second Vector Facial Matching (NCIC / Interpol)',
      'Vehicle Trajectory & Plate Recognition',
      'Infrared Night-Vision Geo-Pinning',
      'Automated Crowd Density & Suspicious Movement Alerts'
    ]
  },
  {
    id: 'sub_financial_swift_fincen',
    title: 'FinCEN & SWIFT Forensics Global Radar',
    category: 'Financial Forensics',
    tier: 'Institutional Banking Gateway',
    status: 'ACTIVE',
    renewalDate: 'Oct 28, 2026',
    usagePercent: 44,
    quotaDescription: '34,200 Bank Statements & Crypto Ledgers Synced',
    iconName: 'account_balance',
    costPerMonth: '$1,900/mo',
    features: [
      'Offshore Shell Entity De-anonymization',
      'Crypto Blockchain Hop Tracking (BTC, ETH, Monero)',
      'Instant SAR (Suspicious Activity Report) Ingestion',
      'Multi-currency Smurfing Pattern Detector'
    ]
  },
  {
    id: 'sub_interpol_ncic',
    title: 'Interpol & NCIC Criminal Record Biometric Highway',
    category: 'Law Enforcement Intelligence',
    tier: 'Federal Bureau Direct Socket',
    status: 'ACTIVE',
    renewalDate: 'Sep 30, 2026',
    usagePercent: 35,
    quotaDescription: 'Low Latency (<14ms), 1.2M Red Notices Indexed',
    iconName: 'database',
    costPerMonth: '$1,250/mo',
    features: [
      'Global Red Notice & Watchlist Live Webhooks',
      'Fingerprint & Tattoo Biometric Matcher',
      'Syndicate Alias & Modus Operandi Matching',
      'Cross-border Extradition Warrant Status'
    ]
  }
];

export const INITIAL_DATA_SOURCES: DataSourceNode[] = [
  {
    id: 'FIR',
    title: 'Police Reports & FIRs',
    shortName: 'FIRs',
    description: 'First Information Reports, incident logs, witness statements & OCR extracts.',
    color: '#4edea3',
    glowColor: 'rgba(78, 222, 163, 0.4)',
    bgHex: 'rgba(78, 222, 163, 0.12)',
    icon: 'description',
    packetRate: 14,
    totalRecords: '14,890 Files',
    status: 'ONLINE',
    sampleEvents: [
      'FIR #8849: Harbor Bay 4 Cargo Hijacking - OCR Complete',
      'FIR #1029: Armed Transit Incident on Central Plaza - Filed 03:15 AM',
      'FIR #7721: Shell Office Burglary - Witness Identified Suspect "Ghost"'
    ],
    activePings: 24
  },
  {
    id: 'CDR',
    title: 'CDR & Telecom Telemetry',
    shortName: 'CDRs',
    description: 'Call Detail Records, IMEI pings, SMS logs & tower handoffs.',
    color: '#ffb95f',
    glowColor: 'rgba(255, 185, 95, 0.4)',
    bgHex: 'rgba(255, 185, 95, 0.12)',
    icon: 'cell_tower',
    packetRate: 38,
    totalRecords: '842,500 Pings',
    status: 'STREAMING',
    sampleEvents: [
      'IMEI #867912401 Pinged Tower #14 (Signal strength -68dBm)',
      'Burner +1-917-555-0192 called +1-212-555-0814 (Duration 142s)',
      'Sim-swap event detected on encrypted Node #8'
    ],
    activePings: 89
  },
  {
    id: 'FINANCIAL',
    title: 'Financial Forensics',
    shortName: 'Financial Records',
    description: 'SWIFT wire transfers, shell company bank accounts & crypto wallets.',
    color: '#ffb4ab',
    glowColor: 'rgba(255, 180, 171, 0.4)',
    bgHex: 'rgba(255, 180, 171, 0.12)',
    icon: 'account_balance',
    packetRate: 19,
    totalRecords: '34,210 Ledgers',
    status: 'INGESTING',
    sampleEvents: [
      'Offshore wire $1.45M -> Apex Holdings Caymans via NeoBank',
      'Crypto mixer transaction 42.8 ETH -> Wallet 0x7a99f...',
      'ATM cash withdrawals $9,500 split across 4 Midtown nodes'
    ],
    activePings: 45
  },
  {
    id: 'CCTV',
    title: 'CCTV & ALPR Matrix',
    shortName: 'CCTV Feeds',
    description: 'Real-time city surveillance cams, automated license plate readers.',
    color: '#adc6ff',
    glowColor: 'rgba(173, 198, 255, 0.4)',
    bgHex: 'rgba(173, 198, 255, 0.12)',
    icon: 'videocam',
    packetRate: 64,
    totalRecords: '2,400 Cameras',
    status: 'STREAMING',
    sampleEvents: [
      'Camera #22 (Central Plaza): Facial Match 94.8% on Suspect Viktor Vance',
      'ALPR Cam #104: Plate [7XYZ89] Black SUV speed 58mph Heading North',
      'Harbor Gate Cam #09: Unmarked container loaded at 02:44 AM'
    ],
    activePings: 112
  },
  {
    id: 'SOCIAL',
    title: 'Social Intelligence',
    shortName: 'Social Media',
    description: 'Geo-tagged posts, dark web forums, alias chatter & encrypted handles.',
    color: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.4)',
    bgHex: 'rgba(167, 139, 250, 0.12)',
    icon: 'public',
    packetRate: 22,
    totalRecords: '128,400 Feeds',
    status: 'STREAMING',
    sampleEvents: [
      'Darknet handle "Phant0m_X" posted meeting coordinates: Pier 18',
      'Geo-tagged Instagram story matched background to Warehouse Alpha',
      'Encrypted Telegram channel "Vanguard Express" broadcast update'
    ],
    activePings: 37
  },
  {
    id: 'CRIMINAL',
    title: 'Criminal History & NCIC',
    shortName: 'Criminal History',
    description: 'NCIC priors, Interpol red notices, syndicate hierarchies & warrants.',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    bgHex: 'rgba(244, 63, 94, 0.12)',
    icon: 'database',
    packetRate: 8,
    totalRecords: '1.2M Records',
    status: 'SYNCED',
    sampleEvents: [
      'Interpol Red Notice #A-4892: Viktor "Ghost" Vance (Armaments Trafficking)',
      'Active Federal Warrant for Marcus "Apex" Chen (Racketeering)',
      'Prior conviction record linked to Elena Rostova (Wire Fraud 2021)'
    ],
    activePings: 18
  }
];

export const INITIAL_CASES: CaseItem[] = [
  {
    id: 'case_1',
    caseNumber: 'CR-2024-8849',
    title: 'Operation Phantom Transit (Harbor Smuggling)',
    status: 'CRITICAL',
    dateOpened: '2026-08-12',
    leadInvestigator: 'Det. J. Miller',
    summary: 'High-value military optics and encrypted telemetry transceivers stolen from Container #NY-4481 at Harbor Terminal Bay 4.',
    location: 'Harbor Logistics Pier 4',
    coordinates: { x: 82, y: 74, lat: 40.6782, lng: -74.015 },
    linkedSuspects: ['Viktor "Ghost" Vance', 'Marcus "Apex" Chen'],
    linkedPhoneNumbers: ['+1-917-555-0192', '+1-212-555-0814'],
    linkedBankAccounts: ['Apex Holdings Caymans #9921', 'NeoBank Wire #4921'],
    linkedVehicles: ['Black Armored SUV [Plate: 7XYZ89]', 'Freightliner Semi [Plate: 9TRK42]'],
    evidenceCount: 38,
    linkedCaseIds: ['case_2', 'case_3', 'case_4'],
    confidenceScore: 96.4
  },
  {
    id: 'case_2',
    caseNumber: 'CR-2024-8902',
    title: 'Offshore Crypto Laundering & NeoBank Divert',
    status: 'ACTIVE',
    dateOpened: '2026-08-18',
    leadInvestigator: 'Det. J. Miller',
    summary: 'Multi-million dollar SWIFT wire rerouting and crypto mixer tumbling through offshore shells directly funding harbor logistics and safehouses.',
    location: 'Financial District Tower 9',
    coordinates: { x: 48, y: 38, lat: 40.7075, lng: -74.009 },
    linkedSuspects: ['Viktor "Ghost" Vance', 'Elena Rostova (Accountant)'],
    linkedPhoneNumbers: ['+1-917-555-0192', '+1-646-555-4421'],
    linkedBankAccounts: ['Apex Holdings Caymans #9921', 'Crypto Wallet 0x7a99f...'],
    linkedVehicles: ['Audi A8 Dark Gray [Plate: 4LND88]'],
    evidenceCount: 52,
    linkedCaseIds: ['case_1', 'case_4'],
    confidenceScore: 92.1
  },
  {
    id: 'case_3',
    caseNumber: 'CR-2024-8955',
    title: 'Midtown Armored Transit Vault Heist',
    status: 'ACTIVE',
    dateOpened: '2026-08-22',
    leadInvestigator: 'Det. R. Gomez',
    summary: 'Armed breach of Central Plaza depository van. Escaped using the same Black SUV (7XYZ89) seen at Harbor Bay 4.',
    location: 'Central Plaza Bank Depot',
    coordinates: { x: 32, y: 55, lat: 40.7549, lng: -73.984 },
    linkedSuspects: ['Marcus "Apex" Chen', 'Unknown Operative #3'],
    linkedPhoneNumbers: ['+1-212-555-0814', '+1-347-555-9011'],
    linkedBankAccounts: ['NeoBank Wire #4921'],
    linkedVehicles: ['Black Armored SUV [Plate: 7XYZ89]'],
    evidenceCount: 29,
    linkedCaseIds: ['case_1', 'case_4'],
    confidenceScore: 94.8
  },
  {
    id: 'case_4',
    caseNumber: 'CR-2024-9014',
    title: 'Burner Telemetry & Safehouse Command Cell',
    status: 'MONITORING',
    dateOpened: '2026-08-27',
    leadInvestigator: 'Det. J. Miller',
    summary: 'Coordinated burner phone cluster bouncing calls across Industrial Tower #14 to coordinate shipments between Harbor and Financial shell offices.',
    location: 'Industrial Telecom Node 12 & West Safehouse',
    coordinates: { x: 22, y: 78, lat: 40.7306, lng: -74.032 },
    linkedSuspects: ['Viktor "Ghost" Vance', 'Elena Rostova (Accountant)', 'Marcus "Apex" Chen'],
    linkedPhoneNumbers: ['+1-917-555-0192', '+1-212-555-0814', '+1-646-555-4421'],
    linkedBankAccounts: ['Crypto Wallet 0x7a99f...'],
    linkedVehicles: ['Black Armored SUV [Plate: 7XYZ89]', 'Audi A8 Dark Gray [Plate: 4LND88]'],
    evidenceCount: 44,
    linkedCaseIds: ['case_1', 'case_2', 'case_3'],
    confidenceScore: 98.7
  }
];

export const MAP_LOCATIONS: MapLocationNode[] = [
  {
    id: 'loc_harbor_pier4',
    name: 'Harbor Pier 4 Cargo Terminal',
    district: 'Industrial Waterfront',
    type: 'PORT_CONTAINER',
    coords: { x: 82, y: 74 },
    status: 'HIGH_ALERT',
    threatLevel: 'CRITICAL',
    associatedCaseIds: ['case_1'],
    associatedSources: ['FIR', 'CCTV', 'CDR'],
    details: {
      address: 'Berth 14-B, Atlantic Maritime Container Port',
      lastPing: '2 mins ago',
      targetSuspect: 'Viktor "Ghost" Vance',
      cctvLive: true,
      cctvFeedUrl: 'CAM_PORT_04_FEED_SECURE',
      telemetry: 'Container #NY-4481 breached; heavy forklift tracks leading towards Expressway South.'
    }
  },
  {
    id: 'loc_financial_tower',
    name: 'NeoBank & Financial District Tower 9',
    district: 'Financial Core',
    type: 'FINANCIAL_NODE',
    coords: { x: 48, y: 38 },
    status: 'SURVEILLANCE_ACTIVE',
    threatLevel: 'HIGH',
    associatedCaseIds: ['case_2'],
    associatedSources: ['FINANCIAL', 'SOCIAL', 'CRIMINAL'],
    details: {
      address: '88 Wall Street, 32nd Floor Apex Holdings',
      lastPing: 'Just now',
      targetSuspect: 'Elena Rostova',
      cctvLive: true,
      cctvFeedUrl: 'CAM_LOBBY_TOWER9_HD',
      telemetry: 'Wire transfer $1.45M to Caymans authorized from IP 198.51.100.44 inside 32nd floor.'
    }
  },
  {
    id: 'loc_central_plaza',
    name: 'Central Plaza Depository & Intersection',
    district: 'Midtown Commercial',
    type: 'CCTV_HUB',
    coords: { x: 32, y: 55 },
    status: 'SURVEILLANCE_ACTIVE',
    threatLevel: 'HIGH',
    associatedCaseIds: ['case_3', 'case_1'],
    associatedSources: ['CCTV', 'FIR', 'CDR'],
    details: {
      address: 'Grand Central Ave & 5th St Crossing',
      lastPing: '4 mins ago',
      targetSuspect: 'Marcus "Apex" Chen',
      cctvLive: true,
      cctvFeedUrl: 'CAM_MIDTOWN_22_ALPR',
      telemetry: 'ALPR camera flagged Black SUV [7XYZ89]. Face recognition score 94.8% on Chen.'
    }
  },
  {
    id: 'loc_telecom_tower14',
    name: 'Industrial Base Station Tower #14',
    district: 'West Rail Corridor',
    type: 'CELL_TOWER',
    coords: { x: 22, y: 78 },
    status: 'INTERCEPTING',
    threatLevel: 'MEDIUM',
    associatedCaseIds: ['case_4', 'case_1', 'case_2'],
    associatedSources: ['CDR', 'CRIMINAL'],
    details: {
      address: 'Substation Sector 12, West Railyards',
      lastPing: '12 secs ago',
      targetSuspect: 'Burner Network Ring',
      cctvLive: false,
      telemetry: '3 encrypted IMSI handsets pinging simultaneously with frequency shifts every 15 minutes.'
    }
  },
  {
    id: 'loc_west_safehouse',
    name: 'Syndicate Safehouse Alpha',
    district: 'Suburban Periphery',
    type: 'SAFEHOUSE',
    coords: { x: 15, y: 28 },
    status: 'HIGH_ALERT',
    threatLevel: 'CRITICAL',
    associatedCaseIds: ['case_4', 'case_2', 'case_1'],
    associatedSources: ['SOCIAL', 'FINANCIAL', 'CCTV'],
    details: {
      address: '404 Ridgeview Rd, Industrial Hangar B',
      lastPing: '18 mins ago',
      targetSuspect: 'Viktor "Ghost" Vance',
      cctvLive: true,
      cctvFeedUrl: 'DRONE_RECON_ALPHA_IR',
      telemetry: 'Social media image metadata matches concrete wall texture and HVAC units on rooftop.'
    }
  },
  {
    id: 'loc_police_precinct',
    name: 'Metro Cyber & Forensic Command Center',
    district: 'Government Civic Center',
    type: 'POLICE_PRECINCT',
    coords: { x: 50, y: 50 },
    status: 'NORMAL',
    threatLevel: 'LOW',
    associatedCaseIds: ['case_1', 'case_2', 'case_3', 'case_4'],
    associatedSources: ['FIR', 'CDR', 'FINANCIAL', 'CCTV', 'SOCIAL', 'CRIMINAL'],
    details: {
      address: '100 Federal Plaza - Aegis Headquarters',
      lastPing: 'Live Realtime',
      targetSuspect: 'All Nodes Linked',
      cctvLive: true,
      cctvFeedUrl: 'HQ_COMMAND_ROOM_01',
      telemetry: 'Central Investigation Fusion Engine synthesizing 6 external intelligence streams.'
    }
  }
];

export const INITIAL_LOCATIONS: MapLocationNode[] = MAP_LOCATIONS;

export const INITIAL_PROCESSING_QUEUE: ProcessingQueueItem[] = [
  {
    id: 'q_1',
    filename: 'FIR_2023_09_A_Metro.pdf',
    type: 'FIR',
    status: 'NLP Extracting',
    progress: 75,
    counts: { persons: 12, locations: 4 },
    badgeColor: '#4edea3',
    timestamp: '10:41 AM'
  },
  {
    id: 'q_2',
    filename: 'CDR_Suspect_Alpha_Oct.csv',
    type: 'CDR',
    status: 'Processing',
    progress: 45,
    counts: { calls: 842 },
    badgeColor: '#ffb95f',
    timestamp: '10:39 AM'
  },
  {
    id: 'q_3',
    filename: 'twitter_scrape_syndicate.json',
    type: 'SOCIAL',
    status: 'Uploading',
    progress: 15,
    counts: {},
    badgeColor: '#adc6ff',
    timestamp: '10:35 AM'
  },
  {
    id: 'q_4',
    filename: 'Offshore_Acct_4921.xml',
    type: 'FINANCIAL',
    status: 'Indexed',
    progress: 100,
    counts: { payments: 156, accounts: 3 },
    badgeColor: '#adc6ff',
    timestamp: '10:30 AM'
  }
];

export const INITIAL_CORRELATION_INSIGHTS: CorrelationInsight[] = [
  {
    id: 'ins_1',
    title: 'Cross-Case Identity Confirmation',
    severity: 'CRITICAL',
    timestamp: '2 mins ago',
    description: 'Viktor "Ghost" Vance confirmed in Harbor Hijack (FIR #8849) and Wire Transfer $1.45M (SAR #4921) with 96.4% facial vector match on Midtown Cam #22.',
    sourceTypes: ['FIR', 'FINANCIAL', 'CCTV'],
    caseIds: ['case_1', 'case_2'],
    entities: ['Viktor Vance', 'Plate 7XYZ89', 'Apex Holdings']
  },
  {
    id: 'ins_2',
    title: 'Cell Tower Telemetry Convergence',
    severity: 'WARNING',
    timestamp: '7 mins ago',
    description: 'Burner number +1-917-555-0192 and +1-212-555-0814 pinged Tower #14 simultaneously 12 minutes prior to the Midtown Armored Transit breach.',
    sourceTypes: ['CDR', 'FIR'],
    caseIds: ['case_3', 'case_4'],
    entities: ['Tower #14', 'Marcus Chen', 'Burner Ring']
  },
  {
    id: 'ins_3',
    title: 'Offshore Shell & Crypto Mixer Hop',
    severity: 'CRITICAL',
    timestamp: '14 mins ago',
    description: 'SWIFT wire funds from NeoBank account #4921 converted to 42.8 ETH and dispersed to Safehouse Alpha utility payments.',
    sourceTypes: ['FINANCIAL', 'SOCIAL'],
    caseIds: ['case_2', 'case_4'],
    entities: ['Safehouse Alpha', 'Elena Rostova', 'NeoBank #4921']
  }
];
