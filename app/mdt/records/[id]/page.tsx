'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePatientStore } from '@/store/patientStore';

export default function MDTReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const { getMDTReportById, getPatientById } = usePatientStore();
  const report = getMDTReportById(reportId);
  const patient = report ? getPatientById(report.patientId) : undefined;

  if (!report || !patient) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">未找到对应的MDT结论报告</p>
          <button
            onClick={() => router.push('/mdt/records')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回决策记录
          </button>
        </div>
      </div>
    );
  }

  const consensusPercent = Math.round(report.consensusRate * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1920px] mx-auto p-6">
        {/* 顶部患者信息 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/mdt/records')}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-50"
                aria-label="返回"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-semibold text-gray-900">{patient.name}</h1>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    MDT完成
                  </span>
                  <span className="text-xs text-gray-500">
                    {patient.gender} | {patient.age}岁 | 住院号 {patient.admissionNumber}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{report.mainDiagnosis}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                打印
              </button>
              <button className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                导出PDF
              </button>
              <button className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                分享
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 左侧信息栏 */}
          <div className="col-span-3 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900">MDT基本信息</h3>
              <p className="text-xs text-gray-500 mt-1">会诊记录基本信息</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">MDT编号</span>
                  <span className="text-gray-900 font-medium">{report.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">会诊日期</span>
                  <span className="text-gray-900">{report.createdAt.split(' ')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">申请科室</span>
                  <span className="text-gray-900">{report.applicantDept}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">主持人</span>
                  <span className="text-gray-900">
                    {report.host} {report.hostTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">记录人</span>
                  <span className="text-gray-900">
                    {report.recorder} {report.recorderTitle}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900">MDT状态</h3>
              <div className="mt-4">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  已完成
                </span>
                <div className="mt-3 text-sm text-gray-500">生成时间</div>
                <div className="text-sm text-gray-900">{report.createdAt}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900">决策一致性</h3>
              <div className="mt-6 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-8 border-green-200" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{consensusPercent}%</div>
                      <div className="text-xs text-gray-500">一致率</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧报告内容 */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">多学科会诊(MDT)结论报告</h2>
                <div className="mt-2 inline-flex px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                  {report.code}
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">患者基本信息</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">姓名</span>
                      <span className="text-gray-900">{patient.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">性别</span>
                      <span className="text-gray-900">{patient.gender}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">年龄</span>
                      <span className="text-gray-900">{patient.age}岁</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">住院号</span>
                      <span className="text-gray-900">{patient.admissionNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">主要诊断</span>
                      <span className="text-gray-900">{report.mainDiagnosis}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">基础疾病</span>
                      <span className="text-gray-900">{report.baseDiseases.join('、')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">MDT核心结论</h3>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-gray-700">
                    {report.mainConclusion}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">各科室意见摘要</h3>
                  <div className="space-y-3">
                    {report.opinions.map((opinion, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 text-sm text-gray-700"
                      >
                        <div className="font-medium text-gray-900 mb-2">{opinion.dept}</div>
                        <div>{opinion.content}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">治疗计划</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            治疗阶段
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            治疗措施
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            预计时间
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            负责科室
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {report.treatmentPlan.map((plan, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-gray-900">{plan.phase}</td>
                            <td className="px-4 py-3 text-gray-700">{plan.plan}</td>
                            <td className="px-4 py-3 text-gray-500">{plan.time}</td>
                            <td className="px-4 py-3 text-gray-700">{plan.dept}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">随访计划</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            随访时间
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            随访内容
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            负责科室
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {report.followUpPlan.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-gray-900">{item.time}</td>
                            <td className="px-4 py-3 text-gray-700">{item.content}</td>
                            <td className="px-4 py-3 text-gray-700">{item.dept}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <div className="text-right text-sm text-gray-500">
                    <div>主持人：{report.host}</div>
                    <div>日期：{report.createdAt.split(' ')[0]}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
