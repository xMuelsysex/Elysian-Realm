# 崩坏三风格 2.5D 宿舍场景系统 - 设计文档

## 一、概述

**目标**：构建崩坏三风格的 2.5D 宿舍场景，支持角色移动、交互、对话系统。

**核心特点**：
- 分层渲染（背景、中景、角色、前景）
- 视差滚动效果
- Q版角色动画
- 点击交互系统
- 粒子特效和动态光影

**技术栈**：
- Pixi.js v8 - 2D WebGL 渲染引擎
- React - UI 层
- TypeScript

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────┐
│   React UI 层 (对话框、面板、菜单)    │
├─────────────────────────────────────┤
│   交互层 (事件处理、状态管理)         │
├─────────────────────────────────────┤
│   Pixi.js 渲染层                     │
│   ├─ 前景层 (可交互物体、特效)        │
│   ├─ 角色层 (Q版小人、动画)          │
│   ├─ 中景层 (家具、装饰)             │
│   └─ 背景层 (墙壁、窗户、地板)        │
├─────────────────────────────────────┤
│   数据层 (场景配置、角色状态)         │
└─────────────────────────────────────┘
```

**设计原则**：
- **单一职责 (S)**: 每层独立渲染和管理
- **开闭原则 (O)**: 可扩展新场景和角色，无需修改核心代码
- **依赖倒置 (D)**: 依赖抽象的场景配置，而非具体实现

### 2.2 文件结构

```
src/app/realm/DormScene/
├── index.ts                          # 导出主组件
├── DormScenePixiStage.tsx           # Pixi 主舞台
├── scene-config.json                 # 场景配置
│
├── Core/
│   ├── SceneLayerManager.ts         # 分层管理
│   ├── RenderLoop.ts                # 渲染循环
│   └── AssetLoader.ts               # 资源加载
│
├── Renderers/
│   ├── BackgroundRenderer.ts        # 背景渲染
│   ├── FurnitureRenderer.ts         # 家具渲染
│   └── GroundRenderer.ts            # 地板渲染
│
├── Characters/
│   ├── CharacterSprite.ts           # 角色精灵
│   ├── CharacterManager.ts          # 角色管理
│   ├── AnimationStateMachine.ts     # 动画状态机
│   └── PathfindingSystem.ts         # 寻路系统
│
├── Effects/
│   ├── ParticleSystem.ts            # 粒子系统
│   ├── LightingSystem.ts            # 光照系统
│   └── PostProcessing.ts            # 后处理(可选)
│
├── Interaction/
│   ├── InteractionHandler.ts        # 交互处理
│   ├── CameraController.ts          # 相机控制
│   └── InputManager.ts              # 输入管理
│
└── Assets/
    ├── textures/                     # 场景纹理
    ├── characters/                   # 角色资源
    └── particles/                    # 粒子贴图
```

---

## 三、核心组件设计

### 3.1 场景渲染系统

**DormScenePixiStage.tsx** (主场景容器)
- 职责：初始化 Pixi.js Application，管理渲染循环
- 依赖：Pixi.js v8
- 接口：DormSceneViewModel (场景数据)

**SceneLayerManager.ts** (分层管理器)
- 职责：管理背景、中景、前景、角色四个独立图层
- 功能：视差滚动、层级排序、可见性控制
- 方法：
  - `addLayer(layerId: string, zIndex: number): Container`
  - `updateParallax(cameraX: number, cameraY: number): void`

**BackgroundRenderer.ts** (背景渲染器)
- 职责：渲染窗户、墙壁、地板、星空
- 功能：日夜循环、动态光影
- 方法：
  - `renderWindow(x: number, y: number, width: number, height: number): void`
  - `setTimeOfDay(isNight: boolean): void`
  - `updateAmbientLight(color: number, intensity: number): void`

**FurnitureRenderer.ts** (家具渲染器)
- 职责：渲染床、桌子、椅子等家具
- 功能：家具摆放、点击交互
- 数据结构：
```typescript
interface Furniture {
  id: string;
  type: 'bed' | 'desk' | 'chair' | 'decoration';
  x: number;
  y: number;
  sprite: Sprite;
  interactive: boolean;
  onClick?: () => void;
}
```

### 3.2 角色系统

**CharacterSprite.ts** (角色精灵)
- 职责：管理单个角色的渲染和动画
- 功能：
  - Spine 骨骼动画播放 (通过 pixi-spine 插件)
  - 或序列帧动画播放 (通过 AnimatedSprite)
  - 状态机管理 (Idle, Walk, Talk, Action)
- 方法：
```typescript
class CharacterSprite {
  playAnimation(name: 'idle' | 'walk' | 'talk', loop: boolean): void;
  moveTo(targetX: number, targetY: number, speed: number): void;
  setFacingDirection(direction: 'left' | 'right'): void;
  showDialogue(text: string): void;
}
```

**CharacterManager.ts** (角色管理器)
- 职责：管理场景中的所有角色
- 功能：角色加载、状态同步、碰撞检测
- 数据来源：realmMap.agents (现有的 ViewModel)

**PathfindingSystem.ts** (寻路系统)
- 职责：实现点击移动功能
- 算法：A* 寻路或简单直线插值
- 方法：
```typescript
interface PathfindingSystem {
  findPath(start: Point, end: Point): Point[];
  isWalkable(x: number, y: number): boolean;
}
```

### 3.3 粒子和特效系统

**ParticleSystem.ts** (粒子系统)
- 职责：GPU 加速的粒子渲染
- 实现：使用 ParticleContainer 优化性能
- 效果类型：
  - 漂浮光点 (Floating Lights)
  - 星尘效果 (Star Dust)
  - 点击特效 (Click Sparkles)

**LightingSystem.ts** (光照系统)
- 职责：动态光影效果
- 功能：
  - 环境光渐变
  - 窗户光晕
  - 角色光圈
- 实现：使用 Graphics + BlurFilter

### 3.4 交互系统

**InteractionHandler.ts** (交互处理器)
- 职责：统一管理所有点击、悬停、拖拽事件
- 功能：
  - 点击角色 → 显示对话
  - 点击家具 → 触发动作
  - 点击地面 → 角色移动
  - 拖拽 → 相机平移

**CameraController.ts** (相机控制器)
- 职责：管理视口移动和缩放
- 功能：
  - 平滑跟随角色
  - 鼠标拖拽移动
  - 滚轮缩放 (0.8x ~ 1.5x)

---

## 四、数据流设计

### 4.1 数据结构

```typescript
// 场景配置 (scene-config.json)
interface DormSceneConfig {
  background: {
    type: 'night' | 'day';
    stars: boolean;
    windowGlow: boolean;
  };
  furniture: Furniture[];
  spawnPoints: Point[];
  walkableArea: Polygon;
}

// 角色数据 (从现有 ViewModel 扩展)
interface DormCharacterData extends RealmMapAgentMarker {
  animationType: 'spine' | 'spritesheet';
  assetPath: string;
  animations: {
    idle: string;
    walk: string;
    talk: string;
  };
}

// 运行时状态
interface DormSceneState {
  characters: Map<string, CharacterSprite>;
  selectedCharacterId?: string;
  cameraPosition: Point;
  timeOfDay: 'day' | 'night';
  particlesEnabled: boolean;
}
```

### 4.2 数据流向

```
1. RealmDashboard 传递 realmMap ViewModel
2. DormScenePixiStage 解析为 DormSceneConfig + DormCharacterData[]
3. SceneLayerManager 渲染静态场景
4. CharacterManager 加载和渲染角色
5. 用户交互 → InteractionHandler → 更新状态 → 触发回调 → React UI 更新
```

---

## 五、用户交互流程

### 5.1 点击角色互动

```
用户点击角色 
→ InteractionHandler 检测点击
→ CharacterManager 查找角色
→ 触发 onSelectAgent(agentId)
→ React UI 显示角色详情面板
```

### 5.2 点击地面移动

```
用户点击地面
→ PathfindingSystem 计算路径
→ CharacterSprite.moveTo()
→ 播放 'walk' 动画
→ 平滑插值移动
→ 到达目标后切换 'idle' 动画
```

### 5.3 相机控制

```
用户拖拽鼠标
→ CameraController.onDrag()
→ 更新 viewport 位置
→ SceneLayerManager 应用视差滚动
→ 背景层移动速度 0.3x
→ 中景层移动速度 0.6x
→ 角色层移动速度 1.0x
```

---

## 六、性能优化策略

1. **对象池 (Object Pooling)**: 粒子和特效复用，避免频繁创建/销毁
2. **精灵批处理**: 相同纹理的 Sprite 自动合批渲染
3. **视锥剔除**: 不在视口内的物体跳过渲染
4. **LOD (Level of Detail)**: 远处角色降低动画帧率
5. **纹理图集**: 所有小图合并到一张大图，减少 Draw Call
6. **按需加载**: 场景分块加载，角色懒加载

**性能目标**：
- 桌面端：稳定 60 FPS
- 移动端：稳定 30 FPS
- 内存占用：< 200MB

---

## 七、技术栈和依赖

### 核心依赖

- **Pixi.js v8** - 2D WebGL 渲染引擎
- **pixi-spine** - Spine 骨骼动画支持
- **@pixi/filter-blur** - 光晕和模糊特效

### 可选依赖

- **pathfinding** - A* 寻路算法库
- **howler.js** - 音效播放 (可选)

### 开发工具

- **Aseprite / Photoshop** - 场景美术制作
- **Spine / DragonBones** - 角色动画制作 (或使用序列帧)

---

## 八、测试策略

### 8.1 单元测试

- PathfindingSystem 路径计算正确性
- AnimationStateMachine 状态转换逻辑
- AssetLoader 资源加载和错误处理

### 8.2 集成测试

- 角色点击移动完整流程
- 多角色同时移动不冲突
- 相机控制和视差滚动效果

### 8.3 视觉测试

- 场景渲染效果截图对比
- 动画流畅度检查
- 不同分辨率下的响应式适配

---

## 九、开发里程碑

### 阶段 1：基础场景渲染 (2天)
- Pixi.js 舞台搭建
- 分层系统实现
- 背景、家具静态渲染

### 阶段 2：角色系统 (2天)
- 角色资源加载
- Spine/序列帧动画播放
- 基础状态机实现

### 阶段 3：交互系统 (2天)
- 点击事件处理
- 寻路和移动实现
- 相机控制

### 阶段 4：特效和优化 (1天)
- 粒子系统
- 光照效果
- 性能优化

### 阶段 5：集成和测试 (1天)
- 与现有 UI 集成
- 完整流程测试
- Bug 修复

**总计**：约 8 个工作日 (1-1.5周)

---

## 十、风险和约束

### 风险

1. **美术资源制作时间**: 2.5D 美术资源需要专业设计
2. **动画复杂度**: Spine 动画需要学习成本
3. **性能瓶颈**: 大量粒子和特效可能影响性能

### 约束

1. **与现有系统兼容**: 必须与现有的 Pixi.js 框架兼容
2. **响应式设计**: 必须支持不同分辨率
3. **可扩展性**: 必须易于添加新场景和角色

---

## 十一、总结

这套设计延续了现有的 Pixi.js 框架，通过分层渲染和模块化架构实现崩坏三风格的 2.5D 宿舍场景。

**核心优势**：
- ✅ 与现有代码兼容，无需重构
- ✅ 性能可控，2D 渲染开销小
- ✅ 美术资源可完全自定义
- ✅ 开发周期短，风险低

**下一步**：编写详细的实施计划 (Implementation Plan)

