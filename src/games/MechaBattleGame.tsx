import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Bot, Shield, Zap, Crosshair, Trophy, Volume2, VolumeX, Pause, ArrowLeft, Flame, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  r: number;
  color: string;
  glowColor: string;
  isPlayer: boolean;
  isMissile?: boolean;
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
  type?: 'smoke' | 'spark' | 'explosion' | 'debris';
}

interface EnemyMech {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'drone' | 'scout' | 'siege' | 'titan';
  attackTimer: number;
  walkFrame: number;
  facing: -1 | 1;
}

const FLOOR_Y = 460;

export const MechaBattleGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('START');
  const [wave, setWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerShield, setPlayerShield] = useState(100);
  const [missileAmmo, setMissileAmmo] = useState(6);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_mecha-battle') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stateRef = useRef({
    screenShake: 0,
    player: {
      x: 180,
      y: FLOOR_Y,
      vx: 0,
      vy: 0,
      isGrounded: true,
      facing: 1 as -1 | 1,
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      isShielding: false,
      missiles: 6,
      heat: 0,
      walkFrame: 0,
      gunAngle: 0,
      shootCooldown: 0,
      missileCooldown: 0
    },
    enemies: [] as EnemyMech[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    score: 0,
    waveNum: 1,
    spawnTimer: 0,
    enemyIdCounter: 1,
    time: 0,
    mouse: { x: 400, y: 300 },
    keys: { left: false, right: false, jump: false, shoot: false, missile: false, shield: false }
  });

  const spawnWave = useCallback((wNum: number) => {
    const s = stateRef.current;
    s.enemies = [];
    const count = 4 + wNum * 3;

    for (let i = 0; i < count; i++) {
      const isTitan = wNum >= 3 && i === 0;
      const isSiege = wNum >= 2 && i % 3 === 0;
      const eType = isTitan ? 'titan' : isSiege ? 'siege' : Math.random() < 0.5 ? 'scout' : 'drone';

      s.enemies.push({
        id: `m_${s.enemyIdCounter++}`,
        x: 850 + i * 160,
        y: eType === 'drone' ? 300 : FLOOR_Y,
        hp: eType === 'titan' ? 350 : eType === 'siege' ? 140 : eType === 'scout' ? 70 : 45,
        maxHp: eType === 'titan' ? 350 : eType === 'siege' ? 140 : eType === 'scout' ? 70 : 45,
        type: eType,
        attackTimer: 0,
        walkFrame: 0,
        facing: -1
      });
    }
  }, []);

  const fireMissileBarrage = useCallback(() => {
    const s = stateRef.current;
    if (s.player.missiles <= 0 || s.player.missileCooldown > 0) return;

    sound.playExplosion();
    s.player.missiles--;
    setMissileAmmo(s.player.missiles);
    s.player.missileCooldown = 60;
    s.screenShake = 6;

    // Fire 2 homing rockets from shoulder pods
    for (let i = -1; i <= 1; i += 2) {
      s.projectiles.push({
        x: s.player.x + i * 14,
        y: s.player.y - 65,
        vx: s.player.facing * 10,
        vy: -5 + (Math.random() - 0.5) * 3,
        damage: 85,
        r: 6,
        color: '#f97316',
        glowColor: '#ea580c',
        isPlayer: true,
        isMissile: true
      });
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      screenShake: 0,
      player: {
        x: 180,
        y: FLOOR_Y,
        vx: 0,
        vy: 0,
        isGrounded: true,
        facing: 1,
        hp: 100,
        maxHp: 100,
        shield: 100,
        maxShield: 100,
        isShielding: false,
        missiles: 6,
        heat: 0,
        walkFrame: 0,
        gunAngle: 0,
        shootCooldown: 0,
        missileCooldown: 0
      },
      enemies: [],
      projectiles: [],
      particles: [],
      score: 0,
      waveNum: 1,
      spawnTimer: 0,
      enemyIdCounter: 1,
      time: 0,
      mouse: { x: 400, y: 300 },
      keys: { left: false, right: false, jump: false, shoot: false, missile: false, shield: false }
    };
    setScore(0);
    setPlayerHp(100);
    setPlayerShield(100);
    setMissileAmmo(6);
    setWave(1);
    setGameState('PLAYING');
    spawnWave(1);
  }, [spawnWave]);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_mecha-battle', finalScore.toString());
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
        s.player.facing = -1;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        s.keys.right = true;
        s.player.facing = 1;
      }
      // SPACE = Jump
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        s.keys.jump = true;
      }
      if (['KeyF', 'KeyJ'].includes(e.code)) s.keys.shoot = true;
      if (['KeyE', 'KeyK'].includes(e.code)) fireMissileBarrage();
      if (['ShiftLeft', 'KeyS', 'ArrowDown'].includes(e.code)) s.keys.shield = true;
      if (['KeyP', 'Escape'].includes(e.code)) {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) s.keys.jump = false;
      if (['KeyF', 'KeyJ'].includes(e.code)) s.keys.shoot = false;
      if (['ShiftLeft', 'KeyS', 'ArrowDown'].includes(e.code)) s.keys.shield = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      stateRef.current.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) stateRef.current.keys.shoot = true;
      if (e.button === 2) {
        e.preventDefault();
        fireMissileBarrage();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) stateRef.current.keys.shoot = false;
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [fireMissileBarrage]);

  // Main Render Loop
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
      const p = s.player;
      s.time += 0.016;

      // 1. UPDATE PLAYER MECH
      if (s.keys.left) {
        p.x = Math.max(60, p.x - 3.8);
        p.walkFrame += 0.2;
      } else if (s.keys.right) {
        p.x = Math.min(w - 60, p.x + 3.8);
        p.walkFrame += 0.2;
      }

      // SPACE = Jump Jets
      if (s.keys.jump && p.isGrounded) {
        p.vy = -14;
        p.isGrounded = false;
        sound.playPowerUp();

        // Thruster sparks & smoke
        for (let i = 0; i < 10; i++) {
          s.particles.push({
            x: p.x + (Math.random() - 0.5) * 20,
            y: p.y - 10,
            vx: (Math.random() - 0.5) * 4,
            vy: 4 + Math.random() * 4,
            color: '#38bdf8',
            size: 3 + Math.random() * 3,
            alpha: 1,
            life: 20,
            maxLife: 20,
            type: 'spark'
          });
        }
      }

      // Gravity
      if (!p.isGrounded) {
        p.vy += 0.65;
        p.y += p.vy;
        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.isGrounded = true;
          s.screenShake = 3; // landing impact
        }
      }

      // Shielding
      p.isShielding = s.keys.shield && p.shield > 5;
      if (p.isShielding) {
        p.shield = Math.max(0, p.shield - 0.35);
      } else {
        p.shield = Math.min(p.maxShield, p.shield + 0.15);
      }
      setPlayerShield(Math.floor(p.shield));

      // Aiming & Vulcan Shooting
      p.gunAngle = Math.atan2(s.mouse.y - (p.y - 45), s.mouse.x - p.x);

      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.missileCooldown > 0) p.missileCooldown--;

      if (s.keys.shoot && p.shootCooldown <= 0 && !p.isShielding) {
        p.shootCooldown = 6;
        sound.playLaser(1500);
        s.screenShake = 1.2;

        const barrelX = p.x + Math.cos(p.gunAngle) * 32;
        const barrelY = p.y - 45 + Math.sin(p.gunAngle) * 32;

        s.projectiles.push({
          x: barrelX,
          y: barrelY,
          vx: Math.cos(p.gunAngle) * 18,
          vy: Math.sin(p.gunAngle) * 18,
          damage: 28,
          r: 3.5,
          color: '#38bdf8',
          glowColor: '#0284c7',
          isPlayer: true
        });

        // Muzzle particle
        s.particles.push({
          x: barrelX,
          y: barrelY,
          vx: Math.cos(p.gunAngle) * 3,
          vy: Math.sin(p.gunAngle) * 3,
          color: '#bae6fd',
          size: 4,
          alpha: 1,
          life: 8,
          maxLife: 8,
          type: 'spark'
        });
      }

      // 2. UPDATE PROJECTILES
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const proj = s.projectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Missile smoke trail
        if (proj.isMissile && Math.random() < 0.7) {
          s.particles.push({
            x: proj.x,
            y: proj.y,
            vx: -proj.vx * 0.2 + (Math.random() - 0.5) * 2,
            vy: -proj.vy * 0.2 + (Math.random() - 0.5) * 2,
            color: '#64748b',
            size: 4 + Math.random() * 4,
            alpha: 0.8,
            life: 25,
            maxLife: 25,
            type: 'smoke'
          });
        }

        // Hit Enemies
        if (proj.isPlayer) {
          for (let j = s.enemies.length - 1; j >= 0; j--) {
            const e = s.enemies[j];
            if (Math.abs(proj.x - e.x) < 30 && Math.abs(proj.y - (e.y - 30)) < 40) {
              e.hp -= proj.damage;
              s.projectiles.splice(i, 1);
              sound.playHit();

              // Spark explosion
              for (let k = 0; k < 6; k++) {
                s.particles.push({
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() - 0.5) * 7,
                  vy: (Math.random() - 0.5) * 7,
                  color: '#facc15',
                  size: 2.5,
                  alpha: 1,
                  life: 18,
                  maxLife: 18,
                  type: 'spark'
                });
              }

              if (e.hp <= 0) {
                s.enemies.splice(j, 1);
                sound.playExplosion();
                s.screenShake = 6;
                const eScore = e.type === 'titan' ? 500 : e.type === 'siege' ? 220 : 100;
                s.score += eScore;
                setScore(s.score);

                // Huge explosion debris
                for (let k = 0; k < 20; k++) {
                  s.particles.push({
                    x: e.x,
                    y: e.y - 30,
                    vx: (Math.random() - 0.5) * 10,
                    vy: -2 - Math.random() * 8,
                    color: Math.random() < 0.5 ? '#f97316' : '#475569',
                    size: 4 + Math.random() * 6,
                    alpha: 1,
                    life: 35,
                    maxLife: 35,
                    type: 'explosion'
                  });
                }
              }
              break;
            }
          }
        } else {
          // Hit Player
          if (Math.abs(proj.x - p.x) < 25 && Math.abs(proj.y - (p.y - 35)) < 40) {
            s.projectiles.splice(i, 1);
            sound.playHit();
            s.screenShake = 5;

            if (p.isShielding) {
              p.shield = Math.max(0, p.shield - proj.damage * 0.5);
              setPlayerShield(Math.floor(p.shield));
            } else {
              p.hp = Math.max(0, p.hp - proj.damage);
              setPlayerHp(Math.floor(p.hp));
              if (p.hp <= 0) {
                handleGameOver(s.score);
                return;
              }
            }
          }
        }

        // Out of bounds
        if (proj.x < 0 || proj.x > w || proj.y < 0 || proj.y > h) {
          s.projectiles.splice(i, 1);
        }
      }

      // 3. UPDATE ENEMIES
      s.enemies.forEach(e => {
        const dx = p.x - e.x;
        e.facing = dx > 0 ? 1 : -1;
        if (Math.abs(dx) > 180) {
          e.x += e.facing * (e.type === 'scout' ? 2.5 : 1.2);
          e.walkFrame += 0.15;
        }

        e.attackTimer++;
        if (e.attackTimer > (e.type === 'titan' ? 60 : 90)) {
          e.attackTimer = 0;
          const eAngle = Math.atan2((p.y - 35) - (e.y - 35), p.x - e.x);
          s.projectiles.push({
            x: e.x,
            y: e.y - 35,
            vx: Math.cos(eAngle) * 7.5,
            vy: Math.sin(eAngle) * 7.5,
            damage: e.type === 'titan' ? 30 : 16,
            r: 4,
            color: '#ef4444',
            glowColor: '#dc2626',
            isPlayer: false
          });
        }
      });

      // Next wave check
      if (s.enemies.length === 0) {
        s.waveNum++;
        setWave(s.waveNum);
        p.missiles = Math.min(6, p.missiles + 3);
        setMissileAmmo(p.missiles);
        spawnWave(s.waveNum);
      }

      // 4. PARTICLES
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        pt.alpha = pt.life / pt.maxLife;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // AAA WARZONE RENDER PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.4);
      }

      // 1. Warzone Sky & Distant Burning City
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#09090b');
      skyGrad.addColorStop(0.5, '#1c1917');
      skyGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant crumbling skyscrapers
      for (let bx = 0; bx < w + 60; bx += 60) {
        const bHeight = 180 + Math.sin(bx * 0.7) * 70;
        ctx.fillStyle = '#18181b';
        ctx.fillRect(bx, FLOOR_Y - bHeight, 50, bHeight);

        // Burning window fires in the distance
        if (bx % 120 === 0) {
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(bx + 10, FLOOR_Y - bHeight + 40, 12, 10);
        }
      }

      // 2. Destructible Warzone Ground Floor
      const groundGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, h);
      groundGrad.addColorStop(0, '#27272a');
      groundGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, FLOOR_Y, w, h - FLOOR_Y);

      // Concrete pavement line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_Y);
      ctx.lineTo(w, FLOOR_Y);
      ctx.stroke();

      // 3. Enemies Rendering (Scouts, Sieges, Colossal Titans)
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(e.facing, 1);

        if (e.type === 'titan') {
          // TITAN MECH
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(-24, -70, 48, 70);
          ctx.fillStyle = '#dc2626';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.fillRect(8, -60, 16, 6);
          ctx.shadowBlur = 0;
        } else if (e.type === 'siege') {
          // HEAVY SIEGE WALKER
          ctx.fillStyle = '#3f3f46';
          ctx.fillRect(-18, -50, 36, 50);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(6, -42, 12, 4);
        } else {
          // SCOUT DRONE
          ctx.fillStyle = '#52525b';
          ctx.fillRect(-12, -35, 24, 35);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(4, -30, 8, 3);
        }

        // Enemy Health Bar
        if (e.hp < e.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(-20, -85, 40, 5);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-20, -85, 40 * (e.hp / e.maxHp), 5);
        }

        ctx.restore();
      });

      // 4. Player Titan Battle Mech (High quality vector rendering)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy Hydraulic Legs
      const legOff = Math.sin(p.walkFrame) * 8;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-14, -40 + legOff, 12, 40);
      ctx.fillRect(2, -40 - legOff, 12, 40);

      // Heavy Armored Torso Chassis
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-20, -70, 40, 36, 6);
      ctx.fill();

      // Cyan Cockpit Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(4, -64, 14, 6);
      ctx.shadowBlur = 0;

      // Shoulder Missile Pods
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-18, -84, 14, 14);
      ctx.fillStyle = '#f97316';
      for (let my = -80; my <= -74; my += 4) {
        ctx.fillRect(-16, my, 4, 3);
        ctx.fillRect(-10, my, 4, 3);
      }

      // Arm Vulcan Cannon
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, -52, 28, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(32, -50, 6, 4);

      // Energy Shield Dome
      if (p.isShielding) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, -40, 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // 5. Projectiles & Lasers
      s.projectiles.forEach(pr => {
        ctx.fillStyle = pr.color;
        ctx.shadowColor = pr.glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, spawnWave]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] text-white select-none overflow-hidden font-sans">
      {/* COCKPIT HUD */}
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
              <Bot className="w-4 h-4 text-[#38bdf8]" />
              <span className="font-display font-black text-sm text-white tracking-wider">MECHA BATTLE</span>
              <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/50 text-[#38bdf8] font-mono text-[10px] font-bold">
                WAVE {wave}
              </span>
            </div>
          </div>
        </div>

        {/* METERS */}
        <div className="flex items-center gap-6">
          {/* Hull HP */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-red-400">HULL</span>
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                style={{ width: `${Math.max(0, playerHp)}%` }}
              />
            </div>
          </div>

          {/* Shield */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00f0ff]" />
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-[#00f0ff] transition-all duration-100"
                style={{ width: `${Math.max(0, playerShield)}%` }}
              />
            </div>
          </div>

          {/* Missiles */}
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-mono font-black text-sm text-orange-300">{missileAmmo} / 6</span>
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
          className="w-full h-full object-contain cursor-crosshair"
        />

        {/* START SCREEN */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/50 border border-blue-500/50 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-950/50">
              <Bot className="w-8 h-8" />
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mb-2">
              MECHA BATTLE
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 font-mono">
              Pilot an armored Titan class battle mech. Annihilate enemy siege machines with rapid vulcan lasers and shoulder-mounted rocket barrages.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-6 text-left">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Movement & Jump</span>
                <p className="text-xs font-bold text-white mt-0.5">A / D (Move) • SPACE (Jump Jets)</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Vulcan Cannon</span>
                <p className="text-xs font-bold text-[#38bdf8] mt-0.5">Mouse Left Click or F Key</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Missile Salvo</span>
                <p className="text-xs font-bold text-orange-400 mt-0.5">Right Click or E Key</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Energy Shield</span>
                <p className="text-xs font-bold text-cyan-400 mt-0.5">Hold SHIFT or S Key</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-blue-950/50 transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>INITIALIZE MECH</span>
            </button>
          </div>
        )}

        {/* PAUSE SCREEN */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-[#080b12]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="font-display font-black text-2xl text-white tracking-wide mb-4">SYSTEM PAUSED</h2>
            <div className="flex flex-col gap-3 w-48">
              <button
                onClick={() => setGameState('PLAYING')}
                className="py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                RESUME COMBAT
              </button>
              <button
                onClick={startGame}
                className="py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
              >
                REBOOT MECH
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-14 h-14 rounded-2xl bg-red-950/50 border border-red-500/50 flex items-center justify-center text-red-400 mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="font-display font-black text-3xl text-white tracking-wide">HULL BREACHED</h2>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-6">Mech Destroyed at Wave {wave}</p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Score</span>
                <p className="text-sm font-black text-amber-300 mt-0.5">{score.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Best Record</span>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{highScore.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>DEPLOY AGAIN</span>
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
