'use client';

import React from 'react';
import Link from 'next/link';
import { usePatientStore } from '@/store/patientStore';

export default function MDTRecordsPage() {
  const { mdtReports, getPatientById } = usePatientStore();

  return (
    <div className="h-full max-w-[1920px] mx-auto p-6">
      <div className="h-full border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">决策记录</h2>
            <p className="text-sm text-gray-500 mt-1">MDT结论与决策输出归档</p>
          </div>
        </div>

        <div className="space-y-4">
          {mdtReports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无决策记录</div>
          ) : (
            mdtReports.map((report) => {
              const patient = getPatientById(report.patientId);
              return (
                <div
                  key={report.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {report.code}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        {report.status === 'completed' ? '已完成' : '进行中'}
                      </span>
                      <span className="text-xs text-gray-500">{report.createdAt}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {patient ? `${patient.name} · ${patient.primaryDiagnosis}` : '患者信息已更新'}
                    </div>
                    <div className="text-xs text-gray-500">
                      参会科室：{report.participatingDepts.join('、')}
                    </div>
                  </div>
                  <Link
                    href={`/mdt/records/${report.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                  >
                    <span>查看结论报告</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
