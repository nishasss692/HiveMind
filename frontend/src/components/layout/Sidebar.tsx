import React from 'react';
import type { HealthResponse } from '../../types/api';

export type NavRoute =
  | 'graph'
  | 'timeline'
  | 'overview'
  | 'failures'
  | 'transfer'
  | 'trust'
  | 'proposals'
  | 'verifications';

interface NavItemDef {
  id: NavRoute;
  label: string;
  badge?: string | number;
}

interface NavSectionDef {
  title: string;
  items: NavItemDef[];
}

interface SidebarProps {
  currentRoute: NavRoute;
  onSelectRoute: (route: NavRoute) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  health: HealthResponse | null;
  counts?: {
    proposals?: number;
    failures?: number;
    verifications?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onSelectRoute,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  health,
  counts,
}) => {
  const sections: NavSectionDef[] = [
    {
      title: 'WORKSPACE',
      items: [
        {
          id: 'graph',
          label: 'Memory Graph',
        },
        {
          id: 'timeline',
          label: 'Learning Runs',
        },
        {
          id: 'overview',
          label: 'Overview',
        },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        {
          id: 'failures',
          label: 'Failure Intelligence',
          badge: counts?.failures ? `${counts.failures}` : undefined,
        },
        {
          id: 'transfer',
          label: 'Memory Reuse Lab',
        },
        {
          id: 'trust',
          label: 'Evidence & Trust',
        },
      ],
    },
    {
      title: 'ACTIVITY & TOOLS',
      items: [
        {
          id: 'proposals',
          label: 'Proposals',
          badge: counts?.proposals !== undefined && counts.proposals > 0 ? `${counts.proposals}` : undefined,
        },
        {
          id: 'verifications',
          label: 'Verifications',
          badge: counts?.verifications !== undefined && counts.verifications > 0 ? `${counts.verifications}` : undefined,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Solid Deep Dark Blue (#0c1938) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-xl border-r border-white/10 bg-[#0c1938] text-white ${
          isMobileOpen
            ? 'translate-x-0 w-72'
            : '-translate-x-full lg:translate-x-0 ' + (isCollapsed ? 'w-20' : 'w-64')
        }`}
        aria-label="Primary navigation sidebar"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Monogram Brand Mark (No Icons) */}
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0 font-bold text-sm text-[#60A5FA] font-mono shadow-inner">
              HM
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-base tracking-tight text-white font-sans">
                    HiveMind
                  </h1>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-blue-200 border border-white/10">
                    v{health?.version || '1.0.0'}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 truncate">
                  Collective Agent Memory
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden px-2.5 py-1 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
              aria-label="Close navigation sidebar"
            >
              Close
            </button>
          )}
        </div>

        {/* Navigation Categories Stream */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-3 pb-1 text-xs font-mono font-semibold tracking-wider text-blue-200/60 uppercase">
                  {section.title}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = currentRoute === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectRoute(item.id);
                        if (isMobileOpen) onCloseMobile();
                      }}
                      className={`group relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                        isActive
                          ? 'bg-white/15 text-white shadow-xs font-semibold ring-1 ring-white/20'
                          : 'text-blue-100/80 hover:text-white hover:bg-white/10 font-medium'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center px-2' : ''}`}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                    >
                      {/* Active Indicator Bar on Expanded */}
                      {isActive && (!isCollapsed || isMobileOpen) && (
                        <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#60A5FA]" />
                      )}

                      {(!isCollapsed || isMobileOpen) ? (
                        <>
                          <span className="truncate text-left text-[13.5px] sm:text-sm tracking-wide">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30">
                              {item.badge}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200">
                          {item.label.slice(0, 2)}
                        </span>
                      )}

                      {/* Collapsed Tooltip */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10 font-mono">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Collapse Control */}
        <div className="p-3 border-t border-white/10 bg-black/10">
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center p-2.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium tracking-wide"
            aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          >
            {isCollapsed ? 'Expand »' : '« Collapse Rail'}
          </button>
        </div>
      </aside>
    </>
  );
};
