'use client';

import React from 'react';
import type { Patient } from '@/types/patient';

interface PatientBasicInfoCardProps {
  patient: Patient;
}

export const PatientBasicInfoCard: React.FC<PatientBasicInfoCardProps> = ({ patient }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-6">
          {/* 头像 */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-3xl text-gray-600 font-medium">
                {patient.name.charAt(0)}
              </span>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
              {patient.mdtStatus === 'ongoing' && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                  紧急
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">性别:</span>
                <span className="text-gray-900">{patient.gender}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">年龄:</span>
                <span className="text-gray-900">{patient.age}岁</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-500">住院号:</span>
                <span className="text-gray-900">{patient.admissionNumber}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-500">主管医生:</span>
                <span className="text-gray-900">
                  {patient.primaryDoctor}、{patient.primaryDoctorDept}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-500">入院日期:</span>
                <span className="text-gray-900">{patient.admissionDate}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 text-sm">主要诊断:</span>
                <span className="text-gray-900 text-sm font-medium">
                  {patient.primaryDiagnosis}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>编辑信息</span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            发起MDT会诊
          </button>
        </div>
      </div>
    </div>
  );
};
