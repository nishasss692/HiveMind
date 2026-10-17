import React from 'react';
import {
  Search,
  Play,
  Share2,
  GitCommit,
  ShieldCheck,
  AlertOctagon,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import type { HealthResponse } from '../../types/api';

export type WorkbenchTab = 'graph' | 'timeline' | 'trust' | 'failures' | 'transfer' | 'proposals';

interface TopNavBarProps {
  currentTab: WorkbenchTab;
  onSelectTab: (tab: WorkbenchTab) => void;
  onOpenNewProposal: () => void;
  onOpenSearch: () => void;
  health: HealthResponse | null;
  isHealthLoading: boolean;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewProposal,
  onOpenSearch,
}) => {

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#EADECE]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand & Search */}
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            onClick={() => onSelectTab('graph')}
            className="flex items-center gap-2.5 focus:outline-none group text-left"
          >
            {/* Distinctive Neural-Branching HiveMind Mark */}
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-white"
              >
                <circle cx="12" cy="12" r="3" fill="#FFFFFF" fillOpacity="0.2" />
                <circle cx="12" cy="4" r="2" />
                <circle cx="4" cy="18" r="2" />
                <circle cx="20" cy="18" r="2" />
                <path d="M12 6v3" />
                <path d="M10.5 13.5L5.5 16.5" />
                <path d="M13.5 13.5L18.5 16.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-[#0F172A] tracking-tight">
                  HiveMind
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide bg-[#F5EFEB] text-[#1E3A8A] border border-[#EADECE]">
                  WORKBENCH
                </span>
              </div>
            </div>
          </button>

          {/* Quick Search Bar Affordance */}
          <button
            onClick={onOpenSearch}
            className="relative hidden lg:flex items-center w-52 xl:w-60 bg-[#F7F4EE] hover:bg-[#FFFFFF] text-[#0F172A] text-xs pl-8 pr-10 py-1.5 rounded-lg border border-[#EADECE] focus:border-[#2563EB] transition-all text-left group"
          >
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#64748B] group-hover:text-[#1E3A8A]" />
            <span className="text-[#64748B] truncate text-[11px]">Search memory (⌘K)</span>
            <kbd className="absolute right-2 top-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#FFFFFF] border border-[#EADECE] text-[#64748B]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Center: Workbench Modular Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-4 h-full text-xs sm:text-sm font-medium">
          {/* Feature 1: 3D Memory Explorer */}
          <button
            onClick={() => onSelectTab('graph')}
            className={`py-4 transition-colors flex items-center gap-1.5 border-b-2 text-xs sm:text-sm whitespace-nowrap ${
              currentTab === 'graph'
                ? 'text-[#1E3A8A] font-bold border-[#1E3A8A]'
                : 'text-[#64748B] hover:text-[#0F172A] border-transparent'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>3D Memory</span>
          </button>

          {/* Feature 2: Reasoning Timeline */}
          <button
            onClick={() => onSelectTab('timeline')}
            className={`py-4 transition-colors flex items-center gap-1.5 border-b-2 text-xs sm:text-sm whitespace-nowrap ${
              currentTab === 'timeline'
                ? 'text-[#1E3A8A] font-bold border-[#1E3A8A]'
                : 'text-[#64748B] hover:text-[#0F172A] border-transparent'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Learning Run</span>
          </button>

          {/* Feature 3: Evidence & Trust */}
          <button
            onClick={() => onSelectTab('trust')}
            className={`py-4 transition-colors flex items-center gap-1.5 border-b-2 text-xs sm:text-sm whitespace-nowrap ${
              currentTab === 'trust'
                ? 'text-[#1E3A8A] font-bold border-[#1E3A8A]'
                : 'text-[#64748B] hover:text-[#0F172A] border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evidence &amp; Trust</span>
          </button>

          {/* Feature 4: Failure Intelligence */}
          <button
            onClick={() => onSelectTab('failures')}
            className={`py-4 transition-colors flex items-center gap-1.5 border-b-2 text-xs sm:text-sm whitespace-nowrap ${
              currentTab === 'failures'
                ? 'text-[#1E3A8A] font-bold border-[#1E3A8A]'
                : 'text-[#64748B] hover:text-[#0F172A] border-transparent'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-[#E11D48]" />
            <span>Failure Intelligence</span>
          </button>

          {/* Feature 5: Memory Reuse Transfer */}
          <button
            onClick={() => onSelectTab('transfer')}
            className={`py-4 transition-colors flex items-center gap-1.5 border-b-2 text-xs sm:text-sm whitespace-nowrap ${
              currentTab === 'transfer'
                ? 'text-[#1E3A8A] font-bold border-[#1E3A8A]'
                : 'text-[#64748B] hover:text-[#0F172A] border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Learning Transfer</span>
          </button>

          {/* Proposals Ledger */}
          <button
            onClick={() => onSelectTab('proposals')}
            className={`hidden md:flex py-4 transition-colors items-center gap-1.5 border-b-2 text-xs sm:text-sm whitespace-nowrap ${
              currentTab === 'proposals'
                ? 'text-[#1E3A8A] font-bold border-[#1E3A8A]'
                : 'text-[#64748B] hover:text-[#0F172A] border-transparent'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Ledger</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Primary Action Button */}
          <button
            onClick={onOpenNewProposal}
            className="flex items-center gap-1.5 bg-[#1E3A8A] hover:bg-[#2563EB] active:scale-95 text-white px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium shadow-xs transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="font-semibold whitespace-nowrap">New Run</span>
          </button>
        </div>
      </div>
    </header>
  );
};
