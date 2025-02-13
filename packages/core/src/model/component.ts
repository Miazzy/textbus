import { Draft, produce, Patch, enablePatches } from 'immer'
import { Observable, Subject, Subscription } from '@tanbo/stream'
import { AbstractType, Type, InjectionToken, InjectFlags, Injector } from '@tanbo/di'

import { makeError } from '../_utils/make-error'
import { VElement } from './element'
import { ContentType, Slot, SlotLiteral } from './slot'
import { Formats } from './format'
import { ChangeMarker } from './change-marker'
import { Slots } from './slots'

enablePatches()

const componentErrorFn = makeError('DefineComponent')

export interface SlotsComponentData<State, SlotState> {
  slots: Slot<SlotState>[]
  state?: State
}

export interface StateComponentData<State, SlotState> {
  slots?: Slot<SlotState>[]
  state: State
}

export type ComponentData<State = unknown, SlotState = unknown> =
  SlotsComponentData<State, SlotState>
  | StateComponentData<State, SlotState>

export interface ComponentLiteral<State = any> {
  name: string
  slots: SlotLiteral[]
  state: State
}

export interface SlotRenderFactory {
  (): VElement
}

export interface SlotRender {
  (slot: Slot, factory: SlotRenderFactory): VElement
}

export interface ComponentRender {
  (isOutputMode: boolean, slotRender: SlotRender): VElement
}

/**
 * 组件 setup 函数返回值必须要实现的接口
 */
export interface ComponentExtends {
  render: ComponentRender
}

export interface Keymap {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
}

export interface Shortcut {
  keymap: Keymap

  action(key: string): void
}

export interface MarkdownGrammarInterceptor<Data = any> {
  /** 匹配字符 */
  match: RegExp | ((content: string) => boolean)
  /** 触发键 */
  key: string | string[]

  /** 触发执行的方法 */
  generateInitData(content: string): Data
}

/**
 * 组件实例对象
 */
export interface ComponentInstance<Extends extends ComponentExtends = ComponentExtends, State = any, SlotState = unknown> {
  /**
   * 组件所在的插槽
   * @readonly
   * @internal
   */
  parent: Slot | null
  /**
   * 父组件
   * @readonly
   * @internal
   */
  parentComponent: ComponentInstance | null
  /** 组件变化标识器 */
  changeMarker: ChangeMarker
  /** 组件是否可拆分 */
  separable: boolean
  /** 组件名 */
  name: string
  /** 组件长度，固定为 1 */
  length: 1
  /** 组件类型 */
  type: ContentType
  /** 组件的子插槽集合 */
  slots: Slots<SlotState>
  /** 组件内部实现的方法 */
  extends: Extends
  /** 组件动态上下文菜单注册表 */
  shortcutList: Shortcut[]
  /** 当状态变更时触发 */
  onStateChange: Observable<State>

  /** 组件状态 */
  get state(): State

  /**
   * 更新组件状态的方法
   * @param fn
   */
  updateState(fn: (draft: Draft<State>) => void): State

  /**
   * 组件转为 JSON 数据的方法
   */
  toJSON(): ComponentLiteral<State>

  /**
   * 将组件转换为 string
   */
  toString(): string
}

/**
 * Textbus 扩展组件接口
 */
export interface ComponentOptions<Extends extends ComponentExtends, State, SlotState> {
  /** 组件名 */
  name: string
  /** 组件类型 */
  type: ContentType
  /** 组件是否可拆分 */
  separable?: boolean

  /** markdown 支持 */
  markdownSupport?: MarkdownGrammarInterceptor<ComponentData<State, SlotState>>

  /**
   * 组件初始化实现
   * @param initData
   */
  setup(initData?: ComponentData<State, SlotState>): Extends
}

/**
 * Textbus 组件
 */
export interface Component<Instance extends ComponentInstance = ComponentInstance, State extends ComponentData = ComponentData> {
  /** 组件名 */
  name: string
  /** 实例数据类型 */
  instanceType: ContentType
  /** 组件是否可拆分 */
  separable: boolean

  markdownSupport?: MarkdownGrammarInterceptor<State>

  /**
   * 组件创建实例的方法
   * @param context
   * @param data
   */
  createInstance(context: Injector, data?: State): Instance
}

/**
 * 组件内状态管理器
 */
export interface ChangeController<T> {
  /** 组件状态变化时触发 */
  onChange: Observable<T>

  /**
   * 组件状态更新函数
   * @param fn
   */
  update(fn: (draft: Draft<T>) => void): T
}

export class Ref<T> {
  constructor(public current: T | null = null) {
  }
}

export interface InsertEventData {
  index: number
  content: string | ComponentInstance,
  formats: Formats
}

export interface EnterEventData {
  index: number
}

export interface DeleteEventData {
  index: number
  count: number
}

export interface PasteEventData {
  index: number
  data: Slot
  text: string
}

export interface ContextMenuItem {
  iconClasses?: string[]
  label: string
  disabled?: boolean

  onClick(): void
}

export interface ContextMenuCustomItem<T = unknown> {
  type: string
  value?: T
  disabled?: boolean

  validate?(value: T): true | string

  onComplete(value: T): void
}

export interface ContextMenuGroup {
  iconClasses?: string[]
  label: string
  disabled?: boolean
  submenu: Array<ContextMenuItem | ContextMenuCustomItem>
}

export type ContextMenuConfig = ContextMenuGroup | ContextMenuItem

export interface EventTypes {
  onUnselect: () => void
  onSelected: () => void
  onFocus: () => void
  onBlur: () => void
  onViewChecked: () => void
  onViewInit: () => void
  onDestroy: () => void
  onSelectionFromFront: (event: Event<ComponentInstance>) => void
  onSelectionFromEnd: (event: Event<ComponentInstance>) => void
  onEnter: (event: Event<Slot, EnterEventData>) => void
  onPaste: (event: Event<Slot, PasteEventData>) => void
  onContextMenu: (event: ContextMenuEvent<ComponentInstance>) => ContextMenuConfig[]

  onContentInserted: (event: Event<Slot, InsertEventData>) => void
  onContentInsert: (event: Event<Slot, InsertEventData>) => void
  onContentDelete: (event: Event<Slot, DeleteEventData>) => void
  onContentDeleted: () => void

  // onSlotInserted: (event: Event<Slot, InsertEventData>) => void
  // onSlotInsert: (event: Event<Slot, InsertEventData>) => void
  onSlotRemove: (event: Event<ComponentInstance, DeleteEventData>) => void
  onSlotRemoved: () => void
}

class EventCache<T, K extends keyof T = keyof T> {
  private listeners = new Map<K, Array<T[K]>>()

  add(eventType: K, callback: T[K]) {
    let callbacks = this.listeners.get(eventType)
    if (!callbacks) {
      callbacks = []
      this.listeners.set(eventType, callbacks)
    }
    callbacks.push(callback)
  }

  get(eventType: K): Array<T[K]> {
    return this.listeners.get(eventType) || []
  }

  clean(eventType: K) {
    this.listeners.delete(eventType)
  }
}

interface ComponentContext<T> {
  slots?: Slots
  initState?: T
  changeController: ChangeController<T>
  contextInjector: Injector
  componentInstance: ComponentInstance
  dynamicShortcut: Shortcut[]
  eventCache: EventCache<EventTypes>
}

const eventCacheMap = new WeakMap<ComponentInstance, EventCache<EventTypes>>()
const contextStack: ComponentContext<any>[] = []

function getCurrentContext() {
  return contextStack[contextStack.length - 1] || null
}

/**
 * 提取组件的实例类型
 */
export type ExtractComponentInstanceType<T> = T extends Component<infer S> ? S : never
/**
 * 提取组件扩展类型
 */
export type ExtractComponentInstanceExtendsType<T> = T extends Component<ComponentInstance<infer S>> ? S : never
/**
 * 提取组件状态类型
 */
export type ExtractComponentStateType<T> = T extends Component<ComponentInstance<any, infer S>> ? S : never

/**
 * Textbus 扩展组件方法
 * @param options
 */
export function defineComponent<Extends extends ComponentExtends, State = any, SlotState = any>(
  options: ComponentOptions<Extends, State, SlotState>
): Component<ComponentInstance<Extends, State>, ComponentData<State, SlotState>> {
  const separable = !!options.separable
  return {
    name: options.name,
    separable,
    instanceType: options.type,
    markdownSupport: options.markdownSupport,
    createInstance(contextInjector: Injector, initData?: ComponentData<State, SlotState>) {
      const marker = new ChangeMarker()
      const stateChangeSubject = new Subject<any>()

      const onStateChange = stateChangeSubject.asObservable()

      const changeController: ChangeController<State> = {
        update(fn) {
          return componentInstance.updateState(fn)
        },
        onChange: onStateChange
      }

      const componentInstance: ComponentInstance<Extends, State> = {
        changeMarker: marker,
        parent: null,
        separable,
        get parentComponent() {
          return componentInstance.parent?.parent || null
        },
        get state() {
          return state!
        },
        name: options.name,
        length: 1,
        onStateChange,
        type: options.type,
        slots: null as any,
        extends: null as any,
        shortcutList: null as any,
        updateState(fn) {
          let changes!: Patch[]
          let inverseChanges!: Patch[]
          const oldState = state
          const newState = produce(oldState, fn, (p, ip) => {
            changes = p
            inverseChanges = ip
          }) as State
          state = newState
          stateChangeSubject.next(newState)
          marker.markAsDirtied({
            path: [],
            apply: [{
              type: 'apply',
              patches: changes!,
              value: newState
            }],
            unApply: [{
              type: 'apply',
              patches: inverseChanges!,
              value: oldState
            }]
          })
          return newState
        },
        toJSON() {
          return {
            name: options.name,
            state: state!,
            slots: componentInstance.slots.toJSON()
          }
        },
        toString() {
          return componentInstance.slots.toString()
        }
      }
      const context: ComponentContext<State> = {
        contextInjector,
        changeController,
        componentInstance: componentInstance,
        dynamicShortcut: [],
        eventCache: new EventCache<EventTypes>(),
      }
      contextStack.push(context)
      componentInstance.extends = options.setup(initData)
      onDestroy(() => {
        eventCacheMap.delete(componentInstance)
        subscriptions.forEach(i => i.unsubscribe())
      })
      eventCacheMap.set(componentInstance, context.eventCache)
      contextStack.pop()
      componentInstance.slots = context.slots || new Slots(componentInstance)
      componentInstance.shortcutList = context.dynamicShortcut
      let state = Reflect.has(context, 'initState') ? context.initState : initData?.state

      const subscriptions: Subscription[] = [
        componentInstance.slots.onChange.subscribe(ops => {
          marker.markAsDirtied(ops)
        })
      ]

      return componentInstance
    }
  }
}

/**
 * 组件 setup 方法内获取编辑器 IoC 容器的勾子
 */
export function useContext(): Injector
export function useContext<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T
export function useContext(token: any = Injector, noFoundValue?: any, flags?: any): Injector {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.contextInjector.get(token, noFoundValue, flags)
}

/**
 * 组件 setup 方法内获取组件实例的勾子
 */
export function useSelf<Methods extends ComponentExtends = ComponentExtends, State = any>(): ComponentInstance<Methods, State> {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return context.componentInstance as ComponentInstance<Methods, State>
}

/**
 * 组件使用子插槽的方法
 * @param slots 子插槽数组
 */
export function useSlots<T>(slots: Slot<T>[]): Slots<T> {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  if (Reflect.has(context, 'slots')) {
    throw componentErrorFn('only one unique slots is allowed for a component!')
  }
  const s = new Slots(context.componentInstance, slots)
  context.slots = s
  return s
}

/**
 * 组件注册状态管理器的勾子
 * @param initState
 */
export function useState<T>(initState: T) {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  if (Reflect.has(context, 'initState')) {
    throw componentErrorFn('only one unique state is allowed for a component!')
  }
  context.initState = initState
  return context.changeController as ChangeController<T>
}

/**
 * 组件单元素引用勾子
 */
export function useRef<T>(initValue: T | null = null) {
  return new Ref<T>(initValue)
}

/**
 * 组件注册动态快捷键的勾子
 * @param config
 */
export function useDynamicShortcut(config: Shortcut) {
  const context = getCurrentContext()
  if (!context) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  context.dynamicShortcut.push(config)
}

let eventHandleFn: null | ((...args: any[]) => void) = null
let isPreventDefault = false

/**
 * Textbus 事件对象
 */
export class Event<S, T = null> {
  constructor(public target: S,
              public data: T,
              eventHandle: (...args: any[]) => void
  ) {
    eventHandleFn = eventHandle
  }

  preventDefault() {
    isPreventDefault = true
  }
}

export class ContextMenuEvent<T> extends Event<T> {
  get stopped() {
    return this.isStopped
  }

  private isStopped = false

  stopPropagation() {
    this.isStopped = true
  }
}

/**
 * 触发组件事件的方法
 * @param target 目标组件
 * @param eventType 事件名
 * @param data 事件对象
 */
export function invokeListener(target: ComponentInstance, eventType: 'onSelectionFromFront', data: Event<ComponentInstance>): void
export function invokeListener(target: ComponentInstance, eventType: 'onSelectionFromEnd', data: Event<ComponentInstance>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContentInsert', data: Event<Slot, InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContentInserted', data: Event<Slot, InsertEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContentDelete', data: Event<Slot, DeleteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContentDeleted'): void
export function invokeListener(target: ComponentInstance, eventType: 'onSlotRemove', data: Event<ComponentInstance, DeleteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onSlotRemoved'): void
export function invokeListener(target: ComponentInstance, eventType: 'onEnter', data: Event<Slot, EnterEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onContextMenu', data: ContextMenuEvent<ComponentInstance>): void
export function invokeListener(target: ComponentInstance, eventType: 'onPaste', data: Event<Slot, PasteEventData>): void
export function invokeListener(target: ComponentInstance, eventType: 'onSelected'): void
export function invokeListener(target: ComponentInstance, eventType: 'onUnselect'): void
export function invokeListener(target: ComponentInstance, eventType: 'onFocus'): void
export function invokeListener(target: ComponentInstance, eventType: 'onBlur'): void
export function invokeListener(target: ComponentInstance, eventType: 'onDestroy'): void
export function invokeListener(target: ComponentInstance, eventType: 'onViewChecked'): void
export function invokeListener<K extends keyof EventTypes,
  D = EventTypes[K] extends (args: infer U) => any ?
    U extends Event<any> ? U : never
    : never>(target: ComponentInstance, eventType: K, data?: D) {
  if (typeof target !== 'object' || target === null) {
    return
  }
  const cache = eventCacheMap.get(target)
  if (cache) {
    const callbacks = cache.get(eventType)
    const values = callbacks.map(fn => {
      return (fn as any)(data)
    })
    if (eventType === 'onViewChecked') {
      const viewInitCallbacks = cache.get('onViewInit')
      cache.clean('onViewInit')
      viewInitCallbacks.forEach(fn => {
        (fn as any)(data)
      })
    }
    const is = isPreventDefault
    const fn = eventHandleFn
    isPreventDefault = false
    eventHandleFn = null
    if (!is) {
      fn?.(...values)
    }
  }
}

function makeEventHook<T extends keyof EventTypes>(type: T) {
  return function (listener: EventTypes[T]) {
    const context = getCurrentContext()
    if (context) {
      context.eventCache.add(type, listener)
    }
  }
}

/**
 * 当已选中组件未选中或选区不只选中已选中组件时触发
 */
export const onUnselect = makeEventHook('onUnselect')

/**
 * 当选区刚好选中一个组件
 */
export const onSelected = makeEventHook('onSelected')

/**
 * 当光标从前面进入组件
 */
export const onSelectionFromFront = makeEventHook('onSelectionFromFront')

/**
 * 当光标从后面进入组件
 */
export const onSelectionFromEnd = makeEventHook('onSelectionFromEnd')

/**
 * 组件获取焦点事件的勾子
 */
export const onFocus = makeEventHook('onFocus')

/**
 * 组件失去焦点事件的勾子
 */
export const onBlur = makeEventHook('onBlur')

/**
 * 组件内粘贴事件勾子
 */
export const onPaste = makeEventHook('onPaste')

/**
 * 组件右键菜单事件勾子
 */
export const onContextMenu = makeEventHook('onContextMenu')

/**
 * 组件视图更新后的勾子
 */
export const onViewChecked = makeEventHook('onViewChecked')

/**
 * 组件第一次渲染后的勾子
 */
export const onViewInit = makeEventHook('onViewInit')

/**
 * 组件子插槽删除时的勾子
 */
export const onSlotRemove = makeEventHook('onSlotRemove')

/**
 * 组件子插槽删除完成时的勾子
 */
export const onSlotRemoved = makeEventHook('onSlotRemoved')

/**
 * 组件子插槽内容删除时的勾子
 */
export const onContentDelete = makeEventHook('onContentDelete')

/**
 * 组件子插槽内容删除完成时的勾子
 */
export const onContentDeleted = makeEventHook('onContentDeleted')

/**
 * 组件子插槽换行时的勾子
 */
export const onEnter = makeEventHook('onEnter')

/**
 * 组件子插槽插入内容时的勾子
 */
export const onContentInsert = makeEventHook('onContentInsert')

/**
 * 组件子插槽插入内容后时的勾子
 */
export const onContentInserted = makeEventHook('onContentInserted')

/**
 * 组件销毁时的勾子
 */
export const onDestroy = makeEventHook('onDestroy')
