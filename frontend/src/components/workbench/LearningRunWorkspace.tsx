import React, { useState } from 'react';
import {
  GitCommit,
  CheckCircle2,
  XCircle,
  Database,
  ShieldCheck,
  FileCode,
  Terminal,
  Cpu,
  Sparkles,
  Lock,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { ProposalService } from '../../services/proposals';
import type {
  ProposalResponse,
  ProposalEvaluateResponse,
  ProposalPersistResponse,
  SolverMemoryItem
} from '../../types/api';

interface StageState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'unavailable';
  summary?: string;
  timestamp?: string;
}

interface LearningRunWorkspaceProps {
  onProposalCreated?: (p: ProposalResponse) => void;
  onProposalEvaluated?: (e: ProposalEvaluateResponse, p: ProposalResponse) => void;
  onProposalPersisted?: (res: ProposalPersistResponse, p: ProposalResponse) => void;
}

export const LearningRunWorkspace: React.FC<LearningRunWorkspaceProps> = ({
  onProposalCreated,
  onProposalEvaluated,
  onProposalPersisted,
}) => {
  // Input parameters
  const [taskInput, setTaskInput] = useState(
    'Database transaction deadlock when creating index on active orders table during migration'
  );
  const [category, setCategory] = useState('database_migration');
  const [selectedTest, setSelectedTest] = useState('tests/test_migration_fixture.py');
  const [lessonNote, setLessonNote] = useState(
    'Always execute CREATE INDEX CONCURRENTLY on active production tables outside explicit transaction blocks to prevent table locks.'
  );

  // Active selected stage for deep inspection
  const [inspectStage, setInspectStage] = useState<number>(1);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live execution payload records
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [evaluation, setEvaluation] = useState<ProposalEvaluateResponse | null>(null);
  const [persisted, setPersisted] = useState<ProposalPersistResponse | null>(null);

  // Stage statuses
  const [stages, setStages] = useState<{ [key: number]: StageState }>({
    1: { status: 'completed', summary: 'Task initialized & scoped', timestamp: '0.0s' },
    2: { status: 'pending', summary: 'FalkorDB vector & Cypher retrieval' },
    3: { status: 'pending', summary: 'Gemini reasoning & patch generation' },
    4: { status: 'pending', summary: 'Sandboxed fixture binding' },
    5: { status: 'pending', summary: 'Subprocess execution & output capture' },
    6: { status: 'pending', summary: 'Rigorous exit code & stdout analysis' },
    7: { status: 'pending', summary: 'FalkorDB DAG insertion & indexing' },
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const executeFullLearningRun = async () => {
    setIsRunning(true);
    setErrorMsg(null);

    // Reset stages
    setStages({
      1: { status: 'completed', summary: 'Task input validated', timestamp: '0.0s' },
      2: { status: 'running', summary: 'Querying FalkorDB memory retriever...' },
      3: { status: 'pending', summary: 'Awaiting prior lessons' },
      4: { status: 'pending', summary: 'Targeting test fixture' },
      5: { status: 'pending', summary: 'Pending pytest execution' },
      6: { status: 'pending', summary: 'Pending classification' },
      7: { status: 'pending', summary: 'Pending persistence eligibility' },
    });
    setInspectStage(2);

    try {
      // Step 2 & 3: Proposal Generation (including retrieval)
      setStages((prev) => ({
        ...prev,
        2: { status: 'running', summary: 'Retrieving historical problem embeddings...' },
        3: { status: 'running', summary: 'Calling Gemini solver with causal memories...' },
      }));

      const propRes = await ProposalService.createProposal({
        task_description: taskInput,
        category: category || null,
        limit: 5,
      });

      setProposal(propRes);
      if (onProposalCreated) onProposalCreated(propRes);

      setStages((prev) => ({
        ...prev,
        2: {
          status: 'completed',
          summary: `Retrieved ${propRes.retrieved_memories_count} prior memories`,
          timestamp: '+1.2s',
        },
        3: {
          status: 'completed',
          summary: `Generated patch ${propRes.proposal_id.slice(0, 8)}`,
          timestamp: '+2.8s',
        },
        4: { status: 'running', summary: `Binding to ${selectedTest}` },
      }));
      setInspectStage(3);

      // Step 4 & 5: Sandboxed Pytest Evaluation
      setStages((prev) => ({
        ...prev,
        4: { status: 'completed', summary: `Bound fixture: ${selectedTest}`, timestamp: '+3.1s' },
        5: { status: 'running', summary: 'Executing sandboxed pytest runner...' },
      }));
      setInspectStage(5);

      const evalRes = await ProposalService.evaluateProposal(propRes.proposal_id, {
        task_id: propRes.task_id,
        task_description: propRes.task_description,
        proposed_fix: propRes.proposed_fix,
        test_file: selectedTest,
        is_relevant: true,
        test_description: 'Automated verification test run',
      });

      setEvaluation(evalRes);
      if (onProposalEvaluated) onProposalEvaluated(evalRes, propRes);

      const isSuccess = evalRes.verification_status === 'VERIFIED_SUCCESS';

      setStages((prev) => ({
        ...prev,
        5: {
          status: 'completed',
          summary: `Pytest exit code ${evalRes.exit_code}`,
          timestamp: '+4.5s',
        },
        6: {
          status: isSuccess ? 'completed' : 'failed',
          summary: `Classified as ${evalRes.verification_status}`,
          timestamp: '+4.6s',
        },
        7: {
          status: 'running',
          summary: isSuccess ? 'Indexing lesson to FalkorDB...' : 'Evaluating failure intelligence...',
        },
      }));
      setInspectStage(6);

      // Step 7: Persist if eligible
      try {
        const persistRes = await ProposalService.persistProposal(propRes.proposal_id, {
          task_id: propRes.task_id,
          task_description: propRes.task_description,
          problem_title: taskInput.slice(0, 60),
          category: category || 'general',
          lesson_content: lessonNote,
          proposed_fix: propRes.proposed_fix,
        });

        setPersisted(persistRes);
        if (onProposalPersisted) onProposalPersisted(persistRes, propRes);

        setStages((prev) => ({
          ...prev,
          7: {
            status: 'completed',
            summary: persistRes.lesson_saved
              ? `Persisted Lesson Node ${persistRes.lesson_id || persistRes.outcome_id}`
              : 'Outcome indexed without reusable lesson',
            timestamp: '+5.1s',
          },
        }));
        setInspectStage(7);
      } catch (persistErr: unknown) {
        setStages((prev) => ({
          ...prev,
          7: {
            status: 'failed',
            summary: persistErr instanceof Error ? persistErr.message : 'Not eligible for persistence',
            timestamp: '+5.0s',
          },
        }));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Execution failed');
      setStages((prev) => ({
        ...prev,
        3: prev[3].status === 'running' ? { status: 'failed', summary: 'Solver failed or timed out' } : prev[3],
        5: prev[5].status === 'running' ? { status: 'failed', summary: 'Execution crashed' } : prev[5],
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const stageTitles: { [key: number]: { title: string; subtitle: string; icon: React.ReactNode } } = {
    1: {
      title: '1. Investigation Scoping',
      subtitle: 'Task registration and canonical boundary initialization',
      icon: <FileCode className="w-4 h-4 text-[#1E3A8A]" />,
    },
    2: {
      title: '2. Relevant Memories Retrieved',
      subtitle: 'FalkorDB vector & graph retrieval of prior lessons',
      icon: <Database className="w-4 h-4 text-[#2563EB]" />,
    },
    3: {
      title: '3. Solution Proposal Generated',
      subtitle: 'Autonomous diagnosis and patch synthesizer',
      icon: <Cpu className="w-4 h-4 text-[#1E3A8A]" />,
    },
    4: {
      title: '4. Test Fixture Selection',
      subtitle: 'Sandboxed fixture binding restricted to tests/*.py',
      icon: <Lock className="w-4 h-4 text-[#D97706]" />,
    },
    5: {
      title: '5. Sandboxed Test Execution',
      subtitle: 'Isolated pytest subprocess execution & stdout telemetry',
      icon: <Terminal className="w-4 h-4 text-emerald-600" />,
    },
    6: {
      title: '6. Empirical Verification Classification',
      subtitle: 'Strict rule-based verification classification',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-700" />,
    },
    7: {
      title: '7. Reusable Lesson Persisted',
      subtitle: 'FalkorDB causal memory ingestion for future tasks',
      icon: <Sparkles className="w-4 h-4 text-[#2563EB]" />,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center text-white">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E3A8A]">Agent Reasoning &amp; Execution Timeline</h2>
              <p className="text-xs text-slate-500">
                Track the complete autonomous lifecycle: Retrieval → Diagnosis → Patching → Pytest Execution → Verification → DAG Ingestion.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={executeFullLearningRun}
          disabled={isRunning}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs text-white shadow-sm transition-all ${
            isRunning
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-[#1E3A8A] hover:bg-[#2563EB] active:scale-95'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Live Cycle...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Live Learning Run</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Timeline Steps, Right Stage Evidence Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline Sequence Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl border border-[#EADECE] p-5 shadow-xs">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Lifecycle Stage Progress
            </h3>

            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EADECE]">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                const s = stages[step];
                const meta = stageTitles[step];
                const isSelected = inspectStage === step;

                let badgeColor = 'bg-slate-100 text-slate-400 border-slate-200';
                if (s.status === 'completed') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
                if (s.status === 'running') badgeColor = 'bg-blue-50 text-blue-700 border-blue-400 animate-pulse';
                if (s.status === 'failed') badgeColor = 'bg-rose-50 text-rose-700 border-rose-300';

                return (
                  <div
                    key={step}
                    onClick={() => setInspectStage(step)}
                    className={`relative cursor-pointer group p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-50/50 border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                        : 'bg-[#FBF9F5] border-[#EADECE] hover:border-slate-300'
                    }`}
                  >
                    {/* Node Dot on Timeline */}
                    <div
                      className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                        s.status === 'completed'
                          ? 'border-emerald-600 bg-emerald-500'
                          : s.status === 'running'
                          ? 'border-blue-600 bg-blue-500 animate-ping'
                          : s.status === 'failed'
                          ? 'border-rose-600 bg-rose-500'
                          : 'border-slate-300 bg-slate-200'
                      }`}
                    />

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        {meta.icon}
                        {meta.title}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        {s.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {s.summary}
                    </p>

                    {s.timestamp && (
                      <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                        Clock: {s.timestamp}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stage Inspection Details Column */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs min-h-[580px] flex flex-col justify-between space-y-6">
            <div>
              {/* Header */}
              <div className="border-b border-[#EADECE] pb-4 mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#2563EB] font-bold">
                    Stage {inspectStage} Telemetry
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {stageTitles[inspectStage].title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {stageTitles[inspectStage].subtitle}
                  </p>
                </div>

                <span
                  className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                    stages[inspectStage].status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : stages[inspectStage].status === 'running'
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : stages[inspectStage].status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {stages[inspectStage].status.toUpperCase()}
                </span>
              </div>

              {/* Stage 1 Content: Task Scoping */}
              {inspectStage === 1 && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Task Description:</label>
                    <textarea
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Category Filter:</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Target Test Fixture:</label>
                      <input
                        type="text"
                        value={selectedTest}
                        onChange={(e) => setSelectedTest(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Lesson to Persist (if verified):</label>
                    <textarea
                      value={lessonNote}
                      onChange={(e) => setLessonNote(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Stage 2 Content: Memory Retrieval */}
              {inspectStage === 2 && (
                <div className="space-y-4 text-xs">
                  {proposal && proposal.memories && proposal.memories.length > 0 ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 flex items-center justify-between">
                        <span className="font-semibold">
                          Retrieved {proposal.memories.length} relevant experience nodes from FalkorDB
                        </span>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Vector + Graph Traversal
                        </span>
                      </div>

                      {proposal.memories.map((mem: SolverMemoryItem, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-[#1E3A8A]">
                              Lesson ID: {mem.lesson_id || `L-${idx + 1}`}
                            </span>
                            {mem.similarity_score !== undefined && (
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Similarity: {Math.round(mem.similarity_score * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800">
                            {mem.title || mem.problem_title || 'Database Concurrency Incident'}
                          </p>
                          <p className="text-slate-600 font-serif italic bg-white p-2 rounded border border-slate-200">
                            "{mem.lesson || mem.lesson_content || mem.content}"
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Run the learning run to inspect FalkorDB memory retrieval.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 3 Content: Proposed Solution */}
              {inspectStage === 3 && (
                <div className="space-y-4 text-xs">
                  {proposal ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">Proposal Identifier</span>
                          <span className="font-mono font-bold text-slate-800">{proposal.proposal_id}</span>
                        </div>
                        <button
                          onClick={() => copyText(proposal.proposed_fix, 'fix')}
                          className="text-[#2563EB] text-xs hover:underline flex items-center gap-1"
                        >
                          {copiedKey === 'fix' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy Fix</span>
                        </button>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-700 mb-1">Autonomous Diagnosis:</h4>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed font-mono">
                          {proposal.diagnosis}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-700 mb-1">Generated Code Patch:</h4>
                        <pre className="p-3 bg-[#0F172A] text-slate-100 rounded-lg font-mono text-xs overflow-x-auto max-h-48 border border-slate-800">
                          <code>{proposal.proposed_fix}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Awaiting proposal generation.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 4 Content: Test Selection */}
              {inspectStage === 4 && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Security &amp; Sandboxing Enforcement</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      To prevent arbitrary remote code execution, evaluations can only execute verified pytest fixtures residing inside the project’s <code>tests/</code> directory. Arbitrary shell commands are explicitly rejected with 403 Forbidden.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-400 font-mono block">Bound Test Fixture</span>
                    <span className="font-mono text-xs font-bold text-slate-800">{selectedTest}</span>
                  </div>
                </div>
              )}

              {/* Stage 5 Content: Test Execution */}
              {inspectStage === 5 && (
                <div className="space-y-3 text-xs">
                  {evaluation ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="font-mono">Subprocess Exit Code: <strong>{evaluation.exit_code}</strong></span>
                        <span className="font-mono text-slate-500">tests_executed: {evaluation.tests_executed ? 'true' : 'false'}</span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-700">Captured Subprocess Terminal Output:</span>
                          <button
                            onClick={() => copyText(evaluation.stdout || evaluation.evidence, 'stdout')}
                            className="text-[#2563EB] text-xs hover:underline flex items-center gap-1"
                          >
                            {copiedKey === 'stdout' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Copy Output</span>
                          </button>
                        </div>
                        <pre className="p-3 bg-[#0F172A] text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                          <code>{evaluation.stdout || evaluation.evidence || 'No terminal stream recorded.'}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Awaiting sandbox pytest execution.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 6 Content: Verification Classification */}
              {inspectStage === 6 && (
                <div className="space-y-4 text-xs">
                  {evaluation ? (
                    <div className="space-y-4">
                      <div
                        className={`p-4 rounded-xl border flex items-center gap-3 ${
                          evaluation.verification_status === 'VERIFIED_SUCCESS'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-rose-50 border-rose-300 text-rose-900'
                        }`}
                      >
                        {evaluation.verification_status === 'VERIFIED_SUCCESS' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <h4 className="font-bold text-sm">{evaluation.verification_status}</h4>
                          <p className="text-xs mt-0.5 opacity-90">
                            {evaluation.verification_status === 'VERIFIED_SUCCESS'
                              ? 'Pytest finished with exit code 0 and confirmed test execution. Eligible for FalkorDB ingestion.'
                              : 'Pytest failed or reproduced expected lock contention.'}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="font-semibold text-slate-700 block mb-1">Canonical Verification Audit Evidence:</span>
                        <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap">
                          {evaluation.evidence}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Verification classification pending.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 7 Content: Lesson Persistence */}
              {inspectStage === 7 && (
                <div className="space-y-4 text-xs">
                  {persisted ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                          <Database className="w-4 h-4 text-emerald-700" />
                          <span>Graph Memory Ingested to FalkorDB</span>
                        </div>
                        <p className="text-xs text-emerald-800">
                          Lesson and Outcome nodes have been committed to the causal knowledge graph with grounded pytest audit evidence.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-mono block">Outcome Node ID</span>
                          <span className="font-mono font-bold text-slate-800">{persisted.outcome_id}</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-mono block">Lesson Node ID</span>
                          <span className="font-mono font-bold text-[#2563EB]">
                            {persisted.lesson_id || 'Embedded in Outcome'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 font-mono block mb-1">Cypher Provenance Record</span>
                        <pre className="p-2.5 bg-[#0F172A] text-emerald-400 rounded font-mono text-[11px]">
                          <code>{`MATCH (p:Problem {id: '${persisted.task_id}'})-[:PRODUCED_OUTCOME]->(o:Outcome {id: '${persisted.outcome_id}'})
OPTIONAL MATCH (o)-[:SUPPORTED_BY]->(l:Lesson)
RETURN p, o, l;`}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Run full learning cycle to persist verified lesson to FalkorDB.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Step Switcher */}
            <div className="pt-4 border-t border-[#EADECE] flex items-center justify-between">
              <button
                disabled={inspectStage <= 1}
                onClick={() => setInspectStage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous Stage
              </button>

              <span className="text-xs font-mono text-slate-400">
                Step {inspectStage} of 7
              </span>

              <button
                disabled={inspectStage >= 7}
                onClick={() => setInspectStage((prev) => Math.min(7, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next Stage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
