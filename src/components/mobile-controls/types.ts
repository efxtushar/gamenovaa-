export type ControlSchemeType =
  | 'racing'
  | 'shooter-joystick'
  | 'platformer'
  | 'ninja'
  | 'action-melee'
  | 'boxing'
  | 'mecha'
  | 'action-adventure'
  | 'runner'
  | 'sports'
  | 'flight'
  | 'arcade-reflex'
  | 'casual-fishing'
  | 'bubble-blast'
  | 'magic'
  | 'strategy-defense'
  | 'touch-canvas'
  | 'default-adventure';

export interface TouchButtonConfig {
  id: string;
  label: string;
  sublabel?: string;
  iconName?: 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'zap' | 'shield' | 'flame' | 'crosshair' | 'sword' | 'disc' | 'sparkles' | 'refresh' | 'play' | 'rotate' | 'layers' | 'eye';
  keys: {
    key: string;
    code: string;
  }[];
  variant?: 'primary' | 'danger' | 'accent' | 'warning' | 'secondary' | 'steer';
  size?: 'sm' | 'md' | 'lg' | 'wide';
}

export interface GameControlLayout {
  scheme: ControlSchemeType;
  leftCluster: 'joystick' | 'dpad' | 'steer-lr' | 'buttons' | 'none';
  customLeftButtons?: TouchButtonConfig[];
  rightButtons: TouchButtonConfig[];
  quickActions?: TouchButtonConfig[]; // Small top-floating actions like Reload or Element switch
  touchCanvasHint?: string; // Helpful tip for direct touch games (e.g. "Tap & drag gems to match")
}
