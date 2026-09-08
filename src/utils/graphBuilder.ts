import { 
  CaseItem, 
  CorrelationInsight, 
  DataSourceType, 
  ExtractedDocumentData, 
  GraphEntityNode, 
  GraphEntityType, 
  GraphRelationshipEdge, 
  MapLocationNode, 
  NetworkIntelligenceStats,
  SourceEvidenceRef
} from '../types';

// Palette of colors for clusters
const CLUSTER_COLORS = [
  '#4d8eff', // Blue
  '#4edea3', // Green
  '#ffb95f', // Amber
  '#f43f5e', // Rose
  '#a78bfa', // Purple
  '#2dd4bf', // Teal
  '#fb923c', // Orange
  '#e879f9', // Pink
];

// Helper to normalize names (e.g. Viktor "Ghost" Vance -> Viktor Vance)
export function normalizeEntityName(name: string): { clean: string; alias?: string } {
  let clean = name.trim();
  let alias: string | undefined;

  const quoteMatch = clean.match(/["']([^"']+)["']/);
  if (quoteMatch) {
    alias = quoteMatch[1];
    clean = clean.replace(/["'][^"']+["']/, '').replace(/\s+/g, ' ').trim();
  }

  // Strip prefixes like "Suspect", "Subject", "Dr."
  clean = clean.replace(/^(Suspect|Subject|Target|Witness|Mr\.|Ms\.|Mrs\.)\s+/i, '').trim();

  return { clean, alias };
}

// Clean phone numbers to standard format
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone.trim();
}

/**
 * Builds the complete Investigation Relationship Graph from all actual data in the system.
 */
export function buildInvestigationGraph(
  documents: ExtractedDocumentData[],
  cases: CaseItem[],
  locations: MapLocationNode[],
  insights: CorrelationInsight[]
): {
  nodes: GraphEntityNode[];
  edges: GraphRelationshipEdge[];
  stats: NetworkIntelligenceStats;
} {
  const nodeMap = new Map<string, GraphEntityNode>();
  const edgeMap = new Map<string, GraphRelationshipEdge>();

  // 1. Index Cases
  const caseMap = new Map<string, CaseItem>();
  cases.forEach(c => caseMap.set(c.id, c));

  // 2. Add EVIDENCE / DOCUMENT Nodes
  documents.forEach((doc) => {
    const docNodeId = `doc_${doc.id}`;
    const evidenceRef: SourceEvidenceRef = {
      docId: doc.id,
      docName: doc.filename,
      sourceType: doc.sourceType,
      snippet: doc.summary || doc.rawText.slice(0, 160),
      timestamp: doc.timestamp
    };

    nodeMap.set(docNodeId, {
      id: docNodeId,
      entityType: 'EVIDENCE',
      displayName: doc.filename,
      subtitle: `${doc.sourceType} Evidence File`,
      metadata: {
        sourceType: doc.sourceType,
        fileSize: doc.fileSize,
        timestamp: doc.timestamp,
        summary: doc.summary,
        rawLength: doc.rawText.length
      },
      sourceDocIds: [doc.id],
      sourceEvidenceRefs: [evidenceRef],
      confidence: doc.confidenceScore || 95,
      caseIds: cases.filter(c => c.id.includes(doc.id) || c.summary.includes(doc.filename)).map(c => c.id),
      caseNumbers: cases.filter(c => c.id.includes(doc.id) || c.summary.includes(doc.filename)).map(c => c.caseNumber),
      clusterId: 'Cluster 0',
      clusterName: 'Evidence Ingest',
      clusterColor: '#64748b',
      degree: 0
    });
  });

  // 3. Add CASE Nodes
  cases.forEach((c) => {
    const caseNodeId = `case_${c.id}`;
    nodeMap.set(caseNodeId, {
      id: caseNodeId,
      entityType: 'CASE',
      displayName: `${c.caseNumber}: ${c.title}`,
      subtitle: `Status: ${c.status} | Lead: ${c.leadInvestigator}`,
      metadata: {
        caseNumber: c.caseNumber,
        status: c.status,
        leadInvestigator: c.leadInvestigator,
        location: c.location,
        dateOpened: c.dateOpened,
        summary: c.summary
      },
      sourceDocIds: documents.filter(d => c.id.includes(d.id) || c.summary.includes(d.filename)).map(d => d.id),
      sourceEvidenceRefs: documents
        .filter(d => c.id.includes(d.id) || c.summary.includes(d.filename))
        .map(d => ({
          docId: d.id,
          docName: d.filename,
          sourceType: d.sourceType,
          snippet: c.summary,
          timestamp: d.timestamp
        })),
      confidence: c.confidenceScore || 90,
      caseIds: [c.id],
      caseNumbers: [c.caseNumber],
      clusterId: 'Cluster 0',
      clusterName: 'Case Dossiers',
      clusterColor: '#eab308',
      degree: 0
    });
  });

  // Helper to get or create an entity node
  const getOrCreateNode = (
    id: string,
    type: GraphEntityType,
    displayName: string,
    subtitle: string | undefined,
    metadata: Record<string, any>,
    doc: ExtractedDocumentData,
    snippet?: string,
    confidence: number = 85
  ): GraphEntityNode => {
    let existing = nodeMap.get(id);
    const evidenceRef: SourceEvidenceRef = {
      docId: doc.id,
      docName: doc.filename,
      sourceType: doc.sourceType,
      snippet: snippet || doc.summary || doc.rawText.slice(0, 140),
      timestamp: doc.timestamp
    };

    const linkedCaseList = cases.filter(c => 
      c.linkedSuspects.some(s => s.toLowerCase().includes(displayName.toLowerCase())) ||
      c.linkedPhoneNumbers.some(p => id.includes(p.replace(/[^0-9]/g, ''))) ||
      c.linkedVehicles.some(v => id.includes(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())) ||
      c.location.toLowerCase().includes(displayName.toLowerCase()) ||
      c.id.includes(doc.id)
    );

    if (!existing) {
      existing = {
        id,
        entityType: type,
        displayName,
        subtitle,
        metadata,
        sourceDocIds: [doc.id],
        sourceEvidenceRefs: [evidenceRef],
        confidence,
        caseIds: linkedCaseList.map(c => c.id),
        caseNumbers: linkedCaseList.map(c => c.caseNumber),
        clusterId: 'Cluster A',
        clusterName: 'Unassigned',
        clusterColor: '#4d8eff',
        degree: 0
      };
      nodeMap.set(id, existing);
    } else {
      // Merge provenance
      if (!existing.sourceDocIds.includes(doc.id)) {
        existing.sourceDocIds.push(doc.id);
      }
      existing.sourceEvidenceRefs.push(evidenceRef);
      // Merge metadata
      existing.metadata = { ...existing.metadata, ...metadata };
      linkedCaseList.forEach(c => {
        if (!existing!.caseIds.includes(c.id)) {
          existing!.caseIds.push(c.id);
          existing!.caseNumbers.push(c.caseNumber);
        }
      });
      existing.confidence = Math.max(existing.confidence, confidence);
    }
    return existing;
  };

  // Helper to add or increment an edge
  const addEdge = (
    sourceId: string,
    targetId: string,
    label: string,
    strength: number,
    doc: ExtractedDocumentData,
    evidenceSnippet?: string,
    direction: 'BIDIRECTIONAL' | 'SOURCE_TO_TARGET' = 'BIDIRECTIONAL'
  ) => {
    if (sourceId === targetId) return;
    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) return;

    // Normalizing edge key for undirected lookup
    const edgeKey = [sourceId, targetId].sort().join(':::') + `:::${label}`;
    const existing = edgeMap.get(edgeKey);

    const ref: SourceEvidenceRef = {
      docId: doc.id,
      docName: doc.filename,
      sourceType: doc.sourceType,
      snippet: evidenceSnippet || doc.summary || doc.rawText.slice(0, 140),
      timestamp: doc.timestamp
    };

    const edgeCases = cases
      .filter(c => c.id.includes(doc.id) || (nodeMap.get(sourceId)?.caseIds.includes(c.id) && nodeMap.get(targetId)?.caseIds.includes(c.id)))
      .map(c => c.id);

    if (!existing) {
      let strengthLevel: 'WEAK' | 'MEDIUM' | 'STRONG' = 'MEDIUM';
      if (strength >= 75) strengthLevel = 'STRONG';
      else if (strength < 45) strengthLevel = 'WEAK';

      edgeMap.set(edgeKey, {
        id: `edge_${edgeMap.size + 1}`,
        source: sourceId,
        target: targetId,
        sourceId,
        targetId,
        label,
        strength,
        strengthLevel,
        sourceDocIds: [doc.id],
        sourceEvidenceRefs: [ref],
        evidenceSnippet: evidenceSnippet || ref.snippet,
        caseIds: edgeCases,
        direction
      });
    } else {
      if (!existing.sourceDocIds.includes(doc.id)) {
        existing.sourceDocIds.push(doc.id);
      }
      existing.sourceEvidenceRefs.push(ref);
      existing.strength = Math.min(100, existing.strength + 15);
      if (existing.strength >= 75) existing.strengthLevel = 'STRONG';
      edgeCases.forEach(cid => {
        if (!existing.caseIds.includes(cid)) existing.caseIds.push(cid);
      });
    }
  };

  // 4. Extract Entities & Relationships from Documents
  documents.forEach((doc) => {
    const docNodeId = `doc_${doc.id}`;
    const content = doc.rawText;

    // A. Extract Persons
    const personNodes: GraphEntityNode[] = [];
    doc.persons.forEach((p) => {
      const { clean, alias } = normalizeEntityName(p.name);
      if (!clean || clean.length < 3) return;
      const personId = `person_${clean.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      const node = getOrCreateNode(
        personId,
        'PERSON',
        clean,
        alias ? `Alias: "${alias}" | ${p.role || 'Identified Subject'}` : p.role || 'Person of Interest',
        {
          role: p.role || 'Person of Interest',
          aliases: alias ? [alias, ...(p.aliases || [])] : p.aliases || [],
          originalName: p.name
        },
        doc,
        `Cited as ${p.role || 'subject'} in ${doc.filename}: "${clean}"`,
        doc.confidenceScore
      );
      personNodes.push(node);

      // Edge: PERSON mentioned in DOCUMENT
      addEdge(personId, docNodeId, 'mentioned in', 70, doc, `Mentioned in ${doc.filename}`);

      // Edge: PERSON involved in CASE
      node.caseIds.forEach(cid => {
        const caseNodeId = `case_${cid}`;
        if (nodeMap.has(caseNodeId)) {
          addEdge(personId, caseNodeId, 'involved in', 85, doc, `Documented in Case ${caseMap.get(cid)?.caseNumber || cid}`);
        }
      });
    });

    // Co-occurring persons in same document -> connected to
    for (let i = 0; i < personNodes.length; i++) {
      for (let j = i + 1; j < personNodes.length; j++) {
        addEdge(
          personNodes[i].id,
          personNodes[j].id,
          'connected to',
          78,
          doc,
          `Co-identified in ${doc.filename} during the same incident / investigation timeframe.`
        );
      }
    }

    // B. Extract Phone Numbers
    const phoneNodes: GraphEntityNode[] = [];
    doc.phoneNumbers.forEach((ph) => {
      const norm = normalizePhoneNumber(ph);
      const phoneId = `phone_${norm.replace(/[^0-9]/g, '')}`;
      const isImei = ph.length >= 14 && /^\d+$/.test(ph);

      const node = getOrCreateNode(
        phoneId,
        'PHONE',
        norm,
        isImei ? 'Hardware IMEI Node' : 'Cellular Line',
        { rawNumber: ph, isImei },
        doc,
        `Telecom record extracted from ${doc.filename}: ${ph}`,
        90
      );
      phoneNodes.push(node);

      // Edge: PHONE documented in DOCUMENT
      addEdge(phoneId, docNodeId, 'logged in', 65, doc, `Telecom record logged in ${doc.filename}`);

      // If there are persons in this document, connect person -> phone
      personNodes.forEach((p) => {
        addEdge(p.id, phoneId, 'uses', 82, doc, `Associated with telephone line ${norm} in ${doc.filename}`);
      });
    });

    // If this is a CDR document, connect caller to receiver phones
    if (doc.sourceType === 'CDR') {
      const cdrLines = content.split('\n');
      cdrLines.forEach((line) => {
        const numbers = line.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
        if (numbers && numbers.length >= 2) {
          const numA = normalizePhoneNumber(numbers[0]);
          const numB = normalizePhoneNumber(numbers[1]);
          const idA = `phone_${numA.replace(/[^0-9]/g, '')}`;
          const idB = `phone_${numB.replace(/[^0-9]/g, '')}`;
          if (nodeMap.has(idA) && nodeMap.has(idB) && idA !== idB) {
            addEdge(idA, idB, 'called', 90, doc, `Direct call record logged: ${line.trim().slice(0, 90)}`, 'SOURCE_TO_TARGET');
          }
        }
      });
    }

    // C. Extract Vehicles
    const vehicleNodes: GraphEntityNode[] = [];
    doc.vehicles.forEach((v) => {
      const plate = v.plate.toUpperCase().trim();
      const vehId = `veh_${plate.replace(/[^A-Z0-9]/g, '')}`;
      const desc = `${v.color || ''} ${v.model || 'Vehicle'}`.trim() || 'Unspecified Motor Vehicle';

      const node = getOrCreateNode(
        vehId,
        'VEHICLE',
        `Plate [${plate}]`,
        desc,
        { plate, model: v.model, color: v.color },
        doc,
        `Vehicle ${desc} [Plate ${plate}] identified in ${doc.filename}`,
        92
      );
      vehicleNodes.push(node);

      addEdge(vehId, docNodeId, 'recorded in', 70, doc, `License plate cited in ${doc.filename}`);

      // Associate persons in this document with the vehicle
      personNodes.forEach((p) => {
        addEdge(p.id, vehId, 'operates', 85, doc, `Observed in/operating vehicle [Plate ${plate}] in ${doc.filename}`);
      });
    });

    // D. Extract Bank Accounts / Crypto Wallets
    const bankNodes: GraphEntityNode[] = [];
    doc.bankAccounts.forEach((acc) => {
      const isCrypto = acc.startsWith('0x') || acc.includes('ETH') || acc.includes('BTC');
      const accId = `bank_${acc.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const node = getOrCreateNode(
        accId,
        'BANK_ACCOUNT',
        acc,
        isCrypto ? 'Crypto Ledger Wallet' : 'Financial Wire / Account',
        { account: acc, isCrypto },
        doc,
        `Financial transaction record in ${doc.filename}: ${acc}`,
        88
      );
      bankNodes.push(node);

      addEdge(accId, docNodeId, 'audited in', 70, doc, `Financial record cited in ${doc.filename}`);

      personNodes.forEach((p) => {
        addEdge(p.id, accId, 'controls', 84, doc, `Financial control / account link in ${doc.filename}`);
      });
    });

    // E. Extract Locations
    const locationNodes: GraphEntityNode[] = [];
    doc.locations.forEach((loc) => {
      const locName = loc.name.trim();
      if (locName.length < 3) return;
      const locId = `loc_${locName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      const node = getOrCreateNode(
        locId,
        'LOCATION',
        locName,
        loc.address || 'Metro Coordinate',
        { address: loc.address, threatLevel: loc.threatLevel, x: loc.x, y: loc.y },
        doc,
        `Location identified in ${doc.filename}: ${locName}`,
        85
      );
      locationNodes.push(node);

      addEdge(locId, docNodeId, 'sited in', 60, doc, `Geographic landmark in ${doc.filename}`);

      // Person located at
      personNodes.forEach((p) => {
        addEdge(p.id, locId, 'located at', 76, doc, `Subject sighted / located at ${locName} in ${doc.filename}`);
      });

      // Vehicle detected at
      vehicleNodes.forEach((v) => {
        addEdge(v.id, locId, 'detected at', 88, doc, `Vehicle license plate scanned/observed at ${locName}`);
      });

      // Phone pinged at (cell tower relays)
      if (doc.sourceType === 'CDR') {
        phoneNodes.forEach((ph) => {
          addEdge(ph.id, locId, 'pinged at', 84, doc, `Cellular handoff / tower ping logged at ${locName}`);
        });
      }
    });

    // F. Extract Organizations (e.g. Apex Holdings Caymans, FinCEN, Metro Police Dept, NeoBank)
    const orgMatches: string[] = Array.from(content.match(/(?:[A-Z][A-Za-z0-9&.\s]{2,25}(?:Holdings|Corp|Corporation|Inc|LLC|Bank|Logistics|Dept|Department|Agency|Syndicate|Bureau|Club))\b/g) || []);
    const orgSet = new Set<string>();
    const orgNodes: GraphEntityNode[] = [];

    // Also look for beneficiary in financial json
    const benefMatch = content.match(/"beneficiary":\s*"([^"]+)"/i);
    if (benefMatch && benefMatch[1]) {
      orgMatches.push(benefMatch[1]);
    }

    orgMatches.forEach((orgRaw) => {
      const orgName = orgRaw.trim().replace(/^["']|["']$/g, '');
      if (orgName.length < 4 || orgSet.has(orgName.toLowerCase())) return;
      orgSet.add(orgName.toLowerCase());

      const orgId = `org_${orgName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const node = getOrCreateNode(
        orgId,
        'ORGANIZATION',
        orgName,
        'Commercial / Corporate Entity',
        { name: orgName },
        doc,
        `Organization documented in ${doc.filename}: ${orgName}`,
        86
      );
      orgNodes.push(node);

      addEdge(orgId, docNodeId, 'referenced in', 65, doc, `Organization cited in ${doc.filename}`);

      // Person associated with Organization
      personNodes.forEach((p) => {
        addEdge(p.id, orgId, 'associated with', 80, doc, `Associated with ${orgName} in ${doc.filename}`);
      });

      // Bank account belongs to Organization
      bankNodes.forEach((b) => {
        addEdge(b.id, orgId, 'transacted with', 85, doc, `Financial linkage to ${orgName} in ${doc.filename}`);
      });
    });

    // G. Extract Emails
    const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const emailSet = new Set<string>();
    emailMatches.forEach((em) => {
      const email = em.toLowerCase().trim();
      if (emailSet.has(email)) return;
      emailSet.add(email);

      const emId = `email_${email.replace(/[^a-z0-9]/g, '_')}`;
      const node = getOrCreateNode(
        emId,
        'EMAIL',
        email,
        'Electronic Mail Address',
        { email },
        doc,
        `Email address extracted from ${doc.filename}: ${email}`,
        88
      );

      addEdge(emId, docNodeId, 'found in', 65, doc, `Email found in ${doc.filename}`);

      personNodes.forEach((p) => {
        addEdge(p.id, emId, 'uses', 85, doc, `Communicates via ${email} in ${doc.filename}`);
      });
    });

    // H. Extract Timeline Events
    doc.events.slice(0, 4).forEach((ev, evIdx) => {
      const eventDesc = ev.description.slice(0, 80);
      const eventId = `event_${doc.id}_${evIdx}`;

      const node = getOrCreateNode(
        eventId,
        'EVENT',
        `${ev.time || 'Timestamped'}: ${eventDesc}`,
        `Documented Incident Event`,
        { time: ev.time, description: ev.description, location: ev.location },
        doc,
        `Event logged in ${doc.filename}: "${ev.description}" at ${ev.time}`,
        84
      );

      addEdge(eventId, docNodeId, 'recorded in', 60, doc, `Timeline event recorded in ${doc.filename}`);

      // Connect to location if available
      if (locationNodes.length > 0) {
        addEdge(eventId, locationNodes[0].id, 'occurred at', 78, doc, `Occurred at ${locationNodes[0].displayName}`);
      }

      // Connect to persons present
      personNodes.forEach((p) => {
        addEdge(p.id, eventId, 'participated in', 75, doc, `Subject involved in event: ${eventDesc}`);
      });
    });
  });

  // 5. Connect Cases with Shared Entities (Cross-Case Connections)
  for (let i = 0; i < cases.length; i++) {
    for (let j = i + 1; j < cases.length; j++) {
      const caseA = cases[i];
      const caseB = cases[j];
      const caseNodeA = `case_${caseA.id}`;
      const caseNodeB = `case_${caseB.id}`;

      if (nodeMap.has(caseNodeA) && nodeMap.has(caseNodeB)) {
        // Check shared suspects, phones, or bank accounts
        const sharedSuspects = caseA.linkedSuspects.filter(s => s !== 'Unidentified Subject' && caseB.linkedSuspects.includes(s));
        const sharedPhones = caseA.linkedPhoneNumbers.filter(p => caseB.linkedPhoneNumbers.includes(p));
        const sharedAccts = caseA.linkedBankAccounts.filter(a => caseB.linkedBankAccounts.includes(a));

        if (sharedSuspects.length > 0 || sharedPhones.length > 0 || sharedAccts.length > 0) {
          const matchingEntity = sharedSuspects[0] || sharedPhones[0] || sharedAccts[0] || 'Evidence Link';
          const dummyDoc: ExtractedDocumentData = documents[0] || {
            id: 'sys_cross_case',
            filename: 'Cross-Case Link Correlation',
            sourceType: 'FIR',
            timestamp: 'System Synchronized',
            rawText: '',
            confidenceScore: 90,
            persons: [],
            phoneNumbers: [],
            bankAccounts: [],
            vehicles: [],
            locations: [],
            events: [],
            summary: 'Cross-case automated intelligence link'
          };
          addEdge(
            caseNodeA,
            caseNodeB,
            'linked case',
            88,
            dummyDoc,
            `Cross-jurisdiction overlap: Shared entity "${matchingEntity}" identified in both cases.`
          );
        }
      }
    }
  }

  // 6. Graph Degree & Topology Analysis
  const edgeList = Array.from(edgeMap.values());
  const degreeMap = new Map<string, number>();

  edgeList.forEach((e) => {
    const sId = typeof e.source === 'string' ? e.source : e.source.id;
    const tId = typeof e.target === 'string' ? e.target : e.target.id;
    degreeMap.set(sId, (degreeMap.get(sId) || 0) + 1);
    degreeMap.set(tId, (degreeMap.get(tId) || 0) + 1);
  });

  // Assign degrees to nodes
  nodeMap.forEach((node, id) => {
    node.degree = degreeMap.get(id) || 0;
  });

  // Find top connected entities (threshold for High Connectivity)
  const sortedByDegree = Array.from(nodeMap.values()).sort((a, b) => b.degree - a.degree);
  const highConnThreshold = sortedByDegree.length > 10 ? Math.max(4, sortedByDegree[Math.floor(sortedByDegree.length * 0.15)]?.degree || 4) : 3;

  sortedByDegree.forEach((node) => {
    if (node.degree >= highConnThreshold && node.entityType !== 'EVIDENCE') {
      node.isHighConnectivity = true;
    }
  });

  // 7. Cluster Detection (Connected Components / BFS)
  const visited = new Set<string>();
  let clusterIndex = 0;
  const clusterNodeMap = new Map<string, string[]>();

  // Build adjacency list
  const adj = new Map<string, string[]>();
  nodeMap.forEach((_, id) => adj.set(id, []));
  edgeList.forEach((e) => {
    const sId = typeof e.source === 'string' ? e.source : e.source.id;
    const tId = typeof e.target === 'string' ? e.target : e.target.id;
    adj.get(sId)?.push(tId);
    adj.get(tId)?.push(sId);
  });

  nodeMap.forEach((_, startId) => {
    if (!visited.has(startId)) {
      const clusterNodes: string[] = [];
      const queue: string[] = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        clusterNodes.push(curr);

        const neighbors = adj.get(curr) || [];
        neighbors.forEach((nbr) => {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        });
      }

      const clusterLetter = String.fromCharCode(65 + (clusterIndex % 26)); // 'A', 'B', 'C'
      const clusterId = `Cluster ${clusterLetter}`;
      const clusterColor = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];

      clusterNodes.forEach((nodeId) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          node.clusterId = clusterId;
          node.clusterName = `Network Cluster ${clusterLetter}`;
          node.clusterColor = clusterColor;
        }
      });

      clusterNodeMap.set(clusterId, clusterNodes);
      clusterIndex++;
    }
  });

  // 8. Bridge Detection: Detect nodes that link across distinct cases or distinct sub-networks
  const bridgeEntities: { id: string; name: string; type: GraphEntityType; clusterCount: number }[] = [];
  nodeMap.forEach((node) => {
    const neighbors = adj.get(node.id) || [];
    const connectedCases = new Set(node.caseIds);
    // If an entity connects to multiple cases or has high diversity of connected node types
    if (connectedCases.size > 1 && node.entityType !== 'CASE' && node.entityType !== 'EVIDENCE') {
      node.isBridge = true;
      bridgeEntities.push({
        id: node.id,
        name: node.displayName,
        type: node.entityType,
        clusterCount: connectedCases.size
      });
    }
  });

  // 9. Network Intelligence Statistics (100% computed from real data)
  const nodes = Array.from(nodeMap.values());
  const edges = edgeList;

  const stats: NetworkIntelligenceStats = {
    totalEntities: nodes.length,
    totalRelationships: edges.length,
    totalCases: cases.length,
    totalClusters: clusterIndex,
    highConnectivityCount: nodes.filter(n => n.isHighConnectivity).length,
    mostConnectedEntities: sortedByDegree.slice(0, 5).map(n => ({
      id: n.id,
      name: n.displayName,
      type: n.entityType,
      degree: n.degree
    })),
    strongestRelationships: [...edges]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        source: nodeMap.get(e.sourceId)?.displayName || e.sourceId,
        target: nodeMap.get(e.targetId)?.displayName || e.targetId,
        label: e.label,
        strength: e.strength
      })),
    bridgeEntities,
    crossCaseEntitiesCount: nodes.filter(n => n.caseIds.length > 1).length
  };

  return {
    nodes,
    edges,
    stats
  };
}
