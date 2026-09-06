import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onDirectionChange?: (directions: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  horizontalOnly?: boolean;
  className?: string;
  size?: number; // base diameter in px (e.g., 110)
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onDirectionChange,
  horizontalOnly = false,
  className = '',
  size = 112,
}) => {
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const baseRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const activeKeysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const maxRadius = (size / 2) - 16; // maximum drag distance
  const deadZone = 12; // minimum threshold to trigger key

  const dispatchKey = useCallback((type: 'keydown' | 'keyup', key: string, code: string) => {
    try {
      const event = new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    } catch {
      // Safe fallback
    }
  }, []);

  const updateKeys = useCallback((newKeys: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    const current = activeKeysRef.current;

    // Up
    if (newKeys.up !== current.up) {
      current.up = newKeys.up;
      dispatchKey(newKeys.up ? 'keydown' : 'keyup', 'ArrowUp', 'ArrowUp');
      dispatchKey(newKeys.up ? 'keydown' : 'keyup', 'w', 'KeyW');
    }

    // Down
    if (newKeys.down !== current.down) {
      current.down = newKeys.down;
      dispatchKey(newKeys.down ? 'keydown' : 'keyup', 'ArrowDown', 'ArrowDown');
      dispatchKey(newKeys.down ? 'keydown' : 'keyup', 's', 'KeyS');
    }

    // Left
    if (newKeys.left !== current.left) {
      current.left = newKeys.left;
      dispatchKey(newKeys.left ? 'keydown' : 'keyup', 'ArrowLeft', 'ArrowLeft');
      dispatchKey(newKeys.left ? 'keydown' : 'keyup', 'a', 'KeyA');
    }

    // Right
    if (newKeys.right !== current.right) {
      current.right = newKeys.right;
      dispatchKey(newKeys.right ? 'keydown' : 'keyup', 'ArrowRight', 'ArrowRight');
      dispatchKey(newKeys.right ? 'keydown' : 'keyup', 'd', 'KeyD');
    }

    if (onDirectionChange) {
      onDirectionChange({ ...current });
    }
  }, [dispatchKey, onDirectionChange]);

  const resetJoystick = useCallback(() => {
    touchIdRef.current = null;
    setIsActive(false);
    setKnobPosition({ x: 0, y: 0 });
    updateKeys({ up: false, down: false, left: false, right: false });
  }, [updateKeys]);

  const processCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = horizontalOnly ? 0 : clientY - centerY;

    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxRadius;
      dy = Math.sin(angle) * maxRadius;
    }

    setKnobPosition({ x: dx, y: dy });

    // Direction calculation
    if (distance < deadZone) {
      updateKeys({ up: false, down: false, left: false, right: false });
      return;
    }

    // Normalize
    const normX = dx / distance;
    const normY = dy / distance;

    const threshold = 0.38; // ~22.5 deg overlap for 8-way diagonal support

    const left = normX < -threshold;
    const right = normX > threshold;
    const up = !horizontalOnly && normY < -threshold;
    const down = !horizontalOnly && normY > threshold;

    updateKeys({ up, down, left, right });
  }, [deadZone, horizontalOnly, maxRadius, updateKeys]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    touchIdRef.current = touch.identifier;
    setIsActive(true);
    processCoordinates(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        e.preventDefault();
        processCoordinates(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        resetJoystick();
        break;
      }
    }
  };

  useEffect(() => {
    const onMove = (e: TouchEvent) => handleTouchMove(e);
    const onEnd = (e: TouchEvent) => handleTouchEnd(e);

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      // Clean up any held keys if unmounted while active
      if (activeKeysRef.current.up || activeKeysRef.current.down || activeKeysRef.current.left || activeKeysRef.current.right) {
        resetJoystick();
      }
    };
  }, [resetJoystick]);

  // Mouse fallback for responsive emulator testing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsActive(true);
    processCoordinates(e.clientX, e.clientY);

    const onMouseMove = (moveEv: MouseEvent) => {
      moveEv.preventDefault();
      processCoordinates(moveEv.clientX, moveEv.clientY);
    };

    const onMouseUp = () => {
      resetJoystick();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const knobSize = Math.round(size * 0.44);

  return (
    <div
      ref={baseRef}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`
        relative rounded-full select-none touch-none cursor-pointer flex items-center justify-center
        bg-[#090b14]/75 backdrop-blur-md border-2
        ${isActive ? 'border-cyan-400/80 shadow-[0_0_24px_rgba(6,182,212,0.4)]' : 'border-cyan-500/25 shadow-[0_0_15px_rgba(0,0,0,0.6)]'}
        transition-shadow duration-150 ${className}
      `}
      aria-label="Virtual Joystick"
    >
      {/* Cardinal direction indicators */}
      <div className={`absolute top-2 w-1.5 h-1.5 rounded-full ${activeKeysRef.current.up ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-600/60'}`} />
      <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${activeKeysRef.current.down ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-600/60'}`} />
      <div className={`absolute left-2 w-1.5 h-1.5 rounded-full ${activeKeysRef.current.left ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-600/60'}`} />
      <div className={`absolute right-2 w-1.5 h-1.5 rounded-full ${activeKeysRef.current.right ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-600/60'}`} />

      {/* Outer concentric subtle ring */}
      <div className="absolute inset-2.5 rounded-full border border-cyan-500/15 pointer-events-none" />

      {/* Inner Floating Thumb Knob */}
      <div
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          transform: `translate3d(${knobPosition.x}px, ${knobPosition.y}px, 0)`,
          transition: isActive ? 'none' : 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        className={`
          absolute rounded-full flex items-center justify-center pointer-events-none
          bg-gradient-to-br from-cyan-400/90 via-blue-600/90 to-indigo-700/90
          border-2 border-white/60 shadow-[0_0_16px_rgba(6,182,212,0.6)]
        `}
      >
        {/* Grip dot */}
        <div className="w-3.5 h-3.5 rounded-full bg-white/80 shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
        </div>
      </div>
    </div>
  );
};
