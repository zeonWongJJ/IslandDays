# AGENTS.md — 给后续开发者 / AI 助手的工作指南

读这份文件前，先读 `README.md` 了解项目目标与架构。本文件聚焦「怎么继续动手」的约定。

## 验证命令（每次改动后必跑）

```bash
npm run build      # = tsc -b 严格类型检查 + vite 生产构建。通过即视为可用。
npm run lint       # ESLint
npm run dev        # 本地跑起来手动验证
```

**重要**：本项目 TypeScript 开启了 `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax`。
- 未使用的 import / 变量会直接报错。删掉它们，不要用 `void xxx` 或 `export const _x` 绑架。
- `verbatimModuleSyntax` 要求：**只导入类型时必须用 `import type`**；混用时 `import { foo, type Bar }`。
- 导入路径必须带扩展名（`.ts` / `.tsx`），因为 `allowImportingTsExtensions: true`。

## 目录层级与导入路径（易踩坑）

```
src/game/Player.tsx          ← 直接在 game/ 下
src/game/controllers/*       ← game/ 的子目录
src/config/*  src/store/*  src/systems/*   ← src/ 的子目录
```

从 `src/game/<文件>.tsx` 出发：
- 去 `config/` / `store/` / `systems/` → `../xxx/yyy.ts`（**一层** `..`）
- 去 `game/controllers/` → `./controllers/yyy.tsx`（**不要**写 `../controllers`）

从 `src/game/world/<文件>.tsx` 出发：
- 去 `config/` / `store/` → `../../xxx/yyy.ts`（**两层** `..`）
- 去 `game/` 同级 → `../yyy.tsx`

> 历史教训：Phase A 初版因多写一层 `..` 导致一连串「Cannot find module」+ 隐式 any。
> 新建文件时先想清楚自己在第几层。

## 状态管理约定

- **所有玩法修改走 `useGameStore` 的 action**，组件不直接 `set` 内部字段。
- 新增 action：在 `GameState` 接口声明签名，在 `create(...)` 实现里写逻辑。
- **不要把每帧变化的数据放进 zustand**（会触发 persist 写 localStorage）。用 `GameRefs` 的 ref。
  需要新的高频共享数据时，在 `GameRefs.tsx` 的 `GameRefs` 接口加 ref 字段并在 Provider 里初始化。
- 持久化字段 = `SaveData`。`persist.partialize` 已经只挑这些字段写盘；新增持久字段时：
  1. `systems/save.ts` 的 `SaveData` 加字段；
  2. `defaultSave()` 给默认值；
  3. 升 `SAVE.version` 并在 `migrations` 加迁移（给老存档补默认值）。

## 数据驱动约定

- 物品 / 工具定义只在 `config/items.ts`。别在组件里硬编码物品名或价格。
- 平衡常量只在 `config/constants.ts`（含 WORLD / TREE / AXE / TOOL_USE / FISH / BUG / SHOP / CLOCK / SAVE）。调手感改这里，不动逻辑。
- 商店定价/维修费必须走 `systems/economy.ts` 的纯函数，别在组件里重算。
- 新增世界实体类型时，仿照 `TreeData` / `FishSpot` / `BugSpot`：在 `SaveData` 持有数组 + `worldgen.ts` 生成 + 一个 R3F 组件渲染 + 在 `Player.tsx` 的交互循环里处理。

## 活动系统约定（Phase B 起）

- 活动的“状态机推进 + 每帧计时”放在 `game/activities/` 下的组件，用 `useFrame` + 本地 `useRef` 驱动，**不要每帧写 store**。
- 只在**状态切换的离散时刻**调 store action（如 `setFishingPhase` / `catchFish` / `missFish`）。参考 `FishingController.tsx`。
- 玩家交互的“寻找最近可交互目标 + 按 E 分发”集中在 `Player.tsx` 的一个交互块里，按距离统一选最近，避免多组件抢 `interactHint`。
- 钓鱼会话期间用 `store.fishing.phase !== 'idle'` 作为闸门，在 `Player.tsx` 顶部禁用移动、改走拉杆分支。
- 虫/鱼点的“冷却到期恢复”由各自组件在帧里检查 `readyAt` 并 setState（节流，非每帧）。

## 渲染约定

- 低多边形风格：材质用 `flatShading`，`roughness` 偏高、`metalness` 多为 0。
- 占位几何体集中在一个组件里（如 `Tree.tsx`、`Player.tsx`），后续替换 GLTF 时只动这一个文件。
- 用 `useMemo` 缓存几何体/材质，避免每帧重建。
- `useFrame` 里不要做重计算或每帧 setState；读 ref、用 `getState()` 读 store、必要时节流写回。

## 新增系统的落点（Phase D+）

| 要做 | 放哪 | 备注 |
|---|---|---|
| NPC | `game/npc/NPC.tsx` + `DialogueUI.tsx` | 行程表放 `config/npcs.ts` |
| 对话脚本 | `systems/dialogue.ts` | 纯函数解析脚本 |
| 鱼虫按时段刷新 | 扩展 `worldgen.ts` + 各活动组件 | 结合 `clock.minutes` |
| 新家具 | `config/items.ts` 加物品 + `config/recipes.ts` 加配方 + `HouseInterior.tsx` 的 `FurnitureShape` 加造型 | 数据驱动 + 单点渲染 |
| 新房屋/多房间 | `game/housing/` 扩展 + `SaveData.house` | 进屋靠 `scene` 字段切换 |

## 提交与代码风格

- 不写注释除非逻辑非显然；复杂数值含义写在一行 `// xxx`。
- 不主动 commit；用户要求时再 commit，且只 stage 相关文件。
- 中文界面文案、中文注释；代码标识符用英文。
- 不引入新依赖前先确认是否真的需要；R3F/drei/zustand 已覆盖大部分场景。

## 验证清单（提交前自检）

- [ ] `npm run build` 通过（tsc + vite）
- [ ] `npm run lint` 无新增报错
- [ ] `npm run dev` 能进岛、能移动、能砍树、能捡树枝、能钓鱼、能捕虫、能买卖、能进屋摆家具
- [ ] 刷新页面后存档保留（位置、背包、树木/鱼点/虫点状态、已摆放家具）
- [ ] 没有引入未使用 import / 变量
- [ ] 新持久字段已加迁移并升 `SAVE.version`
