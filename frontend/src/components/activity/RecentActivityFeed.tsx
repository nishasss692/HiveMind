import React from 'react';
import {
  GitCommit,
  Clock,
  RefreshCw,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
} from 'lucide-react';
import type { ActivityItem } from '../../types/api';

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  onSelectActivity: (activity: ActivityItem) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onViewAll?: () => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  onSelectActivity,
  onRefresh,
  isLoading,
  onViewAll,
}) => {
  return (
    <section className="bg-[#FFFFFF] rounded-2xl border border-[#EADECE] shadow-sm p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EADECE]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#0F172A] tracking-tight">
            Recent Causal Memory Ingests
          </h2>
          <p className="text-xs text-[#64748B]">
            Autonomous solver proposals &amp; DAG commits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-[#EADECE] hover:bg-[#F7F4EE] text-[#64748B] hover:text-[#1E3A8A] transition-colors"
            title="Refresh Ingests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#F7F4EE] border border-[#EADECE] text-[#475569]">
            Live Stream
          </span>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && activities.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#EADECE] animate-pulse space-y-2"
            >
              <div className="h-4 bg-[#EADECE]/60 rounded w-1/3" />
              <div className="h-5 bg-[#EADECE]/40 rounded w-3/4" />
              <div className="h-3 bg-[#EADECE]/30 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Cards List */}
      <div className="space-y-3">
        {activities.map((item) => (
          <article
            key={item.id}
            onClick={() => onSelectActivity(item)}
            className="p-3.5 rounded-xl bg-[#FBF9F5] hover:bg-[#FFFFFF] border border-[#EADECE] hover:border-[#CBD5E1] hover:shadow-card transition-all cursor-pointer group"
          >
            {/* Top row: Task ID & Status */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#1E3A8A]">
                  {item.taskId}
                </span>
                <span className="text-[#64748B] text-xs">•</span>
                <span className="font-mono text-[11px] text-[#64748B] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.timestamp}
                </span>
              </div>

              {/* Status Badge */}
              {item.status === 'VERIFIED_SUCCESS' && (
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                  VERIFIED_SUCCESS
                </span>
              )}
              {item.status === 'VERIFIED_FAILURE' && (
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-[#E11D48]" />
                  VERIFIED_FAILURE
                </span>
              )}
              {item.status === 'UNVERIFIED' && (
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                  UNVERIFIED
                </span>
              )}
            </div>

            {/* Title & Description */}
            <h3 className="text-xs sm:text-sm font-semibold text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors mb-1.5 leading-snug">
              {item.title}
            </h3>
            <p className="text-xs text-[#475569] mb-3 leading-relaxed line-clamp-2">
              {item.description}
            </p>

            {/* Bottom Row */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EADECE]/70 text-xs font-mono text-[#64748B]">
              <span className="flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-[#2563EB]" />
                +{item.edgesCount} Causal Edges
              </span>
              <span className="text-[#059669] font-medium">
                {item.pytestSummary}
              </span>
            </div>
          </article>
        ))}

        {activities.length === 0 && !isLoading && (
          <div className="p-8 text-center bg-[#FBF9F5] rounded-xl border border-dashed border-[#EADECE]">
            <GitCommit className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <div className="text-xs font-semibold text-[#0F172A]">No Ingestion Records Yet</div>
            <p className="text-xs text-[#64748B] mt-1">
              Submit your first task to see real-time causal memory graphs and DAG commits.
            </p>
          </div>
        )}
      </div>

      {/* Ingest Feed Action */}
      <button
        onClick={onViewAll}
        className="w-full py-2.5 rounded-xl border border-dashed border-[#EADECE] hover:border-[#1E3A8A] bg-[#F7F4EE]/60 hover:bg-[#FFFFFF] text-xs font-medium text-[#475569] hover:text-[#1E3A8A] transition-all flex items-center justify-center gap-2"
      >
        <History className="w-4 h-4" />
        <span>View Ingestion Logs &amp; Proposals</span>
      </button>
    </section>
  );
};
