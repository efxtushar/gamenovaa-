import React, { useState, useEffect, useRef, Suspense } from 'react';
import { GameItem } from '../data/games';
import { 
  ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2,
  RefreshCw, Pause, Play, Smartphone
} from 'lucide-react';
import { sound } from '../utils/soundEffects';
import { useAuth } from '../context/AuthContext';
import { useGameInputLock } from '../hooks/useGameInputLock';
import { MobileControls } from './MobileControls';

// 30 Unique Game Components
import { NeonDriftGame } from '../games/NeonDriftGame';
import { SkyWarriorGame } from '../games/SkyWarriorGame';
import { NinjaDashGame } from '../games/NinjaDashGame';
import { MonsterArenaGame } from '../games/MonsterArenaGame';
import { PixelQuestGame } from '../games/PixelQuestGame';
import { RocketRushGame } from '../games/RocketRushGame';
import { BubbleBlastGame } from '../games/BubbleBlastGame';
import { StreetHoopsGame } from '../games/StreetHoopsGame';
import { MiniGolfWorldGame } from '../games/MiniGolfWorldGame';
import { ZombieEscapeGame } from '../games/ZombieEscapeGame';
import { DesertRacerGame } from '../games/DesertRacerGame';
import { SpaceMinerGame } from '../games/SpaceMinerGame';
import { CastleDefenderGame } from '../games/CastleDefenderGame';
import { ColorRushGame } from '../games/ColorRushGame';
import { FishingFrenzyGame } from '../games/FishingFrenzyGame';
import { RobotBrawlGame } from '../games/RobotBrawlGame';
import { JungleRunGame } from '../games/JungleRunGame';
import { GemMatchGame } from '../games/GemMatchGame';
import { SpaceSurvivorGame } from '../games/SpaceSurvivorGame';
import { BattleCarsGame } from '../games/BattleCarsGame';
import { DragonFlightGame } from '../games/DragonFlightGame';
import { PirateTreasureGame } from '../games/PirateTreasureGame';
import { SnowboardHeroGame } from '../games/SnowboardHeroGame';
import { MagicAcademyGame } from '../games/MagicAcademyGame';
import { CyberSamuraiGame } from '../games/CyberSamuraiGame';
import { FarmFriendsGame } from '../games/FarmFriendsGame';
import { HauntedHouseGame } from '../games/HauntedHouseGame';
import { MechaBattleGame } from '../games/MechaBattleGame';
import { DeepSeaAdventureGame } from '../games/DeepSeaAdventureGame';
import { GalaxyCommanderGame } from '../games/GalaxyCommanderGame';

interface GamePlayerProps {
  game: GameItem;
  onBack: () => void;
  onSelectGame: (game: GameItem) => void;
  allGames: GameItem[];
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  game,
  onBack,
}) => {
  const [isPlaying] = useState(true);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());
  const [gameKey, setGameKey] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Lock scroll & handle Esc / P key
  useGameInputLock({
    isActive: isPlaying,
    containerRef,
    onEscape: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setShowPauseModal(prev => !prev);
    },
    onPauseToggle: () => {
      setShowPauseModal(prev => !prev);
    }
  });

  // Mobile detection & Fullscreen listener
  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowMobileControls(true);
    }

    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleRestart = () => {
    sound.playClick();
    setGameKey(prev => prev + 1);
    setShowPauseModal(false);
    setTimeout(() => {
      containerRef.current?.focus();
    }, 100);
  };

  const handleExitGame = () => {
    sound.playClick();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onBack();
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Fullscreen request failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const renderGameComponent = () => {
    switch (game.slug) {
      case 'neon-drift': return <NeonDriftGame key={gameKey} onBack={handleExitGame} />;
      case 'sky-warrior': return <SkyWarriorGame key={gameKey} onBack={handleExitGame} />;
      case 'ninja-dash': return <NinjaDashGame key={gameKey} onBack={handleExitGame} />;
      case 'monster-arena': return <MonsterArenaGame key={gameKey} onBack={handleExitGame} />;
      case 'pixel-quest': return <PixelQuestGame key={gameKey} onBack={handleExitGame} />;
      case 'rocket-rush': return <RocketRushGame key={gameKey} onBack={handleExitGame} />;
      case 'bubble-blast': return <BubbleBlastGame key={gameKey} onBack={handleExitGame} />;
      case 'street-hoops': return <StreetHoopsGame key={gameKey} onBack={handleExitGame} />;
      case 'mini-golf-world': return <MiniGolfWorldGame key={gameKey} onBack={handleExitGame} />;
      case 'zombie-escape': return <ZombieEscapeGame key={gameKey} onBack={handleExitGame} />;
      case 'desert-racer': return <DesertRacerGame key={gameKey} onBack={handleExitGame} />;
      case 'space-miner': return <SpaceMinerGame key={gameKey} onBack={handleExitGame} />;
      case 'castle-defender': return <CastleDefenderGame key={gameKey} onBack={handleExitGame} />;
      case 'color-rush': return <ColorRushGame key={gameKey} onBack={handleExitGame} />;
      case 'fishing-frenzy': return <FishingFrenzyGame key={gameKey} onBack={handleExitGame} />;
      case 'robot-brawl': return <RobotBrawlGame key={gameKey} onBack={handleExitGame} />;
      case 'jungle-run': return <JungleRunGame key={gameKey} onBack={handleExitGame} />;
      case 'gem-match': return <GemMatchGame key={gameKey} onBack={handleExitGame} />;
      case 'space-survivor': return <SpaceSurvivorGame key={gameKey} onBack={handleExitGame} />;
      case 'battle-cars': return <BattleCarsGame key={gameKey} onBack={handleExitGame} />;
      case 'dragon-flight': return <DragonFlightGame key={gameKey} onBack={handleExitGame} />;
      case 'pirate-treasure': return <PirateTreasureGame key={gameKey} onBack={handleExitGame} />;
      case 'snowboard-hero': return <SnowboardHeroGame key={gameKey} onBack={handleExitGame} />;
      case 'magic-academy': return <MagicAcademyGame key={gameKey} onBack={handleExitGame} />;
      case 'cyber-samurai': return <CyberSamuraiGame key={gameKey} onBack={handleExitGame} />;
      case 'farm-friends': return <FarmFriendsGame key={gameKey} onBack={handleExitGame} />;
      case 'haunted-house': return <HauntedHouseGame key={gameKey} onBack={handleExitGame} />;
      case 'mecha-battle': return <MechaBattleGame key={gameKey} onBack={handleExitGame} />;
      case 'deep-sea-adventure': return <DeepSeaAdventureGame key={gameKey} onBack={handleExitGame} />;
      case 'galaxy-commander': return <GalaxyCommanderGame key={gameKey} onBack={handleExitGame} />;
      default: return <NeonDriftGame key={gameKey} onBack={handleExitGame} />;
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={() => {
        if (containerRef.current && document.activeElement !== containerRef.current) {
          containerRef.current.focus();
        }
      }}
      className="fixed inset-0 z-50 bg-[#05070d] text-white flex flex-col w-screen h-screen overflow-hidden select-none outline-none"
    >
      {/* MINIMAL IN-GAME ACTION BAR: Back • Pause • Sound • Fullscreen */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 z-40">
        {/* Left: Back */}
        <button
          onClick={handleExitGame}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          title="Back to games (Esc)"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Games</span>
        </button>

        {/* Center: Game Title */}
        <span className="text-xs font-bold text-slate-300 hidden md:inline truncate max-w-xs">
          {game.title}
        </span>

        {/* Right: Pause • Sound • Fullscreen */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pause / Resume */}
          <button
            onClick={() => setShowPauseModal(prev => !prev)}
            title="Pause Game (P)"
            className={`p-1.5 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showPauseModal
                ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white'
            }`}
          >
            {showPauseModal ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showPauseModal ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
            className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
        </div>
      </header>

      {/* FULL VIEWPORT IMMERSIVE GAME CANVAS STAGE */}
      <main className="flex-1 relative flex flex-col items-center justify-center bg-[#05070d] overflow-hidden w-full h-[calc(100vh-44px)]">
        <div className="relative w-full h-full flex items-center justify-center">
          <Suspense fallback={
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-[#00E5FF] font-mono text-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-[#00E5FF]" />
              <span>Launching Game Engine...</span>
            </div>
          }>
            {renderGameComponent()}
          </Suspense>
        </div>

        {/* VIRTUAL TOUCH CONTROLS BAR (Mobile only) */}
        {showMobileControls && (
          <div className="shrink-0 w-full z-30">
            <MobileControls gameSlug={game.slug} />
          </div>
        )}
      </main>

      {/* IN-GAME PAUSE OVERLAY MODAL */}
      {showPauseModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-[#131826] border border-[#1E293B] shadow-2xl shadow-purple-950/40 flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/20 border border-[#7C3AED]/50 flex items-center justify-center text-[#00E5FF] shadow-lg">
              <Pause className="w-7 h-7" />
            </div>

            <div>
              <h2 className="font-display font-black text-2xl text-white tracking-tight">
                GAME PAUSED
              </h2>
              <p className="text-xs font-mono text-[#94A3B8] mt-1">
                {game.title}
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                onClick={() => setShowPauseModal(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00E5FF] text-white font-bold text-sm tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME GAME</span>
              </button>

              <button
                onClick={handleRestart}
                className="w-full py-2.5 rounded-xl bg-[#080B12] hover:bg-[#192032] border border-[#1E293B] text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>RESTART</span>
              </button>

              <button
                onClick={handleExitGame}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>EXIT GAME</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
