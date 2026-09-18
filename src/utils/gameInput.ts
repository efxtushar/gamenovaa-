/**
 * Common Game Input Utility
 * 
 * Strict Universal Standard for All Games:
 * A = LEFT
 * D = RIGHT
 * ArrowLeft = LEFT
 * ArrowRight = RIGHT
 * W = UP / FORWARD
 * ArrowUp = UP / FORWARD
 * S = DOWN / BACKWARD
 * ArrowDown = DOWN / BACKWARD
 * 
 * Ensures A never sets right and D never sets left across all keyboard layouts,
 * CapsLock states, and event properties.
 */

export interface CommonInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export function isLeftKey(e: KeyboardEvent | { code?: string; key?: string }): boolean {
  const code = e.code;
  const key = e.key ? e.key.toLowerCase() : '';
  return code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft';
}

export function isRightKey(e: KeyboardEvent | { code?: string; key?: string }): boolean {
  const code = e.code;
  const key = e.key ? e.key.toLowerCase() : '';
  return code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright';
}

export function isUpKey(e: KeyboardEvent | { code?: string; key?: string }): boolean {
  const code = e.code;
  const key = e.key ? e.key.toLowerCase() : '';
  return code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup';
}

export function isDownKey(e: KeyboardEvent | { code?: string; key?: string }): boolean {
  const code = e.code;
  const key = e.key ? e.key.toLowerCase() : '';
  return code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown';
}

/**
 * Updates a mutable direction input state based on a keydown or keyup event.
 * Guarantees strict non-conflicting mapping:
 * - Left event sets left = isDown, and if isDown is true, right is NOT set.
 * - Right event sets right = isDown, and if isDown is true, left is NOT set.
 */
export function handleDirectionKeyEvent(
  e: KeyboardEvent,
  state: { left?: boolean; right?: boolean; up?: boolean; down?: boolean },
  isDown: boolean
): boolean {
  let matched = false;

  if (isLeftKey(e)) {
    state.left = isDown;
    matched = true;
  }
  if (isRightKey(e)) {
    state.right = isDown;
    matched = true;
  }
  if (isUpKey(e)) {
    state.up = isDown;
    matched = true;
  }
  if (isDownKey(e)) {
    state.down = isDown;
    matched = true;
  }

  return matched;
}
