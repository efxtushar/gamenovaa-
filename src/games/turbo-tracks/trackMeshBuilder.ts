import * as THREE from 'three';
import { TrackConfig, TrackPoint } from './types';

export interface TrackFrame {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  trackWidth: number;
}

export interface BuiltTrackResult {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  boostPads: { pos: THREE.Vector3; radius: THREE.Vector3; t: number; mesh: THREE.Mesh }[];
  jumpRamps: { pos: THREE.Vector3; t: number }[];
  movingObstacles: {
    group: THREE.Group;
    type: string;
    pos: THREE.Vector3;
    t: number;
    radius: number;
    update: (delta: number, time: number) => void;
  }[];
  finishLineT: number;
  trackWidth: number;
  getFrameAt: (t: number) => TrackFrame;
  updateAnimations: (delta: number, time: number) => void;
}

export function build3DTrack(config: TrackConfig): BuiltTrackResult {
  const trackGroup = new THREE.Group();

  // Convert points to Vector3 array
  const vPoints = config.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(vPoints, true, 'centripetal', 0.5);

  const numDivisions = 400;
  const trackWidth = 6.2;
  const railHeight = 0.5;
  const railThickness = 0.35;

  // -------------------------------------------------------------
  // 1. GENERATE PROCEDURAL TRACK RIBBON GEOMETRY
  // -------------------------------------------------------------
  const frames = curve.computeFrenetFrames(numDivisions, true);

  // Ensure initial normal points UPWARDS towards the sky (positive Y)
  if (frames.normals[0].y < 0) {
    for (let i = 0; i < frames.normals.length; i++) {
      frames.normals[i].negate();
      frames.binormals[i].negate();
    }
  }

  const trackPositions: number[] = [];
  const trackNormals: number[] = [];
  const trackUvs: number[] = [];
  const trackIndices: number[] = [];

  const railPositions: number[] = [];
  const railNormals: number[] = [];
  const railIndices: number[] = [];

  const centerPositions: number[] = [];
  const centerIndices: number[] = [];

  const trackFrames: TrackFrame[] = [];

  for (let i = 0; i <= numDivisions; i++) {
    const t = i / numDivisions;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = frames.normals[i % numDivisions];

    // Compute upright roadRight vector across the track
    // In Three.js, normal is UP, tangent is FORWARD.
    // normal x tangent gives the RIGHT vector across the road (+X when facing +Z)
    const roadRight = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    // Compute bank angle interpolated from config points
    const closestIdx = Math.floor(t * config.points.length);
    const pA = config.points[closestIdx % config.points.length];
    const pB = config.points[(closestIdx + 1) % config.points.length];
    const localT = (t * config.points.length) - closestIdx;
    const bankA = pA.bank || 0;
    const bankB = pB.bank || 0;
    const currentBank = THREE.MathUtils.lerp(bankA, bankB, localT);

    // Apply banking (roll) around tangent (direction of travel)
    const rotatedRight = roadRight.clone().applyAxisAngle(tangent, currentBank).normalize();
    const rotatedNormal = normal.clone().applyAxisAngle(tangent, currentBank).normalize();

    if (i < numDivisions) {
      trackFrames.push({
        pos: pt.clone(),
        tangent: tangent.clone(),
        normal: rotatedNormal.clone(),
        binormal: rotatedRight.clone(), // binormal is roadRight
        trackWidth
      });
    }

    const halfW = trackWidth / 2;
    const leftPt = pt.clone().addScaledVector(rotatedRight, -halfW);
    const rightPt = pt.clone().addScaledVector(rotatedRight, halfW);

    // Main surface vertices
    trackPositions.push(leftPt.x, leftPt.y, leftPt.z);
    trackPositions.push(rightPt.x, rightPt.y, rightPt.z);
    trackNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
    trackNormals.push(rotatedNormal.x, rotatedNormal.y, rotatedNormal.z);
    trackUvs.push(0, t * 80);
    trackUvs.push(1, t * 80);

    // Center dash line (slightly raised)
    const centerHalf = 0.15;
    const cLeft = pt.clone().addScaledVector(rotatedRight, -centerHalf).addScaledVector(rotatedNormal, 0.02);
    const cRight = pt.clone().addScaledVector(rotatedRight, centerHalf).addScaledVector(rotatedNormal, 0.02);
    centerPositions.push(cLeft.x, cLeft.y, cLeft.z, cRight.x, cRight.y, cRight.z);

    // Left and Right Raised Guard Rails
    const lRailBase = leftPt.clone();
    const lRailTop = leftPt.clone().addScaledVector(rotatedNormal, railHeight).addScaledVector(rotatedRight, -railThickness);
    const rRailBase = rightPt.clone();
    const rRailTop = rightPt.clone().addScaledVector(rotatedNormal, railHeight).addScaledVector(rotatedRight, railThickness);

    railPositions.push(
      lRailBase.x, lRailBase.y, lRailBase.z,
      lRailTop.x, lRailTop.y, lRailTop.z,
      rRailBase.x, rRailBase.y, rRailBase.z,
      rRailTop.x, rRailTop.y, rRailTop.z
    );

    railNormals.push(
      -rotatedRight.x, -rotatedRight.y, -rotatedRight.z,
      rotatedNormal.x, rotatedNormal.y, rotatedNormal.z,
      rotatedRight.x, rotatedRight.y, rotatedRight.z,
      rotatedNormal.x, rotatedNormal.y, rotatedNormal.z
    );

    if (i < numDivisions) {
      // Main track quad
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      trackIndices.push(v0, v2, v1);
      trackIndices.push(v1, v2, v3);

      // Center dash quad
      centerIndices.push(v0, v2, v1);
      centerIndices.push(v1, v2, v3);

      // Rails
      const r0 = i * 4;
      railIndices.push(r0, r0 + 4, r0 + 1, r0 + 1, r0 + 4, r0 + 5);
      railIndices.push(r0 + 2, r0 + 3, r0 + 6, r0 + 3, r0 + 7, r0 + 6);
    }
  }

  // 1. Main Track Mesh
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackPositions, 3));
  trackGeo.setAttribute('normal', new THREE.Float32BufferAttribute(trackNormals, 3));
  trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
  trackGeo.setIndex(trackIndices);

  const trackMat = new THREE.MeshStandardMaterial({
    color: config.trackColor,
    metalness: 0.35,
    roughness: 0.45,
    side: THREE.DoubleSide
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  trackGroup.add(trackMesh);

  // 2. Center Dashed Guide Stripe Mesh
  const centerGeo = new THREE.BufferGeometry();
  centerGeo.setAttribute('position', new THREE.Float32BufferAttribute(centerPositions, 3));
  centerGeo.setIndex(centerIndices);
  const centerMat = new THREE.MeshBasicMaterial({
    color: config.stripeColor,
    transparent: true,
    opacity: 0.8
  });
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  trackGroup.add(centerMesh);

  // 3. Raised Guard Rails Mesh
  const railGeo = new THREE.BufferGeometry();
  railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railGeo.setAttribute('normal', new THREE.Float32BufferAttribute(railNormals, 3));
  railGeo.setIndex(railIndices);
  const railMat = new THREE.MeshStandardMaterial({
    color: config.railColor,
    metalness: 0.7,
    roughness: 0.3,
    side: THREE.DoubleSide
  });
  const railMesh = new THREE.Mesh(railGeo, railMat);
  railMesh.castShadow = true;
  trackGroup.add(railMesh);

  // -------------------------------------------------------------
  // 2. TRACK SUPPORT PILLARS (TOY TRESTLE LEGS TO FLOOR)
  // -------------------------------------------------------------
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Toy blue structural beams
    metalness: 0.6,
    roughness: 0.4
  });

  for (let i = 0; i < numDivisions; i += 28) {
    const t = i / numDivisions;
    const pt = curve.getPointAt(t);
    if (pt.y > 2.5) {
      const pGeo = new THREE.CylinderGeometry(0.35, 0.45, pt.y, 8);
      const pillar = new THREE.Mesh(pGeo, pillarMat);
      pillar.position.set(pt.x, pt.y / 2, pt.z);
      pillar.castShadow = true;
      trackGroup.add(pillar);

      // Support crossbar under track
      const barGeo = new THREE.BoxGeometry(trackWidth * 0.9, 0.4, 0.4);
      const bar = new THREE.Mesh(barGeo, pillarMat);
      bar.position.set(pt.x, pt.y - 0.25, pt.z);
      trackGroup.add(bar);
    }
  }

  // -------------------------------------------------------------
  // 3. CHECKERED FINISH LINE OVERHEAD ARCHWAY
  // -------------------------------------------------------------
  const startFrame = trackFrames[0];
  const startPt = startFrame.pos;
  const startTangent = startFrame.tangent;
  const startNormal = startFrame.normal;
  const startRight = startFrame.binormal;

  const archGroup = new THREE.Group();
  archGroup.position.copy(startPt);
  archGroup.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(startRight, startNormal, startTangent)
  );

  // Arch frame
  const archFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.2
  });
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), archFrameMat);
  leftLeg.position.set(-trackWidth / 2 - 0.5, 2.25, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.5), archFrameMat);
  rightLeg.position.set(trackWidth / 2 + 0.5, 2.25, 0);

  const topCrossbar = new THREE.Mesh(new THREE.BoxGeometry(trackWidth + 1.8, 0.8, 0.6), archFrameMat);
  topCrossbar.position.set(0, 4.5, 0);

  // Checkered banner
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    metalness: 0.3
  });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, 0.9, 0.1), bannerMat);
  banner.position.set(0, 3.8, 0);

  archGroup.add(leftLeg, rightLeg, topCrossbar, banner);
  trackGroup.add(archGroup);

  // -------------------------------------------------------------
  // 4. BOOST PADS & JUMP RAMPS DETECTION
  // -------------------------------------------------------------
  const boostPads: { pos: THREE.Vector3; radius: THREE.Vector3; t: number; mesh: THREE.Mesh }[] = [];
  const jumpRamps: { pos: THREE.Vector3; t: number }[] = [];

  const boostPadMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.4,
    metalness: 0.2,
    roughness: 0.3
  });

  const arrowGeo = new THREE.ConeGeometry(1.2, 2.4, 3);
  arrowGeo.rotateX(Math.PI / 2);

  config.points.forEach((pt, idx) => {
    const t = idx / config.points.length;
    const trackP = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);

    if (pt.boost) {
      const bMesh = new THREE.Mesh(arrowGeo, boostPadMat);
      bMesh.position.copy(trackP).add(new THREE.Vector3(0, 0.12, 0));
      bMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      trackGroup.add(bMesh);

      boostPads.push({
        pos: trackP,
        radius: new THREE.Vector3(3.0, 2.0, 3.0),
        t,
        mesh: bMesh
      });
    }

    if (pt.jump) {
      jumpRamps.push({ pos: trackP, t });
    }
  });

  // -------------------------------------------------------------
  // 5. INTERACTIVE MOVING OBSTACLES
  // -------------------------------------------------------------
  const movingObstacles: BuiltTrackResult['movingObstacles'] = [];

  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.25
  });

  config.points.forEach((pt, idx) => {
    if (!pt.obstacle) return;
    const t = idx / config.points.length;
    const pos = curve.getPointAt(t);

    const obsGroup = new THREE.Group();
    obsGroup.position.copy(pos);

    if (pt.obstacle === 'spinner') {
      // Rotating horizontal 4-blade barrier
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 12), hazardMat);
      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(trackWidth * 0.95, 0.35, 0.4), hazardMat);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, trackWidth * 0.95), hazardMat);
      obsGroup.add(hub, arm1, arm2);
      obsGroup.position.y += 0.95;

      movingObstacles.push({
        group: obsGroup,
        type: 'spinner',
        pos,
        t,
        radius: 2.0,
        update: (delta) => {
          obsGroup.rotation.y += delta * 1.2;
        }
      });
    } else if (pt.obstacle === 'laser') {
      // Sweeping energy beam across track
      const leftEmitter = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), hazardMat);
      leftEmitter.position.set(-trackWidth / 2 - 0.2, 0.6, 0);
      const rightEmitter = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), hazardMat);
      rightEmitter.position.set(trackWidth / 2 + 0.2, 0.6, 0);

      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.85
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, trackWidth, 8), beamMat);
      beam.rotateZ(Math.PI / 2);
      beam.position.y = 0.6;

      obsGroup.add(leftEmitter, rightEmitter, beam);

      movingObstacles.push({
        group: obsGroup,
        type: 'laser',
        pos,
        t,
        radius: 1.6,
        update: (_delta, time) => {
          beam.position.y = 0.55 + Math.sin(time * 1.5) * 0.35;
        }
      });
    } else {
      // Rolling hazard barrel
      const barrelGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.4, 12);
      const barrel = new THREE.Mesh(barrelGeo, hazardMat);
      barrel.rotateZ(Math.PI / 2);
      barrel.position.y = 1.2;
      obsGroup.add(barrel);

      movingObstacles.push({
        group: obsGroup,
        type: 'barrel',
        pos,
        t,
        radius: 1.7,
        update: (delta, time) => {
          barrel.position.x = Math.sin(time * 1.2) * (trackWidth * 0.35);
          barrel.rotation.x += delta * 1.5;
        }
      });
    }

    trackGroup.add(obsGroup);
  });

  // -------------------------------------------------------------
  // 6. GIANT TOY WORLD ENVIRONMENT PROPS (THEMED MINIATURE FANTASY)
  // -------------------------------------------------------------
  const propsGroup = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.2
  });

  const toolRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.4,
    roughness: 0.4
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.9,
    roughness: 0.25
  });

  if (config.propsTheme === 'garage') {
    // Giant Steel Wrench (40 units long!)
    const wrenchGroup = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(32, 2.2, 1.2), steelMat);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1.2, 16), steelMat);
    head.position.x = 16;
    wrenchGroup.add(handle, head);
    wrenchGroup.position.set(60, 2, 40);
    wrenchGroup.rotation.y = 0.5;
    wrenchGroup.castShadow = true;
    propsGroup.add(wrenchGroup);

    // Giant Red Toolbox
    const toolbox = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 18), toolRedMat);
    toolbox.position.set(130, 7, 110);
    toolbox.castShadow = true;
    propsGroup.add(toolbox);

    // Giant AA Battery Cell (Gold & Black)
    const batteryGroup = new THREE.Group();
    const batteryBody = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 20, 16), toolRedMat);
    const batteryCap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2, 16), goldMat);
    batteryCap.position.y = 11;
    batteryGroup.add(batteryBody, batteryCap);
    batteryGroup.position.set(-60, 10, -50);
    batteryGroup.rotation.z = Math.PI / 2;
    batteryGroup.rotation.y = 0.8;
    propsGroup.add(batteryGroup);

    // Giant Oil Drum Can
    const oilCan = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16, 16), steelMat);
    oilCan.position.set(-40, 8, 80);
    propsGroup.add(oilCan);
  } else if (config.propsTheme === 'city') {
    // Giant Wooden Building Blocks
    const blockColors = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b];
    for (let b = 0; b < 12; b++) {
      const bMat = new THREE.MeshStandardMaterial({
        color: blockColors[b % blockColors.length],
        roughness: 0.6
      });
      const height = 15 + (b % 4) * 8;
      const block = new THREE.Mesh(new THREE.BoxGeometry(12, height, 12), bMat);
      const angle = (b / 12) * Math.PI * 2;
      block.position.set(Math.cos(angle) * 110, height / 2, Math.sin(angle) * 110);
      block.castShadow = true;
      propsGroup.add(block);
    }
  } else if (config.propsTheme === 'desert') {
    // Giant Sandstone Pyramids & Cacti
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    const pyramid = new THREE.Mesh(new THREE.ConeGeometry(24, 30, 4), sandMat);
    pyramid.position.set(100, 15, -40);
    propsGroup.add(pyramid);

    // Giant Toy Cactus
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
    const cactusStem = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 22, 12), cactusMat);
    cactusStem.position.set(-80, 11, -60);
    propsGroup.add(cactusStem);
  } else if (config.propsTheme === 'neon') {
    // Neon Cyber Grid Towers
    const cyberMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      wireframe: true
    });
    for (let n = 0; n < 8; n++) {
      const h = 25 + n * 5;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(16, h, 16), cyberMat);
      const angle = (n / 8) * Math.PI * 2;
      tower.position.set(Math.sin(angle) * 130, h / 2, Math.cos(angle) * 130);
      propsGroup.add(tower);
    }
  }

  trackGroup.add(propsGroup);

  // Ambient ground floor mesh (concrete workshop / toy world ground)
  const groundGeo = new THREE.PlaneGeometry(800, 800);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: config.groundColor,
    roughness: 0.85,
    metalness: 0.1
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  trackGroup.add(groundMesh);

  return {
    group: trackGroup,
    curve,
    boostPads,
    jumpRamps,
    movingObstacles,
    finishLineT: 0,
    trackWidth,
    getFrameAt: (t: number): TrackFrame => {
      const normT = ((t % 1.0) + 1.0) % 1.0;
      const exactIndex = normT * numDivisions;
      const idx0 = Math.floor(exactIndex) % numDivisions;
      const idx1 = (idx0 + 1) % numDivisions;
      const frac = exactIndex - Math.floor(exactIndex);

      const f0 = trackFrames[idx0] || trackFrames[0];
      const f1 = trackFrames[idx1] || trackFrames[0];

      return {
        pos: new THREE.Vector3().lerpVectors(f0.pos, f1.pos, frac),
        tangent: new THREE.Vector3().lerpVectors(f0.tangent, f1.tangent, frac).normalize(),
        normal: new THREE.Vector3().lerpVectors(f0.normal, f1.normal, frac).normalize(),
        binormal: new THREE.Vector3().lerpVectors(f0.binormal, f1.binormal, frac).normalize(),
        trackWidth
      };
    },
    updateAnimations: (delta: number, time: number) => {
      // Pulse boost pads
      const pulse = 1.0 + Math.sin(time * 6.0) * 0.4;
      boostPadMat.emissiveIntensity = pulse;

      // Update moving obstacles
      movingObstacles.forEach(obs => obs.update(delta, time));
    }
  };
}
