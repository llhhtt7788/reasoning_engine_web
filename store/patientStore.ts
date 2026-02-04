import { create } from 'zustand';
import type {
  Patient,
  PatientDiagnosis,
  MDTSession,
  MDTReport,
  PatientStatistics,
  PatientFilters,
  PatientPagination,
  PatientListItem,
} from '@/types/patient';
import {
  mockPatients,
  mockDiagnoses,
  mockMDTSessions,
  mockMDTReports,
  mockPatientStatistics,
} from '@/lib/patientMockData';

interface PatientStore {
  // 数据
  patients: Patient[];
  allPatients: Patient[];
  selectedPatient: Patient | null;
  diagnoses: PatientDiagnosis[];
  mdtSessions: MDTSession[];
  mdtReports: MDTReport[];
  statistics: PatientStatistics;

  // 筛选和搜索
  searchKeyword: string;
  filters: PatientFilters;

  // 分页
  pagination: PatientPagination;

  // 加载状态
  isLoading: boolean;

  // Actions
  setSearchKeyword: (keyword: string) => void;
  setFilters: (filters: Partial<PatientFilters>) => void;
  setPagination: (pagination: Partial<PatientPagination>) => void;
  searchPatients: (keyword: string) => void;
  filterPatients: () => void;
  getPatientById: (id: string) => Patient | undefined;
  getDiagnosesByPatientId: (patientId: string) => PatientDiagnosis[];
  getMDTSessionByPatientId: (patientId: string) => MDTSession | undefined;
  getMDTReportsByPatientId: (patientId: string) => MDTReport[];
  getMDTReportById: (reportId: string) => MDTReport | undefined;
  fetchPatients: () => Promise<void>;
  setSelectedPatient: (patient: Patient | null) => void;
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  // 初始数据
  patients: [],
  allPatients: [],
  selectedPatient: null,
  diagnoses: mockDiagnoses,
  mdtSessions: mockMDTSessions,
  mdtReports: mockMDTReports,
  statistics: mockPatientStatistics,

  searchKeyword: '',
  filters: {
    department: '全部科室',
    disease: '全部病种',
    dateRange: null,
    status: '所有状态',
  },

  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
  },

  isLoading: false,

  setSearchKeyword: (keyword) => {
    set({ searchKeyword: keyword });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    get().filterPatients();
  },

  setPagination: (pagination) => {
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    }));
  },

  searchPatients: (keyword) => {
    const { allPatients } = get();
    if (!keyword.trim()) {
      set({ patients: allPatients, searchKeyword: '' });
      return;
    }

    const filtered = allPatients.filter(
      (patient) =>
        patient.name.includes(keyword) ||
        patient.admissionNumber.includes(keyword) ||
        patient.primaryDiagnosis.includes(keyword)
    );

    set({
      patients: filtered,
      searchKeyword: keyword,
      pagination: { ...get().pagination, total: filtered.length, page: 1 },
    });
  },

  filterPatients: () => {
    const { allPatients, filters } = get();
    let filtered = [...allPatients];

    // 按科室筛选
    if (filters.department && filters.department !== '全部科室') {
      filtered = filtered.filter(
        (patient) =>
          patient.department === filters.department ||
          patient.relatedDepartments.includes(filters.department)
      );
    }

    // 按状态筛选
    if (filters.status && filters.status !== '所有状态') {
      const statusMap: Record<string, string> = {
        'MDT进行中': 'ongoing',
        'MDT已完成': 'completed',
        '未发起MDT': 'not_started',
      };
      const status = statusMap[filters.status];
      if (status) {
        filtered = filtered.filter((patient) => patient.mdtStatus === status);
      }
    }

    set({
      patients: filtered,
      pagination: { ...get().pagination, total: filtered.length, page: 1 },
    });
  },

  getPatientById: (id) => {
    return get().allPatients.find((patient) => patient.id === id);
  },

  getDiagnosesByPatientId: (patientId) => {
    return get().diagnoses.filter((diagnosis) => diagnosis.patientId === patientId);
  },

  getMDTSessionByPatientId: (patientId) => {
    return get().mdtSessions.find((session) => session.patientId === patientId);
  },

  getMDTReportsByPatientId: (patientId) => {
    return get().mdtReports.filter((report) => report.patientId === patientId);
  },

  getMDTReportById: (reportId) => {
    return get().mdtReports.find((report) => report.id === reportId);
  },

  fetchPatients: async () => {
    set({ isLoading: true });
    try {
      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      set({
        patients: mockPatients,
        allPatients: mockPatients,
        pagination: {
          ...get().pagination,
          total: mockPatients.length,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('获取患者数据失败:', error);
      set({ isLoading: false });
    }
  },

  setSelectedPatient: (patient) => {
    set({ selectedPatient: patient });
  },
}));
