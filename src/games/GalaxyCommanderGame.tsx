import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Rocket, Shield, Zap, Trophy, Volume2, VolumeX, Pause, ArrowLeft, Sparkles, Orbit } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
}

interface NebulaCloud {
  x: number;
  y: number;
  r: number;
  color: string;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  rotSpeed: number;
  hp: number;
  maxHp: number;
  pts: { x: number; y: number }[];
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
  isPhoton?: boolean;
}

interface EnemyShip {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: 'interceptor' | 'cruiser' | 'dreadnought';
  shootCooldown: number;
  rot: number;
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
  type?: 'spark' | 'smoke' | 'plasma' | 'shockwave';
}

export const GalaxyCommanderGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [sector, setSector] = useState(1);
  const [shield, setShield] = useState(100);
  const [hull, setHull] = useState(100);
  const [hyperdrive, setHyperdrive] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_galaxy-commander') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stateRef = useRef({
    screenShake: 0,
    player: {
      x: 400,
      y: 500,
      vx: 0,
      vy: 0,
      rot: 0,
      hp: 100,
      shield: 100,
      hyperdrive: 100,
      isHyper: false,
      shootCooldown: 0,
      photonCooldown: 0
    },
    stars: [] as Star[],
    nebulae: [] as NebulaCloud[],
    asteroids: [] as Asteroid[],
    enemies: [] as EnemyShip[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    score: 0,
    sectorNum: 1,
    spawnTimer: 0,
    enemyIdCounter: 1,
    time: 0,
    keys: { left: false, right: false, up: false, down: false, shoot: false, photon: false, warp: false }
  });

  const initStarsAndNebulae = () => {
    const stars: Star[] = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        z: Math.random() * 3 + 0.5,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.8 + 0.2
      });
    }

    const nebulae: NebulaCloud[] = [
      { x: 200, y: 150, r: 160, color: 'rgba(168, 85, 247, 0.18)' },
      { x: 600, y: 350, r: 200, color: 'rgba(6, 182, 212, 0.16)' },
      { x: 350, y: 450, r: 140, color: 'rgba(236, 72, 153, 0.14)' },
    ];

    return { stars, nebulae };
  };

  const createAsteroid = (x: number, y: number, r: number): Asteroid => {
    const numPts = 8 + Math.floor(Math.random() * 4);
    const pts = [];
    for (let i = 0; i < numPts; i++) {
      const angle = (Math.PI * 2 * i) / numPts;
      const dist = r * (0.8 + Math.random() * 0.4);
      pts.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1.2 + Math.random() * 1.5,
      r,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      hp: Math.floor(r * 2),
      maxHp: Math.floor(r * 2),
      pts
    };
  };

  const firePhotonTorpedo = useCallback(() => {
    const s = stateRef.current;
    if (s.player.photonCooldown > 0) return;

    sound.playExplosion();
    s.player.photonCooldown = 45;
    s.screenShake = 4;

    s.projectiles.push({
      x: s.player.x,
      y: s.player.y - 30,
      vx: 0,
      vy: -14,
      damage: 120,
      r: 8,
      color: '#ec4899',
      glowColor: '#db2777',
      isPlayer: true,
      isPhoton: true
    });
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const { stars, nebulae } = initStarsAndNebulae();

    const asteroids: Asteroid[] = [];
    for (let i = 0; i < 5; i++) {
      asteroids.push(createAsteroid(Math.random() * 800, Math.random() * 200 - 250, 24 + Math.random() * 24));
    }

    stateRef.current = {
      screenShake: 0,
      player: {
        x: 400,
        y: 500,
        vx: 0,
        vy: 0,
        rot: 0,
        hp: 100,
        shield: 100,
        hyperdrive: 100,
        isHyper: false,
        shootCooldown: 0,
        photonCooldown: 0
      },
      stars,
      nebulae,
      asteroids,
      enemies: [],
      projectiles: [],
      particles: [],
      score: 0,
      sectorNum: 1,
      spawnTimer: 0,
      enemyIdCounter: 1,
      time: 0,
      keys: { left: false, right: false, up: false, down: false, shoot: false, photon: false, warp: false }
    };
    setScore(0);
    setSector(1);
    setShield(100);
    setHull(100);
    setHyperdrive(100);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_galaxy-commander', finalScore.toString());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = true;
      if (['KeyW', 'ArrowUp'].includes(e.code)) s.keys.up = true;
      if (['KeyS', 'ArrowDown'].includes(e.code)) s.keys.down = true;
      if (['Space', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        s.keys.shoot = true;
      }
      if (['KeyE', 'KeyK'].includes(e.code)) {
        e.preventDefault();
        firePhotonTorpedo();
      }
      if (['ShiftLeft'].includes(e.code)) {
        e.preventDefault();
        s.keys.warp = true;
      }
      if (['KeyP', 'Escape'].includes(e.code)) {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
      if (['KeyW', 'ArrowUp'].includes(e.code)) s.keys.up = false;
      if (['KeyS', 'ArrowDown'].includes(e.code)) s.keys.down = false;
      if (['Space', 'KeyJ'].includes(e.code)) s.keys.shoot = false;
      if (['ShiftLeft'].includes(e.code)) s.keys.warp = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [firePhotonTorpedo]);

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

      // 1. UPDATE STARS & WARP SPEED
      const starSpeedMult = p.isHyper ? 8.0 : 1.0;
      s.stars.forEach(st => {
        st.y += st.z * 1.5 * starSpeedMult;
        if (st.y > h) {
          st.y = -10;
          st.x = Math.random() * w;
        }
      });

      // 2. UPDATE PLAYER SHIP
      let moveX = 0;
      let moveY = 0;
      if (s.keys.left) moveX -= 1;
      if (s.keys.right) moveX += 1;
      if (s.keys.up) moveY -= 1;
      if (s.keys.down) moveY += 1;

      // Hyperdrive
      p.isHyper = s.keys.warp && p.hyperdrive > 10;
      if (p.isHyper) {
        p.hyperdrive = Math.max(0, p.hyperdrive - 0.6);
        s.screenShake = 1.5;
      } else {
        p.hyperdrive = Math.min(100, p.hyperdrive + 0.15);
      }
      setHyperdrive(Math.floor(p.hyperdrive));

      const speed = p.isHyper ? 9.5 : 5.8;
      p.vx = moveX * speed;
      p.vy = moveY * speed;
      p.x = Math.max(40, Math.min(w - 40, p.x + p.vx));
      p.y = Math.max(60, Math.min(h - 60, p.y + p.vy));
      p.rot = moveX * 0.2;

      // Shield regeneration (faster for beginner comfort)
      p.shield = Math.min(100, p.shield + 0.16);
      setShield(Math.floor(p.shield));

      // Firing dual lasers
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.photonCooldown > 0) p.photonCooldown--;

      if (s.keys.shoot && p.shootCooldown <= 0) {
        p.shootCooldown = 8;
        sound.playLaser(1600);

        for (let i = -1; i <= 1; i += 2) {
          s.projectiles.push({
            x: p.x + i * 16,
            y: p.y - 20,
            vx: 0,
            vy: -16,
            damage: 32,
            r: 3.5,
            color: '#00f0ff',
            glowColor: '#0284c7',
            isPlayer: true
          });
        }
      }

      // Thruster engine particles
      for (let i = 0; i < 2; i++) {
        s.particles.push({
          x: p.x + (Math.random() - 0.5) * 12,
          y: p.y + 24,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 6 + Math.random() * 4,
          color: p.isHyper ? '#ec4899' : '#00f0ff',
          size: 3 + Math.random() * 4,
          alpha: 0.9,
          life: 18,
          maxLife: 18,
          type: 'plasma'
        });
      }

      // Sector calculation based on score
      const currentSector = 1 + Math.floor(s.score / 2500);
      if (currentSector !== s.sectorNum) {
        s.sectorNum = currentSector;
        setSector(currentSector);
        sound.playPowerUp();
      }

      // 3. SPAWN ASTEROIDS & ENEMY SHIPS (Smooth gradual difficulty)
      s.spawnTimer++;
      const spawnInterval = Math.max(70, 130 - s.sectorNum * 12);
      if (s.spawnTimer > spawnInterval) {
        s.spawnTimer = 0;
        if (Math.random() < 0.55) {
          s.asteroids.push(createAsteroid(Math.random() * w, -50, 18 + Math.random() * 24));
        }
        // Delay aggressive enemies in early game
        if (s.time > 6 && Math.random() < (s.sectorNum === 1 ? 0.35 : 0.55)) {
          const isDread = s.sectorNum >= 3 && Math.random() < 0.2;
          s.enemies.push({
            id: `e_${s.enemyIdCounter++}`,
            x: 80 + Math.random() * (w - 160),
            y: -60,
            vx: (Math.random() - 0.5) * (1.2 + s.sectorNum * 0.2),
            vy: 1.4 + Math.random() * 1.0,
            hp: isDread ? 150 : 45,
            maxHp: isDread ? 150 : 45,
            type: isDread ? 'dreadnought' : 'cruiser',
            shootCooldown: 45,
            rot: 0
          });
        }
      }

      // 4. UPDATE ASTEROIDS
      for (let i = s.asteroids.length - 1; i >= 0; i--) {
        const ast = s.asteroids[i];
        ast.x += ast.vx;
        ast.y += ast.vy;
        ast.rot += ast.rotSpeed;

        // Collision with player
        if (Math.hypot(p.x - ast.x, p.y - ast.y) < ast.r + 20) {
          s.asteroids.splice(i, 1);
          sound.playHit();
          s.screenShake = 6;

          if (p.shield > 20) {
            p.shield -= 30;
          } else {
            p.hp -= 35;
          }
          setHull(Math.floor(p.hp));
          setShield(Math.floor(p.shield));

          if (p.hp <= 0) {
            handleGameOver(s.score);
            return;
          }
          continue;
        }

        if (ast.y > h + 60) {
          s.asteroids.splice(i, 1);
        }
      }

      // 5. UPDATE ENEMIES
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const en = s.enemies[i];
        en.x += en.vx;
        en.y += en.vy;

        en.shootCooldown--;
        if (en.shootCooldown <= 0 && en.y > 40 && en.y < h - 100) {
          en.shootCooldown = 75;
          s.projectiles.push({
            x: en.x,
            y: en.y + 20,
            vx: (p.x - en.x) * 0.02,
            vy: 8,
            damage: 18,
            r: 4,
            color: '#ef4444',
            glowColor: '#dc2626',
            isPlayer: false
          });
        }

        if (en.y > h + 60) {
          s.enemies.splice(i, 1);
        }
      }

      // 6. UPDATE PROJECTILES
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const pr = s.projectiles[i];
        pr.x += pr.vx;
        pr.y += pr.vy;

        if (pr.isPlayer) {
          // Check asteroid hit
          for (let j = s.asteroids.length - 1; j >= 0; j--) {
            const ast = s.asteroids[j];
            if (Math.hypot(pr.x - ast.x, pr.y - ast.y) < ast.r) {
              ast.hp -= pr.damage;
              s.projectiles.splice(i, 1);
              sound.playHit();

              if (ast.hp <= 0) {
                s.asteroids.splice(j, 1);
                sound.playExplosion();
                s.score += Math.floor(ast.r * 5);
                setScore(s.score);

                // Split into smaller debris
                for (let k = 0; k < 8; k++) {
                  s.particles.push({
                    x: ast.x,
                    y: ast.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    color: '#94a3b8',
                    size: 3 + Math.random() * 4,
                    alpha: 1,
                    life: 25,
                    maxLife: 25,
                    type: 'smoke'
                  });
                }
              }
              break;
            }
          }

          // Check enemy ship hit
          for (let j = s.enemies.length - 1; j >= 0; j--) {
            const en = s.enemies[j];
            if (Math.abs(pr.x - en.x) < 28 && Math.abs(pr.y - en.y) < 28) {
              en.hp -= pr.damage;
              s.projectiles.splice(i, 1);
              sound.playHit();

              if (en.hp <= 0) {
                s.enemies.splice(j, 1);
                sound.playExplosion();
                s.screenShake = 6;
                const enScore = en.type === 'dreadnought' ? 400 : 150;
                s.score += enScore;
                setScore(s.score);

                // Huge plasma explosion
                for (let k = 0; k < 18; k++) {
                  s.particles.push({
                    x: en.x,
                    y: en.y,
                    vx: (Math.random() - 0.5) * 9,
                    vy: (Math.random() - 0.5) * 9,
                    color: Math.random() < 0.5 ? '#f97316' : '#00f0ff',
                    size: 4 + Math.random() * 5,
                    alpha: 1,
                    life: 30,
                    maxLife: 30,
                    type: 'plasma'
                  });
                }
              }
              break;
            }
          }
        } else {
          // Enemy projectile hit player
          if (Math.hypot(pr.x - p.x, pr.y - p.y) < 22) {
            s.projectiles.splice(i, 1);
            sound.playHit();
            s.screenShake = 5;

            if (p.shield > 10) {
              p.shield -= pr.damage;
            } else {
              p.hp -= pr.damage;
            }
            setHull(Math.floor(p.hp));
            setShield(Math.floor(p.shield));

            if (p.hp <= 0) {
              handleGameOver(s.score);
              return;
            }
          }
        }

        if (pr.y < -30 || pr.y > h + 30) {
          s.projectiles.splice(i, 1);
        }
      }

      // 7. PARTICLES
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        pt.alpha = pt.life / pt.maxLife;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // AAA DEEP SPACE RENDER PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.3);
      }

      // 1. Deep Space Black Base
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, w, h);

      // 2. Volumetric Gas Nebulae
      s.nebulae.forEach(neb => {
        const nGrad = ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.r);
        nGrad.addColorStop(0, neb.color);
        nGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nGrad;
        ctx.fillRect(neb.x - neb.r, neb.y - neb.r, neb.r * 2, neb.r * 2);
      });

      // 3. Parallax Starfield with Warp Streaks
      s.stars.forEach(st => {
        ctx.fillStyle = `rgba(255, 255, 255, ${st.brightness})`;
        if (p.isHyper) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = st.size;
          ctx.beginPath();
          ctx.moveTo(st.x, st.y);
          ctx.lineTo(st.x, st.y + 35);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Shaded Asteroids
      s.asteroids.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rot);

        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ast.pts.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // 5. Enemy Cruisers & Dreadnoughts
      s.enemies.forEach(en => {
        ctx.save();
        ctx.translate(en.x, en.y);

        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(0, 24);
        ctx.lineTo(-20, -18);
        ctx.lineTo(20, -18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      });

      // 6. Player Flagship Dreadnought
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      // Energy Shield Bubble
      if (p.shield > 10) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, 0, 32, 40, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Hull (Aerodynamic Space Interceptor)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(24, 24);
      ctx.lineTo(0, 16);
      ctx.lineTo(-24, 24);
      ctx.closePath();
      ctx.fill();

      // Wing Armor Panels
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(16, 18);
      ctx.lineTo(0, 12);
      ctx.lineTo(-16, 18);
      ctx.closePath();
      ctx.fill();

      // Glowing Cockpit
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, -8, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // 7. Projectiles
      s.projectiles.forEach(pr => {
        ctx.fillStyle = pr.color;
        ctx.shadowColor = pr.glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 8. Particles
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
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] text-white select-none overflow-hidden font-sans">
      {/* COCKPIT FLIGHT HUD */}
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
              <Rocket className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-display font-black text-sm text-white tracking-wider">GALAXY COMMANDER</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-[#00f0ff] font-mono text-[10px] font-bold">
                SECTOR {sector}
              </span>
            </div>
          </div>
        </div>

        {/* METERS */}
        <div className="flex items-center gap-6">
          {/* Shield */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00f0ff]" />
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-[#00f0ff] transition-all duration-100"
                style={{ width: `${Math.max(0, shield)}%` }}
              />
            </div>
          </div>

          {/* Hull */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-red-400">HULL</span>
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                style={{ width: `${Math.max(0, hull)}%` }}
              />
            </div>
          </div>

          {/* Hyperdrive */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-pink-400 fill-current" />
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-100"
                style={{ width: `${Math.max(0, hyperdrive)}%` }}
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
          className="w-full h-full object-contain"
        />

        {/* START SCREEN */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
              <Orbit className="w-8 h-8" />
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mb-2">
              GALAXY COMMANDER
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 font-mono">
              Command an elite battlecruiser through dangerous asteroid belts and enemy alien armadas in deep space.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-6 text-left">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Flight Navigation</span>
                <p className="text-xs font-bold text-white mt-0.5">WASD or Arrow Keys</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Dual Plasma Lasers</span>
                <p className="text-xs font-bold text-[#00f0ff] mt-0.5">SPACEBAR or J Key</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Photon Torpedo</span>
                <p className="text-xs font-bold text-pink-400 mt-0.5">E Key or K Key</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Hyperdrive Warp</span>
                <p className="text-xs font-bold text-cyan-400 mt-0.5">Hold SHIFT (Warp Speed)</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-cyan-950/50 transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>LAUNCH STARSHIP</span>
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
                className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                RESUME MISSION
              </button>
              <button
                onClick={startGame}
                className="py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
              >
                RESTART MISSION
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="font-display font-black text-3xl text-white tracking-wide">VESSEL DESTROYED</h2>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-6">Mission Terminated in Sector {sector}</p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Score</span>
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
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>LAUNCH AGAIN</span>
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
