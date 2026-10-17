export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE';

export interface HealthResponse {
  status: 'healthy' | 'degraded' | string;
  service: string;
  database_connected: boolean;
  version: string;
}

export type SystemHealth = HealthResponse;

export interface ProposalCreateRequest {
  task_description: string;
  category?: string | null;
  limit?: number;
}

export interface SolverMemoryItem {
  lesson_id?: string;
  lesson?: string;
  lesson_content?: string;
  content?: string;
  problem_id?: string;
  problem_title?: string;
  title?: string;
  category?: string;
  outcome_id?: string;
  outcome_status?: string;
  similarity_score?: number;
  [key: string]: unknown;
}

export interface ProposalResponse {
  task_id: string;
  proposal_id: string;
  status: VerificationStatus | string;
  verification_status: VerificationStatus | string;
  task_description: string;
  task_title?: string;
  category?: string;
  created_at?: string;
  diagnosis: string;
  proposed_fix: string;
  reasoning: string;
  tests_to_run: string[];
  memory_ids_used: string[];
  retrieved_memories_count: number;
  risks: string[];
  memories: SolverMemoryItem[];
}

export type ProposalRecord = ProposalResponse;

export interface ProposalEvaluateRequest {
  task_id: string;
  task_description: string;
  proposed_fix: string;
  test_file: string;
  is_relevant?: boolean;
  test_description?: string;
}

export interface ProposalEvaluateResponse {
  task_id: string;
  proposal_id: string;
  verification_status: VerificationStatus;
  tests_executed: boolean;
  exit_code: number | null;
  evidence: string;
  selected_test_file: string;
  stdout: string;
  stderr: string;
  test_file?: string;
  test_output?: string;
  passed_tests?: number;
  total_tests?: number;
}

export type EvaluationResponse = ProposalEvaluateResponse;

export interface ProposalPersistRequest {
  task_id: string;
  task_description: string;
  problem_title: string;
  category: string;
  lesson_content?: string | null;
  proposed_fix?: string | null;
}

export interface ProposalPersistResponse {
  task_id: string;
  proposal_id: string;
  verification_status: VerificationStatus;
  lesson_saved: boolean;
  lesson_id: string | null;
  outcome_id: string;
  verification_evidence?: string | null;
  lesson_learned?: string;
  problem_id?: string;
}

export type PersistedProposalRecord = ProposalPersistResponse;

export interface GraphNode {
  id: string;
  label: string;
  title: string;
  type: 'Lesson' | 'Outcome' | 'Problem' | 'Task' | 'Attempt' | 'Failure';
  status: VerificationStatus | 'NEUTRAL';
  cluster: string;
  category?: string;
  proposalId?: string;
  similarity?: number;
  evidence?: string;
  cypherQuery?: string;
  reasoning?: string;
  proposedFix?: string;
  testFile?: string;
  testsSummary?: string;
  latency?: string;
  position?: [number, number, number];
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  type?: 'APPLIES_TO' | 'SUPPORTED_BY' | 'PRODUCED_OUTCOME' | 'PRODUCED_FAILURE' | 'INFLUENCED_BY';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isDemoData: boolean;
}

export interface ActivityItem {
  id: string;
  taskId: string;
  proposalId?: string;
  title: string;
  description: string;
  status: VerificationStatus;
  timestamp: string;
  edgesCount: number;
  pytestSummary: string;
  testFile?: string;
  similarity?: number;
  lifecycleStatus?: 'PROPOSED' | 'EVALUATED' | 'PERSISTED';
  createdAt?: string;
  verificationStatus?: VerificationStatus;
  hasPersistedLesson?: boolean;
  passedCount?: number;
  totalCount?: number;
}
