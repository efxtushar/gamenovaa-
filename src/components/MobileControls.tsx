import React, { useCallback } from 'react';
import { sound } from '../utils/soundEffects';

interface MobileControlsProps {
  onAction?: (actionName: string, active: boolean) => void;
  gameSlug?: string;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onAction }) => {
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
      // Fallback
    }
  }, []);

  const handlePress = (action: string) => {
    sound.playClick();
    if (onAction) onAction(action, true);

    switch (action) {
      case 'up':
        dispatchKey('keydown', 'ArrowUp', 'ArrowUp');
        dispatchKey('keydown', 'w', 'KeyW');
        break;
      case 'down':
        dispatchKey('keydown', 'ArrowDown', 'ArrowDown');
        dispatchKey('keydown', 's', 'KeyS');
        break;
      case 'left':
        dispatchKey('keydown', 'ArrowLeft', 'ArrowLeft');
        dispatchKey('keydown', 'a', 'KeyA');
        break;
      case 'right':
        dispatchKey('keydown', 'ArrowRight', 'ArrowRight');
        dispatchKey('keydown', 'd', 'KeyD');
        break;
      case 'actionA':
        dispatchKey('keydown', ' ', 'Space');
        dispatchKey('keydown', 'z', 'KeyZ');
        dispatchKey('keydown', 'j', 'KeyJ');
        dispatchKey('keydown', 'f', 'KeyF');
        dispatchKey('keydown', 'Enter', 'Enter');
        break;
      case 'actionB':
        dispatchKey('keydown', 'x', 'KeyX');
        dispatchKey('keydown', 'c', 'KeyC');
        dispatchKey('keydown', 'k', 'KeyK');
        dispatchKey('keydown', 'e', 'KeyE');
        dispatchKey('keydown', 'Shift', 'ShiftLeft');
        break;
    }
  };

  const handleRelease = (action: string) => {
    if (onAction) onAction(action, false);

    switch (action) {
      case 'up':
        dispatchKey('keyup', 'ArrowUp', 'ArrowUp');
        dispatchKey('keyup', 'w', 'KeyW');
        break;
      case 'down':
        dispatchKey('keyup', 'ArrowDown', 'ArrowDown');
        dispatchKey('keyup', 's', 'KeyS');
        break;
      case 'left':
        dispatchKey('keyup', 'ArrowLeft', 'ArrowLeft');
        dispatchKey('keyup', 'a', 'KeyA');
        break;
      case 'right':
        dispatchKey('keyup', 'ArrowRight', 'ArrowRight');
        dispatchKey('keyup', 'd', 'KeyD');
        break;
      case 'actionA':
        dispatchKey('keyup', ' ', 'Space');
        dispatchKey('keyup', 'z', 'KeyZ');
        dispatchKey('keyup', 'j', 'KeyJ');
        dispatchKey('keyup', 'f', 'KeyF');
        dispatchKey('keyup', 'Enter', 'Enter');
        break;
      case 'actionB':
        dispatchKey('keyup', 'x', 'KeyX');
        dispatchKey('keyup', 'c', 'KeyC');
        dispatchKey('keyup', 'k', 'KeyK');
        dispatchKey('keyup', 'e', 'KeyE');
        dispatchKey('keyup', 'Shift', 'ShiftLeft');
        break;
    }
  };

  return (
    <div className="w-full select-none py-3 px-4 sm:px-8 bg-[#090714] border-t border-white/10 flex items-center justify-between gap-4 max-w-4xl mx-auto touch-none">
      {/* Left: Virtual D-Pad */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
        {/* D-pad cross background */}
        <div className="absolute w-10 sm:w-12 h-32 sm:h-36 bg-[#131024] rounded-2xl border border-white/10" />
        <div className="absolute w-32 sm:w-36 h-10 sm:h-12 bg-[#131024] rounded-2xl border border-white/10" />

        {/* Up */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePress('up'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('up'); }}
          onMouseDown={() => handlePress('up')}
          onMouseUp={() => handleRelease('up')}
          className="absolute top-0 w-10 sm:w-12 h-10 sm:h-12 rounded-t-xl bg-[#1c1836] active:bg-cyan-500 text-cyan-300 active:text-black font-bold flex items-center justify-center transition-colors shadow select-none cursor-pointer"
          aria-label="Up / Accelerate"
        >
          ▲
        </button>

        {/* Down */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePress('down'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('down'); }}
          onMouseDown={() => handlePress('down')}
          onMouseUp={() => handleRelease('down')}
          className="absolute bottom-0 w-10 sm:w-12 h-10 sm:h-12 rounded-b-xl bg-[#1c1836] active:bg-cyan-500 text-cyan-300 active:text-black font-bold flex items-center justify-center transition-colors shadow select-none cursor-pointer"
          aria-label="Down / Brake"
        >
          ▼
        </button>

        {/* Left */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePress('left'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('left'); }}
          onMouseDown={() => handlePress('left')}
          onMouseUp={() => handleRelease('left')}
          className="absolute left-0 w-10 sm:w-12 h-10 sm:h-12 rounded-l-xl bg-[#1c1836] active:bg-cyan-500 text-cyan-300 active:text-black font-bold flex items-center justify-center transition-colors shadow select-none cursor-pointer"
          aria-label="Left / Steer Left"
        >
          ◀
        </button>

        {/* Right */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePress('right'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('right'); }}
          onMouseDown={() => handlePress('right')}
          onMouseUp={() => handleRelease('right')}
          className="absolute right-0 w-10 sm:w-12 h-10 sm:h-12 rounded-r-xl bg-[#1c1836] active:bg-cyan-500 text-cyan-300 active:text-black font-bold flex items-center justify-center transition-colors shadow select-none cursor-pointer"
          aria-label="Right / Steer Right"
        >
          ▶
        </button>

        {/* Center Pivot */}
        <div className="relative w-8 h-8 rounded-full bg-[#090714] border border-cyan-500/40 z-10 pointer-events-none" />
      </div>

      {/* Right: Action Buttons (B: Special/Attack, A: Primary Action/Jump/Shoot) */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Action Button B */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePress('actionB'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('actionB'); }}
          onMouseDown={() => handlePress('actionB')}
          onMouseUp={() => handleRelease('actionB')}
          className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 active:from-rose-400 active:to-pink-500 text-white font-orbitron font-black text-sm flex flex-col items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95 transition-transform cursor-pointer"
          aria-label="Action B"
        >
          <span>B</span>
          <span className="text-[8px] font-mono opacity-90">ALT / X</span>
        </button>

        {/* Action Button A */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePress('actionA'); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRelease('actionA'); }}
          onMouseDown={() => handlePress('actionA')}
          onMouseUp={() => handleRelease('actionA')}
          className="w-15 h-15 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 active:from-cyan-300 active:to-blue-500 text-black active:text-white font-orbitron font-black text-base flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 transition-transform cursor-pointer"
          aria-label="Action A"
        >
          <span>A</span>
          <span className="text-[9px] font-mono font-bold opacity-90">SPACE</span>
        </button>
      </div>
    </div>
  );
};
