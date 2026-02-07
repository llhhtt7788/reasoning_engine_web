'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePatientStore } from '@/store/patientStore';
import { PatientBasicInfoCard } from '@/components/patient/PatientBasicInfoCard';
import { PatientTabNavigation } from '@/components/patient/PatientTabNavigation';
import { CurrentMDTCard } from '@/components/patient/CurrentMDTCard';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const {
    getPatientById,
    getDiagnosesByPatientId,
    getMDTSessionByPatientId,
    getMDTReportsByPatientId,
  } = usePatientStore();

  const [activeTab, setActiveTab] = useState('basic');

  const patient = getPatientById(patientId);
  const diagnoses = getDiagnosesByPatientId(patientId);
  const mdtSession = getMDTSessionByPatientId(patientId);
  const mdtReports = getMDTReportsByPatientId(patientId);

  if (!patient) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">患者不存在</p>
          <button
            onClick={() => router.push('/mdt/patients')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回患者列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1920px] mx-auto p-6">
        {/* 返回按钮和标题 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/mdt/patients')}
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

            {activeTab === 'mdt' && (
              <div className="space-y-4">
                {mdtReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">暂无MDT记录</div>
                ) : (
                  <div className="space-y-4">
                    {mdtReports.map((report) => (
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
                            <span className="text-xs text-gray-500">
                              {report.createdAt}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            MDT结论：{report.mainConclusion}
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'basic' && activeTab !== 'mdt' && (
              <div className="text-center py-12 text-gray-500">
                {activeTab === 'medical' && '病历资料功能开发中...'}
                {activeTab === 'reports' && '检查报告功能开发中...'}
                {activeTab === 'treatment' && '治疗计划功能开发中...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
