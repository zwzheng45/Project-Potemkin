# 黑客松前端 UI

基于 **Vite + React + TypeScript + Tailwind CSS + React Query**，用于可视化家庭陪伴 AI 的链上能力：

- 家庭注册：创建 family agent、设置描述 / 自定义 `family_id` / 可选 task price。
- 对话体验：多身份（妈妈/爸爸/孩子/长辈）切换，实时查看 AI 回复。
- 记忆快照：并列展示 STM / LTM / Profile 与后台 `context_used`。
- 状态面板：读取 `/health` 和家庭数量，方便展台演示。

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

前端默认请求 `http://localhost:8000`，可通过 `.env` 或命令行设置：

```bash
VITE_API_BASE_URL="https://your-domain" npm run dev
```

打包：

```bash
npm run build
```

## 目录
- `src/App.tsx`：主界面、组件和布局。
- `src/lib/api.ts`：统一封装后端请求。
- `src/types.ts`：与 FastAPI schema 对齐的数据类型。
- `tailwind.config.js`：深色主题 + 自定义 brand 配色。

## 设计细节
- 采用玻璃拟态 + 渐变光影，突出链上科技感。
- React Query 负责家庭/记忆/健康的实时刷新。
- 聊天区本地缓存多轮对话，增强 demo 流程感。

> 如果在浏览器调用接口遇到跨域问题，请确认后端已运行且 `family_companion.server` 启用了 CORS（项目中默认已开启）。
