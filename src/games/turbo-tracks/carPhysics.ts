import * as THREE from 'three';
import { RacerState, StuntScoreNotice } from './types';
import { BuiltTrackResult, TrackFrame } from './trackMeshBuilder';
import { turboAudio } from './toyAudio';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  boost: boolean;
  reset: boolean;
}

export class TurboPhysicsEngine {
  private track: BuiltTrackResult;
  private nextStuntId = 1;

  constructor(track: BuiltTrackResult) {
    this.track = track;
  }

  public setTrack(track: BuiltTrackResult) {
    this.track = track;
  }

  // Find nearest spline parameter t for a world position
  public getClosestSplineT(pos: THREE.Vector3, currentT: number): number {
    let bestT = currentT;
    let bestDistSq = Infinity;

    // Search locally around current progress to prevent skipping or backtracking
    for (let i = -20; i <= 30; i++) {
      const sampleT = (currentT + i / 400 + 1.0) % 1.0;
      const pt = this.track.curve.getPointAt(sampleT);
      const dSq = pos.distanceToSquared(pt);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestT = sampleT;
      }
    }
    return bestT;
  }

  public updatePlayer(
    player: RacerState,
    input: InputState,
    delta: number,
    onStunt: (notice: StuntScoreNotice) => void,
    onFall?: () => void
  ) {
    const car = player.carConfig;

    // -------------------------------------------------------------
    // 1. CONTROLLED SPEED & PROGRESSIVE DIFFICULTY
    // Max speed reduced by 25-30% for accessible, controllable handling.
    // Lap 1 is relaxed; speed increases smoothly with each lap (+6% per lap).
    // -------------------------------------------------------------
    const lapProgression = 1.0 + Math.min(0.12, (player.currentLap - 1) * 0.06);
    const baseMaxSpeed = (92 + car.speed * 5.0) * lapProgression;
    const maxSpeed = player.isBoosting ? baseMaxSpeed * 1.25 : baseMaxSpeed;

    // Smooth progressive acceleration (builds momentum without snapping)
    const accelBase = (18 + car.acceleration * 2.4) * (player.isBoosting ? 1.3 : 1.0);
    const brakeRate = 50; // Controlled, progressive braking
    const maxReverseSpeed = -28; // km/h

    // -------------------------------------------------------------
    // 2. BOOST MECHANIC (Controllable surge)
    // -------------------------------------------------------------
    if (input.boost && player.boostReserve > 5 && !player.isBoosting) {
      player.isBoosting = true;
      turboAudio.playBoostPad();
    }
    if (player.isBoosting) {
      player.boostReserve = Math.max(0, player.boostReserve - delta * 24);
      if (player.boostReserve <= 0 || (!input.boost && player.speedKmH <= baseMaxSpeed * 1.04)) {
        player.isBoosting = false;
      }
    }

    // Manual Reset / Recover (R key or button)
    if (input.reset) {
      player.steer = 0;
      player.steerAngle = 0;
      player.headingAngle = 0;
      player.lateralVelocity = 0;
      player.speedKmH = Math.max(35, player.speedKmH);
      player.isAirborne = false;
      turboAudio.playLanding();
    }

    // -------------------------------------------------------------
    // 3. GROUND PHYSICS (DIRECTIONAL MOVEMENT & SMOOTH STEERING)
    // -------------------------------------------------------------
    if (!player.isAirborne) {
      // Forward / Reverse / Braking
      if (input.forward) {
        const speedRatio = Math.max(0, Math.min(1, player.speedKmH / maxSpeed));
        const torqueFactor = Math.max(0.38, 1.0 - speedRatio * 0.52);
        player.speedKmH = Math.min(maxSpeed, player.speedKmH + accelBase * torqueFactor * delta);
      } else if (input.backward) {
        if (player.speedKmH > 3) {
          player.speedKmH = Math.max(0, player.speedKmH - brakeRate * delta);
        } else {
          player.speedKmH = Math.max(maxReverseSpeed, player.speedKmH - 20 * delta);
        }
      } else {
        // Natural rolling friction coasting
        player.speedKmH *= Math.pow(0.976, delta * 60);
        if (Math.abs(player.speedKmH) < 0.2) player.speedKmH = 0;
      }

      // -----------------------------------------------------------
      // STEERING & ROTATION PHYSICS
      // Raw Steering Input:
      // A / Left Arrow  -> negative (-1.0) -> steer LEFT
      // D / Right Arrow -> positive (+1.0) -> steer RIGHT
      // -----------------------------------------------------------
      let rawSteerInput = 0;
      if (input.left) rawSteerInput -= 1.0;
      if (input.right) rawSteerInput += 1.0;

      const currentSpeed = Math.abs(player.speedKmH);
      const isReversing = player.speedKmH < -1;
      const driveSign = isReversing ? -1 : 1;
      const effectiveSteerInput = rawSteerInput * driveSign;

      // Speed-dependent sensitivity:
      // Stronger steering at low speed, reduced sensitivity at high speed for highway stability.
      const speedFactor = THREE.MathUtils.clamp(1.2 - (currentSpeed / 140) * 0.45, 0.62, 1.25);
      const handlingBonus = 0.85 + (car.handling / 10) * 0.3;
      const maxSteerAngle = 0.34 * speedFactor * handlingBonus; // in radians (~19 degrees)
      // Coordinate System Compensation:
      // In Three.js world coordinates when facing +Z with the chase camera positioned behind,
      // +X is screen LEFT and -X is screen RIGHT.
      // Left steering input (rawSteerInput = -1.0) maps to a positive rotation (+X = LEFT),
      // and right steering input (rawSteerInput = +1.0) maps to a negative rotation (-X = RIGHT).
      const targetSteerAngle = -effectiveSteerInput * maxSteerAngle;

      // Steering interpolation:
      // Responsive entry into turns, natural smooth self-centering without snapping
      const steerDampSpeed = effectiveSteerInput !== 0 ? 11.0 : 8.5;
      player.steerAngle = THREE.MathUtils.damp(
        player.steerAngle || 0,
        targetSteerAngle,
        steerDampSpeed,
        delta
      );

      // Drift handling:
      if (input.drift && currentSpeed > 28 && effectiveSteerInput !== 0) {
        player.isDrifting = true;
        const targetDrift = -effectiveSteerInput * (0.26 + (car.handling / 10) * 0.08);
        player.driftValue = THREE.MathUtils.damp(player.driftValue || 0, targetDrift, 5.0, delta);
        player.boostReserve = Math.min(100, player.boostReserve + delta * 20);
      } else {
        player.isDrifting = false;
        player.driftValue = THREE.MathUtils.damp(player.driftValue || 0, 0, 7.5, delta);
      }

      // -----------------------------------------------------------
      // CAR HEADING (YAW RELATIVE TO TRACK)
      // Steer Left (A / ArrowLeft)  -> player.headingAngle < 0 (car nose rotates LEFT)
      // Steer Right (D / ArrowRight) -> player.headingAngle > 0 (car nose rotates RIGHT)
      // Release -> smoothly stabilizes back to 0 (neutral parallel with track)
      // Forward vector directly follows heading so car travels through curve
      // -----------------------------------------------------------
      const steerInfluence = 0.92;
      const targetHeading = ((player.steerAngle || 0) * steerInfluence) + (player.isDrifting ? (player.driftValue || 0) : 0);
      player.headingAngle = THREE.MathUtils.damp(
        player.headingAngle || 0,
        targetHeading,
        12.0,
        delta
      );

      // Fetch exact track frame (interpolated from 3D road ribbon)
      const frame: TrackFrame = this.track.getFrameAt(player.trackProgress);

      // -----------------------------------------------------------
      // DIRECTIONAL MOVEMENT: CAR MOVES IN THE DIRECTION IT FACES
      // -----------------------------------------------------------
      const speedMs = (player.speedKmH * 1000) / 3600;
      const trackLength = 700;

      // Forward velocity along the road spline
      const forwardSpeed = speedMs * Math.cos(player.headingAngle || 0);
      const deltaT = (forwardSpeed * delta) / trackLength;

      const prevT = player.trackProgress;
      player.trackProgress = (player.trackProgress + deltaT + 1.0) % 1.0;

      // Lap completion detection
      if (prevT > 0.85 && player.trackProgress < 0.15 && deltaT > 0) {
        player.currentLap += 1;
        turboAudio.playLapPass();
      }

      // Lateral velocity across the road (headingAngle < 0 is Left, headingAngle > 0 is Right)
      const lateralSpeed = speedMs * Math.sin(player.headingAngle || 0);
      player.steer = (player.steer || 0) + lateralSpeed * delta;

      const carUp = frame.normal.clone();
      const carForward = frame.tangent.clone().applyAxisAngle(carUp, player.headingAngle || 0).normalize();
      const carRight = new THREE.Vector3().crossVectors(carUp, carForward).normalize();

      // Guardrail collision: bounce/glide smoothly along track borders
      const maxLateral = (this.track.trackWidth / 2) - 0.65;
      if (Math.abs(player.steer) > maxLateral) {
        // If moving at high speed and steering hard into the rail: vault over rail into air!
        if (player.speedKmH > 85 && Math.abs(player.headingAngle || 0) > 0.45) {
          player.isAirborne = true;
          player.airTimeSeconds = 0;
          const launchSpeed = (player.speedKmH * 1000) / 3600;
          player.vel.copy(carForward).multiplyScalar(launchSpeed * 0.9);
          const outDir = player.steer > 0 ? 1 : -1;
          player.vel.addScaledVector(frame.binormal, outDir * 6.0);
          player.vel.y = 4.0;
          turboAudio.playCrash();
        } else {
          // Normal wall collision: bounce off and slow down (safe crash protection)
          player.steer = maxLateral * Math.sign(player.steer);
          player.headingAngle = Math.sign(player.steer) > 0 
            ? Math.min(0, (player.headingAngle || 0) * 0.4) 
            : Math.max(0, (player.headingAngle || 0) * 0.4);
          player.steerAngle = Math.sign(player.steer) > 0 
            ? Math.min(0, (player.steerAngle || 0) * 0.4) 
            : Math.max(0, (player.steerAngle || 0) * 0.4);
          player.speedKmH *= 0.94;
        }
      }

      // -----------------------------------------------------------
      // 3D POSITION & ROTATION ORIENTATION
      // frame.binormal points RIGHT across the road
      // frame.normal points UPWARDS from the road surface
      // -----------------------------------------------------------
      player.pos.copy(frame.pos)
        .addScaledVector(frame.binormal, player.steer)
        .addScaledVector(frame.normal, 0.35);

      const rotMatrix = new THREE.Matrix4().makeBasis(carRight, carUp, carForward);
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
      player.quaternion.slerp(targetQuat, delta * 14.0);

      // -----------------------------------------------------------
      // WHEEL VISUAL ROTATION & TURNING
      // -----------------------------------------------------------
      if (player.builtCar) {
        player.builtCar.setWheelSteer(player.steerAngle || 0);
        player.builtCar.spinWheels(speedMs * delta);
        player.builtCar.setEmissiveBoost(player.isBoosting);
      }

      // Check Boost Pads
      for (const pad of this.track.boostPads) {
        if (Math.abs(pad.t - player.trackProgress) < 0.014) {
          player.speedKmH = Math.min(baseMaxSpeed * 1.28, player.speedKmH + 32);
          player.isBoosting = true;
          player.boostReserve = Math.min(100, player.boostReserve + 60);
          turboAudio.playBoostPad();
          onStunt({
            id: this.nextStuntId++,
            label: 'BOOST SURGE!',
            points: 150,
            time: Date.now(),
            combo: 1
          });
          break;
        }
      }

      // Check Jump Ramps
      for (const jump of this.track.jumpRamps) {
        if (Math.abs(jump.t - player.trackProgress) < 0.016) {
          player.isAirborne = true;
          player.airTimeSeconds = 0;
          player.airFlipAccum = 0;
          player.airRollAccum = 0;
          const launchSpeed = (Math.max(15, player.speedKmH) * 1000) / 3600;
          player.vel.copy(carForward).multiplyScalar(launchSpeed * 0.95);
          player.vel.y = player.speedKmH > 45 ? 15.5 : 4.0;
          turboAudio.playJump();
          break;
        }
      }
    } else {
      // -----------------------------------------------------------
      // 4. AIRBORNE FLIPS, TRICKS & GENEROUS AIRTIME
      // -----------------------------------------------------------
      player.airTimeSeconds += delta;
      player.vel.y -= 19.5 * delta;
      player.pos.addScaledVector(player.vel, delta);

      let pitchInput = 0;
      let rollInput = 0;
      if (input.forward) pitchInput += 1;
      if (input.backward) pitchInput -= 1;
      if (input.left) rollInput -= 1;
      if (input.right) rollInput += 1;

      const trickSpeed = 3.6;
      const pitchDelta = pitchInput * delta * trickSpeed;
      const rollDelta = rollInput * delta * trickSpeed;

      player.airFlipAccum += Math.abs(pitchDelta);
      player.airRollAccum += Math.abs(rollDelta);

      const qDelta = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitchDelta, 0, rollDelta, 'XYZ')
      );
      player.quaternion.multiply(qDelta);

      if (player.airFlipAccum >= Math.PI * 2) {
        player.airFlipAccum -= Math.PI * 2;
        player.stuntScore += 500;
        player.boostReserve = Math.min(100, player.boostReserve + 35);
        turboAudio.playStunt();
        onStunt({
          id: this.nextStuntId++,
          label: '360° FLIP +500',
          points: 500,
          time: Date.now(),
          combo: 2
        });
      }

      if (player.airRollAccum >= Math.PI * 2) {
        player.airRollAccum -= Math.PI * 2;
        player.stuntScore += 400;
        player.boostReserve = Math.min(100, player.boostReserve + 30);
        turboAudio.playStunt();
        onStunt({
          id: this.nextStuntId++,
          label: 'BARREL ROLL +400',
          points: 400,
          time: Date.now(),
          combo: 2
        });
      }

      // Safe landing check
      const nearestT = this.getClosestSplineT(player.pos, player.trackProgress);
      const trackPt = this.track.curve.getPointAt(nearestT);
      const distSq = player.pos.distanceToSquared(trackPt);

      if (distSq < 22.0 && player.vel.y < 0) {
        player.isAirborne = false;
        player.trackProgress = nearestT;
        player.steer = 0;
        player.headingAngle = 0;
        player.steerAngle = 0;
        turboAudio.playLanding();

        if (player.airTimeSeconds > 0.65) {
          const airPoints = Math.floor(player.airTimeSeconds * 100);
          player.stuntScore += airPoints;
          onStunt({
            id: this.nextStuntId++,
            label: `BIG AIR +${airPoints}`,
            points: airPoints,
            time: Date.now(),
            combo: 1
          });
        }
        player.airTimeSeconds = 0;
      } else {
        // Fall detection check when airborne
        const currentTrackFrame = this.track.getFrameAt(player.trackProgress);
        const isBelowTrack = player.pos.y < currentTrackFrame.pos.y - 4.5 && player.vel.y < -3.0;
        const isBelowWorldFloor = player.pos.y < 0.8;
        const isTooFarOffTrack = distSq > 30.0 * 30.0;
        const isPlungingAirborne = player.airTimeSeconds > 2.8 && player.vel.y < -6.0;

        if (isBelowTrack || isBelowWorldFloor || isTooFarOffTrack || isPlungingAirborne) {
          onFall?.();
          return;
        }
      }
    }

    // -------------------------------------------------------------
    // 5. MOVING OBSTACLE COLLISIONS (Controlled & Forgiving)
    // -------------------------------------------------------------
    for (const obs of this.track.movingObstacles) {
      const dSq = player.pos.distanceToSquared(obs.pos);
      if (dSq < obs.radius * obs.radius) {
        player.speedKmH *= 0.75;
        player.isBoosting = false;
        turboAudio.playCrash();
        player.steer = player.steer > 0 ? -1.0 : 1.0;
        player.headingAngle = 0;
        break;
      }
    }

    // Total progress for ranking
    player.totalProgress = player.currentLap + player.trackProgress;

    // Sync 3D Mesh
    player.meshGroup.position.copy(player.pos);
    player.meshGroup.quaternion.copy(player.quaternion);

    // Engine Audio
    turboAudio.updateEngineSound(player.speedKmH, player.isDrifting, player.isBoosting);
  }

  // Update AI Opponents (Slower by 20-25%, smooth launch, fair pacing)
  public updateAI(
    ai: RacerState,
    delta: number,
    aiIndex: number,
    playerTotalProgress: number = 1.0
  ) {
    const lapFactor = 1.0 + Math.min(0.12, (ai.currentLap - 1) * 0.05);
    const targetAiSpeed = (84 + (ai.aiSkillFactor || 0.8) * 16) * lapFactor;

    // Smooth starting grid acceleration
    const effectiveTarget = (ai.totalProgress < 1.08 && playerTotalProgress < 1.08)
      ? Math.min(targetAiSpeed, 86)
      : targetAiSpeed;

    ai.speedKmH = THREE.MathUtils.damp(
      ai.speedKmH,
      effectiveTarget + Math.sin(Date.now() * 0.001 + aiIndex) * 5,
      1.6,
      delta
    );

    const speedMs = (ai.speedKmH * 1000) / 3600;
    const trackLength = 700;
    const deltaT = (speedMs * delta) / trackLength;

    const prevT = ai.trackProgress;
    ai.trackProgress = (ai.trackProgress + deltaT + 1.0) % 1.0;

    if (prevT > 0.85 && ai.trackProgress < 0.15 && deltaT > 0) {
      ai.currentLap += 1;
    }

    ai.totalProgress = ai.currentLap + ai.trackProgress;

    // Position along track frame
    const frame = this.track.getFrameAt(ai.trackProgress);
    const laneOffset = (ai.aiSteerOffset || 0) + Math.sin(Date.now() * 0.002 + aiIndex) * 0.4;

    ai.pos.copy(frame.pos)
      .addScaledVector(frame.binormal, laneOffset)
      .addScaledVector(frame.normal, 0.35);

    const lookMatrix = new THREE.Matrix4().makeBasis(frame.binormal, frame.normal, frame.tangent);
    ai.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(lookMatrix), delta * 8);

    ai.meshGroup.position.copy(ai.pos);
    ai.meshGroup.quaternion.copy(ai.quaternion);

    if (ai.builtCar) {
      ai.builtCar.spinWheels(speedMs * delta);
    }
  }
}
