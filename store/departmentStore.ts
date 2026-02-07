import { create } from 'zustand';
import type { Department, MatchResult, DepartmentPageMode } from '@/types/department';
import { mockDepartments, getMatchResults } from '@/lib/departmentMockData';

interface DepartmentStore {
  // 数据
  departments: Department[];
  selectedDepartment: Department | null;
  mode: DepartmentPageMode;

  // 匹配状态
  matchQuery: string;
  isMatching: boolean;
  matchProgress: number;
  matchResults: MatchResult[];

  // Actions
  selectDepartment: (id: string) => void;
  clearSelection: () => void;
  goBack: () => void;
  startMatching: (query: string) => void;
  clearMatching: () => void;
  setMode: (mode: DepartmentPageMode) => void;
}

export const useDepartmentStore = create<DepartmentStore>((set, get) => ({
  departments: mockDepartments,
  selectedDepartment: null,
  mode: 'overview',

  matchQuery: '',
  isMatching: false,
  matchProgress: 0,
  matchResults: [],

  selectDepartment: (id: string) => {
    const dept = mockDepartments.find((d) => d.id === id) ?? null;
    set({ selectedDepartment: dept, mode: 'detail' });
  },

  clearSelection: () => {
    set({ selectedDepartment: null, mode: 'overview' });
  },

  goBack: () => {
    const { matchResults } = get();
    if (matchResults.length > 0) {
      set({ selectedDepartment: null, mode: 'matchResult' });
    } else {
      set({ selectedDepartment: null, mode: 'overview' });
    }
  },

  startMatching: (query: string) => {
    if (!query.trim()) return;
    set({ matchQuery: query, isMatching: true, matchProgress: 0, mode: 'matching', matchResults: [] });

    // 模拟进度动画
    const interval = setInterval(() => {
      const { matchProgress, isMatching } = get();
      if (!isMatching) {
        clearInterval(interval);
        return;
      }
      if (matchProgress >= 100) {
        clearInterval(interval);
        const results = getMatchResults(query);
        set({ isMatching: false, matchProgress: 100, matchResults: results, mode: 'matchResult' });
        return;
      }
      set({ matchProgress: Math.min(100, matchProgress + 3) });
    }, 50);
  },

  clearMatching: () => {
    set({
      matchQuery: '',
      isMatching: false,
      matchProgress: 0,
      matchResults: [],
      mode: 'overview',
    });
  },

  setMode: (mode: DepartmentPageMode) => set({ mode }),
}));
