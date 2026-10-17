import React from 'react';
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
} from 'lucide-react';

interface SummaryCardsProps {
  proposalsCount: number;
  verifiedSuccessCount: number;
  verifiedFailureCount: number;
  unverifiedCount: number;
  lessonsPersistedCount: number;
  databaseConnected: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  proposalsCount,
  verifiedSuccessCount,
  verifiedFailureCount,
  unverifiedCount,
  lessonsPersistedCount,
  databaseConnected,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Proposals Created */}
      <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#EADECE] shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Proposals Created
          </span>
          <FileCode className="w-4 h-4 text-[#1E3A8A]" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-[#0F172A]">
            {proposalsCount}
          </span>
          <span className="text-[10px] text-[#64748B]">Active Session</span>
        </div>
      </div>

      {/* Verified Successes */}
      <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#EADECE] shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Verified Success
          </span>
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-[#059669]">
            {verifiedSuccessCount}
          </span>
          <span className="text-[10px] text-[#059669] font-medium">Pytest Proven</span>
        </div>
      </div>

      {/* Verified Failures */}
      <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#EADECE] shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Verified Failure
          </span>
          <XCircle className="w-4 h-4 text-[#E11D48]" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-[#E11D48]">
            {verifiedFailureCount}
          </span>
          <span className="text-[10px] text-[#E11D48]">Failure Records</span>
        </div>
      </div>

      {/* Unverified Proposals */}
      <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#EADECE] shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Unverified
          </span>
          <AlertTriangle className="w-4 h-4 text-[#D97706]" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-[#D97706]">
            {unverifiedCount}
          </span>
          <span className="text-[10px] text-[#D97706]">Pending Evaluation</span>
        </div>
      </div>

      {/* Lessons Persisted */}
      <div className="col-span-2 md:col-span-1 p-3.5 rounded-xl bg-[#FFFFFF] border border-[#EADECE] shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider">
            Lessons Persisted
          </span>
          <Database className="w-4 h-4 text-[#2563EB]" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-[#1E3A8A]">
            {lessonsPersistedCount}
          </span>
          <span className="text-[10px] text-[#2563EB] font-medium">
            {databaseConnected ? 'In FalkorDB' : 'Store Degraded'}
          </span>
        </div>
      </div>
    </div>
  );
};
