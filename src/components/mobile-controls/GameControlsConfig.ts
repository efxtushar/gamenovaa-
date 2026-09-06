import { GameControlLayout, TouchButtonConfig } from './types';

// Reusable standard buttons
const STEER_LEFT: TouchButtonConfig = {
  id: 'steer-left',
  label: 'LEFT',
  sublabel: 'A',
  iconName: 'arrow-left',
  keys: [
    { key: 'ArrowLeft', code: 'ArrowLeft' },
    { key: 'a', code: 'KeyA' }
  ],
  variant: 'steer',
  size: 'md'
};

const STEER_RIGHT: TouchButtonConfig = {
  id: 'steer-right',
  label: 'RIGHT',
  sublabel: 'D',
  iconName: 'arrow-right',
  keys: [
    { key: 'ArrowRight', code: 'ArrowRight' },
    { key: 'd', code: 'KeyD' }
  ],
  variant: 'steer',
  size: 'md'
};

export const GAME_CONTROLS_CONFIG: Record<string, GameControlLayout> = {
  // 1. Neon Drift
  'neon-drift': {
    scheme: 'racing',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'gas',
        label: 'GAS',
        sublabel: 'W / ↑',
        iconName: 'flame',
        keys: [{ key: 'ArrowUp', code: 'ArrowUp' }, { key: 'w', code: 'KeyW' }],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'brake',
        label: 'BRAKE',
        sublabel: 'S / ↓',
        iconName: 'arrow-down',
        keys: [{ key: 'ArrowDown', code: 'ArrowDown' }, { key: 's', code: 'KeyS' }],
        variant: 'secondary',
        size: 'md'
      },
      {
        id: 'nitro',
        label: 'BOOST',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'md'
      }
    ]
  },

  // 2. Desert Racer
  'desert-racer': {
    scheme: 'racing',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'tilt-left',
        label: 'TILT L',
        sublabel: 'A',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }, { key: 'a', code: 'KeyA' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'tilt-right',
        label: 'TILT R',
        sublabel: 'D',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }, { key: 'd', code: 'KeyD' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'gas',
        label: 'GAS',
        sublabel: 'W / ↑',
        iconName: 'arrow-up',
        keys: [{ key: 'ArrowUp', code: 'ArrowUp' }, { key: 'w', code: 'KeyW' }],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'brake',
        label: 'BRAKE',
        sublabel: 'S / ↓',
        iconName: 'arrow-down',
        keys: [{ key: 'ArrowDown', code: 'ArrowDown' }, { key: 's', code: 'KeyS' }],
        variant: 'secondary',
        size: 'md'
      },
      {
        id: 'nitro',
        label: 'NITRO',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'md'
      }
    ]
  },

  // 3. Battle Cars
  'battle-cars': {
    scheme: 'racing',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'drive',
        label: 'DRIVE',
        sublabel: 'W / ↑',
        iconName: 'arrow-up',
        keys: [{ key: 'ArrowUp', code: 'ArrowUp' }, { key: 'w', code: 'KeyW' }],
        variant: 'primary',
        size: 'md'
      },
      {
        id: 'reverse',
        label: 'BRAKE',
        sublabel: 'S / ↓',
        iconName: 'arrow-down',
        keys: [{ key: 'ArrowDown', code: 'ArrowDown' }, { key: 's', code: 'KeyS' }],
        variant: 'secondary',
        size: 'sm'
      },
      {
        id: 'ram-fire',
        label: 'NITRO',
        sublabel: 'SPACE',
        iconName: 'flame',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'danger',
        size: 'lg'
      }
    ]
  },

  // 4. Sky Warrior
  'sky-warrior': {
    scheme: 'shooter-joystick',
    leftCluster: 'joystick',
    rightButtons: [
      {
        id: 'cannon',
        label: 'CANNON',
        sublabel: 'SPACE',
        iconName: 'crosshair',
        keys: [
          { key: ' ', code: 'Space' },
          { key: 'j', code: 'KeyJ' }
        ],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'missiles',
        label: 'MISSILE',
        sublabel: 'K / X',
        iconName: 'flame',
        keys: [
          { key: 'k', code: 'KeyK' },
          { key: 'x', code: 'KeyX' }
        ],
        variant: 'danger',
        size: 'md'
      }
    ]
  },

  // 5. Zombie Escape (Dedicated built-in mobile touch controls with direct stateRef)
  'zombie-escape': {
    scheme: 'touch-canvas',
    leftCluster: 'none',
    rightButtons: []
  },

  // 6. Space Miner
  'space-miner': {
    scheme: 'shooter-joystick',
    leftCluster: 'joystick',
    rightButtons: [
      {
        id: 'laser',
        label: 'LASER',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'tractor',
        label: 'TRACTOR',
        sublabel: 'E',
        iconName: 'sparkles',
        keys: [{ key: 'e', code: 'KeyE' }],
        variant: 'accent',
        size: 'md'
      }
    ]
  },

  // 7. Space Survivor
  'space-survivor': {
    scheme: 'shooter-joystick',
    leftCluster: 'joystick',
    rightButtons: [
      {
        id: 'emp',
        label: 'EMP',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'lg'
      }
    ]
  },

  // 8. Ninja Dash
  'ninja-dash': {
    scheme: 'ninja',
    leftCluster: 'buttons',
    customLeftButtons: [
      {
        id: 'slide',
        label: 'SLIDE',
        sublabel: '↓ / S',
        iconName: 'arrow-down',
        keys: [{ key: 'ArrowDown', code: 'ArrowDown' }, { key: 's', code: 'KeyS' }],
        variant: 'secondary',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'jump',
        label: 'JUMP',
        sublabel: 'SPACE',
        iconName: 'arrow-up',
        keys: [
          { key: ' ', code: 'Space' },
          { key: 'ArrowUp', code: 'ArrowUp' },
          { key: 'w', code: 'KeyW' }
        ],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'shuriken',
        label: 'ATTACK',
        sublabel: 'J / Z',
        iconName: 'disc',
        keys: [
          { key: 'j', code: 'KeyJ' },
          { key: 'z', code: 'KeyZ' },
          { key: 'f', code: 'KeyF' }
        ],
        variant: 'accent',
        size: 'md'
      }
    ]
  },

  // 9. Cyber Samurai
  'cyber-samurai': {
    scheme: 'action-melee',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'slash',
        label: 'SLASH',
        sublabel: 'SPACE / J',
        iconName: 'sword',
        keys: [
          { key: ' ', code: 'Space' },
          { key: 'j', code: 'KeyJ' }
        ],
        variant: 'danger',
        size: 'lg'
      },
      {
        id: 'parry',
        label: 'PARRY',
        sublabel: 'K / SHIFT',
        iconName: 'shield',
        keys: [
          { key: 'k', code: 'KeyK' },
          { key: 'Shift', code: 'ShiftLeft' }
        ],
        variant: 'primary',
        size: 'md'
      }
    ]
  },

  // 10. Mecha Battle
  'mecha-battle': {
    scheme: 'mecha',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'walk-left',
        label: 'LEFT',
        sublabel: 'A',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }, { key: 'a', code: 'KeyA' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'walk-right',
        label: 'RIGHT',
        sublabel: 'D',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }, { key: 'd', code: 'KeyD' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'shoot-cannon',
        label: 'CANNON',
        sublabel: 'F / J',
        iconName: 'crosshair',
        keys: [{ key: 'f', code: 'KeyF' }, { key: 'j', code: 'KeyJ' }],
        variant: 'danger',
        size: 'lg'
      },
      {
        id: 'mecha-jump',
        label: 'JUMP',
        sublabel: 'SPACE',
        iconName: 'arrow-up',
        keys: [{ key: ' ', code: 'Space' }, { key: 'w', code: 'KeyW' }],
        variant: 'primary',
        size: 'md'
      },
      {
        id: 'missile-barrage',
        label: 'MISSILE',
        sublabel: 'E / K',
        iconName: 'flame',
        keys: [{ key: 'e', code: 'KeyE' }, { key: 'k', code: 'KeyK' }],
        variant: 'warning',
        size: 'sm'
      },
      {
        id: 'mecha-shield',
        label: 'SHIELD',
        sublabel: 'S / SHIFT',
        iconName: 'shield',
        keys: [{ key: 's', code: 'KeyS' }, { key: 'Shift', code: 'ShiftLeft' }],
        variant: 'accent',
        size: 'sm'
      }
    ]
  },

  // 11. Robot Brawl
  'robot-brawl': {
    scheme: 'boxing',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'dodge-left',
        label: 'WEAVE L',
        sublabel: 'A',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }, { key: 'a', code: 'KeyA' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'dodge-right',
        label: 'WEAVE R',
        sublabel: 'D',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }, { key: 'd', code: 'KeyD' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'punch',
        label: 'JAB',
        sublabel: 'J / SPACE',
        iconName: 'sword',
        keys: [{ key: 'j', code: 'KeyJ' }, { key: ' ', code: 'Space' }],
        variant: 'danger',
        size: 'lg'
      },
      {
        id: 'uppercut',
        label: 'UPPERCUT',
        sublabel: 'K / SHIFT',
        iconName: 'zap',
        keys: [{ key: 'k', code: 'KeyK' }, { key: 'Shift', code: 'ShiftLeft' }],
        variant: 'warning',
        size: 'md'
      },
      {
        id: 'guard',
        label: 'GUARD',
        sublabel: 'S / ↓',
        iconName: 'shield',
        keys: [{ key: 's', code: 'KeyS' }, { key: 'ArrowDown', code: 'ArrowDown' }],
        variant: 'accent',
        size: 'sm'
      }
    ]
  },

  // 12. Monster Arena
  'monster-arena': {
    scheme: 'action-adventure',
    leftCluster: 'joystick',
    rightButtons: [
      {
        id: 'sword',
        label: 'ATTACK',
        sublabel: 'SPACE / J',
        iconName: 'sword',
        keys: [{ key: ' ', code: 'Space' }, { key: 'j', code: 'KeyJ' }],
        variant: 'danger',
        size: 'lg'
      }
    ]
  },

  // 13. Pixel Quest
  'pixel-quest': {
    scheme: 'platformer',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'run-left',
        label: 'LEFT',
        sublabel: 'A',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }, { key: 'a', code: 'KeyA' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'run-right',
        label: 'RIGHT',
        sublabel: 'D',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }, { key: 'd', code: 'KeyD' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'jump',
        label: 'JUMP',
        sublabel: 'SPACE',
        iconName: 'arrow-up',
        keys: [
          { key: ' ', code: 'Space' },
          { key: 'ArrowUp', code: 'ArrowUp' },
          { key: 'w', code: 'KeyW' }
        ],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'sprint',
        label: 'SPRINT',
        sublabel: 'SHIFT',
        iconName: 'zap',
        keys: [{ key: 'Shift', code: 'ShiftLeft' }],
        variant: 'warning',
        size: 'sm'
      }
    ]
  },

  // 14. Jungle Run
  'jungle-run': {
    scheme: 'runner',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'lane-left',
        label: 'LANE ◀',
        sublabel: 'A',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }, { key: 'a', code: 'KeyA' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'lane-right',
        label: 'LANE ▶',
        sublabel: 'D',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }, { key: 'd', code: 'KeyD' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'jump',
        label: 'JUMP',
        sublabel: '↑ / SPACE',
        iconName: 'arrow-up',
        keys: [{ key: 'ArrowUp', code: 'ArrowUp' }, { key: ' ', code: 'Space' }, { key: 'w', code: 'KeyW' }],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'slide',
        label: 'SLIDE',
        sublabel: '↓ / S',
        iconName: 'arrow-down',
        keys: [{ key: 'ArrowDown', code: 'ArrowDown' }, { key: 's', code: 'KeyS' }],
        variant: 'secondary',
        size: 'md'
      }
    ]
  },

  // 15. Snowboard Hero
  'snowboard-hero': {
    scheme: 'sports',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'carve-left',
        label: 'CARVE L',
        sublabel: 'A',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }, { key: 'a', code: 'KeyA' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'carve-right',
        label: 'CARVE R',
        sublabel: 'D',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }, { key: 'd', code: 'KeyD' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'ollie',
        label: 'OLLIE',
        sublabel: 'SPACE',
        iconName: 'arrow-up',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'tuck',
        label: 'TUCK',
        sublabel: 'SHIFT',
        iconName: 'zap',
        keys: [{ key: 'Shift', code: 'ShiftLeft' }],
        variant: 'warning',
        size: 'sm'
      }
    ]
  },

  // 16. Dragon Flight
  'dragon-flight': {
    scheme: 'flight',
    leftCluster: 'buttons',
    customLeftButtons: [
      {
        id: 'flap',
        label: 'FLAP WINGS',
        sublabel: 'SPACE',
        iconName: 'arrow-up',
        keys: [{ key: ' ', code: 'Space' }, { key: 'ArrowUp', code: 'ArrowUp' }],
        variant: 'primary',
        size: 'wide'
      }
    ],
    rightButtons: [
      {
        id: 'fireball',
        label: 'FIREBALL',
        sublabel: 'F / J',
        iconName: 'flame',
        keys: [{ key: 'f', code: 'KeyF' }, { key: 'j', code: 'KeyJ' }],
        variant: 'danger',
        size: 'lg'
      }
    ]
  },

  // 17. Rocket Rush
  'rocket-rush': {
    scheme: 'flight',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'thruster',
        label: 'THRUST',
        sublabel: 'SPACE',
        iconName: 'flame',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'primary',
        size: 'lg'
      }
    ]
  },

  // 18. Pirate Treasure
  'pirate-treasure': {
    scheme: 'default-adventure',
    leftCluster: 'joystick',
    rightButtons: [
      {
        id: 'cannons',
        label: 'CANNONS',
        sublabel: 'SPACE',
        iconName: 'crosshair',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'danger',
        size: 'lg'
      }
    ]
  },

  // 19. Deep Sea Adventure
  'deep-sea-adventure': {
    scheme: 'default-adventure',
    leftCluster: 'joystick',
    rightButtons: [
      {
        id: 'lights',
        label: 'LIGHTS',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'lg'
      }
    ]
  },

  // 20. Color Rush
  'color-rush': {
    scheme: 'arcade-reflex',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'switch-color',
        label: 'SHIFT COLOR',
        sublabel: 'SPACE',
        iconName: 'sparkles',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'accent',
        size: 'lg'
      }
    ]
  },

  // 21. Fishing Frenzy
  'fishing-frenzy': {
    scheme: 'casual-fishing',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'cast-reel',
        label: 'CAST / REEL',
        sublabel: 'SPACE',
        iconName: 'refresh',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'primary',
        size: 'lg'
      }
    ]
  },

  // 22. Bubble Blast
  'bubble-blast': {
    scheme: 'bubble-blast',
    leftCluster: 'steer-lr',
    customLeftButtons: [
      {
        id: 'aim-left',
        label: 'AIM ◀',
        sublabel: '←',
        iconName: 'arrow-left',
        keys: [{ key: 'ArrowLeft', code: 'ArrowLeft' }],
        variant: 'steer',
        size: 'md'
      },
      {
        id: 'aim-right',
        label: 'AIM ▶',
        sublabel: '→',
        iconName: 'arrow-right',
        keys: [{ key: 'ArrowRight', code: 'ArrowRight' }],
        variant: 'steer',
        size: 'md'
      }
    ],
    rightButtons: [
      {
        id: 'shoot-bubble',
        label: 'LAUNCH',
        sublabel: 'SPACE',
        iconName: 'crosshair',
        keys: [{ key: ' ', code: 'Space' }, { key: 'ArrowUp', code: 'ArrowUp' }],
        variant: 'primary',
        size: 'lg'
      },
      {
        id: 'swap-bubble',
        label: 'SWAP',
        sublabel: 'C',
        iconName: 'rotate',
        keys: [{ key: 'c', code: 'KeyC' }],
        variant: 'accent',
        size: 'sm'
      }
    ],
    touchCanvasHint: 'Tap or drag on canvas to aim & release directly'
  },

  // 23. Gem Match
  'gem-match': {
    scheme: 'touch-canvas',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'reshuffle',
        label: 'SHUFFLE',
        sublabel: 'R',
        iconName: 'rotate',
        keys: [{ key: 'r', code: 'KeyR' }],
        variant: 'secondary',
        size: 'sm'
      }
    ],
    touchCanvasHint: 'Swipe or tap adjacent jewels to match rows of 3+'
  },

  // 24. Street Hoops
  'street-hoops': {
    scheme: 'touch-canvas',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'quick-shoot',
        label: 'SHOOT',
        sublabel: 'SPACE',
        iconName: 'arrow-up',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'primary',
        size: 'md'
      },
      {
        id: 'reset-ball',
        label: 'RESET',
        sublabel: 'R',
        iconName: 'rotate',
        keys: [{ key: 'r', code: 'KeyR' }],
        variant: 'secondary',
        size: 'sm'
      }
    ],
    touchCanvasHint: 'Drag court to set angle & power, release to shoot'
  },

  // 25. Mini Golf World
  'mini-golf-world': {
    scheme: 'touch-canvas',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'retry-hole',
        label: 'RETRY',
        sublabel: 'R',
        iconName: 'rotate',
        keys: [{ key: 'r', code: 'KeyR' }],
        variant: 'secondary',
        size: 'sm'
      }
    ],
    touchCanvasHint: 'Pull back from the ball to aim & putt'
  },

  // 26. Castle Defender
  'castle-defender': {
    scheme: 'strategy-defense',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'speed-wave',
        label: 'WARP',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'sm'
      }
    ],
    quickActions: [
      {
        id: 'spell-fire',
        label: 'METEOR',
        sublabel: '1',
        iconName: 'flame',
        keys: [{ key: '1', code: 'Digit1' }],
        variant: 'danger',
        size: 'sm'
      },
      {
        id: 'spell-shock',
        label: 'BOLT',
        sublabel: '2',
        iconName: 'zap',
        keys: [{ key: '2', code: 'Digit2' }],
        variant: 'primary',
        size: 'sm'
      },
      {
        id: 'spell-freeze',
        label: 'FROST',
        sublabel: '3',
        iconName: 'sparkles',
        keys: [{ key: '3', code: 'Digit3' }],
        variant: 'accent',
        size: 'sm'
      }
    ],
    touchCanvasHint: 'Tap spots on path to place defensive towers'
  },

  // 27. Galaxy Commander
  'galaxy-commander': {
    scheme: 'strategy-defense',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'warp-speed',
        label: 'WARP',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'md'
      }
    ],
    touchCanvasHint: 'Tap your planets, then tap targets to launch starships'
  },

  // 28. Farm Friends
  'farm-friends': {
    scheme: 'touch-canvas',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'upgrade-tools',
        label: 'UPGRADE',
        sublabel: 'U',
        iconName: 'sparkles',
        keys: [{ key: 'u', code: 'KeyU' }],
        variant: 'accent',
        size: 'md'
      }
    ],
    touchCanvasHint: 'Tap soil plots to sow seeds and harvest ripe crops'
  },

  // 29. Haunted House
  'haunted-house': {
    scheme: 'touch-canvas',
    leftCluster: 'none',
    rightButtons: [
      {
        id: 'uv-flash',
        label: 'UV FLASH',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }],
        variant: 'warning',
        size: 'lg'
      }
    ],
    touchCanvasHint: 'Drag flashlight beam across rooms to banish ghosts'
  },

  // 30. Magic Academy
  'magic-academy': {
    scheme: 'magic',
    leftCluster: 'steer-lr',
    customLeftButtons: [STEER_LEFT, STEER_RIGHT],
    rightButtons: [
      {
        id: 'cast-spell',
        label: 'CAST',
        sublabel: 'SPACE',
        iconName: 'zap',
        keys: [{ key: ' ', code: 'Space' }, { key: 'j', code: 'KeyJ' }],
        variant: 'primary',
        size: 'lg'
      }
    ],
    quickActions: [
      {
        id: 'elem-fire',
        label: 'FIRE',
        sublabel: '1',
        iconName: 'flame',
        keys: [{ key: '1', code: 'Digit1' }],
        variant: 'danger',
        size: 'sm'
      },
      {
        id: 'elem-frost',
        label: 'ICE',
        sublabel: '2',
        iconName: 'sparkles',
        keys: [{ key: '2', code: 'Digit2' }],
        variant: 'primary',
        size: 'sm'
      },
      {
        id: 'elem-arcane',
        label: 'ARCANE',
        sublabel: '3',
        iconName: 'disc',
        keys: [{ key: '3', code: 'Digit3' }],
        variant: 'accent',
        size: 'sm'
      }
    ]
  }
};

// Fallback layout for any custom/unlisted games
export const DEFAULT_GAME_CONTROL_LAYOUT: GameControlLayout = {
  scheme: 'default-adventure',
  leftCluster: 'joystick',
  rightButtons: [
    {
      id: 'action-primary',
      label: 'ACTION',
      sublabel: 'SPACE',
      iconName: 'zap',
      keys: [{ key: ' ', code: 'Space' }],
      variant: 'primary',
      size: 'lg'
    },
    {
      id: 'action-secondary',
      label: 'ALT',
      sublabel: 'SHIFT',
      iconName: 'disc',
      keys: [{ key: 'Shift', code: 'ShiftLeft' }],
      variant: 'accent',
      size: 'md'
    }
  ]
};
