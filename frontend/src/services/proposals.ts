import { request } from './api';
import type {
  HealthResponse,
  ProposalCreateRequest,
  ProposalResponse,
  ProposalEvaluateRequest,
  ProposalEvaluateResponse,
  ProposalPersistRequest,
  ProposalPersistResponse,
} from '../types/api';

export const ProposalService = {
  /** Check backend and FalkorDB readiness */
  async checkHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  /** Submit a task description to generate an evidence-backed solution proposal */
  async createProposal(data: ProposalCreateRequest): Promise<ProposalResponse> {
    return request<ProposalResponse>('/proposals', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: 60000, // LLM proposals may take several seconds
    });
  },

  /** Evaluate a proposal with an explicit test file under tests/ */
  async evaluateProposal(
    proposalId: string,
    data: ProposalEvaluateRequest
  ): Promise<ProposalEvaluateResponse> {
    return request<ProposalEvaluateResponse>(`/proposals/${encodeURIComponent(proposalId)}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: 45000,
    });
  },

  /** Persist verified outcome and reusable lesson to FalkorDB graph memory */
  async persistProposal(
    proposalId: string,
    data: ProposalPersistRequest
  ): Promise<ProposalPersistResponse> {
    return request<ProposalPersistResponse>(`/proposals/${encodeURIComponent(proposalId)}/persist`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Retrieve canonical cached proposal details */
  async getProposal(proposalId: string): Promise<ProposalResponse> {
    return request<ProposalResponse>(`/proposals/${encodeURIComponent(proposalId)}`);
  },

  /** Retrieve cached evaluation record */
  async getEvaluation(proposalId: string): Promise<ProposalEvaluateResponse> {
    return request<ProposalEvaluateResponse>(`/proposals/${encodeURIComponent(proposalId)}/evaluation`);
  },

  /** Retrieve cached persistence record */
  async getPersisted(proposalId: string): Promise<ProposalPersistResponse> {
    return request<ProposalPersistResponse>(`/proposals/${encodeURIComponent(proposalId)}/persisted`);
  },
};

export const proposalsApi = ProposalService;
