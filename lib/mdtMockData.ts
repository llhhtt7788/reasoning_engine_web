import type {
  MDTTask,
  DepartmentActivity,
  DecisionAnalytics,
  MDTStatistics,
} from '@/types/mdt';

export const mockMDTStatistics: MDTStatistics = {
  ongoingMDTCount: 12,
  weeklyIncrease: 3,
  trendData: [8, 9, 10, 11, 10, 11, 12],
};

export const mockDepartmentActivities: DepartmentActivity[] = [
  {
    id: '1',
    name: '影像科分析',
    icon: '🔬',
    color: 'blue',
    activityRate: 90,
  },
  {
    id: '2',
    name: '病理科分析',
    icon: '🧬',
    color: 'purple',
    activityRate: 90,
  },
  {
    id: '3',
    name: '外科决策',
    icon: '⚕️',
    color: 'green',
    activityRate: 90,
  },
  {
    id: '4',
    name: '内科治疗规划',
    icon: '💊',
    color: 'orange',
    activityRate: 60,
  },
  {
    id: '5',
    name: '麻醉/ICU风险评估',
    icon: '🏥',
    color: 'red',
    activityRate: 60,
  },
];

export const mockMDTTasks: MDTTask[] = [
  {
    id: '1',
    patientName: '李建国',
    urgency: 'urgent',
    gender: '男',
    age: 68,
    admissionNumber: 'ZY2023051289',
    description: '肝占位性病变',
    departments: ['影像科', '病理科', '外科'],
    status: '待外科讨论',
    statusColor: 'yellow',
    createdAt: '2023-05-12 09:30',
  },
  {
    id: '2',
    patientName: '王秀兰',
    urgency: 'normal',
    gender: '女',
    age: 54,
    admissionNumber: 'ZY2023051045',
    description: '胃癌术后化疗方案',
    departments: ['病理科', '内科', '放疗科'],
    status: '待多科协同',
    statusColor: 'blue',
    createdAt: '2023-05-10 14:15',
  },
  {
    id: '3',
    patientName: '张伟明',
    urgency: 'urgent',
    gender: '男',
    age: 72,
    admissionNumber: 'ZY2023050912',
    description: '肝占位性病变',
    departments: ['影像科', '病理科', '介入科'],
    status: '待病理科分析',
    statusColor: 'purple',
    createdAt: '2023-05-09 16:40',
  },
];

export const mockDecisionAnalytics: DecisionAnalytics = {
  consensusRate: 68,
  qualityDistribution: [
    { department: '影像科', percentage: 35, color: '#3B82F6' },
    { department: '病理科', percentage: 21, color: '#A855F7' },
    { department: '外科', percentage: 14, color: '#10B981' },
    { department: '其他', percentage: 30, color: '#9CA3AF' },
  ],
  efficiencyTrend: [
    { week: '第1周', value: 45 },
    { week: '第2周', value: 52 },
    { week: '第3周', value: 58 },
    { week: '第4周', value: 65 },
    { week: '第5周', value: 70 },
    { week: '第6周', value: 75 },
  ],
  keyMetrics: {
    avgDecisionTime: 36.5,
    dailyChange: -18,
    participationRate: 92,
  },
};

export const mockAllDepartments = [
  '全部科室',
  '影像科',
  '病理科',
  '外科',
  '内科',
  '放疗科',
  '介入科',
];
