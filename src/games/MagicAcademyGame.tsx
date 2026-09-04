import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Wand2, Sparkles, Trophy, Shield, Zap, Flame, Snowflake, BookOpen } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface MagicalRune {
  id: number;
  x: number;
  y: number;
  element: 'fire' | 'ice' | 'lightning' | 'arcane';
  symbol: string;
  color: string;
  glow: string;
  speed: number;
  radius: number;
  health: number;
  maxHealth: number;
  rotation: number;
}

interface SpellProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  element: 'fire' | 'ice' | 'lightning' | 'arcane';
  color: string;
  glow: string;
  radius: number;
  particles: { x: number; y: number; alpha: number; color: string }[];
}

interface MagicParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

const ELEMENTS = [
  { id: 'fire' as const, name: 'Ignis (Fire)', symbol: '🔥', color: '#f97316', glow: '#fb923c', key: '1' },
  { id: 'ice' as const, name: 'Glacies (Ice)', symbol: '❄️', color: '#38bdf8', glow: '#7dd3fc', key: '2' },
  { id: 'lightning' as const, name: 'Fulgur (Lightning)', symbol: '⚡', color: '#facc15', glow: '#fde047', key: '3' },
  { id: 'arcane' as const, name: 'Arcanum (Mystic)', symbol: '✨', color: '#c084fc', glow: '#e879f9', key: '4' }
];

export const MagicAcademyGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [mana, setMana] = useState(100);
  const [selectedElement, setSelectedElement] = useState<'fire' | 'ice' | 'lightning' | 'arcane'>('fire');
  const [wave, setWave] = useState(1);
  const [barrierHp, setBarrierHp] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_magic-academy') || '0', 10);
  });

  const stateRef = useRef({
    mage: {
      x: 400,
      y: 490,
      targetX: 400,
      wandGlow: 0,
      castAnim: 0
    },
    runes: [] as MagicalRune[],
    spells: [] as SpellProjectile[],
    particles: [] as MagicParticle[],
    stars: [] as { x: number; y: number; r: number; alpha: number; speed: number }[],
    runeIdCounter: 1,
    barrierHp: 100,
    mana: 100,
    score: 0,
    wave: 1,
    time: 0,
    selectedElement: 'fire' as 'fire' | 'ice' | 'lightning' | 'arcane',
    keys: { left: false, right: false, cast: false }
  });

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('gameover');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_magic-academy', finalScore.toString());
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const castSpell = useCallback(() => {
    const s = stateRef.current;
    if (s.mana < 8) return;

    s.mana = Math.max(0, s.mana - 8);
    setMana(Math.floor(s.mana));
    sound.playLaser(1400);

    const elemObj = ELEMENTS.find(e => e.id === s.selectedElement) || ELEMENTS[0];
    s.mage.castAnim = 12;

    s.spells.push({
      x: s.mage.x,
      y: s.mage.y - 30,
      vx: 0,
      vy: -9,
      element: s.selectedElement,
      color: elemObj.color,
      glow: elemObj.glow,
      radius: 10,
      particles: []
    });

    // Cast sparks
    for (let i = 0; i < 8; i++) {
      s.particles.push({
        x: s.mage.x,
        y: s.mage.y - 30,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        color: elemObj.color,
        alpha: 1,
        size: 3,
        life: 20,
        maxLife: 20
      });
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 550,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.5 + 0.2
    }));

    stateRef.current = {
      mage: { x: 400, y: 490, targetX: 400, wandGlow: 0, castAnim: 0 },
      runes: [],
      spells: [],
      particles: [],
      stars,
      runeIdCounter: 1,
      barrierHp: 100,
      mana: 100,
      score: 0,
      wave: 1,
      time: 0,
      selectedElement: 'fire',
      keys: { left: false, right: false, cast: false }
    };

    setScore(0);
    setMana(100);
    setBarrierHp(100);
    setWave(1);
    setSelectedElement('fire');
    setGameState('playing');
  }, []);

  // Key controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space', 'KeyW', 'ArrowUp', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        castSpell();
      }
      if (e.code === 'Digit1') {
        stateRef.current.selectedElement = 'fire';
        setSelectedElement('fire');
        sound.playClick();
      }
      if (e.code === 'Digit2') {
        stateRef.current.selectedElement = 'ice';
        setSelectedElement('ice');
        sound.playClick();
      }
      if (e.code === 'Digit3') {
        stateRef.current.selectedElement = 'lightning';
        setSelectedElement('lightning');
        sound.playClick();
      }
      if (e.code === 'Digit4') {
        stateRef.current.selectedElement = 'arcane';
        setSelectedElement('arcane');
        sound.playClick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [castSpell]);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      s.time += 0.016;

      // Mana regen
      s.mana = Math.min(100, s.mana + 0.35);
      setMana(Math.floor(s.mana));

      // Mage controls
      if (s.keys.left) s.mage.x -= 6.5;
      if (s.keys.right) s.mage.x += 6.5;
      s.mage.x = Math.max(50, Math.min(w - 50, s.mage.x));
      if (s.mage.castAnim > 0) s.mage.castAnim--;

      // Spawn Runes (Gentle start curve: slow speed at first)
      const spawnInterval = Math.max(50, 110 - Math.floor(s.score / 600) * 10);
      if (Math.floor(s.time * 60) % spawnInterval === 0) {
        const elem = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
        // Slow falling speed for beginner friendliness (starts at 1.2, max 3.2)
        const spd = 1.2 + Math.min(2.0, (s.score / 2000) * 1.5);
        s.runes.push({
          id: s.runeIdCounter++,
          x: 60 + Math.random() * (w - 120),
          y: -30,
          element: elem.id,
          symbol: elem.symbol,
          color: elem.color,
          glow: elem.glow,
          speed: spd,
          radius: 22,
          health: 1,
          maxHealth: 1,
          rotation: 0
        });
      }

      // Update Runes
      for (let i = s.runes.length - 1; i >= 0; i--) {
        const r = s.runes[i];
        r.y += r.speed;
        r.rotation += 0.02;

        // Reached barrier at bottom
        if (r.y >= h - 70) {
          sound.playHit();
          s.barrierHp = Math.max(0, s.barrierHp - 15);
          setBarrierHp(s.barrierHp);

          // Barrier impact particles
          for (let p = 0; p < 12; p++) {
            s.particles.push({
              x: r.x,
              y: h - 70,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 4,
              color: '#38bdf8',
              alpha: 1,
              size: 3,
              life: 25,
              maxLife: 25
            });
          }

          s.runes.splice(i, 1);
          if (s.barrierHp <= 0) {
            handleGameOver(s.score);
            return;
          }
        }
      }

      // Update Spells
      for (let i = s.spells.length - 1; i >= 0; i--) {
        const sp = s.spells[i];
        sp.y += sp.vy;

        // Collision with Runes
        for (let j = s.runes.length - 1; j >= 0; j--) {
          const r = s.runes[j];
          const dist = Math.hypot(sp.x - r.x, sp.y - r.y);
          if (dist < sp.radius + r.radius) {
            // Check elemental match for bonus
            const isMatch = sp.element === r.element;
            sound.playExplosion();

            const pts = isMatch ? 200 : 100;
            s.score += pts;
            setScore(s.score);

            // Shatter particles
            for (let p = 0; p < 14; p++) {
              s.particles.push({
                x: r.x,
                y: r.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: isMatch ? '#fde047' : r.color,
                alpha: 1,
                size: isMatch ? 4.5 : 3,
                life: 30,
                maxLife: 30
              });
            }

            s.runes.splice(j, 1);
            s.spells.splice(i, 1);
            break;
          }
        }

        if (sp.y < -20) {
          s.spells.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      // 1. Astronomy Tower Sanctuary Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0a0518');
      bgGrad.addColorStop(0.5, '#190a36');
      bgGrad.addColorStop(1, '#0c0721');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Starlight
      s.stars.forEach(st => {
        ctx.fillStyle = `rgba(224, 231, 255, ${st.alpha})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mystic Academy Arcane Window Arch
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, 240, 200, Math.PI, 0);
      ctx.stroke();

      // 2. Sanctum Magic Barrier Line
      const barGrad = ctx.createLinearGradient(0, h - 70, w, h - 70);
      barGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      barGrad.addColorStop(0.5, `rgba(56, 189, 248, ${Math.max(0.4, s.barrierHp / 100)})`);
      barGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.strokeStyle = barGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(40, h - 70);
      ctx.lineTo(w - 40, h - 70);
      ctx.stroke();

      // 3. Draw Falling Runes
      s.runes.forEach(r => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rotation);

        // Glow
        ctx.shadowColor = r.glow;
        ctx.shadowBlur = 16;

        // Hexagon Rune Plate
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3;
          const px = Math.cos(angle) * r.radius;
          const py = Math.sin(angle) * r.radius;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();

        // Element Symbol in center
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.symbol, r.x, r.y);
      });

      // 4. Draw Spell Projectiles
      s.spells.forEach(sp => {
        ctx.save();
        ctx.shadowColor = sp.glow;
        ctx.shadowBlur = 18;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 5. Draw Magic Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 6. Draw Archmage Character
      const mx = s.mage.x;
      const my = s.mage.y;

      // Robe
      ctx.fillStyle = '#311042';
      ctx.beginPath();
      ctx.moveTo(mx - 22, my + 30);
      ctx.lineTo(mx + 22, my + 30);
      ctx.lineTo(mx + 10, my - 15);
      ctx.lineTo(mx - 10, my - 15);
      ctx.closePath();
      ctx.fill();

      // Wizard Hat
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(mx - 18, my - 18);
      ctx.lineTo(mx + 18, my - 18);
      ctx.lineTo(mx, my - 45);
      ctx.closePath();
      ctx.fill();

      // Hat Brim
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(mx, my - 18, 22, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Magic Wand & Staff
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx + 14, my + 20);
      ctx.lineTo(mx + 18, my - 28);
      ctx.stroke();

      // Wand Crystal Gem
      const curElem = ELEMENTS.find(e => e.id === s.selectedElement) || ELEMENTS[0];
      ctx.save();
      ctx.shadowColor = curElem.glow;
      ctx.shadowBlur = 16 + (s.mage.castAnim > 0 ? 12 : 0);
      ctx.fillStyle = curElem.color;
      ctx.beginPath();
      ctx.arc(mx + 18, my - 30, 6 + (s.mage.castAnim > 0 ? 3 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center border border-purple-500/20 shadow-2xl select-none">
      <canvas ref={canvasRef} width={800} height={550} className="w-full h-full object-contain" />

      {/* Top HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          {/* Barrier & Mana Bars */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl">
              <Shield className="w-4 h-4 text-cyan-400" />
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${barrierHp}%` }} />
              </div>
              <span className="text-xs font-bold font-mono text-cyan-200">{barrierHp}%</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-purple-500/30 px-3 py-1.5 rounded-xl">
              <Zap className="w-4 h-4 text-purple-400" />
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-200" style={{ width: `${mana}%` }} />
              </div>
              <span className="text-xs font-bold font-mono text-purple-200">{Math.floor(mana)}</span>
            </div>
          </div>

          {/* Element Selector Pills */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-white/10 p-1 rounded-2xl">
            {ELEMENTS.map(el => {
              const active = selectedElement === el.id;
              return (
                <button
                  key={el.id}
                  onClick={() => {
                    stateRef.current.selectedElement = el.id;
                    setSelectedElement(el.id);
                    sound.playClick();
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    active ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-105' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{el.symbol}</span>
                  <span className="hidden sm:inline">{el.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Score */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-amber-400/80 block uppercase tracking-wider">Score</span>
            <span className="text-sm font-black font-mono text-amber-300">{score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 shadow-xl shadow-purple-500/20">
            <Wand2 className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">MAGIC ACADEMY</h2>
          <p className="text-xs text-purple-200/80 max-w-md mt-2 leading-relaxed font-mono">
            Harness arcane elements! Cast Fire, Ice, Lightning, and Arcane spells to destroy descending magical runes before they breach your academy barrier.
          </p>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">A / D = Move</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">SPACE / W = Cast</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">1-4 = Elements</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ENTER SANCTUARY</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">BARRIER BREACHED</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">The academy sanctum has fallen.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Final Arcane Score</span>
            <span className="text-2xl font-black font-mono text-purple-300 mt-0.5 block">{score.toLocaleString()}</span>
            {score >= highScore && score > 0 && (
              <span className="text-[10px] text-amber-400 font-bold mt-1 block">🏆 NEW HIGH SCORE!</span>
            )}
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
