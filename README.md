# Med-Go 推理工作台

**最新版本**: w.2.5.0 (ChatGPT 风格布局)  
**更新日期**: 2026-01-17

Med-Go 推理工作台是一个基于 Next.js 的 AI 推理引擎前端，支持多对话管理、智能推理展示、知识文档上传等功能。

## ✨ v2.5.0 新特性

- 🎨 **全新 ChatGPT 风格界面** - 简洁、专注、高效
- 💬 **Session 管理** - 多对话历史、快速切换、自动保存
- 🧠 **智能 Reasoning 面板** - 深度推理时自动展开，简单问题自动隐藏
- 📎 **拖拽上传** - 拖拽文件到左侧栏即可上传知识文档
- 💾 **本地持久化** - 刷新页面不丢失数据

👉 [查看完整功能列表](docs/v2/w.2.5.0_.md)  
👉 [用户使用指南](docs/v2/w.2.5.0_user_guide.md)

---

## Getting Started

First, install dependencies:

```bash
npm install
```

### Configuration

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your API endpoint:

```env
# Required: API endpoint
NEXT_PUBLIC_API_URL=http://localhost:11211/api/v1/chat/context

# Optional: Additional API parameters
# NEXT_PUBLIC_SYSTEM_PROMPT=你是一个有用的AI助手
# NEXT_PUBLIC_LLM_INDEX=0
# NEXT_PUBLIC_TENANT_ID=your-tenant-id
# NEXT_PUBLIC_USER_ID=your-user-id
# NEXT_PUBLIC_APP_ID=your-app-id
# NEXT_PUBLIC_THREAD_ID=your-thread-id
```

### Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local development note: avoid CORS by using Next proxy

For local development you can avoid CORS/preflight issues by making the frontend call a relative API path and letting Next.js proxy or the server-side route forward requests to your backend.

1. Create `.env.local` in the project root with:

```
NEXT_PUBLIC_API_URL=/api/v1/chat/context
BACKEND_URL=http://127.0.0.1:11211
```

2. Restart Next dev:

```
npm run dev
```

3. The frontend will POST to `/api/v1/chat/context` (same-origin). The server-side route `app/api/v1/chat/context/route.ts` will forward requests to `BACKEND_URL` and transparently proxy the SSE stream back to the client. This avoids changing the backend CORS settings for local development.

(If you prefer to enable CORS on the backend, add FastAPI's `CORSMiddleware` or Express' `cors()` middleware.)
