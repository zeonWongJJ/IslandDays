// 键盘映射：供 drei <KeyboardControls> 与 useKeyboardControls 共用。
// 在一处定义，避免组件里散落魔法字符串。
//
// 注意：不要用 `as const`，drei 的 map 期望可变数组类型 KeyboardControlsEntry<string>[]。

export interface KeyEntry {
  name: string;
  keys: string[];
}

export const keyMap: KeyEntry[] = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'interact', keys: ['KeyE'] },
  { name: 'tool1', keys: ['Digit1'] },
  { name: 'tool2', keys: ['Digit2'] },
  { name: 'tool3', keys: ['Digit3'] },
  { name: 'tool4', keys: ['Digit4'] },
  { name: 'holster', keys: ['KeyX', 'KeyQ'] },
];

// 供代码里做按键名联合类型推断
export type KeyName =
  | 'forward' | 'back' | 'left' | 'right' | 'run'
  | 'interact' | 'tool1' | 'tool2' | 'tool3' | 'tool4' | 'holster';
