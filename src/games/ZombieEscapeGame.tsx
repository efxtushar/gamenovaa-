import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import '../styles/zombie-escape.css';
import {
  Play,
  RotateCcw,
  Trophy,
  Skull,
  Crosshair,
  Heart,
  Zap,
  RefreshCw,
  Volume2,
  VolumeX,
  Pause,
  ArrowLeft,
  AlertTriangle,
  Flame,
  Shield
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

// -------------------------------------------------------------
// WEAPON SPECIFICATIONS
// -------------------------------------------------------------
export interface Weapon {
  name: string;
  type: 'pistol' | 'shotgun' | 'rifle';
  caliber: string;
  damage: number;
  fireRate: number; // ms cooldown
  clipSize: number;
  reloadTime: number; // frames (~60fps)
  pellets: number;
  spread: number;
  range: number;
  bulletSpeed: number;
  color: string;
  glowColor: string;
}

export const WEAPONS: Record<'pistol' | 'shotgun' | 'rifle', Weapon> = {
  pistol: {
    name: '9mm Tactical Pistol',
    type: 'pistol',
    caliber: '9x19mm Parabellum',
    damage: 42,
    fireRate: 170,
    clipSize: 12,
    reloadTime: 50, // ~0.83s
    pellets: 1,
    spread: 0.025,
    range: 750,
    bulletSpeed: 22,
    color: '#facc15',
    glowColor: '#f59e0b'
  },
  shotgun: {
    name: '12-Gauge Riot Shotgun',
    type: 'shotgun',
    caliber: '12-Gauge 00 Buckshot',
    damage: 34, // x7 pellets = 238 damage point-blank
    fireRate: 520,
    clipSize: 8,
    reloadTime: 85, // ~1.4s
    pellets: 7,
    spread: 0.26,
    range: 480,
    bulletSpeed: 17,
    color: '#fb923c',
    glowColor: '#ea580c'
  },
  rifle: {
    name: 'M4A1 Spec-Ops Carbine',
    type: 'rifle',
    caliber: '5.56x45mm NATO',
    damage: 36,
    fireRate: 95,
    clipSize: 30,
    reloadTime: 70, // ~1.15s
    pellets: 1,
    spread: 0.06,
    range: 900,
    bulletSpeed: 25,
    color: '#38bdf8',
    glowColor: '#0284c7'
  }
};

export interface Bullet {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distTraveled: number;
  color: string;
  glowColor: string;
  isPlayer: boolean;
}

export interface BloodDecal {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'blood' | 'smoke' | 'fire' | 'spark' | 'shell' | 'acid';
}

export interface ItemDrop {
  x: number;
  y: number;
  type: 'health' | 'shotgun_ammo' | 'rifle_ammo';
  pulse: number;
}

export interface EnvironmentProp {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'humvee' | 'barricade' | 'street_lamp' | 'rubble';
  burning?: boolean;
}

export type ZombieType = 'walker' | 'runner' | 'tank' | 'spitter';

export class ZombieEntity {
  public id: string;
  public x: number;
  public y: number;
  public radius: number;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public damage: number;
  public type: ZombieType;
  public angle: number = 0;
  public attackCooldown: number = 0;
  public staggerTimer: number = 0;
  public walkFrame: number = 0;
  public spitTimer: number = 0;
  public active: boolean = true;
  public clothesColor: string;

  constructor(id: string, x: number, y: number, type: ZombieType, waveMult: number = 1) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;

    const clothesPalette = ['#1e293b', '#334155', '#475569', '#3f3f46', '#27272a'];
    this.clothesColor = clothesPalette[Math.floor(Math.random() * clothesPalette.length)];

    if (type === 'runner') {
      this.radius = 15;
      this.maxHp = Math.floor(40 * waveMult);
      this.hp = this.maxHp;
      // Beginner friendly speed scaling
      this.speed = 1.9 + Math.random() * 0.3 + (waveMult - 1) * 0.2;
      this.damage = 12;
    } else if (type === 'tank') {
      this.radius = 28;
      this.maxHp = Math.floor(250 * waveMult);
      this.hp = this.maxHp;
      this.speed = 0.9 + (waveMult - 1) * 0.1;
      this.damage = 28;
    } else if (type === 'spitter') {
      this.radius = 17;
      this.maxHp = Math.floor(55 * waveMult);
      this.hp = this.maxHp;
      this.speed = 1.3;
      this.damage = 15;
      this.spitTimer = 85 + Math.floor(Math.random() * 60);
    } else {
      // standard walker
      this.radius = 16;
      this.maxHp = Math.floor(50 * waveMult);
      this.hp = this.maxHp;
      // Friendly slow start for wave 1
      this.speed = 0.85 + Math.random() * 0.25 + (waveMult - 1) * 0.15;
      this.damage = 14;
    }
  }

  public takeDamage(dmg: number): boolean {
    this.hp -= dmg;
    this.staggerTimer = this.type === 'tank' ? 2 : 5;
    return this.hp <= 0;
  }

  public update(playerX: number, playerY: number, otherZombies: ZombieEntity[], props: EnvironmentProp[]): Bullet | null {
    if (this.staggerTimer > 0) {
      this.staggerTimer--;
      return null;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    let moveSpeed = this.speed;

    // Spitter projectile logic
    let projectile: Bullet | null = null;
    if (this.type === 'spitter') {
      if (dist < 260 && dist > 130) {
        moveSpeed = 0.3; // slows down to spit
      }
      this.spitTimer--;
      if (this.spitTimer <= 0 && dist < 480) {
        this.spitTimer = 110 + Math.floor(Math.random() * 40);
        projectile = {
          x: this.x + Math.cos(this.angle) * (this.radius + 6),
          y: this.y + Math.sin(this.angle) * (this.radius + 6),
          prevX: this.x,
          prevY: this.y,
          vx: Math.cos(this.angle) * 7,
          vy: Math.sin(this.angle) * 7,
          damage: this.damage,
          range: 500,
          distTraveled: 0,
          color: '#a855f7',
          glowColor: '#9333ea',
          isPlayer: false
        };
      }
    }

    // Direct movement toward player
    if (dist > 1) {
      const vx = (dx / dist) * moveSpeed;
      const vy = (dy / dist) * moveSpeed;
      this.x += vx;
      this.y += vy;
      this.walkFrame += this.speed * 0.12;
    }

    // Push away from other zombies to prevent clumping
    for (const other of otherZombies) {
      if (other.id === this.id) continue;
      const sepX = this.x - other.x;
      const sepY = this.y - other.y;
      const sepDist = Math.hypot(sepX, sepY);
      const minSep = this.radius + other.radius;
      if (sepDist < minSep && sepDist > 0.01) {
        const overlap = (minSep - sepDist) * 0.45;
        this.x += (sepX / sepDist) * overlap;
        this.y += (sepY / sepDist) * overlap;
      }
    }

    // Avoid solid props
    for (const prop of props) {
      if (prop.type === 'humvee' || prop.type === 'barricade') {
        const closestX = Math.max(prop.x, Math.min(this.x, prop.x + prop.w));
        const closestY = Math.max(prop.y, Math.min(this.y, prop.y + prop.h));
        const pDistX = this.x - closestX;
        const pDistY = this.y - closestY;
        const pDist = Math.hypot(pDistX, pDistY);
        if (pDist < this.radius && pDist > 0.001) {
          this.x = closestX + (pDistX / pDist) * this.radius;
          this.y = closestY + (pDistY / pDist) * this.radius;
        }
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
    return projectile;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Stagger hit flash
    if (this.staggerTimer > 0) {
      ctx.filter = 'brightness(1.8) contrast(1.4)';
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-2, 3, this.radius * 1.1, this.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    const legOffset = Math.sin(this.walkFrame) * (this.radius * 0.4);

    if (this.type === 'tank') {
      // TANK MUTANT (Spiked armor, massive bulk)
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-16, -18 + legOffset, 14, 10);
      ctx.fillRect(-16, 8 - legOffset, 14, 10);

      // Huge mutated torso
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.roundRect(-24, -22, 38, 44, 10);
      ctx.fill();

      // Armor plating
      ctx.fillStyle = '#44403c';
      ctx.fillRect(-18, -18, 16, 36);

      // Spikes
      ctx.fillStyle = '#78716c';
      ctx.fillRect(-8, -26, 4, 8);
      ctx.fillRect(-8, 18, 4, 8);

      // Toxic veins
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(6, -6);
      ctx.lineTo(10, 8);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(6, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      // Glowing yellow/orange eyes
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(14, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(14, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Heavy fist
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(8, -20, 16, 12);
      ctx.fillRect(8, 8, 16, 12);
    } else if (this.type === 'runner') {
      // SWIFT RUNNER (Crimson eyes, agile posture)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-12, -10 + legOffset * 1.5, 9, 5);
      ctx.fillRect(-12, 5 - legOffset * 1.5, 9, 5);

      // Torso
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Torn shirt
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-4, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(4, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Crimson eyes
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(9, -2.5, 2, 0, Math.PI * 2);
      ctx.arc(9, 2.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Claws
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(8, -9, 10, 3);
      ctx.fillRect(8, 6, 10, 3);
    } else if (this.type === 'spitter') {
      // ACID SPITTER
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(-10, -11 + legOffset, 8, 5);
      ctx.fillRect(-10, 6 - legOffset, 8, 5);

      // Bloated body
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Acid pustules
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-6, -6, 4, 0, Math.PI * 2);
      ctx.arc(-4, 5, 5, 0, Math.PI * 2);
      ctx.arc(2, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Head
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(5, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath();
      ctx.arc(10, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // STANDARD WALKER
      ctx.fillStyle = this.clothesColor;
      ctx.fillRect(-10, -11 + legOffset, 8, 5);
      ctx.fillRect(-10, 6 - legOffset, 8, 5);

      // Torso
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blood on torso
      ctx.fillStyle = '#881337';
      ctx.fillRect(-4, -4, 7, 8);

      // Head
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(4, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Dead eyes
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(9, -2.5, 1.8, 0, Math.PI * 2);
      ctx.arc(9, 2.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Reaching arms
      ctx.fillStyle = '#334155';
      const armLunge = this.attackCooldown > 15 ? 4 : 0;
      ctx.fillRect(4 + armLunge, -8, 12, 3.5);
      ctx.fillRect(4 + armLunge, 4.5, 12, 3.5);
    }

    // Health bar above head (for Tank or damaged enemies)
    if (this.hp < this.maxHp || this.type === 'tank') {
      const barW = this.radius * 2.2;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW, 4);
      ctx.fillStyle = this.type === 'tank' ? '#f59e0b' : '#ef4444';
      ctx.fillRect(-barW / 2, -this.radius - 12, barW * pct, 4);
    }

    ctx.restore();
  }
}

// -------------------------------------------------------------
// PLAYER ENTITY
// -------------------------------------------------------------
export class PlayerEntity {
  public x: number;
  public y: number;
  public radius: number = 16;
  public hp: number = 100;
  public maxHp: number = 100;
  public speed: number = 3.8;
  public sprintMultiplier: number = 1.45;
  public isSprinting: boolean = false;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public angle: number = 0;
  public currentWeapon: 'pistol' | 'shotgun' | 'rifle' = 'pistol';
  public ammoInClip: Record<'pistol' | 'shotgun' | 'rifle', number> = {
    pistol: 12,
    shotgun: 8,
    rifle: 30
  };
  public totalAmmo: Record<'pistol' | 'shotgun' | 'rifle', number> = {
    pistol: 999,
    shotgun: 48,
    rifle: 120
  };
  public isReloading: boolean = false;
  public reloadProgress: number = 0;
  public lastShotTime: number = 0;
  public invulnerabilityTimer: number = 0;
  public walkFrame: number = 0;
  public muzzleFlashTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public takeDamage(amount: number): boolean {
    if (this.invulnerabilityTimer > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerabilityTimer = 16;
    return this.hp <= 0;
  }

  public update(
    keys: { up: boolean; down: boolean; left: boolean; right: boolean; sprint: boolean },
    mouseX: number,
    mouseY: number,
    props: EnvironmentProp[],
    mapW: number,
    mapH: number
  ) {
    this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);

    const isMoving = keys.up || keys.down || keys.left || keys.right;
    if (keys.sprint && isMoving && this.stamina > 5) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - 0.45);
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(this.maxStamina, this.stamina + 0.35);
    }

    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const moveSpeed = this.speed * (this.isSprinting ? this.sprintMultiplier : 1.0);
      const moveX = (dx / len) * moveSpeed;
      const moveY = (dy / len) * moveSpeed;

      const testX = Math.max(this.radius, Math.min(mapW - this.radius, this.x + moveX));
      const testY = Math.max(this.radius, Math.min(mapH - this.radius, this.y + moveY));

      const hitX = props.some(p => (p.type === 'humvee' || p.type === 'barricade') &&
        testX >= p.x - this.radius &&
        testX <= p.x + p.w + this.radius &&
        this.y >= p.y - this.radius &&
        this.y <= p.y + p.h + this.radius
      );
      if (!hitX) this.x = testX;

      const hitY = props.some(p => (p.type === 'humvee' || p.type === 'barricade') &&
        this.x >= p.x - this.radius &&
        this.x <= p.x + p.w + this.radius &&
        testY >= p.y - this.radius &&
        testY <= p.y + p.h + this.radius
      );
      if (!hitY) this.y = testY;

      this.walkFrame += this.isSprinting ? 0.32 : 0.2;
    }

    // AUTO RELOAD CHECK:
    // If current weapon magazine is 0, not reloading, and has available ammo, start reload automatically!
    if (this.ammoInClip[this.currentWeapon] <= 0 && !this.isReloading) {
      if (this.currentWeapon === 'pistol' || this.totalAmmo[this.currentWeapon] > 0) {
        this.startReload();
      }
    }

    // RELOAD PROGRESSION
    if (this.isReloading) {
      const wpn = WEAPONS[this.currentWeapon];
      this.reloadProgress++;
      if (this.reloadProgress >= wpn.reloadTime) {
        this.completeReload();
      }
    }

    if (this.invulnerabilityTimer > 0) this.invulnerabilityTimer--;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer--;
  }

  public canShoot(now: number): boolean {
    if (this.isReloading) return false;
    const wpn = WEAPONS[this.currentWeapon];
    if (now - this.lastShotTime < wpn.fireRate) return false;
    if (this.ammoInClip[this.currentWeapon] <= 0) {
      // Trigger auto reload on empty fire attempt
      this.startReload();
      return false;
    }
    return true;
  }

  public fire(now: number): { bullets: Bullet[]; shells: Particle[] } {
    const wpn = WEAPONS[this.currentWeapon];
    this.lastShotTime = now;
    this.ammoInClip[this.currentWeapon] = Math.max(0, this.ammoInClip[this.currentWeapon] - 1);
    this.muzzleFlashTimer = 5;

    const bullets: Bullet[] = [];
    const shells: Particle[] = [];
    const gunTipDist = 26;
    const spawnX = this.x + Math.cos(this.angle) * gunTipDist;
    const spawnY = this.y + Math.sin(this.angle) * gunTipDist;

    for (let i = 0; i < wpn.pellets; i++) {
      const spreadAngle = this.angle + (Math.random() - 0.5) * wpn.spread;
      bullets.push({
        x: spawnX,
        y: spawnY,
        prevX: spawnX,
        prevY: spawnY,
        vx: Math.cos(spreadAngle) * wpn.bulletSpeed,
        vy: Math.sin(spreadAngle) * wpn.bulletSpeed,
        damage: wpn.damage,
        range: wpn.range,
        distTraveled: 0,
        color: wpn.color,
        glowColor: wpn.glowColor,
        isPlayer: true
      });
    }

    // Eject casing
    const casingAngle = this.angle - Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    shells.push({
      x: this.x + Math.cos(this.angle) * 12,
      y: this.y + Math.sin(this.angle) * 12,
      vx: Math.cos(casingAngle) * (2 + Math.random() * 2),
      vy: Math.sin(casingAngle) * (2 + Math.random() * 2),
      size: 2.5,
      color: '#fbbf24',
      alpha: 1.0,
      life: 25,
      maxLife: 25,
      type: 'shell'
    });

    // Auto-reload immediately if this shot emptied the magazine
    if (this.ammoInClip[this.currentWeapon] === 0) {
      this.startReload();
    }

    return { bullets, shells };
  }

  public startReload(): boolean {
    const wpn = WEAPONS[this.currentWeapon];
    if (this.isReloading) return false;
    if (this.ammoInClip[this.currentWeapon] >= wpn.clipSize) return false;
    if (this.currentWeapon !== 'pistol' && this.totalAmmo[this.currentWeapon] <= 0) return false;
    
    this.isReloading = true;
    this.reloadProgress = 0;
    sound.playClick();
    return true;
  }

  public completeReload() {
    const wpn = WEAPONS[this.currentWeapon];
    const needed = wpn.clipSize - this.ammoInClip[this.currentWeapon];
    if (this.currentWeapon === 'pistol') {
      this.ammoInClip.pistol = wpn.clipSize;
    } else {
      const available = Math.min(needed, this.totalAmmo[this.currentWeapon]);
      this.ammoInClip[this.currentWeapon] += available;
      this.totalAmmo[this.currentWeapon] = Math.max(0, this.totalAmmo[this.currentWeapon] - available);
    }
    this.isReloading = false;
    this.reloadProgress = 0;
    sound.playPowerUp();
  }

  public switchWeapon(type: 'pistol' | 'shotgun' | 'rifle') {
    if (this.currentWeapon === type) return;
    this.currentWeapon = type;
    this.isReloading = false;
    this.reloadProgress = 0;
    sound.playClick();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.invulnerabilityTimer > 0 && Math.floor(this.invulnerabilityTimer / 2) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(-2, 4, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boots / Legs
    const legOffset = Math.sin(this.walkFrame) * 7;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12, -12 + legOffset, 10, 6);
    ctx.fillRect(-12, 6 - legOffset, 10, 6);

    // Tactical pants
    ctx.fillStyle = '#334155';
    ctx.fillRect(-8, -11 + legOffset * 0.7, 7, 5);
    ctx.fillRect(-8, 6 - legOffset * 0.7, 7, 5);

    // Tactical Vest & Torso
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pouches & Camo Vest
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, -9, 12, 18);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-4, -7, 4, 4);
    ctx.fillRect(-4, 3, 4, 4);

    // Backpack
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-14, -8, 6, 16);

    // Head & Helmet
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(-1, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Kevlar Helmet
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-2, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7'; // Visor reflection
    ctx.fillRect(2, -4, 4, 8);

    // Laser Sight Line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(380, 0);
    ctx.stroke();

    // Weapon model
    const wpn = WEAPONS[this.currentWeapon];
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, -6, 12, 4); // hands
    ctx.fillRect(6, 2, 12, 4);

    ctx.fillStyle = '#1e293b';
    const barrelLen = this.currentWeapon === 'rifle' ? 18 : this.currentWeapon === 'shotgun' ? 16 : 11;
    ctx.fillRect(10, -3, barrelLen, 6);

    ctx.fillStyle = wpn.color;
    ctx.fillRect(12, -2, 6, 4);

    // Muzzle Flash Effect
    if (this.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = wpn.glowColor;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(12 + barrelLen + 4, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(12 + barrelLen + 6, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Draw circular reload progress bar around player if reloading
    if (this.isReloading) {
      const reloadPct = this.reloadProgress / wpn.reloadTime;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * reloadPct);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export const ZombieEscapeGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [wave, setWave] = useState(1);
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [ammoClip, setAmmoClip] = useState(12);
  const [ammoTotal, setAmmoTotal] = useState(999);
  const [activeWeapon, setActiveWeapon] = useState<'pistol' | 'shotgun' | 'rifle'>('pistol');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [zombiesRemaining, setZombiesRemaining] = useState(0);
  const [totalKills, setTotalKills] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_zombie-escape') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stateRef = useRef({
    player: new PlayerEntity(400, 300),
    zombies: [] as ZombieEntity[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    bloodDecals: [] as BloodDecal[],
    drops: [] as ItemDrop[],
    props: [] as EnvironmentProp[],
    keys: { up: false, down: false, left: false, right: false, sprint: false, fire: false },
    mouse: { x: 400, y: 200 },
    score: 0,
    kills: 0,
    waveNum: 1,
    zombieIdCounter: 1,
    screenShake: 0,
    time: 0
  });

  const updatePointerCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const actualW = canvas.width * scale;
    const actualH = canvas.height * scale;
    const offsetX = (rect.width - actualW) / 2;
    const offsetY = (rect.height - actualH) / 2;

    const clientXInCanvas = clientX - rect.left - offsetX;
    const clientYInCanvas = clientY - rect.top - offsetY;

    stateRef.current.mouse.x = Math.max(0, Math.min(canvas.width, clientXInCanvas / scale));
    stateRef.current.mouse.y = Math.max(0, Math.min(canvas.height, clientYInCanvas / scale));
  }, []);

  const initProps = useCallback(() => {
    return [
      { x: 120, y: 120, w: 90, h: 50, type: 'humvee' as const, burning: true },
      { x: 620, y: 380, w: 90, h: 50, type: 'humvee' as const, burning: false },
      { x: 340, y: 190, w: 60, h: 25, type: 'barricade' as const },
      { x: 460, y: 440, w: 60, h: 25, type: 'barricade' as const },
      { x: 260, y: 460, w: 20, h: 20, type: 'street_lamp' as const },
      { x: 580, y: 140, w: 20, h: 20, type: 'street_lamp' as const },
      { x: 150, y: 480, w: 30, h: 30, type: 'rubble' as const },
      { x: 690, y: 180, w: 30, h: 30, type: 'rubble' as const },
    ];
  }, []);

  const spawnWaveZombies = useCallback((waveNum: number) => {
    const s = stateRef.current;
    s.zombies = [];
    // Beginner-friendly wave count progression:
    // Wave 1: 5 slow walkers
    // Wave 2: 8 zombies (walkers + 1 runner)
    // Wave 3: 12 zombies (walkers + 2 runners + 1 spitter)
    // Wave 4+: scaling
    const count = waveNum === 1 ? 5 : waveNum === 2 ? 8 : 7 + waveNum * 3;
    const waveMult = 1 + (waveNum - 1) * 0.12;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      // Spawn zombies on perimeter away from the player (at least 320px distance)
      let attempts = 0;
      do {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { x = Math.random() * 800; y = -50 - Math.random() * 40; }
        else if (edge === 1) { x = 850 + Math.random() * 40; y = Math.random() * 600; }
        else if (edge === 2) { x = Math.random() * 800; y = 650 + Math.random() * 40; }
        else { x = -50 - Math.random() * 40; y = Math.random() * 600; }
        attempts++;
      } while (Math.hypot(x - s.player.x, y - s.player.y) < 300 && attempts < 10);

      let zType: ZombieType = 'walker';
      const rand = Math.random();
      if (waveNum === 1) {
        zType = 'walker'; // Wave 1 is 100% slow walkers
      } else if (waveNum === 2) {
        zType = rand < 0.2 ? 'runner' : 'walker';
      } else if (waveNum >= 4 && rand < 0.15) {
        zType = 'tank';
      } else if (waveNum >= 3 && rand < 0.25) {
        zType = 'spitter';
      } else if (rand < 0.35) {
        zType = 'runner';
      }

      s.zombies.push(new ZombieEntity(`z_${s.zombieIdCounter++}`, x, y, zType, waveMult));
    }
    setZombiesRemaining(s.zombies.length);
  }, []);

  const initWave = useCallback((waveNum: number) => {
    setWave(waveNum);
    stateRef.current.waveNum = waveNum;
    spawnWaveZombies(waveNum);
    setWaveAnnouncement(`⚠️ INCOMING BIO-HAZARD: WAVE ${waveNum} ⚠️`);
    sound.playPowerUp();

    setTimeout(() => {
      setWaveAnnouncement(null);
    }, 2400);
  }, [spawnWaveZombies]);

  const startGame = useCallback(() => {
    sound.playClick();
    const s = stateRef.current;
    s.player = new PlayerEntity(400, 300);
    s.zombies = [];
    s.bullets = [];
    s.particles = [];
    s.bloodDecals = [];
    s.drops = [];
    s.props = initProps();
    s.score = 0;
    s.kills = 0;
    s.zombieIdCounter = 1;
    s.screenShake = 0;

    setScore(0);
    setHealth(100);
    setStamina(100);
    setAmmoClip(12);
    setAmmoTotal(999);
    setActiveWeapon('pistol');
    setIsReloading(false);
    setReloadProgress(0);
    setTotalKills(0);
    setGameState('PLAYING');

    initWave(1);
  }, [initProps, initWave]);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_zombie-escape', finalScore.toString());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Lock input and prevent scrolling during gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      
      // Capture WASD, Arrows, Space, etc. to prevent webpage scrolling
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (['KeyW', 'ArrowUp'].includes(e.code)) s.keys.up = true;
      if (['KeyS', 'ArrowDown'].includes(e.code)) s.keys.down = true;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = true;
      if (['ShiftLeft', 'ShiftRight'].includes(e.code)) s.keys.sprint = true;
      if (['Space', 'KeyJ', 'KeyF'].includes(e.code)) s.keys.fire = true;
      
      if (e.code === 'KeyR') {
        e.preventDefault();
        const success = s.player.startReload();
        if (success) {
          setIsReloading(true);
        }
      }
      if (e.code === 'Digit1') {
        s.player.switchWeapon('pistol');
        setActiveWeapon('pistol');
      }
      if (e.code === 'Digit2') {
        s.player.switchWeapon('shotgun');
        setActiveWeapon('shotgun');
      }
      if (e.code === 'Digit3') {
        s.player.switchWeapon('rifle');
        setActiveWeapon('rifle');
      }
      if (e.code === 'KeyQ') {
        const nextWpn = s.player.currentWeapon === 'pistol' ? 'shotgun' : s.player.currentWeapon === 'shotgun' ? 'rifle' : 'pistol';
        s.player.switchWeapon(nextWpn);
        setActiveWeapon(nextWpn);
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyW', 'ArrowUp'].includes(e.code)) s.keys.up = false;
      if (['KeyS', 'ArrowDown'].includes(e.code)) s.keys.down = false;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
      if (['ShiftLeft', 'ShiftRight'].includes(e.code)) s.keys.sprint = false;
      if (['Space', 'KeyJ', 'KeyF'].includes(e.code)) s.keys.fire = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePointerCoords(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) stateRef.current.keys.fire = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) stateRef.current.keys.fire = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
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
  }, []);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const now = performance.now();
      s.time += 0.016;

      // 1. UPDATE PLAYER
      s.player.update(s.keys, s.mouse.x, s.mouse.y, s.props, w, h);
      setHealth(Math.floor(s.player.hp));
      setStamina(Math.floor(s.player.stamina));
      setAmmoClip(s.player.ammoInClip[s.player.currentWeapon]);
      setAmmoTotal(s.player.totalAmmo[s.player.currentWeapon]);
      setIsReloading(s.player.isReloading);
      if (s.player.isReloading) {
        const curWpn = WEAPONS[s.player.currentWeapon];
        setReloadProgress(Math.min(100, Math.floor((s.player.reloadProgress / curWpn.reloadTime) * 100)));
      } else {
        setReloadProgress(0);
      }

      if (s.player.hp <= 0) {
        handleGameOver(s.score);
        return;
      }

      // Player Firing
      if (s.keys.fire && s.player.canShoot(now)) {
        const { bullets, shells } = s.player.fire(now);
        s.bullets.push(...bullets);
        s.particles.push(...shells);
        s.screenShake = s.player.currentWeapon === 'shotgun' ? 5 : s.player.currentWeapon === 'rifle' ? 2 : 1.5;

        if (s.player.currentWeapon === 'shotgun') {
          sound.playExplosion();
        } else if (s.player.currentWeapon === 'rifle') {
          sound.playLaser(1600);
        } else {
          sound.playLaser(1200);
        }
      }

      // 2. AMBIENT BURNING PROP PARTICLES
      s.props.forEach(p => {
        if (p.burning && Math.random() < 0.4) {
          s.particles.push({
            x: p.x + 20 + Math.random() * (p.w - 40),
            y: p.y + 10 + Math.random() * (p.h - 20),
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.5 - Math.random() * 2,
            size: 4 + Math.random() * 5,
            color: Math.random() < 0.6 ? '#f97316' : '#eab308',
            alpha: 0.9,
            life: 30,
            maxLife: 30,
            type: 'fire'
          });
          // Smoke
          if (Math.random() < 0.3) {
            s.particles.push({
              x: p.x + 20 + Math.random() * (p.w - 40),
              y: p.y - 5,
              vx: (Math.random() - 0.5) * 1,
              vy: -1 - Math.random() * 1.5,
              size: 8 + Math.random() * 12,
              color: '#475569',
              alpha: 0.5,
              life: 50,
              maxLife: 50,
              type: 'smoke'
            });
          }
        }
      });

      // 3. UPDATE ZOMBIES
      s.zombies.forEach(z => {
        const spitBullet = z.update(s.player.x, s.player.y, s.zombies, s.props);
        if (spitBullet) s.bullets.push(spitBullet);

        // Melee attack
        const d = Math.hypot(s.player.x - z.x, s.player.y - z.y);
        if (d <= s.player.radius + z.radius + 2 && z.attackCooldown <= 0) {
          z.attackCooldown = 35;
          const killed = s.player.takeDamage(z.damage);
          s.screenShake = 8;
          sound.playHit();

          // Blood spray from player
          for (let i = 0; i < 8; i++) {
            s.particles.push({
              x: s.player.x,
              y: s.player.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              size: 3,
              color: '#dc2626',
              alpha: 1.0,
              life: 25,
              maxLife: 25,
              type: 'blood'
            });
          }

          if (killed) {
            handleGameOver(s.score);
            return;
          }
        }
      });

      // 4. UPDATE BULLETS WITH ACCURATE COLLISION
      for (let bIdx = s.bullets.length - 1; bIdx >= 0; bIdx--) {
        const b = s.bullets[bIdx];
        b.prevX = b.x;
        b.prevY = b.y;
        b.x += b.vx;
        b.y += b.vy;
        b.distTraveled += Math.hypot(b.vx, b.vy);

        // Check prop collision
        let hitProp = false;
        for (const p of s.props) {
          if (p.type === 'humvee' || p.type === 'barricade') {
            if (b.x >= p.x && b.x <= p.x + p.w && b.y >= p.y && b.y <= p.y + p.h) {
              hitProp = true;
              // Spark
              for (let i = 0; i < 4; i++) {
                s.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  size: 2,
                  color: '#fbbf24',
                  alpha: 1,
                  life: 12,
                  maxLife: 12,
                  type: 'spark'
                });
              }
              break;
            }
          }
        }

        if (hitProp || b.distTraveled >= b.range || b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) {
          s.bullets.splice(bIdx, 1);
          continue;
        }

        if (b.isPlayer) {
          let bulletHitZombie = false;
          for (let zIdx = s.zombies.length - 1; zIdx >= 0; zIdx--) {
            const z = s.zombies[zIdx];
            
            // Continuous ray/circle intersection to prevent tunneling on fast bullets
            const dist = Math.hypot(b.x - z.x, b.y - z.y);
            const prevDist = Math.hypot(b.prevX - z.x, b.prevY - z.y);
            const hitThreshold = z.radius + 6;

            if (dist <= hitThreshold || prevDist <= hitThreshold) {
              bulletHitZombie = true;
              s.bullets.splice(bIdx, 1);
              const died = z.takeDamage(b.damage);
              sound.playHit();

              // Blood splatter particles
              for (let p = 0; p < 8; p++) {
                s.particles.push({
                  x: z.x,
                  y: z.y,
                  vx: (Math.random() - 0.5) * 7 + b.vx * 0.2,
                  vy: (Math.random() - 0.5) * 7 + b.vy * 0.2,
                  size: 3.5,
                  color: z.type === 'spitter' ? '#a855f7' : '#991b1b',
                  alpha: 0.9,
                  life: 25,
                  maxLife: 25,
                  type: 'blood'
                });
              }

              if (died) {
                s.zombies.splice(zIdx, 1);
                s.kills++;
                const killScore = z.type === 'tank' ? 300 : z.type === 'spitter' ? 180 : z.type === 'runner' ? 120 : 80;
                s.score += killScore;
                setScore(s.score);
                setTotalKills(s.kills);
                setZombiesRemaining(s.zombies.length);

                // Add blood decal
                if (s.bloodDecals.length > 50) s.bloodDecals.shift();
                s.bloodDecals.push({
                  x: z.x,
                  y: z.y,
                  radius: z.radius * 1.4,
                  alpha: 0.65,
                  color: z.type === 'spitter' ? '#6b21a8' : '#7f1d1d'
                });

                // Drop items
                if (Math.random() < 0.3) {
                  const dropTypes: ItemDrop['type'][] = ['health', 'shotgun_ammo', 'rifle_ammo'];
                  s.drops.push({
                    x: z.x,
                    y: z.y,
                    type: dropTypes[Math.floor(Math.random() * dropTypes.length)],
                    pulse: 0
                  });
                }
              }
              break;
            }
          }
          if (bulletHitZombie) continue;
        } else {
          // Acid projectile hitting player
          const d = Math.hypot(b.x - s.player.x, b.y - s.player.y);
          if (d <= s.player.radius + 6) {
            s.bullets.splice(bIdx, 1);
            s.player.takeDamage(b.damage);
            s.screenShake = 6;
            sound.playHit();
          }
        }
      }

      // Check next wave
      if (s.zombies.length === 0) {
        initWave(s.waveNum + 1);
      }

      // 5. UPDATE DROPS
      for (let dIdx = s.drops.length - 1; dIdx >= 0; dIdx--) {
        const drop = s.drops[dIdx];
        drop.pulse += 0.06;
        const d = Math.hypot(s.player.x - drop.x, s.player.y - drop.y);

        if (d <= s.player.radius + 18) {
          s.drops.splice(dIdx, 1);
          sound.playCoin();

          if (drop.type === 'health') {
            s.player.hp = Math.min(100, s.player.hp + 35);
          } else if (drop.type === 'shotgun_ammo') {
            s.player.totalAmmo.shotgun += 16;
          } else if (drop.type === 'rifle_ammo') {
            s.player.totalAmmo.rifle += 60;
          }
        }
      }

      // 6. UPDATE PARTICLES
      for (let pIdx = s.particles.length - 1; pIdx >= 0; pIdx--) {
        const p = s.particles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) s.particles.splice(pIdx, 1);
      }

      // -------------------------------------------------------------
      // CINEMATIC RENDER PIPELINE
      // -------------------------------------------------------------
      ctx.save();

      // Screen shake
      if (s.screenShake > 0) {
        const sx = (Math.random() - 0.5) * s.screenShake * 2;
        const sy = (Math.random() - 0.5) * s.screenShake * 2;
        ctx.translate(sx, sy);
        s.screenShake = Math.max(0, s.screenShake - 0.5);
      }

      // 1. Ruined City Ground
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Cracked road pattern
      ctx.strokeStyle = '#151c2c';
      ctx.lineWidth = 1.5;
      for (let rx = 0; rx < w; rx += 60) {
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx, h);
        ctx.stroke();
      }
      for (let ry = 0; ry < h; ry += 60) {
        ctx.beginPath();
        ctx.moveTo(0, ry);
        ctx.lineTo(w, ry);
        ctx.stroke();
      }

      // Yellow caution markings
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Blood Decals on ground
      s.bloodDecals.forEach(d => {
        ctx.fillStyle = d.color;
        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 3. Environment Props
      s.props.forEach(p => {
        if (p.type === 'humvee') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = '#334155';
          ctx.fillRect(p.x + 10, p.y + 6, p.w - 20, p.h - 12);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(p.x + p.w - 18, p.y + 10, 8, p.h - 20);

          if (p.burning) {
            ctx.fillStyle = '#ea580c';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 15;
            ctx.fillRect(p.x + 15, p.y + 12, 20, 15);
            ctx.shadowBlur = 0;
          }
        } else if (p.type === 'barricade') {
          ctx.fillStyle = '#475569';
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = '#f59e0b';
          for (let i = 0; i < p.w; i += 12) {
            ctx.fillRect(p.x + i, p.y + 2, 6, p.h - 4);
          }
        } else if (p.type === 'street_lamp') {
          const flicker = Math.sin(s.time * 12 + p.x) > 0.8 ? 0.3 : 1.0;
          const lampGrad = ctx.createRadialGradient(p.x + 10, p.y + 10, 5, p.x + 10, p.y + 10, 140);
          lampGrad.addColorStop(0, `rgba(254, 240, 138, ${0.35 * flicker})`);
          lampGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = lampGrad;
          ctx.fillRect(p.x - 130, p.y - 130, 280, 280);

          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(p.x + 10, p.y + 10, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'rubble') {
          ctx.fillStyle = '#334155';
          ctx.fillRect(p.x, p.y, p.w, p.h);
        }
      });

      // 4. Item Drops
      s.drops.forEach(drop => {
        const glow = Math.sin(drop.pulse) * 4;
        ctx.save();
        ctx.translate(drop.x, drop.y);

        const col = drop.type === 'health' ? '#22c55e' : drop.type.includes('shotgun') ? '#fb923c' : '#38bdf8';
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 14 + glow;

        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(drop.type === 'health' ? '✚' : drop.type.includes('shotgun') ? 'SG' : 'AR', 0, 3.5);
        ctx.restore();
      });

      // 5. Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 6. Zombies
      s.zombies.forEach(z => z.draw(ctx));

      // 7. Player
      s.player.draw(ctx);

      // 8. Bullets & Lasers
      s.bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.isPlayer ? 3.5 : 5, 0, Math.PI * 2);
        ctx.fill();

        // Tracer line
        ctx.strokeStyle = b.glowColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 9. DYNAMIC FLASHLIGHT RAYCASTING & DARKNESS OVERLAY
      const fAngle = s.player.angle;
      const fDist = 400;
      const fSpread = Math.PI / 3.0;

      ctx.save();
      const darkOverlay = ctx.createRadialGradient(
        s.player.x, s.player.y, 45,
        s.player.x, s.player.y, 520
      );
      darkOverlay.addColorStop(0, 'rgba(8, 11, 18, 0.18)');
      darkOverlay.addColorStop(0.6, 'rgba(8, 11, 18, 0.65)');
      darkOverlay.addColorStop(1, 'rgba(8, 11, 18, 0.94)');

      ctx.fillStyle = darkOverlay;
      ctx.fillRect(0, 0, w, h);

      // Flashlight Beam Cone
      const flashCone = ctx.createRadialGradient(
        s.player.x, s.player.y, 10,
        s.player.x + Math.cos(fAngle) * 200, s.player.y + Math.sin(fAngle) * 200, fDist
      );
      flashCone.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      flashCone.addColorStop(0.5, 'rgba(254, 240, 138, 0.18)');
      flashCone.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.beginPath();
      ctx.moveTo(s.player.x, s.player.y);
      ctx.arc(s.player.x, s.player.y, fDist, fAngle - fSpread / 2, fAngle + fSpread / 2);
      ctx.closePath();
      ctx.fillStyle = flashCone;
      ctx.fill();
      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, initWave]);

  const activeWeaponObj = WEAPONS[activeWeapon];

  return (
    <div className="zombie-escape" ref={containerRef}>
      {/* 1. CANVAS GAMEPLAY */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) {
            updatePointerCoords(touch.clientX, touch.clientY);
            stateRef.current.keys.fire = true;
          }
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) {
            updatePointerCoords(touch.clientX, touch.clientY);
          }
        }}
        onTouchEnd={() => {
          stateRef.current.keys.fire = false;
        }}
        className="cursor-crosshair"
      />

      {/* 2. SURROUNDING HUD */}
      <div className="zombie-escape__hud">
        {/* STATS */}
        <div className="zombie-escape__stats">
          {/* Health */}
          <div className="zombie-escape__stat zombie-escape__health">
            <span className="zombie-escape__stat-label">Health</span>
            <span className="zombie-escape__stat-value">{health}%</span>
            <div className="zombie-escape__health-bar">
              <div
                className="zombie-escape__health-fill"
                style={{ width: `${Math.max(0, health)}%` }}
              />
            </div>
          </div>

          {/* Wave */}
          <div className="zombie-escape__stat">
            <span className="zombie-escape__stat-label">Wave</span>
            <span className="zombie-escape__stat-value">{wave}</span>
          </div>

          {/* Score */}
          <div className="zombie-escape__stat">
            <span className="zombie-escape__stat-label">Score</span>
            <span className="zombie-escape__stat-value">{score.toLocaleString()}</span>
          </div>

          {/* Minimal unobtrusive Ammo */}
          <div className="zombie-escape__stat">
            <span className="zombie-escape__stat-label">Ammo</span>
            <span className="zombie-escape__stat-value">
              {ammoClip} <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: 600 }}>/ {activeWeapon === 'pistol' ? '∞' : ammoTotal}</span>
            </span>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="zombie-escape__controls">
          <button
            type="button"
            className="zombie-escape__button"
            onClick={() => {
              const muted = sound.toggleMute();
              setSoundEnabled(!muted);
            }}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            className="zombie-escape__button"
            onClick={() => setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev)}
            title="Pause / Resume (P)"
          >
            {gameState === 'PAUSED' ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            type="button"
            className="zombie-escape__button"
            onClick={startGame}
            title="Restart Mission"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onBack && (
            <button
              type="button"
              className="zombie-escape__button"
              onClick={onBack}
              title="Exit Game"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CROSSHAIR */}
        <div className="zombie-escape__crosshair" />

        {/* RELOAD BAR */}
        <div className={`zombie-escape__reload ${!isReloading ? 'zombie-escape__hidden' : ''}`} hidden={!isReloading}>
          <span>Reloading...</span>
          <div className="zombie-escape__reload-bar">
            <div
              className="zombie-escape__reload-progress"
              style={{ width: `${reloadProgress}%` }}
            />
          </div>
        </div>

        {/* WAVE ANNOUNCEMENT NOTIFICATION */}
        {waveAnnouncement && (
          <div style={{ position: 'absolute', top: '76px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 20 }}>
            <div className="px-5 py-2 rounded-xl bg-red-950/90 border border-red-500/80 text-red-200 font-display font-black text-xs sm:text-sm tracking-widest shadow-2xl backdrop-blur-md flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{waveAnnouncement}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. GAME OVERLAYS */}
      {gameState !== 'PLAYING' && (
        <div className="zombie-escape__overlay">
          {/* START MISSION */}
          {gameState === 'START' && (
            <div className="zombie-escape__panel">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-xl">
                <Skull className="w-7 h-7" />
              </div>
              <h1 className="zombie-escape__title">ZOMBIE ESCAPE</h1>
              <p className="zombie-escape__subtitle">
                Survive infected waves in the quarantined zone. Auto-reload when empty, keep moving, and scavenge survival drops.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={startGame}
                  className="zombie-escape__primary"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START SURVIVAL</span>
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="zombie-escape__secondary"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>BACK TO GAMES</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PAUSE */}
          {gameState === 'PAUSED' && (
            <div className="zombie-escape__panel">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
                <Pause className="w-7 h-7" />
              </div>
              <h2 className="zombie-escape__title">PAUSED</h2>
              <p className="zombie-escape__subtitle">Tactical pause. Resume when ready.</p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setGameState('PLAYING')}
                  className="zombie-escape__primary"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RESUME GAME</span>
                </button>
                <button
                  type="button"
                  onClick={startGame}
                  className="zombie-escape__secondary"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESTART MISSION</span>
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="zombie-escape__secondary"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>EXIT GAME</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GAME OVER */}
          {gameState === 'GAMEOVER' && (
            <div className="zombie-escape__panel">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-xl">
                <Skull className="w-7 h-7" />
              </div>
              <h2 className="zombie-escape__title">SURVIVOR DOWN</h2>
              <p className="zombie-escape__subtitle">
                Infection overran sector at Wave {wave}. Score: {score.toLocaleString()} • Hostiles Eliminated: {totalKills}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={startGame}
                  className="zombie-escape__primary"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>TRY AGAIN</span>
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="zombie-escape__secondary"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>EXIT</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
