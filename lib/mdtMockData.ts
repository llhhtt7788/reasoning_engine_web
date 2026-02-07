import type {
  MDTTask,
  DepartmentActivity,
  DecisionAnalytics,
  MDTStatistics,
  SearchSuggestion,
  DeepMetrics,
} from '@/types/mdt';
import { mockDepartments } from '@/lib/departmentMockData';

export const mockMDTStatistics: MDTStatistics = {
  ongoingMDTCount: 12,
  weeklyIncrease: 3,
  trendData: [8, 9, 10, 11, 10, 11, 12],
};

// 从真实科室数据生成 10 个 DepartmentActivity
export const mockDepartmentActivities: DepartmentActivity[] = mockDepartments.map((dept) => {
  const cap = dept.capability;
  const avg = Math.round(
    (cap.diagnosticAccuracy +
      cap.solutionInnovation +
      cap.riskControl +
      cap.collaborationSpeed +
      cap.imagingAnalysis +
      cap.treatmentPlanning) / 6
  );
  return {
    id: dept.id,
    name: dept.name,
    icon: dept.icon,
    color: dept.color,
    activityRate: avg,
    departmentId: dept.id,
    contributionCases: [
      `参与决策 ${dept.recentCases} 例`,
      `采纳率 ${dept.monthlyDecisions[dept.monthlyDecisions.length - 1].adoptionRate}%`,
      `AI 评分 ${dept.aiScore}`,
      `团队 ${dept.memberCount} 人`,
    ],
  };
});

export const mockMDTTasks: MDTTask[] = [
  {
    id: '1',
    patientName: '李建国',
    urgency: 'urgent',
    gender: '男',
    age: 68,
    admissionNumber: 'ZY2023051289',
    description: '肝占位性病变',
    departments: ['胰腺科', '重症医学科', '心内科'],
    status: '待外科讨论',
    statusColor: 'yellow',
    createdAt: '2023-05-12 09:30',
    deadline: '2023-05-12 18:00',
  },
  {
    id: '2',
    patientName: '王秀兰',
    urgency: 'normal',
    gender: '女',
    age: 54,
    admissionNumber: 'ZY2023051045',
    description: '胃癌术后化疗方案',
    departments: ['乳腺科', '全科医学科', '健康管理科'],
    status: '待多科协同',
    statusColor: 'blue',
    createdAt: '2023-05-10 14:15',
    deadline: '2023-05-15 12:00',
  },
  {
    id: '3',
    patientName: '张伟明',
    urgency: 'urgent',
    gender: '男',
    age: 72,
    admissionNumber: 'ZY2023050912',
    description: '肝占位性病变',
    departments: ['胰腺科', '眼科', '老年病科'],
    status: '待病理科分析',
    statusColor: 'purple',
    createdAt: '2023-05-09 16:40',
    deadline: '2023-05-10 08:00',
  },
];

export const mockDecisionAnalytics: DecisionAnalytics = {
  consensusRate: 68,
  qualityDistribution: [
    { department: '乳腺科', percentage: 35, color: '#DC2626' },
    { department: '胰腺科', percentage: 21, color: '#EA580C' },
    { department: '重症医学科', percentage: 14, color: '#2563EB' },
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
  ...mockDepartments.map((d) => d.name),
];

export const mockDeepMetrics: DeepMetrics = {
  guidelineDeviationAlert: 8.3,
  timeToConsensus: 4.2,
  secondReviewCorrectionRate: 12.5,
  reasoningComputeShare: 67,
};

export const mockSearchSuggestions: SearchSuggestion[] = [
  { keyword: '乳腺癌', category: '疾病', matchCount: 8 },
  { keyword: '胰腺癌', category: '疾病', matchCount: 7 },
  { keyword: '冠心病', category: '疾病', matchCount: 6 },
  { keyword: '前列腺癌', category: '疾病', matchCount: 5 },
  { keyword: '视网膜脱离', category: '疾病', matchCount: 4 },
  { keyword: '疟疾', category: '疾病', matchCount: 6 },
  { keyword: '糖尿病', category: '疾病', matchCount: 7 },
  { keyword: '保乳手术', category: '手术', matchCount: 3 },
  { keyword: '达芬奇机器人手术', category: '手术', matchCount: 2 },
  { keyword: '胸闷气短', category: '症状', matchCount: 4 },
  { keyword: '血糖升高', category: '症状', matchCount: 5 },
];
