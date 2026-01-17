# Bug Fix: 会话列表 API 500 和 404 错误修复

**修复时间**: 2026-01-17  
**版本**: w.2.5.1 Hotfix

---

## 🐛 问题描述

### 问题 1: 500 Internal Server Error
**错误信息**: `asyncpg.exceptions.UndefinedColumnError: column "updated_at" does not exist`

**根本原因**:
- 后端数据库 `conversations` 表缺少 `updated_at` 字段
- 但 API 代码已经在 `SELECT` 和 `ORDER BY` 中使用了该字段
- 导致 SQL 查询失败，返回 500 错误

### 问题 2: 404 Not Found
**错误 URL**: `/api/v1/chat/context/api/v1/conversations`

**根本原因**:
- 环境变量 `NEXT_PUBLIC_API_BASE_URL` 配置为 `http://127.0.0.1:11211/api/v1/chat/context`
- Next.js API 路由代理时拼接路径：`${BACKEND_URL}/api/v1/conversations`
- 结果：`http://127.0.0.1:11211/api/v1/chat/context/api/v1/conversations` ❌
- 正确应该是：`http://127.0.0.1:11211/api/v1/conversations` ✅

---

## ✅ 修复方案

### 修复 1: 后端向后兼容（Python）

**文件**: `api/routes/sessions.py`

**策略**: 动态检测 `updated_at` 字段是否存在，没有时回退到 `created_at`

```python
async def _has_column(conn: Any, table_name: str, column_name: str) -> bool:
    """检查表中是否存在指定列"""
    sql = """
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    """
    row = await conn.fetchrow(sql, table_name, column_name)
    return row is not None


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    user_id: str = Query(...),
    app_id: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ConversationListResponse:
    conn = await get_pg_conn_or_none()
    if conn is None:
        return ConversationListResponse(items=[], limit=limit, offset=offset)

    # 动态检测 updated_at 字段
    has_updated_at = await _has_column(conn, "conversations", "updated_at")

    # 根据字段存在性构建 SQL
    if has_updated_at:
        order_expr = "updated_at DESC NULLS LAST, created_at DESC"
        updated_select = "updated_at"
    else:
        order_expr = "created_at DESC"
        updated_select = "NULL::timestamptz AS updated_at"

    # 构建动态 SQL
    if app_id:
        sql = f"""
        SELECT
          conversation_id,
          user_id,
          app_id,
          conversation_root_id,
          title,
          created_at,
          {updated_select}
        FROM conversations
        WHERE user_id = $1 AND app_id = $2
        ORDER BY {order_expr}
        LIMIT $3 OFFSET $4
        """
        rows = await conn.fetch(sql, user_id, app_id, limit, offset)
    else:
        sql = f"""
        SELECT
          conversation_id,
          user_id,
          app_id,
          conversation_root_id,
          title,
          created_at,
          {updated_select}
        FROM conversations
        WHERE user_id = $1
        ORDER BY {order_expr}
        LIMIT $2 OFFSET $3
        """
        rows = await conn.fetch(sql, user_id, limit, offset)

    # ... 处理结果
```

**优点**:
- ✅ 即使数据库未迁移，API 也能正常工作
- ✅ 有 `updated_at` 时优先使用（最佳排序）
- ✅ 无 `updated_at` 时回退到 `created_at`（兼容排序）
- ✅ 不需要强制数据库迁移

---

### 修复 2: 前端环境变量和 API 路由

#### 2.1 新增环境变量

**文件**: `.env.local`

```env
# Backend base URL (without /api/v1 path)
NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:11211

# Chat API (legacy, keep for backward compatibility)
NEXT_PUBLIC_API_URL=http://127.0.0.1:11211/api/v1/chat/context
NEXT_PUBLIC_SSE_BASE_URL=http://127.0.0.1:11211/api/v1/chat/context
```

**关键变更**:
- 新增 `NEXT_PUBLIC_BACKEND_BASE_URL` - 只包含 `http://host:port`
- 保留 `NEXT_PUBLIC_API_URL` - 用于 chat API（向后兼容）

#### 2.2 修改 API 路由代理

**文件**: `app/api/v1/conversations/route.ts`

```typescript
// 修改前
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:11211';

// 修改后
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:11211';
```

**文件**: `app/api/v1/conversations/[conversation_id]/sessions/route.ts`

```typescript
// 修改前
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:11211';

// 修改后
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:11211';
```

---

## 🔍 路径拼接对比

### 错误配置（修复前）
```
环境变量: NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:11211/api/v1/chat/context
代码拼接: ${BACKEND_URL}/api/v1/conversations
最终URL:  http://127.0.0.1:11211/api/v1/chat/context/api/v1/conversations ❌
结果:     404 Not Found
```

### 正确配置（修复后）
```
环境变量: NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:11211
代码拼接: ${BACKEND_URL}/api/v1/conversations
最终URL:  http://127.0.0.1:11211/api/v1/conversations ✅
结果:     200 OK
```

---

## 📋 修复检查清单

### 后端（Python）
- [ ] 在 `api/routes/sessions.py` 中添加 `_has_column()` 函数
- [ ] 修改 `list_conversations()` 使用动态 SQL
- [ ] 测试：数据库有 `updated_at` 字段时正常工作
- [ ] 测试：数据库无 `updated_at` 字段时不报 500 错误

### 前端（Next.js）
- [x] 在 `.env.local` 中添加 `NEXT_PUBLIC_BACKEND_BASE_URL`
- [x] 修改 `app/api/v1/conversations/route.ts` 使用新环境变量
- [x] 修改 `app/api/v1/conversations/[conversation_id]/sessions/route.ts` 使用新环境变量
- [x] 更新 `.env.example` 文档
- [x] 更新 `w.2.5.1_backend_integration.md` 文档
- [ ] 重启开发服务器
- [ ] 测试：会话列表 API 返回 200 OK
- [ ] 测试：左侧会话列表正常显示

---

## 🧪 测试步骤

### 1. 更新环境变量
```bash
# 编辑 .env.local
# 确保有以下配置：
NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:11211
```

### 2. 重启开发服务器
```bash
# 停止当前服务器（Ctrl+C）
# 重新启动
npm run dev
```

### 3. 测试会话列表 API
```bash
# 打开浏览器开发者工具 (F12)
# 切换到 Network 标签
# 刷新页面 (F5)
# 查找请求：/api/v1/conversations
```

**预期结果**:
- Status: `200 OK`
- Response: `{ items: [...], limit: 20, offset: 0 }`

### 4. 检查 Console 日志
```
[chatStore] Loaded sessions from backend: {backend: X, localOnly: Y, total: Z}
```

### 5. 检查左侧会话列表
- ✅ 显示会话列表
- ✅ 后端会话有绿色"云端"徽章
- ✅ 本地会话无徽章

---

## 🎯 预期效果

### 修复前
```
Request: GET /api/v1/conversations?user_id=10001
Proxy to: http://127.0.0.1:11211/api/v1/chat/context/api/v1/conversations
Response: 404 Not Found ❌
```

### 修复后
```
Request: GET /api/v1/conversations?user_id=10001
Proxy to: http://127.0.0.1:11211/api/v1/conversations
Response: 200 OK ✅
Data: { items: [...], limit: 20, offset: 0 }
```

---

## 📚 相关文件

### 修改的文件（前端）
1. `.env.local` - 新增 `NEXT_PUBLIC_BACKEND_BASE_URL`
2. `.env.example` - 更新环境变量文档
3. `app/api/v1/conversations/route.ts` - 使用新环境变量
4. `app/api/v1/conversations/[conversation_id]/sessions/route.ts` - 使用新环境变量
5. `docs/v2/w.2.5.1_backend_integration.md` - 更新文档

### 需要修改的文件（后端）
1. `api/routes/sessions.py` - 添加向后兼容逻辑

---

## ⚠️ 重要提醒

### 开发环境
重启开发服务器后，Next.js 会重新读取 `.env.local` 文件。如果不重启，新的环境变量不会生效。

### 生产环境
如果部署到生产环境，确保：
1. 生产环境配置了 `NEXT_PUBLIC_BACKEND_BASE_URL`
2. 值不包含 `/api/v1` 路径
3. 重新构建和部署应用

### 后端兼容性
即使后端未修复 `updated_at` 问题，前端的 404 错误修复后，至少能正确访问 API 路由，只是可能收到 500 错误。优先修复前端 404，再修复后端 500。

---

## 🎉 完成状态

✅ **前端 404 问题已修复**
⏳ **后端 500 问题需要在 Python 代码中修复**

**请重启开发服务器并测试！** 🚀
