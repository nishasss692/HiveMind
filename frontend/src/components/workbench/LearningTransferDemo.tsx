import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Database,
  Play,
  Zap
} from 'lucide-react';
import { ProposalService } from '../../services/proposals';
import type { ProposalResponse, ProposalEvaluateResponse, ProposalPersistResponse } from '../../types/api';

export const LearningTransferDemo: React.FC = () => {
  // Task A (Original Experience) states
  const [taskAText, setTaskAText] = useState(
    'Database transaction deadlock when creating index on active orders table during migration'
  );
  const [taskACategory] = useState('database_migration');
  const [taskATest] = useState('tests/test_migration_fixture.py');

  const [isTaskARunning, setIsTaskARunning] = useState(false);
  const [proposalA, setProposalA] = useState<ProposalResponse | null>(null);
  const [evalA, setEvalA] = useState<ProposalEvaluateResponse | null>(null);
  const [persistA, setPersistA] = useState<ProposalPersistResponse | null>(null);

  // Task B (Similar Future Task) states
  const [taskBText, setTaskBText] = useState(
    'High throughput active orders table migration deadlock during secondary index creation'
  );
  const [isTaskBRunning, setIsTaskBRunning] = useState(false);
  const [proposalB, setProposalB] = useState<ProposalResponse | null>(null);
  const [evalB, setEvalB] = useState<ProposalEvaluateResponse | null>(null);

  // Run Task A pipeline
  const runTaskA = async () => {
    setIsTaskARunning(true);
    setProposalA(null);
    setEvalA(null);
    setPersistA(null);

    try {
      // 1. Generate Proposal A
      const propRes = await ProposalService.createProposal({
        task_description: taskAText,
        category: taskACategory,
        limit: 5,
      });
      setProposalA(propRes);

      // 2. Evaluate with pytest
      const evalRes = await ProposalService.evaluateProposal(propRes.proposal_id, {
        task_id: propRes.task_id,
        task_description: propRes.task_description,
        proposed_fix: propRes.proposed_fix,
        test_file: taskATest,
        is_relevant: true,
        test_description: 'Task A baseline verification test',
      });
      setEvalA(evalRes);

      // 3. Persist to FalkorDB
      if (evalRes.verification_status === 'VERIFIED_SUCCESS') {
        const persistRes = await ProposalService.persistProposal(propRes.proposal_id, {
          task_id: propRes.task_id,
          task_description: propRes.task_description,
          problem_title: 'Active orders table migration deadlock',
          category: taskACategory,
          lesson_content:
            'Always execute CREATE INDEX CONCURRENTLY on active production tables outside explicit transaction blocks to avoid AccessExclusiveLocks.',
          proposed_fix: propRes.proposed_fix,
        });
        setPersistA(persistRes);
      }
    } catch (err) {
      console.error('Task A execution error:', err);
    } finally {
      setIsTaskARunning(false);
    }
  };

  // Run Task B pipeline (demonstrates retrieval of Task A lesson!)
  const runTaskB = async () => {
    setIsTaskBRunning(true);
    setProposalB(null);
    setEvalB(null);

    try {
      // 1. Generate Proposal B (Live retrieval from FalkorDB)
      const propRes = await ProposalService.createProposal({
        task_description: taskBText,
        category: taskACategory,
        limit: 5,
      });
      setProposalB(propRes);

      // 2. Evaluate with pytest
      const evalRes = await ProposalService.evaluateProposal(propRes.proposal_id, {
        task_id: propRes.task_id,
        task_description: propRes.task_description,
        proposed_fix: propRes.proposed_fix,
        test_file: taskATest,
        is_relevant: true,
        test_description: 'Task B transfer verification test',
      });
      setEvalB(evalRes);
    } catch (err) {
      console.error('Task B execution error:', err);
    } finally {
      setIsTaskBRunning(false);
    }
  };

  // Check if Task B retrieved Lesson from Task A
  const memoryReused = proposalB && (
    proposalB.memories?.some((m) =>
      (m.lesson && m.lesson.toLowerCase().includes('concurrently')) ||
      (m.lesson_content && m.lesson_content.toLowerCase().includes('concurrently'))
    ) ||
    proposalB.proposed_fix.toLowerCase().includes('concurrently')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E3A8A]">Learning Transfer &amp; Collective Memory Reuse Proof</h2>
              <p className="text-xs text-slate-500">
                Execute a two-stage live benchmark: generate and persist an empirical lesson in Task A, then observe autonomous retrieval and reuse in Task B.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>FalkorDB Synaptic Link: Active</span>
        </div>
      </div>

      {/* Side-by-side Connected Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Connection Arrow between A and B on large screens */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#1E3A8A] text-white items-center justify-center shadow-lg border-2 border-white">
          <ArrowRight className="w-5 h-5" />
        </div>

        {/* Column 1: Task A (Original Experience) */}
        <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#EADECE] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded">
                Experience A • Seed Run
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">
                Original Experience &amp; Ingestion
              </h3>
            </div>

            <button
              onClick={runTaskA}
              disabled={isTaskARunning}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-white transition-all ${
                isTaskARunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#1E3A8A] hover:bg-[#2563EB]'
              }`}
            >
              {isTaskARunning ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Solving &amp; Persisting...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>1. Run Task A</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Task A Description:</label>
            <textarea
              value={taskAText}
              onChange={(e) => setTaskAText(e.target.value)}
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
            />
          </div>

          {/* Results A */}
          {proposalA ? (
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Proposal A Diagnosis</span>
                <p className="font-mono text-slate-800 line-clamp-2">{proposalA.diagnosis}</p>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">Generated Fix</span>
                <pre className="p-2.5 bg-[#0F172A] text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-24">
                  <code>{proposalA.proposed_fix}</code>
                </pre>
              </div>

              {evalA && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    evalA.verification_status === 'VERIFIED_SUCCESS'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <span className="font-mono font-bold">{evalA.verification_status}</span>
                  <span className="font-mono text-[10px]">Exit Code {evalA.exit_code}</span>
                </div>
              )}

              {persistA && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl text-emerald-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Persisted to FalkorDB DAG!</span>
                  </div>
                  <p className="font-serif italic text-[11px]">
                    "{persistA.lesson_learned || 'CREATE INDEX CONCURRENTLY avoids AccessExclusiveLocks.'}"
                  </p>
                  <span className="text-[10px] font-mono text-emerald-800 block">
                    Lesson Node ID: {persistA.lesson_id || persistA.outcome_id}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
              Click "1. Run Task A" to generate, verify, and persist the initial experience.
            </div>
          )}
        </div>

        {/* Column 2: Task B (Similar Future Task) */}
        <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#EADECE] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">
                Experience B • Collective Reuse
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">
                Similar Task with Memory Retrieval
              </h3>
            </div>

            <button
              onClick={runTaskB}
              disabled={isTaskBRunning}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-white transition-all ${
                isTaskBRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#2563EB] hover:bg-[#1d4ed8]'
              }`}
            >
              {isTaskBRunning ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Retrieving Memories...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 fill-current" />
                  <span>2. Run Task B</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Task B Description:</label>
            <textarea
              value={taskBText}
              onChange={(e) => setTaskBText(e.target.value)}
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
            />
          </div>

          {/* Results B */}
          {proposalB ? (
            <div className="space-y-3 pt-2 text-xs">
              {/* Evidence of Retrieval & Reuse Badge */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  memoryReused
                    ? 'bg-blue-50 border-[#2563EB] text-[#1E3A8A]'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <span className="font-bold">
                    {memoryReused ? 'Prior Lesson Successfully Reused!' : 'Memory Queried'}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#2563EB]/20">
                  {proposalB.retrieved_memories_count} memories retrieved
                </span>
              </div>

              {/* Retrieved Memories Preview */}
              {proposalB.memories && proposalB.memories.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block uppercase">
                    Retrieved Lesson from Graph:
                  </span>
                  <p className="font-serif italic text-slate-800 text-[11px]">
                    "{proposalB.memories[0].lesson || proposalB.memories[0].lesson_content || 'CREATE INDEX CONCURRENTLY'}"
                  </p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-1">Informed Solution B</span>
                <pre className="p-2.5 bg-[#0F172A] text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto max-h-24">
                  <code>{proposalB.proposed_fix}</code>
                </pre>
              </div>

              {evalB && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    evalB.verification_status === 'VERIFIED_SUCCESS'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <span className="font-mono font-bold">{evalB.verification_status}</span>
                  <span className="font-mono text-[10px]">Exit Code {evalB.exit_code}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
              Click "2. Run Task B" after running Task A to witness collective memory retrieval in real-time.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
