import React from 'react';
import {
  Search,
  Play,
  ChevronRight
} from 'lucide-react';
import type { NavRoute } from './Sidebar';

interface AppHeaderProps {
  currentRoute: NavRoute;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNewRun: () => void;
}

const ROUTE_LABELS: Record<NavRoute, { section: string; title: string }> = {
  graph: { section: 'Workspace', title: '3D Memory Graph Explorer' },
  timeline: { section: 'Workspace', title: 'Agent Reasoning Timeline' },
  overview: { section: 'Workspace', title: 'Workbench Overview' },
  failures: { section: 'Intelligence', title: 'Failure Intelligence' },
  transfer: { section: 'Intelligence', title: 'Memory Reuse Lab' },
  trust: { section: 'Intelligence', title: 'Evidence & Trust Inspector' },
  proposals: { section: 'Activity & Tools', title: 'Canonical Proposals Ledger' },
  verifications: { section: 'Activity & Tools', title: 'Empirical Verification Audit' },
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentRoute,
  isSidebarOpen,
  onToggleSidebar,
  onOpenSearch,
  onOpenNewRun,
}) => {
  const currentMeta = ROUTE_LABELS[currentRoute] || { section: 'HiveMind', title: 'Workbench' };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#EADECE]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Animated 3-Bar Hamburger Button & Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
          {/* Animated Hamburger Button */}
          <button
            onClick={onToggleSidebar}
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
            className="w-9 h-9 rounded-xl border border-[#EADECE] bg-[#F7F4EE] hover:bg-white flex flex-col items-center justify-center gap-1 p-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all shrink-0 active:scale-95"
          >
            {/* Top Bar */}
            <span
              className={`w-4 h-0.5 bg-[#1E3A8A] rounded-full transition-all duration-300 ease-in-out transform origin-center ${
                isSidebarOpen ? 'rotate-45 translate-y-1.5' : ''
              }`}
            />
            {/* Middle Bar */}
            <span
              className={`w-4 h-0.5 bg-[#1E3A8A] rounded-full transition-all duration-200 ease-in-out ${
                isSidebarOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
              }`}
            />
            {/* Bottom Bar */}
            <span
              className={`w-4 h-0.5 bg-[#1E3A8A] rounded-full transition-all duration-300 ease-in-out transform origin-center ${
                isSidebarOpen ? '-rotate-45 -translate-y-1.5' : ''
              }`}
            />
          </button>

          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">
              {currentMeta.section}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
            <h2 className="text-sm font-bold text-[#0F172A] truncate tracking-tight">
              {currentMeta.title}
            </h2>
          </div>
        </div>

        {/* Center: Quick Search Affordance */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between bg-[#F7F4EE] hover:bg-white text-slate-700 text-xs px-3 py-1.5 rounded-xl border border-[#EADECE] focus:border-[#2563EB] transition-all group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1E3A8A]" />
              <span className="text-slate-500 truncate text-[11px]">
                Search causal DAG, lessons, pytest traces...
              </span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-[#EADECE] text-slate-500 shadow-2xs shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Search & Action CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Mobile Search Icon */}
          <button
            onClick={onOpenSearch}
            className="md:hidden w-8 h-8 rounded-lg border border-[#EADECE] bg-[#F7F4EE] flex items-center justify-center text-slate-600"
            aria-label="Search memory"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenNewRun}
            className="flex items-center gap-1.5 bg-[#1E3A8A] hover:bg-[#2563EB] active:scale-95 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="font-semibold whitespace-nowrap">New Run</span>
          </button>
        </div>
      </div>
    </header>
  );
};
