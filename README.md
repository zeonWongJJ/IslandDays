# 岛屿生活 · Island Life

一个用 **React Three Fiber + three.js** 构建的动物森友会式 3D 养成游戏。
砍树、钓鱼、捕虫、挖矿、种花、建房子、摆家具、逛博物馆、和 NPC 交朋友——慢慢把荒岛变成自己的家。

> 当前已实现：移动采集、钓鱼捕虫、商店经济、多房间房屋与家具、博物馆捐赠、
> NPC 好感与送礼、动物伙伴、昼夜天气、节庆活动、NookPhone、程序化音乐、Kenney GLTF 模型。
>
> **下一步重心**：加深现有系统（扩充鱼虫种类、丰富 NPC 对话），而非继续铺新功能。

---

## 快速开始

需要 Node 20.19+。

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 → http://localhost:5173
npm test           # 运行关键玩法回归测试
npm run build      # 类型检查 + 生产构建（输出到 dist/）
npm run preview    # 本地预览生产构建
npm run lint       # ESLint 检查
```

首次进入会自动生成一座随机岛屿并存档到 `localStorage`。
想重新开始：游戏内右上角「重置」按钮，或浏览器控制台 `localStorage.removeItem('ac-save-v1')` 后刷新。

---

## 操作说明

| 操作 | 按键 |
|---|---|
| 移动 | `W` `A` `S` `D` / 方向键 |
| 冲刺 | `Shift` |
| 旋转视角 | 鼠标左键拖拽 |
| 缩放 | 鼠标滚轮 |
| 交互（砍树 / 钓鱼 / 捕虫 / 进出门 / 摆放家具 / 挖矿 / 对话） | `E` |
| 切换工具 | `1` 斧头 / `2` 钓竿 / `3` 捕虫网 / `4` 铲子 |
| 收起工具 / 室内收回家具模式 | `X` |
| 旋转家具（摆放中） | `R` |
| 取消摆放/收回 | `Q` 或点 UI 按钮 |
| 背包 | `Tab` |
| 商店 | `B` |
| 小地图 | `M` |
| 图鉴 / 博物馆面板 | `C` |
| NookPhone | `N` |
| 设置 | `O` |
| 帮助 | `H` |

> 树枝、木材等掉落物**靠近会自动捡起**，无需按键。
> 钓鱼：装备钓竿在水边涟漪处按 E 抛竿，等鱼漂猛沉时再按 E 拉杆，连续按 E 填满进度条即可收获。
> 捕虫：装备捕虫网靠近飞舞的虫按 E 挥网；越近越稳，边缘可能失手。
> 挖矿：装备铲子靠近岩石按 E，产出石头/铁矿/金矿，冷却 60 游戏分钟。
> 种植：装备铲子按 E 挖坑 → 选树苗/花种按 E 种下，数日后成长。
> 建房：走近房屋按 E 进屋；进屋后开背包(Tab)选家具点"摆放"，R 旋转、E 放置；收回按 X 进入收回模式，走到家具旁按 E。

---

## 技术栈

| 类别 | 选型 | 说明 |
|---|---|---|
| 构建 | Vite 8 + React 19 + TypeScript | 严格 TS（`noUnusedLocals` / `verbatimModuleSyntax`） |
| 3D 渲染 | `@react-three/fiber` 9 + `three` | 声明式场景图 |
| 辅助库 | `@react-three/drei` | `KeyboardControls` / `useGLTF` / `Environment` 等 |
| 状态管理 | `zustand` 5 + `persist` 中间件 | 全局状态 + localStorage 自动持久化 |
| 3D 模型 | Kenney GLTF（CC0） | 138 个模型：家具、自然、角色、宠物 |
| 音频 | Web Audio API | 零音频文件，全部程序化合成 |

没有物理引擎，使用自定义圆形碰撞，保持轻量。

---

## 项目结构

```
src/
├── main.tsx                      # 入口
├── App.tsx                       # <Canvas> + UI 覆盖层
├── config/                       # 纯数据，无逻辑
│   ├── constants.ts              # 所有平衡常量（世界/树/斧/鱼/虫/商店/时钟/房屋/博物馆/存档…）
│   ├── items.ts                  # 物品 & 工具定义表
│   ├── recipes.ts                # 家具合成配方
│   ├── mapLayout.ts              # 建筑位置 / 桥梁 / 广场布局
│   ├── npcs.ts                   # NPC 行程表 & 对话 & 喜好
│   ├── animals.ts                # 动物配置
│   ├── spawns.ts                 # 鱼虫按时段/季节出没表
│   ├── weather.ts                # 天气类型 & 季节概率
│   └── events.ts                 # 节庆活动定义（樱花季/夏祭/万圣节/冬季节日）
├── systems/                      # 纯逻辑，无渲染
│   ├── save.ts                   # SaveData 类型 + 加载/保存/版本迁移（v13）
│   ├── worldgen.ts               # 确定性 PRNG 生成岛屿/树木/鱼点/虫点/岩石
│   ├── terrain.ts                # 地形高度场 + 地表分区 + 行走阻挡
│   ├── economy.ts                # 商店定价/维修费纯函数
│   └── audio.ts                  # 程序化音效 + BGM 合成（Web Audio API）
├── store/
│   └── useGameStore.ts           # zustand store：所有玩法 action
├── game/                         # 3D 场景（在 <Canvas> 内）
│   ├── Experience.tsx            # 场景根：装配所有系统 + 室内外切换
│   ├── Player.tsx                # 玩家：移动 + 碰撞 + 交互分发 + 工具切换
│   ├── CameraRig.tsx             # 第三人称跟随相机（室内/室外自适应）
│   ├── ClockSystem.tsx           # 实时时钟 + 树桩/植物成长检查
│   ├── DayNight.tsx              # 昼夜：太阳/月光/环境/雾/天空色
│   ├── WeatherSystem.tsx         # 天气切换 + 雨/雪/闪电粒子
│   ├── MusicSystem.tsx           # BGM / 环境音按场景/时间/天气切换
│   ├── EventSystem.tsx           # 节庆检测 + 通知
│   ├── EnvironmentVFX.tsx        # 落叶/萤火虫等环境粒子
│   ├── controllers/              # 键盘映射 + 共享 ref
│   ├── world/                    # 地形/水/树木/岩石/装饰/桥/瀑布/背景山/海岸碎石
│   ├── activities/               # 钓鱼状态机 / 捕虫系统
│   ├── housing/                  # 房屋外观 + 多房间室内（客厅/卧室/厨房）
│   ├── shop/                     # 商店建筑外观 + 商店 UI
│   ├── museum/                   # 博物馆建筑 + 室内展厅 + 捐赠 UI
│   ├── npc/                      # NPC 角色 + 行程移动 + 对话
│   ├── animals/                  # 流浪动物（猫/狗）+ 互动
│   └── ui/                       # HTML 覆盖层（Canvas 外）
│       ├── GameUI.tsx            # UI 总装
│       ├── HUD.tsx               # 日期/时间/铃钱
│       ├── Toolbar.tsx           # 工具槽
│       ├── Overlays.tsx          # 交互提示 + Toast + 对话框
│       ├── MiniMap.tsx           # 小地图
│       ├── CollectionPanel.tsx   # 鱼虫图鉴
│       ├── SettingsPanel.tsx     # 音量/FOV/灵敏度设置
│       ├── NookPhone.tsx         # 手机 UI（地图/图鉴/设置/帮助）
│       └── game.css              # 所有 UI 样式
└── assets/models/                # Kenney GLTF 模型（138 个）
```

---

## 架构要点

### 三层分离
1. **表现层**（`game/` 下的 R3F 组件）：只读 store、派发 action，不含玩法规则。
2. **状态层**（`store/useGameStore.ts`）：所有玩法修改通过 action，组件不直接改状态。
3. **逻辑层**（`systems/`）：纯函数（存档迁移、世界生成、经济、音频），无 React/three 依赖。

### 高频数据用 ref，不进 store
玩家位置、相机角度每帧变化，走 zustand 会触发 `persist` 每帧写 localStorage。
`GameRefs` 上下文用 `useRef` 持有：`playerRef` / `cameraYawRef` / `cameraDistanceRef`。
存档里的 `player.pos` 由 `Player.tsx` 节流写回（每 0.25 秒一次）。

### 实时时钟
游戏时钟与现实时间同步（`realClockNow()`），1 天 = 现实 1 天。
这意味着白天玩就是白天，晚上玩就是晚上——和动森一样。
节庆活动按 `day % 365` 映射到年内日期触发。

### 存档与迁移
- localStorage key：`ac-save-v1`
- 当前版本：**v13**，含 12 个迁移函数（v2→v13）
- `persist.partialize` 只保留 `SaveData` 字段，瞬时状态不写盘
- 新增持久字段时：① `SaveData` 加字段 ② `defaultSave()` 给默认值 ③ 升 `SAVE.version` + 加迁移

### 数据驱动
- 新增物品：`config/items.ts` 加一项，UI/商店/背包自动识别。
- 调平衡：只改 `config/constants.ts`，无需动逻辑代码。
- 新增鱼虫：`config/spawns.ts` 加出没表条目。
- 新增节庆：`config/events.ts` 加事件定义。

---

## 已实现功能

### 采集与工具
- 程序化低多边形岛屿（三层台地 + 悬崖 + 沙滩 + 水下地形）
- 砍树（3 连击 → 倒下动画 → 掉落木材+树枝 → 树桩 → 3 游戏日后重生）
- 挖矿（铲子敲岩石 → 石头/铁矿/金矿，60 分钟冷却）
- 种植（挖坑 → 树苗/花种 → 4 阶段成长）
- 工具耐久 + 三级升级系统（用铁矿/金矿+铃钱升级）
- 地面掉落物自动拾取

### 钓鱼
- 完整状态机：抛竿 → 等待 → 上钩 → 拉杆（连续按 E 填进度条）→ 收获
- 鱼漂下沉动画、水面涟漪、鱼影游动、钓线曲线、鱼模型翻跳
- 3 种鱼按季节/时段/权重抽取，鱼点 30 分钟冷却
- 钓竿挥杆动画 + 全套音效

### 捕虫
- 虫点定时刷新（隐藏 → 活跃 → 冷却），靠近惊飞
- 2 种虫按季节/时段出没，挥网按距离有失手概率
- 稀有虫带发光效果

### 商店与经济
- 购买工具/家具/图纸、修理工具（按耐久差计费）、出售物品（单卖/全卖）
- 定价/维修纯函数 `systems/economy.ts`
- 工具升级（Lv1→Lv2→Lv3）

### 房屋与家具
- 多房间房屋（客厅/卧室/厨房），门洞切换房间
- 网格摆放家具（R 旋转、E 放置、Q 取消、X 收回）
- 家具来源：商店直购 或 买图纸+材料合成
- 10+ 种家具（Kenney GLTF 模型）

### 博物馆
- 古典建筑外观（柱廊 + 三角楣 + 花盆）
- 室内展厅：3 个鱼缸（程序化游动的鱼）+ 2 个虫展示柜 + 捐赠台 + 完成纪念牌
- 捐赠 UI：5 件收藏品，集齐奖励 5000 铃钱

### NPC 与社交
- 3 个 NPC（Mira/Tao/Lina），按时段有不同行程位置
- 每日首次对话、送礼加好感（喜好物品 +5）、好感 ≥30 解锁配方
- 好感度 5 心显示
- 节庆特殊台词

### 动物
- 2 种流浪动物（猫/狗），岛上漫游，每日首次互动

### 昼夜与天气
- 太阳东升西落 + 日出日落暖色 + 夜晚月光冷蓝
- 5 种天气（晴/多云/雨/暴雨/雪），季节概率加权，每 480 游戏分钟切换
- 雨/雪粒子 + 闪电闪烁 + 雨天环境音

### 节庆活动
- 4 个节庆（樱花季 3 月 / 夏祭 7 月 / 万圣节 10 月 / 冬季节日 12 月）
- 活动期间岛上出现主题装饰，NPC 有节日台词

### NookPhone
- 按 N 打开手机 UI（地图 / 图鉴 / 设置 / 帮助 四个 app）

### 音乐与音效
- 程序化 Web Audio 合成，零音频文件
- 5 种 BGM（白天/夜晚/雨天/室内/博物馆），五声音阶生成式旋律
- 20+ 种音效（脚步/砍树/抛竿/咬钩/收杆/捕虫/拾取/开门/商店铃/雨声…）

### 其他
- 小地图（M 切换，显示建筑/鱼点/虫点标记）
- 鱼虫图鉴（C 打开，已收集/未收集状态）
- 设置面板（音量/FOV/灵敏度，独立 localStorage）
- Kenney GLTF 模型集成（家具/自然/角色/宠物 共 138 个）
- 背景远景（12 座低多边形山 + 帆船）
- 桥梁 ×2 + 瀑布 + 岛屿路灯 + 围栏路标装饰

---

## 已知限制

- 无标题画面 / 角色命名 / 加载进度条——直接进岛。
- 鱼虫种类较少（3 鱼 + 2 虫），博物馆很快集齐。
- NPC 对话重复度高（每人 2 句问候 + 2 句送礼回复），无任务系统。
- NPC 房屋不可进入，仅装饰。
- 碰撞为简单圆形，未引入物理引擎。
- 未做移动端触屏适配。
- `useGameStore.ts` 已达 1100+ 行，`Player.tsx` 600+ 行，有架构债待还。
- 零 git 历史（待首次提交）。

---

## 开发约定

详见 `AGENTS.md`。要点：
- 改动后必跑 `npm run build`（tsc 严格类型检查 + vite 构建）和 `npm run lint`。
- 未使用 import/变量会直接报错（`noUnusedLocals`）。
- 只导入类型必须用 `import type`（`verbatimModuleSyntax`）。
- 导入路径带扩展名（`.ts` / `.tsx`）。
- 不主动 commit，用户要求时再 commit。
- 中文界面文案 / 中文注释；代码标识符用英文。

---

## 许可

代码可自由使用。3D 模型来自 [Kenney](https://kenney.nl)（CC0）。
