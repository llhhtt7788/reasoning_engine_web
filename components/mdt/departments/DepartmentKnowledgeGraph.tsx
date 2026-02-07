'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { Department } from '@/types/department';
import { GRAPH_CATEGORIES, HOSPITAL_COLORS } from '@/lib/departmentMockData';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded" />,
});

interface DepartmentKnowledgeGraphProps {
  department: Department;
}

const CATEGORY_COLORS = ['#3B82F6', '#EF4444', '#10B981'];

/** 根据节点类别返回颜色：科室节点(category=0)使用医院主色，其余用类别色 */
function getNodeColor(category: number, hospital: string): string {
  if (category === 0) {
    return HOSPITAL_COLORS[hospital] ?? CATEGORY_COLORS[0];
  }
  return CATEGORY_COLORS[category];
}

/** 知识图谱：ECharts Graph 力导向图 */
export const DepartmentKnowledgeGraph: React.FC<DepartmentKnowledgeGraphProps> = ({
  department,
}) => {
  const hospitalColor = HOSPITAL_COLORS[department.hospital] ?? department.color;

  const option = {
    tooltip: {
      formatter: (params: { dataType: string; data: { name: string; value?: number; category?: number } }) => {
        if (params.dataType === 'node') {
          const cat = GRAPH_CATEGORIES[params.data.category ?? 0]?.name ?? '';
          return `<b>${params.data.name}</b><br/>类型: ${cat}${params.data.value ? `<br/>相关度: ${params.data.value}` : ''}`;
        }
        return '';
      },
    },
    legend: {
      bottom: 0,
      data: GRAPH_CATEGORIES.map((c) => c.name),
      textStyle: { color: '#6B7280', fontSize: 12 },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        categories: GRAPH_CATEGORIES.map((cat, i) => ({
          name: cat.name,
          itemStyle: { color: i === 0 ? hospitalColor : CATEGORY_COLORS[i] },
        })),
        data: department.knowledgeNodes.map((node) => {
          const color = getNodeColor(node.category, department.hospital);
          return {
            ...node,
            label: {
              show: true,
              fontSize: node.symbolSize > 35 ? 13 : 11,
              color: '#374151',
            },
            itemStyle: {
              color,
              shadowBlur: 5,
              shadowColor: color + '40',
            },
          };
        }),
        links: department.knowledgeEdges.map((edge) => ({
          ...edge,
          lineStyle: {
            color: '#D1D5DB',
            width: 1.5,
            curveness: 0.1,
          },
        })),
        force: {
          repulsion: 300,
          gravity: 0.1,
          edgeLength: [80, 160],
          layoutAnimation: true,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 3 },
          itemStyle: {
            shadowBlur: 15,
          },
        },
        animationDuration: 800,
        animationEasing: 'cubicOut',
      },
    ],
  };

  return (
    <div
      className="animate-chart-fade-in bg-white rounded-xl border border-gray-200 p-5"
      style={{ animationDelay: '200ms' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">知识关联图谱</h3>
        <div className="flex items-center space-x-3 text-xs">
          {GRAPH_CATEGORIES.map((cat, i) => (
            <div key={cat.name} className="flex items-center space-x-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: i === 0 ? hospitalColor : CATEGORY_COLORS[i] }}
              />
              <span className="text-gray-500">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
      <ReactECharts option={option} style={{ height: '350px' }} />
    </div>
  );
};
