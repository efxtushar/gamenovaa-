import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Play, RotateCcw, ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2, 
  Pause, Flag, Trophy, Gauge, Zap, Flame, Compass, Settings, Check, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  GameState, CarConfig, TrackConfig, RacerState, StuntScoreNotice 
} from './turbo-tracks/types';
import { ORIGINAL_CARS, TRACK_CONFIGS } from './turbo-tracks/tracksData';
import { createToyCarMesh, BuiltCarResult } from './turbo-tracks/carModelBuilder';
import { build3DTrack, BuiltTrackResult } from './turbo-tracks/trackMeshBuilder';
import { TurboPhysicsEngine, InputState } from './turbo-tracks/carPhysics';
import { turboAudio } from './turbo-tracks/toyAudio';

interface TurboTracksGameProps {
  onBack: () => void;
}

export const TurboTracksGame: React.FC<TurboTracksGameProps> = ({ onBack }) => {
  // -------------------------------------------------------------
  // REACT UI STATES
  // -------------------------------------------------------------
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedCar, setSelectedCar] = useState<CarConfig>(ORIGINAL_CARS[0]);
  const [selectedTrack, setSelectedTrack] = useState<TrackConfig>(TRACK_CONFIGS[0]);
  const [carPaintColor, setCarPaintColor] = useState<string>(ORIGINAL_CARS[0].primaryColor);

  // HUD & Racing Live States
  const [position, setPosition] = useState<number>(1);
  const [totalRacers] = useState<number>(4);
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [totalLaps, setTotalLaps] = useState<number>(3);
  const [speedKmH, setSpeedKmH] = useState<number>(0);
  const [boostReserve, setBoostReserve] = useState<number>(100);
  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [raceTimeMs, setRaceTimeMs] = useState<number>(0);
  const [bestLapTimeMs, setBestLapTimeMs] = useState<number>(0);
  const [countdownNum, setCountdownNum] = useState<string>('3');
  const [stuntNotices, setStuntNotices] = useState<StuntScoreNotice[]>([]);
  const [totalStuntScore, setTotalStuntScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(turboAudio.getIsMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Results State
  const [finishRank, setFinishRank] = useState<number>(1);
  const [finalTimeMs, setFinalTimeMs] = useState<number>(0);

  // -------------------------------------------------------------
  // REFS & ENGINE STATE (SEPARATED FROM REACT RENDERS)
  // -------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>('MENU');
  const animFrameIdRef = useRef<number | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Track & Physics References
  const currentTrackResultRef = useRef<BuiltTrackResult | null>(null);
  const physicsEngineRef = useRef<TurboPhysicsEngine | null>(null);

  // Racers
  const playerRacerRef = useRef<RacerState | null>(null);
  const playerCarBuiltRef = useRef<BuiltCarResult | null>(null);
  const aiRacersRef = useRef<RacerState[]>([]);
  const garageCarGroupRef = useRef<THREE.Group | null>(null);

  // Input State Ref
  const inputRef = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    boost: false,
    reset: false
  });

  // Mobile Touch Inputs
  const isMobileRef = useRef<boolean>(false);

  // Camera Shake & FOV punch
  const camShakeRef = useRef<number>(0);
  const camLookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const camLookInitRef = useRef<boolean>(false);

  // -------------------------------------------------------------
  // DETECT TOUCH / MOBILE DEVICE
  // -------------------------------------------------------------
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    isMobileRef.current = isTouch;
  }, []);

  // Sync gameStateRef with React state
  const setGameMode = useCallback((mode: GameState) => {
    gameStateRef.current = mode;
    setGameState(mode);

    if (mode === 'RACING') {
      turboAudio.startEngine();
    } else if (mode === 'PAUSED' || mode === 'MENU' || mode === 'GARAGE' || mode === 'TRACK_SELECT') {
      turboAudio.updateEngineSound(0, false, false);
    }
  }, []);

  // -------------------------------------------------------------
  // COUNTDOWN LOGIC (3 -> 2 -> 1 -> GO!)
  // -------------------------------------------------------------
  const startCountdown = useCallback(() => {
    setGameMode('COUNTDOWN');
    setCountdownNum('3');
    turboAudio.playCountdown(false);

    setTimeout(() => {
      if (gameStateRef.current !== 'COUNTDOWN') return;
      setCountdownNum('2');
      turboAudio.playCountdown(false);

      setTimeout(() => {
        if (gameStateRef.current !== 'COUNTDOWN') return;
        setCountdownNum('1');
        turboAudio.playCountdown(false);

        setTimeout(() => {
          if (gameStateRef.current !== 'COUNTDOWN') return;
          setCountdownNum('GO!');
          turboAudio.playCountdown(true);

          setTimeout(() => {
            if (gameStateRef.current !== 'COUNTDOWN') return;
            setGameMode('RACING');
          }, 600);
        }, 1000);
      }, 1000);
    }, 1000);
  }, [setGameMode]);

  // -------------------------------------------------------------
  // SETUP RACE SCENE & CARS
  // -------------------------------------------------------------
  const setupRace = useCallback((trackCfg: TrackConfig, carCfg: CarConfig, paintColor: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Remove previous track & racers from scene
    if (currentTrackResultRef.current) {
      scene.remove(currentTrackResultRef.current.group);
    }
    if (playerRacerRef.current) {
      scene.remove(playerRacerRef.current.meshGroup);
    }
    aiRacersRef.current.forEach(ai => {
      scene.remove(ai.meshGroup);
    });
    aiRacersRef.current = [];

    // 2. Build New 3D Track
    const builtTrack = build3DTrack(trackCfg);
    scene.add(builtTrack.group);
    currentTrackResultRef.current = builtTrack;

    // Update scene fog & background
    scene.background = new THREE.Color(trackCfg.fogColor);
    scene.fog = new THREE.FogExp2(trackCfg.fogColor, 0.0035);

    // 3. Setup Physics Engine
    if (!physicsEngineRef.current) {
      physicsEngineRef.current = new TurboPhysicsEngine(builtTrack);
    } else {
      physicsEngineRef.current.setTrack(builtTrack);
    }

    // 4. Build Player Car
    const customPlayerCarConfig = {
      ...carCfg,
      primaryColor: paintColor
    };
    const builtPlayer = createToyCarMesh(customPlayerCarConfig);
    playerCarBuiltRef.current = builtPlayer;
    scene.add(builtPlayer.group);

    const startFrame = builtTrack.getFrameAt(0);
    const startQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(startFrame.binormal, startFrame.normal, startFrame.tangent)
    );
    const startPos = startFrame.pos.clone().addScaledVector(startFrame.normal, 0.35);

    const playerRacer: RacerState = {
      id: 'player',
      name: 'YOU',
      isPlayer: true,
      color: paintColor,
      carConfig: customPlayerCarConfig,
      meshGroup: builtPlayer.group,
      wheels: builtPlayer.wheels,
      exhaustGlow: builtPlayer.exhaustLight,
      pos: startPos,
      vel: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      quaternion: startQuat,
      trackProgress: 0,
      currentLap: 1,
      totalProgress: 1.0,
      speedKmH: 0,
      steer: 0,
      throttle: 0,
      brake: false,
      isDrifting: false,
      driftValue: 0,
      isBoosting: false,
      boostReserve: 100,
      isAirborne: false,
      airTimeSeconds: 0,
      airFlipAccum: 0,
      airRollAccum: 0,
      stuntScore: 0,
      rank: 1,
      bestLapTime: 0,
      currentLapTime: 0,
      totalRaceTime: 0,
      finished: false,
      builtCar: builtPlayer,
      steerAngle: 0,
      headingAngle: 0,
      lateralVelocity: 0
    };
    builtPlayer.group.position.copy(playerRacer.pos);
    builtPlayer.group.quaternion.copy(playerRacer.quaternion);
    playerRacerRef.current = playerRacer;

    // 5. Build 3 AI Opponent Toy Cars on the starting grid
    const aiConfigs = ORIGINAL_CARS.filter(c => c.id !== carCfg.id).slice(0, 3);
    const aiNames = ['BLAZE', 'VIPER', 'APEX'];
    const startGridOffsets = [
      { t: -0.012, lane: 1.6 },
      { t: -0.024, lane: -1.6 },
      { t: -0.036, lane: 1.4 }
    ];

    aiConfigs.forEach((cfg, idx) => {
      const builtAI = createToyCarMesh(cfg);
      scene.add(builtAI.group);

      const offset = startGridOffsets[idx];
      const gridT = (offset.t + 1.0) % 1.0;
      const aiFrame = builtTrack.getFrameAt(gridT);
      const aiPos = aiFrame.pos.clone()
        .addScaledVector(aiFrame.binormal, offset.lane)
        .addScaledVector(aiFrame.normal, 0.35);
      const aiQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(aiFrame.binormal, aiFrame.normal, aiFrame.tangent)
      );

      const aiRacer: RacerState = {
        id: `ai-${idx}`,
        name: aiNames[idx] || `RIVAL ${idx + 1}`,
        isPlayer: false,
        color: cfg.primaryColor,
        carConfig: cfg,
        meshGroup: builtAI.group,
        wheels: builtAI.wheels,
        exhaustGlow: builtAI.exhaustLight,
        pos: aiPos,
        vel: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        quaternion: aiQuat,
        trackProgress: gridT,
        currentLap: 1,
        totalProgress: gridT,
        speedKmH: 0,
        steer: 0,
        throttle: 0,
        brake: false,
        isDrifting: false,
        driftValue: 0,
        isBoosting: false,
        boostReserve: 100,
        isAirborne: false,
        airTimeSeconds: 0,
        airFlipAccum: 0,
        airRollAccum: 0,
        stuntScore: 0,
        rank: idx + 2,
        bestLapTime: 0,
        currentLapTime: 0,
        totalRaceTime: 0,
        finished: false,
        builtCar: builtAI,
        steerAngle: 0,
        headingAngle: 0,
        lateralVelocity: 0,
        aiSkillFactor: (trackCfg.id === 'garage-rush' ? 0.65 : 0.78) + idx * 0.05,
        aiSteerOffset: offset.lane
      };
      builtAI.group.position.copy(aiRacer.pos);
      builtAI.group.quaternion.copy(aiRacer.quaternion);
      aiRacersRef.current.push(aiRacer);
    });

    // Reset live HUD states
    camLookInitRef.current = false;
    setCurrentLap(1);
    setTotalLaps(trackCfg.laps);
    setPosition(1);
    setSpeedKmH(0);
    setBoostReserve(100);
    setTrackProgress(0);
    setRaceTimeMs(0);
    setTotalStuntScore(0);
    setStuntNotices([]);

    startCountdown();
  }, [startCountdown]);

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE, CAMERA, RENDERER
  // -------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera (Dynamic 3rd Person Toy Chase Cam)
    const camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 1200);
    camera.position.set(0, 6, -14);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobileRef.current,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileRef.current ? 1.5 : 2.0));
    renderer.shadowMap.enabled = !isMobileRef.current;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Directional Sunlight & Studio Workshop Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    sunLight.position.set(80, 140, 60);
    if (!isMobileRef.current) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 400;
      sunLight.shadow.camera.left = -150;
      sunLight.shadow.camera.right = 150;
      sunLight.shadow.camera.top = 150;
      sunLight.shadow.camera.bottom = -150;
    }
    scene.add(sunLight);

    // Rim Accent Blue Light (Toy studio dramatic lighting)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-60, 40, -80);
    scene.add(rimLight);

    // Initial Menu / Garage Demo Track
    const initialTrack = build3DTrack(TRACK_CONFIGS[0]);
    scene.add(initialTrack.group);
    currentTrackResultRef.current = initialTrack;

    // Turntable Car for Menu & Garage
    const initialCar = createToyCarMesh(ORIGINAL_CARS[0]);
    initialCar.group.position.set(0, 1.2, 0);
    scene.add(initialCar.group);
    garageCarGroupRef.current = initialCar.group;

    // -----------------------------------------------------------
    // WINDOW RESIZE HANDLER
    // -----------------------------------------------------------
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // -----------------------------------------------------------
    // KEYBOARD INPUT LISTENER
    // -----------------------------------------------------------
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = true;
      if (code === 'Space') inputRef.current.drift = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.boost = true;
      if (code === 'KeyR') inputRef.current.reset = true;
      if (code === 'KeyP' || code === 'Escape') {
        if (gameStateRef.current === 'RACING') {
          setGameMode('PAUSED');
        } else if (gameStateRef.current === 'PAUSED') {
          setGameMode('RACING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = false;
      if (code === 'Space') inputRef.current.drift = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.boost = false;
      if (code === 'KeyR') inputRef.current.reset = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // -----------------------------------------------------------
    // PERSISTENT 60 FPS ANIMATION LOOP
    // -----------------------------------------------------------
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const currentMode = gameStateRef.current;

      // 1. MENU & GARAGE CAMERA ROTATION & TURNTABLE
      if (currentMode === 'MENU' || currentMode === 'GARAGE' || currentMode === 'TRACK_SELECT') {
        if (garageCarGroupRef.current) {
          garageCarGroupRef.current.rotation.y += delta * 0.75;
        }
        // Smooth cinematic orbital camera
        const orbitAngle = currentTime * 0.0004;
        camera.position.x = Math.sin(orbitAngle) * 22;
        camera.position.z = Math.cos(orbitAngle) * 22;
        camera.position.y = 8 + Math.sin(currentTime * 0.001) * 2;
        camera.lookAt(0, 1.5, 0);

        if (currentTrackResultRef.current) {
          currentTrackResultRef.current.updateAnimations(delta, currentTime * 0.001);
        }

        renderer.render(scene, camera);
        return;
      }

      // 2. RACING & COUNTDOWN MODES (PHYSICS & RACER UPDATES)
      if ((currentMode === 'RACING' || currentMode === 'COUNTDOWN') && physicsEngineRef.current) {
        const player = playerRacerRef.current;
        const aiList = aiRacersRef.current;
        const track = currentTrackResultRef.current;

        if (track) {
          track.updateAnimations(delta, currentTime * 0.001);
        }

        if (player) {
          // If countdown, prevent forward drive but allow wheel spin/rev
          const activeInput = currentMode === 'RACING' 
            ? inputRef.current 
            : { ...inputRef.current, forward: false };

          physicsEngineRef.current.updatePlayer(
            player,
            activeInput,
            delta,
            (notice) => {
              setStuntNotices(prev => [notice, ...prev.slice(0, 4)]);
              setTotalStuntScore(player.stuntScore);
            }
          );

          // AI Racers
          aiList.forEach((ai, idx) => {
            physicsEngineRef.current?.updateAI(ai, currentMode === 'RACING' ? delta : 0, idx, player.totalProgress);
          });

          // Calculate Dynamic Race Positions (Rankings)
          const allRacers = [player, ...aiList].sort((a, b) => b.totalProgress - a.totalProgress);
          const pRank = allRacers.findIndex(r => r.id === 'player') + 1;
          player.rank = pRank;

          // Check if Player Completed All Laps!
          if (player.currentLap > selectedTrack.laps && !player.finished) {
            player.finished = true;
            setFinishRank(pRank);
            setFinalTimeMs(player.totalRaceTime);
            setGameMode('FINISH');
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
            turboAudio.playStunt();
          }

          // Dynamic 3rd-Person Chase Camera
          const carPos = player.pos;
          const carQuat = player.quaternion;

          // Target offset behind car
          const camOffset = new THREE.Vector3(0, 3.2, -7.5).applyQuaternion(carQuat);
          const targetCamPos = carPos.clone().add(camOffset);

          // Camera shake on high speed or boost
          if (player.isBoosting) {
            camShakeRef.current = Math.min(0.4, camShakeRef.current + delta * 2);
          } else {
            camShakeRef.current = Math.max(0, camShakeRef.current - delta * 3);
          }
          if (camShakeRef.current > 0) {
            targetCamPos.x += (Math.random() - 0.5) * camShakeRef.current;
            targetCamPos.y += (Math.random() - 0.5) * camShakeRef.current;
            targetCamPos.z += (Math.random() - 0.5) * camShakeRef.current;
          }

          camera.position.lerp(targetCamPos, delta * 12);

          // Smooth Look-at direction matching vehicle motion
          const lookOffset = new THREE.Vector3(0, 1.2, 3.5).applyQuaternion(carQuat);
          const targetLook = carPos.clone().add(lookOffset);
          if (!camLookInitRef.current) {
            camLookTargetRef.current.copy(targetLook);
            camLookInitRef.current = true;
          } else {
            camLookTargetRef.current.lerp(targetLook, delta * 14);
          }
          camera.lookAt(camLookTargetRef.current);

          // Dynamic FOV Punch (62 -> 76 during boost)
          const targetFov = player.isBoosting ? 76 : 62 + Math.min(8, (player.speedKmH / 200) * 8);
          camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 8);
          camera.updateProjectionMatrix();

          // Sync Live HUD React States throttled
          setPosition(pRank);
          setCurrentLap(Math.min(player.currentLap, selectedTrack.laps));
          setSpeedKmH(Math.round(Math.max(0, player.speedKmH)));
          setBoostReserve(Math.round(player.boostReserve));
          setTrackProgress(Math.round(player.trackProgress * 100));

          if (currentMode === 'RACING') {
            player.totalRaceTime += delta * 1000;
            player.currentLapTime += delta * 1000;
            setRaceTimeMs(Math.round(player.totalRaceTime));
          }

          // -------------------------------------------------------
          // RENDER 2D CANVAS MINIMAP
          // -------------------------------------------------------
          if (minimapCanvasRef.current && track) {
            const mCanvas = minimapCanvasRef.current;
            const mCtx = mCanvas.getContext('2d');
            if (mCtx) {
              const w = mCanvas.width;
              const h = mCanvas.height;
              mCtx.clearRect(0, 0, w, h);

              // Draw track curve footprint
              mCtx.beginPath();
              mCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
              mCtx.lineWidth = 3;

              const mapScale = 0.45;
              const mapCenterX = w / 2;
              const mapCenterY = h / 2;

              for (let i = 0; i <= 60; i++) {
                const pt = track.curve.getPointAt(i / 60);
                const mx = mapCenterX + pt.x * mapScale;
                const my = mapCenterY + pt.z * mapScale;
                if (i === 0) mCtx.moveTo(mx, my);
                else mCtx.lineTo(mx, my);
              }
              mCtx.closePath();
              mCtx.stroke();

              // Draw AI Racers (cyan blips)
              aiList.forEach(ai => {
                const ax = mapCenterX + ai.pos.x * mapScale;
                const ay = mapCenterY + ai.pos.z * mapScale;
                mCtx.fillStyle = ai.color;
                mCtx.beginPath();
                mCtx.arc(ax, ay, 3.5, 0, Math.PI * 2);
                mCtx.fill();
              });

              // Draw Player (large glowing red blip)
              const px = mapCenterX + player.pos.x * mapScale;
              const py = mapCenterY + player.pos.z * mapScale;
              mCtx.fillStyle = '#f43f5e';
              mCtx.beginPath();
              mCtx.arc(px, py, 5, 0, Math.PI * 2);
              mCtx.fill();
              mCtx.strokeStyle = '#ffffff';
              mCtx.lineWidth = 1.5;
              mCtx.stroke();
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // -----------------------------------------------------------
    // CLEANUP ON UNMOUNT
    // -----------------------------------------------------------
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      turboAudio.stopAll();

      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update turntable car color when car or paint changes in Garage
  useEffect(() => {
    if (garageCarGroupRef.current && sceneRef.current) {
      sceneRef.current.remove(garageCarGroupRef.current);
      const customCar = {
        ...selectedCar,
        primaryColor: carPaintColor
      };
      const newCar = createToyCarMesh(customCar);
      newCar.group.position.set(0, 1.2, 0);
      sceneRef.current.add(newCar.group);
      garageCarGroupRef.current = newCar.group;
    }
  }, [selectedCar, carPaintColor]);

  // Audio Toggle
  const toggleSound = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    turboAudio.setMuted(nextMute);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format race timer mm:ss.SS
  const formatTime = (ms: number) => {
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // RENDER COMPONENT & MODALS
  // -------------------------------------------------------------
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[100dvh] max-h-[100dvh] bg-[#070913] text-white overflow-hidden select-none font-sans"
    >
      {/* ------------------------------------------------------- */}
      {/* TOP GLOBAL ACTION BAR (Sound, Fullscreen, Exit)           */}
      {/* ------------------------------------------------------- */}
      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5 text-amber-400" /> : <Maximize2 className="w-5 h-5 text-slate-300" />}
        </button>

        {gameState === 'RACING' && (
          <button
            type="button"
            onClick={() => setGameMode('PAUSED')}
            className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shadow-lg"
            title="Pause Game (Esc / P)"
          >
            <Pause className="w-5 h-5 text-white" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            turboAudio.stopAll();
            onBack();
          }}
          className="h-10 px-3.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 backdrop-blur-md border border-rose-400/40 flex items-center gap-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-lg"
          title="Exit to Portal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">EXIT</span>
        </button>
      </div>

      {/* ------------------------------------------------------- */}
      {/* 1. MAIN MENU SCREEN                                     */}
      {/* ------------------------------------------------------- */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-auto bg-gradient-to-t from-black/80 via-transparent to-black/40">
          {/* Top Brand Logo */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black tracking-widest uppercase mb-3 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
              MINIATURE TOY STUNT RACING
            </div>
            <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-rose-500 drop-shadow-[0_8px_16px_rgba(249,115,22,0.4)]">
              TURBO TRACKS
            </h1>
            <p className="text-sm sm:text-base font-bold text-slate-300 tracking-wider uppercase mt-1">
              BUILD SPEED. DEFY GRAVITY.
            </p>
          </div>

          {/* Center Main Action Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
            <button
              type="button"
              onClick={() => setupRace(selectedTrack, selectedCar, carPaintColor)}
              className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-lg tracking-wider uppercase shadow-[0_10px_25px_rgba(244,63,94,0.5)] active:scale-95 transition-all cursor-pointer border border-rose-300/40"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>QUICK RACE</span>
            </button>

            <button
              type="button"
              onClick={() => setGameMode('TRACK_SELECT')}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm tracking-wide uppercase backdrop-blur-md transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>SELECT TRACK ({selectedTrack.num})</span>
            </button>

            <button
              type="button"
              onClick={() => setGameMode('GARAGE')}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm tracking-wide uppercase backdrop-blur-md transition-all cursor-pointer"
            >
              <Gauge className="w-4 h-4 text-amber-400" />
              <span>CAR GARAGE</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>CONTROLS & HELP</span>
            </button>
          </div>

          {/* Footer Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" /> 5 Original Stunt Tracks</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-cyan-400" /> 360° Loops & Jumps</span>
            <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> High-G Drift & Stunt Combos</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 2. TRACK SELECT SCREEN                                  */}
      {/* ------------------------------------------------------- */}
      {gameState === 'TRACK_SELECT' && (
        <div className="absolute inset-0 z-30 flex flex-col p-6 sm:p-10 pointer-events-auto bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-black tracking-widest text-cyan-400 uppercase">CHOOSE YOUR STUNT ARENA</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white italic tracking-tight">TRACK SELECTION</h2>
            </div>
            <button
              type="button"
              onClick={() => setGameMode('MENU')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              BACK TO MENU
            </button>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {TRACK_CONFIGS.map(tr => {
              const isSelected = selectedTrack.id === tr.id;
              return (
                <div
                  key={tr.id}
                  onClick={() => setSelectedTrack(tr)}
                  className={`relative p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] ring-2 ring-orange-500/50' 
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      TRACK {tr.num}
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${
                      tr.difficulty === 'EASY' ? 'bg-emerald-500/20 text-emerald-400' :
                      tr.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                      tr.difficulty === 'HARD' ? 'bg-rose-500/20 text-rose-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {tr.difficulty}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-1">{tr.name}</h3>
                  <div className="text-xs font-bold text-cyan-400 mb-2">{tr.themeName}</div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{tr.description}</p>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800/80 font-medium">
                    <span>LAPS: {tr.laps}</span>
                    <span>DISTANCE: {tr.lengthMeters}M</span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Confirm Action */}
          <div className="mt-auto flex items-center justify-center">
            <button
              type="button"
              onClick={() => setupRace(selectedTrack, selectedCar, carPaintColor)}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-lg tracking-wider uppercase shadow-[0_10px_25px_rgba(249,115,22,0.5)] active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>RACE {selectedTrack.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 3. CAR GARAGE SCREEN                                    */}
      {/* ------------------------------------------------------- */}
      {gameState === 'GARAGE' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 pointer-events-auto bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-slate-950/90 backdrop-blur-sm">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-black tracking-widest text-amber-400 uppercase">DIE-CAST TOY WORKSHOP</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white italic tracking-tight">GARAGE & TUNING</h2>
            </div>
            <button
              type="button"
              onClick={() => setGameMode('MENU')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              BACK TO MENU
            </button>
          </div>

          {/* Left / Bottom Car Selection & Stat Specs */}
          <div className="flex flex-col lg:flex-row items-end justify-between gap-6 mt-auto">
            {/* Left: Car Roster Buttons */}
            <div className="flex flex-col gap-2.5 w-full max-w-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">SELECT MODEL</span>
              <div className="grid grid-cols-2 gap-2">
                {ORIGINAL_CARS.map(car => {
                  const isCur = selectedCar.id === car.id;
                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => {
                        setSelectedCar(car);
                        setCarPaintColor(car.primaryColor);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isCur 
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black tracking-wide">{car.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{car.bodyStyle.toUpperCase()}</div>
                    </button>
                  );
                })}
              </div>

              {/* Paint Color Swatches */}
              <div className="mt-3">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-2">METALLIC LACQUER FINISH</span>
                <div className="flex items-center gap-2">
                  {['#e11d48', '#0284c7', '#16a34a', '#9333ea', '#f59e0b', '#18181b'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCarPaintColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                        carPaintColor === color ? 'scale-115 border-white shadow-lg' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Selected Car Performance Stats */}
            <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-2xl font-black text-white italic">{selectedCar.name}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  {selectedCar.tagline}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{selectedCar.description}</p>

              {/* Stat Bars */}
              <div className="space-y-2.5">
                {[
                  { label: 'TOP SPEED', val: selectedCar.speed, color: 'bg-cyan-500' },
                  { label: 'ACCELERATION', val: selectedCar.acceleration, color: 'bg-orange-500' },
                  { label: 'HANDLING & DRIFT', val: selectedCar.handling, color: 'bg-emerald-500' },
                  { label: 'NITRO BOOST', val: selectedCar.boost, color: 'bg-rose-500' },
                  { label: 'STUNT ROTATION', val: selectedCar.stunt, color: 'bg-purple-500' }
                ].map(st => (
                  <div key={st.label}>
                    <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                      <span>{st.label}</span>
                      <span>{st.val * 10}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${st.color}`} 
                        style={{ width: `${st.val * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setupRace(selectedTrack, selectedCar, carPaintColor)}
                className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm tracking-wider uppercase shadow-lg transition-all cursor-pointer"
              >
                EQUIP & RACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 4. COUNTDOWN OVERLAY (3... 2... 1... GO!)               */}
      {/* ------------------------------------------------------- */}
      {gameState === 'COUNTDOWN' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="animate-bounce text-8xl sm:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-300 to-orange-500 drop-shadow-[0_15px_30px_rgba(249,115,22,0.8)]">
            {countdownNum}
          </div>
          <div className="text-sm font-bold tracking-widest text-slate-300 uppercase mt-4">
            REV ENGINES
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 5. PROFESSIONAL RACING HUD (TOP & BOTTOM)               */}
      {/* ------------------------------------------------------- */}
      {(gameState === 'RACING' || gameState === 'COUNTDOWN') && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
          {/* TOP HUD ROW */}
          <div className="flex items-start justify-between w-full">
            {/* Top Left: Title, Position & Lap */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-widest text-cyan-400 uppercase bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 backdrop-blur-md">
                  TURBO TRACKS
                </span>
                <span className="text-[11px] font-bold text-slate-300 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 backdrop-blur-md">
                  {selectedTrack.name}
                </span>
              </div>

              {/* Large Position Badge */}
              <div className="flex items-baseline gap-1 bg-slate-950/85 px-4 py-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase mr-1">POS</span>
                <span className="text-4xl font-black italic tracking-tighter text-amber-400">
                  {String(position).padStart(2, '0')}
                </span>
                <span className="text-sm font-bold text-slate-500">
                  / {String(totalRacers).padStart(2, '0')}
                </span>
              </div>

              {/* Lap Indicator */}
              <div className="inline-flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-200">
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>LAP {String(currentLap).padStart(2, '0')} / {String(totalLaps).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Top Center: Track Progress Bar */}
            <div className="hidden sm:flex flex-col items-center w-72 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
              <div className="flex justify-between w-full text-[10px] font-bold text-slate-400 mb-1">
                <span>START</span>
                <span className="text-amber-400">{trackProgress}%</span>
                <span>FINISH</span>
              </div>
              <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full transition-all duration-100"
                  style={{ width: `${trackProgress}%` }}
                />
              </div>
            </div>

            {/* Top Right: Race Timer & Stunt Score */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="bg-slate-950/85 px-4 py-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TIME</div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-white">
                  {formatTime(raceTimeMs)}
                </div>
              </div>

              {totalStuntScore > 0 && (
                <div className="flex items-center gap-1.5 bg-purple-950/80 border border-purple-500/40 px-3 py-1 rounded-xl text-xs font-black text-purple-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>STUNT: {totalStuntScore}</span>
                </div>
              )}
            </div>
          </div>

          {/* FLOATING STUNT SCORE NOTICES (CENTER LEFT) */}
          <div className="absolute left-6 top-36 flex flex-col gap-2 pointer-events-none">
            {stuntNotices.map((st, i) => (
              <div
                key={st.id}
                className="animate-fade-in flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/90 to-amber-500/90 text-white font-black text-sm tracking-wider shadow-lg border border-amber-300/40 backdrop-blur-md"
                style={{ opacity: 1 - i * 0.22 }}
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>{st.label}</span>
              </div>
            ))}
          </div>

          {/* BOTTOM HUD ROW */}
          <div className="flex items-end justify-between w-full">
            {/* Bottom Left: Real-Time Track Minimap */}
            <div className="relative p-2 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-2xl">
              <canvas
                ref={minimapCanvasRef}
                width={120}
                height={120}
                className="w-24 h-24 sm:w-28 sm:h-28"
              />
              <div className="absolute bottom-1 right-2 text-[9px] font-bold text-slate-400 uppercase">
                MAP
              </div>
            </div>

            {/* Bottom Right: Digital Speedometer & Boost Gauge */}
            <div className="flex flex-col items-end gap-2">
              {/* Boost Reserve Meter */}
              <div className="w-36 sm:w-48 bg-slate-950/85 p-2 rounded-xl border border-slate-800 backdrop-blur-md shadow-xl">
                <div className="flex justify-between text-[10px] font-black text-cyan-300 uppercase mb-1">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 fill-cyan-400" /> NITRO BOOST</span>
                  <span>{boostReserve}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                    style={{ width: `${boostReserve}%` }}
                  />
                </div>
              </div>

              {/* Digital Speedometer */}
              <div className="flex items-baseline gap-2 bg-slate-950/90 px-5 py-3 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
                <span className="text-5xl sm:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 drop-shadow-md">
                  {speedKmH}
                </span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  KM/H
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 6. MOBILE TOUCH CONTROLS                                */}
      {/* ------------------------------------------------------- */}
      {(gameState === 'RACING' || gameState === 'COUNTDOWN') && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-end justify-between p-4 sm:hidden pb-6">
          {/* Left: Steering D-Pad & Recover */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            <button
              type="button"
              onTouchStart={() => { inputRef.current.reset = true; }}
              onTouchEnd={() => { inputRef.current.reset = false; }}
              onTouchCancel={() => { inputRef.current.reset = false; }}
              onMouseDown={() => { inputRef.current.reset = true; }}
              onMouseUp={() => { inputRef.current.reset = false; }}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-[10px] font-bold text-amber-400 self-start shadow-md active:scale-95"
            >
              ↺ RECOVER (R)
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onTouchStart={() => { inputRef.current.left = true; }}
                onTouchEnd={() => { inputRef.current.left = false; }}
                onTouchCancel={() => { inputRef.current.left = false; }}
                onMouseDown={() => { inputRef.current.left = true; }}
                onMouseUp={() => { inputRef.current.left = false; }}
                className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-slate-700 border border-slate-700 flex items-center justify-center font-black text-xl text-white shadow-xl active:scale-95"
              >
                ◀
              </button>
              <button
                type="button"
                onTouchStart={() => { inputRef.current.right = true; }}
                onTouchEnd={() => { inputRef.current.right = false; }}
                onTouchCancel={() => { inputRef.current.right = false; }}
                onMouseDown={() => { inputRef.current.right = true; }}
                onMouseUp={() => { inputRef.current.right = false; }}
                className="w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-slate-700 border border-slate-700 flex items-center justify-center font-black text-xl text-white shadow-xl active:scale-95"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Right: Drive, Brake, Drift, Boost */}
          <div className="grid grid-cols-2 gap-2 pointer-events-auto">
            <button
              type="button"
              onTouchStart={() => { inputRef.current.boost = true; }}
              onTouchEnd={() => { inputRef.current.boost = false; }}
              onTouchCancel={() => { inputRef.current.boost = false; }}
              onMouseDown={() => { inputRef.current.boost = true; }}
              onMouseUp={() => { inputRef.current.boost = false; }}
              className="w-16 h-14 rounded-2xl bg-cyan-600/90 active:bg-cyan-500 border border-cyan-400 flex flex-col items-center justify-center font-black text-xs text-white shadow-xl active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>BOOST</span>
            </button>

            <button
              type="button"
              onTouchStart={() => { inputRef.current.drift = true; }}
              onTouchEnd={() => { inputRef.current.drift = false; }}
              onTouchCancel={() => { inputRef.current.drift = false; }}
              onMouseDown={() => { inputRef.current.drift = true; }}
              onMouseUp={() => { inputRef.current.drift = false; }}
              className="w-16 h-14 rounded-2xl bg-purple-600/90 active:bg-purple-500 border border-purple-400 flex flex-col items-center justify-center font-black text-xs text-white shadow-xl active:scale-95"
            >
              <Flame className="w-4 h-4 fill-white" />
              <span>DRIFT</span>
            </button>

            <button
              type="button"
              onTouchStart={() => { inputRef.current.backward = true; }}
              onTouchEnd={() => { inputRef.current.backward = false; }}
              onTouchCancel={() => { inputRef.current.backward = false; }}
              onMouseDown={() => { inputRef.current.backward = true; }}
              onMouseUp={() => { inputRef.current.backward = false; }}
              className="w-16 h-14 rounded-2xl bg-rose-700/90 active:bg-rose-600 border border-rose-500 flex flex-col items-center justify-center font-black text-xs text-white shadow-xl active:scale-95"
            >
              <span>BRAKE</span>
            </button>

            <button
              type="button"
              onTouchStart={() => { inputRef.current.forward = true; }}
              onTouchEnd={() => { inputRef.current.forward = false; }}
              onTouchCancel={() => { inputRef.current.forward = false; }}
              onMouseDown={() => { inputRef.current.forward = true; }}
              onMouseUp={() => { inputRef.current.forward = false; }}
              className="w-16 h-14 rounded-2xl bg-emerald-600/90 active:bg-emerald-500 border border-emerald-400 flex flex-col items-center justify-center font-black text-xs text-white shadow-xl active:scale-95"
            >
              <span>GAS</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 7. PAUSED MODAL OVERLAY                                 */}
      {/* ------------------------------------------------------- */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-center">
            <h2 className="text-3xl font-black italic tracking-tight text-white mb-2">RACE PAUSED</h2>
            <p className="text-xs text-slate-400 mb-6">Engine idling in pit lane.</p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setGameMode('RACING')}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-sm uppercase shadow-lg transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>RESUME RACE</span>
              </button>

              <button
                type="button"
                onClick={() => setupRace(selectedTrack, selectedCar, carPaintColor)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESTART TRACK</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('TRACK_SELECT')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>TRACK SELECTION</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('MENU')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>MAIN MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 8. FINISH & RESULTS MODAL                               */}
      {/* ------------------------------------------------------- */}
      {gameState === 'FINISH' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black uppercase mb-3">
              <Trophy className="w-4 h-4" />
              RACE COMPLETED!
            </div>

            <h2 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white mb-1">
              {finishRank === 1 ? '1ST PLACE VICTORY!' : finishRank === 2 ? '2ND PLACE PODIUM' : `${finishRank}TH PLACE FINISH`}
            </h2>
            <p className="text-xs text-slate-400 mb-6">{selectedTrack.name} • {selectedTrack.laps} LAPS</p>

            {/* Results Stat Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL TIME</div>
                <div className="text-xl font-mono font-black text-white">{formatTime(finalTimeMs)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">STUNT SCORE</div>
                <div className="text-xl font-black text-amber-400">+{totalStuntScore.toLocaleString()}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">CAR MODEL</div>
                <div className="text-sm font-black text-cyan-300">{selectedCar.name}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">DIFFICULTY</div>
                <div className="text-sm font-black text-purple-300">{selectedTrack.difficulty}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setupRace(selectedTrack, selectedCar, carPaintColor)}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-sm uppercase shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RACE AGAIN</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('TRACK_SELECT')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>NEXT TRACK</span>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('MENU')}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>MAIN MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- */}
      {/* 9. SETTINGS & CONTROLS MODAL                            */}
      {/* ------------------------------------------------------- */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black italic text-white">CONTROLS & STUNTS</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 mb-6">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400">W / UP ARROW</span>
                <span>Accelerate (or Front Flip in Air)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400">S / DOWN ARROW</span>
                <span>Brake / Reverse (or Back Flip in Air)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400">A / D or LEFT / RIGHT</span>
                <span>Steer Left / Right (or Barrel Roll in Air)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-cyan-400">SPACEBAR</span>
                <span>Power Drift (Charges Boost!)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-cyan-400">SHIFT</span>
                <span>Rocket Nitro Boost</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-rose-400">P / ESC</span>
                <span>Pause Race</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-bold text-emerald-400">R</span>
                <span>Recover & Straighten Car</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs uppercase transition-colors"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
