import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Swords, Trophy, Zap, Shield, Volume2, VolumeX, Pause, ArrowLeft, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: 'drone' | 'assassin' | 'enforcer';
  alive: boolean;
  attackTimer: number;
  walkFrame: number;
  facing: -1 | 1;
}

interface SlashEffect {
  x: number;
  y: number;
  radius: number;
  angle: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'energy' | 'blood' | 'rain';
}

interface FlyingVehicle {
  x: number;
  y: number;
  speed: number;
  len: number;
  color: string;
}

export const CyberSamuraiGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_cyber-samurai') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stateRef = useRef({
    samurai: {
      x: 180,
      y: 420,
      hp: 100,
      energy: 100,
      isSlashing: false,
      slashTimer: 0,
      isParrying: false,
      parryTimer: 0,
      facing: 1 as -1 | 1,
      dashTimer: 0,
      walkFrame: 0
    },
    enemies: [] as Enemy[],
    slashes: [] as SlashEffect[],
    particles: [] as Particle[],
    flyingVehicles: [] as FlyingVehicle[],
    neonRain: [] as { x: number; y: number; speed: number; len: number }[],
    score: 0,
    combo: 0,
    comboTimer: 0,
    spawnTimer: 0,
    enemyIdCounter: 1,
    screenShake: 0,
    time: 0,
    keys: { left: false, right: false, up: false, attack: false, parry: false }
  });

  const initVehicles = () => [
    { x: -50, y: 120, speed: 3.5, len: 45, color: '#00f0ff' },
    { x: 300, y: 160, speed: -2.8, len: 40, color: '#ff007f' },
    { x: 700, y: 90, speed: 4.2, len: 55, color: '#fde047' },
  ];

  const slash = useCallback(() => {
    const s = stateRef.current;
    if (s.samurai.slashTimer > 0) return;

    sound.playLaser(1400);
    s.samurai.isSlashing = true;
    s.samurai.slashTimer = 14;
    s.screenShake = 3;

    // Glowing Slash Ribbon
    const sX = s.samurai.x + s.samurai.facing * 45;
    const sY = s.samurai.y - 25;
    s.slashes.push({
      x: sX,
      y: sY,
      radius: 65,
      angle: s.samurai.facing === 1 ? -Math.PI / 4 : (Math.PI * 5) / 4,
      color: '#00f0ff',
      life: 12,
      maxLife: 12
    });

    let sliced = 0;
    s.enemies.forEach(enemy => {
      if (enemy.alive && Math.abs(enemy.x - sX) < 85 && Math.abs(enemy.y - sY) < 60) {
        enemy.hp -= 50;
        sound.playHit();
        sliced++;

        // Spark explosion
        for (let i = 0; i < 14; i++) {
          s.particles.push({
            x: enemy.x,
            y: enemy.y - 20,
            vx: (Math.random() - 0.5) * 8 + s.samurai.facing * 3,
            vy: (Math.random() - 0.5) * 8,
            color: Math.random() < 0.6 ? '#00f0ff' : '#ff007f',
            size: 2.5 + Math.random() * 2,
            alpha: 1,
            life: 20,
            maxLife: 20,
            type: 'spark'
          });
        }

        if (enemy.hp <= 0) {
          enemy.alive = false;
          const enemyScore = enemy.type === 'enforcer' ? 250 : enemy.type === 'drone' ? 120 : 180;
          s.score += enemyScore * (1 + s.combo * 0.15);
          s.combo++;
          s.comboTimer = 140;
          setScore(Math.floor(s.score));
          setCombo(s.combo);

          // Energy refill
          s.samurai.energy = Math.min(100, s.samurai.energy + 15);
          setEnergy(Math.floor(s.samurai.energy));
        }
      }
    });

    if (sliced > 0) {
      s.screenShake = 6;
    }
  }, []);

  const parry = useCallback(() => {
    const s = stateRef.current;
    if (s.samurai.parryTimer > 0 || s.samurai.energy < 20) return;

    sound.playPowerUp();
    s.samurai.energy -= 20;
    setEnergy(Math.floor(s.samurai.energy));
    s.samurai.isParrying = true;
    s.samurai.parryTimer = 22;

    // Energy Shield Pulse
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      s.particles.push({
        x: s.samurai.x,
        y: s.samurai.y - 25,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        color: '#ff007f',
        size: 3,
        alpha: 1,
        life: 18,
        maxLife: 18,
        type: 'energy'
      });
    }

    // Push away nearby enemies
    s.enemies.forEach(enemy => {
      if (enemy.alive && Math.abs(enemy.x - s.samurai.x) < 110) {
        enemy.x += (enemy.x > s.samurai.x ? 1 : -1) * 80;
        enemy.hp -= 25;
      }
    });
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const rain = [];
    for (let i = 0; i < 70; i++) {
      rain.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 12 + Math.random() * 8,
        len: 15 + Math.random() * 10
      });
    }

    stateRef.current = {
      samurai: {
        x: 180,
        y: 420,
        hp: 100,
        energy: 100,
        isSlashing: false,
        slashTimer: 0,
        isParrying: false,
        parryTimer: 0,
        facing: 1,
        dashTimer: 0,
        walkFrame: 0
      },
      enemies: [],
      slashes: [],
      particles: [],
      flyingVehicles: initVehicles(),
      neonRain: rain,
      score: 0,
      combo: 0,
      comboTimer: 0,
      spawnTimer: 0,
      enemyIdCounter: 1,
      screenShake: 0,
      time: 0,
      keys: { left: false, right: false, up: false, attack: false, parry: false }
    };
    setScore(0);
    setCombo(0);
    setHealth(100);
    setEnergy(100);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_cyber-samurai', finalScore.toString());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        s.keys.left = true;
        s.samurai.facing = -1;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        s.keys.right = true;
        s.samurai.facing = 1;
      }
      if (['Space', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        slash();
      }
      if (['KeyK', 'ShiftLeft'].includes(e.code)) {
        e.preventDefault();
        parry();
      }
      if (['KeyP', 'Escape'].includes(e.code)) {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [slash, parry]);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      s.time += 0.016;

      // 1. UPDATE SAMURAI
      if (s.keys.left) {
        s.samurai.x = Math.max(60, s.samurai.x - 4.5);
        s.samurai.walkFrame += 0.25;
      } else if (s.keys.right) {
        s.samurai.x = Math.min(w - 60, s.samurai.x + 4.5);
        s.samurai.walkFrame += 0.25;
      }

      if (s.samurai.slashTimer > 0) s.samurai.slashTimer--;
      else s.samurai.isSlashing = false;

      if (s.samurai.parryTimer > 0) s.samurai.parryTimer--;
      else s.samurai.isParrying = false;

      // Passive Energy regeneration (faster for beginner satisfaction)
      s.samurai.energy = Math.min(100, s.samurai.energy + 0.35);
      setEnergy(Math.floor(s.samurai.energy));

      // Combo Decay
      if (s.comboTimer > 0) {
        s.comboTimer--;
        if (s.comboTimer <= 0) {
          s.combo = 0;
          setCombo(0);
        }
      }

      // 2. SPAWN ENEMIES (Smooth gradual curve)
      s.spawnTimer++;
      const spawnInterval = Math.max(65, 160 - Math.floor(s.score / 200) * 12);
      if (s.spawnTimer > spawnInterval) {
        s.spawnTimer = 0;
        const side = Math.random() < 0.5 ? -40 : w + 40;
        const rand = Math.random();
        
        let eType: 'drone' | 'assassin' | 'enforcer' = 'drone';
        if (s.score > 800 && rand < 0.2) {
          eType = 'enforcer';
        } else if (s.score > 300 && rand < 0.5) {
          eType = 'assassin';
        } else {
          eType = 'drone';
        }

        s.enemies.push({
          id: `e_${s.enemyIdCounter++}`,
          x: side,
          y: eType === 'drone' ? 320 + Math.sin(s.time * 3) * 20 : 420,
          speed: eType === 'assassin' ? (s.score > 600 ? 3.2 : 2.4) : eType === 'drone' ? 1.8 : 1.4,
          hp: eType === 'enforcer' ? 80 : eType === 'drone' ? 30 : 40,
          maxHp: eType === 'enforcer' ? 80 : eType === 'drone' ? 30 : 40,
          type: eType,
          alive: true,
          attackTimer: 0,
          walkFrame: 0,
          facing: side < w / 2 ? 1 : -1
        });
      }

      // 3. UPDATE ENEMIES
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (!e.alive) {
          s.enemies.splice(i, 1);
          continue;
        }

        const dx = s.samurai.x - e.x;
        e.facing = dx > 0 ? 1 : -1;
        e.x += e.facing * e.speed;
        e.walkFrame += 0.2;

        if (e.type === 'drone') {
          e.y = 320 + Math.sin(s.time * 4 + e.x * 0.05) * 25;
        }

        // Attack samurai
        if (Math.abs(dx) < 35 && Math.abs(s.samurai.y - e.y) < 50) {
          e.attackTimer++;
          if (e.attackTimer > 35) {
            e.attackTimer = 0;

            if (s.samurai.isParrying) {
              sound.playPowerUp();
              e.x -= e.facing * 70;
              e.hp -= 30;
              s.screenShake = 4;
            } else {
              const dmg = e.type === 'enforcer' ? 25 : e.type === 'drone' ? 12 : 18;
              s.samurai.hp = Math.max(0, s.samurai.hp - dmg);
              setHealth(Math.floor(s.samurai.hp));
              sound.playHit();
              s.screenShake = 7;

              if (s.samurai.hp <= 0) {
                handleGameOver(s.score);
                return;
              }
            }
          }
        }
      }

      // 4. FLYING VEHICLES IN BACKGROUND
      s.flyingVehicles.forEach(v => {
        v.x += v.speed;
        if (v.speed > 0 && v.x > w + 80) v.x = -80;
        if (v.speed < 0 && v.x < -80) v.x = w + 80;
      });

      // 5. UPDATE PARTICLES & SLASHES
      for (let i = s.slashes.length - 1; i >= 0; i--) {
        const sl = s.slashes[i];
        sl.life--;
        if (sl.life <= 0) s.slashes.splice(i, 1);
      }

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // AAA NEO TOKYO CINEMATIC RENDER PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.4);
      }

      // 1. Cyber Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#05030a');
      skyGrad.addColorStop(0.5, '#120b24');
      skyGrad.addColorStop(1, '#1f0d3d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Parallax Distant Skyscrapers & Holograms
      for (let bx = 0; bx < w + 80; bx += 70) {
        const bHeight = 220 + Math.sin(bx * 0.8) * 80;
        ctx.fillStyle = '#090614';
        ctx.fillRect(bx, 420 - bHeight, 60, bHeight);

        // Neon Sign / Hologram Kanji
        if (bx % 140 === 0) {
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.font = 'bold 12px monospace';
          ctx.fillText('ネオ東京', bx + 10, 420 - bHeight + 35);
          ctx.shadowBlur = 0;
        } else if (bx % 210 === 0) {
          ctx.fillStyle = '#ff007f';
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = 10;
          ctx.font = 'bold 12px monospace';
          ctx.fillText('サイバー', bx + 10, 420 - bHeight + 35);
          ctx.shadowBlur = 0;
        }
      }

      // 3. Flying Hover Vehicles crossing the skyline
      s.flyingVehicles.forEach(v => {
        ctx.fillStyle = v.color;
        ctx.shadowColor = v.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(v.x, v.y, v.len, 6);
        // Headlight trail
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(v.speed > 0 ? v.x + v.len - 4 : v.x, v.y, 4, 6);
        ctx.shadowBlur = 0;
      });

      // 4. Rooftop Combat Platform (Wet Cyber Deck)
      const floorGrad = ctx.createLinearGradient(0, 420, 0, h);
      floorGrad.addColorStop(0, '#101424');
      floorGrad.addColorStop(1, '#080a12');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 420, w, h - 420);

      // Platform Neon Perimeter Edge
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, 420);
      ctx.lineTo(w, 420);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Wet reflections
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      for (let rx = 0; rx < w; rx += 50) {
        ctx.fillRect(rx, 422, 35, 120);
      }

      // 5. Neon Rain
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1.2;
      s.neonRain.forEach(r => {
        r.y += r.speed;
        if (r.y > h) {
          r.y = -20;
          r.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.len);
        ctx.stroke();
      });

      // 6. Enemies
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(e.facing, 1);

        if (e.type === 'drone') {
          // Cyber Combat Drone
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(8, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Drone laser targeting line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(80, 0);
          ctx.stroke();
        } else if (e.type === 'enforcer') {
          // Heavy Cyber Enforcer (Plasma Shield & Hammer)
          const lOff = Math.sin(e.walkFrame) * 6;
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(-12, -40 + lOff, 10, 40);
          ctx.fillRect(2, -40 - lOff, 10, 40);

          // Torso
          ctx.fillStyle = '#312e81';
          ctx.fillRect(-14, -65, 28, 30);

          // Energy Shield
          ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 12;
          ctx.fillRect(16, -70, 8, 45);
          ctx.shadowBlur = 0;
        } else {
          // Cyber Ninja Assassin
          const lOff = Math.sin(e.walkFrame) * 8;
          ctx.fillStyle = '#09090b';
          ctx.fillRect(-8, -35 + lOff, 7, 35);
          ctx.fillRect(1, -35 - lOff, 7, 35);

          // Torso & Visor
          ctx.fillStyle = '#18181b';
          ctx.fillRect(-10, -55, 20, 24);

          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.fillRect(4, -50, 6, 3);
          ctx.shadowBlur = 0;

          // Cyber Katana
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(10, -45, 22, 2.5);
        }

        // Enemy HP bar
        if (e.hp < e.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-15, -75, 30, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-15, -75, 30 * (e.hp / e.maxHp), 4);
        }

        ctx.restore();
      });

      // 7. Cyber Samurai Player Character
      const sam = s.samurai;
      ctx.save();
      ctx.translate(sam.x, sam.y);
      ctx.scale(sam.facing, 1);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Armor Legs
      const legOffset = Math.sin(sam.walkFrame) * 8;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -36 + legOffset, 8, 36);
      ctx.fillRect(2, -36 - legOffset, 8, 36);

      // Exoskeleton Torso & Chestplate
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-12, -62, 24, 30, 4);
      ctx.fill();

      // Cyber Core Reactor (Pulsing Cyan Core)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -48, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Samurai Helmet & Cyan Visor
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -68, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(2, -70, 7, 3);
      ctx.shadowBlur = 0;

      // Dual Katana Blade (High tech glowing plasma)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      if (sam.isSlashing) {
        ctx.fillRect(12, -75, 45, 4);
      } else {
        ctx.fillRect(8, -55, 30, 3);
      }
      ctx.shadowBlur = 0;

      // Parry Energy Dome
      if (sam.isParrying) {
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, -40, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // 8. Slashes & Particles
      s.slashes.forEach(sl => {
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.strokeStyle = sl.color;
        ctx.shadowColor = sl.color;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, sl.radius, sl.angle - Math.PI / 3, sl.angle + Math.PI / 3);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] text-white select-none overflow-hidden font-sans">
      {/* TACTICAL CYBERPUNK HUD */}
      <div className="w-full max-w-4xl px-4 py-3 flex items-center justify-between z-20 border-b border-[#1e293b] bg-[#0c101c]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onBack ? onBack() : setGameState('START')}
            className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-display font-black text-sm text-white tracking-wider">CYBER SAMURAI</span>
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono text-[10px] font-bold">
                SECTOR 9
              </span>
            </div>
          </div>
        </div>

        {/* METERS */}
        <div className="flex items-center gap-6">
          {/* Health */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-red-400">HP</span>
            <div className="w-24 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                style={{ width: `${Math.max(0, health)}%` }}
              />
            </div>
          </div>

          {/* Energy */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00f0ff] fill-current" />
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-[#00f0ff] transition-all duration-100"
                style={{ width: `${Math.max(0, energy)}%` }}
              />
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-black text-sm text-amber-300">{score.toLocaleString()}</span>
          </div>

          {/* Audio & Pause */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev)}
              className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CANVAS STAGE */}
      <div className="relative w-full max-w-4xl aspect-[4/3] max-h-[600px] border border-[#1e293b] bg-black shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={slash}
          onTouchStart={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            if (touch) {
              const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
              stateRef.current.samurai.facing = mx < stateRef.current.samurai.x ? -1 : 1;
              slash();
            }
          }}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* COMBO STREAK POPUP */}
        {gameState === 'PLAYING' && combo > 1 && (
          <div className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/50 backdrop-blur-md flex items-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-display font-black text-sm text-purple-300">{combo}x BLADE COMBO</span>
          </div>
        )}

        {/* START SCREEN */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-950/50">
              <Swords className="w-8 h-8" />
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mb-2">
              CYBER SAMURAI
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 font-mono">
              Unleash lethal plasma katana strikes on corporate cyber assassins across the rain-slicked rooftops of Neo-Tokyo.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-6 text-left">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Movement</span>
                <p className="text-xs font-bold text-white mt-0.5">A / D or Left / Right Arrows</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Plasma Slash</span>
                <p className="text-xs font-bold text-[#00f0ff] mt-0.5">SPACEBAR or J Key</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800 col-span-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Energy Deflect / Parry</span>
                <p className="text-xs font-bold text-purple-400 mt-0.5">K Key or Left SHIFT (Consumes 20 Energy)</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-purple-950/50 transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>DRAW BLADE</span>
            </button>
          </div>
        )}

        {/* PAUSE SCREEN */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-[#080b12]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="font-display font-black text-2xl text-white tracking-wide mb-4">COMBAT PAUSED</h2>
            <div className="flex flex-col gap-3 w-48">
              <button
                onClick={() => setGameState('PLAYING')}
                className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                RESUME DUEL
              </button>
              <button
                onClick={startGame}
                className="py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
              >
                RESTART DUEL
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-14 h-14 rounded-2xl bg-purple-950/50 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="font-display font-black text-3xl text-white tracking-wide">SAMURAI FALLEN</h2>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-6">Combat Protocol Terminated</p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Honor Score</span>
                <p className="text-sm font-black text-amber-300 mt-0.5">{score.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Record Score</span>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{highScore.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>DUEL AGAIN</span>
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-6 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
                >
                  EXIT TO HUB
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
