// 患者相关类型定义

export type Gender = '男' | '女';

export type MDTStatus = 'ongoing' | 'completed' | 'not_started';

export type DiagnosisType = '主要诊断' | '其他诊断';

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Patient {
  id: string;
  name: string;
  avatar?: string;
  admissionNumber: string; // 住院号
  gender: Gender;
  age: number;
  birthDate: string;
  ethnicity: string; // 民族
  maritalStatus: string; // 婚姻状况
  occupation: string; // 职业
  phone: string;
  emergencyContact: EmergencyContact;
  address: string;
  department: string; // 科室
  ward: string; // 病区
  bed: string; // 床位
  admissionDate: string; // 入院日期
  primaryDoctor: string; // 主管医生
  primaryDoctorDept: string; // 主管医生科室
  primaryDiagnosis: string; // 主要诊断
  relatedDepartments: string[]; // 相关科室
  mdtStatus: MDTStatus;
  createdAt: string;
  medicalSummary: string; // 病情摘要
  pastHistory: string; // 既往史
  admissionVitals: string; // 入院体征
}

export interface PatientDiagnosis {
  id: string;
  patientId: string;
  type: DiagnosisType;
  name: string;
  date: string;
}

export interface MDTSession {
  id: string;
  code: string; // MDT编号
  patientId: string;
  applicantDept: string; // 申请科室
  host: string; // 主持人
  hostTitle: string; // 主持人职称
  startTime: string;
  participatingDepts: string[]; // 参会科室
  status: 'ongoing' | 'completed' | 'scheduled';
}

export interface PatientStatistics {
  total: number;
  totalChange: number; // 本月变化
  ongoingMDT: number;
  ongoingMDTNew: number; // 新会数
  completedMDT: number;
  completedMDTChange: number; // 本月变化
  notStartedMDT: number;
}

export interface PatientFilters {
  department: string;
  disease: string;
  dateRange: [string, string] | null;
  status: string;
}

export interface PatientPagination {
  page: number;
  pageSize: number;
  total: number;
}

// 患者列表项（用于表格显示）
export interface PatientListItem {
  id: string;
  name: string;
  avatar?: string;
  admissionNumber: string;
  primaryDiagnosis: string;
  primaryDoctor: string;
  relatedDepartments: string[];
  mdtStatus: MDTStatus;
  createdAt: string;
}
