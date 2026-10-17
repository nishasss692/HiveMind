import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Terminal,
  FileCode,
  Search,
  Copy,
  Check,
  Info,
  Lock
} from 'lucide-react';
import { EvaluationResponse, ProposalRecord } from '../../types/api';

interface VerificationsViewProps {
  evaluations: Record<string, EvaluationResponse>;
  proposals: ProposalRecord[];
  onOpenWorkflow: () => void;
}

export const VerificationsView: React.FC<VerificationsViewProps> = ({
  evaluations,
  proposals,
  onOpenWorkflow
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    Object.keys(evaluations).length > 0 ? Object.keys(evaluations)[0] : null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const evaluationEntries = Object.entries(evaluations).map(([propId, evalData]) => {
    const proposal = proposals.find((p) => p.proposal_id === propId);
    return {
      proposalId: propId,
      evaluation: evalData,
      proposal
    };
  });

  const filteredEntries = evaluationEntries.filter(({ proposalId, evaluation, proposal }) => {
    const testFileStr = evaluation.test_file || evaluation.selected_test_file || '';
    const propTitleStr = (proposal && (proposal.task_title || proposal.task_description)) || '';
    const matchesSearch =
      proposalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      testFileStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      propTitleStr.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'SUCCESS') return matchesSearch && evaluation.verification_status === 'VERIFIED_SUCCESS';
    if (statusFilter === 'FAILURE') return matchesSearch && evaluation.verification_status === 'VERIFIED_FAILURE';
    return matchesSearch;
  });

  const activeEntry =
    evaluationEntries.find((e) => e.proposalId === selectedProposalId) || evaluationEntries[0] || null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#EADECE] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-[#1E3A8A]">Empirical Verification Ledger</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
              {evaluationEntries.length} Audited Executions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sandbox pytest execution traces and verified test evidence. In HiveMind, evidence is strictly grounded in isolated pytest subprocess runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] font-mono">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Sandbox Enforced: tests/*.py</span>
          </div>
        </div>
      </div>

      {/* Rules Banner */}
      <div className="bg-[#1E3A8A]/5 border border-[#1E3A8A]/15 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <strong className="text-[#1E3A8A] font-semibold">Verification Integrity Guarantee:</strong> Proposals cannot be manually marked successful. Status is exclusively derived from subprocess exit code, stdout/stderr parsing, and canonical server-side records. Only passing evaluations with matching task/proposal identifiers are eligible for FalkorDB graph memory ingestion.
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search verifications by proposal ID, test fixture or task..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#EADECE] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#EADECE] rounded-lg p-1 text-xs">
          {(['ALL', 'SUCCESS', 'FAILURE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-[#1E3A8A] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {filter === 'ALL' ? 'All Results' : filter === 'SUCCESS' ? 'Successes Only' : 'Failures Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      {evaluationEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EADECE] p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Empirical Verifications Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Run a proposal evaluation in the workflow pipeline to execute isolated pytest suites and capture tamper-proof verification evidence.
          </p>
          <button
            onClick={onOpenWorkflow}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1d4ed8]"
          >
            Launch Pipeline & Evaluate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List column */}
          <div className="lg:col-span-5 space-y-3">
            {filteredEntries.map(({ proposalId, evaluation, proposal }) => {
              const isSelected = activeEntry?.proposalId === proposalId;
              const isSuccess = evaluation.verification_status === 'VERIFIED_SUCCESS';

              return (
                <div
                  key={proposalId}
                  onClick={() => setSelectedProposalId(proposalId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                      : 'bg-white border-[#EADECE] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isSuccess ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {evaluation.verification_status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Exit Code {evaluation.exit_code}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                    {proposal?.task_title || `Proposal ${proposalId.slice(0, 8)}`}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">
                      {evaluation.test_file}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">
                      {evaluation.passed_tests} / {evaluation.total_tests} passed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details / Evidence Inspector */}
          <div className="lg:col-span-7">
            {activeEntry && (
              <div className="bg-white rounded-xl border border-[#EADECE] p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {activeEntry.proposalId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(activeEntry.proposalId, 'id')}
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy Proposal ID"
                      >
                        {copiedKey === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">
                      {activeEntry.proposal?.task_title || 'Isolated Pytest Evidence Execution'}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border ${
                      activeEntry.evaluation.verification_status === 'VERIFIED_SUCCESS'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {activeEntry.evaluation.verification_status === 'VERIFIED_SUCCESS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {activeEntry.evaluation.verification_status}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Passed / Total</span>
                    <span className="text-base font-bold font-mono text-slate-800">
                      {activeEntry.evaluation.passed_tests} / {activeEntry.evaluation.total_tests}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Exit Code</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        activeEntry.evaluation.exit_code === 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {activeEntry.evaluation.exit_code}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Pass Rate</span>
                    <span className="text-base font-bold font-mono text-slate-800">
                      {activeEntry.evaluation.total_tests && activeEntry.evaluation.total_tests > 0
                        ? `${Math.round(((activeEntry.evaluation.passed_tests || 0) / activeEntry.evaluation.total_tests) * 100)}%`
                        : activeEntry.evaluation.verification_status === 'VERIFIED_SUCCESS'
                        ? '100%'
                        : '0%'}
                    </span>
                  </div>
                </div>

                {/* Test file target */}
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Grounded Test Target
                  </h4>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800">
                    <FileCode className="w-4 h-4 text-[#2563EB]" />
                    <span className="truncate">
                      {activeEntry.evaluation.test_file || activeEntry.evaluation.selected_test_file || 'tests/test_migration_fixture.py'}
                    </span>
                  </div>
                </div>

                {/* Subprocess raw terminal evidence */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Pytest Subprocess Output
                      </h4>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          activeEntry.evaluation.test_output || activeEntry.evaluation.stdout || activeEntry.evaluation.evidence || '',
                          'stdout'
                        )
                      }
                      className="text-[11px] text-[#2563EB] hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'stdout' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Output</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-[#0F172A] text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-80 border border-slate-800 leading-relaxed shadow-inner">
                    <code>
                      {activeEntry.evaluation.test_output ||
                        activeEntry.evaluation.stdout ||
                        activeEntry.evaluation.evidence ||
                        'No output recorded.'}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
