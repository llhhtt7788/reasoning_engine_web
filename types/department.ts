// 科室能力库类型定义

/** 六维能力维度 */
export interface CapabilityScores {
  diagnosticAccuracy: number;    // 诊断准确度
  solutionInnovation: number;    // 方案创新性
  riskControl: number;           // 风险控制力
  collaborationSpeed: number;    // 协作响应速度
  imagingAnalysis: number;       // 影像分析能力
  treatmentPlanning: number;     // 综合治疗规划
}

/** 能力维度标签（雷达图用） */
export const CAPABILITY_LABELS: (keyof CapabilityScores)[] = [
  'diagnosticAccuracy',
  'solutionInnovation',
  'riskControl',
  'collaborationSpeed',
  'imagingAnalysis',
  'treatmentPlanning',
];

export const CAPABILITY_LABEL_CN: Record<keyof CapabilityScores, string> = {
  diagnosticAccuracy: '诊断准确度',
  solutionInnovation: '方案创新性',
  riskControl: '风险控制力',
  collaborationSpeed: '协作响应速度',
  imagingAnalysis: '影像分析能力',
  treatmentPlanning: '综合治疗规划',
};

/** 月度决策数据 */
export interface MonthlyDecisionData {
  month: string;
  adoptionRate: number;      // 采纳率 %
  participationCount: number; // 参与次数
}

/** 知识图谱节点 */
export interface KnowledgeNode {
  id: string;
  name: string;
  category: number; // 0=科室, 1=疾病, 2=检查
  symbolSize: number;
  value: number;
}

/** 知识图谱边 */
export interface KnowledgeEdge {
  source: string;
  target: string;
}

/** 科室完整数据 */
export interface Department {
  id: string;
  name: string;
  hospital: string;      // 所属医院
  icon: string;
  color: string;         // 主色 hex
  bgColor: string;       // 背景色 tailwind class
  description: string;
  headDoctor: string;
  memberCount: number;
  aiScore: number;        // AI 综合评分
  capability: CapabilityScores;
  monthlyDecisions: MonthlyDecisionData[];
  knowledgeNodes: KnowledgeNode[];
  knowledgeEdges: KnowledgeEdge[];
  specialties: string[];  // 专长领域
  recentCases: number;    // 近期案例数
}

/** 匹配结果项 */
export interface MatchResult {
  departmentId: string;
  score: number;
  reason: string;
}

/** 页面模式 */
export type DepartmentPageMode = 'overview' | 'detail' | 'matching' | 'matchResult';
