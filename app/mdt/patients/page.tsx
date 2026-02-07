'use client';

import React, { useEffect } from 'react';
import { usePatientStore } from '@/store/patientStore';
import { PatientStatisticsCards } from '@/components/patient/PatientStatisticsCards';
import { PatientSearchBar } from '@/components/patient/PatientSearchBar';
import { PatientFilterBar } from '@/components/patient/PatientFilterBar';
import { PatientTable } from '@/components/patient/PatientTable';
import { PatientPagination } from '@/components/patient/PatientPagination';

export default function PatientsPage() {
  const {
    patients,
    statistics,
    filters,
    pagination,
    isLoading,
    fetchPatients,
    searchPatients,
    setFilters,
    setPagination,
  } = usePatientStore();

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearch = (keyword: string) => {
    searchPatients(keyword);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setPagination({ page });
  };

  // 分页显示的患者
  const paginatedPatients = patients.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-w-[1920px] mx-auto p-6">
      <div className="h-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white overflow-y-auto">
        {/* 页面标题和操作按钮 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">患者中心</h2>
            <p className="text-sm text-gray-500 mt-1">多学科会诊患者管理</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>导入患者</span>
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1">
              <span>+</span>
              <span>新建患者</span>
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <PatientSearchBar onSearch={handleSearch} />
        </div>

        {/* 筛选栏 */}
        <div className="mb-6">
          <PatientFilterBar filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* 统计卡片 */}
        <div className="mb-6">
          <PatientStatisticsCards statistics={statistics} />
        </div>

        {/* 患者列表表格 */}
        <div className="mb-4">
          <PatientTable patients={paginatedPatients} />
        </div>

        {/* 分页 */}
        <PatientPagination pagination={pagination} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
