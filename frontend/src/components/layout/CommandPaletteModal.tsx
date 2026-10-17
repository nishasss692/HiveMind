import React, { useState, useEffect } from 'react';
import { Search, X, Network, FileCode2, Database } from 'lucide-react';
import type { GraphNode, ActivityItem } from '../../types/api';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  onSelectNode: (node: GraphNode) => void;
  activities: ActivityItem[];
  onSelectActivity: (activity: ActivityItem) => void;
  onOpenNewProposal: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
  activities,
  onSelectActivity,
  onOpenNewProposal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNodes = nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(query.toLowerCase()) ||
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.cluster.toLowerCase().includes(query.toLowerCase())
  );

  const filteredActivities = activities.filter(
    (a) =>
      a.taskId.toLowerCase().includes(query.toLowerCase()) ||
      a.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-[#EADECE] shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-[#EADECE]">
          <Search className="w-5 h-5 text-[#64748B] mr-3" />
          <input
            autoFocus
            type="text"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#64748B] text-[#0F172A]"
            placeholder="Search causal nodes, tasks, proposals, or fixtures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F7F4EE] rounded text-[#64748B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {/* Action shortcut */}
          <button
            onClick={() => {
              onClose();
              onOpenNewProposal();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F7F4EE] transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#1E3A8A] flex items-center justify-center text-white">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1E3A8A]">
                Create New Proposal
              </div>
              <div className="text-[11px] text-[#64748B]">
                Submit an engineering task to Gemini solver &amp; FalkorDB
              </div>
            </div>
          </button>

          {/* Graph Nodes */}
          {filteredNodes.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase text-[#64748B]">
                Graph Memory Nodes
              </div>
              {filteredNodes.slice(0, 5).map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F4EE] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Network className="w-4 h-4 text-[#2563EB]" />
                    <div>
                      <div className="text-xs font-medium text-[#0F172A]">
                        {node.label}: {node.title}
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono">
                        {node.cluster}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      node.status === 'VERIFIED_SUCCESS'
                        ? 'bg-[#ECFDF5] text-[#059669]'
                        : node.status === 'VERIFIED_FAILURE'
                        ? 'bg-[#FFF1F2] text-[#E11D48]'
                        : 'bg-[#FFFBEB] text-[#D97706]'
                    }`}
                  >
                    {node.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Ingests */}
          {filteredActivities.length > 0 && (
            <div className="pt-2">
              <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase text-[#64748B]">
                Recent Ingests &amp; Tasks
              </div>
              {filteredActivities.slice(0, 4).map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => {
                    onSelectActivity(activity);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F4EE] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-[#1E3A8A]" />
                    <div>
                      <div className="text-xs font-medium text-[#0F172A]">
                        {activity.taskId}: {activity.title}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {activity.pytestSummary}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#64748B]">
                    {activity.timestamp}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredNodes.length === 0 && filteredActivities.length === 0 && (
            <div className="p-6 text-center text-xs text-[#64748B]">
              No nodes or activities matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#EADECE] bg-[#F7F4EE] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Use &uarr; &darr; to navigate</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-[#EADECE] rounded">
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  );
};
