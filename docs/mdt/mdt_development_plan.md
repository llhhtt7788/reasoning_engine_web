# MDT工作台开发计划

## 项目分析

### 现有技术栈
- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + TailwindCSS 4
- **状态管理**: Zustand
- **图表**: 需要添加 ECharts 或 Recharts
- **路由**: Next.js App Router (基于文件系统)

### 现有项目结构
```
reasoning_engine_web/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 主页 (/)
│   ├── v3/page.tsx        # V3版本页面 (/v3)
│   └── api/               # API路由
├── components/            # React组件
│   └── layout/           # 布局组件
├── store/                # Zustand状态管理
├── lib/                  # 工具函数
└── types/                # TypeScript类型定义
```

## MDT工作台开发方案

### 1. 路由设计
创建 `/mdt` 路由，访问路径为 `http://xxx/mdt`

**文件结构**:
```
app/
└── mdt/
    ├── page.tsx           # MDT主页面
    └── layout.tsx         # MDT专用布局（可选）
```

### 2. 组件设计

#### 2.1 页面级组件
- `MDTWorkbench` - MDT工作台主容器

#### 2.2 布局组件
- `MDTTopNav` - 顶部导航栏
- `MDTLeftPanel` - 左侧数据看板
- `MDTRightPanel` - 右侧任务管理
- `MDTBottomPanel` - 底部分析区域

#### 2.3 业务组件
- `MDTStatisticsWidget` - 进行中MDT会诊统计
- `DepartmentActivityWidget` - 科室能力活跃度
- `MDTTaskCard` - MDT任务卡片
- `MDTTaskList` - 任务列表容器
- `MDTAnalyticsDashboard` - 决策分析仪表板

#### 2.4 图表组件
- `TrendLineChart` - 趋势折线图
- `DonutChart` - 环形图
- `ProgressBar` - 进度条

### 3. 数据管理

#### 3.1 创建 MDT Store (Zustand)
```typescript
// store/mdtStore.ts
interface MDTStore {
  // 统计数据
  ongoingMDTCount: number;
  weeklyIncrease: number;
  trendData: number[];
  
  // 任务列表
  tasks: MDTTask[];
  selectedDepartment: string;
  
  // 科室活跃度
  departmentActivities: DepartmentActivity[];
  
  // 决策分析
  decisionAnalytics: DecisionAnalytics;
  
  // Actions
  fetchMDTData: () => Promise<void>;
  filterTasksByDepartment: (dept: string) => void;
  loadMoreTasks: () => Promise<void>;
}
```

#### 3.2 类型定义
```typescript
// types/mdt.ts
interface MDTTask {
  id: string;
  patientName: string;
  urgency: 'urgent' | 'normal';
  gender: '男' | '女';
  age: number;
  admissionNumber: string;
  description: string;
  departments: string[];
  status: string;
  statusColor: string;
  createdAt: string;
}

interface DepartmentActivity {
  id: string;
  name: string;
  icon: string;
  color: string;
  activityRate: number;
}

interface DecisionAnalytics {
  qualityDistribution: {
    department: string;
    percentage: number;
    color: string;
  }[];
  efficiencyTrend: {
    week: string;
    value: number;
  }[];
  keyMetrics: {
    avgDecisionTime: number;
    dailyChange: number;
    participationRate: number;
  };
}
```

### 4. Mock数据策略

在后端API开发完成前，使用本地Mock数据:
```typescript
// lib/mdtMockData.ts
export const mockMDTData = {
  ongoingMDTCount: 12,
  weeklyIncrease: 3,
  trendData: [8, 9, 10, 11, 10, 11, 12],
  tasks: [...],
  departmentActivities: [...],
  decisionAnalytics: {...}
};
```

### 5. 样式设计

使用TailwindCSS实现原型图的样式:
- **主色调**: 蓝色 (`blue-500`, `blue-600`)
- **辅助色**: 紫色、绿色、橙色、红色
- **布局**: 左右分栏 (35% / 65%)
- **卡片**: 圆角 (`rounded-lg`)、阴影 (`shadow-md`)
- **响应式**: 使用 `lg:` 前缀实现桌面端布局

### 6. 图表集成

安装ECharts:
```bash
npm install echarts echarts-for-react
```

创建图表组件包装器:
```typescript
// components/mdt/charts/BaseChart.tsx
import ReactECharts from 'echarts-for-react';
```

### 7. 开发步骤

#### Phase 1: 基础结构 (1-2天)
1. 创建 `/mdt` 路由和页面
2. 创建基础布局组件
3. 设置MDT Store
4. 定义TypeScript类型

#### Phase 2: 静态页面 (2-3天)
1. 实现顶部导航栏
2. 实现左侧数据看板（静态数据）
3. 实现右侧任务列表（静态数据）
4. 实现底部分析区域（静态数据）

#### Phase 3: 图表集成 (1-2天)
1. 集成ECharts
2. 实现折线图组件
3. 实现环形图组件
4. 实现进度条组件

#### Phase 4: 交互功能 (2-3天)
1. 实现科室筛选功能
2. 实现任务卡片操作（查看、处理）
3. 实现加载更多功能
4. 实现图表交互（hover、tooltip）

#### Phase 5: 响应式优化 (1天)
1. 实现移动端布局
2. 测试不同屏幕尺寸
3. 优化性能

### 8. 与现有项目的集成

#### 8.1 导航集成
在 `PrimarySidebar` 中添加MDT入口:
```typescript
// components/layout/PrimarySidebar.tsx
<Link href="/mdt">
  <div className="sidebar-item">MDT工作台</div>
</Link>
```

#### 8.2 独立布局
MDT工作台使用独立的布局，不复用 `AppLayout`:
```typescript
// app/mdt/layout.tsx
export default function MDTLayout({ children }) {
  return <div className="mdt-layout">{children}</div>;
}
```

### 9. API集成准备

预留API接口位置:
```typescript
// lib/mdtApi.ts
export async function fetchMDTData() {
  // TODO: 替换为真实API
  return mockMDTData;
}

export async function fetchMDTTasks(department?: string) {
  // TODO: 替换为真实API
  return mockTasks;
}
```

### 10. 部署配置

确保 `/mdt` 路由在生产环境中可访问:
```typescript
// next.config.ts
// 如果需要基础路径，可以配置 basePath
const nextConfig = {
  basePath: process.env.BASE_PATH || '',
  // ...
};
```

## 下一步行动

1. ✅ 分析现有项目结构
2. ⏭️ 创建MDT页面路由和基础组件
3. ⏭️ 实现静态页面布局
4. ⏭️ 集成图表库
5. ⏭️ 添加交互功能
6. ⏭️ 测试和优化
