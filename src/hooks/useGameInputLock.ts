import { useEffect, RefObject } from 'react';

interface UseGameInputLockOptions {
  /**
   * Whether the game is currently active and should lock scroll / intercept keys.
   * Defaults to true.
   */
  isActive?: boolean;
  /**
   * Optional ref to the game container to automatically focus upon activation.
   */
  containerRef?: RefObject<HTMLElement | null>;
  /**
   * Optional callback when Escape key is pressed.
   */
  onEscape?: () => void;
  /**
   * Optional callback when Pause key ('KeyP') is pressed.
   */
  onPauseToggle?: () => void;
}

/**
 * Custom React hook that:
 * 1. Locks document and body scroll (overflow: 'hidden' / 'auto' restore) and disables touch bounce.
 * 2. Prevents default browser scroll on Arrow keys, Space, and PageUp/PageDown while game is active.
 * 3. Keeps input focus on the game container and manages clean restoration upon unmount.
 */
export function useGameInputLock({
  isActive = true,
  containerRef,
  onEscape,
  onPauseToggle
}: UseGameInputLockOptions = {}) {
  useEffect(() => {
    if (!isActive) return;

    // Preserve original body & document styles
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    // Apply scroll locks
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Auto-focus container if provided
    if (containerRef?.current) {
      containerRef.current.focus();
    }

    // Key event listener to prevent page scrolling on game controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow normal typing inside input or textarea elements
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      // Intercept browser scrolling keys
      const scrollKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
        'PageUp',
        'PageDown',
        'Home',
        'End'
      ];

      if (scrollKeys.includes(e.code)) {
        e.preventDefault();
      }

      // Handle ESC key
      if (e.code === 'Escape') {
        e.preventDefault();
        if (onEscape) {
          onEscape();
        }
      }

      // Handle Pause key (P)
      if (e.code === 'KeyP') {
        if (onPauseToggle) {
          onPauseToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });

    // Clean up and restore scroll state on unmount or deactivation
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef, onEscape, onPauseToggle]);
}
