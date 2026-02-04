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
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">M</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Med-Go MDT Engine</h1>
                  <p className="text-xs text-gray-500">多学科会诊系统</p>
                </div>
              </div>
              <nav className="flex items-center space-x-6 ml-12">
                <a href="/mdt" className="text-sm text-gray-600 hover:text-gray-900">
                  工作台
                </a>
                <a href="/mdt/patients" className="text-sm text-blue-600 font-medium">
                  患者中心
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  科室能力库
                </a>
                <a href="/mdt/records" className="text-sm text-gray-600 hover:text-gray-900">
                  决策记录
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">张</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">张伟 主任医师</div>
                  <div className="text-gray-500">外科 - 肝外科</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-[1920px] mx-auto p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
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
    </div>
  );
}
