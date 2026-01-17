# w.2.5.2 Bug Fix: 会话同步与滚动修复

**修复时间**: 2026-01-17
**版本**: w.2.5.2

---

## 🐛 问题 1: 左侧出现多个 Session (Session Fragmentation)

**现象**:
用户只进行了一次多轮对话，但左侧边栏出现了多个 Session 记录（例如 "New Chat", "New Chat 1"）。

**根本原因**:
1. 前端在第一轮对话时生成了一个临时 UUID (e.g., `client-id-1`)。
2. 后端接收请求，创建了一个正式 Session (e.g., `db-id-1`) 并返回。
3. 前端虽然在 `onRoute` 回调中收到了 `db-id-1`，但仅仅作为元数据显示，**没有更新 Store 中的状态**。
4. 第二轮对话时，前端继续使用 `client-id-1`。
5. 后端不认识 `client-id-1`，又创建了一个新的 `db-id-2`。
6. 最后左侧出现了多个孤立的 Session 记录。

**修复方案**:
1. **Store 更新**: 在 `chatStore` 中新增 `updateCurrentSessionId` 方法。
   - 更新当前 Session 的 ID。
   - 更新 Session 列表中的对应条目。
   - 迁移 LocalStorage 数据（删除旧 Key，存入新 Key）。
   
2. **逻辑调用**: 在 `ChatContainer.tsx` 的 `onRoute` 回调中：
   - 监听后端返回的 `conversation_id`。
   - 如果与当前 ID 不一致，立即调用 `updateCurrentSessionId`。
   - 同步更新 `identityStore` 的会话上下文。

**影响文件**:
- `store/chatStore.ts`
- `components/ChatContainer.tsx`

---

## 🐛 问题 2: 新问题未滚动到顶部

**现象**:
用户发送问题后，视口没有自动对齐到新问题的顶部，导致需要手动寻找。

**现状**:
该问题已在 `w.2.5.1` 中修复。使用了 `scrollTo` + `offsetTop - 20` 的逻辑，并配合 `min-h-0` 的布局修复。如果没有生效，请确认浏览器缓存已清除。

---

## 🧪 验证步骤

### 验证会话同步

1. **清除数据**: 点击左侧所有 Session 的删除按钮，清空历史。
2. **刷新页面**: 确保状态重置。
3. **第一轮对话**: 发送 "你好"。
   - 观察 URL 或 Console，确认后端返回的新 `conversation_id`。
   - 观察左侧，应该只有一个 "你好" 的 Session。
4. **第二轮对话**: 发送 "继续"。
   - 观察左侧，**不应该**出现新的 Session。
   - 消息应该追加在同一个 Session 中。
5. **刷新页面**: 历史记录应该还在，切 ID 应该是后端返回的正式 ID。

### 验证滚动

1. **发送长问题**: 输入一段文本，点击发送。
2. **观察**: 屏幕应该自动平滑滚动，使该问题的顶部对齐视口顶部（留约 20px 边距）。
3. **AI 回复**: AI 回复过程中，屏幕不应乱跳。

---

**代码已提交并编译通过。**
