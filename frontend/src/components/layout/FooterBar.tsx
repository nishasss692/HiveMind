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
          <span className="font-medium text-slate-600">
            HiveMind — Evidence-Backed Collective Graph Memory for AI Coding Agents
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-[#64748B]">Engine v{health?.version || '1.0.0'}</span>
          <span className="text-[#1E3A8A] font-semibold">Autonomous Core</span>
        </div>
      </div>
    </footer>
  );
};
