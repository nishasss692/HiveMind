import type { GraphData, GraphNode, GraphEdge } from '../types/api';

/**
 * Initial demonstration nodes reflecting the visual reference (code.html).
 * These represent multi-domain collective memory nodes in FalkorDB.
 */
const DEMO_NODES: GraphNode[] = [
  {
    id: 'L-88',
    label: 'Lesson L-88',
    title: 'Non-blocking concurrent index build',
    type: 'Lesson',
    status: 'VERIFIED_SUCCESS',
    cluster: 'PostgreSQL Deadlocks (L-88)',
    category: 'database_migration',
    similarity: 0.94,
    testsSummary: '14 Passed (0 Flaky)',
    latency: '142ms',
    cypherQuery: `MATCH (l:Lesson)-[r:SUPPORTED_BY]->(o:Outcome)\nWHERE o.status = 'VERIFIED_SUCCESS' AND l.id = 'L-88'\nRETURN l, r, o LIMIT 1;`,
    reasoning:
      'During heavy concurrent write transactions, PostgreSQL deadlocks occurred on idx_transactions_timestamp. The autonomous solver verified that executing non-blocking CREATE INDEX CONCURRENTLY in isolated autocommit contexts prevents lock cascading.',
    proposedFix:
      'Execute CREATE INDEX CONCURRENTLY outside of standard wrapping transaction blocks to avoid table-level AccessExclusiveLocks.',
    testFile: 'tests/test_migration_fixture.py',
    evidence:
      'Test command: python -m pytest tests/test_migration_fixture.py -q\nTests executed: True\nExit code: 0\nVerification status: VERIFIED_SUCCESS\n1 passed in 0.23s',
    position: [0, 2, 0],
  },
  {
    id: 'O-88',
    label: 'Outcome O-88',
    title: 'Concurrent index deadlock test passed',
    type: 'Outcome',
    status: 'VERIFIED_SUCCESS',
    cluster: 'PostgreSQL Deadlocks (L-88)',
    category: 'database_migration',
    similarity: 0.91,
    testsSummary: '1 Passed',
    latency: '230ms',
    cypherQuery: `MATCH (o:Outcome {id: 'O-88'}) RETURN o;`,
    reasoning: 'Pytest confirmed that index creation executed without deadlock while background workers read and wrote.',
    proposedFix: 'CREATE INDEX CONCURRENTLY',
    testFile: 'tests/test_migration_fixture.py',
    evidence: 'Exit code: 0; tests_executed: True',
    position: [12, 4, 8],
  },
  {
    id: 'P-101',
    label: 'Problem P-101',
    title: 'Deadlock during active orders table migration',
    type: 'Problem',
    status: 'VERIFIED_SUCCESS',
    cluster: 'PostgreSQL Deadlocks (L-88)',
    category: 'database_migration',
    similarity: 0.88,
    position: [-10, -3, 12],
  },
  {
    id: 'L-104',
    label: 'Lesson L-104',
    title: 'Redis Cluster Sentinel Failover Topology Patch',
    type: 'Lesson',
    status: 'VERIFIED_SUCCESS',
    cluster: 'Transaction Rollbacks',
    category: 'caching',
    similarity: 0.92,
    testsSummary: '18 Passed',
    latency: '88ms',
    cypherQuery: `MATCH (l:Lesson {id: 'L-104'})-[:APPLIES_TO]->(p:Problem) RETURN l, p;`,
    reasoning: 'Mitigated 3-second split-brain quorum timeouts during master nodes reboot sequence by adjusting min-replicas-to-write.',
    proposedFix: 'Configure sentinel down-after-milliseconds to 2000ms with failover-timeout 60000ms.',
    testFile: 'tests/test_runner_smoke.py',
    evidence: 'Exit code: 0; 18 passed in 0.8s',
    position: [14, 8, -10],
  },
  {
    id: 'T-105',
    label: 'Task T-105',
    title: 'Kafka Partitioner Rebalance on High Consumer Skew',
    type: 'Task',
    status: 'UNVERIFIED',
    cluster: 'Transaction Rollbacks',
    category: 'streaming',
    similarity: 0.88,
    testsSummary: 'Sandboxed Pytest Running',
    reasoning: 'Dynamic partition rebalancing patch proposal generated via Gemini causal trace.',
    proposedFix: 'Implement custom StickyAssignor with rack-aware partition assignment.',
    testFile: 'tests/test_migration_fixture.py',
    evidence: 'Status: UNVERIFIED (Awaiting test execution confirmation)',
    position: [-14, 10, -8],
  },
  {
    id: 'L-106',
    label: 'Lesson L-106',
    title: 'FastAPI Async Threadpool Worker Pool Starvation',
    type: 'Lesson',
    status: 'VERIFIED_SUCCESS',
    cluster: 'Pytest Fixtures',
    category: 'concurrency',
    similarity: 0.95,
    testsSummary: '32 Passed',
    latency: '110ms',
    cypherQuery: `MATCH (l:Lesson {id: 'L-106'}) RETURN l;`,
    reasoning: 'Offloaded sync database I/O to bounded AnyIO worker threads to prevent event loop stalls.',
    proposedFix: 'Wrap blocking database driver queries with anyio.to_thread.run_sync.',
    testFile: 'backend/tests/test_api.py',
    evidence: 'Exit code: 0; 32 passed in 1.4s',
    position: [8, -12, 14],
  },
  {
    id: 'F-92',
    label: 'Failure F-92',
    title: 'Exclusive table lock timeout during standard index build',
    type: 'Failure',
    status: 'VERIFIED_FAILURE',
    cluster: 'PostgreSQL Deadlocks (L-88)',
    category: 'database_migration',
    similarity: 0.85,
    testsSummary: 'Exit Code 1 (Expected)',
    reasoning: 'Standard CREATE INDEX attempted during peak write throughput caused 54000 lock_not_available failure.',
    proposedFix: 'Do not use standard CREATE INDEX on hot production tables.',
    testFile: 'tests/test_migration_failure_fixture.py',
    evidence: 'Test command: python -m pytest tests/test_migration_failure_fixture.py -q\nExit code: 1\nVerification status: VERIFIED_FAILURE',
    position: [-8, -8, -14],
  },
];

const DEMO_EDGES: GraphEdge[] = [
  { source: 'L-88', target: 'P-101', label: 'APPLIES_TO', type: 'APPLIES_TO' },
  { source: 'L-88', target: 'O-88', label: 'SUPPORTED_BY', type: 'SUPPORTED_BY' },
  { source: 'F-92', target: 'P-101', label: 'PRODUCED_FAILURE', type: 'PRODUCED_FAILURE' },
  { source: 'L-104', target: 'P-101', label: 'APPLIES_TO', type: 'APPLIES_TO' },
  { source: 'L-106', target: 'O-88', label: 'SUPPORTED_BY', type: 'SUPPORTED_BY' },
  { source: 'T-105', target: 'L-88', label: 'INFLUENCED_BY' },
];

export const GraphAdapter = {
  /**
   * Fetches graph topology from backend if available, or returns prototype demo data with honest flagging.
   */
  async getGraphData(): Promise<GraphData> {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/graph/nodes', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          return {
            nodes: data.nodes,
            edges: data.edges || [],
            isDemoData: false,
          };
        }
      }
    } catch {
      // Backend does not expose raw graph endpoint yet
    }

    return {
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      isDemoData: true,
    };
  },

  /**
   * Synthesize graph topology combining static demonstration nodes and live user-created proposals.
   */
  buildGraphData(
    proposals: import('../types/api').ProposalResponse[] = [],
    evaluations: Record<string, import('../types/api').ProposalEvaluateResponse> = {},
    persistedRecords: Record<string, import('../types/api').ProposalPersistResponse> = {}
  ): { nodes: GraphNode[]; edges: GraphEdge[]; isDemoData: boolean } {
    const nodes: GraphNode[] = [...DEMO_NODES];
    const edges: GraphEdge[] = [...DEMO_EDGES];

    proposals.forEach((prop, idx) => {
      const evalData = evaluations[prop.proposal_id];
      const persistData = persistedRecords[prop.proposal_id];
      const theta = (idx / Math.max(proposals.length, 1)) * Math.PI * 2;
      const radius = 18;

      let status: import('../types/api').VerificationStatus = 'UNVERIFIED';
      if (evalData) {
        status = evalData.verification_status;
      }

      const propNodeId = `P-${prop.proposal_id.slice(0, 6)}`;
      const nodeType: GraphNode['type'] = persistData ? 'Lesson' : status === 'VERIFIED_FAILURE' ? 'Failure' : 'Task';

      nodes.push({
        id: propNodeId,
        label: `${nodeType} ${prop.proposal_id.slice(0, 6)}`,
        title: prop.task_title || prop.task_description.slice(0, 40),
        type: nodeType,
        status,
        cluster: prop.category || 'General',
        category: prop.category || 'general',
        proposalId: prop.proposal_id,
        reasoning: prop.reasoning,
        proposedFix: prop.proposed_fix,
        testFile: evalData?.selected_test_file || evalData?.test_file,
        evidence: evalData?.evidence || (evalData?.stdout ? `Exit code: ${evalData.exit_code}\n${evalData.stdout}` : undefined),
        cypherQuery: persistData ? `MATCH (l:Lesson {id: '${persistData.lesson_id || propNodeId}'}) RETURN l;` : undefined,
        position: [
          Math.cos(theta) * radius,
          ((idx % 3) - 1) * 6,
          Math.sin(theta) * radius,
        ],
      });

      // Connect to central memory L-88 or related demo node
      edges.push({
        source: propNodeId,
        target: 'L-88',
        label: persistData ? 'PERSISTED_TO' : 'INFLUENCED_BY',
        type: 'APPLIES_TO',
      });
    });

    return {
      nodes,
      edges,
      isDemoData: proposals.length === 0,
    };
  },
};

export const graphAdapter = GraphAdapter;
