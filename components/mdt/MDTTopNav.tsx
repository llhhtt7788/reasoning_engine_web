'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const MDTTopNav = () => {
  const pathname = usePathname();
  const navItems = [
    { name: '工作台', href: '/mdt' },
    { name: '患者中心', href: '/mdt/patients' },
    { name: '科室能力库', href: '/mdt/departments' },
    { name: '决策记录', href: '/mdt/records' },
  ];

  return (
    <nav className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
      {/* Logo和品牌 */}
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Med-Go MDT Engine</div>
            <div className="text-xs text-gray-500">多学科会诊系统</div>
          </div>
        </div>

        {/* 导航菜单 */}
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/mdt' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 右侧功能区 */}
      <div className="flex items-center space-x-4">
        {/* 搜索图标 */}
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* 用户信息 */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">张</span>
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">张伟 主任医师</div>
            <div className="text-xs text-gray-500">外科 - 肝外科</div>
          </div>
        </div>
      </div>
    </nav>
  );
};
