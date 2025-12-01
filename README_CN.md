# 链上家庭陪伴 AI（Unibase/Membase Demo）

基于 Unibase 的 Membase 长期记忆层构建链上家庭陪伴助手。每个家庭拥有独立的 Agent、短期/长期记忆、画像，并可选用 BNB Testnet 进行链上授权。项目主体为英文，且支持按家庭设定多语言回复。

## 亮点
- **家庭级独立 Agent**：`family_id` 作为终身身份，独立存储在 `~/.membase/<family_id>/…`（SQLite + Chroma）。
- **自动长期记忆**：每 16 条短期对话自动汇总为长期记忆与家庭画像，可同步到 Hub。
- **链上主权（可选）**：配置 BNB Testnet 钱包后，为家庭创建链上空间，并为服务 Agent 购买权限。
- **跨设备复用**：Hub 同步 + 本地持久化，便于在手机、网页或第三方 Agent 复用记忆。
- **多语言**：家庭级 `language`（如 `en/zh/es/fr/ja`），输入可混合，输出遵循该语言。
- **开箱即用**：FastAPI 提供家庭注册、聊天、记忆快照接口。

## 快速开始
1) 安装依赖
```bash
pip install -r requirements.txt
```

2) 配置环境（复制 `.env.example` → `.env` 并填写）
- `OPENAI_API_KEY`（必填）
- `OPENAI_MODEL_NAME`（默认 `gpt-4.1-mini`）
- `MEMBASE_ACCOUNT` / `MEMBASE_SECRET_KEY` / `MEMBASE_ID`（可选；启用 BNB Testnet 链上授权）
- `MEMBASE_HUB`（默认 testnet）

3) 运行服务
```bash
uvicorn family_companion.server:app --host 0.0.0.0 --port 8000
# 或 python -m family_companion
```

4) 多语言
- 注册家庭时传入 `language`（ISO 简码，如 `zh`/`en`/`es`/`fr`/`ja`），回复将使用该语言。

## API 示例
注册家庭（可自定义 family_id，默认生成 slug）：
```bash
curl -X POST http://localhost:8000/families \
  -H "Content-Type: application/json" \
  -d '{"name":"Li 家庭","description":"周末爱露营，孩子 8 岁。","language":"zh"}'
```

聊天写入记忆：
```bash
curl -X POST http://localhost:8000/families/li/messages \
  -H "Content-Type: application/json" \
  -d '{"sender":"妈妈","content":"周末带孩子去哪玩？"}'
```

查看记忆快照（STM/LTM/Profile）：
```bash
curl http://localhost:8000/families/li/memory
```

查看已注册家庭：
```bash
curl http://localhost:8000/families
```

## 目录概览
- `family_companion/server.py`：FastAPI 入口
- `family_companion/service.py`：家庭注册、链上访问、Agent 调度
- `family_companion/agent.py`：家庭陪伴 Agent，结合 LTMemory 上下文生成回复
- `family_companion/memory.py`：每个家庭独立 `LTMemory`（STM/LTM/画像）
- `family_companion/chain.py`：链上封装，调用 `membase_chain.createTask/buy`
- `family_companion/state.py`：家庭元数据，存于 `~/.membase/family_agents/state.json`
- `.env.example`：环境模板

## 技术说明
- **框架**：FastAPI + Uvicorn（Python）；记忆基于 Unibase Membase (`membase.memory.LTMemory`：SQLite + Chroma)。
- **LLM**：OpenAI（默认 `gpt-4.1-mini`）。
- **链上**：`membase.chain.chain`（Web3, BNB Testnet RPC）创建家庭 task、购买权限；若无凭据则自动 no-op。
- **存储**：`~/.membase/<family_id>/sql.db`（对话）与 `~/.membase/<family_id>/rag`（向量库）；`MEMBASE_AUTO_UPLOAD` 控制 Hub 上传。
- **后台归纳**：每 16 条 STM 自动生成 LTM，并刷新家庭画像。
- **多语言**：家庭级 `language` 约束输出语言，输入可混合。

## 记忆与画像流程
- STM：每条对话写入 SQLite，并入 Chroma 便于检索。
- LTM：每 16 条 STM 归纳为 LTM，同时更新家庭画像。
- 存储：`~/.membase/<family_id>/sql.db` 与 `~/.membase/<family_id>/rag`。
- Hub 同步：`MEMBASE_AUTO_UPLOAD=true` 时推送到 Membase Hub。

## 链上（可选）
设置 `MEMBASE_ACCOUNT`、`MEMBASE_SECRET_KEY`、`MEMBASE_ID` 后：
- 注册家庭时在链上创建空间（押金 `MEMBASE_TASK_PRICE`，BNB Testnet）。
- 服务 Agent 自动购买/校验权限。
- 参考 `family_companion/chain.py`（依赖 `membase/chain/chain.py`）。

## 扩展思路
- 接入家庭硬件/日历丰富上下文。
- 将 FastAPI 封装为 Telegram/微信/WhatsApp Bot 共享同一记忆空间。
- 在 API 层增加签名校验（参考 `membase/auth.py`），限制写入。
- 调整 `LTMemory` 的归纳频率/prompt，或把 LTM 上链。

## 验证
- 健康检查：`curl http://localhost:8000/health`，确认 `status: ok`、链上状态。
- 记忆验证：多轮对话后调用 `/families/{id}/memory`，查看 LTM/画像更新。

> 官方文档见 [Unibase Docs](https://openos-labs.gitbook.io/unibase-docs/)。
