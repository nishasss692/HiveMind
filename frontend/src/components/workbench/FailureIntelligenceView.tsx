import React, { useState } from 'react';
import {
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
  RotateCcw
} from 'lucide-react';

interface FailureIntelligenceViewProps {
  onSelectNodeInGraph?: (nodeId: string) => void;
  onOpenLearningRun?: () => void;
}

export const FailureIntelligenceView: React.FC<FailureIntelligenceViewProps> = ({
  onSelectNodeInGraph,
  onOpenLearningRun,
}) => {
  const [selectedFailureId, setSelectedFailureId] = useState<string>('F-92');

  // Structured failure records preserved in FalkorDB
  const failureRecords = [
    {
      id: 'F-92',
      title: 'Standard Blocking CREATE INDEX Lock Contention Timeout',
      category: 'database_migration',
      symptom: 'PostgreSQL 54000: lock_not_available during active write workload',
      failedAttempt: 'CREATE INDEX idx_orders_customer_id ON orders (customer_id);',
      failedTestFixture: 'tests/test_migration_failure_fixture.py',
      failedEvidence:
        'FAILED tests/test_migration_failure_fixture.py::test_blocking_index_fails - asyncpg.exceptions.LockNotAvailableError: 54000\nSubprocess returncode: 1\nVerification Status: VERIFIED_FAILURE',
      causalMechanism:
        'Standard CREATE INDEX immediately acquires an AccessExclusiveLock on the target table, blocking all concurrent SELECT, INSERT, UPDATE, and DELETE operations. Under write concurrency, queue starvation triggers immediate lock timeout.',
      correctiveLessonId: 'L-88',
      correctiveLessonTitle: 'Non-blocking concurrent index build pattern',
      correctiveFix: 'CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders (customer_id);',
      correctiveStatus: 'VERIFIED_SUCCESS',
      preventedRecurrences: 14,
    },
    {
      id: 'F-110',
      title: 'Redis Sentinel Quorum Split-Brain Timeout',
      category: 'caching',
      symptom: 'Master node failover delay exceeding 3000ms SLA during rolling reboots',
      failedAttempt: 'sentinel failover-timeout 180000; min-replicas-to-write 0;',
      failedTestFixture: 'tests/test_runner_smoke.py',
      failedEvidence:
        'FAILED tests/test_redis_failover.py::test_quorum - TimeoutError: 3000ms exceeded\nExit code: 1\nVerification Status: VERIFIED_FAILURE',
      causalMechanism:
        'Overly conservative failover timeouts caused intermittent split-brain states where replicas disagreed on the master election quorum.',
      correctiveLessonId: 'L-104',
      correctiveLessonTitle: 'Redis Cluster Sentinel Failover Topology Patch',
      correctiveFix: 'Configure sentinel down-after-milliseconds to 2000ms with min-replicas-to-write 1.',
      correctiveStatus: 'VERIFIED_SUCCESS',
      preventedRecurrences: 8,
    },
    {
      id: 'F-124',
      title: 'Async Threadpool Worker Pool Starvation',
      category: 'concurrency',
      symptom: 'FastAPI event loop stall under synchronous disk I/O bursts',
      failedAttempt: 'Directly calling synchronous open() and write() inside async FastAPI route handlers.',
      failedTestFixture: 'backend/tests/test_api.py',
      failedEvidence:
        'Execution latency spiked to 4200ms; event loop lag detected > 2000ms.\nExit code: 1\nVerification Status: VERIFIED_FAILURE',
      causalMechanism:
        'Blocking filesystem calls executed directly inside async def routines freeze the single-threaded asyncio event loop for all concurrent client requests.',
      correctiveLessonId: 'L-106',
      correctiveLessonTitle: 'FastAPI Async Threadpool Worker Pool Starvation',
      correctiveFix: 'Wrap blocking synchronous I/O routines using anyio.to_thread.run_sync.',
      correctiveStatus: 'VERIFIED_SUCCESS',
      preventedRecurrences: 22,
    },
  ];

  const activeRecord = failureRecords.find((r) => r.id === selectedFailureId) || failureRecords[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E11D48] flex items-center justify-center text-white">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E3A8A]">Failure Intelligence &amp; Counter-Examples</h2>
              <p className="text-xs text-slate-500">
                HiveMind does not discard failed attempts—it indexes anti-patterns to prevent coding agents from repeating known mistakes.
              </p>
            </div>
          </div>
        </div>

        {onOpenLearningRun && (
          <button
            onClick={onOpenLearningRun}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A8A] hover:bg-[#2563EB] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Test Counter-Example in Run</span>
          </button>
        )}
      </div>

      {/* Failure Insight Philosophy */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
        <div className="text-xs text-rose-950 leading-relaxed">
          <strong className="font-semibold text-rose-900">Negative Knowledge Preservation:</strong> LLM agents frequently fall into recurring trap solutions that seem plausible in natural language but crash under load. HiveMind preserves <code>VERIFIED_FAILURE</code> records in FalkorDB as negative examples to prune faulty reasoning branches before code is committed.
        </div>
      </div>

      {/* Main Grid: Failure List + Root Cause & Corrective Bridge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Failure Records Selector */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 pl-1 block">
            Indexed Failure Telemetry:
          </span>

          {failureRecords.map((record) => {
            const isSelected = record.id === selectedFailureId;
            return (
              <div
                key={record.id}
                onClick={() => setSelectedFailureId(record.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-rose-50/50 border-[#E11D48] shadow-xs ring-1 ring-[#E11D48]/20'
                    : 'bg-white border-[#EADECE] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    {record.id}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Fixed by {record.correctiveLessonId}
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 mb-1">
                  {record.title}
                </h4>

                <p className="text-[11px] font-mono text-slate-500 line-clamp-2">
                  {record.symptom}
                </p>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Category: {record.category}</span>
                  <span className="text-emerald-700 font-semibold">{record.preventedRecurrences} prevented</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Deep Causal Analysis & Corrective Lesson Bridge */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl border border-[#EADECE] p-6 shadow-xs space-y-5">
            {/* Top Bar */}
            <div className="border-b border-[#EADECE] pb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    FAILING ATTEMPT: {activeRecord.id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Fixture: {activeRecord.failedTestFixture}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeRecord.title}
                </h3>
              </div>

              {onSelectNodeInGraph && (
                <button
                  onClick={() => onSelectNodeInGraph(activeRecord.id)}
                  className="text-xs text-[#2563EB] hover:underline font-medium flex items-center gap-1"
                >
                  <span>Locate in 3D Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Negative Knowledge: What failed and why */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Defective Proposed Implementation (Anti-Pattern):
                </span>
                <pre className="p-3 bg-[#0F172A] text-rose-300 rounded-xl font-mono text-xs overflow-x-auto border border-rose-900/30">
                  <code>{activeRecord.failedAttempt}</code>
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Empirical Pytest Crash Evidence:
                </span>
                <pre className="p-3 bg-[#0F172A] text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
                  <code>{activeRecord.failedEvidence}</code>
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Underlying Causal Mechanism:
                </span>
                <p className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-mono">
                  {activeRecord.causalMechanism}
                </p>
              </div>
            </div>

            {/* The Corrective Causal Bridge: How HiveMind Transformed Failure Into Wisdom */}
            <div className="pt-4 border-t border-[#EADECE]">
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Derived Corrective Lesson: {activeRecord.correctiveLessonId}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-white border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    STATUS: {activeRecord.correctiveStatus}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-900">
                  {activeRecord.correctiveLessonTitle}
                </p>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 font-mono text-xs text-emerald-950">
                  <code>{activeRecord.correctiveFix}</code>
                </div>

                <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1">
                  <span>DAG Relationship: <code>{`(:Failure {id: '${activeRecord.id}'})-[:SUPPORTS_LESSON]->(:Lesson {id: '${activeRecord.correctiveLessonId}'})`}</code></span>
                  <span className="font-semibold">{activeRecord.preventedRecurrences} repeat errors averted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
