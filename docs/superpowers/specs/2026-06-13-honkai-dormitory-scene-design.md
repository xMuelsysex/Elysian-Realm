# 崩坏三风格 2.5D 宿舍场景系统 - 设计文档

> **目标：** 将现有的简单 2D 地图升级为崩坏三宿舍风格的交互式 2.5D 场景，包含 Q版角色、分层场景、粒子特效和完整的交互系统。

> **架构：** 基于现有 Pixi.js 框架扩展，采用分层渲染系统（背景层、中景层、角色层、前景层），通过 Spine 或序列帧动画实现角色动作，使用视差滚动营造景深效果。

> **技术栈：** Pixi.js v8, pixi-spine, @pixi/filter-blur, TypeScript, React (UI 叠加层)

---

## 一、整体架构

### 1.1 系统分层

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

### 1.2 核心原则

- **单一职责 (SOLID-S)**: 每层独立渲染和管理，职责清晰
- **开闭原则 (SOLID-O)**: 可扩展新场景和角色，无需修改核心代码
- **依赖倒置 (SOLID-D)**: 依赖抽象的场景配置接口，而非具体实现
- **KISS**: 避免过度设计，优先实现核心功能
- **YAGNI**: 仅实现当前明确需要的功能
- **DRY**: 组件复用，避免重复代码

---

## 二、组件设计

### 2.1 场景渲染系统 (`src/app/realm/DormScene/`)

#### DormScenePixiStage.tsx (主场景容器)

**职责：** 初始化 Pixi.js Application，管理渲染循环

**依赖：** Pixi.js v8

**接口：**
```typescript
interface DormScenePixiStageProps {
  language: AppLanguage;
  viewModel: RealmMapViewModel;
  onSelectAgent: (agentId: string) => void;
  onSelectLocation: (locationId: string) => void;
}
```

**核心功能：**
- Pixi Application 初始化和生命周期管理
- 响应式 Canvas 尺寸调整
- 渲染循环和帧率控制
- 与 React 组件通信

#### SceneLayerManager.ts (分层管理器)

**职责：** 管理背景、中景、角色、前景四个独立图层

**方法：**
```typescript
class SceneLayerManager {
  addLayer(layerId: string, zIndex: number): Container;
  removeLayer(layerId: string): void;
  updateParallax(cameraX: number, cameraY: number): void;
  setLayerVisible(layerId: string, visible: boolean): void;
  getLayer(layerId: string): Container | undefined;
}
```

**视差滚动速度：**
- 背景层: 0.3x
- 中景层: 0.6x
- 角色层: 1.0x
- 前景层: 1.2x


#### BackgroundRenderer.ts (背景渲染器)

**职责：** 渲染窗户、墙壁、地板、星空等背景元素

**方法：**
```typescript
class BackgroundRenderer {
  renderWindow(x: number, y: number, width: number, height: number): void;
  renderWall(gradient: {start: number, end: number}): void;
  renderGround(texturePattern: string): void;
  setTimeOfDay(isNight: boolean): void;
  updateAmbientLight(color: number, intensity: number): void;
}
```

**功能：**
- 日夜循环切换（天空颜色、星空显示）
- 窗户光晕效果
- 地板纹理平铺
- 动态环境光

#### FurnitureRenderer.ts (家具渲染器)

**职责：** 渲染和管理场景中的家具物体

**数据结构：**
```typescript
interface Furniture {
  id: string;
  type: 'bed' | 'desk' | 'chair' | 'decoration' | 'plant';
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: Sprite;
  interactive: boolean;
  onClick?: () => void;
  zIndex: number;
}
```

**方法：**
```typescript
class FurnitureRenderer {
  addFurniture(config: Furniture): void;
  removeFurniture(id: string): void;
  setInteractive(id: string, interactive: boolean): void;
  sortByDepth(): void; // 根据 y 坐标排序，实现遮挡效果
}
```


### 2.2 角色系统 (`src/app/realm/DormScene/Characters/`)

#### CharacterSprite.ts (角色精灵)

**职责：** 管理单个角色的渲染、动画和行为

**动画类型支持：**
- **Spine 骨骼动画** (优先，通过 pixi-spine 插件)
- **序列帧动画** (备选，通过 AnimatedSprite)

**状态机：**
```typescript
type CharacterState = 'idle' | 'walk' | 'talk' | 'action';

class CharacterSprite {
  playAnimation(name: CharacterState, loop: boolean): void;
  moveTo(targetX: number, targetY: number, speed: number): Promise<void>;
  setFacingDirection(direction: 'left' | 'right'): void;
  showDialogue(text: string, duration: number): void;
  setSelected(selected: boolean): void; // 显示/隐藏选中光圈
  destroy(): void;
}
```

**动画过渡规则：**
- Idle → Walk: 立即切换
- Walk → Idle: 延迟 0.1s 平滑过渡
- Any → Talk: 覆盖当前动画

#### CharacterManager.ts (角色管理器)

**职责：** 管理场景中的所有角色实例

**方法：**
```typescript
class CharacterManager {
  loadCharacter(data: DormCharacterData): Promise<CharacterSprite>;
  removeCharacter(id: string): void;
  getCharacter(id: string): CharacterSprite | undefined;
  updateCharacters(agents: RealmMapAgentMarker[]): void;
  handleCharacterClick(id: string): void;
}
```

**数据同步：**
- 从 `realmMap.agents` 同步角色位置和状态
- 当 agent 的 locationId 改变时，触发角色移动动画


#### PathfindingSystem.ts (寻路系统)

**职责：** 实现点击移动功能

**算法选择：**
- **简单直线插值** (MVP 阶段)
- **A* 寻路** (后续扩展，处理障碍物)

**接口：**
```typescript
interface PathfindingSystem {
  findPath(start: Point, end: Point): Point[];
  isWalkable(x: number, y: number): boolean;
  setObstacles(obstacles: Rectangle[]): void;
}
```

**移动实现：**
```typescript
async function moveCharacter(character: CharacterSprite, targetX: number, targetY: number) {
  const path = pathfinding.findPath({x: character.x, y: character.y}, {x: targetX, y: targetY});
  character.playAnimation('walk', true);
  
  for (const point of path) {
    await character.moveTo(point.x, point.y, 200); // 200 pixels/sec
  }
  
  character.playAnimation('idle', true);
}
```

### 2.3 特效系统 (`src/app/realm/DormScene/Effects/`)

#### ParticleSystem.ts (粒子系统)

**职责：** GPU 加速的粒子渲染

**实现：** 使用 `ParticleContainer` 优化性能

**粒子类型：**
```typescript
interface ParticleConfig {
  type: 'floating-light' | 'star-dust' | 'click-sparkle';
  count: number;
  texture: Texture;
  speed: {x: number, y: number};
  lifespan: number;
  fadeIn: number;
  fadeOut: number;
}
```

**方法：**
```typescript
class ParticleSystem {
  createEmitter(config: ParticleConfig): ParticleEmitter;
  update(deltaTime: number): void;
  setEnabled(enabled: boolean): void;
}
```

// __CONTINUE_HERE__
