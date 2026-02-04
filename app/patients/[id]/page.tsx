'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePatientStore } from '@/store/patientStore';
import { PatientBasicInfoCard } from '@/components/patient/PatientBasicInfoCard';
import { PatientTabNavigation } from '@/components/patient/PatientTabNavigation';
import { CurrentMDTCard } from '@/components/patient/CurrentMDTCard';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { getPatientById, getDiagnosesByPatientId, getMDTSessionByPatientId } =
    usePatientStore();

  const [activeTab, setActiveTab] = useState('basic');

  const patient = getPatientById(patientId);
  const diagnoses = getDiagnosesByPatientId(patientId);
  const mdtSession = getMDTSessionByPatientId(patientId);

  if (!patient) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">患者不存在</p>
          <button
            onClick={() => router.push('/patients')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回患者列表
          </button>
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
                <a href="/patients" className="text-sm text-blue-600 font-medium">
                  患者中心
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                  科室能力库
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
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
        {/* 返回按钮和标题 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/patients')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm">返回患者列表</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">患者详情</h2>
        </div>

        {/* 患者基本信息卡片 */}
        <div className="mb-6">
          <PatientBasicInfoCard patient={patient} />
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <PatientTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* 标签页内容 */}
          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* 个人信息 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">个人信息</h3>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">姓名</span>
                      <span className="text-sm text-gray-900">{patient.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">联系电话</span>
                      <span className="text-sm text-gray-900">{patient.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">性别</span>
                      <span className="text-sm text-gray-900">{patient.gender}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">紧急联系人</span>
                      <span className="text-sm text-gray-900">
                        {patient.emergencyContact.name}（{patient.emergencyContact.relation}）
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">年龄</span>
                      <span className="text-sm text-gray-900">{patient.age}岁</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">联系电话</span>
                      <span className="text-sm text-gray-900">
                        {patient.emergencyContact.phone}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">出生日期</span>
                      <span className="text-sm text-gray-900">{patient.birthDate}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">家庭住址</span>
                      <span className="text-sm text-gray-900">{patient.address}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">民族</span>
                      <span className="text-sm text-gray-900">{patient.ethnicity}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">婚姻状况</span>
                      <span className="text-sm text-gray-900">{patient.maritalStatus}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">职业</span>
                      <span className="text-sm text-gray-900">{patient.occupation}</span>
                    </div>
                  </div>
                </div>

                {/* 住院信息 */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">住院信息</h3>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">住院号</span>
                      <span className="text-sm text-gray-900">{patient.admissionNumber}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">病床</span>
                      <span className="text-sm text-gray-900">
                        {patient.ward} {patient.bed}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">科室</span>
                      <span className="text-sm text-gray-900">{patient.department}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 w-24">入院日期</span>
                      <span className="text-sm text-gray-900">{patient.admissionDate}</span>
                    </div>
                  </div>
                </div>

                {/* 病情摘要 */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">病情摘要</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {patient.medicalSummary}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed mt-3">
                      {patient.pastHistory}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed mt-3">
                      {patient.admissionVitals}
                    </p>
                  </div>
                </div>

                {/* 诊断信息 */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">诊断信息</h3>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          诊断类型
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          诊断名称
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          诊断日期
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diagnoses.map((diagnosis) => (
                        <tr key={diagnosis.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{diagnosis.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{diagnosis.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{diagnosis.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 当前MDT状态 */}
                {mdtSession && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">当前MDT状态</h3>
                    <CurrentMDTCard mdtSession={mdtSession} />
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'basic' && (
              <div className="text-center py-12 text-gray-500">
                {activeTab === 'medical' && '病历资料功能开发中...'}
                {activeTab === 'reports' && '检查报告功能开发中...'}
                {activeTab === 'mdt' && 'MDT记录功能开发中...'}
                {activeTab === 'treatment' && '治疗计划功能开发中...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
