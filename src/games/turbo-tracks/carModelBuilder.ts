import * as THREE from 'three';
import { CarConfig } from './types';

export interface BuiltCarResult {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  frontWheels: THREE.Group[];
  exhaustLight: THREE.PointLight;
  bodyMesh: THREE.Mesh;
  setEmissiveBoost: (isBoosting: boolean) => void;
  setWheelSteer: (angle: number) => void;
  spinWheels: (distanceDelta: number) => void;
}

export function createToyCarMesh(config: CarConfig): BuiltCarResult {
  const carGroup = new THREE.Group();

  // Shared / Reusable Materials
  const primaryColor = new THREE.Color(config.primaryColor);
  const secondaryColor = new THREE.Color(config.secondaryColor);
  const accentColor = new THREE.Color(config.accentColor);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 1.2
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    metalness: 0.7,
    roughness: 0.35
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.95,
    roughness: 0.05,
    transparent: true,
    opacity: 0.85
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.98,
    roughness: 0.08
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.1,
    roughness: 0.85
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x67e8f9,
    emissiveIntensity: 0.9
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0033,
    emissiveIntensity: 0.8
  });

  const exhaustMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4
  });

  // -------------------------------------------------------------
  // 1. MAIN CHASSIS & UNDERBELLY (DIE-CAST TOY CAR FOUNDATION)
  // -------------------------------------------------------------
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.2, 3.4);
  const chassis = new THREE.Mesh(chassisGeo, trimMat);
  chassis.position.y = 0.22;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  carGroup.add(chassis);

  // -------------------------------------------------------------
  // 2. MAIN HOOD & CABIN (STREAMLINED WEDGE)
  // -------------------------------------------------------------
  const bodyGeo = new THREE.BoxGeometry(1.5, 0.42, 2.2);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, 0.45, -0.15);
  bodyMesh.castShadow = true;
  carGroup.add(bodyMesh);

  // Front Wedge / Nose Cone
  const noseGeo = new THREE.BoxGeometry(1.4, 0.26, 1.1);
  const nose = new THREE.Mesh(noseGeo, bodyMat);
  nose.position.set(0, 0.32, 1.3);
  nose.rotation.x = -0.12;
  nose.castShadow = true;
  carGroup.add(nose);

  // Front Splitter
  const splitterGeo = new THREE.BoxGeometry(1.58, 0.06, 0.5);
  const splitter = new THREE.Mesh(splitterGeo, trimMat);
  splitter.position.set(0, 0.14, 1.65);
  splitter.castShadow = true;
  carGroup.add(splitter);

  // Aerodynamic Cockpit / Windshield Dome
  const cockpitGeo = new THREE.BoxGeometry(1.15, 0.36, 1.4);
  const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
  cockpit.position.set(0, 0.74, -0.2);
  cockpit.castShadow = true;
  carGroup.add(cockpit);

  // Roof Scoop / Air Intake
  const scoopGeo = new THREE.BoxGeometry(0.45, 0.12, 0.6);
  const scoop = new THREE.Mesh(scoopGeo, trimMat);
  scoop.position.set(0, 0.95, -0.1);
  carGroup.add(scoop);

  // Headlights (Twin angled LED bars: Left = -X, Right = +X)
  const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), headlightMat);
  leftLight.position.set(-0.48, 0.36, 1.82);
  const rightLight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), headlightMat);
  rightLight.position.set(0.48, 0.36, 1.82);
  carGroup.add(leftLight, rightLight);

  // Taillights (Horizon cyber lightbar)
  const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.06), taillightMat);
  taillight.position.set(0, 0.44, -1.72);
  carGroup.add(taillight);

  // -------------------------------------------------------------
  // 3. REAR SPOILER & DIFFUSER (CUSTOM TO BODY STYLE)
  // -------------------------------------------------------------
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, 0.65, -1.55);

  const wingStrutGeo = new THREE.BoxGeometry(0.06, 0.36, 0.12);
  const leftStrut = new THREE.Mesh(wingStrutGeo, trimMat);
  leftStrut.position.set(-0.48, 0, 0);
  const rightStrut = new THREE.Mesh(wingStrutGeo, trimMat);
  rightStrut.position.set(0.48, 0, 0);

  let wingGeo = new THREE.BoxGeometry(1.65, 0.06, 0.4);
  if (config.bodyStyle === 'drift') {
    wingGeo = new THREE.BoxGeometry(1.78, 0.06, 0.45);
  } else if (config.bodyStyle === 'stunt') {
    wingGeo = new THREE.BoxGeometry(1.6, 0.1, 0.5);
  }
  const mainWing = new THREE.Mesh(wingGeo, bodyMat);
  mainWing.position.set(0, 0.2, 0);
  mainWing.castShadow = true;

  // Endplates: Left = -X, Right = +X
  const endplateGeo = new THREE.BoxGeometry(0.04, 0.22, 0.42);
  const leftPlate = new THREE.Mesh(endplateGeo, trimMat);
  leftPlate.position.set(-0.82, 0.2, 0);
  const rightPlate = new THREE.Mesh(endplateGeo, trimMat);
  rightPlate.position.set(0.82, 0.2, 0);

  spoilerGroup.add(leftStrut, rightStrut, mainWing, leftPlate, rightPlate);
  carGroup.add(spoilerGroup);

  // -------------------------------------------------------------
  // 4. ROCKET EXHAUSTS & GLOW LIGHT (Left = -X, Right = +X)
  // -------------------------------------------------------------
  const exhaustGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.24, 12);
  exhaustGeo.rotateX(Math.PI / 2);

  const leftExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  leftExhaust.position.set(-0.3, 0.26, -1.74);
  const rightExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  rightExhaust.position.set(0.3, 0.26, -1.74);
  carGroup.add(leftExhaust, rightExhaust);

  const exhaustLight = new THREE.PointLight(accentColor, 0.6, 4.0);
  exhaustLight.position.set(0, 0.26, -1.9);
  carGroup.add(exhaustLight);

  // -------------------------------------------------------------
  // 5. TOY CHROME WHEELS WITH INDEPENDENT ROTATION & STEERING
  // -------------------------------------------------------------
  const wheelRadius = 0.34;
  const wheelWidth = 0.26;
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  tireGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth * 1.02, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const makeWheel = () => {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, chromeMat);

    // Hubcap center point
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, wheelWidth * 1.06, 8), bodyMat);
    cap.rotateZ(Math.PI / 2);

    wGroup.add(tire, rim, cap);
    return { wGroup, tireMesh: tire };
  };

  const frontWheelGroups: THREE.Group[] = [];
  const allWheels: THREE.Mesh[] = [];

  // Wheel Coordinates:
  // FL (-0.84, 0.34, +1.0), FR (+0.84, 0.34, +1.0)
  // RL (-0.84, 0.34, -1.0), RR (+0.84, 0.34, -1.0)
  const wheelCoords = [
    { x: -0.84, z: 1.0, isFront: true },  // Front Left
    { x: 0.84, z: 1.0, isFront: true },   // Front Right
    { x: -0.84, z: -1.0, isFront: false }, // Rear Left
    { x: 0.84, z: -1.0, isFront: false }  // Rear Right
  ];

  wheelCoords.forEach(({ x, z, isFront }) => {
    const { wGroup, tireMesh } = makeWheel();
    allWheels.push(tireMesh);

    if (isFront) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(x, 0.34, z);
      steerPivot.add(wGroup);
      carGroup.add(steerPivot);
      frontWheelGroups.push(steerPivot);
    } else {
      wGroup.position.set(x, 0.34, z);
      carGroup.add(wGroup);
    }
  });

  return {
    group: carGroup,
    wheels: allWheels,
    frontWheels: frontWheelGroups,
    exhaustLight,
    bodyMesh,
    setEmissiveBoost: (isBoosting: boolean) => {
      if (isBoosting) {
        exhaustLight.intensity = 2.5;
        exhaustLight.distance = 6.0;
        exhaustMat.emissiveIntensity = 2.0;
        exhaustMat.color.setHex(0x38bdf8);
      } else {
        exhaustLight.intensity = 0.6;
        exhaustLight.distance = 4.0;
        exhaustMat.emissiveIntensity = 0.4;
      }
    },
    setWheelSteer: (angle: number) => {
      frontWheelGroups.forEach(pivot => {
        pivot.rotation.y = angle;
      });
    },
    spinWheels: (distanceDelta: number) => {
      const rotAngle = distanceDelta / wheelRadius;
      allWheels.forEach(w => {
        w.rotation.x += rotAngle;
      });
    }
  };
}
