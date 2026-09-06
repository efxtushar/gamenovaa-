import * as THREE from 'three';

export interface CityObstacle {
  x: number;
  z: number;
  radius: number;
  width?: number;
  depth?: number;
}

export interface CityBuildResult {
  group: THREE.Group;
  obstacles: CityObstacle[];
  spawnPoints: THREE.Vector3[];
  flickerLights: THREE.Light[];
  particleSystem: THREE.Points;
  updateEnvironment: (delta: number, time: number) => void;
  roadBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function buildAbandonedCity(): CityBuildResult {
  const cityGroup = new THREE.Group();
  const obstacles: CityObstacle[] = [];
  const spawnPoints: THREE.Vector3[] = [];
  const flickerLights: THREE.Light[] = [];

  const roadLength = 240;
  const roadWidth = 24;
  const sidewalkWidth = 7;
  const roadBounds = {
    minX: -(roadWidth / 2 + sidewalkWidth),
    maxX: (roadWidth / 2 + sidewalkWidth),
    minZ: -roadLength / 2 + 10,
    maxZ: roadLength / 2 - 10
  };

  // -------------------------------------------------------------
  // 1. TEXTURES (Procedural Canvas for Wet Asphalt & Concrete)
  // -------------------------------------------------------------
  function createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 25-35% brighter asphalt base with rich cyberpunk wet look
    ctx.fillStyle = '#263346';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine grain texture noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + noise + 2));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise + 4));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise + 8)); // clear cool asphalt tint
    }
    ctx.putImageData(imgData, 0, 0);

    // Reflective wet puddles (subtle neon reflection gloss)
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 1024;
      const rw = 80 + Math.random() * 130;
      const rh = 40 + Math.random() * 75;
      const puddleGrad = ctx.createRadialGradient(px, py, 0, px, py, rw);
      puddleGrad.addColorStop(0, 'rgba(168, 85, 247, 0.12)'); // soft neon purple reflection
      puddleGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.09)'); // soft cyan reflection
      puddleGrad.addColorStop(1, 'rgba(30, 41, 59, 0.4)');
      ctx.fillStyle = puddleGrad;
      ctx.beginPath();
      ctx.ellipse(px, py, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weathered double center lines (vivid amber/yellow for crystal clear road visibility)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.setLineDash([32, 20]);
    ctx.beginPath();
    ctx.moveTo(506, 0);
    ctx.lineTo(506, 1024);
    ctx.moveTo(518, 0);
    ctx.lineTo(518, 1024);
    ctx.stroke();

    // White dashed lane markers
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 7;
    ctx.setLineDash([44, 38]);
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 1024);
    ctx.moveTo(768, 0);
    ctx.lineTo(768, 1024);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 10);
    return texture;
  }

  function createBuildingWindowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Concrete/brick facade background - clearly visible
    ctx.fillStyle = '#222c3d';
    ctx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 12;
    const padX = 512 / cols;
    const padY = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * padX + 8;
        const y = r * padY + 6;
        const w = padX - 16;
        const h = padY - 12;

        const rand = Math.random();
        if (rand < 0.22) {
          // Warm amber office glow
          ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.fillRect(x, y, w, h);
        } else if (rand < 0.38) {
          // Cold fluorescent cyan glow
          ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
          ctx.fillRect(x, y, w, h);
        } else if (rand < 0.44) {
          // Magenta cyber apartment glow
          ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
          ctx.fillRect(x, y, w, h);
        } else {
          // Dark interior window with framed sill
          ctx.fillStyle = '#172033';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  const asphaltTex = createAsphaltTexture();
  const windowTex = createBuildingWindowTexture();

  // -------------------------------------------------------------
  // 2. MAIN ROAD & SIDEWALKS
  // -------------------------------------------------------------
  // Wet Asphalt Ground (Brightened 30% for clear visibility)
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    color: 0x7a8ea8,
    roughness: 0.32,
    metalness: 0.3
  });
  const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.receiveShadow = true;
  cityGroup.add(roadMesh);

  // Sidewalks (Brighter slate for clear contrast against road)
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.65,
    metalness: 0.15
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.5
  });

  [-1, 1].forEach(side => {
    const swX = side * (roadWidth / 2 + sidewalkWidth / 2);
    const swGeo = new THREE.BoxGeometry(sidewalkWidth, 0.35, roadLength);
    const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
    swMesh.position.set(swX, 0.175, 0);
    swMesh.receiveShadow = true;
    cityGroup.add(swMesh);

    // Curb edge
    const curbX = side * (roadWidth / 2 + 0.15);
    const curbGeo = new THREE.BoxGeometry(0.3, 0.4, roadLength);
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.position.set(curbX, 0.2, 0);
    curbMesh.receiveShadow = true;
    cityGroup.add(curbMesh);
  });

  // End Barriers to enclose the main play corridor
  [-roadLength / 2, roadLength / 2].forEach(zPos => {
    const endBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(roadWidth + sidewalkWidth * 2, 6, 2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    endBarrier.position.set(0, 3, zPos);
    cityGroup.add(endBarrier);
  });

  // -------------------------------------------------------------
  // 3. BUILDINGS & NEON BILLBOARDS (Cyberpunk Night Atmosphere)
  // -------------------------------------------------------------
  const buildingMat = new THREE.MeshStandardMaterial({
    map: windowTex,
    color: 0x94a3b8,
    roughness: 0.6,
    metalness: 0.25
  });

  // Neon palette for signs and accent lights
  const neonColors = [0x06b6d4, 0xec4899, 0xa855f7, 0x3b82f6, 0x10b981];

  [-1, 1].forEach(side => {
    let currentZ = -roadLength / 2 + 15;
    let signIndex = 0;
    while (currentZ < roadLength / 2 - 15) {
      const bWidth = 18 + Math.random() * 8;
      const bDepth = 22 + Math.random() * 10;
      const bHeight = 24 + Math.random() * 26; // 24m to 50m
      const bX = side * (roadWidth / 2 + sidewalkWidth + bWidth / 2);

      const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const bMesh = new THREE.Mesh(bGeo, buildingMat);
      bMesh.position.set(bX, bHeight / 2, currentZ + bDepth / 2);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      cityGroup.add(bMesh);

      // Cyberpunk Neon Signboard mounted facing the road
      const neonColor = neonColors[signIndex % neonColors.length];
      signIndex++;
      const signW = 6 + Math.random() * 5;
      const signH = 1.2 + Math.random() * 1.5;
      const signGeo = new THREE.BoxGeometry(0.3, signH, signW);
      const signMat = new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 2.4,
        roughness: 0.2
      });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      const signY = 6 + Math.random() * 10;
      const signX = side * (roadWidth / 2 + sidewalkWidth + 0.2);
      signMesh.position.set(signX, signY, currentZ + bDepth / 2);
      cityGroup.add(signMesh);

      // Soft neon glow from the sign onto the street canyon
      const neonGlow = new THREE.PointLight(neonColor, 1.8, 16);
      neonGlow.position.set(signX - side * 1.5, signY, currentZ + bDepth / 2);
      cityGroup.add(neonGlow);

      // Rooftop water tower or antenna
      if (Math.random() < 0.4) {
        const towerGeo = new THREE.CylinderGeometry(2, 2, 4, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(bX + (Math.random() - 0.5) * 6, bHeight + 2, currentZ + bDepth / 2);
        cityGroup.add(tower);
      }

      // Alley opening between blocks (spawn point for zombies)
      const alleyGap = 12 + Math.random() * 8;
      spawnPoints.push(new THREE.Vector3(side * (roadWidth / 2 + sidewalkWidth + 4), 0, currentZ + bDepth + alleyGap / 2));
      currentZ += bDepth + alleyGap;
    }
  });

  // Additional Spawn points at distant road ends
  spawnPoints.push(new THREE.Vector3(-8, 0, -roadLength / 2 + 18));
  spawnPoints.push(new THREE.Vector3(0, 0, -roadLength / 2 + 18));
  spawnPoints.push(new THREE.Vector3(8, 0, -roadLength / 2 + 18));
  spawnPoints.push(new THREE.Vector3(-8, 0, roadLength / 2 - 18));
  spawnPoints.push(new THREE.Vector3(0, 0, roadLength / 2 - 18));
  spawnPoints.push(new THREE.Vector3(8, 0, roadLength / 2 - 18));

  // -------------------------------------------------------------
  // 4. STREET LIGHTS (Curved Lampposts with Glowing Spotlights)
  // -------------------------------------------------------------
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.7 });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xffbe66,
    emissiveIntensity: 3.2
  });

  const lightZStep = 20;
  for (let z = -roadLength / 2 + 16; z <= roadLength / 2 - 16; z += lightZStep) {
    [-1, 1].forEach((side) => {
      // Alternate sides staggered for uniform, pleasant road lighting
      if ((Math.floor(z / lightZStep)) % 2 === 0 && side === 1) return;
      if ((Math.floor(z / lightZStep)) % 2 !== 0 && side === -1) return;

      const poleX = side * (roadWidth / 2 + 1.2);
      const poleHeight = 7.5;

      const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, poleHeight, 8);
      const pole = new THREE.Mesh(poleGeo, lampPoleMat);
      pole.position.set(poleX, poleHeight / 2, z);
      pole.castShadow = true;
      cityGroup.add(pole);

      // Arm extending over the road
      const armGeo = new THREE.BoxGeometry(2.5, 0.12, 0.12);
      const arm = new THREE.Mesh(armGeo, lampPoleMat);
      arm.position.set(poleX - side * 1.0, poleHeight - 0.2, z);
      cityGroup.add(arm);

      // Lamp Head
      const headGeo = new THREE.ConeGeometry(0.4, 0.35, 8);
      const head = new THREE.Mesh(headGeo, lampBulbMat);
      head.position.set(poleX - side * 2.0, poleHeight - 0.4, z);
      cityGroup.add(head);

      // SpotLight casting warm sodium cone onto asphalt (brighter for high visibility)
      const spotLight = new THREE.SpotLight(0xffdf99, 52, 34, Math.PI / 3.2, 0.55, 1.0);
      spotLight.position.set(poleX - side * 2.0, poleHeight - 0.5, z);
      spotLight.target.position.set(poleX - side * 2.0, 0, z);
      spotLight.castShadow = false;
      cityGroup.add(spotLight);
      cityGroup.add(spotLight.target);

      // PointLight providing omnidirectional street illumination for walking zombies & environment
      const streetPointLight = new THREE.PointLight(0xffb74d, 4.2, 26);
      streetPointLight.position.set(poleX - side * 2.0, poleHeight - 0.8, z);
      cityGroup.add(streetPointLight);

      // One or two lights flicker to simulate damaged urban grid
      if (Math.random() < 0.15) {
        flickerLights.push(spotLight);
      }

      // Add obstacle for lamppost base
      obstacles.push({ x: poleX, z: z, radius: 0.8 });
    });
  }

  // -------------------------------------------------------------
  // 5. ABANDONED VEHICLES (Cars, Police Cruiser, Trucks)
  // -------------------------------------------------------------
  function createCarMesh(type: 'sedan' | 'police' | 'truck' | 'wreck'): THREE.Group {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: type === 'police' ? 0x1e293b : type === 'wreck' ? 0x78350f : type === 'truck' ? 0x334155 : 0x64748b,
      roughness: type === 'wreck' ? 0.95 : 0.35,
      metalness: type === 'wreck' ? 0.1 : 0.5
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

    // Chassis
    const length = type === 'truck' ? 5.8 : 4.4;
    const width = type === 'truck' ? 2.4 : 2.0;
    const height = type === 'truck' ? 1.4 : 0.9;

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), bodyMat);
    lowerBody.position.y = height / 2 + 0.35;
    lowerBody.castShadow = true;
    car.add(lowerBody);

    // Cabin / Roof
    const cabinLen = type === 'truck' ? 2.2 : 2.5;
    const cabinH = 0.75;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, cabinH, cabinLen), glassMat);
    cabin.position.set(0, height + cabinH / 2 + 0.3, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // Wheels
    const wheelPositions = [
      [-width / 2 - 0.05, 0.35, length / 3],
      [width / 2 + 0.05, 0.35, length / 3],
      [-width / 2 - 0.05, 0.35, -length / 3],
      [width / 2 + 0.05, 0.35, -length / 3]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      car.add(wheel);
    });

    // Police Cruiser Lightbar (Dual Red & Blue beacons)
    if (type === 'police') {
      const redBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.15, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 })
      );
      redBar.position.set(-0.3, height + cabinH + 0.45, -0.2);
      car.add(redBar);

      const blueBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.15, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 2.2 })
      );
      blueBar.position.set(0.3, height + cabinH + 0.45, -0.2);
      car.add(blueBar);
    }

    // Headlights (dim glow indicating abandoned city atmosphere)
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 1.2 });
    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), headlightMat);
    hlLeft.position.set(-width / 2 + 0.3, height / 2 + 0.35, length / 2 + 0.02);
    car.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), headlightMat);
    hlRight.position.set(width / 2 - 0.3, height / 2 + 0.35, length / 2 + 0.02);
    car.add(hlRight);

    return car;
  }

  // Place abandoned vehicles angled along the roadway
  const vehicleSpawns = [
    { x: -4.5, z: -80, rot: 0.35, type: 'police' as const },
    { x: 5.2, z: -55, rot: -0.5, type: 'sedan' as const },
    { x: -2.0, z: -25, rot: 0.1, type: 'wreck' as const },
    { x: 6.0, z: 15, rot: 0.7, type: 'truck' as const },
    { x: -5.0, z: 45, rot: -0.3, type: 'sedan' as const },
    { x: 3.5, z: 75, rot: 0.4, type: 'police' as const },
    { x: -4.0, z: 100, rot: -0.6, type: 'wreck' as const }
  ];

  vehicleSpawns.forEach(v => {
    const car = createCarMesh(v.type);
    car.position.set(v.x, 0, v.z);
    car.rotation.y = v.rot;
    cityGroup.add(car);

    // Add bounding obstacle box for physics & collision
    obstacles.push({
      x: v.x,
      z: v.z,
      radius: 2.2,
      width: 2.2,
      depth: 4.6
    });
  });

  // -------------------------------------------------------------
  // 6. ROAD BARRIERS & DEBRIS (Jersey Barriers & Barrels)
  // -------------------------------------------------------------
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
  const barrierStripeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.5
  });

  const barrierPositions = [
    { x: -7, z: -40, rot: 0.1 },
    { x: -3.5, z: -40, rot: -0.15 },
    { x: 4.5, z: 30, rot: 0.25 },
    { x: 8, z: 30, rot: 0.1 }
  ];

  barrierPositions.forEach(bp => {
    const bGeo = new THREE.BoxGeometry(3.2, 0.9, 0.6);
    const bMesh = new THREE.Mesh(bGeo, barrierMat);
    bMesh.position.set(bp.x, 0.45, bp.z);
    bMesh.rotation.y = bp.rot;
    bMesh.castShadow = true;
    cityGroup.add(bMesh);

    // Hazard reflective stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.2, 0.62), barrierStripeMat);
    stripe.position.set(bp.x, 0.55, bp.z);
    stripe.rotation.y = bp.rot;
    cityGroup.add(stripe);

    obstacles.push({ x: bp.x, z: bp.z, radius: 1.5 });
  });

  // Oil drums / Barrels (Hazard yellow & rust orange)
  const barrelMatYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6, metalness: 0.3 });
  const barrelMatRust = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7, metalness: 0.3 });
  const barrelPositions = [
    { x: -8.5, z: -10, color: 'yellow' },
    { x: -9.2, z: -9, color: 'rust' },
    { x: 9.0, z: -68, color: 'yellow' },
    { x: -8.8, z: 58, color: 'rust' },
    { x: 8.5, z: 92, color: 'yellow' }
  ];
  barrelPositions.forEach(bp => {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 1.1, 12),
      bp.color === 'yellow' ? barrelMatYellow : barrelMatRust
    );
    barrel.position.set(bp.x, 0.55, bp.z);
    barrel.castShadow = true;
    cityGroup.add(barrel);
    obstacles.push({ x: bp.x, z: bp.z, radius: 0.6 });
  });

  // -------------------------------------------------------------
  // 7. ATMOSPHERIC PARTICLES (Drifting Night Mist / Rain Motes)
  // -------------------------------------------------------------
  const particleCount = 450;
  const particleGeo = new THREE.BufferGeometry();
  const particlePos = new Float32Array(particleCount * 3);
  const particleVels: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < particleCount; i++) {
    particlePos[i * 3] = (Math.random() - 0.5) * 45;
    particlePos[i * 3 + 1] = Math.random() * 12;
    particlePos[i * 3 + 2] = (Math.random() - 0.5) * roadLength;

    particleVels.push({
      x: (Math.random() - 0.5) * 0.3,
      y: -(0.8 + Math.random() * 1.2), // slow drifting down
      z: (Math.random() - 0.5) * 0.4
    });
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0x88aacc,
    size: 0.16,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  cityGroup.add(particleSystem);

  // -------------------------------------------------------------
  // 8. UPDATE FUNCTION (Flickering Lights & Particle Movement)
  // -------------------------------------------------------------
  function updateEnvironment(delta: number, time: number) {
    // Streetlight flicker effect
    flickerLights.forEach((light, i) => {
      const flicker = Math.sin(time * 15 + i * 4) * Math.cos(time * 28 + i * 2);
      if (flicker > 0.82) {
        light.intensity = 6 + Math.random() * 12;
      } else {
        light.intensity = 52;
      }
    });

    // Particle positions loop
    const positions = particleGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const vel = particleVels[i];
      positions[i * 3] += vel.x * delta;
      positions[i * 3 + 1] += vel.y * delta;
      positions[i * 3 + 2] += vel.z * delta;

      // Wrap around ground
      if (positions[i * 3 + 1] < 0.1) {
        positions[i * 3 + 1] = 12;
      }
      if (Math.abs(positions[i * 3]) > 22) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
      }
      if (Math.abs(positions[i * 3 + 2]) > roadLength / 2) {
        positions[i * 3 + 2] = (Math.random() - 0.5) * (roadLength - 20);
      }
    }
    particleGeo.attributes.position.needsUpdate = true;
  }

  return {
    group: cityGroup,
    obstacles,
    spawnPoints,
    flickerLights,
    particleSystem,
    updateEnvironment,
    roadBounds
  };
}
