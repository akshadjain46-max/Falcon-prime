import { CaseItem, CorrelationInsight, DataSourceNode, DataSourceType, ExtractedDocumentData, MapLocationNode, ProcessingQueueItem } from '../types';

export type { ExtractedDocumentData };

// Helper to determine source type from filename or content
export function detectSourceType(filename: string, content: string): DataSourceType {
  const lowerName = filename.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerName.includes('fir') || lowerName.includes('police') || lowerContent.includes('first information report') || lowerContent.includes('incident report') || lowerContent.includes('witness statement')) {
    return 'FIR';
  }
  if (lowerName.includes('cdr') || lowerName.includes('call') || lowerName.includes('telecom') || lowerName.includes('tower') || lowerContent.includes('call detail') || lowerContent.includes('imei') || lowerContent.includes('imsi') || lowerContent.includes('duration_sec')) {
    return 'CDR';
  }
  if (lowerName.includes('bank') || lowerName.includes('swift') || lowerName.includes('wire') || lowerName.includes('crypto') || lowerName.includes('financial') || lowerContent.includes('swift wire') || lowerContent.includes('crypto wallet') || lowerContent.includes('transaction id')) {
    return 'FINANCIAL';
  }
  if (lowerName.includes('cctv') || lowerName.includes('alpr') || lowerName.includes('camera') || lowerName.includes('surveillance') || lowerContent.includes('plate recognition') || lowerContent.includes('facial match') || lowerContent.includes('cam #') || lowerContent.includes('frame_timestamp')) {
    return 'CCTV';
  }
  if (lowerName.includes('social') || lowerName.includes('telegram') || lowerName.includes('twitter') || lowerName.includes('darknet') || lowerContent.includes('geo-tagged') || lowerContent.includes('@') || lowerContent.includes('chat log') || lowerContent.includes('channel broadcast')) {
    return 'SOCIAL';
  }
  if (lowerName.includes('criminal') || lowerName.includes('ncic') || lowerName.includes('interpol') || lowerName.includes('warrant') || lowerContent.includes('prior conviction') || lowerContent.includes('red notice') || lowerContent.includes('federal warrant')) {
    return 'CRIMINAL';
  }

  // Fallback heuristic based on content density
  if (lowerContent.includes('phone') || lowerContent.includes('call')) return 'CDR';
  if (lowerContent.includes('usd') || lowerContent.includes('$') || lowerContent.includes('account')) return 'FINANCIAL';
  return 'FIR';
}

// Local regex-based entity extractor
export function parseDocumentContent(filename: string, content: string, explicitType?: DataSourceType): ExtractedDocumentData {
  const sourceType = explicitType || detectSourceType(filename, content);

  // 1. Phone numbers & IMEIs
  const phoneMatches = content.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  const imeiMatches = content.match(/\b(?:\d{15}|\d{2}-\d{6}-\d{6}-\d)\b/g) || [];
  const uniquePhones = Array.from(new Set([...phoneMatches, ...imeiMatches])).map(p => p.trim());

  // 2. Vehicle license plates
  const plateMatches = content.match(/(?:\[Plate:?\s*([A-Z0-9]{4,8})\]|Plate[:\s#]+([A-Z0-9]{4,8})|ALPR[:\s#]+\[?([A-Z0-9]{4,8})\]?|\b[0-9][A-Z]{3}[0-9]{2}\b|\b[A-Z]{3}-[0-9]{3,4}\b)/gi) || [];
  const uniquePlates: { plate: string; model?: string; color?: string }[] = [];
  const plateSet = new Set<string>();

  for (const raw of plateMatches) {
    const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const plateOnly = clean.replace(/^(PLATE|ALPR)/, '');
    if (plateOnly.length >= 4 && plateOnly.length <= 8 && !plateSet.has(plateOnly)) {
      plateSet.add(plateOnly);
      // Check surrounding vehicle model
      let model = 'Unspecified Vehicle';
      let color = 'Unknown';
      if (/black/i.test(content)) color = 'Black';
      if (/dark gray|grey/i.test(content)) color = 'Dark Gray';
      if (/white/i.test(content)) color = 'White';
      if (/suv/i.test(content)) model = 'Armored SUV';
      else if (/sedan|audi/i.test(content)) model = 'Sedan';
      else if (/truck|semi/i.test(content)) model = 'Commercial Truck';

      uniquePlates.push({ plate: plateOnly, model, color });
    }
  }

  // 3. Bank Accounts / Crypto Wallets
  const cryptoMatches = content.match(/0x[a-fA-F0-9]{6,40}/g) || [];
  const bankMatches = content.match(/(?:Account|Acct|Wire|SAR|SWIFT|IBAN|NeoBank)[:\s#]+([A-Za-z0-9\-_]{4,18})/gi) || [];
  const uniqueAccounts: string[] = [];
  const acctSet = new Set<string>();

  for (const b of bankMatches) {
    const trimmed = b.trim();
    if (!acctSet.has(trimmed)) {
      acctSet.add(trimmed);
      uniqueAccounts.push(trimmed);
    }
  }
  for (const c of cryptoMatches) {
    const short = `${c.slice(0, 8)}...${c.slice(-4)}`;
    if (!acctSet.has(short)) {
      acctSet.add(short);
      uniqueAccounts.push(short);
    }
  }

  // 4. Persons & Suspects
  const personList: { name: string; role?: string; aliases?: string[] }[] = [];
  const personSet = new Set<string>();

  // Look for explicit suspect or witness lines
  const suspectMatches = content.match(/(?:Suspect|Target|Witness|Operative|Alias|Accountant|Investigator|Subject|Name)[:\s]+([A-Z][a-z]+(?:\s+"[^"]+")?\s+[A-Z][a-z]+)/g) || [];
  for (const s of suspectMatches) {
    const parts = s.split(/[:\s]+/);
    const nameOnly = s.replace(/^(Suspect|Target|Witness|Operative|Alias|Accountant|Investigator|Subject|Name)[:\s]+/i, '').trim();
    if (nameOnly && nameOnly.length > 3 && !personSet.has(nameOnly.toLowerCase())) {
      personSet.add(nameOnly.toLowerCase());
      let role = 'Person of Interest';
      if (/suspect|target/i.test(s)) role = 'Primary Suspect';
      else if (/witness/i.test(s)) role = 'Key Witness';
      else if (/accountant/i.test(s)) role = 'Financial Controller';
      personList.push({ name: nameOnly, role });
    }
  }

  // Common forensic entity regex matching capitalized names if none found
  if (personList.length === 0) {
    const genericNames = content.match(/(?:[A-Z][a-z]+\s+(?:"[A-Za-z0-9]+" )?[A-Z][a-z]+)/g) || [];
    for (const g of genericNames) {
      if (['First Information', 'Police Department', 'Central Plaza', 'Harbor Bay', 'Federal Bureau', 'Wall Street', 'United States'].includes(g)) continue;
      if (!personSet.has(g.toLowerCase()) && personList.length < 5) {
        personSet.add(g.toLowerCase());
        personList.push({ name: g, role: 'Identified Entity' });
      }
    }
  }

  // 5. Locations & Coordinates
  const locationList: { name: string; address?: string; x: number; y: number; threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[] = [];
  const locKeywords = ['Pier', 'Harbor', 'Street', 'Avenue', 'Tower', 'Plaza', 'Safehouse', 'Airport', 'Terminal', 'Corridor', 'Depot', 'Hangar', 'Berth', 'Precinct'];
  const locMatches = content.match(/(?:Location|Address|Place|At|Venue|Site)[:\s]+([^.,\n]+)/gi) || [];

  const locSet = new Set<string>();
  for (const m of locMatches) {
    const locName = m.replace(/^(Location|Address|Place|At|Venue|Site)[:\s]+/i, '').trim();
    if (locName.length > 3 && !locSet.has(locName.toLowerCase())) {
      locSet.add(locName.toLowerCase());
      // Pseudo-random coordinates positioned within canvas grid based on hash
      const hash = locName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const x = 18 + (hash % 64);
      const y = 20 + ((hash * 7) % 60);
      locationList.push({
        name: locName,
        address: `${locName}, Sector ${1 + (hash % 9)}`,
        x,
        y,
        threatLevel: hash % 3 === 0 ? 'CRITICAL' : hash % 2 === 0 ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // If no explicit location matched, check for keywords
  if (locationList.length === 0) {
    for (const kw of locKeywords) {
      const regex = new RegExp(`\\b([A-Za-z0-9\\s]{3,20}\\s+${kw}[A-Za-z0-9\\s]{0,10})\\b`, 'i');
      const match = content.match(regex);
      if (match && match[1]) {
        const found = match[1].trim();
        if (!locSet.has(found.toLowerCase()) && locationList.length < 4) {
          locSet.add(found.toLowerCase());
          const hash = found.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          locationList.push({
            name: found,
            address: `${found}, District ${(hash % 5) + 1}`,
            x: 20 + (hash % 60),
            y: 22 + ((hash * 3) % 56),
            threatLevel: 'HIGH'
          });
        }
      }
    }
  }

  // 6. Chronological Events & Timestamps
  const timeMatches = content.match(/(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?|\d{4}-\d{2}-\d{2})/g) || [];
  const eventsList: { time: string; description: string; location?: string }[] = [];
  const lines = content.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const hasTime = trimmed.match(/\b(?:\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{4}-\d{2}-\d{2})\b/i);
    if (hasTime && eventsList.length < 8) {
      eventsList.push({
        time: hasTime[0],
        description: trimmed.slice(0, 120),
        location: locationList[0]?.name || 'Grid Sector'
      });
    }
  });

  if (eventsList.length === 0 && timeMatches.length > 0) {
    eventsList.push({
      time: timeMatches[0],
      description: content.slice(0, 90).replace(/\n/g, ' ') + '...',
      location: locationList[0]?.name || 'Local Sector'
    });
  }

  // 7. Extract Emails
  const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const uniqueEmails = Array.from(new Set(emailMatches.map(e => e.toLowerCase())));

  // 8. Extract Organizations
  const orgMatches = content.match(/(?:[A-Z][A-Za-z0-9&.\s]{2,25}(?:Holdings|Corp|Corporation|Inc|LLC|Bank|Logistics|Dept|Department|Agency|Syndicate|Bureau))\b/g) || [];
  const uniqueOrgs = Array.from(new Set(orgMatches.map(o => o.trim()))).slice(0, 6);

  // Document Summary
  const summaryLine = lines.find(l => l.length > 25 && !l.startsWith('#')) || content.slice(0, 150);
  const summary = summaryLine.trim();

  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    filename,
    sourceType,
    rawText: content,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fileSize: `${(content.length / 1024).toFixed(1)} KB`,
    persons: personList,
    phoneNumbers: uniquePhones,
    bankAccounts: uniqueAccounts,
    vehicles: uniquePlates,
    locations: locationList,
    events: eventsList,
    emails: uniqueEmails,
    organizations: uniqueOrgs,
    summary,
    confidenceScore: Math.min(99, Math.max(78, 80 + personList.length * 3 + uniquePhones.length * 2))
  };
}

// Correlate multiple analyzed documents to dynamically generate Cases, Map Locations, and Correlation Insights
export function correlateAnalyzedDocuments(docs: ExtractedDocumentData[]): {
  cases: CaseItem[];
  locations: MapLocationNode[];
  insights: CorrelationInsight[];
  dataSources: DataSourceNode[];
} {
  if (docs.length === 0) {
    return {
      cases: [],
      locations: [],
      insights: [],
      dataSources: getDefaultEmptyDataSources()
    };
  }

  // 1. Compile all entities across documents
  const allPersons: Record<string, { count: number; docs: string[]; roles: string[] }> = {};
  const allPhones: Record<string, { count: number; docs: string[] }> = {};
  const allAccounts: Record<string, { count: number; docs: string[] }> = {};
  const allPlates: Record<string, { count: number; docs: string[]; details: any }> = {};
  const allLocations: Record<string, { count: number; docs: string[]; locData: any }> = {};

  docs.forEach((doc) => {
    doc.persons.forEach(p => {
      const key = p.name.trim();
      if (!allPersons[key]) allPersons[key] = { count: 0, docs: [], roles: [] };
      allPersons[key].count++;
      if (!allPersons[key].docs.includes(doc.filename)) allPersons[key].docs.push(doc.filename);
      if (p.role && !allPersons[key].roles.includes(p.role)) allPersons[key].roles.push(p.role);
    });

    doc.phoneNumbers.forEach(ph => {
      const key = ph.trim();
      if (!allPhones[key]) allPhones[key] = { count: 0, docs: [] };
      allPhones[key].count++;
      if (!allPhones[key].docs.includes(doc.filename)) allPhones[key].docs.push(doc.filename);
    });

    doc.bankAccounts.forEach(ba => {
      const key = ba.trim();
      if (!allAccounts[key]) allAccounts[key] = { count: 0, docs: [] };
      allAccounts[key].count++;
      if (!allAccounts[key].docs.includes(doc.filename)) allAccounts[key].docs.push(doc.filename);
    });

    doc.vehicles.forEach(v => {
      const key = v.plate.trim();
      if (!allPlates[key]) allPlates[key] = { count: 0, docs: [], details: v };
      allPlates[key].count++;
      if (!allPlates[key].docs.includes(doc.filename)) allPlates[key].docs.push(doc.filename);
    });

    doc.locations.forEach(loc => {
      const key = loc.name.trim();
      if (!allLocations[key]) allLocations[key] = { count: 0, docs: [], locData: loc };
      allLocations[key].count++;
      if (!allLocations[key].docs.includes(doc.filename)) allLocations[key].docs.push(doc.filename);
    });
  });

  // 2. Generate Cases from Document Clusters
  // Group documents by common suspects or cluster them into logical cases
  const cases: CaseItem[] = [];

  // If few documents, each document or related pair forms a case
  docs.forEach((doc, idx) => {
    const caseNum = `CR-${new Date().getFullYear()}-${1000 + (idx + 1) * 117}`;
    const suspects = doc.persons.map(p => p.name);
    const phones = doc.phoneNumbers;
    const accounts = doc.bankAccounts;
    const vehicles = doc.vehicles.map(v => `${v.color || ''} ${v.model || 'Vehicle'} [Plate: ${v.plate}]`.trim());
    const primaryLoc = doc.locations[0]?.name || 'Metro Central Sector';
    const locCoord = doc.locations[0] || { x: 30 + (idx * 15) % 50, y: 25 + (idx * 20) % 50 };

    cases.push({
      id: `case_${doc.id}`,
      caseNumber: caseNum,
      title: `${doc.sourceType} Dossier: ${doc.filename.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ')}`,
      status: idx === 0 ? 'CRITICAL' : 'ACTIVE',
      dateOpened: new Date().toISOString().split('T')[0],
      leadInvestigator: 'Active Investigator',
      summary: doc.summary || `Forensic evidence extract compiled from ${doc.filename}. Analyzed ${suspects.length} suspects, ${phones.length} telecom nodes, and ${vehicles.length} vehicles.`,
      location: primaryLoc,
      coordinates: {
        x: locCoord.x,
        y: locCoord.y,
        lat: 40.7128 + (locCoord.x - 50) * 0.002,
        lng: -74.0060 + (locCoord.y - 50) * 0.002
      },
      linkedSuspects: suspects.length > 0 ? suspects : ['Unidentified Subject'],
      linkedPhoneNumbers: phones,
      linkedBankAccounts: accounts,
      linkedVehicles: vehicles,
      evidenceCount: doc.events.length + doc.persons.length + doc.phoneNumbers.length,
      linkedCaseIds: [], // Will link below
      confidenceScore: doc.confidenceScore
    });
  });

  // Link cases that share any common entities
  for (let i = 0; i < cases.length; i++) {
    for (let j = i + 1; j < cases.length; j++) {
      const caseA = cases[i];
      const caseB = cases[j];
      const shareSuspect = caseA.linkedSuspects.some(s => s !== 'Unidentified Subject' && caseB.linkedSuspects.includes(s));
      const sharePhone = caseA.linkedPhoneNumbers.some(p => caseB.linkedPhoneNumbers.includes(p));
      const shareAcct = caseA.linkedBankAccounts.some(a => caseB.linkedBankAccounts.includes(a));

      if (shareSuspect || sharePhone || shareAcct || docs.length <= 2) {
        if (!caseA.linkedCaseIds.includes(caseB.id)) caseA.linkedCaseIds.push(caseB.id);
        if (!caseB.linkedCaseIds.includes(caseA.id)) caseB.linkedCaseIds.push(caseA.id);
      }
    }
  }

  // 3. Generate Map Locations
  const locations: MapLocationNode[] = [];
  const locEntries = Object.entries(allLocations);

  if (locEntries.length > 0) {
    locEntries.forEach(([locName, locObj], idx) => {
      const locData = locObj.locData;
      const associatedCases = cases.filter(c => c.location.toLowerCase().includes(locName.toLowerCase())).map(c => c.id);
      const associatedSources = Array.from(new Set(
        docs.filter(d => d.locations.some(l => l.name === locName)).map(d => d.sourceType)
      ));

      locations.push({
        id: `loc_${idx}_${locName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: locName,
        district: `Sector ${(idx % 6) + 1}`,
        type: locName.toLowerCase().includes('harbor') || locName.toLowerCase().includes('port')
          ? 'PORT_CONTAINER'
          : locName.toLowerCase().includes('bank') || locName.toLowerCase().includes('tower')
          ? 'FINANCIAL_NODE'
          : locName.toLowerCase().includes('safehouse')
          ? 'SAFEHOUSE'
          : locName.toLowerCase().includes('tower') || locName.toLowerCase().includes('base')
          ? 'CELL_TOWER'
          : 'CCTV_HUB',
        coords: { x: locData.x || 30 + (idx * 16) % 55, y: locData.y || 25 + (idx * 18) % 55 },
        status: locObj.count > 1 ? 'HIGH_ALERT' : 'SURVEILLANCE_ACTIVE',
        threatLevel: locData.threatLevel || (locObj.count > 1 ? 'CRITICAL' : 'HIGH'),
        associatedCaseIds: associatedCases.length > 0 ? associatedCases : [cases[0]?.id || 'case_default'],
        associatedSources: associatedSources.length > 0 ? associatedSources : ['FIR'],
        details: {
          address: locData.address || `${locName}, District ${(idx % 5) + 1}`,
          lastPing: 'Live Telemetry',
          targetSuspect: Object.keys(allPersons)[0] || undefined,
          cctvLive: true,
          cctvFeedUrl: `CAM_FEED_${locName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`,
          telemetry: `Location cited in ${locObj.count} input document(s): ${locObj.docs.join(', ')}.`
        }
      });
    });
  } else {
    // If no explicit locations in documents, create a node representing the central incident
    locations.push({
      id: 'loc_doc_central',
      name: 'Primary Ingest Incident Node',
      district: 'District 1 - Cyber Grid',
      type: 'POLICE_PRECINCT',
      coords: { x: 50, y: 50 },
      status: 'SURVEILLANCE_ACTIVE',
      threatLevel: 'MEDIUM',
      associatedCaseIds: cases.map(c => c.id),
      associatedSources: Array.from(new Set(docs.map(d => d.sourceType))),
      details: {
        address: 'Forensic Analysis Center',
        lastPing: 'Active Now',
        cctvLive: true,
        telemetry: `Synthesizing ${docs.length} analyzed documents.`
      }
    });
  }

  // 4. Generate Correlation Insights
  const insights: CorrelationInsight[] = [];

  // Check for shared suspects across different documents
  Object.entries(allPersons).forEach(([personName, data]) => {
    if (data.docs.length > 1) {
      insights.push({
        id: `ins_person_${personName.replace(/[^a-zA-Z0-9]/g, '')}`,
        title: `Cross-Document Identity Match: ${personName}`,
        severity: 'CRITICAL',
        timestamp: 'Just now',
        description: `Subject "${personName}" appears across ${data.docs.length} separate documents (${data.docs.join(', ')}). Linked to roles: ${data.roles.join(', ') || 'Suspect'}.`,
        sourceTypes: Array.from(new Set(docs.filter(d => data.docs.includes(d.filename)).map(d => d.sourceType))),
        caseIds: cases.filter(c => c.linkedSuspects.includes(personName)).map(c => c.id),
        entities: [personName, ...data.roles]
      });
    }
  });

  // Check for shared phones
  Object.entries(allPhones).forEach(([phone, data]) => {
    if (data.docs.length > 1) {
      insights.push({
        id: `ins_phone_${phone.replace(/[^a-zA-Z0-9]/g, '')}`,
        title: `Telecom Convergence: ${phone}`,
        severity: 'WARNING',
        timestamp: 'Just now',
        description: `Phone/IMEI ${phone} flagged simultaneously in ${data.docs.join(' & ')}. Indicates coordinated communication relay.`,
        sourceTypes: Array.from(new Set(docs.filter(d => data.docs.includes(d.filename)).map(d => d.sourceType))),
        caseIds: cases.filter(c => c.linkedPhoneNumbers.includes(phone)).map(c => c.id),
        entities: [phone, 'Telecom Receptor']
      });
    }
  });

  // Check for shared license plates
  Object.entries(allPlates).forEach(([plate, data]) => {
    if (data.docs.length > 1) {
      insights.push({
        id: `ins_plate_${plate}`,
        title: `Vehicle License Corroboration: [Plate ${plate}]`,
        severity: 'CRITICAL',
        timestamp: 'Just now',
        description: `Vehicle [Plate ${plate}] (${data.details.color || ''} ${data.details.model || 'Vehicle'}) sighted across multiple files: ${data.docs.join(', ')}.`,
        sourceTypes: Array.from(new Set(docs.filter(d => data.docs.includes(d.filename)).map(d => d.sourceType))),
        caseIds: cases.filter(c => c.linkedVehicles.some(v => v.includes(plate))).map(c => c.id),
        entities: [`Plate ${plate}`, data.details.model || 'Vehicle']
      });
    }
  });

  // If no cross-document links yet, generate single-document forensic summaries
  if (insights.length === 0) {
    docs.slice(0, 3).forEach((d, idx) => {
      insights.push({
        id: `ins_single_${d.id}`,
        title: `${d.sourceType} Evidence Ingest: ${d.filename}`,
        severity: idx === 0 ? 'WARNING' : 'INFO',
        timestamp: d.timestamp,
        description: d.summary || `Extracted ${d.persons.length} suspects, ${d.phoneNumbers.length} telecom identifiers, and ${d.bankAccounts.length} financial markers from ${d.filename}.`,
        sourceTypes: [d.sourceType],
        caseIds: [cases[idx]?.id || 'case_0'],
        entities: d.persons.map(p => p.name).slice(0, 3)
      });
    });
  }

  // 5. Compute Data Sources Nodes from Analyzed Documents
  const sourceTypes: DataSourceType[] = ['FIR', 'CDR', 'FINANCIAL', 'CCTV', 'SOCIAL', 'CRIMINAL'];
  const dataSources: DataSourceNode[] = sourceTypes.map((st) => {
    const matchingDocs = docs.filter(d => d.sourceType === st);
    const count = matchingDocs.length;
    const events = matchingDocs.flatMap(d => d.events.map(e => `${d.filename}: ${e.time} - ${e.description}`)).slice(0, 3);

    return {
      id: st,
      title: getSourceTitle(st),
      shortName: getSourceShortName(st),
      description: getSourceDescription(st),
      color: getSourceColor(st),
      glowColor: `${getSourceColor(st)}66`,
      bgHex: `${getSourceColor(st)}1f`,
      icon: getSourceIcon(st),
      packetRate: count > 0 ? Math.min(45, 10 + count * 6) : 0,
      totalRecords: count > 0 ? `${count} File${count > 1 ? 's' : ''} Ingested` : '0 Files (Standby)',
      status: count > 0 ? 'STREAMING' : 'ONLINE',
      sampleEvents: events.length > 0 ? events : [`Awaiting ${st} document upload to stream forensic telemetry.`],
      activePings: count * 12
    };
  });

  return {
    cases,
    locations,
    insights,
    dataSources
  };
}

// Default empty sources when 0 documents exist
export function getDefaultEmptyDataSources(): DataSourceNode[] {
  const sourceTypes: DataSourceType[] = ['FIR', 'CDR', 'FINANCIAL', 'CCTV', 'SOCIAL', 'CRIMINAL'];
  return sourceTypes.map((st) => ({
    id: st,
    title: getSourceTitle(st),
    shortName: getSourceShortName(st),
    description: getSourceDescription(st),
    color: getSourceColor(st),
    glowColor: `${getSourceColor(st)}66`,
    bgHex: `${getSourceColor(st)}1f`,
    icon: getSourceIcon(st),
    packetRate: 0,
    totalRecords: '0 Files Ingested',
    status: 'ONLINE',
    sampleEvents: [`Awaiting ${st} input documents to extract entities and map telemetry.`],
    activePings: 0
  }));
}

function getSourceTitle(type: DataSourceType): string {
  switch (type) {
    case 'FIR': return 'Police Reports & FIRs';
    case 'CDR': return 'CDR & Telecom Telemetry';
    case 'FINANCIAL': return 'Financial Forensics';
    case 'CCTV': return 'CCTV & ALPR Matrix';
    case 'SOCIAL': return 'Social Intelligence';
    case 'CRIMINAL': return 'Criminal History & NCIC';
  }
}

function getSourceShortName(type: DataSourceType): string {
  switch (type) {
    case 'FIR': return 'FIRs';
    case 'CDR': return 'CDRs';
    case 'FINANCIAL': return 'Financial';
    case 'CCTV': return 'CCTV Feeds';
    case 'SOCIAL': return 'Social Media';
    case 'CRIMINAL': return 'Criminal History';
  }
}

function getSourceDescription(type: DataSourceType): string {
  switch (type) {
    case 'FIR': return 'First Information Reports, incident logs, witness statements & OCR extracts.';
    case 'CDR': return 'Call Detail Records, IMEI pings, SMS logs & tower handoffs.';
    case 'FINANCIAL': return 'SWIFT wire transfers, shell company bank accounts & crypto wallets.';
    case 'CCTV': return 'Surveillance camera captures, automated license plate readers (ALPR).';
    case 'SOCIAL': return 'Geo-tagged posts, dark web forums, alias chatter & encrypted handles.';
    case 'CRIMINAL': return 'NCIC priors, Interpol red notices, syndicate hierarchies & warrants.';
  }
}

function getSourceColor(type: DataSourceType): string {
  switch (type) {
    case 'FIR': return '#4edea3';
    case 'CDR': return '#ffb95f';
    case 'FINANCIAL': return '#ffb4ab';
    case 'CCTV': return '#adc6ff';
    case 'SOCIAL': return '#a78bfa';
    case 'CRIMINAL': return '#f43f5e';
  }
}

function getSourceIcon(type: DataSourceType): string {
  switch (type) {
    case 'FIR': return 'description';
    case 'CDR': return 'cell_tower';
    case 'FINANCIAL': return 'account_balance';
    case 'CCTV': return 'videocam';
    case 'SOCIAL': return 'public';
    case 'CRIMINAL': return 'database';
  }
}

// Sample Investigation Datasets for instant testing
export const SAMPLE_INVESTIGATION_DOCUMENTS: { filename: string; type: DataSourceType; content: string }[] = [
  {
    filename: 'FIR_2026_09_Harbor_Depot_Robbery.txt',
    type: 'FIR',
    content: `FIRST INFORMATION REPORT (FIR) - METRO POLICE DEPT
Case Incident Number: FIR-2026-8849
Date: 2026-09-02 | Time: 02:15 AM
Location: Harbor Logistics Pier 4, Industrial Waterfront
Reporting Officer: Sgt. D. Kowalski

INCIDENT DETAILS:
Security personnel reported an armed breach of Cargo Container #NY-4481.
The container housed high-precision military night-vision transceivers.
Eye-witness statement identifies lead suspect known as Viktor "Ghost" Vance fleeing the scene.
A second operative identified as Marcus "Apex" Chen was observed coordinating perimeter security.
Suspects escaped in a Black Armored SUV displaying License Plate [7XYZ89] heading towards the Expressway.
Burner phone found dropped at site: +1-917-555-0192.
`
  },
  {
    filename: 'CDR_Suspect_Burner_Tower_Pings.csv',
    type: 'CDR',
    content: `TIMESTAMP,CALLER_NUMBER,RECEIVER_NUMBER,DURATION_SEC,IMEI,BASE_TOWER_ID,SIGNAL_STRENGTH
2026-09-02 01:45:10,+1-917-555-0192,+1-212-555-0814,142,867912401884210,Industrial Tower #14,-68dBm
2026-09-02 02:22:15,+1-917-555-0192,+1-646-555-4421,45,867912401884210,Harbor Pier 4 Relay,-72dBm
2026-09-02 03:15:40,+1-212-555-0814,+1-347-555-9011,88,867912401884210,Industrial Tower #14,-64dBm
2026-09-02 04:02:11,+1-646-555-4421,+1-917-555-0192,210,867912401884210,West Safehouse Substation,-59dBm
`
  },
  {
    filename: 'FINANCIAL_SWIFT_NeoBank_Wire_Audit.json',
    type: 'FINANCIAL',
    content: `{
  "audit_source": "FinCEN Suspicious Activity Report #SAR-4921",
  "account_origin": "NeoBank Wire #4921",
  "authorized_ip": "198.51.100.44",
  "location": "Financial District Tower 9, 32nd Floor",
  "beneficiary": "Apex Holdings Caymans #9921",
  "amount_usd": "$1,450,000",
  "target_suspect": "Elena Rostova",
  "crypto_mixer_hop": "0x7a99f4421b88e102",
  "crypto_volume": "42.8 ETH",
  "notes": "Wire authorization matched phone number +1-646-555-4421 and funds dispersed towards utility bills at Safehouse Alpha (404 Ridgeview Rd)."
}`
  },
  {
    filename: 'CCTV_ALPR_Midtown_Surveillance_Log.log',
    type: 'CCTV',
    content: `SURVEILLANCE ALPR LOG - METRO TRAFFIC SENSOR MATRIX
[2026-09-02 02:38:12] ALPR Cam #104 (Expressway Exit North): Detected Plate [7XYZ89] - Black Armored SUV - Speed 58mph
[2026-09-02 03:42:05] CCTV Cam #22 (Central Plaza Crossing): Facial Vector Match 96.4% on Subject Viktor "Ghost" Vance
[2026-09-02 03:44:19] CCTV Cam #22 (Central Plaza Crossing): Passenger Facial Match 94.8% on Subject Marcus "Apex" Chen
[2026-09-02 04:15:30] Drone Recon Alpha IR: Heat signature detected at Safehouse Alpha (404 Ridgeview Rd)
`
  }
];
