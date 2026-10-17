import React from 'react';
import type { HealthResponse } from '../../types/api';

interface FooterBarProps {
  health: HealthResponse | null;
}

export const FooterBar: React.FC<FooterBarProps> = ({ health }) => {
  return (
    <footer className="mt-auto w-full bg-[#FFFFFF] border-t border-[#EADECE] py-3 z-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-[#059669]' : 'bg-[#D97706]'
              }`}
            />
            <span>Swarm Status: {health?.status === 'healthy' ? 'Optimal' : 'Checking'}</span>
          </span>
          <span>•</span>
          <span className="truncate">
            FalkorDB Memory Graph: {health?.database_connected ? 'Connected to local swarm' : 'Degraded connection'}
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-[#64748B]">HiveMind API v{health?.version || '1.0.0'}</span>
          <span className="text-[#1E3A8A] font-semibold">Active Engine</span>
        </div>
      </div>
    </footer>
  );
};
