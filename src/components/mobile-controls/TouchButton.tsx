import React, { useRef, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Zap,
  Shield,
  Flame,
  Crosshair,
  Sword,
  Disc,
  Sparkles,
  RotateCcw,
  Play,
  Layers,
  Eye,
  RefreshCw,
  Feather,
  Anchor
} from 'lucide-react';
import { sound } from '../../utils/soundEffects';
import { TouchButtonConfig } from './types';

interface TouchButtonProps {
  config: TouchButtonConfig;
  className?: string;
  onPress?: () => void;
  onRelease?: () => void;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  config,
  className = '',
  onPress,
  onRelease,
}) => {
  const isPressedRef = useRef(false);

  const dispatchKeys = useCallback((type: 'keydown' | 'keyup') => {
    config.keys.forEach(({ key, code }) => {
      try {
        const event = new KeyboardEvent(type, {
          key,
          code,
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(event);
      } catch {
        // Fallback safe dispatch
      }
    });
  }, [config.keys]);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPressedRef.current) return;
    isPressedRef.current = true;

    // Trigger subtle haptics if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore
      }
    }

    sound.playClick();
    dispatchKeys('keydown');
    if (onPress) onPress();
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPressedRef.current) return;
    isPressedRef.current = false;
    dispatchKeys('keyup');
    if (onRelease) onRelease();
  };

  // Color variants
  const getVariantStyles = () => {
    switch (config.variant) {
      case 'primary':
        return 'from-cyan-500/90 to-blue-600/90 active:from-cyan-400 active:to-blue-500 text-white border-cyan-400/40 shadow-[0_0_18px_rgba(6,182,212,0.35)]';
      case 'danger':
        return 'from-rose-500/90 to-red-600/90 active:from-rose-400 active:to-red-500 text-white border-rose-400/40 shadow-[0_0_18px_rgba(244,63,94,0.35)]';
      case 'accent':
        return 'from-purple-500/90 to-indigo-600/90 active:from-purple-400 active:to-indigo-500 text-white border-purple-400/40 shadow-[0_0_18px_rgba(168,85,247,0.35)]';
      case 'warning':
        return 'from-amber-500/90 to-orange-600/90 active:from-amber-400 active:to-orange-500 text-white border-amber-400/40 shadow-[0_0_18px_rgba(245,158,11,0.35)]';
      case 'steer':
        return 'from-slate-800/95 to-slate-900/95 active:from-cyan-600/80 active:to-blue-700/80 text-cyan-300 active:text-white border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]';
      case 'secondary':
      default:
        return 'from-slate-800/90 to-slate-900/90 active:from-slate-700 active:to-slate-800 text-slate-200 active:text-white border-white/15 shadow-[0_0_12px_rgba(0,0,0,0.4)]';
    }
  };

  // Size styles
  const getSizeStyles = () => {
    switch (config.size) {
      case 'sm':
        return 'w-11 h-11 sm:w-12 sm:h-12 text-xs rounded-xl';
      case 'lg':
        return 'w-16 h-16 sm:w-18 sm:h-18 text-sm rounded-2xl';
      case 'wide':
        return 'w-24 sm:w-28 h-12 sm:h-13 text-xs rounded-xl';
      case 'md':
      default:
        return 'w-13 h-13 sm:w-15 sm:h-15 text-xs sm:text-sm rounded-2xl';
    }
  };

  const renderIcon = () => {
    const iconClass = config.size === 'lg' ? 'w-6 h-6 sm:w-7 sm:h-7' : config.size === 'sm' ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6';
    switch (config.iconName) {
      case 'arrow-up': return <ArrowUp className={iconClass} />;
      case 'arrow-down': return <ArrowDown className={iconClass} />;
      case 'arrow-left': return <ArrowLeft className={iconClass} />;
      case 'arrow-right': return <ArrowRight className={iconClass} />;
      case 'zap': return <Zap className={iconClass} />;
      case 'shield': return <Shield className={iconClass} />;
      case 'flame': return <Flame className={iconClass} />;
      case 'crosshair': return <Crosshair className={iconClass} />;
      case 'sword': return <Sword className={iconClass} />;
      case 'disc': return <Disc className={iconClass} />;
      case 'sparkles': return <Sparkles className={iconClass} />;
      case 'rotate': return <RotateCcw className={iconClass} />;
      case 'refresh': return <RefreshCw className={iconClass} />;
      case 'play': return <Play className={iconClass} />;
      case 'layers': return <Layers className={iconClass} />;
      case 'eye': return <Eye className={iconClass} />;
      default: return null;
    }
  };

  return (
    <button
      type="button"
      id={`touch-btn-${config.id}`}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      className={`
        relative select-none touch-none cursor-pointer flex flex-col items-center justify-center
        bg-gradient-to-br backdrop-blur-md border transition-all duration-75
        active:scale-90 active:brightness-125
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      aria-label={config.label}
    >
      {renderIcon()}
      {config.label && (
        <span className="font-orbitron font-bold tracking-tight leading-none mt-0.5 pointer-events-none text-[10px] sm:text-[11px]">
          {config.label}
        </span>
      )}
      {config.sublabel && (
        <span className="font-mono text-[7px] sm:text-[8px] opacity-75 leading-none mt-0.5 pointer-events-none uppercase">
          {config.sublabel}
        </span>
      )}
    </button>
  );
};
