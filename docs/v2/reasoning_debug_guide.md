# Reasoning 功能调试指南

**问题**: Reasoning 智能滑出效果消失，调试面板中思路内容也不显示

**调试时间**: 2026-01-17

---

## 添加的调试日志

### 1. chatStore.ts - updateLastAssistant
```javascript
console.log('[chatStore] Reasoning detected:', reasoning.substring(0, 100));
console.log('[chatStore] Auto-opening debug drawer');
```

### 2. DebugDrawer.tsx - currentMessage
```javascript
console.log('[DebugDrawer] Found assistant message:', {
  index: i,
  hasReasoning: !!messages[i].reasoning,
  reasoningLength: messages[i].reasoning?.length || 0,
  turn_id: messages[i].turn_id
});
```

### 3. DebugDrawer.tsx - Reasoning Tab
添加了调试信息面板，显示：
- currentMessage 是否存在
- hasReasoning 状态
- reasoningLength 长度
- turn_id

---

## 测试步骤

### 1. 打开浏览器开发者工具
1. 访问 http://localhost:3000
2. 按 F12 打开开发者工具
3. 切换到 "Console" 标签

### 2. 发送测试问题

#### 测试 A: 简单问题（无 Reasoning）
**问题**: "你好"

**预期日志**:
```
[DebugDrawer] Found assistant message: {index: 1, hasReasoning: false, ...}
```

**预期行为**:
- 右侧面板不展开
- 或者如果手动打开，显示"暂无思路内容"

#### 测试 B: 复杂问题（有 Reasoning）
**问题**: "如何治疗2型糖尿病并发症？"

**预期日志**:
```
[chatStore] Reasoning detected: 首先需要分析...
[chatStore] Auto-opening debug drawer
[DebugDrawer] Found assistant message: {index: 1, hasReasoning: true, reasoningLength: 234, ...}
```

**预期行为**:
- 右侧面板自动滑入
- 默认显示"思路" Tab
- 显示 Reasoning 内容

### 3. 手动打开调试面板

如果自动展开没有触发：

1. 点击顶部"🔍 调试"按钮
2. 查看右侧滑出的面板
3. 点击"🧠 思路" Tab
4. 查看黄色调试信息面板：
   ```
   Debug Info:
   - currentMessage: found
   - hasReasoning: yes
   - reasoningLength: 234
   - turn_id: turn_xxx
   ```

---

## 可能的问题

### 问题 1: 日志显示 reasoning detected，但面板没有打开

**检查**:
- 查看 `isDebugDrawerOpen` 状态
- 检查 CSS `translate-x-0` 是否应用
- 检查 z-index 是否被其他元素覆盖

**调试**:
```javascript
// 在浏览器控制台运行
console.log('Drawer State:', {
  isOpen: document.querySelector('.translate-x-0'),
  drawerElement: document.querySelector('[class*="translate-x"]')
});
```

### 问题 2: currentMessage 为 null

**检查**:
- 查看 `messages` 数组是否有内容
- 检查最后一条消息的 `role` 是否为 'assistant'

**调试**:
```javascript
// 在浏览器控制台运行
const messages = JSON.parse(localStorage.getItem('medgo.session.conv_xxx'));
console.log('Messages:', messages);
console.log('Last message:', messages[messages.length - 1]);
```

### 问题 3: hasReasoning 为 false

**检查**:
- 查看后端是否返回了 reasoning 事件
- 检查 `onReasoning` 回调是否被调用
- 检查 `updateLastAssistant` 是否正确保存 reasoning

**调试**:
在 `ChatContainer.tsx` 的 `onReasoning` 回调中添加日志：
```typescript
onReasoning: (reasoning) => {
  console.log('[onReasoning] Received:', reasoning);
  updateLastAssistant('', reasoning);
},
```

---

## 预期输出示例

### 正常工作时的完整日志流程

```
1. User 发送问题
[chatStore] Adding user message

2. Backend 开始流式返回
[chatStore] Adding assistant message (empty)

3. Backend 返回 content 片段
[chatStore] Updating assistant with content: "糖尿病的..."

4. Backend 返回 reasoning 片段
[onReasoning] Received: "首先需要分析患者的..."
[chatStore] Reasoning detected: 首先需要分析患者的...
[chatStore] Auto-opening debug drawer

5. DebugDrawer 渲染
[DebugDrawer] Found assistant message: {
  index: 1, 
  hasReasoning: true, 
  reasoningLength: 234,
  turn_id: 'turn_123'
}

6. Drawer 滑入
→ 右侧面板从右向左滑入（300ms 动画）
→ 默认显示"思路" Tab
→ 显示 Reasoning 内容
```

---

## 回滚方案

如果调试后发现问题难以解决，可以恢复备份：

```bash
cd C:\Users\HAITAO\WebstormProjects\reasoning_engine_web
Copy-Item .\components\MessageList.tsx.backup .\components\MessageList.tsx -Force
```

---

## 下一步

完成测试后：
1. 如果发现问题，记录日志输出
2. 根据日志确定问题根因
3. 修复后移除调试日志
4. 重新编译和测试

---

**请在浏览器中测试，并将 Console 日志发给我！** 📋
