包含内容：

如何从 on_chain_start / on_chain_end 推导 DAG 状态图

建议数据结构：

interface DagNode {
nodeId: string;
label: string;
startTime: string;
endTime?: string;
}

interface DagEdge {
from: string;
to: string;
}


推荐节点 label 与颜色/状态对应：

绿色 = 执行成功

黄色 = 部分跳过

红色 = 错误节点

支持按 run_id 刷新 DAG，或追踪路径时间线