// MDT工作台相关类型定义

export interface MDTTask {
  id: string;
  patientName: string;
  urgency: 'urgent' | 'normal';
  gender: '男' | '女';
  age: number;
  admissionNumber: string;
  description: string;
  departments: string[];
  status: string;
  statusColor: string;
  createdAt: string;
  deadline?: string;
}

export interface DepartmentActivity {
  id: string;
  name: string;
  icon: string;
  color: string;
  activityRate: number;
  departmentId?: string;
  contributionCases?: string[];
}

export interface SearchSuggestion {
  keyword: string;
  category: '疾病' | '症状' | '手术';
  matchCount: number;
}

export interface DeepMetrics {
  guidelineDeviationAlert: number;
  timeToConsensus: number;
  secondReviewCorrectionRate: number;
  reasoningComputeShare: number;
}

export interface QualityDistribution {
  department: string;
  percentage: number;
  color: string;
}

export interface EfficiencyTrendPoint {
  week: string;
  value: number;
}

export interface KeyMetrics {
  avgDecisionTime: number;
  dailyChange: number;
  participationRate: number;
}

export interface DecisionAnalytics {
  qualityDistribution: QualityDistribution[];
  efficiencyTrend: EfficiencyTrendPoint[];
  keyMetrics: KeyMetrics;
  consensusRate: number;
}

export interface MDTStatistics {
  ongoingMDTCount: number;
  weeklyIncrease: number;
  trendData: number[];
}
