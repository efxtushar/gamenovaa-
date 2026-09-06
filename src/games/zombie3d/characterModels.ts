import * as THREE from 'three';
import { ZombieType, ZombieConfig } from './types';

// Shared materials cache for high performance & clear visibility
const playerJacketMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 }); // tactical slate jacket
const playerPantsMat = new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.7 }); // combat pants
const playerSkinMat = new THREE.MeshStandardMaterial({ color: 0xdfb385, roughness: 0.6 }); // human skin
const playerBootsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
const playerVestMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.4,
  metalness: 0.35,
  emissive: 0x0284c7,
  emissiveIntensity: 0.15
});
const playerCyberBadgeMat = new THREE.MeshStandardMaterial({
  color: 0x06b6d4,
  emissive: 0x06b6d4,
  emissiveIntensity: 1.8
});
const rifleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25, metalness: 0.85 });

export interface Player3DResult {
  group: THREE.Group;
  muzzleFlash: THREE.Mesh;
  muzzleLight: THREE.PointLight;
  flashlight: THREE.SpotLight;
  gunTip: THREE.Vector3;
  updateAnimation: (delta: number, isMoving: boolean, isFiring: boolean, isReloading: boolean, moveSpeed: number) => void;
  getMuzzleWorldPos: () => THREE.Vector3;
}

export function createPlayerMesh(): Player3DResult {
  const playerGroup = new THREE.Group();

  // Root Pivot for smooth rotation
  const root = new THREE.Group();
  playerGroup.add(root);

  // 1. Pelvis / Hips
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.28), playerPantsMat);
  hips.add(pelvisMesh);

  // 2. Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, -0.14, 0);
  hips.add(leftLeg);
  const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.22), playerPantsMat);
  leftThigh.position.y = -0.22;
  leftLeg.add(leftThigh);
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.28), playerBootsMat);
  leftBoot.position.set(0, -0.65, 0.03);
  leftLeg.add(leftBoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, -0.14, 0);
  hips.add(rightLeg);
  const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.22), playerPantsMat);
  rightThigh.position.y = -0.22;
  rightLeg.add(rightThigh);
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.28), playerBootsMat);
  rightBoot.position.set(0, -0.65, 0.03);
  rightLeg.add(rightBoot);

  // 3. Torso
  const spine = new THREE.Group();
  spine.position.y = 0.14;
  hips.add(spine);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.32), playerJacketMat);
  chest.position.y = 0.28;
  chest.castShadow = true;
  spine.add(chest);

  // Tactical Vest
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.36), playerVestMat);
  vest.position.set(0, 0.28, 0.01);
  vest.castShadow = true;
  spine.add(vest);

  // Cyberpunk armor badge on chest
  const cyberBadge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.04), playerCyberBadgeMat);
  cyberBadge.position.set(0.12, 0.36, 0.19);
  spine.add(cyberBadge);

  // Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.18), playerVestMat);
  backpack.position.set(0, 0.32, -0.24);
  backpack.castShadow = true;
  spine.add(backpack);

  // 4. Neck & Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0);
  spine.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), playerSkinMat);
  headMesh.position.y = 0.16;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Tactical cap / hair
  const capMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.34), playerVestMat);
  capMesh.position.set(0, 0.3, -0.01);
  headGroup.add(capMesh);

  // 5. Arms & Weapon
  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 0.48, 0);
  spine.add(rightArm);
  const rShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), playerJacketMat);
  rShoulder.position.y = -0.16;
  rightArm.add(rShoulder);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 0.48, 0);
  spine.add(leftArm);
  const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), playerJacketMat);
  lShoulder.position.y = -0.16;
  leftArm.add(lShoulder);

  // Assault Rifle
  const gunGroup = new THREE.Group();
  gunGroup.position.set(0.18, 0.28, 0.45);
  spine.add(gunGroup);

  // Gun Body
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.72), rifleMat);
  gunGroup.add(gunBody);

  // Gun Barrel & Silencer
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), rifleMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.48);
  gunGroup.add(barrel);

  // Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), rifleMat);
  mag.position.set(0, -0.12, 0.08);
  mag.rotation.x = -0.2;
  gunGroup.add(mag);

  // Tactical Flashlight attached to gun barrel (Casts bright, wide beam into foggy streets)
  const flashlight = new THREE.SpotLight(0xf8fafc, 90, 60, Math.PI / 4.0, 0.45, 1.1);
  flashlight.position.set(0, 0, 0.65);
  flashlight.target.position.set(0, 0, 12);
  gunGroup.add(flashlight);
  gunGroup.add(flashlight.target);

  // Muzzle Flash
  const muzzleFlashGeo = new THREE.OctahedronGeometry(0.14, 1);
  const muzzleFlashMat = new THREE.MeshBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  });
  const muzzleFlash = new THREE.Mesh(muzzleFlashGeo, muzzleFlashMat);
  muzzleFlash.position.set(0, 0.02, 0.7);
  gunGroup.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight(0xffb703, 0, 8);
  muzzleLight.position.set(0, 0.02, 0.75);
  gunGroup.add(muzzleLight);

  let walkCycle = 0;
  let recoilTimer = 0;

  function updateAnimation(delta: number, isMoving: boolean, isFiring: boolean, isReloading: boolean, moveSpeed: number) {
    if (isMoving) {
      walkCycle += delta * 11.0 * (moveSpeed / 5.0);
      const legAngle = Math.sin(walkCycle) * 0.65;
      leftLeg.rotation.x = legAngle;
      rightLeg.rotation.x = -legAngle;

      // Slight head bob and hip sway
      hips.position.y = 0.95 + Math.abs(Math.sin(walkCycle * 2)) * 0.05;
      headGroup.rotation.z = Math.sin(walkCycle) * 0.03;
    } else {
      // Idle Breathing
      walkCycle += delta * 2.2;
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, delta * 8);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, delta * 8);
      hips.position.y = 0.95 + Math.sin(walkCycle) * 0.015;
    }

    // Aim / Firing recoil
    if (isFiring) {
      recoilTimer = 0.09;
      muzzleFlashMat.opacity = 1;
      muzzleLight.intensity = 12;
      gunGroup.position.z = 0.38; // kick back
    } else {
      if (recoilTimer > 0) {
        recoilTimer -= delta;
      } else {
        muzzleFlashMat.opacity = 0;
        muzzleLight.intensity = 0;
      }
      gunGroup.position.z = THREE.MathUtils.lerp(gunGroup.position.z, 0.45, delta * 15);
    }

    // Reload animation (pull weapon back, hands chambering)
    if (isReloading) {
      gunGroup.rotation.x = THREE.MathUtils.lerp(gunGroup.rotation.x, -0.6, delta * 8);
      gunGroup.position.y = THREE.MathUtils.lerp(gunGroup.position.y, 0.15, delta * 8);
    } else {
      gunGroup.rotation.x = THREE.MathUtils.lerp(gunGroup.rotation.x, 0, delta * 10);
      gunGroup.position.y = THREE.MathUtils.lerp(gunGroup.position.y, 0.28, delta * 10);
    }
  }

  function getMuzzleWorldPos(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    muzzleFlash.getWorldPosition(pos);
    return pos;
  }

  return {
    group: playerGroup,
    muzzleFlash,
    muzzleLight,
    flashlight,
    gunTip: new THREE.Vector3(0.18, 1.23, 0.7),
    updateAnimation,
    getMuzzleWorldPos
  };
}

// -------------------------------------------------------------
// 3D ZOMBIE MESH BUILDER (Walker, Runner, Brute)
// -------------------------------------------------------------
export interface Zombie3DResult {
  group: THREE.Group;
  config: ZombieConfig;
  updateAnimation: (delta: number, isMoving: boolean, isAttacking: boolean, isDead: boolean) => void;
  flashDamage: () => void;
}

export function createZombieMesh(type: ZombieType): Zombie3DResult {
  const configs: Record<ZombieType, ZombieConfig> = {
    walker: {
      type: 'walker',
      name: 'Walker',
      hp: 75,
      maxHp: 75,
      speed: 2.6,
      damage: 12,
      attackInterval: 1.0,
      scoreValue: 100,
      scale: 1.0,
      color: 0x8aa880, // sickly pale undead green - clearly visible against dark pavement
      clothesColor: 0x475569
    },
    runner: {
      type: 'runner',
      name: 'Runner',
      hp: 45,
      maxHp: 45,
      speed: 4.8, // agile and fast, but fair
      damage: 8,
      attackInterval: 0.75,
      scoreValue: 150,
      scale: 0.95,
      color: 0x78926e,
      clothesColor: 0x8b5cf6 // ragged purple hoodie with strong contrast
    },
    brute: {
      type: 'brute',
      name: 'Brute',
      hp: 220, // massive tank
      maxHp: 220,
      speed: 1.9, // heavy slow thumping
      damage: 28,
      attackInterval: 1.4,
      scoreValue: 350,
      scale: 1.32,
      color: 0x6a8260,
      clothesColor: 0x334155
    }
  };

  const config = { ...configs[type] };
  const zombieGroup = new THREE.Group();
  zombieGroup.scale.setScalar(config.scale);

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.75
  });
  const clothesMat = new THREE.MeshStandardMaterial({
    color: config.clothesColor,
    roughness: 0.8
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8
  });
  const eyeMat = new THREE.MeshBasicMaterial({
    color: type === 'runner' ? 0xff2222 : type === 'brute' ? 0xff7700 : 0xffea00
  });

  const root = new THREE.Group();
  zombieGroup.add(root);

  // Hips
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.28), pantsMat);
  hips.add(pelvis);

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, -0.14, 0);
  hips.add(leftLeg);
  const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.22), pantsMat);
  leftLegMesh.position.y = -0.42;
  leftLeg.add(leftLegMesh);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, -0.14, 0);
  hips.add(rightLeg);
  const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.22), pantsMat);
  rightLegMesh.position.y = -0.42;
  rightLeg.add(rightLegMesh);

  // Spine & Torso
  const spine = new THREE.Group();
  spine.position.y = 0.14;
  hips.add(spine);

  // Hunched posture for zombies
  spine.rotation.x = type === 'runner' ? 0.35 : 0.15;

  const chestW = type === 'brute' ? 0.72 : 0.52;
  const chestH = 0.58;
  const chestD = type === 'brute' ? 0.42 : 0.32;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(chestW, chestH, chestD), clothesMat);
  chest.position.y = 0.28;
  chest.castShadow = true;
  spine.add(chest);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0.05);
  spine.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), skinMat);
  headMesh.position.y = 0.16;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Glowing Zombie Eyes (Eerie dots piercing the dark city night)
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), eyeMat);
  leftEye.position.set(-0.07, 0.18, 0.15);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), eyeMat);
  rightEye.position.set(0.07, 0.18, 0.15);
  headGroup.add(rightEye);

  // Soft eye glow for visibility in dark areas
  const eyeGlow = new THREE.PointLight(type === 'runner' ? 0xef4444 : type === 'brute' ? 0xf97316 : 0xfacc15, 1.8, 6.0);
  eyeGlow.position.set(0, 0.18, 0.25);
  headGroup.add(eyeGlow);

  // Arms (reaching out menacingly)
  const leftArm = new THREE.Group();
  leftArm.position.set(-chestW / 2 - 0.08, 0.48, 0);
  spine.add(leftArm);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), skinMat);
  lArmMesh.position.y = -0.35;
  leftArm.add(lArmMesh);
  leftArm.rotation.x = -1.2; // arms raised forward

  const rightArm = new THREE.Group();
  rightArm.position.set(chestW / 2 + 0.08, 0.48, 0);
  spine.add(rightArm);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), skinMat);
  rArmMesh.position.y = -0.35;
  rightArm.add(rArmMesh);
  rightArm.rotation.x = -1.15; // arms raised forward

  let animCycle = Math.random() * 10;
  let flashTimer = 0;
  let deathTimer = 0;

  function flashDamage() {
    flashTimer = 0.12;
    skinMat.color.setHex(0xef4444); // Flash crimson on hit
    clothesMat.color.setHex(0x991b1b);
  }

  function updateAnimation(delta: number, isMoving: boolean, isAttacking: boolean, isDead: boolean) {
    if (isDead) {
      deathTimer += delta;
      // Ragdoll fall backwards onto the wet asphalt
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, -Math.PI / 2, delta * 7);
      root.position.y = THREE.MathUtils.lerp(root.position.y, -0.85, delta * 7);
      return;
    }

    // Damage flash recovery
    if (flashTimer > 0) {
      flashTimer -= delta;
      if (flashTimer <= 0) {
        skinMat.color.setHex(config.color);
        clothesMat.color.setHex(config.clothesColor);
      }
    }

    animCycle += delta * (type === 'runner' ? 12 : type === 'brute' ? 5 : 7.5);

    // Running / Limping leg animation
    const legSwing = Math.sin(animCycle) * (type === 'brute' ? 0.4 : 0.7);
    leftLeg.rotation.x = legSwing;
    rightLeg.rotation.x = -legSwing;

    // Head twitch & menacing arm sway
    headGroup.rotation.y = Math.sin(animCycle * 0.5) * 0.15;
    headGroup.rotation.z = Math.cos(animCycle * 0.5) * 0.08;

    if (isAttacking) {
      // Swiping arms
      leftArm.rotation.x = -1.4 + Math.sin(animCycle * 3) * 0.5;
      rightArm.rotation.x = -1.4 + Math.cos(animCycle * 3) * 0.5;
    } else {
      leftArm.rotation.x = -1.2 + Math.sin(animCycle) * 0.15;
      rightArm.rotation.x = -1.15 - Math.sin(animCycle) * 0.15;
    }
  }

  return {
    group: zombieGroup,
    config,
    updateAnimation,
    flashDamage
  };
}
