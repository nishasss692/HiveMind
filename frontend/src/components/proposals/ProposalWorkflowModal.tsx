import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Database,
  ArrowRight,
  Terminal,
  Zap,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { ProposalService } from '../../services/proposals';
import type {
  ProposalResponse,
  ProposalEvaluateResponse,
  ProposalPersistResponse,
} from '../../types/api';

interface ProposalWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProposalCreated: (proposal: ProposalResponse) => void;
  onProposalEvaluated: (evalRes: ProposalEvaluateResponse, proposal: ProposalResponse) => void;
  onProposalPersisted: (persistRes: ProposalPersistResponse, proposal: ProposalResponse) => void;
}

const PRESET_TASKS = [
  {
    title: 'PostgreSQL Migration Deadlock',
    category: 'database_migration',
    description:
      'Database transaction deadlock when creating index on active orders table during migration',
    testFile: 'tests/test_migration_fixture.py',
    problemTitle: 'Active orders table migration deadlock',
    lessonContent:
      'Always execute CREATE INDEX CONCURRENTLY on active production tables outside explicit transaction blocks to prevent table locks.',
  },
  {
    title: 'Faulty Blocking Migration (Failure Case)',
    category: 'database_migration',
    description:
      'Attempting synchronous blocking index build on heavy write table',
    testFile: 'tests/test_migration_failure_fixture.py',
    problemTitle: 'Synchronous blocking index lock cascade',
    lessonContent:
      'Blocking index statements result in exclusive table locks and cascading deadlocks in high concurrency environments.',
  },
  {
    title: 'PostgreSQL Database Integration Test',
    category: 'database_migration',
    description:
      'Verify schema constraints and concurrent index generation on real PostgreSQL database instance',
    testFile: 'tests/test_postgres_migration.py',
    problemTitle: 'PostgreSQL schema concurrent indexing test',
    lessonContent:
      'Index creation inside explicit transactions fails with ActiveSqlTransaction error in PostgreSQL.',
  },
];

const PERMITTED_TESTS = [
  'tests/test_migration_fixture.py',
  'tests/test_migration_failure_fixture.py',
  'tests/test_postgres_migration.py',
  'tests/test_runner_smoke.py',
];

export const ProposalWorkflowModal: React.FC<ProposalWorkflowModalProps> = ({
  isOpen,
  onClose,
  onProposalCreated,
  onProposalEvaluated,
  onProposalPersisted,
}) => {
  // Stepper: 1: Submit -> 2: Inspect -> 3: Evaluate -> 4: Persist -> 5: Collective Learning
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [taskDescription, setTaskDescription] = useState(
    'Database transaction deadlock when creating index on active orders table during migration'
  );
  const [category, setCategory] = useState('database_migration');
  const [limit, setLimit] = useState(5);

  // Evaluation states
  const [selectedTestFile, setSelectedTestFile] = useState(
    'tests/test_migration_fixture.py'
  );
  const [isRelevant, setIsRelevant] = useState(true);
  const [testDescription] = useState(
    'Verify concurrent indexing eliminates migration deadlock'
  );

  // Persistence states
  const [problemTitle, setProblemTitle] = useState(
    'Active orders table migration deadlock'
  );
  const [lessonContent, setLessonContent] = useState(
    'Always execute CREATE INDEX CONCURRENTLY on active production tables to avoid transactional locks.'
  );

  // Cross-task learning demo
  const [secondTaskDescription, setSecondTaskDescription] = useState(
    'Active orders table transaction deadlock when creating index'
  );
  const [secondProposal, setSecondProposal] = useState<ProposalResponse | null>(null);

  // Request status
  const [isProposing, setIsProposing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isLearningTesting, setIsLearningTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API outputs
  const [createdProposal, setCreatedProposal] = useState<ProposalResponse | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<ProposalEvaluateResponse | null>(null);
  const [persistResult, setPersistResult] = useState<ProposalPersistResponse | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_TASKS[0]) => {
    setTaskDescription(preset.description);
    setCategory(preset.category);
    setSelectedTestFile(preset.testFile);
    setProblemTitle(preset.problemTitle);
    setLessonContent(preset.lessonContent);
  };

  // Step 1 -> 2: Generate Proposal
  const handlePropose = async () => {
    setIsProposing(true);
    setErrorMessage(null);
    try {
      const res = await ProposalService.createProposal({
        task_description: taskDescription,
        category: category || null,
        limit: Number(limit),
      });
      setCreatedProposal(res);
      onProposalCreated(res);
      setCurrentStep(2);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to generate proposal from backend'
      );
    } finally {
      setIsProposing(false);
    }
  };

  // Step 2 -> 3: Evaluate Proposal
  const handleEvaluate = async () => {
    if (!createdProposal) return;
    setIsEvaluating(true);
    setErrorMessage(null);
    try {
      const res = await ProposalService.evaluateProposal(createdProposal.proposal_id, {
        task_id: createdProposal.task_id,
        task_description: createdProposal.task_description,
        proposed_fix: createdProposal.proposed_fix,
        test_file: selectedTestFile,
        is_relevant: isRelevant,
        test_description: testDescription,
      });
      setEvaluationResult(res);
      onProposalEvaluated(res, createdProposal);
      setCurrentStep(3);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Evaluation failed'
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  // Step 3 -> 4: Persist Outcome & Lesson
  const handlePersist = async () => {
    if (!createdProposal || !evaluationResult) return;
    setIsPersisting(true);
    setErrorMessage(null);
    try {
      const res = await ProposalService.persistProposal(createdProposal.proposal_id, {
        task_id: createdProposal.task_id,
        task_description: createdProposal.task_description,
        problem_title: problemTitle,
        category: category,
        lesson_content: lessonContent,
      });
      setPersistResult(res);
      onProposalPersisted(res, createdProposal);
      setCurrentStep(4);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Persistence rejected by server'
      );
    } finally {
      setIsPersisting(false);
    }
  };

  // Step 4 -> 5: Demonstrate Collective Learning
  const handleTestCollectiveLearning = async () => {
    setIsLearningTesting(true);
    setErrorMessage(null);
    try {
      const res = await ProposalService.createProposal({
        task_description: secondTaskDescription,
        category: category,
        limit: 5,
      });
      setSecondProposal(res);
      setCurrentStep(5);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to verify collective learning'
      );
    } finally {
      setIsLearningTesting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCreatedProposal(null);
    setEvaluationResult(null);
    setPersistResult(null);
    setSecondProposal(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#FFFFFF] rounded-2xl border border-[#EADECE] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#EADECE] flex items-center justify-between bg-[#FBF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0F172A] leading-tight">
                Autonomous Proposal &amp; Verification Workflow
              </h2>
              <p className="text-xs text-[#64748B]">
                Full 5-Stage Causal Learning Loop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F7F4EE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="px-6 py-2.5 bg-[#F7F4EE] border-b border-[#EADECE] flex items-center justify-between text-xs font-mono">
          {[
            { num: 1, label: '1. Propose' },
            { num: 2, label: '2. Inspect' },
            { num: 3, label: '3. Evaluate' },
            { num: 4, label: '4. Persist' },
            { num: 5, label: '5. Collective Learning' },
          ].map((step) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            return (
              <div
                key={step.num}
                className={`flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#1E3A8A] font-bold'
                    : isCompleted
                    ? 'text-[#059669]'
                    : 'text-[#64748B]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isActive
                      ? 'bg-[#1E3A8A] text-white'
                      : isCompleted
                      ? 'bg-[#059669] text-white'
                      : 'bg-[#EADECE] text-[#475569]'
                  }`}
                >
                  {isCompleted ? '✓' : step.num}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Operation Rejected / Error</div>
                <div className="text-[11px] leading-relaxed mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* STEP 1: Submit Task & Propose */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-[#0F172A] block mb-1">
                  Task / Engineering Problem Description
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-[#EADECE] bg-[#FBF9F5] focus:bg-white focus:border-[#2563EB] outline-none text-xs text-[#0F172A] leading-relaxed"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the bug, race condition, or deadlock..."
                />
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] font-mono text-[#64748B] block mb-1.5">
                  Or load a benchmark scenario:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TASKS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] hover:bg-[#EADECE] border border-[#EADECE] text-[11px] text-[#1E3A8A] font-medium transition-colors"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">
                    Domain Category Filter
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 rounded-xl border border-[#EADECE] bg-[#FBF9F5] text-xs font-mono"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="database_migration, caching, etc."
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#0F172A] block mb-1">
                    Max FalkorDB Memory Lessons to Retrieve: {limit}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full accent-[#1E3A8A] mt-2"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#EADECE] flex justify-end">
                <button
                  onClick={handlePropose}
                  disabled={isProposing || !taskDescription.trim()}
                  className="px-4 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isProposing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Querying FalkorDB &amp; Gemini...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Solution Proposal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Inspect Returned Proposal */}
          {currentStep === 2 && createdProposal && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#F7F4EE] border border-[#EADECE] flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-[#64748B]">CANONICAL PROPOSAL ID</span>
                  <div className="font-mono font-bold text-[#1E3A8A]">{createdProposal.proposal_id}</div>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#64748B]">INITIAL STATUS</span>
                  <div className="font-mono font-bold text-[#D97706] uppercase">
                    {createdProposal.verification_status}
                  </div>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#64748B]">RETRIEVED LESSONS</span>
                  <div className="font-mono font-bold text-[#059669]">
                    {createdProposal.retrieved_memories_count} from FalkorDB
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#EADECE] space-y-1">
                <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  Root Cause Diagnosis
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {createdProposal.diagnosis || 'Analysis provided based on retrieved graph context.'}
                </p>
              </div>

              {/* Proposed Fix */}
              <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#EADECE] space-y-1">
                <div className="font-semibold text-[#0F172A]">Concrete Proposed Fix:</div>
                <code className="block p-2 rounded-lg bg-white border border-[#EADECE] font-mono text-[11px] text-[#1E3A8A] leading-relaxed">
                  {createdProposal.proposed_fix}
                </code>
              </div>

              {/* Reasoning */}
              {createdProposal.reasoning && (
                <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#EADECE] space-y-1">
                  <div className="font-semibold text-[#0F172A]">Reasoning Grounding:</div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {createdProposal.reasoning}
                  </p>
                </div>
              )}

              {/* Evaluation Parameters Form */}
              <div className="pt-2 border-t border-[#EADECE] space-y-2.5">
                <div className="font-semibold text-[#0F172A]">
                  Select Permitted Sandboxed Test Fixture to Evaluate:
                </div>
                <select
                  value={selectedTestFile}
                  onChange={(e) => setSelectedTestFile(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#EADECE] bg-white font-mono text-xs text-[#0F172A]"
                >
                  {PERMITTED_TESTS.map((test) => (
                    <option key={test} value={test}>
                      {test}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isRelevantCheckbox"
                    checked={isRelevant}
                    onChange={(e) => setIsRelevant(e.target.checked)}
                    className="accent-[#1E3A8A] rounded"
                  />
                  <label htmlFor="isRelevantCheckbox" className="text-xs text-[#475569]">
                    Confirm this test fixture is genuinely relevant to the proposed fix
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EADECE] flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 rounded-lg border border-[#EADECE] text-[#475569] hover:bg-[#F7F4EE]"
                >
                  Back
                </button>

                <button
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="px-4 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isEvaluating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Sandboxed Pytest...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Sandbox Evaluation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Evaluation Results & Persistence Eligibility */}
          {currentStep === 3 && evaluationResult && (
            <div className="space-y-3.5">
              {/* Verification Outcome Card */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  evaluationResult.verification_status === 'VERIFIED_SUCCESS'
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                    : evaluationResult.verification_status === 'VERIFIED_FAILURE'
                    ? 'bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]'
                    : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {evaluationResult.verification_status === 'VERIFIED_SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  ) : evaluationResult.verification_status === 'VERIFIED_FAILURE' ? (
                    <XCircle className="w-5 h-5 text-[#E11D48]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                  )}
                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
                      Verification Outcome
                    </div>
                    <div className="font-mono text-sm font-bold">
                      {evaluationResult.verification_status}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px]">
                  <div>Exit Code: {evaluationResult.exit_code ?? 'None'}</div>
                  <div>Tests Executed: {evaluationResult.tests_executed ? 'True' : 'False'}</div>
                </div>
              </div>

              {/* Subprocess Pytest Evidence Trail */}
              <div>
                <div className="font-semibold text-[#0F172A] mb-1 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  Subprocess Pytest Audit Evidence Trail
                </div>
                <div className="p-3 rounded-xl bg-[#091124] text-[#A7F3D0] font-mono text-[11px] overflow-x-auto max-h-48 border border-[#1E3A8A]/30">
                  <pre className="whitespace-pre-wrap">{evaluationResult.evidence}</pre>
                </div>
              </div>

              {/* Persist Inputs */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#EADECE] space-y-2.5">
                <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#2563EB]" />
                  Persist Reusable Lesson to FalkorDB
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-0.5">
                    Problem Title
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg border border-[#EADECE] bg-white text-xs font-mono"
                    value={problemTitle}
                    onChange={(e) => setProblemTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-0.5">
                    Reusable Lesson Content (Required for persistence)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full p-2 rounded-lg border border-[#EADECE] bg-white text-xs"
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#EADECE] flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 rounded-lg border border-[#EADECE] text-[#475569] hover:bg-[#F7F4EE]"
                >
                  Back
                </button>

                <button
                  onClick={handlePersist}
                  disabled={isPersisting || !lessonContent.trim()}
                  className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isPersisting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing to FalkorDB Graph...</span>
                    </>
                  ) : (
                    <>
                      <span>Commit Lesson to Graph Memory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Persistence Confirmation */}
          {currentStep === 4 && persistResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <span>Verified Outcome Successfully Committed to FalkorDB!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 text-[#047857]">
                  <div>Lesson Node ID: {persistResult.lesson_id}</div>
                  <div>Outcome Node ID: {persistResult.outcome_id}</div>
                </div>
              </div>

              {/* Collective Learning Explanation */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#EADECE] space-y-2">
                <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  Demonstrate Swarm Collective Memory
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Now submit a second task describing a similar incident. Because the lesson is now stored in FalkorDB, HiveMind&rsquo;s investigator will automatically retrieve this exact verified lesson to solve the new issue!
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    Second Similar Task Description:
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-xl border border-[#EADECE] bg-white font-mono text-xs text-[#0F172A]"
                    value={secondTaskDescription}
                    onChange={(e) => setSecondTaskDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#EADECE] flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-[#EADECE] text-[#475569] hover:bg-[#F7F4EE]"
                >
                  Start Over
                </button>

                <button
                  onClick={handleTestCollectiveLearning}
                  disabled={isLearningTesting}
                  className="px-4 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isLearningTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Retrieving from FalkorDB...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Collective Memory Retrieval</span>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Collective Learning Proof */}
          {currentStep === 5 && secondProposal && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <span>Collective Learning Loop Verified!</span>
                </div>
                <p className="text-xs text-[#047857]">
                  FalkorDB returned {secondProposal.retrieved_memories_count} historical lesson(s) for the new task. The new proposal was influenced by earlier verified empirical evidence.
                </p>
              </div>

              {/* Retrieved Memories Preview */}
              <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#EADECE] space-y-2">
                <div className="font-semibold text-[#0F172A]">
                  Retrieved Lesson Nodes from FalkorDB:
                </div>
                {secondProposal.memories.map((mem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white border border-[#EADECE] space-y-1 font-mono text-[11px]"
                  >
                    <div className="flex items-center justify-between text-[#1E3A8A] font-bold">
                      <span>{mem.lesson_id || `Lesson Node #${idx + 1}`}</span>
                      <span className="text-[#059669]">
                        Score: {mem.similarity_score ? mem.similarity_score.toFixed(3) : 'High'}
                      </span>
                    </div>
                    <div className="text-[#475569] font-sans text-xs">
                      {mem.lesson || mem.lesson_content || mem.problem_title}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#EADECE] flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-medium shadow-sm transition-all"
                >
                  Close Explorer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
