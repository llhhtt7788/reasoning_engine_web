import { create } from 'zustand';
import type {
  MDTTask,
  DepartmentActivity,
  DecisionAnalytics,
  MDTStatistics,
} from '@/types/mdt';
import {
  mockMDTStatistics,
  mockDepartmentActivities,
  mockMDTTasks,
  mockDecisionAnalytics,
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
  
  // 加载状态
  isLoading: boolean;
  
  // Actions
  setSelectedDepartment: (dept: string) => void;
  filterTasksByDepartment: (dept: string) => void;
  loadMoreTasks: () => void;
  fetchMDTData: () => Promise<void>;
}

export const useMDTStore = create<MDTStore>((set, get) => ({
  // 初始状态
  statistics: mockMDTStatistics,
  departmentActivities: mockDepartmentActivities,
  tasks: mockMDTTasks,
  allTasks: mockMDTTasks,
  selectedDepartment: '全部科室',
  decisionAnalytics: mockDecisionAnalytics,
  isLoading: false,
  
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
    // TODO: 实现分页加载
    console.log('加载更多任务...');
  },
  
  // 获取MDT数据
  fetchMDTData: async () => {
    set({ isLoading: true });
    try {
      // TODO: 替换为真实API调用
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({
        statistics: mockMDTStatistics,
        departmentActivities: mockDepartmentActivities,
        tasks: mockMDTTasks,
        allTasks: mockMDTTasks,
        decisionAnalytics: mockDecisionAnalytics,
        isLoading: false,
      });
    } catch (error) {
      console.error('获取MDT数据失败:', error);
      set({ isLoading: false });
    }
  },
}));
