'use client';

import React from 'react';
import clsx from 'clsx';
import { useAgentStore } from '@/store/agentStore';

export const AgentSelectionPanel: React.FC = () => {
  const { availableAgents, currentAgentId, setCurrentAgent } = useAgentStore();

  return (
    <aside className="w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex-col h-full hidden xl:flex">
      <div className="p-5 border-b border-gray-200 bg-white">
        <h2 className="font-semibold text-gray-800">选择 Agent</h2>
        <p className="text-xs text-gray-500 mt-1">切换不同的推理模式与能力</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {availableAgents.map((agent) => {
          const isSelected = currentAgentId === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => setCurrentAgent(agent.id)}
              className={clsx(
                'w-full p-3 rounded-xl border-2 text-left transition-all duration-200 relative',
                isSelected
                  ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-100/50'
                  : 'border-transparent bg-white hover:border-gray-200 shadow-sm'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl bg-gray-50 p-2 rounded-lg">{agent.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{agent.name}</span>
                    {agent.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md">
                        {agent.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{agent.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
