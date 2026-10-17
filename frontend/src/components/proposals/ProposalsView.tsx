import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { ProposalRecord, EvaluationResponse, PersistedProposalRecord } from '../../types/api';

interface ProposalsViewProps {
  proposals: ProposalRecord[];
  evaluations: Record<string, EvaluationResponse>;
  persistedRecords: Record<string, PersistedProposalRecord>;
  onSelectProposalForModal?: (proposal: ProposalRecord) => void;
  onOpenWorkflow: () => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  evaluations,
  persistedRecords,
  onSelectProposalForModal,
  onOpenWorkflow
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROPOSED' | 'EVALUATED' | 'PERSISTED'>('ALL');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    proposals.length > 0 ? proposals[0].proposal_id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedProposal = proposals.find((p) => p.proposal_id === selectedProposalId) || proposals[0] || null;
  const selectedEval = selectedProposal ? evaluations[selectedProposal.proposal_id] : null;
  const selectedPersisted = selectedProposal ? persistedRecords[selectedProposal.proposal_id] : null;

  const filteredProposals = proposals.filter((p) => {
    const title = p.task_title || p.task_description;
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.proposal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.proposed_fix.toLowerCase().includes(searchTerm.toLowerCase());

    const isPersisted = !!persistedRecords[p.proposal_id];
    const isEvaluated = !!evaluations[p.proposal_id] && !isPersisted;
    const isProposed = !evaluations[p.proposal_id] && !isPersisted;

    if (statusFilter === 'PERSISTED') return matchesSearch && isPersisted;
    if (statusFilter === 'EVALUATED') return matchesSearch && isEvaluated;
    if (statusFilter === 'PROPOSED') return matchesSearch && isProposed;
    return matchesSearch;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-[#EADECE] p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-semibold text-[#1E3A8A]">Canonical Proposal Ledger</h2>
            <span className="text-xs bg-[#2563EB]/10 text-[#2563EB] px-2.5 py-0.5 rounded-full font-medium">
              {proposals.length} Managed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse server-canonical proposal records, inspect code patches, and audit sandbox test verifications.
          </p>
        </div>

        <button
          onClick={onOpenWorkflow}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Proposal Pipeline</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search proposals by task title, ID, category or patch..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#EADECE] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#EADECE] rounded-lg p-1 text-xs">
          {(['ALL', 'PROPOSED', 'EVALUATED', 'PERSISTED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-[#1E3A8A] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: List + Detail */}
      {proposals.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EADECE] p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-[#2563EB]">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Proposals Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create your first proposal using the interactive pipeline to generate solutions, run sandbox tests, and persist lessons into FalkorDB.
          </p>
          <button
            onClick={onOpenWorkflow}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1d4ed8]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch Proposal Pipeline
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List column */}
          <div className="lg:col-span-5 space-y-3">
            {filteredProposals.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EADECE] p-6 text-center text-xs text-slate-500">
                No proposals match the current filter or query.
              </div>
            ) : (
              filteredProposals.map((prop) => {
                const evalData = evaluations[prop.proposal_id];
                const persistedData = persistedRecords[prop.proposal_id];
                const isSelected = selectedProposal?.proposal_id === prop.proposal_id;

                let statusBadge = (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-2.5 h-2.5" /> UNVERIFIED
                  </span>
                );

                if (persistedData) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      <Database className="w-2.5 h-2.5" /> PERSISTED
                    </span>
                  );
                } else if (evalData?.verification_status === 'VERIFIED_SUCCESS') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" /> SUCCESS
                    </span>
                  );
                } else if (evalData?.verification_status === 'VERIFIED_FAILURE') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-2.5 h-2.5" /> FAILED
                    </span>
                  );
                }

                return (
                  <div
                    key={prop.proposal_id}
                    onClick={() => setSelectedProposalId(prop.proposal_id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/50 border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                        : 'bg-white border-[#EADECE] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {prop.proposal_id.slice(0, 8)}...
                      </span>
                      {statusBadge}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                      {prop.task_title || prop.task_description.slice(0, 50)}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span className="truncate max-w-[160px] font-mono text-[10px] text-slate-400">
                        {prop.category || 'general'}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Details column */}
          <div className="lg:col-span-7">
            {selectedProposal ? (
              <div className="bg-white rounded-xl border border-[#EADECE] p-6 shadow-xs space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {selectedProposal.proposal_id}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedProposal.proposal_id, 'id')}
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy Proposal ID"
                      >
                        {copiedId === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">
                      {selectedProposal.task_title || selectedProposal.task_description.slice(0, 50)}
                    </h3>
                  </div>

                  {selectedPersisted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      <Database className="w-3.5 h-3.5" /> PERSISTED
                    </span>
                  ) : selectedEval ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-mono px-3 py-1 rounded-full border ${
                        selectedEval.verification_status === 'VERIFIED_SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {selectedEval.verification_status === 'VERIFIED_SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {selectedEval.verification_status}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-mono px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" /> UNVERIFIED
                    </span>
                  )}
                </div>

                {/* Canonical task description */}
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Canonical Task Description
                  </h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedProposal.task_description}
                  </div>
                </div>

                {/* Proposed fix */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Canonical Proposed Fix
                    </h4>
                    <button
                      onClick={() => copyToClipboard(selectedProposal.proposed_fix, 'fix')}
                      className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1"
                    >
                      {copiedId === 'fix' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Fix</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48 border border-slate-800">
                    <code>{selectedProposal.proposed_fix}</code>
                  </pre>
                </div>

                {/* Test Evaluation Audit */}
                {selectedEval && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                        <h4 className="text-xs font-semibold text-slate-900">Sandbox Test Evidence</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Exit Code: {selectedEval.exit_code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-mono">Test File</span>
                        <span className="font-mono text-[11px] text-slate-800 truncate block">
                          {selectedEval.test_file}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-mono">Pass / Total</span>
                        <span className="font-mono text-[11px] text-slate-800">
                          {selectedEval.passed_tests} / {selectedEval.total_tests} passed
                        </span>
                      </div>
                    </div>

                    {selectedEval.test_output && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono mb-1">Stdout / Stderr:</span>
                        <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded max-h-32 overflow-y-auto">
                          {selectedEval.test_output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Persisted FalkorDB Record */}
                {selectedPersisted && (
                  <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-semibold text-emerald-900">Persisted FalkorDB Lesson</h4>
                    </div>
                    <p className="text-xs text-emerald-950 font-serif italic bg-white/70 p-2.5 rounded border border-emerald-100">
                      "{selectedPersisted.lesson_learned}"
                    </p>
                    <div className="text-[10px] font-mono text-emerald-800">
                      Problem ID: {selectedPersisted.problem_id} • Outcome: {selectedPersisted.outcome_id}
                    </div>
                  </div>
                )}

                {/* Action CTA */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      if (onSelectProposalForModal) {
                        onSelectProposalForModal(selectedProposal);
                      }
                      onOpenWorkflow();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E3A8A] text-white text-xs font-medium rounded-lg hover:bg-[#172554] transition-colors"
                  >
                    <span>Inspect in Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
