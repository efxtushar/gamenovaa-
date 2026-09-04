import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { 
  Play, RotateCcw, Trophy, Compass, Sparkles, Volume2, VolumeX, 
  Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldAlert, Footprints, Heart
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

// 3D Perspective Obstacle
interface Obstacle {
  id: number;
  z: number;
  lane: number; // 0: Left, 1: Center, 2: Right
  type: 'log' | 'boulder' | 'vines' | 'roots' | 'mud';
}

// Collectible item along track
interface Collectible {
  id: number;
  z: number;
  lane: number;
  type: 'coin' | 'idol';
  collected: boolean;
  rotation: number;
}

// Ambient effects: Birds, Butterflies, Falling Leaves, Dust
interface AmbientParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz?: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'leaf' | 'sparkle' | 'dust' | 'splash';
}

interface JungleCreature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wing: number;
  color: string;
  type: 'bird' | 'butterfly';
  scale: number;
}

// Side Scenery (Totems, Palm Trees, Monsteras, Waterfalls)
interface SideScenery {
  z: number;
  side: -1 | 1; // Left or Right
  type: 'tree' | 'fern' | 'totem' | 'flower' | 'rock';
  heightVariation: number;
}

export const JungleRunGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [idols, setIdols] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_jungle-run') || '0', 10);
  });
  const [soundMuted, setSoundMuted] = useState(sound.getIsMuted());

  // Mutable game state engine ref
  const stateRef = useRef({
    player: {
      lane: 1, // 0: Left, 1: Center, 2: Right
      targetX: 0,
      currentX: 0,
      yOffset: 0,
      isJumping: false,
      isSliding: false,
      jumpVy: 0,
      slideTimer: 0,
      runFrame: 0,
      invulnerable: 0, // Brief grace period
      hearts: 3
    },
    obstacles: [] as Obstacle[],
    items: [] as Collectible[],
    scenery: [] as SideScenery[],
    particles: [] as AmbientParticle[],
    creatures: [] as JungleCreature[],
    speed: 4.2, // Smooth, gentle starting speed (first 1-2 mins is very comfortable)
    baseSpeed: 4.2,
    maxSpeed: 10.5,
    distance: 0,
    coinsCount: 0,
    idolsCount: 0,
    score: 0,
    waterfallAnim: 0,
    bridgeTimer: 0,
    shake: 0,
    lastTime: 0,
    nextObstacleZ: 800,
    nextItemZ: 400,
    nextSceneryZ: 100,
    obstacleIdCounter: 1,
    itemIdCounter: 1
  });

  // Smooth Lane Switching
  const moveLeft = useCallback(() => {
    const s = stateRef.current;
    if (s.player.lane > 0) {
      sound.playJump();
      s.player.lane--;
    }
  }, []);

  const moveRight = useCallback(() => {
    const s = stateRef.current;
    if (s.player.lane < 2) {
      sound.playJump();
      s.player.lane++;
    }
  }, []);

  // Leaping Jump
  const jump = useCallback(() => {
    const s = stateRef.current;
    const p = s.player;
    if (!p.isJumping) {
      sound.playJump();
      p.isJumping = true;
      p.isSliding = false;
      p.slideTimer = 0;
      p.jumpVy = -14.5;

      // Dust puff on jump
      for (let i = 0; i < 5; i++) {
        s.particles.push({
          x: p.currentX,
          y: 0,
          z: 0,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 2,
          size: 3 + Math.random() * 3,
          color: '#15803d',
          alpha: 0.8,
          life: 0,
          maxLife: 15,
          type: 'dust'
        });
      }
    }
  }, []);

  // Low Slide
  const slide = useCallback(() => {
    const s = stateRef.current;
    const p = s.player;
    if (!p.isSliding) {
      sound.playClick();
      p.isSliding = true;
      p.slideTimer = 32; // ~530ms duration
      if (p.isJumping) {
        // Fast-drop if in air
        p.jumpVy = Math.max(p.jumpVy, 12);
      }

      // Slide dust
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: p.currentX + (Math.random() - 0.5) * 15,
          y: 0,
          z: 0,
          vx: (Math.random() - 0.5) * 2,
          vy: -0.5 - Math.random() * 1.5,
          size: 2 + Math.random() * 3,
          color: '#ca8a04',
          alpha: 0.7,
          life: 0,
          maxLife: 18,
          type: 'dust'
        });
      }
    }
  }, []);

  // Initialize Game World
  const initGame = useCallback(() => {
    sound.playClick();

    // Initial scenery flanking the trail
    const scenery: SideScenery[] = [];
    for (let z = 100; z < 2400; z += 120) {
      scenery.push({
        z,
        side: Math.random() > 0.5 ? 1 : -1,
        type: ['tree', 'fern', 'totem', 'flower', 'rock'][Math.floor(Math.random() * 5)] as SideScenery['type'],
        heightVariation: 0.8 + Math.random() * 0.4
      });
    }

    // Initial friendly spaced obstacles (far ahead)
    const obstacles: Obstacle[] = [
      { id: 1, z: 900, lane: 0, type: 'log' },
      { id: 2, z: 1400, lane: 2, type: 'boulder' },
      { id: 3, z: 1900, lane: 1, type: 'vines' },
      { id: 4, z: 2400, lane: 0, type: 'roots' }
    ];

    // Initial coin arches & idols
    const items: Collectible[] = [
      { id: 1, z: 450, lane: 1, type: 'coin', collected: false, rotation: 0 },
      { id: 2, z: 550, lane: 1, type: 'coin', collected: false, rotation: 0 },
      { id: 3, z: 650, lane: 1, type: 'coin', collected: false, rotation: 0 },
      { id: 4, z: 1100, lane: 1, type: 'idol', collected: false, rotation: 0 },
      { id: 5, z: 1600, lane: 0, type: 'coin', collected: false, rotation: 0 },
      { id: 6, z: 1700, lane: 0, type: 'coin', collected: false, rotation: 0 },
      { id: 7, z: 2150, lane: 2, type: 'coin', collected: false, rotation: 0 }
    ];

    // Ambient birds and butterflies
    const creatures: JungleCreature[] = [
      { x: 80, y: 120, vx: 2.2, vy: 0.2, wing: 0, color: '#f43f5e', type: 'bird', scale: 1.2 },
      { x: 340, y: 90, vx: 1.8, vy: -0.1, wing: 1.5, color: '#38bdf8', type: 'bird', scale: 1.0 },
      { x: 500, y: 140, vx: 2.5, vy: 0.3, wing: 3.0, color: '#fbbf24', type: 'bird', scale: 1.1 },
      { x: 200, y: 220, vx: 0.8, vy: 0.4, wing: 0, color: '#a855f7', type: 'butterfly', scale: 0.8 },
      { x: 600, y: 260, vx: -0.7, vy: -0.3, wing: 2.1, color: '#06b6d4', type: 'butterfly', scale: 0.8 }
    ];

    stateRef.current = {
      player: {
        lane: 1,
        targetX: 0,
        currentX: 0,
        yOffset: 0,
        isJumping: false,
        isSliding: false,
        jumpVy: 0,
        slideTimer: 0,
        runFrame: 0,
        invulnerable: 0,
        hearts: 3
      },
      obstacles,
      items,
      scenery,
      particles: [],
      creatures,
      speed: 4.2,
      baseSpeed: 4.2,
      maxSpeed: 10.5,
      distance: 0,
      coinsCount: 0,
      idolsCount: 0,
      score: 0,
      waterfallAnim: 0,
      bridgeTimer: 0,
      shake: 0,
      lastTime: performance.now(),
      nextObstacleZ: 2800,
      nextItemZ: 2500,
      nextSceneryZ: 2400,
      obstacleIdCounter: 5,
      itemIdCounter: 8
    };

    setDistance(0);
    setCoins(0);
    setIdols(0);
    setHearts(3);
    setScore(0);
    setGameState('PLAYING');
  }, []);

  // Toggle Pause
  const handleTogglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === 'PLAYING') {
        sound.playClick();
        return 'PAUSED';
      }
      if (prev === 'PAUSED') {
        sound.playClick();
        stateRef.current.lastTime = performance.now();
        return 'PLAYING';
      }
      return prev;
    });
  }, []);

  // Handle Game Over
  const triggerGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_jungle-run', finalScore.toString());
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.55 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keyboard Event Management with Strict Scroll Prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser page scrolling for all game controls
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        handleTogglePause();
        return;
      }

      if (gameState !== 'PLAYING') return;

      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        moveLeft();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        moveRight();
      } else if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) {
        jump();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        slide();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, moveLeft, moveRight, jump, slide, handleTogglePause]);

  // Main 60FPS Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (currentTime: number) => {
      const s = stateRef.current;
      const p = s.player;
      const dt = Math.min(33, currentTime - (s.lastTime || currentTime)) / 16.66;
      s.lastTime = currentTime;

      const w = canvas.width;
      const h = canvas.height;
      const horizonY = h * 0.42;

      // 1. UPDATE SPEED & PROGRESS (Gentle ramp-up)
      // First 300 meters (~20-25 seconds): speed gently increases from 5.8 to 7.5
      // Beyond 800 meters: speeds up gradually to maxSpeed
      s.distance += Math.floor(s.speed * 0.18 * dt);
      s.speed = Math.min(s.maxSpeed, s.baseSpeed + (s.distance * 0.0032));
      s.waterfallAnim += 0.15 * dt;
      p.runFrame += 0.22 * (s.speed / 6.0) * dt;

      // Calculate total score
      const currentScore = s.distance + s.coinsCount * 100 + s.idolsCount * 500;
      s.score = currentScore;
      setDistance(s.distance);
      setScore(currentScore);

      // Lane spacing in world pixels
      const laneWidthAtBottom = Math.min(w * 0.28, 140);
      const lanePositions = [-laneWidthAtBottom, 0, laneWidthAtBottom];

      // Smooth horizontal transition between lanes
      p.targetX = lanePositions[p.lane];
      p.currentX += (p.targetX - p.currentX) * 0.24 * dt;

      // 2. PLAYER JUMP & SLIDE PHYSICS
      if (p.isJumping) {
        p.yOffset += p.jumpVy * dt;
        p.jumpVy += 0.88 * dt; // Gravity

        if (p.yOffset >= 0) {
          // Landed on ground
          p.yOffset = 0;
          p.isJumping = false;
          p.jumpVy = 0;

          // Landing dust puff
          for (let i = 0; i < 4; i++) {
            s.particles.push({
              x: p.currentX + (Math.random() - 0.5) * 20,
              y: 0,
              z: 0,
              vx: (Math.random() - 0.5) * 3,
              vy: -0.5 - Math.random() * 1.5,
              size: 3,
              color: '#15803d',
              alpha: 0.7,
              life: 0,
              maxLife: 12,
              type: 'dust'
            });
          }
        }
      }

      if (p.isSliding) {
        p.slideTimer -= 1 * dt;
        if (p.slideTimer <= 0) {
          p.isSliding = false;
          p.slideTimer = 0;
        }
      }

      // 3. SPAWN PROCEDURAL JUNGLE OBSTACLES & ITEMS
      const cameraAdvance = s.speed * 2.8 * dt;

      // Update & Recycle Scenery
      s.scenery.forEach(sc => {
        sc.z -= cameraAdvance;
        if (sc.z < -100) {
          sc.z = 2400 + Math.random() * 200;
          sc.side = Math.random() > 0.5 ? 1 : -1;
          sc.type = ['tree', 'fern', 'totem', 'flower', 'rock'][Math.floor(Math.random() * 5)] as SideScenery['type'];
          sc.heightVariation = 0.8 + Math.random() * 0.4;
        }
      });

      // Spawn next obstacles ensuring fair clearance
      if (s.obstacles.length < 5) {
        const lastZ = s.obstacles.reduce((max, o) => Math.max(max, o.z), 0);
        // Minimum spacing scales with speed so player always has reaction time
        const minGap = Math.max(500, 650 - s.distance * 0.05);
        const spawnZ = Math.max(2200, lastZ + minGap + Math.random() * 300);

        const types: Obstacle['type'][] = ['log', 'boulder', 'vines', 'roots', 'mud'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const chosenLane = Math.floor(Math.random() * 3);

        s.obstacles.push({
          id: s.obstacleIdCounter++,
          z: spawnZ,
          lane: chosenLane,
          type: chosenType
        });
      }

      // Spawn Coins & Relics
      if (s.items.length < 8) {
        const lastItemZ = s.items.reduce((max, it) => Math.max(max, it.z), 0);
        const spawnZ = Math.max(2000, lastItemZ + 200 + Math.random() * 250);
        const isIdol = Math.random() < 0.15; // 15% chance of rare golden idol

        s.items.push({
          id: s.itemIdCounter++,
          z: spawnZ,
          lane: Math.floor(Math.random() * 3),
          type: isIdol ? 'idol' : 'coin',
          collected: false,
          rotation: 0
        });
      }

      // 4. UPDATE OBSTACLES & COLLISION DETECTION
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const ob = s.obstacles[i];
        ob.z -= cameraAdvance;

        // Player collision zone in 3D depth (near player plane z ≈ 0)
        if (ob.z > -25 && ob.z < 65 && ob.lane === p.lane) {
          let collided = false;

          if (ob.type === 'log') {
            // Jump required (must be high enough)
            if (!p.isJumping || p.yOffset > -25) {
              collided = true;
            }
          } else if (ob.type === 'vines') {
            // Slide required (must be crouching/sliding)
            if (!p.isSliding) {
              collided = true;
            }
          } else if (ob.type === 'boulder') {
            // Must avoid lane (cannot jump or slide over massive boulder)
            collided = true;
          } else if (ob.type === 'roots') {
            // Jump or slide works
            if (!p.isJumping && !p.isSliding) {
              collided = true;
            }
          } else if (ob.type === 'mud') {
            // Jump over mud pit
            if (!p.isJumping || p.yOffset > -20) {
              collided = true;
            }
          }

          if (collided && p.invulnerable <= 0) {
            sound.playHit();
            s.shake = 10;
            p.hearts--;
            setHearts(p.hearts);
            p.invulnerable = 65; // ~1.1s invulnerability

            // Move obstacle past
            ob.z = -150;

            if (p.hearts <= 0) {
              triggerGameOver(s.score);
              return;
            }
          }
        }

        // Remove obstacles that moved past player
        if (ob.z < -100) {
          s.obstacles.splice(i, 1);
        }
      }

      if (p.invulnerable > 0) p.invulnerable -= 1 * dt;

      // 5. UPDATE ITEMS & PICKUP DETECTION
      for (let i = s.items.length - 1; i >= 0; i--) {
        const item = s.items[i];
        item.z -= cameraAdvance;
        item.rotation += 0.06 * dt;

        // Pickup collision
        if (!item.collected && item.z > -30 && item.z < 70 && item.lane === p.lane) {
          item.collected = true;

          if (item.type === 'coin') {
            sound.playCoin();
            s.coinsCount++;
            setCoins(s.coinsCount);
            if (s.coinsCount % 25 === 0 && p.hearts < 3) {
              p.hearts++;
              setHearts(p.hearts);
              sound.playPowerUp();
            }
            // Gold Sparkles
            for (let k = 0; k < 6; k++) {
              s.particles.push({
                x: p.currentX + (Math.random() - 0.5) * 16,
                y: p.yOffset - 25,
                z: 0,
                vx: (Math.random() - 0.5) * 4,
                vy: -2 - Math.random() * 3,
                size: 3 + Math.random() * 2,
                color: '#fbbf24',
                alpha: 1,
                life: 0,
                maxLife: 18,
                type: 'sparkle'
              });
            }
          } else {
            // Golden Idol Relic
            sound.playPowerUp();
            s.idolsCount++;
            setIdols(s.idolsCount);
            if (p.hearts < 3) {
              p.hearts++;
              setHearts(p.hearts);
            }
            confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
            // Radiant Idol Sparkles
            for (let k = 0; k < 12; k++) {
              s.particles.push({
                x: p.currentX + (Math.random() - 0.5) * 20,
                y: p.yOffset - 30,
                z: 0,
                vx: (Math.random() - 0.5) * 6,
                vy: -3 - Math.random() * 4,
                size: 4 + Math.random() * 3,
                color: '#facc15',
                alpha: 1,
                life: 0,
                maxLife: 22,
                type: 'sparkle'
              });
            }
          }
        }

        if (item.z < -100) {
          s.items.splice(i, 1);
        }
      }

      // 6. UPDATE AMBIENT CREATURES (Birds & Butterflies)
      s.creatures.forEach(cr => {
        cr.x += cr.vx * dt;
        cr.y += cr.vy * dt;
        cr.wing += (cr.type === 'bird' ? 0.25 : 0.35) * dt;

        // Wrap around screen
        if (cr.x > w + 60) cr.x = -60;
        if (cr.x < -60) cr.x = w + 60;
        if (cr.y < 40) cr.vy = Math.abs(cr.vy);
        if (cr.y > horizonY + 60) cr.vy = -Math.abs(cr.vy);
      });

      // Spawn falling jungle leaves
      if (Math.random() < 0.25) {
        s.particles.push({
          x: Math.random() * w,
          y: Math.random() * (horizonY * 0.7),
          z: 100 + Math.random() * 800,
          vx: 0.5 + Math.random() * 1.5,
          vy: 1.0 + Math.random() * 1.5,
          size: 3 + Math.random() * 3,
          color: Math.random() > 0.4 ? '#16a34a' : '#22c55e',
          alpha: 0.8,
          life: 0,
          maxLife: 90,
          type: 'leaf'
        });
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life += 1 * dt;
        pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

        if (pt.life >= pt.maxLife) {
          s.particles.splice(i, 1);
        }
      }

      // Decay screen shake
      if (s.shake > 0) s.shake -= 0.8 * dt;

      // ========================================================
      // 7. RENDER 3D JUNGLE ENVIRONMENT
      // ========================================================
      ctx.save();
      ctx.clearRect(0, 0, w, h);

      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      }

      // 7.1 Lush Tropical Sky Gradient with God Rays
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#064e3b');
      skyGrad.addColorStop(0.45, '#065f46');
      skyGrad.addColorStop(0.85, '#047857');
      skyGrad.addColorStop(1, '#34d399');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);

      // Tropical Sun / God Rays
      const sunX = w * 0.55;
      const sunY = horizonY * 0.35;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 140);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      sunGlow.addColorStop(0.4, 'rgba(253, 224, 71, 0.3)');
      sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric God Rays streaming down
      ctx.save();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX - 180, h);
      ctx.lineTo(sunX - 80, h);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + 60, h);
      ctx.lineTo(sunX + 180, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 7.2 Distant Misty Jungle Mountains (Parallax Layer 1)
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let mx = 0; mx <= w; mx += 60) {
        const my = horizonY - 45 - Math.sin((mx + s.distance * 0.05) * 0.008) * 35 - Math.cos(mx * 0.015) * 18;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(w, horizonY);
      ctx.closePath();
      ctx.fill();

      // Midground Rainforest Ridge (Parallax Layer 2)
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let mx = 0; mx <= w; mx += 40) {
        const my = horizonY - 20 - Math.sin((mx - s.distance * 0.12) * 0.012) * 22;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(w, horizonY);
      ctx.closePath();
      ctx.fill();

      // 7.3 Animated Jungle Waterfall & River Stream
      const wfX = w * 0.72;
      const wfTop = horizonY - 38;
      // Waterfall flow
      const wfGrad = ctx.createLinearGradient(wfX, wfTop, wfX, horizonY);
      wfGrad.addColorStop(0, '#67e8f9');
      wfGrad.addColorStop(1, '#a5f3fc');
      ctx.fillStyle = wfGrad;
      ctx.fillRect(wfX - 10, wfTop, 20, horizonY - wfTop);

      // Water mist at base of falls
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(wfX, horizonY, 18 + Math.sin(s.waterfallAnim) * 3, 0, Math.PI * 2);
      ctx.fill();

      // 7.4 Dense Ground Rainforest Floor
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      groundGrad.addColorStop(0, '#064e3b');
      groundGrad.addColorStop(0.3, '#022c22');
      groundGrad.addColorStop(1, '#011c15');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // 7.5 Ancient Stone / Wood Path Polygon (3D Perspective)
      const pathTopWidth = 60;
      const pathBottomWidth = Math.min(w * 0.88, 540);
      const centerX = w / 2;

      ctx.beginPath();
      ctx.moveTo(centerX - pathTopWidth / 2, horizonY);
      ctx.lineTo(centerX + pathTopWidth / 2, horizonY);
      ctx.lineTo(centerX + pathBottomWidth / 2, h);
      ctx.lineTo(centerX - pathBottomWidth / 2, h);
      ctx.closePath();

      // Ancient Weathered Stone Flagstone Gradient
      const pathGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      pathGrad.addColorStop(0, '#3f2e1e');
      pathGrad.addColorStop(0.5, '#573d26');
      pathGrad.addColorStop(1, '#452b14');
      ctx.fillStyle = pathGrad;
      ctx.fill();

      // Stone Path borders (Mossy Carved Stone Edge)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX - pathTopWidth / 2, horizonY);
      ctx.lineTo(centerX - pathBottomWidth / 2, h);
      ctx.moveTo(centerX + pathTopWidth / 2, horizonY);
      ctx.lineTo(centerX + pathBottomWidth / 2, h);
      ctx.stroke();

      // Stone flagstone step lines scrolling with run speed
      const numSteps = 16;
      for (let st = 0; st < numSteps; st++) {
        const t = ((st / numSteps) + ((s.distance * 0.02) % (1 / numSteps))) % 1;
        const sy = horizonY + (h - horizonY) * (t * t);
        const curPathW = pathTopWidth + (pathBottomWidth - pathTopWidth) * t;

        ctx.strokeStyle = 'rgba(20, 83, 45, 0.45)';
        ctx.lineWidth = 2 + t * 4;
        ctx.beginPath();
        ctx.moveTo(centerX - curPathW / 2, sy);
        ctx.lineTo(centerX + curPathW / 2, sy);
        ctx.stroke();
      }

      // Lane Guide Markings (Ancient Carved Runes)
      const leftGuideTop = centerX - pathTopWidth / 6;
      const leftGuideBottom = centerX - pathBottomWidth / 6;
      const rightGuideTop = centerX + pathTopWidth / 6;
      const rightGuideBottom = centerX + pathBottomWidth / 6;

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(leftGuideTop, horizonY);
      ctx.lineTo(leftGuideBottom, h);
      ctx.moveTo(rightGuideTop, horizonY);
      ctx.lineTo(rightGuideBottom, h);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 7.6 Side Scenery (Totems, Tropical Trees, Giant Monsteras)
      s.scenery.forEach(sc => {
        if (sc.z < 0 || sc.z > 2200) return;
        const scale = Math.max(0.12, (2200 - sc.z) / 2200);
        const depthCurve = scale * scale;
        const screenY = horizonY + (h - horizonY) * depthCurve;
        const curPathW = pathTopWidth + (pathBottomWidth - pathTopWidth) * scale;
        const screenX = centerX + sc.side * (curPathW / 2 + 50 * scale);

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(scale * sc.heightVariation, scale * sc.heightVariation);

        if (sc.type === 'tree') {
          // Jungle Palm / Broadleaf Canopy
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-8, -90, 16, 90);
          // Foliage
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(0, -90, 38, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.arc(-14, -100, 26, 0, Math.PI * 2);
          ctx.arc(14, -100, 26, 0, Math.PI * 2);
          ctx.fill();
        } else if (sc.type === 'totem') {
          // Ancient Mossy Aztec Totem
          ctx.fillStyle = '#334155';
          ctx.fillRect(-14, -70, 28, 70);
          // Carved Face Eyes
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-8, -55, 5, 5);
          ctx.fillRect(3, -55, 5, 5);
          // Moss
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(-14, -70, 28, 8);
        } else if (sc.type === 'fern') {
          // Giant Monstera Leaves
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(-15, -20, 22, 10, -0.4, 0, Math.PI * 2);
          ctx.ellipse(15, -20, 22, 10, 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (sc.type === 'flower') {
          // Tropical Orchid
          ctx.fillStyle = '#15803d';
          ctx.fillRect(-2, -30, 4, 30);
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(0, -32, 10, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Jungle Mossy Boulder
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(0, -15, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#15803d';
          ctx.fillRect(-12, -26, 24, 8);
        }

        ctx.restore();
      });

      // 7.7 Depth-Sorted Render Queue for Obstacles & Collectibles
      type Renderable =
        | { kind: 'obstacle'; data: Obstacle }
        | { kind: 'item'; data: Collectible };

      const renderQueue: Renderable[] = [
        ...s.obstacles.map(o => ({ kind: 'obstacle' as const, data: o })),
        ...s.items.filter(i => !i.collected).map(i => ({ kind: 'item' as const, data: i }))
      ];

      renderQueue.sort((a, b) => b.data.z - a.data.z);

      renderQueue.forEach(item => {
        if (item.data.z < 0 || item.data.z > 2200) return;
        const scale = Math.max(0.12, (2200 - item.data.z) / 2200);
        const depthFactor = scale * scale;
        const screenY = horizonY + (h - horizonY) * depthFactor;
        const curPathW = pathTopWidth + (pathBottomWidth - pathTopWidth) * scale;
        const laneOffsets = [-curPathW * 0.28, 0, curPathW * 0.28];
        const screenX = centerX + laneOffsets[item.data.lane];

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(scale, scale);

        if (item.kind === 'obstacle') {
          const ob = item.data;
          if (ob.type === 'log') {
            // Spiked Mossy Fallen Log (Jump Over)
            ctx.fillStyle = '#451a03';
            ctx.fillRect(-45, -24, 90, 24);
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(0, -24, 45, Math.PI, 0);
            ctx.fill();
            // Moss on top
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-40, -26, 80, 5);
            // Wooden spikes
            ctx.fillStyle = '#cbd5e1';
            for (let sp = -30; sp <= 30; sp += 20) {
              ctx.beginPath();
              ctx.moveTo(sp - 4, -24);
              ctx.lineTo(sp, -42);
              ctx.lineTo(sp + 4, -24);
              ctx.fill();
            }
          } else if (ob.type === 'vines') {
            // Hanging Vine Archway Curtain (Slide Under)
            ctx.fillStyle = '#14532d';
            // Left & Right Vine Pillars
            ctx.fillRect(-42, -90, 10, 90);
            ctx.fillRect(32, -90, 10, 90);
            // Top crossbar
            ctx.fillRect(-46, -92, 92, 22);
            // Hanging jungle lianas / vines
            ctx.fillStyle = '#22c55e';
            for (let vn = -34; vn <= 34; vn += 12) {
              ctx.fillRect(vn, -70, 4, 36);
            }
          } else if (ob.type === 'boulder') {
            // Giant Aztec Carved Boulder (Avoid Lane)
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, -36, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Carved Eyes & Mouth
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-14, -46, 8, 6);
            ctx.fillRect(6, -46, 8, 6);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-10, -25, 20, 8);
          } else if (ob.type === 'roots') {
            // Gnarled Tree Roots (Jump or Slide)
            ctx.fillStyle = '#573d26';
            ctx.beginPath();
            ctx.moveTo(-40, 0);
            ctx.quadraticCurveTo(-20, -32, 0, -10);
            ctx.quadraticCurveTo(20, -32, 40, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(-25, -18, 12, 4);
          } else {
            // Mud Pit / Quagmire (Jump Over)
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.ellipse(0, -4, 42, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else {
          // Collectibles (Coin or Golden Idol)
          const it = item.data;
          if (it.type === 'idol') {
            // Glowing Ancient Golden Idol
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(0, -36, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Idol Base
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(-12, -22, 24, 20);
            // Ruby gem in center
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, -36, 5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Spinning Golden Coin
            const coinWidth = Math.abs(Math.cos(it.rotation)) * 14 + 3;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(0, -28, coinWidth, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        ctx.restore();
      });

      // 7.8 Render Explorer Player Character (Bottom Center Forefront)
      const playerRenderY = h - 60 + p.yOffset;
      const playerRenderX = centerX + p.currentX;

      ctx.save();
      ctx.translate(playerRenderX, playerRenderY);

      // Character Shadow on Ground
      const shadowScale = p.isJumping ? Math.max(0.4, 1 + p.yOffset * 0.008) : 1.0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 24 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (p.isSliding) {
        // SLIDING POSE (Ducking low under vines)
        // Sliding Body
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(-28, -12, 56, 18, 5);
        ctx.fill();

        // Explorer Hat pushed back
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-32, -18, 26, 6);
        ctx.fillRect(-28, -24, 18, 8);

        // Safari Shorts & Boots kicking forward
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(16, -6, 16, 10);
      } else if (p.isJumping) {
        // LEAPING POSE (High leap over obstacle)
        // Arms up / Holding hat
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(-16, -46, 32, 34, 6);
        ctx.fill();

        // Explorer Fedora Hat
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-22, -58, 44, 7);
        ctx.fillRect(-14, -70, 28, 14);

        // Legs bent up
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-14, -12, 10, 14);
        ctx.fillRect(4, -12, 10, 14);
      } else {
        // RUNNING ANIMATION (Smooth running stride)
        const legSwing = Math.sin(p.runFrame) * 10;
        const armSwing = Math.cos(p.runFrame) * 8;
        const bodyBob = Math.abs(Math.sin(p.runFrame * 2)) * 3;

        // Legs & Boots
        ctx.fillStyle = '#1e293b';
        // Left Leg
        ctx.fillRect(-12, -12 + legSwing, 9, 16);
        // Right Leg
        ctx.fillRect(3, -12 - legSwing, 9, 16);

        // Body / Safari Jacket
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(-16, -44 - bodyBob, 32, 34, 6);
        ctx.fill();

        // Explorer Backpack / Satchel
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-18, -40 - bodyBob, 6, 20);

        // Arms pumping
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-22, -38 - bodyBob + armSwing, 7, 18);
        ctx.fillRect(15, -38 - bodyBob - armSwing, 7, 18);

        // Explorer Fedora Hat
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-22, -54 - bodyBob, 44, 7);
        ctx.fillRect(-14, -66 - bodyBob, 28, 14);
        // Hat Band
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-14, -56 - bodyBob, 28, 3);
      }

      ctx.restore();

      // 7.9 Render Ambient Creatures (Flying Birds & Butterflies)
      s.creatures.forEach(cr => {
        ctx.save();
        ctx.translate(cr.x, cr.y);
        ctx.scale(cr.scale, cr.scale);
        ctx.fillStyle = cr.color;

        if (cr.type === 'bird') {
          // Flapping Tropical Bird / Macaw
          const wingY = Math.sin(cr.wing) * 6;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-8, -6 + wingY);
          ctx.lineTo(10, 0);
          ctx.lineTo(-8, 6 - wingY);
          ctx.closePath();
          ctx.fill();
        } else {
          // Fluttering Butterfly
          const wingW = Math.abs(Math.sin(cr.wing)) * 6 + 2;
          ctx.beginPath();
          ctx.ellipse(-wingW, 0, wingW, 4, 0.3, 0, Math.PI * 2);
          ctx.ellipse(wingW, 0, wingW, 4, -0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 7.10 Render Ambient Particles (Leaves, Sparkles, Dust)
      s.particles.forEach(pt => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        if (pt.type === 'leaf') {
          ctx.ellipse(pt.x, pt.y, pt.size * 1.8, pt.size, 0.5, 0, Math.PI * 2);
        } else {
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      });

      // 7.11 Lush Canopy Vignette Borders
      const canopyGradLeft = ctx.createLinearGradient(0, 0, 70, 0);
      canopyGradLeft.addColorStop(0, 'rgba(2, 44, 34, 0.85)');
      canopyGradLeft.addColorStop(1, 'rgba(2, 44, 34, 0)');
      ctx.fillStyle = canopyGradLeft;
      ctx.fillRect(0, 0, 70, h);

      const canopyGradRight = ctx.createLinearGradient(w, 0, w - 70, 0);
      canopyGradRight.addColorStop(0, 'rgba(2, 44, 34, 0.85)');
      canopyGradRight.addColorStop(1, 'rgba(2, 44, 34, 0)');
      ctx.fillStyle = canopyGradRight;
      ctx.fillRect(w - 70, 0, 70, h);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, triggerGameOver]);

  // Responsive Canvas Sizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && rect.width && rect.height) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleAudio = () => {
    const muted = sound.toggleMute();
    setSoundMuted(muted);
  };

  return (
    <div className="relative w-full h-full bg-[#021c15] flex items-center justify-center overflow-hidden select-none outline-none font-sans">
      {/* 1. Fullscreen Responsive Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
      />

      {/* 2. IN-GAME JUNGLE HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between z-20">
          {/* Top HUD Bar */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left: Distance & Score */}
            <div className="flex flex-col gap-2">
              {/* Distance Pill */}
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-[#059669]/40 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg shadow-black/40">
                <Footprints className="w-5 h-5 text-[#34d399]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#a7f3d0] uppercase font-bold tracking-wider">DISTANCE</span>
                  <span className="text-xl font-mono font-black text-white">{distance}m</span>
                </div>
              </div>

              {/* Score Display */}
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-[#059669]/40 rounded-xl px-3.5 py-1.5 flex items-center gap-2 shadow-lg">
                <span className="text-[10px] text-[#a7f3d0] uppercase font-bold tracking-wider">SCORE:</span>
                <span className="text-sm font-mono font-bold text-[#facc15]">{score.toLocaleString()}</span>
              </div>
            </div>

            {/* Top-Center: Idols & Coins & Hearts */}
            <div className="flex items-center gap-3">
              {/* Health Hearts */}
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-rose-500/50 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-5 h-5 transition-all duration-200 ${
                      i < hearts ? 'text-rose-500 fill-rose-500 scale-100' : 'text-slate-600 fill-slate-800 scale-90 opacity-40'
                    }`}
                  />
                ))}
              </div>

              {/* Golden Idols Counter */}
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-[#f59e0b]/50 rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-lg">
                <Compass className="w-4 h-4 text-[#f59e0b]" />
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-[#fde68a] uppercase font-bold">IDOLS:</span>
                  <span className="text-lg font-mono font-black text-[#facc15]">{idols}</span>
                </div>
              </div>

              {/* Gold Coins Counter */}
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-[#f59e0b]/50 rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-lg">
                <Sparkles className="w-4 h-4 text-[#facc15]" />
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-[#fde68a] uppercase font-bold">COINS:</span>
                  <span className="text-lg font-mono font-black text-[#fef08a]">{coins}</span>
                </div>
              </div>
            </div>

            {/* Top-Right: Best Record, Pause & Sound */}
            <div className="flex flex-col items-end gap-2">
              {/* High Score / Record */}
              <div className="bg-[#022c22]/90 backdrop-blur-md border border-[#059669]/40 rounded-xl px-4 py-1.5 flex items-center gap-2 shadow-lg shadow-black/40">
                <Trophy className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-xs font-mono font-bold text-[#fde68a]">BEST: {highScore}m</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={toggleAudio}
                  title="Toggle Sound"
                  className="p-2 rounded-xl bg-[#022c22]/90 hover:bg-[#064e3b] border border-[#059669]/40 text-[#a7f3d0] hover:text-white transition-colors cursor-pointer"
                >
                  {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#34d399]" />}
                </button>
                <button
                  onClick={handleTogglePause}
                  title="Pause (Esc / P)"
                  className="p-2 rounded-xl bg-[#022c22]/90 hover:bg-[#064e3b] border border-[#059669]/40 text-[#a7f3d0] hover:text-white transition-colors cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom HUD: Subtle Controls Reminder */}
          <div className="flex justify-center pb-2 opacity-80 hover:opacity-100 transition-opacity">
            <div className="bg-[#022c22]/85 backdrop-blur-md border border-[#059669]/30 rounded-full px-4 py-1 flex items-center gap-4 text-[11px] text-[#a7f3d0] font-mono">
              <span><kbd className="px-1 bg-white/10 rounded">A</kbd>/<kbd className="px-1 bg-white/10 rounded">D</kbd> Lanes</span>
              <span>•</span>
              <span><kbd className="px-1 bg-white/10 rounded">W</kbd>/<kbd className="px-1 bg-white/10 rounded">Space</kbd> Jump</span>
              <span>•</span>
              <span><kbd className="px-1 bg-white/10 rounded">S</kbd> Slide</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. START EXPEDITION OVERLAY */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#022c22]/95 border border-[#059669]/60 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-emerald-950/80 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center mb-4 text-[#34d399]">
              <Compass className="w-8 h-8" />
            </div>

            <h1 className="text-3xl font-black text-white tracking-wider font-display uppercase">
              JUNGLE RUN
            </h1>
            <p className="text-[#a7f3d0] text-xs font-mono mt-1">
              Ancient Temple Ruins Expedition
            </p>

            <div className="my-6 p-4 rounded-2xl bg-black/40 border border-white/10 w-full space-y-2.5 text-xs text-slate-300 font-mono text-left">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-0.5 bg-white/10 rounded font-bold">←</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded font-bold">→</span>
                </div>
                <span>Change 3 Running Lanes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-0.5 bg-white/10 rounded font-bold">↑</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded font-bold">SPACE</span>
                </div>
                <span>Jump over Logs, Spikes & Mud</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-2 py-0.5 bg-white/10 rounded font-bold">↓</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded font-bold">S</span>
                </div>
                <span>Slide under Vines & Archways</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={initGame}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer transition-transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START EXPEDITION</span>
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  <span>BACK</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. PAUSE OVERLAY */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#022c22]/95 border border-[#059669]/60 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-emerald-950/80 flex flex-col items-center">
            <h2 className="text-2xl font-black text-white tracking-wider font-display uppercase mb-6">
              GAME PAUSED
            </h2>

            <div className="space-y-3 w-full">
              <button
                onClick={handleTogglePause}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME</span>
              </button>
              <button
                onClick={initGame}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESTART</span>
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  <span>EXIT EXPEDITION</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. GAMEOVER OVERLAY */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#022c22]/95 border border-[#ef4444]/60 rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-red-950/80 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mb-3 text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <span className="text-red-400 font-mono font-bold text-xs tracking-widest uppercase">
              EXPEDITION OVER
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 mb-4 font-display">
              TRIP IN JUNGLE
            </h2>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 w-full space-y-2 font-mono text-xs mb-6">
              <div className="flex justify-between items-center text-slate-400">
                <span>DISTANCE</span>
                <span className="text-emerald-400 font-bold text-sm">{distance}m</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>COINS COLLECTED</span>
                <span className="text-yellow-300 font-bold">{coins}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>IDOLS FOUND</span>
                <span className="text-amber-400 font-bold">{idols}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>FINAL SCORE</span>
                <span className="text-amber-300 font-black text-sm">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-white/10">
                <span>BEST RECORD</span>
                <span className="text-amber-400 font-bold">{highScore}m</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={initGame}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer transition-transform active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RUN AGAIN</span>
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  <span>EXIT</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
