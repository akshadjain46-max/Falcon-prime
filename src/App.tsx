import React, { useState } from 'react';
import {
  NavigationTab,
  UserProfile,
  CaseItem,
  DataSourceNode,
  MapLocationNode,
  ProcessingQueueItem,
  SubscriptionItem,
  CorrelationInsight,
} from './types';
import { INITIAL_USER, INITIAL_SUBSCRIPTIONS } from './data/mockData';
import {
  ExtractedDocumentData,
  correlateAnalyzedDocuments,
  getDefaultEmptyDataSources,
  parseDocumentContent,
  SAMPLE_INVESTIGATION_DOCUMENTS,
} from './utils/documentAnalyzer';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { DataCollection } from './components/DataCollection';
import { CityMapInvestigation } from './components/CityMapInvestigation';
import { CaseManager } from './components/CaseManager';
import { SubscriptionsDashboard } from './components/SubscriptionsDashboard';
import { PatternDetection } from './components/PatternDetection';
import { ReportsView } from './components/ReportsView';
import { LocationDetailsModal } from './components/LocationDetailsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USER);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>('data-collection');

  // Dynamic Document & Intelligence State (Initialized purely from zero - driven exclusively by analyzed documents)
  const [documents, setDocuments] = useState<ExtractedDocumentData[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceNode[]>(getDefaultEmptyDataSources());
  const [locations, setLocations] = useState<MapLocationNode[]>([]);
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(INITIAL_SUBSCRIPTIONS);
  const [insights, setInsights] = useState<CorrelationInsight[]>([]);

  // Modals & Inspector
  const [selectedLocation, setSelectedLocation] = useState<MapLocationNode | null>(null);
  const [notificationCount, setNotificationCount] = useState<number>(0);

  // Ingestion handler: accepts an analyzed document and recalibrates the entire intelligence graph
  const handleIngestDocument = (doc: ExtractedDocumentData) => {
    const updatedDocs = [doc, ...documents.filter((d) => d.id !== doc.id)];
    setDocuments(updatedDocs);

    const correlated = correlateAnalyzedDocuments(updatedDocs);
    setCases(correlated.cases);
    setLocations(correlated.locations);
    setInsights(correlated.insights);
    setDataSources(correlated.dataSources);

    // Add to processing queue
    const queueItem: ProcessingQueueItem = {
      id: `queue_${doc.id}`,
      filename: doc.filename,
      type: doc.sourceType,
      status: 'Complete',
      progress: 100,
      counts: {
        persons: doc.persons.length,
        locations: doc.locations.length,
        calls: doc.phoneNumbers.length,
        accounts: doc.bankAccounts.length,
      },
      badgeColor: '#3b82f6',
      timestamp: doc.timestamp,
    };
    setProcessingQueue((prev) => [queueItem, ...prev.filter((q) => q.id !== queueItem.id)]);
    setNotificationCount((prev) => prev + 1);
  };

  // Ingest multiple documents in batch
  const handleIngestMultipleDocuments = (newDocs: ExtractedDocumentData[]) => {
    const existingIds = new Set(newDocs.map((d) => d.id));
    const updatedDocs = [...newDocs, ...documents.filter((d) => !existingIds.has(d.id))];
    setDocuments(updatedDocs);

    const correlated = correlateAnalyzedDocuments(updatedDocs);
    setCases(correlated.cases);
    setLocations(correlated.locations);
    setInsights(correlated.insights);
    setDataSources(correlated.dataSources);

    const newQueueItems: ProcessingQueueItem[] = newDocs.map((doc) => ({
      id: `queue_${doc.id}`,
      filename: doc.filename,
      type: doc.sourceType,
      status: 'Complete',
      progress: 100,
      counts: {
        persons: doc.persons.length,
        locations: doc.locations.length,
        calls: doc.phoneNumbers.length,
        accounts: doc.bankAccounts.length,
      },
      badgeColor: '#3b82f6',
      timestamp: doc.timestamp,
    }));

    setProcessingQueue((prev) => [...newQueueItems, ...prev]);
    setNotificationCount((prev) => prev + newDocs.length);
  };

  // Clear all data back to clean state
  const handleClearAllData = () => {
    setDocuments([]);
    setCases([]);
    setLocations([]);
    setInsights([]);
    setDataSources(getDefaultEmptyDataSources());
    setProcessingQueue([]);
    setNotificationCount(0);
  };

  // Quick action: load sample multi-source investigation files
  const handleLoadSampleDataset = () => {
    const parsedSamples = SAMPLE_INVESTIGATION_DOCUMENTS.map((s) =>
      parseDocumentContent(s.filename, s.content, s.type)
    );
    handleIngestMultipleDocuments(parsedSamples);
  };

  const handleAddCase = (newCase: CaseItem) => {
    setCases((prev) => [newCase, ...prev]);
    setNotificationCount((prev) => prev + 1);
  };

  const handleUpdateSubscription = (id: string, newStatus: 'ACTIVE' | 'RENEWING_SOON' | 'STANDBY') => {
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: newStatus } : sub))
    );
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const lower = query.toLowerCase();

    // Check if query matches a case
    const matchedCase = cases.find(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.caseNumber.toLowerCase().includes(lower) ||
        c.linkedSuspects.some((s) => s.toLowerCase().includes(lower))
    );

    if (matchedCase) {
      setActiveTab('case-manager');
      return;
    }

    // Check if query matches location
    const matchedLocation = locations.find(
      (l) =>
        l.name.toLowerCase().includes(lower) ||
        l.details.address.toLowerCase().includes(lower) ||
        (l.details.targetSuspect && l.details.targetSuspect.toLowerCase().includes(lower))
    );

    if (matchedLocation) {
      setSelectedLocation(matchedLocation);
      setActiveTab('relationship-mapping');
      return;
    }

    // Default to city investigation core
    setActiveTab('relationship-mapping');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex font-sans">
      {/* Login Screen / Modal */}
      <LoginModal
        isOpen={!isLoggedIn}
        onLogin={(profile) => {
          setCurrentUser(profile);
          setIsLoggedIn(true);
        }}
        defaultUser={INITIAL_USER}
      />

      {/* Left Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        caseCount={cases.length}
      />

      {/* Main Content Area */}
      <div className="pl-72 flex-1 flex flex-col min-h-screen">
        {/* Top Fixed Header */}
        <Header
          user={currentUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onSearch={handleSearch}
          onLogout={() => setIsLoggedIn(false)}
          notificationCount={notificationCount}
        />

        {/* Dynamic Screen View */}
        <main className="pt-16 flex-1 bg-[#050505] overflow-y-auto">
          {activeTab === 'data-collection' && (
            <DataCollection
              documents={documents}
              cases={cases}
              queue={processingQueue}
              onIngestDocument={handleIngestDocument}
              onIngestMultipleDocuments={handleIngestMultipleDocuments}
              onClearAllData={handleClearAllData}
              onLoadSampleDataset={handleLoadSampleDataset}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'relationship-mapping' && (
            <CityMapInvestigation
              cases={cases}
              dataSources={dataSources}
              locations={locations}
              onSelectLocation={setSelectedLocation}
              insights={insights}
            />
          )}

          {activeTab === 'case-manager' && (
            <CaseManager
              cases={cases}
              onAddCase={handleAddCase}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'pattern-detection' && (
            <PatternDetection
              insights={insights}
              cases={cases}
              documents={documents}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsDashboard
              user={currentUser}
              subscriptions={subscriptions}
              onUpdateSubscription={handleUpdateSubscription}
              documentCount={documents.length}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              cases={cases}
              documents={documents}
              insights={insights}
            />
          )}
        </main>
      </div>

      {/* Deep-Dive Location Inspector Modal */}
      <LocationDetailsModal
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </div>
  );
}
