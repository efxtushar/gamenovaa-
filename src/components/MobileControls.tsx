import React, { useMemo, useState, useEffect } from 'react';
import { GAME_CONTROLS_CONFIG, DEFAULT_GAME_CONTROL_LAYOUT } from './mobile-controls/GameControlsConfig';
import { VirtualJoystick } from './mobile-controls/VirtualJoystick';
import { TouchButton } from './mobile-controls/TouchButton';
import { TouchButtonConfig } from './mobile-controls/types';
import { Sparkles } from 'lucide-react';

interface MobileControlsProps {
  gameSlug?: string;
  className?: string;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  gameSlug = '',
  className = '',
}) => {
  const [showHint, setShowHint] = useState(true);

  // Look up tailored control scheme for the game
  const layout = useMemo(() => {
    return GAME_CONTROLS_CONFIG[gameSlug] || DEFAULT_GAME_CONTROL_LAYOUT;
  }, [gameSlug]);

  // Auto fade hint after 6 seconds
  useEffect(() => {
    setShowHint(true);
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [gameSlug]);

  const hasLeftControls = layout.leftCluster !== 'none';
  const hasRightControls = layout.rightButtons && layout.rightButtons.length > 0;
  const hasQuickActions = layout.quickActions && layout.quickActions.length > 0;

  return (
    <div
      className={`
        pointer-events-none select-none touch-none
        w-full flex flex-col justify-end
        px-3 sm:px-6 pb-3 sm:pb-5
        ${className}
      `}
      aria-label="Mobile Game Controls"
    >
      {/* 1. Direct Touch Hint badge (for touch-canvas games like Gem Match, Street Hoops, etc.) */}
      {layout.touchCanvasHint && showHint && (
        <div className="w-full flex justify-center mb-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowHint(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono tracking-wide backdrop-blur-md shadow-lg active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{layout.touchCanvasHint}</span>
          </button>
        </div>
      )}

      {/* 2. Floating Quick Actions (Weapon Switch, Reload, Spells 1/2/3) */}
      {hasQuickActions && (
        <div className="w-full flex justify-end mb-2 pr-1 pointer-events-auto">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/10 shadow-lg">
            {layout.quickActions?.map((btnConfig: TouchButtonConfig) => (
              <TouchButton key={btnConfig.id} config={btnConfig} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Bottom Edge Controls (Left Cluster + Right Cluster) */}
      <div className="w-full flex items-end justify-between gap-3">
        {/* LEFT CLUSTER: Joystick, Steer L/R, or Custom buttons */}
        <div className="pointer-events-auto flex items-end">
          {layout.leftCluster === 'joystick' && (
            <div className="p-1 sm:p-2 rounded-full bg-slate-950/35 backdrop-blur-sm">
              <VirtualJoystick size={106} />
            </div>
          )}

          {layout.leftCluster === 'steer-lr' && layout.customLeftButtons && (
            <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl bg-slate-950/40 backdrop-blur-sm border border-white/10 shadow-xl">
              {layout.customLeftButtons.map((btnConfig: TouchButtonConfig) => (
                <TouchButton key={btnConfig.id} config={btnConfig} />
              ))}
            </div>
          )}

          {layout.leftCluster === 'buttons' && layout.customLeftButtons && (
            <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl bg-slate-950/40 backdrop-blur-sm border border-white/10 shadow-xl">
              {layout.customLeftButtons.map((btnConfig: TouchButtonConfig) => (
                <TouchButton key={btnConfig.id} config={btnConfig} />
              ))}
            </div>
          )}

          {!hasLeftControls && (
            <div className="w-4" /> // spacing placeholder
          )}
        </div>

        {/* RIGHT CLUSTER: Action buttons (Jump, Attack, Shoot, Brake, Boost, etc.) */}
        <div className="pointer-events-auto flex items-end justify-end">
          {hasRightControls && (
            <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-2xl bg-slate-950/40 backdrop-blur-sm border border-white/10 shadow-xl">
              {layout.rightButtons.map((btnConfig: TouchButtonConfig) => (
                <TouchButton key={btnConfig.id} config={btnConfig} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
