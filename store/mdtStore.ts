import { create } from 'zustand';
import type {
  MDTTask,
  DepartmentActivity,
  DecisionAnalytics,
  MDTStatistics,
  DeepMetrics,
  SearchSuggestion,
} from '@/types/mdt';
import {
  mockMDTStatistics,
  mockDepartmentActivities,
  mockMDTTasks,
  mockDecisionAnalytics,
  mockDeepMetrics,
  mockSearchSuggestions,
} from '@/lib/mdtMockData';

interface MDTStore {
  // 统计数据
  statistics: MDTStatistics;

  // 科室活跃度
  departmentActivities: DepartmentActivity[];

  // 任务列表
  tasks: MDTTask[];
  allTasks: MDTTask[];
  selectedDepartment: string;

  // 决策分析
  decisionAnalytics: DecisionAnalytics;

  // 深度指标
  deepMetrics: DeepMetrics;

  // 搜索状态
  searchQuery: string;
  searchSuggestions: SearchSuggestion[];
  showSuggestions: boolean;
  isSearchMatching: boolean;
  searchMatchProgress: number;

  // 科室高亮联动
  highlightedDepartmentId: string | null;

  // 加载状态
  isLoading: boolean;

  // Actions
  setSelectedDepartment: (dept: string) => void;
  filterTasksByDepartment: (dept: string) => void;
  loadMoreTasks: () => void;
  fetchMDTData: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setShowSuggestions: (show: boolean) => void;
  startSearchMatching: () => void;
  clearSearch: () => void;
  setHighlightedDepartmentId: (id: string | null) => void;
}

export const useMDTStore = create<MDTStore>((set, get) => ({
  // 初始状态
  statistics: mockMDTStatistics,
  departmentActivities: mockDepartmentActivities,
  tasks: mockMDTTasks,
  allTasks: mockMDTTasks,
  selectedDepartment: '全部科室',
  decisionAnalytics: mockDecisionAnalytics,
  deepMetrics: mockDeepMetrics,
  isLoading: false,

  // 搜索状态
  searchQuery: '',
  searchSuggestions: mockSearchSuggestions,
  showSuggestions: false,
  isSearchMatching: false,
  searchMatchProgress: 0,

  // 科室高亮
  highlightedDepartmentId: null,

  // 设置选中的科室
  setSelectedDepartment: (dept: string) => {
    set({ selectedDepartment: dept });
    get().filterTasksByDepartment(dept);
  },

  // 按科室筛选任务
  filterTasksByDepartment: (dept: string) => {
    const { allTasks } = get();
    if (dept === '全部科室') {
      set({ tasks: allTasks });
    } else {
      const filtered = allTasks.filter((task) =>
        task.departments.includes(dept)
      );
      set({ tasks: filtered });
    }
  },

  // 加载更多任务
  loadMoreTasks: () => {
    console.log('加载更多任务...');
  },

  // 获取MDT数据
  fetchMDTData: async () => {
    set({ isLoading: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({
        statistics: mockMDTStatistics,
        departmentActivities: mockDepartmentActivities,
        tasks: mockMDTTasks,
        allTasks: mockMDTTasks,
        decisionAnalytics: mockDecisionAnalytics,
        deepMetrics: mockDeepMetrics,
        isLoading: false,
      });
    } catch (error) {
      console.error('获取MDT数据失败:', error);
      set({ isLoading: false });
    }
  },

  // 搜索相关
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setShowSuggestions: (show: boolean) => {
    set({ showSuggestions: show });
  },

  startSearchMatching: () => {
    const { searchQuery } = get();
    if (!searchQuery.trim()) return;
    set({ isSearchMatching: true, searchMatchProgress: 0 });

    const interval = setInterval(() => {
      const { searchMatchProgress, isSearchMatching } = get();
      if (!isSearchMatching) {
        clearInterval(interval);
        return;
      }
      if (searchMatchProgress >= 100) {
        clearInterval(interval);
        set({ isSearchMatching: false, searchMatchProgress: 100 });
        return;
      }
      set({ searchMatchProgress: Math.min(100, searchMatchProgress + 3) });
    }, 50);
  },

  clearSearch: () => {
    set({
      searchQuery: '',
      showSuggestions: false,
      isSearchMatching: false,
      searchMatchProgress: 0,
    });
  },

  setHighlightedDepartmentId: (id: string | null) => {
    set({ highlightedDepartmentId: id });
  },
}));
