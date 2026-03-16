---
name: frontend-best-practices
description: >
  个人前端最佳实践积累，记录在实际项目中总结的编码经验和模式。
  当涉及以下场景时使用此 skill：
  (1) 使用 addEventListener/removeEventListener 时的生命周期管理
  (2) React 组件中事件监听的绑定与清理
  (3) Service 类中全局事件监听的处理方式
  (4) 面板/弹窗组件的事件监听最佳实践
  触发词：addEventListener、removeEventListener、事件监听、内存泄漏、组件销毁、useEffect cleanup、生命周期管理
---

# 前端最佳实践

## addEventListener 的生命周期管理

### 核心原则

> **监听的生命周期应与使用它的组件/功能生命周期严格对齐。**

addEventListener 需要在适当的时机 removeEventListener，否则：
- 组件销毁后监听仍然存在，造成内存泄漏
- 回调中的闭包引用阻止 GC 回收相关对象
- 全局监听残留可能触发意外的副作用

---

### 模式一：React 组件内 useEffect 管理（推荐）

**适用场景**：监听仅在某个面板/组件显示时有意义（如历史版本面板的断网监听）。

```tsx
// VersionHistory/index.tsx
export default function VersionHistory() {
  const service = useInjectService<VersionHistoryServices>(VersionHistoryServices);

  useEffect(() => {
    window.addEventListener('offline', service.onOfflineHandler);
    return () => {
      window.removeEventListener('offline', service.onOfflineHandler);
    };
  }, [service]);

  return <div>...</div>;
}
```

**关键点**：
- 组件挂载 → addEventListener；组件卸载 → removeEventListener，完全对齐
- `removeEventListener` 需传入**与 add 时完全相同的函数引用**，因此 handler 必须是稳定引用

---

### 模式二：Service 中暴露稳定的 handler 引用

当 handler 逻辑在 Service 中（含 `this` 引用），需用**箭头函数字段**固定引用：

```ts
// ✅ 正确：public readonly 箭头函数，引用稳定，可被外部 add/remove
class VersionHistoryServices {
  public readonly onOfflineHandler = () => this.handleOffline();
}

// ❌ 错误：每次调用都是新的函数引用，removeEventListener 无效
window.addEventListener('offline', () => this.handleOffline());
window.removeEventListener('offline', () => this.handleOffline()); // 无法移除！
```

---

### 模式三：Service 构造函数 + 框架生命周期（兜底方案）

当监听需要贯穿整个 Service 生命周期时，使用框架提供的销毁钩子：

```ts
// 通用框架示例：实现 OnDestroy/OnDisable 接口
import { Injectable, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MyService implements OnDestroy {
  private readonly onHandler = () => this.handleSomething();

  constructor() {
    window.addEventListener('resize', this.onHandler);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onHandler);
  }
}
```

**注意**：`$onDisable` 是 Service 级别，在 Workbench 禁用 Service 时触发，**不对应**组件的打开/关闭。若只需在某个面板开启时监听，用模式一更精确。

---

### 决策树

```
需要 addEventListener？
├─ 监听范围仅限某个面板/弹窗显示期间
│   └─ → 模式一：在面板组件 useEffect 中 add/remove（与面板生命周期对齐）
│
├─ 监听需要贯穿整个应用/Service 生命周期
│   └─ → 模式三：构造函数 add + 框架销毁钩子 remove
│
└─ handler 逻辑在 Service 中（含 this）
    └─ → 模式二：public readonly 箭头函数字段，供外部稳定引用
```

---

### 反面教材

```ts
// ❌ 构造函数里 add，没有对应 remove
constructor() {
  window.addEventListener('offline', () => this.handleOffline()); // 泄漏！
}

// ❌ 组件内用匿名函数
useEffect(() => {
  window.addEventListener('offline', () => handleOffline()); // cleanup 无效！
  return () => {
    window.removeEventListener('offline', () => handleOffline()); // 不同引用，移除失败
  };
});

// ✅ 正确：提取为稳定引用
const handler = useCallback(() => handleOffline(), []);
useEffect(() => {
  window.addEventListener('offline', handler);
  return () => window.removeEventListener('offline', handler);
}, [handler]);
```
