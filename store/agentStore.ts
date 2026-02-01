import { create } from 'zustand';

export type Agent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  model: string;
};

type AgentState = {
  currentAgentId: string;
  availableAgents: Agent[];
  setCurrentAgent: (id: string) => void;
  getAgentInfo: (id: string) => Agent | undefined;
};

const DEFAULT_AGENTS: Agent[] = [
  { id: 'fast', name: '快速 Agent', description: '响应迅速，适合简单任务', icon: '⚡', badge: '推荐', model: 'deepseek-chat' },
  { id: 'reasoning', name: '深度思考', description: 'DeepSeek-R1 强推理模式', icon: '🧠', model: 'deepseek-reasoner' },
  { id: 'medical', name: 'Med-Go 医学', description: '专业医学知识库与诊断', icon: '🏥', badge: '专业', model: 'deepseek-chat' },
];

export const useAgentStore = create<AgentState>((set, get) => ({
  currentAgentId: 'fast',
  availableAgents: DEFAULT_AGENTS,
  setCurrentAgent: (id) => set({ currentAgentId: id }),
  getAgentInfo: (id) => get().availableAgents.find((a) => a.id === id),
}));
