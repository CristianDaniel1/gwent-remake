export type Timer = ReturnType<typeof setTimeout>;

export interface Step {
  ms: number;
  run: () => void;
}
