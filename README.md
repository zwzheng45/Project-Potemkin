# 链上家庭陪伴 AI（Unibase/Membase Demo）

基于 Unibase 的 Membase 长期记忆层与链上权限控制，构建“家庭陪伴”AI 助手。每个家庭拥有独立的 Agent、短期/长期/画像记忆，以及在 BNB Testnet 上的链上授权入口。

## 亮点
- **家庭级独立 Agent**：`family_id` 即一个家庭的终身身份，拥有独立 SQLite + Chroma 的记忆空间 (`~/.membase/<family_id>/…`)。
- **自动长期记忆**：`LTMemory` 会把 16 条对话自动汇总为长期记忆与家庭画像，并可同步到 Membase Hub。
- **链上权限与记忆主权**：当设置 BNB Testnet 钱包后，会为每个家庭在合约中创建空间并为服务 Agent 购买权限。
- **跨设备/跨平台互通**：Membase Hub + 本地持久化，方便后续在手机、网页或第三方 Agent 中复用。
- **多语言陪伴**：注册家庭时可指定首选语言（如 `zh/en/es/fr/ja`），所有回复按该语言输出，输入支持多语言混合。
- **开箱即用的 FastAPI**：提供家庭注册、聊天、记忆快照 API，可直接跑一个 demo。

## 快速开始
1) 安装依赖
```bash
pip install -r requirements.txt
```

2) 准备环境变量（复制 `.env.example` 为 `.env` 并填写）
- `OPENAI_API_KEY`：必须，长期记忆与对话生成使用。
- `OPENAI_MODEL_NAME`：默认 `gpt-4.1-mini`。
- `MEMBASE_ACCOUNT` / `MEMBASE_SECRET_KEY` / `MEMBASE_ID`：可选，用于链上授权（BNB Testnet）。
- `MEMBASE_HUB`：Membase Hub 地址，默认 testnet。

3) 运行服务
```bash
uvicorn family_companion.server:app --host 0.0.0.0 --port 8000
# 或 python -m family_companion
```

4) 多语言
- 注册家庭时传入 `language`（ISO 简码，如 `zh`/`en`/`es`/`fr`/`ja`），服务会按该语言回复。

## API 示例
注册家庭（可自定义 family_id，不填则自动生成 slug）：
```bash
curl -X POST http://localhost:8000/families \
  -H "Content-Type: application/json" \
  -d '{"name":"Li 家庭","description":"喜欢周末露营，孩子 8 岁。","language":"zh"}'
```

聊天并写入记忆：
```bash
curl -X POST http://localhost:8000/families/li/messages \
  -H "Content-Type: application/json" \
  -d '{"sender":"妈妈","content":"周末带孩子去哪里玩好？"}'
```

查看记忆快照（最新短期、长期摘要、家庭画像）：
```bash
curl http://localhost:8000/families/li/memory
```

查看已注册家庭：
```bash
curl http://localhost:8000/families
```

## 目录速览
- `family_companion/server.py`：FastAPI 入口。
- `family_companion/service.py`：管理家庭注册、链上授权、调用 Agent。
- `family_companion/agent.py`：家庭陪伴 Agent，结合长期记忆生成回复。
- `family_companion/memory.py`：为每个家庭初始化独立 `LTMemory`（短期/长期/画像）。
- `family_companion/chain.py`：链上封装，按需调用 `membase_chain.createTask/buy`。
- `family_companion/state.py`：家庭元数据持久化到 `~/.membase/family_agents/state.json`。
- `.env.example`：环境变量模板。

## 长期记忆与画像机制
- 短期记忆：每条对话写入 SQLite，并进入 Chroma 便于检索。
- 长期记忆：每 16 条短期对话自动汇总为长期记忆（`ltm`），同时更新家庭画像（`profile`）。
- 存储位置：`~/.membase/<family_id>/sql.db`（对话）与 `~/.membase/<family_id>/rag`（向量库）。
- Hub 同步：`MEMBASE_AUTO_UPLOAD=true` 时会把记忆推送到 Membase Hub，跨设备复用。

## 链上交互（可选）
配置好 `MEMBASE_ACCOUNT`、`MEMBASE_SECRET_KEY`、`MEMBASE_ID` 后：
- 注册家庭时，会调用合约创建对应 task（家庭空间），默认押金 `MEMBASE_TASK_PRICE`（BNB Testnet）。
- 自动为服务 Agent 购买/检查权限，确保链上拥有操作记忆的主权凭证。
- 相关代码：`family_companion/chain.py`，依赖 `membase/chain/chain.py`。

## 开发与扩展思路
- 接入家庭硬件/日历：在 `FamilyAgent.chat` 前注入设备状态或日程，形成更丰富上下文。
- 多渠道接入：把 FastAPI 封装成 Telegram/微信/WhatsApp Bot，复用同一套记忆空间。
- 增强安全：把签名校验（`membase/auth.py`）挂到 API 层，限制只有链上授权的钱包可写入记忆。
- 自定义摘要策略：可在 `LTMemory` 中调整归纳频率、prompt 或把长期记忆写入额外链上存储。

## 验证
- 环境检查：`curl http://localhost:8000/health`，确认 `status` 为 `ok`，`onchain` 是否启用。
- 记忆验证：多轮对话后再调用 `/families/{id}/memory`，应能看到长期摘要与画像更新。

> 需要官方文档请参考 [Unibase Docs](https://openos-labs.gitbook.io/unibase-docs/)。
