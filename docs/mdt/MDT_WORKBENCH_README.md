# MDT工作台开发文档

## 项目概述

MDT工作台是Med-Go MDT Engine的多学科会诊管理平台，为医疗专业人员提供会诊统计、任务管理和决策分析功能。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI库**: React 19
- **样式**: TailwindCSS 4
- **状态管理**: Zustand
- **图表库**: ECharts + echarts-for-react
- **语言**: TypeScript

## 项目结构

```
reasoning_engine_web/
├── app/
│   └── mdt/
│       └── page.tsx                    # MDT工作台主页面
├── components/
│   └── mdt/
│       ├── MDTTopNav.tsx               # 顶部导航栏
│       ├── MDTStatisticsWidget.tsx     # 进行中MDT会诊统计
│       ├── DepartmentActivityWidget.tsx # 科室能力活跃度
│       ├── MDTTaskCard.tsx             # MDT任务卡片
│       ├── MDTTaskList.tsx             # 任务列表容器
│       ├── MDTAnalyticsDashboard.tsx   # 决策分析仪表板
│       ├── ProgressBar.tsx             # 进度条组件
│       └── charts/
│           ├── TrendLineChart.tsx      # 趋势折线图
│           ├── DonutChart.tsx          # 环形图
│           └── EfficiencyTrendChart.tsx # 效率趋势图
├── store/
│   └── mdtStore.ts                     # MDT状态管理
├── types/
│   └── mdt.ts                          # MDT类型定义
└── lib/
    └── mdtMockData.ts                  # Mock数据
```

## 访问方式

- **开发环境**: http://localhost:3000/mdt
- **生产环境**: http://xxx/mdt

## 功能模块

### 1. 顶部导航栏
- Logo和品牌标识
- 主导航菜单（工作台、患者中心、科室能力库、决策记录）
- 搜索功能
- 用户信息展示

### 2. 左侧数据看板

#### 2.1 进行中MDT会诊统计
- 当前进行中的会诊数量
- 本周新增数量
- 7天趋势折线图

#### 2.2 科室能力活跃度
- 5个科室的活跃度展示
- 每个科室包含：图标、名称、活跃度百分比、彩色进度条

### 3. 右侧任务管理

#### 3.1 任务列表头部
- 标题
- 科室筛选下拉框
- 新建MDT按钮

#### 3.2 任务卡片
每个任务卡片包含：
- 患者姓名和紧急度标签
- 基本信息（性别、年龄、住院号）
- 病症描述
- 涉及科室标签
- 当前状态标签
- 创建时间
- 操作按钮（查看、处理）

#### 3.3 加载更多
- 分页加载功能

### 4. 底部决策分析

#### 4.1 科室决策质量分布
- 环形图展示各科室占比
- 中心显示决策一致率
- 底部图例

#### 4.2 MDT决策效率趋势
- 6周趋势折线图
- 显示决策效率变化

#### 4.3 关键指标卡片
- 平均决策时长
- 昨日对比
- 科室参与率

## 数据管理

### Store结构

```typescript
interface MDTStore {
  // 统计数据
  statistics: MDTStatistics;
  
  // 科室活跃度
  departmentActivities: DepartmentActivity[];
  
  // 任务列表
  tasks: MDTTask[];
  allTasks: MDTTask[];
  selectedDepartment: string;
  
  // 决策分析
  decisionAnalytics: DecisionAnalytics;
  
  // 加载状态
  isLoading: boolean;
  
  // Actions
  setSelectedDepartment: (dept: string) => void;
  filterTasksByDepartment: (dept: string) => void;
  loadMoreTasks: () => void;
  fetchMDTData: () => Promise<void>;
}
```

### 数据类型

详见 `types/mdt.ts`，包括：
- `MDTTask`: 任务数据
- `DepartmentActivity`: 科室活跃度
- `DecisionAnalytics`: 决策分析
- `MDTStatistics`: 统计数据

## 样式设计

### 色彩系统
- **主色**: 蓝色 (`blue-500`, `blue-600`)
- **辅助色**: 
  - 紫色 (`purple-500`) - 病理科
  - 绿色 (`green-500`) - 外科
  - 橙色 (`orange-500`) - 内科
  - 红色 (`red-500`) - 麻醉/ICU、紧急标签
- **状态色**:
  - 黄色 (`yellow-100`) - 待外科讨论
  - 蓝色 (`blue-100`) - 待多科协同
  - 紫色 (`purple-100`) - 待病理科分析

### 布局
- 左右分栏：35% / 65%
- 虚线边框容器
- 卡片圆角：`rounded-lg`
- 卡片阴影：`shadow-md`

## 图表配置

### 1. 趋势折线图 (TrendLineChart)
- 蓝色线条 (`#3B82F6`)
- 渐变填充
- 圆形数据点
- Tooltip显示数值

### 2. 环形图 (DonutChart)
- 内外半径：55% / 75%
- 中心文字显示
- 底部图例
- Hover高亮

### 3. 效率趋势图 (EfficiencyTrendChart)
- 坐标轴和网格线
- 蓝色线条和填充
- 6周数据展示

## 开发指南

### 安装依赖

```bash
cd /home/ubuntu/reasoning_engine_web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问: http://localhost:3000/mdt

### 构建生产版本

```bash
npm run build
npm run start
```

## API集成

当前使用Mock数据，API接口预留在 `store/mdtStore.ts` 中的 `fetchMDTData` 方法。

### 替换为真实API

1. 在 `lib/mdtApi.ts` 中实现API调用函数
2. 在 `store/mdtStore.ts` 中调用真实API
3. 处理错误和加载状态

示例：

```typescript
// lib/mdtApi.ts
export async function fetchMDTData() {
  const response = await fetch('/api/mdt/data');
  return response.json();
}

// store/mdtStore.ts
fetchMDTData: async () => {
  set({ isLoading: true });
  try {
    const data = await fetchMDTData();
    set({
      statistics: data.statistics,
      departmentActivities: data.departmentActivities,
      tasks: data.tasks,
      decisionAnalytics: data.decisionAnalytics,
      isLoading: false,
    });
  } catch (error) {
    console.error('获取MDT数据失败:', error);
    set({ isLoading: false });
  }
}
```

## 交互功能

### 已实现
- 科室筛选（下拉选择）
- 任务列表动态过滤

### 待实现
- 新建MDT任务
- 查看任务详情
- 处理任务
- 加载更多（分页）
- 图表交互（点击跳转）
- 实时数据更新

## 响应式设计

当前实现了桌面端布局，移动端适配可以通过以下方式实现：

```typescript
// 使用Tailwind的响应式类
<div className="grid grid-cols-12 lg:grid-cols-12 md:grid-cols-1 gap-6">
  {/* 左侧 */}
  <div className="col-span-12 lg:col-span-4">...</div>
  
  {/* 右侧 */}
  <div className="col-span-12 lg:col-span-8">...</div>
</div>
```

## 性能优化

### 已实现
1. **图表动态导入**: 使用 `next/dynamic` 避免SSR问题
2. **状态管理**: 使用Zustand轻量级状态管理
3. **组件拆分**: 模块化组件设计

### 建议优化
1. 虚拟滚动（长列表）
2. 图片懒加载
3. 数据缓存
4. 防抖/节流（搜索、筛选）

## 测试

### 功能测试清单
- [ ] 页面正常加载
- [x] 顶部导航显示正确
- [x] 统计数据显示正确
- [x] 图表正常渲染
- [x] 任务列表显示正确
- [x] 科室筛选功能正常
- [ ] 新建MDT按钮功能
- [ ] 查看/处理按钮功能
- [ ] 加载更多功能
- [ ] 响应式布局

## 部署

### 环境变量

如需配置API地址，在 `.env.local` 中添加：

```env
NEXT_PUBLIC_MDT_API_URL=http://your-api-url/api/mdt
```

### 生产部署

1. 构建项目：`npm run build`
2. 启动服务：`npm run start`
3. 或部署到Vercel、Netlify等平台

## 常见问题

### Q: 图表不显示？
A: 确保使用了动态导入 `dynamic(() => import('echarts-for-react'), { ssr: false })`

### Q: 如何修改主题色？
A: 在TailwindCSS配置中修改颜色，或直接修改组件中的颜色类名

### Q: 如何添加新的科室？
A: 在 `lib/mdtMockData.ts` 中的 `mockAllDepartments` 数组中添加

## 维护者

- 开发日期: 2026-02-02
- 版本: v1.0.0

## 许可证

与主项目保持一致
