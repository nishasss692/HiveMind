import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavRoute } from './components/layout/Sidebar';
import { AppHeader } from './components/layout/AppHeader';
import { FooterBar } from './components/layout/FooterBar';
import { CommandPaletteModal } from './components/layout/CommandPaletteModal';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { MemoryGraph3D } from './components/graph/MemoryGraph3D';
import { NodeInspectionPanel } from './components/graph/NodeInspectionPanel';
import { RecentActivityFeed } from './components/activity/RecentActivityFeed';
import { ProposalsView } from './components/proposals/ProposalsView';
import { VerificationsView } from './components/verification/VerificationsView';
import { LearningRunWorkspace } from './components/workbench/LearningRunWorkspace';
import { EvidenceTrustInspector } from './components/workbench/EvidenceTrustInspector';
import { FailureIntelligenceView } from './components/workbench/FailureIntelligenceView';
import { LearningTransferDemo } from './components/workbench/LearningTransferDemo';
import { ProposalWorkflowModal } from './components/proposals/ProposalWorkflowModal';
import { ProposalService } from './services/proposals';
import { GraphAdapter } from './services/graphAdapter';
import type {
  ProposalResponse,
  ProposalEvaluateResponse,
  ProposalPersistResponse,
  GraphNode,
  GraphEdge,
  ActivityItem,
  HealthResponse
} from './types/api';

export const App: React.FC = () => {
  // Navigation Route State
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('graph');

  // Sidebar States: Desktop Collapsed Rail vs Mobile Drawer Overlay
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Backend Health & Connectivity
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState<boolean>(true);

  // Modals
  const [isWorkflowOpen, setIsWorkflowOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Core Ledger State
  const [proposals, setProposals] = useState<ProposalResponse[]>(() => {
    try {
      const saved = localStorage.getItem('hivemind_proposals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [evaluations, setEvaluations] = useState<Record<string, ProposalEvaluateResponse>>(() => {
    try {
      const saved = localStorage.getItem('hivemind_evaluations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [persistedRecords, setPersistedRecords] = useState<Record<string, ProposalPersistResponse>>(() => {
    try {
      const saved = localStorage.getItem('hivemind_persisted');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Graph Data
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isDemoData, setIsDemoData] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('hivemind_proposals', JSON.stringify(proposals));
    } catch (e) {
      console.warn('Failed to save proposals to localStorage', e);
    }
  }, [proposals]);

  useEffect(() => {
    try {
      localStorage.setItem('hivemind_evaluations', JSON.stringify(evaluations));
    } catch (e) {
      console.warn('Failed to save evaluations to localStorage', e);
    }
  }, [evaluations]);

  useEffect(() => {
    try {
      localStorage.setItem('hivemind_persisted', JSON.stringify(persistedRecords));
    } catch (e) {
      console.warn('Failed to save persistedRecords to localStorage', e);
    }
  }, [persistedRecords]);

  // Lock mobile body scroll when drawer is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  // Check Backend Health
  const checkHealth = useCallback(async () => {
    try {
      const h = await ProposalService.checkHealth();
      setHealth(h);
    } catch {
      setHealth({
        status: 'degraded',
        service: 'HiveMind API',
        database_connected: false,
        version: '1.0.0',
      });
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Keyboard shortcut for command palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync Graph Topology
  useEffect(() => {
    const { nodes, edges, isDemoData: isDemo } = GraphAdapter.buildGraphData(
      proposals,
      evaluations,
      persistedRecords
    );
    setGraphNodes(nodes);
    setGraphEdges(edges);
    setIsDemoData(isDemo);

    if (!selectedNode && nodes.length > 0) {
      setSelectedNode(nodes.find((n: GraphNode) => n.id === 'L-88') || nodes[0]);
    } else if (selectedNode) {
      const updated = nodes.find((n: GraphNode) => n.id === selectedNode.id);
      if (updated) setSelectedNode(updated);
    }
  }, [proposals, evaluations, persistedRecords]);

  // Toggle Sidebar with Three.js canvas auto-resize trigger
  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
    // Fire resize event so Three.js camera aspect ratio recalculates smoothly
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);
  };

  // Derived Activity Feed
  const activities: ActivityItem[] = [
    // Live proposal ingests
    ...proposals.map((prop) => {
      const ev = evaluations[prop.proposal_id];
      const ps = persistedRecords[prop.proposal_id];
      const status = ev ? ev.verification_status : 'UNVERIFIED';

      let pytestSummary = 'Awaiting execution';
      if (ev) {
        pytestSummary = `${ev.passed_tests || (ev.verification_status === 'VERIFIED_SUCCESS' ? 1 : 0)} Passed`;
      }

      return {
        id: prop.proposal_id,
        taskId: prop.task_id,
        proposalId: prop.proposal_id,
        title: prop.task_title || prop.task_description.slice(0, 50),
        description: prop.diagnosis || prop.task_description,
        status,
        timestamp: prop.created_at || 'Just now',
        edgesCount: ps ? 3 : ev ? 2 : 1,
        pytestSummary,
        testFile: ev?.selected_test_file || ev?.test_file,
      };
    }),
    // Reference historical activities if live list is small
    ...(proposals.length < 3
      ? [
          {
            id: 'ingest-88',
            taskId: 'task-88-pg',
            proposalId: 'prop-88',
            title: 'PostgreSQL Migration Non-Blocking Concurrent Index Build',
            description: 'Executed CREATE INDEX CONCURRENTLY outside transaction blocks to prevent AccessExclusiveLock deadlocks.',
            status: 'VERIFIED_SUCCESS' as const,
            timestamp: '14 min ago',
            edgesCount: 4,
            pytestSummary: '14 Passed (0 Flaky)',
            testFile: 'tests/test_migration_fixture.py',
            similarity: 0.94,
          },
          {
            id: 'ingest-104',
            taskId: 'task-104-redis',
            proposalId: 'prop-104',
            title: 'Redis Cluster Sentinel Failover Topology Patch',
            description: 'Adjusted sentinel down-after-milliseconds to prevent split-brain quorums.',
            status: 'VERIFIED_SUCCESS' as const,
            timestamp: '42 min ago',
            edgesCount: 3,
            pytestSummary: '18 Passed',
            testFile: 'tests/test_runner_smoke.py',
            similarity: 0.92,
          },
          {
            id: 'ingest-92',
            taskId: 'task-92-fail',
            proposalId: 'prop-92',
            title: 'Blocking Index Exclusive Lock Timeout Failure',
            description: 'Standard CREATE INDEX during peak write volume produced timeout error 54000.',
            status: 'VERIFIED_FAILURE' as const,
            timestamp: '1 hour ago',
            edgesCount: 2,
            pytestSummary: 'Exit Code 1 (Expected)',
            testFile: 'tests/test_migration_failure_fixture.py',
            similarity: 0.85,
          },
        ]
      : []),
  ];

  // Lifecycle Handlers
  const handleProposalCreated = (proposal: ProposalResponse) => {
    setProposals((prev) => {
      const exists = prev.some((p) => p.proposal_id === proposal.proposal_id);
      if (exists) return prev;
      return [
        {
          ...proposal,
          task_title: proposal.task_description.slice(0, 60),
          created_at: 'Just now',
        },
        ...prev,
      ];
    });
  };

  const handleProposalEvaluated = (
    evalRes: ProposalEvaluateResponse,
    proposal: ProposalResponse
  ) => {
    setEvaluations((prev) => ({
      ...prev,
      [proposal.proposal_id]: {
        ...evalRes,
        test_file: evalRes.selected_test_file || evalRes.test_file,
        passed_tests: evalRes.verification_status === 'VERIFIED_SUCCESS' ? 1 : 0,
        total_tests: 1,
        test_output: evalRes.stdout || evalRes.evidence,
      },
    }));
  };

  const handleProposalPersisted = (
    persistRes: ProposalPersistResponse,
    proposal: ProposalResponse
  ) => {
    setPersistedRecords((prev) => ({
      ...prev,
      [proposal.proposal_id]: persistRes,
    }));
  };

  const handleSelectActivity = (activity: ActivityItem) => {
    const matchedNode = graphNodes.find(
      (n: GraphNode) =>
        n.proposalId === activity.proposalId ||
        n.id.toLowerCase().includes(activity.id.toLowerCase())
    );
    if (matchedNode) {
      setSelectedNode(matchedNode);
      setCurrentRoute('graph');
    } else {
      setCurrentRoute('proposals');
    }
  };

  // Metrics counts
  const verifiedSuccessCount = Object.values(evaluations).filter(
    (e) => e.verification_status === 'VERIFIED_SUCCESS'
  ).length;
  const verifiedFailureCount = Object.values(evaluations).filter(
    (e) => e.verification_status === 'VERIFIED_FAILURE'
  ).length;
  const unverifiedCount = proposals.filter(
    (p) => !evaluations[p.proposal_id]
  ).length;
  const lessonsPersistedCount = Object.keys(persistedRecords).length;

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-800 flex font-sans selection:bg-[#2563EB]/15 selection:text-[#1E3A8A]">
      {/* 1. Collapsible Blue Sidebar Navigation */}
      <Sidebar
        currentRoute={currentRoute}
        onSelectRoute={setCurrentRoute}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        health={health}
        counts={{
          proposals: proposals.length,
          failures: 3, // Indexed failures
          verifications: Object.keys(evaluations).length,
        }}
      />

      {/* 2. Main Right Application Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Compact App Header with Animated 3-Bar Hamburger */}
        <AppHeader
          currentRoute={currentRoute}
          isSidebarOpen={isSidebarCollapsed ? false : true}
          onToggleSidebar={handleToggleSidebar}
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
          onOpenNewRun={() => setIsWorkflowOpen(true)}
        />

        {/* Content Viewport */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Real-time Summary Cards on Graph and Overview routes */}
          {(currentRoute === 'graph' || currentRoute === 'overview') && (
            <SummaryCards
              proposalsCount={proposals.length}
              verifiedSuccessCount={verifiedSuccessCount}
              verifiedFailureCount={verifiedFailureCount}
              unverifiedCount={unverifiedCount}
              lessonsPersistedCount={lessonsPersistedCount}
              databaseConnected={health?.database_connected ?? false}
            />
          )}

          {/* Route: 3D Memory Graph Explorer */}
          {currentRoute === 'graph' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left/Center 3D Viewport Column */}
              <div className="lg:col-span-8 space-y-5">
                <MemoryGraph3D
                  nodes={graphNodes}
                  edges={graphEdges}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                  isDemoData={isDemoData}
                />

                <NodeInspectionPanel
                  node={selectedNode}
                  onOpenWorkflow={() => setIsWorkflowOpen(true)}
                />
              </div>

              {/* Right Activity Stream Column */}
              <div className="lg:col-span-4">
                <RecentActivityFeed
                  activities={activities}
                  onSelectActivity={handleSelectActivity}
                  onRefresh={checkHealth}
                  isLoading={isHealthLoading}
                  onViewAll={() => setCurrentRoute('proposals')}
                />
              </div>
            </div>
          )}

          {/* Route: Workbench Overview */}
          {currentRoute === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 space-y-5">
                <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Welcome to HiveMind Agent Memory Workbench
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    HiveMind is an evidence-backed collective intelligence substrate for autonomous software engineering agents. Rather than treating bug fixes as ephemeral completions, HiveMind executes isolated test suites and compiles empirical lessons into FalkorDB graph memory.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setCurrentRoute('timeline')}
                      className="px-4 py-2 bg-[#1E3A8A] text-white text-xs font-medium rounded-xl hover:bg-[#2563EB] transition-colors"
                    >
                      Open Learning Run Workspace
                    </button>
                    <button
                      onClick={() => setCurrentRoute('transfer')}
                      className="px-4 py-2 bg-blue-50 text-[#1E3A8A] border border-[#2563EB]/20 text-xs font-medium rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      View Memory Reuse Lab
                    </button>
                  </div>
                </div>

                <NodeInspectionPanel
                  node={selectedNode}
                  onOpenWorkflow={() => setIsWorkflowOpen(true)}
                />
              </div>

              <div className="lg:col-span-4">
                <RecentActivityFeed
                  activities={activities}
                  onSelectActivity={handleSelectActivity}
                  onRefresh={checkHealth}
                  isLoading={isHealthLoading}
                  onViewAll={() => setCurrentRoute('proposals')}
                />
              </div>
            </div>
          )}

          {/* Route: Learning Run Workspace (Agent Reasoning Timeline) */}
          {currentRoute === 'timeline' && (
            <LearningRunWorkspace
              onProposalCreated={handleProposalCreated}
              onProposalEvaluated={handleProposalEvaluated}
              onProposalPersisted={handleProposalPersisted}
            />
          )}

          {/* Route: Evidence & Trust Provenance Inspector */}
          {currentRoute === 'trust' && (
            <EvidenceTrustInspector
              proposals={proposals}
              evaluations={evaluations}
              persistedRecords={persistedRecords}
              onTriggerRun={() => setCurrentRoute('timeline')}
            />
          )}

          {/* Route: Failure Intelligence & Anti-Patterns */}
          {currentRoute === 'failures' && (
            <FailureIntelligenceView
              onSelectNodeInGraph={(nodeId) => {
                const target = graphNodes.find((n) => n.id.toLowerCase() === nodeId.toLowerCase());
                if (target) setSelectedNode(target);
                setCurrentRoute('graph');
              }}
              onOpenLearningRun={() => setCurrentRoute('timeline')}
            />
          )}

          {/* Route: Memory Reuse Lab (Transfer Demo) */}
          {currentRoute === 'transfer' && <LearningTransferDemo />}

          {/* Route: Canonical Proposals Ledger */}
          {currentRoute === 'proposals' && (
            <ProposalsView
              proposals={proposals}
              evaluations={evaluations}
              persistedRecords={persistedRecords}
              onOpenWorkflow={() => setIsWorkflowOpen(true)}
            />
          )}

          {/* Route: Empirical Verifications Ledger */}
          {currentRoute === 'verifications' && (
            <VerificationsView
              evaluations={evaluations}
              proposals={proposals}
              onOpenWorkflow={() => setIsWorkflowOpen(true)}
            />
          )}
        </main>

        {/* Footer Bar */}
        <FooterBar health={health} />
      </div>

      {/* Interactive 5-Stage Proposal Lifecycle Workflow Modal */}
      <ProposalWorkflowModal
        isOpen={isWorkflowOpen}
        onClose={() => setIsWorkflowOpen(false)}
        onProposalCreated={handleProposalCreated}
        onProposalEvaluated={handleProposalEvaluated}
        onProposalPersisted={handleProposalPersisted}
      />

      {/* Quick Search & Command Palette Modal (⌘K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        nodes={graphNodes}
        onSelectNode={(node: GraphNode) => {
          setSelectedNode(node);
          setCurrentRoute('graph');
        }}
        activities={activities}
        onSelectActivity={handleSelectActivity}
        onOpenNewProposal={() => setIsWorkflowOpen(true)}
      />
    </div>
  );
};
