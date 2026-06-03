# MrDoc MCP Server

[![version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/lcysts1019-bit/mrdoc-mcp-server)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple.svg)](https://modelcontextprotocol.io)

**让 Claude Code 直接读写你的 MrDoc 文档。**

MrDoc MCP Server 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 的服务器，它将 [MrDoc（觅思文档）](https://github.com/zmister2016/MrDoc) 的 API 暴露给 Claude Code，使你可以在对话中直接搜索、阅读、创建和编辑文档。

## 为什么需要这个项目？

如果你同时使用 Claude Code 和 MrDoc，你可能会遇到这样的场景：

- 想让 Claude 帮你写文档，但需要手动复制粘贴到 MrDoc
- 想让 Claude 参考已有文档来回答问题，但需要手动把内容贴给它
- 想批量更新文档，但一个个操作太麻烦

这个 MCP 服务器解决了这些问题 — Claude Code 可以直接与你的 MrDoc 实例交互，无需任何手动操作。

## 功能特性

### 文档操作

| 工具 | 说明 | 示例指令 |
|------|------|----------|
| `search_docs` | 全文搜索文档 | "帮我搜索关于喷涂工艺的文档" |
| `get_doc` | 获取文档元数据（标题、时间等） | "查看文档 42 的基本信息" |
| `get_doc_content` | 获取文档完整内容（Markdown） | "读取文档 42 的内容" |
| `create_doc` | 创建新文档 | "在项目 3 中创建一篇标题为 XXX 的文档" |
| `update_doc` | 更新已有文档 | "把文档 42 的标题改成 XXX" |
| `get_self_docs` | 获取当前用户的文档列表 | "列出我创建的所有文档" |

### 项目管理

| 工具 | 说明 | 示例指令 |
|------|------|----------|
| `list_projects` | 列出所有知识空间 | "列出所有知识空间" |
| `get_project` | 获取项目详情和目录结构 | "查看项目 3 的详情" |
| `list_docs` | 列出项目下的文档（层级结构） | "列出项目 3 下的所有文档" |
| `get_project_docs` | 获取项目文档列表（分页） | "查看项目 3 的第 2 页文档" |
| `create_project` | 创建新知识空间 | "创建一个名为'技术文档'的知识空间" |

### 媒体资源

| 工具 | 说明 | 示例指令 |
|------|------|----------|
| `upload_img` | 上传图片到 MrDoc | "上传这张图片" |

## 前置条件

- **Node.js** >= 18.0.0
- **Claude Code** 已安装（[安装指南](https://docs.anthropic.com/en/docs/claude-code/overview)）
- **MrDoc 实例** 已部署并运行（[MrDoc 部署指南](https://github.com/zmister2016/MrDoc)）

## 安装

```bash
git clone https://github.com/lcysts1019-bit/mrdoc-mcp-server.git
cd mrdoc-mcp-server
npm install
npm run build
```

## 配置

### 第一步：获取 MrDoc API Token

1. 登录你的 MrDoc 实例
2. 进入 个人中心 → 令牌管理
3. 创建一个新的 API 令牌并复制

### 第二步：注册 MCP 服务器到 Claude Code

```bash
claude mcp add mrdoc \
  -e MRDOC_BASE_URL=https://your-mrdoc-domain.com \
  -e MRDOC_TOKEN=your_api_token_here \
  -- node /path/to/mrdoc-mcp-server/dist/index.js
```

> 将 `/path/to/mrdoc-mcp-server` 替换为你实际的项目路径。

注册后，环境变量由 Claude Code 管理，保存在其配置文件中（通常位于 `~/.claude.json` 或项目级 `.claude/settings.json`）。

你可以用以下命令查看已注册的 MCP 服务器及其配置：

```bash
claude mcp list
```

如需修改环境变量，先删除再重新添加：

```bash
claude mcp remove mrdoc
claude mcp add mrdoc \
  -e MRDOC_BASE_URL=https://new-url \
  -e MRDOC_TOKEN=new_token \
  -- node /path/to/mrdoc-mcp-server/dist/index.js
```

### 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `MRDOC_BASE_URL` | 否 | `http://192.168.9.38:10086` | MrDoc 实例的访问地址，不带末尾 `/` |
| `MRDOC_TOKEN` | **是** | - | API 认证令牌，在 MrDoc 个人中心获取 |
| `MRDOC_USERNAME` | 否 | `admin` | 登录用户名（仅会话认证时使用，一般不需要设置） |
| `MRDOC_PASSWORD` | 否 | `admin` | 登录密码（仅会话认证时使用，一般不需要设置） |

> 通常只需设置 `MRDOC_BASE_URL` 和 `MRDOC_TOKEN` 即可。`MRDOC_USERNAME` 和 `MRDOC_PASSWORD` 仅在某些需要会话认证的操作（如文档创建）中使用，默认值为 `admin`。

### 第三步：验证配置

重启 Claude Code，然后尝试：

```
列出所有知识空间
```

如果返回了你的项目列表，说明配置成功。

## 使用示例

配置完成后，你可以直接在 Claude Code 中用自然语言操作文档：

```
# 搜索文档
帮我搜索关于喷涂工艺的文档

# 读取文档
读取文档 ID 为 42 的内容，帮我总结一下要点

# 创建文档
在项目 3 中创建一篇新文档，标题为"2024年度技术总结"，内容包括...

# 更新文档
把文档 42 的内容追加一段关于性能优化的说明

# 批量操作
帮我把项目 3 下所有文档的标题统一加上 "[已归档]" 前缀
```

## 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/lcysts1019-bit/mrdoc-mcp-server.git
cd mrdoc-mcp-server

# 安装依赖
npm install

# 开发模式（编译并运行）
npm run dev

# 仅编译
npm run build

# 清理编译产物
npm run clean
```

### 项目结构

```
src/
  index.ts       # 入口文件，组装 MCP 服务器
  config.ts      # 环境变量配置管理
  client.ts      # MrDoc HTTP API 客户端（含认证逻辑）
  schemas.ts     # Zod 输入验证 schema
  tools.ts       # 12 个 MCP 工具的定义和处理器
  types.ts       # TypeScript 类型定义
```

### 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.3+ (strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk` ^1.0.0
- **验证**: Zod ^3.22.0
- **HTTP**: 原生 `fetch` API（无额外依赖）

## 常见问题

### 连接失败

确保 `MRDOC_BASE_URL` 可以从你的机器访问。如果 MrDoc 部署在内网，确保你在同一网络环境下。

### 认证失败

- 检查 `MRDOC_TOKEN` 是否正确
- Token 可能已过期，请在 MrDoc 中重新生成

### Claude Code 中看不到工具

确保已重启 Claude Code，并且 MCP 服务器注册成功。可以用以下命令检查：

```bash
claude mcp list
```

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的改动 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [MrDoc（觅思文档）](https://github.com/zmister2016/MrDoc) - 优秀的开源文档管理系统
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP 协议规范
- [Anthropic](https://www.anthropic.com/) - Claude Code 和 MCP SDK
