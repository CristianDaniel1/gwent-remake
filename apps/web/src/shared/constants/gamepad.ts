/** Stick tilt below which the stick counts as centered. */
export const STICK_DEADZONE = 0.5;

/** Hold time before a direction starts repeating, in milliseconds. */
export const REPEAT_DELAY_MS = 350;

/** Interval between repeats of a held direction, in milliseconds. */
export const REPEAT_EVERY_MS = 120;

/** Selector of the elements the gamepad can focus. */
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
