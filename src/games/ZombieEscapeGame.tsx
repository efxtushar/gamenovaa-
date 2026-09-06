import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Trophy,
  Skull,
  Crosshair,
  Heart,
  Volume2,
  VolumeX,
  Pause,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Settings as SettingsIcon,
  HelpCircle,
  X,
  Flame,
  ArrowUp
} from 'lucide-react';
import '../styles/zombie-escape.css';
import { buildAbandonedCity, CityObstacle } from './zombie3d/cityBuilder';
import { createPlayerMesh, createZombieMesh, Player3DResult, Zombie3DResult } from './zombie3d/characterModels';
import { zombieAudio } from './zombie3d/audioSynthesizer';
import { GameMode, ZombieType } from './zombie3d/types';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface ActiveZombie {
  id: number;
  type: ZombieType;
  meshData: Zombie3DResult;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  isDead: boolean;
  deathTimer: number;
}

interface BulletTracer {
  mesh: THREE.Line;
  life: number;
  maxLife: number;
}

interface ShellCasing {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
}

interface ImpactSpark {
  mesh: THREE.Points;
  vels: THREE.Vector3[];
  life: number;
}

export const ZombieEscapeGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Game State
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // HUD stats
  const [health, setHealth] = useState(100);
  const [wave, setWave] = useState(1);
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);
  const [kills, setKills] = useState(0);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(30);
  const [maxAmmo] = useState(30);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [isFiringVisual, setIsFiringVisual] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);

  // Settings & Toggles
  const [soundEnabled, setSoundEnabled] = useState(!zombieAudio.getIsMuted());
  const [sfxVolume, setSfxVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Mobile virtual joystick state
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef({ x: 0, y: 0 });

  // Right-side touch aim / camera rotation state
  const aimTouchIdRef = useRef<number | null>(null);
  const lastAimTouchRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Engine Refs
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    playerData: Player3DResult | null;
    playerPos: THREE.Vector3;
    playerRotY: number;
    targetAimAngle: number;
    cameraYaw: number;
    cameraPitch: number;
    cameraDistance: number;
    cameraHeight: number;
    obstacles: CityObstacle[];
    spawnPoints: THREE.Vector3[];
    roadBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    updateEnvironment: ((delta: number, time: number) => void) | null;
    zombies: ActiveZombie[];
    bullets: BulletTracer[];
    shells: ShellCasing[];
    sparks: ImpactSpark[];
    groundPlane: THREE.Plane;
    raycaster: THREE.Raycaster;
    mouseNDC: THREE.Vector2;
    keys: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      fire: boolean;
      reload: boolean;
    };
    isJumping: boolean;
    jumpVelocityY: number;
    cameraTargetPos: THREE.Vector3;
    cameraLookPos: THREE.Vector3;
    nextZombieId: number;
    waveSpawnQuota: number;
    waveSpawnedCount: number;
    spawnTimer: number;
    betweenWavesTimer: number;
    reloadStartTime: number;
    lastShotTime: number;
    animationFrameId: number;
    lastTime: number;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    playerData: null,
    playerPos: new THREE.Vector3(0, 0, 0),
    playerRotY: 0,
    targetAimAngle: 0,
    cameraYaw: 0, // In radians: 0 faces straight ahead (+Z)
    cameraPitch: 0.35, // Clear downward viewing angle: road occupies majority of screen
    cameraDistance: 4.8, // Closer third-person distance: removes empty space
    cameraHeight: 2.4,
    obstacles: [],
    spawnPoints: [],
    roadBounds: { minX: -19, maxX: 19, minZ: -110, maxZ: 110 },
    updateEnvironment: null,
    zombies: [],
    bullets: [],
    shells: [],
    sparks: [],
    groundPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    raycaster: new THREE.Raycaster(),
    mouseNDC: new THREE.Vector2(0, 0),
    keys: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      fire: false,
      reload: false
    },
    isJumping: false,
    jumpVelocityY: 0,
    cameraTargetPos: new THREE.Vector3(0, 2.8, -5.0),
    cameraLookPos: new THREE.Vector3(0, 1.45, 0),
    nextZombieId: 1,
    waveSpawnQuota: 8,
    waveSpawnedCount: 0,
    spawnTimer: 0,
    betweenWavesTimer: 0,
    reloadStartTime: 0,
    lastShotTime: 0,
    animationFrameId: 0,
    lastTime: performance.now()
  });

  // Touch Detection & Fullscreen Sync
  useEffect(() => {
    const checkTouch = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 1024
      );
    };
    setIsTouchDevice(checkTouch());

    const handleResize = () => {
      setIsTouchDevice(checkTouch());
    };
    window.addEventListener('resize', handleResize);

    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS 3D CITY SCENE
  // -------------------------------------------------------------
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // 1. Renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.70; // 25-35% boosted visibility for clear night-time gameplay
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Scene with Atmospheric Midnight Sky and Soft Blue Ambient Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131f33);
    scene.fog = new THREE.FogExp2(0x18243b, 0.005); // Soft atmospheric mist: keeps buildings and zombies clearly visible

    // 3. Camera (56° FOV frames roadway cleanly, minimizing empty sky)
    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 300);
    camera.position.set(0, 2.8, -4.8);

    // 4. Lighting (Enhanced Hemisphere Sky/Ground Ambient + Cool Moonlight + Back Fill)
    const hemiLight = new THREE.HemisphereLight(0x94b8e8, 0x475569, 2.9);
    scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0xdbeafe, 3.4);
    moonLight.position.set(25, 45, -30);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 100;
    moonLight.shadow.camera.left = -25;
    moonLight.shadow.camera.right = 25;
    moonLight.shadow.camera.top = 25;
    moonLight.shadow.camera.bottom = -25;
    scene.add(moonLight);

    // Secondary opposing rim/fill light to ensure character & zombie silhouettes never blend into black
    const fillLight = new THREE.DirectionalLight(0x7ea0c7, 2.2);
    fillLight.position.set(-25, 30, 35);
    scene.add(fillLight);

    // 5. Build Detailed Abandoned Urban City
    const city = buildAbandonedCity();
    scene.add(city.group);

    // 6. Build 3D Player Character
    const player = createPlayerMesh();
    // Dedicated soft 360° player aura light so player and nearby zombies are clearly highlighted
    const playerAuraLight = new THREE.PointLight(0x38bdf8, 3.0, 16);
    playerAuraLight.position.set(0, 1.6, 0);
    player.group.add(playerAuraLight);
    scene.add(player.group);

    // Store engine refs
    const eng = engineRef.current;
    eng.renderer = renderer;
    eng.scene = scene;
    eng.camera = camera;
    eng.playerData = player;
    eng.obstacles = city.obstacles;
    eng.spawnPoints = city.spawnPoints;
    eng.roadBounds = city.roadBounds;
    eng.updateEnvironment = city.updateEnvironment;

    // Resize Observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0 && eng.renderer && eng.camera) {
          eng.camera.aspect = w / h;
          eng.camera.updateProjectionMatrix();
          eng.renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (eng.animationFrameId) {
        cancelAnimationFrame(eng.animationFrameId);
      }
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // -------------------------------------------------------------
  // JUMP LOGIC (RESPONSIVE, NO INFINITE JUMPING)
  // -------------------------------------------------------------
  const triggerJump = useCallback(() => {
    const eng = engineRef.current;
    if (gameMode !== 'PLAYING') return;
    // Only jump if grounded on pavement (prevent infinite jumping)
    if (!eng.isJumping && eng.playerPos.y <= 0.05) {
      eng.isJumping = true;
      eng.jumpVelocityY = 6.6; // Crisp responsive jump arc
      zombieAudio.playJump();
    }
  }, [gameMode]);

  // -------------------------------------------------------------
  // RELOAD LOGIC (EXACT 1.4 SECONDS WITH PROGRESS)
  // -------------------------------------------------------------
  const startReload = useCallback(() => {
    const eng = engineRef.current;
    if (eng.keys.reload || eng.reloadStartTime > 0) return;
    if (ammo >= maxAmmo) return;

    eng.reloadStartTime = performance.now();
    setIsReloading(true);
    setReloadProgress(0);
    zombieAudio.playReload();
  }, [ammo, maxAmmo]);

  // -------------------------------------------------------------
  // FIRING LOGIC
  // -------------------------------------------------------------
  const fireWeapon = useCallback(() => {
    const eng = engineRef.current;
    const now = performance.now();

    // Cannot shoot if reloading or on fire cooldown
    if (eng.reloadStartTime > 0) return;
    if (now - eng.lastShotTime < 115) return; // ~520 RPM

    // Auto-reload on empty clip
    if (ammo <= 0) {
      startReload();
      return;
    }

    eng.lastShotTime = now;
    setAmmo(prev => {
      const nextAmmo = prev - 1;
      if (nextAmmo <= 0) {
        // Auto-reload immediately
        startReload();
      }
      return nextAmmo;
    });

    // Sound
    zombieAudio.playGunshot();

    // Visual recoil & muzzle flash
    setIsFiringVisual(true);
    setTimeout(() => setIsFiringVisual(false), 60);

    // Spawn Bullet Tracer & Perform Raycast Collision
    if (!eng.scene || !eng.playerData || !eng.camera) return;

    const muzzleWorldPos = eng.playerData.getMuzzleWorldPos();

    // Fire precisely towards the center reticle crosshair where camera is looking
    const camDir = new THREE.Vector3();
    eng.camera.getWorldDirection(camDir);
    const camAimPoint = eng.camera.position.clone().add(camDir.clone().multiplyScalar(50));
    const aimDir = camAimPoint.clone().sub(muzzleWorldPos).normalize();

    // Slight rifle spread
    aimDir.x += (Math.random() - 0.5) * 0.025;
    aimDir.y += (Math.random() - 0.5) * 0.025;
    aimDir.z += (Math.random() - 0.5) * 0.025;
    aimDir.normalize();

    // Check Raycast against active zombies
    let hitZombie: ActiveZombie | null = null;
    let closestDist = 55; // max bullet distance
    const hitPoint = muzzleWorldPos.clone().add(aimDir.clone().multiplyScalar(closestDist));

    for (const z of eng.zombies) {
      if (z.isDead) continue;
      // Test against zombie center-mass (torso height)
      const zombieTorso = z.meshData.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      const toZombie = zombieTorso.sub(muzzleWorldPos);
      const proj = toZombie.dot(aimDir);
      if (proj > 0 && proj < closestDist) {
        const perpDist = toZombie.clone().sub(aimDir.clone().multiplyScalar(proj)).length();
        const hitRadius = z.type === 'brute' ? 1.3 : 0.85;
        if (perpDist < hitRadius) {
          closestDist = proj;
          hitZombie = z;
          hitPoint.copy(muzzleWorldPos).add(aimDir.clone().multiplyScalar(proj));
        }
      }
    }

    // Create Tracer Line
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      muzzleWorldPos,
      hitPoint
    ]);
    const tracerMat = new THREE.LineBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.95
    });
    const tracerLine = new THREE.Line(tracerGeo, tracerMat);
    eng.scene.add(tracerLine);
    eng.bullets.push({ mesh: tracerLine, life: 0.06, maxLife: 0.06 });

    // Spent brass shell casing
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.3 });
    const shellMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6), shellMat);
    shellMesh.position.copy(muzzleWorldPos);
    eng.scene.add(shellMesh);

    eng.shells.push({
      mesh: shellMesh,
      vel: new THREE.Vector3(
        -Math.cos(eng.playerRotY) * 2.5 + (Math.random() - 0.5) * 0.5,
        1.8 + Math.random() * 0.8,
        Math.sin(eng.playerRotY) * 2.5 + (Math.random() - 0.5) * 0.5
      ),
      rotVel: new THREE.Vector3(Math.random() * 15, Math.random() * 15, Math.random() * 15),
      life: 1.2
    });

    // Handle Zombie Damage
    if (hitZombie) {
      zombieAudio.playBulletImpact(true);
      hitZombie.hp -= 28; // Rifle damage
      hitZombie.meshData.flashDamage();

      // Spark/Blood particles at hit point
      const sparkCount = 8;
      const sparkGeo = new THREE.BufferGeometry();
      const sparkPos = new Float32Array(sparkCount * 3);
      const sparkVels: THREE.Vector3[] = [];
      for (let i = 0; i < sparkCount; i++) {
        sparkPos[i * 3] = hitPoint.x;
        sparkPos[i * 3 + 1] = hitPoint.y;
        sparkPos[i * 3 + 2] = hitPoint.z;
        sparkVels.push(new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2.5 + 0.5,
          (Math.random() - 0.5) * 3
        ));
      }
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: 0x991b1b,
        size: 0.12,
        transparent: true,
        opacity: 0.9
      });
      const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
      eng.scene.add(sparkPoints);
      eng.sparks.push({ mesh: sparkPoints, vels: sparkVels, life: 0.3 });

      if (hitZombie.hp <= 0 && !hitZombie.isDead) {
        hitZombie.isDead = true;
        setKills(prev => prev + 1);
        setScore(prev => prev + hitZombie.meshData.config.scoreValue);
      }
    } else {
      // Concrete/Ground Impact sound
      zombieAudio.playBulletImpact(false);
    }
  }, [ammo, startReload]);

  // -------------------------------------------------------------
  // SPAWN ZOMBIES (Walker, Runner, Brute)
  // -------------------------------------------------------------
  const spawnZombie = useCallback((type: ZombieType) => {
    const eng = engineRef.current;
    if (!eng.scene || eng.spawnPoints.length === 0) return;

    // Pick spawn point furthest or around corners from player
    const spawnIdx = Math.floor(Math.random() * eng.spawnPoints.length);
    const origin = eng.spawnPoints[spawnIdx];
    const spawnPos = new THREE.Vector3(
      origin.x + (Math.random() - 0.5) * 3,
      0,
      origin.z + (Math.random() - 0.5) * 3
    );

    const meshData = createZombieMesh(type);
    meshData.group.position.copy(spawnPos);
    eng.scene.add(meshData.group);

    const activeZ: ActiveZombie = {
      id: eng.nextZombieId++,
      type,
      meshData,
      hp: meshData.config.hp,
      maxHp: meshData.config.maxHp,
      speed: meshData.config.speed * (1 + (wave - 1) * 0.04), // gentle scaling
      damage: meshData.config.damage,
      attackCooldown: 0,
      isDead: false,
      deathTimer: 0
    };

    eng.zombies.push(activeZ);
    zombieAudio.playZombieGroan(type === 'brute');
  }, [wave]);

  // -------------------------------------------------------------
  // START / RESTART GAME
  // -------------------------------------------------------------
  const startGame = useCallback(() => {
    const eng = engineRef.current;
    setGameMode('PLAYING');
    setHealth(100);
    setWave(1);
    setKills(0);
    setScore(0);
    setAmmo(30);
    setIsReloading(false);
    setReloadProgress(0);
    setWaveAnnouncement('WAVE 1 - THE OUTBREAK');
    setTimeout(() => setWaveAnnouncement(null), 3000);

    // Reset player
    eng.playerPos.set(0, 0, 0);
    eng.playerRotY = 0;
    eng.reloadStartTime = 0;
    eng.waveSpawnQuota = 8;
    eng.waveSpawnedCount = 0;
    eng.spawnTimer = 0;
    eng.betweenWavesTimer = 0;

    // Clear old zombies & particles
    eng.zombies.forEach(z => {
      eng.scene?.remove(z.meshData.group);
    });
    eng.zombies = [];

    eng.bullets.forEach(b => eng.scene?.remove(b.mesh));
    eng.bullets = [];

    eng.shells.forEach(s => eng.scene?.remove(s.mesh));
    eng.shells = [];

    eng.sparks.forEach(sp => eng.scene?.remove(sp.mesh));
    eng.sparks = [];

    // Ambient night rain/wind sound
    zombieAudio.startAmbience();
  }, []);

  // -------------------------------------------------------------
  // INPUT EVENT LISTENERS (KEYBOARD & MOUSE)
  // -------------------------------------------------------------
  useEffect(() => {
    const eng = engineRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameMode !== 'PLAYING') {
        if (e.code === 'Escape' && gameMode === 'PAUSED') {
          setGameMode('PLAYING');
        }
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          eng.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          eng.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          eng.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          eng.keys.right = true;
          break;
        case 'KeyR':
          startReload();
          break;
        case 'Space':
          e.preventDefault();
          triggerJump();
          break;
        case 'KeyP':
        case 'Escape':
          setGameMode('PAUSED');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          eng.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          eng.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          eng.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          eng.keys.right = false;
          break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (gameMode !== 'PLAYING') return;

      let dx = e.movementX;
      let dy = e.movementY;

      // In case movementX is not supported or not in pointer lock
      if (dx === undefined || (dx === 0 && dy === 0 && !document.pointerLockElement)) {
        if (lastMousePosRef.current) {
          dx = e.clientX - lastMousePosRef.current.x;
          dy = e.clientY - lastMousePosRef.current.y;
        } else {
          dx = 0;
          dy = 0;
        }
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      // Dead-zone check: filter out tiny sub-pixel jitters
      const deadZone = 0.5;
      if (Math.abs(dx) < deadZone) dx = 0;
      if (Math.abs(dy) < deadZone) dy = 0;

      if (dx !== 0 || dy !== 0) {
        const mouseSensitivity = 0.0022; // Natural, smooth sensitivity for precision aiming
        // Move mouse RIGHT -> camera yaw turns RIGHT
        // Move mouse LEFT -> camera yaw turns LEFT
        eng.cameraYaw += dx * mouseSensitivity;
        // Move mouse UP (dy < 0) -> camera pitch tilts UP
        // Move mouse DOWN (dy > 0) -> camera pitch tilts DOWN
        eng.cameraPitch = Math.max(-0.65, Math.min(0.65, eng.cameraPitch - dy * mouseSensitivity));
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameMode !== 'PLAYING') return;
      if (e.button === 0) {
        eng.keys.fire = true;
        fireWeapon();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        eng.keys.fire = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameMode, startReload, fireWeapon, triggerJump]);

  // Click canvas to engage pointer lock for desktop mouse aiming
  const handleCanvasClick = useCallback(() => {
    if (gameMode === 'PLAYING' && !isTouchDevice && canvasContainerRef.current) {
      try {
        if (document.pointerLockElement !== canvasContainerRef.current) {
          canvasContainerRef.current.requestPointerLock?.();
        }
      } catch {}
    }
  }, [gameMode, isTouchDevice]);

  // -------------------------------------------------------------
  // MOBILE TOUCH HANDLERS (JOYSTICK, RIGHT-SIDE AIM DRAG, FIRE)
  // -------------------------------------------------------------
  const processJoystickCoord = useCallback((clientX: number, clientY: number) => {
    const center = joystickCenterRef.current;
    let dx = clientX - center.x;
    let dy = clientY - center.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 42;
    const deadzone = 8;

    if (dist > maxRadius) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * maxRadius;
      dy = Math.sin(angle) * maxRadius;
    }

    setJoystickPos({ x: dx, y: dy });

    const eng = engineRef.current;
    if (dist < deadzone) {
      eng.keys.forward = false;
      eng.keys.backward = false;
      eng.keys.left = false;
      eng.keys.right = false;
      return;
    }

    const normX = dx / dist;
    const normY = dy / dist;
    const threshold = 0.38;

    eng.keys.left = normX < -threshold;
    eng.keys.right = normX > threshold;
    eng.keys.forward = normY < -threshold; // up moves forward relative to camera
    eng.keys.backward = normY > threshold;
    // Note: Joystick strictly controls movement only. It NEVER alters camera rotation!
  }, []);

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    joystickTouchIdRef.current = touch.identifier;
    const rect = e.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    processJoystickCoord(touch.clientX, touch.clientY);
  }, [processJoystickCoord]);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        processJoystickCoord(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [processJoystickCoord]);

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        e.preventDefault();
        e.stopPropagation();
        joystickTouchIdRef.current = null;
        setJoystickPos({ x: 0, y: 0 });
        const eng = engineRef.current;
        eng.keys.forward = false;
        eng.keys.backward = false;
        eng.keys.left = false;
        eng.keys.right = false;
        break;
      }
    }
  }, []);

  // Right-side touch surface for manual camera rotation / aiming
  const handleAimTouchStart = useCallback((e: React.TouchEvent) => {
    if (aimTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    aimTouchIdRef.current = touch.identifier;
    lastAimTouchRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleAimTouchMove = useCallback((e: React.TouchEvent) => {
    if (aimTouchIdRef.current === null) return;
    const eng = engineRef.current;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === aimTouchIdRef.current) {
        let dx = touch.clientX - lastAimTouchRef.current.x;
        let dy = touch.clientY - lastAimTouchRef.current.y;
        lastAimTouchRef.current = { x: touch.clientX, y: touch.clientY };

        // Dead-zone check to prevent accidental micro tremors
        if (Math.hypot(dx, dy) < 1.0) return;

        const touchSensitivity = 0.0042; // Smooth, responsive, accurate
        // Touch swipe RIGHT (dx > 0) -> camera turns RIGHT
        // Touch swipe LEFT (dx < 0) -> camera turns LEFT
        eng.cameraYaw += dx * touchSensitivity;
        // Touch swipe UP (dy < 0) -> camera tilts UP
        // Touch swipe DOWN (dy > 0) -> camera tilts DOWN
        eng.cameraPitch = Math.max(-0.65, Math.min(0.65, eng.cameraPitch - dy * touchSensitivity));
        break;
      }
    }
  }, []);

  const handleAimTouchEnd = useCallback((e: React.TouchEvent) => {
    if (aimTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === aimTouchIdRef.current) {
        aimTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  const handleMobileFireStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(12); } catch {}
    }

    const eng = engineRef.current;
    eng.keys.fire = true;
    fireWeapon();
  }, [fireWeapon]);

  const handleMobileFireEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    engineRef.current.keys.fire = false;
  }, []);

  // -------------------------------------------------------------
  // MAIN ANIMATION LOOP (PHYSICS, AI, CAMERA, RENDERING)
  // -------------------------------------------------------------
  useEffect(() => {
    const eng = engineRef.current;

    const animate = () => {
      eng.animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - eng.lastTime) / 1000, 0.1);
      eng.lastTime = now;

      if (!eng.renderer || !eng.scene || !eng.camera || !eng.playerData) return;

      // Update atmospheric particles and flickering streetlights
      if (eng.updateEnvironment) {
        eng.updateEnvironment(delta, now * 0.001);
      }

      if (gameMode === 'PLAYING') {
        // -------------------------------------------------------
        // 1. RELOAD PROGRESSION (1.4s EXACT)
        // -------------------------------------------------------
        if (eng.reloadStartTime > 0) {
          const elapsed = now - eng.reloadStartTime;
          const RELOAD_DURATION_MS = 1400;
          if (elapsed >= RELOAD_DURATION_MS) {
            eng.reloadStartTime = 0;
            setAmmo(maxAmmo);
            setIsReloading(false);
            setReloadProgress(0);
          } else {
            const pct = Math.min(100, Math.floor((elapsed / RELOAD_DURATION_MS) * 100));
            setReloadProgress(pct);
          }
        }

        // -------------------------------------------------------
        // 2. CONTINUOUS FIRING WHEN TRIGGER HELD
        // -------------------------------------------------------
        if (eng.keys.fire) {
          fireWeapon();
        }

        // -------------------------------------------------------
        // 3. PLAYER MOVEMENT & ROTATION (CAMERA-RELATIVE)
        // -------------------------------------------------------
        let inputX = 0;
        let inputZ = 0;
        if (eng.keys.forward) inputZ += 1;
        if (eng.keys.backward) inputZ -= 1;
        if (eng.keys.left) inputX -= 1;
        if (eng.keys.right) inputX += 1;

        const isMoving = inputX !== 0 || inputZ !== 0;
        const playerSpeed = 5.2; // comfortable sprint speed

        if (isMoving) {
          const moveLen = Math.hypot(inputX, inputZ);
          const normX = inputX / moveLen;
          const normZ = inputZ / moveLen;

          // Transform direction relative to manual camera horizontal orientation:
          // Moving forward (W or joystick up) travels in the direction camera is pointing
          const forwardX = Math.sin(eng.cameraYaw);
          const forwardZ = Math.cos(eng.cameraYaw);
          const rightX = Math.cos(eng.cameraYaw);
          const rightZ = -Math.sin(eng.cameraYaw);

          const worldMoveX = forwardX * normZ + rightX * normX;
          const worldMoveZ = forwardZ * normZ + rightZ * normX;

          const nextX = eng.playerPos.x + worldMoveX * playerSpeed * delta;
          const nextZ = eng.playerPos.z + worldMoveZ * playerSpeed * delta;

          // Road boundaries
          const clampedX = Math.max(eng.roadBounds.minX, Math.min(eng.roadBounds.maxX, nextX));
          const clampedZ = Math.max(eng.roadBounds.minZ, Math.min(eng.roadBounds.maxZ, nextZ));

          // Obstacle collision check (cars, barricades, lampposts)
          let collides = false;
          for (const obs of eng.obstacles) {
            const d = Math.hypot(clampedX - obs.x, clampedZ - obs.z);
            if (d < obs.radius + 0.5) {
              collides = true;
              break;
            }
          }

          if (!collides) {
            eng.playerPos.x = clampedX;
            eng.playerPos.z = clampedZ;
          }
        }

        // Jumping physics
        if (eng.isJumping) {
          eng.playerPos.y += eng.jumpVelocityY * delta;
          eng.jumpVelocityY -= 19.6 * delta; // Crisp responsive gravity
          if (eng.playerPos.y <= 0) {
            eng.playerPos.y = 0;
            eng.isJumping = false;
            eng.jumpVelocityY = 0;
          }
        }

        // Player model smoothly faces the camera yaw (aim direction)
        let diff = eng.cameraYaw - eng.playerRotY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        eng.playerRotY += diff * Math.min(delta * 18, 1);

        eng.playerData.group.position.copy(eng.playerPos);
        eng.playerData.group.rotation.y = eng.playerRotY;

        // Player Model Animation
        eng.playerData.updateAnimation(
          delta,
          isMoving,
          isFiringVisual,
          eng.reloadStartTime > 0,
          playerSpeed
        );

        // -------------------------------------------------------
        // 4. THIRD-PERSON CAMERA SYSTEM (MANUAL ROTATION ONLY)
        // -------------------------------------------------------
        // The camera NEVER rotates automatically.
        // It stays strictly fixed at user-controlled cameraYaw and cameraPitch.
        // As the player moves, the camera translates smoothly with the player without any angle drift or spin.
        const cosPitch = Math.cos(eng.cameraPitch);
        const sinPitch = Math.sin(eng.cameraPitch);

        const forwardX = Math.sin(eng.cameraYaw);
        const forwardZ = Math.cos(eng.cameraYaw);
        const rightX = Math.cos(eng.cameraYaw);
        const rightZ = -Math.sin(eng.cameraYaw);

        // Direction the camera is looking
        const lookDirX = forwardX * cosPitch;
        const lookDirY = sinPitch;
        const lookDirZ = forwardZ * cosPitch;

        // Shoulder anchor: slightly offset over the right shoulder so crosshair has clear view
        const shoulderOffset = 0.45;
        const anchorX = eng.playerPos.x + rightX * shoulderOffset;
        const anchorY = eng.playerPos.y + 1.65;
        const anchorZ = eng.playerPos.z + rightZ * shoulderOffset;

        // Position camera behind anchor along reverse look direction
        const targetCamX = anchorX - lookDirX * eng.cameraDistance;
        const targetCamY = Math.max(0.4, anchorY - lookDirY * eng.cameraDistance);
        const targetCamZ = anchorZ - lookDirZ * eng.cameraDistance;

        eng.camera.position.set(targetCamX, targetCamY, targetCamZ);
        eng.camera.lookAt(targetCamX + lookDirX * 50, targetCamY + lookDirY * 50, targetCamZ + lookDirZ * 50);

        // -------------------------------------------------------
        // 5. WAVE SPAWNING & DIFFICULTY PROGRESSION
        // -------------------------------------------------------
        const aliveZombies = eng.zombies.filter(z => !z.isDead);

        // If wave finished and all zombies dead, trigger next wave!
        if (eng.waveSpawnedCount >= eng.waveSpawnQuota && aliveZombies.length === 0) {
          if (eng.betweenWavesTimer === 0) {
            eng.betweenWavesTimer = 3.5;
            confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
            zombieAudio.playWaveClear();
            setWaveAnnouncement(`WAVE ${wave} SURVIVED!`);
          } else {
            eng.betweenWavesTimer -= delta;
            if (eng.betweenWavesTimer <= 0) {
              eng.betweenWavesTimer = 0;
              const nextWave = wave + 1;
              setWave(nextWave);
              eng.waveSpawnQuota = 8 + nextWave * 4;
              eng.waveSpawnedCount = 0;
              setWaveAnnouncement(`WAVE ${nextWave} - INCOMING`);
              setTimeout(() => setWaveAnnouncement(null), 2500);
            }
          }
        }

        // Spawn next zombie if below quota and interval passed
        if (eng.waveSpawnedCount < eng.waveSpawnQuota) {
          eng.spawnTimer += delta;
          const spawnInterval = Math.max(0.6, 2.0 - wave * 0.12);
          if (eng.spawnTimer >= spawnInterval) {
            eng.spawnTimer = 0;
            eng.waveSpawnedCount++;

            // Pick zombie type based on wave
            let zType: ZombieType = 'walker';
            const rand = Math.random();
            if (wave >= 3 && rand < 0.22) {
              zType = 'brute';
            } else if (wave >= 2 && rand < 0.45) {
              zType = 'runner';
            }
            spawnZombie(zType);
          }
        }

        // -------------------------------------------------------
        // 6. ZOMBIE AI (OPTIMIZED PATHING, ATTACKING, RECYCLING)
        // -------------------------------------------------------
        for (let i = eng.zombies.length - 1; i >= 0; i--) {
          const z = eng.zombies[i];
          if (z.isDead) {
            z.deathTimer += delta;
            z.meshData.updateAnimation(delta, false, false, true);
            if (z.deathTimer > 2.5) {
              // Recycle and remove from scene and memory
              if (eng.scene) eng.scene.remove(z.meshData.group);
              eng.zombies.splice(i, 1);
            }
            continue;
          }

          const zPos = z.meshData.group.position;
          const distToPlayer = Math.hypot(zPos.x - eng.playerPos.x, zPos.z - eng.playerPos.z);

          // Rotate to face player
          const dx = eng.playerPos.x - zPos.x;
          const dz = eng.playerPos.z - zPos.z;
          const targetAngle = Math.atan2(dx, dz);
          z.meshData.group.rotation.y = THREE.MathUtils.lerp(
            z.meshData.group.rotation.y,
            targetAngle,
            delta * 6
          );

          // Attack when close (< 1.5m)
          const isAttacking = distToPlayer < (z.type === 'brute' ? 2.0 : 1.4);

          if (isAttacking) {
            z.attackCooldown -= delta;
            if (z.attackCooldown <= 0) {
              z.attackCooldown = z.meshData.config.attackInterval;

              // Deal damage to player
              setHealth(prevHp => {
                const nextHp = Math.max(0, prevHp - z.damage);
                if (nextHp <= 0) {
                  // Player Death
                  setGameMode('GAMEOVER');
                  zombieAudio.playGameOver();
                  if (onGameOver) onGameOver(score);
                }
                return nextHp;
              });

              zombieAudio.playPlayerHit();
              setDamageFlash(true);
              setTimeout(() => setDamageFlash(false), 200);
            }
          } else {
            // Move toward player
            const forwardX = Math.sin(z.meshData.group.rotation.y);
            const forwardZ = Math.cos(z.meshData.group.rotation.y);

            // Simple separation from nearby zombies
            let sepX = 0;
            let sepZ = 0;
            for (let j = 0; j < eng.zombies.length; j++) {
              const other = eng.zombies[j];
              if (other.id === z.id || other.isDead) continue;
              const ox = zPos.x - other.meshData.group.position.x;
              const oz = zPos.z - other.meshData.group.position.z;
              const d = Math.hypot(ox, oz);
              if (d < 1.2 && d > 0.01) {
                const push = (1.2 - d) / d;
                sepX += ox * push;
                sepZ += oz * push;
              }
            }

            zPos.x += (forwardX * z.speed + sepX * 1.5) * delta;
            zPos.z += (forwardZ * z.speed + sepZ * 1.5) * delta;
          }

          z.meshData.updateAnimation(delta, !isAttacking, isAttacking, false);
        }

        // -------------------------------------------------------
        // 7. PARTICLES & BULLETS UPDATE
        // -------------------------------------------------------
        // Tracers
        for (let i = eng.bullets.length - 1; i >= 0; i--) {
          const b = eng.bullets[i];
          b.life -= delta;
          if (b.life <= 0) {
            eng.scene.remove(b.mesh);
            eng.bullets.splice(i, 1);
          }
        }

        // Spent Shells
        for (let i = eng.shells.length - 1; i >= 0; i--) {
          const s = eng.shells[i];
          s.life -= delta;
          s.mesh.position.addScaledVector(s.vel, delta);
          s.vel.y -= 9.8 * delta; // gravity

          // Ground bounce
          if (s.mesh.position.y <= 0.03) {
            s.mesh.position.y = 0.03;
            s.vel.y = -s.vel.y * 0.35;
            s.vel.x *= 0.6;
            s.vel.z *= 0.6;
          }

          s.mesh.rotation.x += s.rotVel.x * delta;
          s.mesh.rotation.y += s.rotVel.y * delta;

          if (s.life <= 0) {
            eng.scene.remove(s.mesh);
            eng.shells.splice(i, 1);
          }
        }

        // Impact Sparks
        for (let i = eng.sparks.length - 1; i >= 0; i--) {
          const sp = eng.sparks[i];
          sp.life -= delta;
          const posArr = sp.mesh.geometry.attributes.position.array as Float32Array;
          for (let j = 0; j < sp.vels.length; j++) {
            const v = sp.vels[j];
            posArr[j * 3] += v.x * delta;
            posArr[j * 3 + 1] += v.y * delta;
            posArr[j * 3 + 2] += v.z * delta;
            v.y -= 8.0 * delta;
          }
          sp.mesh.geometry.attributes.position.needsUpdate = true;

          if (sp.life <= 0) {
            eng.scene.remove(sp.mesh);
            eng.sparks.splice(i, 1);
          }
        }
      }

      // Render 3D Scene
      eng.renderer.render(eng.scene, eng.camera);
    };

    eng.lastTime = performance.now();
    animate();

    return () => {
      cancelAnimationFrame(eng.animationFrameId);
    };
  }, [gameMode, isFiringVisual, wave, score, onGameOver, spawnZombie, fireWeapon, maxAmmo]);

  return (
    <div
      ref={containerRef}
      className={`zombie-escape ${damageFlash ? 'ring-4 ring-red-600/80' : ''}`}
    >
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={canvasContainerRef}
        className="zombie-escape__canvas-container cursor-crosshair"
        onClick={handleCanvasClick}
      />

      {/* Center Reticle Crosshair */}
      {gameMode === 'PLAYING' && (
        <div className={`zombie-escape__crosshair ${isFiringVisual ? 'zombie-escape__crosshair--firing' : ''}`}>
          <div className="zombie-escape__crosshair-dot" />
          <div className="zombie-escape__crosshair-reticle" />
        </div>
      )}

      {/* Wave Announcement Banner */}
      {waveAnnouncement && (
        <div className="zombie-escape__wave-banner">
          {waveAnnouncement}
        </div>
      )}

      {/* -------------------------------------------------------------
          COMPACT PREMIUM HUD (DURING GAMEPLAY)
          ------------------------------------------------------------- */}
      {gameMode === 'PLAYING' && (
        <div className="zombie-escape__hud">
          {/* Top Left Stats (Wave, Kills, Score) */}
          <div className="zombie-escape__stats">
            <div className="zombie-escape__stat-pill">
              <Skull className="zombie-escape__stat-icon" />
              <div className="zombie-escape__stat-body">
                <span className="zombie-escape__stat-label">Wave</span>
                <span className="zombie-escape__stat-val">{wave}</span>
              </div>
            </div>

            <div className="zombie-escape__stat-pill">
              <Crosshair className="zombie-escape__stat-icon" />
              <div className="zombie-escape__stat-body">
                <span className="zombie-escape__stat-label">Kills</span>
                <span className="zombie-escape__stat-val">{kills}</span>
              </div>
            </div>

            <div className="zombie-escape__stat-pill">
              <Trophy className="zombie-escape__stat-icon" />
              <div className="zombie-escape__stat-body">
                <span className="zombie-escape__stat-label">Score</span>
                <span className="zombie-escape__stat-val">{score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Top Right Controls (Mute, Fullscreen, Pause, Exit) */}
          <div className="zombie-escape__top-controls">
            <button
              type="button"
              className="zombie-escape__icon-btn"
              onClick={() => {
                const muted = zombieAudio.getIsMuted();
                zombieAudio.setMuted(!muted);
                setSoundEnabled(muted);
              }}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            </button>

            <button
              type="button"
              className="zombie-escape__icon-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              className="zombie-escape__icon-btn"
              onClick={() => setGameMode('PAUSED')}
              title="Pause Game (ESC / P)"
            >
              <Pause className="w-4 h-4" />
            </button>

            {onBack && (
              <button
                type="button"
                className="zombie-escape__icon-btn"
                onClick={onBack}
                title="Exit to Hub"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bottom Left Health Bar */}
          <div className="zombie-escape__health-box">
            <div className="zombie-escape__health-header">
              <span className="zombie-escape__health-title">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Health
              </span>
              <span className="zombie-escape__health-number">{health}%</span>
            </div>
            <div className="zombie-escape__hp-bar-bg">
              <div
                className="zombie-escape__hp-bar-fill"
                style={{
                  width: `${health}%`,
                  background: health > 40 ? '#22c55e' : health > 20 ? '#eab308' : '#ef4444'
                }}
              />
            </div>
          </div>

          {/* Reload Progress Indicator */}
          {isReloading && (
            <div className="zombie-escape__reload-indicator">
              <span className="zombie-escape__reload-text">RELOADING... {reloadProgress}%</span>
              <div className="zombie-escape__reload-track">
                <div
                  className="zombie-escape__reload-fill"
                  style={{ width: `${reloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom Right Ammo Box */}
          <div className="zombie-escape__ammo-box">
            <span className="zombie-escape__ammo-current">{ammo}</span>
            <span className="zombie-escape__ammo-max">/ {maxAmmo}</span>
            <span className="zombie-escape__ammo-label">AMMO</span>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MOBILE CONTROLS (VIRTUAL JOYSTICK, AIM DRAG & BUTTONS)
          ------------------------------------------------------------- */}
      {isTouchDevice && gameMode === 'PLAYING' && (
        <div className="zombie-escape__mobile-layer">
          {/* Right-Side Swipe/Drag Surface for Smooth Camera Rotation & Manual Aiming */}
          <div
            className="zombie-escape__touch-aim-zone"
            onTouchStart={handleAimTouchStart}
            onTouchMove={handleAimTouchMove}
            onTouchEnd={handleAimTouchEnd}
            onTouchCancel={handleAimTouchEnd}
          />

          {/* Virtual Joystick */}
          <div
            className="zombie-escape__joystick-zone"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onTouchCancel={handleJoystickEnd}
          >
            <div
              className="zombie-escape__joystick-knob"
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
              }}
            />
          </div>

          {/* Action Buttons: JUMP, RELOAD & BIG FIRE BUTTON */}
          <div className="zombie-escape__mobile-actions">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="zombie-escape__mobile-jump-btn"
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerJump();
                }}
                onClick={triggerJump}
              >
                <ArrowUp className="w-4 h-4 text-emerald-400" />
                <span>JUMP</span>
              </button>

              <button
                type="button"
                className="zombie-escape__mobile-reload-btn"
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startReload();
                }}
                onClick={startReload}
              >
                <RotateCcw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                <span>{isReloading ? `${reloadProgress}%` : 'RELOAD'}</span>
              </button>
            </div>

            <button
              type="button"
              className="zombie-escape__mobile-fire-btn"
              onTouchStart={handleMobileFireStart}
              onTouchEnd={handleMobileFireEnd}
              onTouchCancel={handleMobileFireEnd}
              onMouseDown={handleMobileFireStart}
              onMouseUp={handleMobileFireEnd}
            >
              <Crosshair className="w-6 h-6 mb-1" />
              <span>FIRE</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MENUS & OVERLAYS
          ------------------------------------------------------------- */}

      {/* 1. START MENU */}
      {gameMode === 'MENU' && (
        <div className="zombie-escape__overlay">
          <div className="zombie-escape__modal-panel">
            <h1 className="zombie-escape__hero-title">ZOMBIE ESCAPE</h1>
            <p className="zombie-escape__hero-tagline">"Survive the night."</p>

            <div className="zombie-escape__btn-stack">
              <button
                type="button"
                className="zombie-escape__primary-btn"
                onClick={startGame}
              >
                <Play className="w-5 h-5 fill-white" />
                <span>PLAY</span>
              </button>

              <button
                type="button"
                className="zombie-escape__secondary-btn"
                onClick={() => setShowHowToPlay(true)}
              >
                <HelpCircle className="w-4 h-4" />
                <span>HOW TO PLAY</span>
              </button>

              <button
                type="button"
                className="zombie-escape__secondary-btn"
                onClick={() => setShowSettings(true)}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>SETTINGS</span>
              </button>

              {onBack && (
                <button
                  type="button"
                  className="zombie-escape__secondary-btn"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>EXIT GAME</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. HOW TO PLAY MODAL */}
      {showHowToPlay && (
        <div className="zombie-escape__overlay">
          <div className="zombie-escape__modal-panel">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">HOW TO PLAY</h2>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Controls */}
            <div className="zombie-escape__guide-section">
              <div className="zombie-escape__guide-heading">DESKTOP CONTROLS</div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">WASD / Arrows</span>
                <span className="zombie-escape__guide-desc">Move Survivor</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">Mouse</span>
                <span className="zombie-escape__guide-desc">Aim & Turn (Manual)</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">Left Click</span>
                <span className="zombie-escape__guide-desc">Fire Assault Rifle</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">Space</span>
                <span className="zombie-escape__guide-desc">Jump Obstacles</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">R</span>
                <span className="zombie-escape__guide-desc">Reload (1.4s)</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">ESC / P</span>
                <span className="zombie-escape__guide-desc">Pause Game</span>
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="zombie-escape__guide-section">
              <div className="zombie-escape__guide-heading">MOBILE CONTROLS</div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">Left Joystick</span>
                <span className="zombie-escape__guide-desc">Move Survivor</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">Right Screen Swipe</span>
                <span className="zombie-escape__guide-desc">Aim & Look Around</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">FIRE Button</span>
                <span className="zombie-escape__guide-desc">Shoot Assault Rifle</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">JUMP Button</span>
                <span className="zombie-escape__guide-desc">Jump Over Obstacles</span>
              </div>
              <div className="zombie-escape__guide-row">
                <span className="zombie-escape__guide-key">RELOAD Button</span>
                <span className="zombie-escape__guide-desc">Reload Weapon</span>
              </div>
            </div>

            {/* Zombie Threat Guide */}
            <div className="zombie-escape__guide-section">
              <div className="zombie-escape__guide-heading">ZOMBIE TYPES</div>
              <div className="text-left text-xs text-slate-300 space-y-1">
                <p><strong className="text-emerald-400">1. Walker:</strong> Standard speed, shambles in hordes.</p>
                <p><strong className="text-purple-400">2. Runner:</strong> Agile, hunched sprint. High threat priority!</p>
                <p><strong className="text-amber-400">3. Brute:</strong> Massive armored tank, deals heavy damage.</p>
              </div>
            </div>

            <button
              type="button"
              className="zombie-escape__primary-btn mt-4"
              onClick={() => setShowHowToPlay(false)}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* 3. SETTINGS MODAL */}
      {showSettings && (
        <div className="zombie-escape__overlay">
          <div className="zombie-escape__modal-panel">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">SETTINGS</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div className="zombie-escape__setting-row">
                <span>Audio Sound FX</span>
                <button
                  type="button"
                  className={`zombie-escape__toggle-btn ${soundEnabled ? 'zombie-escape__toggle-btn--active' : ''}`}
                  onClick={() => {
                    const muted = zombieAudio.getIsMuted();
                    zombieAudio.setMuted(!muted);
                    setSoundEnabled(muted);
                  }}
                >
                  {soundEnabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              <div className="zombie-escape__setting-row">
                <span>SFX Volume</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSfxVolume(val);
                    zombieAudio.setVolume(val / 100);
                  }}
                  className="w-32 accent-purple-500"
                />
              </div>

              <div className="zombie-escape__setting-row">
                <span>Display Mode</span>
                <button
                  type="button"
                  className="zombie-escape__toggle-btn"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="zombie-escape__primary-btn mt-6"
              onClick={() => setShowSettings(false)}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      )}

      {/* 4. PAUSED OVERLAY */}
      {gameMode === 'PAUSED' && (
        <div className="zombie-escape__overlay">
          <div className="zombie-escape__modal-panel">
            <h2 className="text-2xl font-black text-white mb-2">GAME PAUSED</h2>
            <p className="text-xs text-purple-300 mb-6">Take a breather, Survivor.</p>

            <div className="zombie-escape__btn-stack">
              <button
                type="button"
                className="zombie-escape__primary-btn"
                onClick={() => setGameMode('PLAYING')}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>RESUME</span>
              </button>

              <button
                type="button"
                className="zombie-escape__secondary-btn"
                onClick={startGame}
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESTART</span>
              </button>

              <button
                type="button"
                className="zombie-escape__secondary-btn"
                onClick={() => setGameMode('MENU')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>MAIN MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GAME OVER SCREEN */}
      {gameMode === 'GAMEOVER' && (
        <div className="zombie-escape__overlay">
          <div className="zombie-escape__modal-panel">
            <h1 className="text-3xl font-black text-red-500 tracking-tight mb-1">GAME OVER</h1>
            <p className="text-xs text-slate-400 mb-4">You succumbed to the infected horde.</p>

            {/* Statistics Cards */}
            <div className="zombie-escape__over-stats">
              <div className="zombie-escape__over-card">
                <div className="zombie-escape__over-card-label">Wave Reached</div>
                <div className="zombie-escape__over-card-val text-purple-400">{wave}</div>
              </div>

              <div className="zombie-escape__over-card">
                <div className="zombie-escape__over-card-label">Zombies Eliminated</div>
                <div className="zombie-escape__over-card-val text-red-400">{kills}</div>
              </div>

              <div className="zombie-escape__over-card">
                <div className="zombie-escape__over-card-label">Score</div>
                <div className="zombie-escape__over-card-val text-amber-400">{score.toLocaleString()}</div>
              </div>
            </div>

            <div className="zombie-escape__btn-stack">
              <button
                type="button"
                className="zombie-escape__primary-btn"
                onClick={startGame}
              >
                <RotateCcw className="w-5 h-5" />
                <span>RESTART</span>
              </button>

              <button
                type="button"
                className="zombie-escape__secondary-btn"
                onClick={() => setGameMode('MENU')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>MAIN MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
