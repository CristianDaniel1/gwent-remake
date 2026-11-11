export type PadControl =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'lb'
  | 'rb'
  | 'lt'
  | 'rt'
  | 'back'
  | 'start';

export interface PadSnapshot {
  buttons: readonly boolean[];
  axes: readonly number[];
}

export type PadEventType = 'press' | 'release' | 'repeat';

export interface PadEvent {
  control: PadControl;
  type: PadEventType;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
