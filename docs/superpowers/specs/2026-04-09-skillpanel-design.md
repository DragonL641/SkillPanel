# SkillPanel - Claude Code Skill 管理系统设计文档

## Context

用户拥有大量 Claude Code skill（自定义 93 个 + 插件 31 个），分散在不同位置，缺乏统一管理。需要一个轻量 Web 工具来浏览、搜索、启用/禁用 skill，并展示 AI 分析的 skill 原理。

## 目标

- 统一浏览所有自定义 skill 和插件 skill
- 自定义 skill 可通过 symlink 启用/禁用
- 插件 skill 只读展示
- AI 自动分析 skill 原理并缓存
- 一键启动，npm 包分发

## 技术选型

| 组件 | 选择 | 理由 |
|---|---|---|
| 后端 | Express (TypeScript, tsx 运行) | 轻量成熟 |
| 前端 | React + Tailwind | 用户选择 |
| 构建 | Vite + vite-express | 单进程，开发体验好 |
| AI 分析 | Claude API (Anthropic SDK) | 分析 skill 原理 |
| 持久化 | JSON 文件 | 零数据库 |
| 分发 | npm 包 | 支持 `npx skillpanel` |

## 项目结构

```
~/Projects/SkillPanel/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server/
│   ├── index.ts               # Express 入口 + vite-express 集成
│   ├── config.ts              # 配置管理
│   ├── routes/
│   │   ├── skills.ts          # 自定义 skill API
│   │   ├── plugins.ts         # 插件 skill API
│   │   └── analysis.ts        # AI 分析 API
│   └── services/
│       ├── skill-scanner.ts   # 扫描自定义 skill 目录树
│       ├── plugin-scanner.ts  # 扫描插件 skill
│       ├── skill-manager.ts   # symlink 创建/删除
│       └── analyzer.ts        # Claude API 调用 + hash 缓存
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── TabSwitch.tsx      # 自定义/插件 页签切换
│   │   ├── DirTree.tsx        # 目录树（可展开/收缩）
│   │   ├── SkillCard.tsx      # 单个 skill 卡片（纵向排列）
│   │   ├── AnalysisPanel.tsx  # 原理分析（卡片内展开/收缩）
│   │   ├── SummaryBar.tsx     # 底部汇总栏
│   │   ├── SearchBar.tsx      # 搜索框
│   │   └── ConfigModal.tsx    # 配置弹窗
│   └── api/
│       └── client.ts          # API 调用封装
├── index.html
├── public/
└── .skillpanel/               # 运行时数据（gitignore）
    └── analysis-cache.json    # AI 分析缓存
```

## 数据模型

```typescript
// 目录树节点
interface TreeNode {
  type: 'dir' | 'skill';
  name: string;
  path: string;                  // 相对于 customSkillDir 的路径
  children?: TreeNode[];         // dir 类型有子节点
  skill?: SkillMeta;             // skill 类型有元数据
}

interface SkillMeta {
  name: string;
  description: string;           // 从 SKILL.md frontmatter 提取
  enabled: boolean;              // 是否已 symlink 到 ~/.claude/skills/
  hash: string;                  // 内容 hash（用于判断是否需要重新分析）
  hasAnalysis: boolean;          // 是否已有 AI 分析
}

interface PluginInfo {
  name: string;                  // 如 "document-skills@anthropic-agent-skills"
  displayName: string;           // 如 "document-skills"
  installPath: string;
  version: string;
  skills: PluginSkill[];
}

interface PluginSkill {
  name: string;
  description: string;
  path: string;
  hasAnalysis: boolean;
}

interface SkillAnalysis {
  name: string;
  hash: string;
  summary: string;               // AI 生成的原理分析
  analyzedAt: string;
  model: string;
}

interface AppConfig {
  customSkillDir: string;        // 默认: ~/Projects/myskill
  claudeSkillsDir: string;       // 默认: ~/.claude/skills
  claudePluginsDir: string;      // 默认: ~/.claude/plugins
  port: number;                  // 默认: 3210
  anthropicApiKey?: string;      // AI 分析用，也可从环境变量读取
}
```

## API 设计

### 配置

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/config` | GET | 获取当前配置 |
| `/api/config` | PUT | 更新配置 |

### 自定义 Skill

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/skills/custom` | GET | 返回目录树 + skill 元数据 + 启用状态 |
| `/api/skills/custom/:name/enable` | POST | 创建 symlink 到 ~/.claude/skills/ |
| `/api/skills/custom/:name/disable` | POST | 删除 symlink |

`GET /api/skills/custom` 返回结构：
```json
{
  "tree": [
    {
      "type": "dir",
      "name": "content",
      "path": "content",
      "children": [
        {
          "type": "skill",
          "name": "content-digest",
          "path": "content/content-digest",
          "skill": {
            "name": "content-digest",
            "description": "长内容转短摘要",
            "enabled": false,
            "hash": "a1b2c3d4",
            "hasAnalysis": true
          }
        }
      ]
    },
    {
      "type": "skill",
      "name": "baoyu-comic",
      "path": "baoyu-comic",
      "skill": { "name": "baoyu-comic", "enabled": true, ... }
    }
  ]
}
```

### 插件 Skill

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/skills/plugin` | GET | 返回所有插件及其 skill 列表 |

### AI 分析

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/analysis/:source/:name` | GET | 获取缓存的 AI 分析（source: custom/plugin） |
| `/api/analysis/:source/:name` | POST | 触发（重新）分析 |

### 汇总

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/skills/summary` | GET | 统计数据 |

返回：
```json
{
  "customTotal": 93,
  "customEnabled": 6,
  "pluginTotal": 31,
  "grandTotal": 124
}
```

## 核心逻辑

### Skill 扫描

1. 读取 `customSkillDir` 目录
2. 递归遍历，识别含 `SKILL.md` 或 `.skill` 文件的子目录为 skill
3. 检查 `~/.claude/skills/{name}` 是否为 symlink 且指向该 skill → 判断 enabled
4. 计算 SKILL.md 等文件的 content hash
5. 返回目录树结构

### 插件扫描

1. 读取 `~/.claude/plugins/installed_plugins.json`
2. 遍历每个插件的 installPath
3. 检查 `.claude-plugin/marketplace.json` 中的 skills 列表
4. 若无显式列表，扫描 `skills/` 目录
5. 读取每个 skill 的 SKILL.md frontmatter 提取 description

### 启用/禁用

```
启用: fs.symlinkSync(absoluteSkillPath, path.join(claudeSkillsDir, skillName))
禁用: fs.unlinkSync(path.join(claudeSkillsDir, skillName))
```

### AI 分析

1. 计算 skill 内容 hash（SKILL.md + scripts/*.ts 等）
2. 对比 `analysis-cache.json` 中的 hash
3. 若 hash 一致 → 直接返回缓存
4. 若 hash 不同或首次 → 读取 SKILL.md 全文，调用 Claude API 生成原理分析
5. 分析结果写入 `analysis-cache.json`

分析 Prompt 模板：
```
分析以下 Claude Code skill 的工作原理，用中文输出，包含：
1. 一句话概述
2. 核心工作流程（步骤化）
3. 关键依赖（API、工具、库等）

Skill 内容：
{skill_content}
```

## UI 设计

### 页签切换

两个主 tab：「自定义 Skills」「插件 Skills」

### 自定义 Skills 页

- 按文件系统目录层级展示树形结构
- 每个目录节点：显示目录名 + skill 数量，可展开/收缩
- 每个 skill：纵向卡片，一行一个
  - 名称、描述（frontmatter 提取）、启用状态、启用/禁用按钮
  - 原理分析区域（可展开/收缩，显示 AI 分析结果或「未分析」）
  - 重新分析按钮

### 插件 Skills 页

- 按 plugin 分组，每个 plugin 可展开/收缩
- skill 卡片展示（只读，无启用/禁用按钮）
- 同样支持原理分析展开/收缩

### 底部汇总栏

始终固定底部：「自定义: X (已启用 Y)  插件: Z  总计: W」

### 配置弹窗

- 自定义 skill 仓库路径
- Claude skills 目录路径
- 端口号
- Anthropic API Key（密码输入框）

## 分发

### package.json bin 配置

```json
{
  "name": "skillpanel",
  "bin": {
    "skillpanel": "./cli.js"
  },
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

### 用户使用

```bash
# 开发
npm run dev

# 免安装使用
npx skillpanel

# 全局安装
npm install -g skillpanel
skillpanel
```

启动后自动打开浏览器 `http://localhost:3210`。

## 验证方式

1. 启动 `npm run dev`，浏览器访问 http://localhost:3210
2. 自定义 Skills 页签：验证目录树展示正确、skill 启用/禁用正常、symlink 创建/删除正确
3. 插件 Skills 页签：验证所有插件 skill 正确展示
4. AI 分析：首次点击展开触发分析，缓存后再次打开秒加载
5. 配置修改：修改自定义 skill 目录路径后，列表正确刷新
6. 底部汇总：统计数据准确
