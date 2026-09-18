// Renders the original glossy black classic American muscle racing car
export interface CarRenderOptions {
  x: number;
  y: number;
  driftAngle: number;
  wheelAngle: number;
  isBraking: boolean;
  isAccelerating: boolean;
  isNitro: boolean;
  jumpHeight: number; // in pixels above track during airtime
  invulnerable: boolean;
  scale?: number;
}

export function drawClassicBlackMuscleCar(ctx: CanvasRenderingContext2D, opts: CarRenderOptions) {
  const {
    x,
    y,
    driftAngle,
    wheelAngle,
    isBraking,
    isAccelerating,
    isNitro,
    jumpHeight = 0,
    invulnerable = false,
    scale = 1.0
  } = opts;

  ctx.save();
  ctx.translate(x, y - jumpHeight);

  // Invulnerability blink
  if (invulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Body dynamic weight transfer:
  // - Acceleration squat: slight scaleY expansion & rear drop
  // - Braking dive: front dips slightly
  const pitchOffset = isBraking ? 3 : isAccelerating ? -2 : 0;
  ctx.translate(0, pitchOffset);

  // Steer/Drift rotation
  ctx.rotate(driftAngle);
  ctx.scale(scale, scale);

  // 1. CAR DROP SHADOW (expands and softens when airborne)
  const shadowBlur = 8 + jumpHeight * 0.4;
  const shadowAlpha = Math.max(0.15, 0.55 - jumpHeight * 0.008);
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 10 + jumpHeight * 0.8, 28 + jumpHeight * 0.1, 48 + jumpHeight * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. HEADLIGHT BEAMS (Dual volumetric forward beams illuminating asphalt)
  const beamLength = 280;
  const beamWidth = 65;
  const headBeamGrad = ctx.createLinearGradient(0, -42, 0, -42 - beamLength);
  headBeamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  headBeamGrad.addColorStop(0.15, 'rgba(0, 245, 255, 0.35)');
  headBeamGrad.addColorStop(0.65, 'rgba(0, 245, 255, 0.08)');
  headBeamGrad.addColorStop(1, 'rgba(0, 245, 255, 0)');

  // Left headlight beam
  ctx.fillStyle = headBeamGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -42);
  ctx.lineTo(-16 - beamWidth * 0.8, -42 - beamLength);
  ctx.lineTo(-16 + beamWidth * 0.3, -42 - beamLength);
  ctx.lineTo(-12, -42);
  ctx.closePath();
  ctx.fill();

  // Right headlight beam
  ctx.beginPath();
  ctx.moveTo(12, -42);
  ctx.lineTo(16 - beamWidth * 0.3, -42 - beamLength);
  ctx.lineTo(16 + beamWidth * 0.8, -42 - beamLength);
  ctx.lineTo(16, -42);
  ctx.closePath();
  ctx.fill();

  // 3. ELECTRIC CYAN NEON UNDERGLOW
  const underglowGrad = ctx.createRadialGradient(0, 4, 10, 0, 4, 45);
  underglowGrad.addColorStop(0, isNitro ? 'rgba(0, 245, 255, 0.7)' : 'rgba(56, 189, 248, 0.45)');
  underglowGrad.addColorStop(0.8, 'rgba(14, 165, 233, 0.15)');
  underglowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = underglowGrad;
  ctx.fillRect(-35, -40, 70, 90);

  // 4. TIRES & ALLOY WHEELS
  // Rear Tires (Extra wide performance rubber with deep treads)
  ctx.fillStyle = '#090a0f';
  // Rear Left
  ctx.beginPath();
  ctx.roundRect(-27, 16, 9, 22, 3);
  ctx.fill();
  // Rear Right
  ctx.beginPath();
  ctx.roundRect(18, 16, 9, 22, 3);
  ctx.fill();

  // Rear alloy rims (Silver 5-spoke wheels)
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-26, 20, 7, 14);
  ctx.fillRect(19, 20, 7, 14);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-24, 25, 3, 4);
  ctx.fillRect(21, 25, 3, 4);

  // Front Wheels (Rotates with steering wheelAngle)
  // Front Left
  ctx.save();
  ctx.translate(-22, -26);
  ctx.rotate(wheelAngle);
  ctx.fillStyle = '#090a0f';
  ctx.beginPath();
  ctx.roundRect(-4.5, -10, 9, 20, 3);
  ctx.fill();
  // Silver alloy rim
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-3, -7, 6, 14);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-1.5, -2, 3, 4);
  ctx.restore();

  // Front Right
  ctx.save();
  ctx.translate(22, -26);
  ctx.rotate(wheelAngle);
  ctx.fillStyle = '#090a0f';
  ctx.beginPath();
  ctx.roundRect(-4.5, -10, 9, 20, 3);
  ctx.fill();
  // Silver alloy rim
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-3, -7, 6, 14);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-1.5, -2, 3, 4);
  ctx.restore();

  // 5. MAIN MUSCLE CAR BODY CHASSIS (Aggressive Wide Silhouette)
  // Base Black Chassis
  ctx.fillStyle = '#0a0b10';
  ctx.beginPath();
  // Chiseled front nose
  ctx.moveTo(-21, -44);
  ctx.lineTo(21, -44);
  // Front quarter flare
  ctx.lineTo(24, -30);
  // Muscular waist narrowing
  ctx.lineTo(22, -4);
  // Wide flared rear quarter panels
  ctx.lineTo(26, 18);
  // Rear tail fascia
  ctx.lineTo(24, 42);
  ctx.lineTo(-24, 42);
  // Rear left flare
  ctx.lineTo(-26, 18);
  // Left waist
  ctx.lineTo(-22, -4);
  // Front left quarter flare
  ctx.lineTo(-24, -30);
  ctx.closePath();
  ctx.fill();

  // 6. GLOSSY OBSIDIAN PAINT (Specular Multi-Tone Finish)
  const bodyGrad = ctx.createLinearGradient(-22, 0, 22, 0);
  bodyGrad.addColorStop(0, '#090a0f');
  bodyGrad.addColorStop(0.2, '#181b24');
  bodyGrad.addColorStop(0.48, '#2d3345'); // Specular ridge reflection
  bodyGrad.addColorStop(0.52, '#2d3345');
  bodyGrad.addColorStop(0.8, '#181b24');
  bodyGrad.addColorStop(1, '#090a0f');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-19, -42);
  ctx.lineTo(19, -42);
  ctx.lineTo(22, -28);
  ctx.lineTo(20, -4);
  ctx.lineTo(24, 18);
  ctx.lineTo(22, 40);
  ctx.lineTo(-22, 40);
  ctx.lineTo(-24, 18);
  ctx.lineTo(-20, -4);
  ctx.lineTo(-22, -28);
  ctx.closePath();
  ctx.fill();

  // 7. DUAL SILVER / GRAPHITE RACING STRIPES
  ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
  ctx.fillRect(-5, -42, 3, 82);
  ctx.fillRect(2, -42, 3, 82);

  // 8. MUSCLE CAR HOOD SCOOPS & POWER BULGE
  // Twin Cowl Induction Scoops
  ctx.fillStyle = '#050608';
  ctx.beginPath();
  ctx.roundRect(-8, -32, 5, 12, 1.5);
  ctx.roundRect(3, -32, 5, 12, 1.5);
  ctx.fill();
  // Chrome Scoop Rim
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 9. CHROME TRIM HIGHLIGHTS
  // Front Chrome Bumper & Grille Outline
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-20, -43);
  ctx.lineTo(20, -43);
  ctx.stroke();

  // Chrome Side Mirrors
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(-25, -20, 3, 4);
  ctx.fillRect(22, -20, 3, 4);

  // 10. DARK TINTED CABIN GLASS (Deep Smoked Glass with Sunset Sheen)
  // Front Windshield
  const glassGrad = ctx.createLinearGradient(0, -22, 0, 4);
  glassGrad.addColorStop(0, '#04060c');
  glassGrad.addColorStop(0.5, '#0b1329');
  glassGrad.addColorStop(1, '#050711');
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(-16, -24);
  ctx.lineTo(16, -24);
  ctx.lineTo(18, -6);
  ctx.lineTo(-18, -6);
  ctx.closePath();
  ctx.fill();

  // Chrome Windshield Pillar Trim
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Windshield Light Reflection Streak
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, -22);
  ctx.lineTo(-4, -8);
  ctx.stroke();

  // Black Roof Panel
  ctx.fillStyle = '#10131d';
  ctx.fillRect(-15, -6, 30, 16);

  // Rear Windshield
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(-16, 10);
  ctx.lineTo(16, 10);
  ctx.lineTo(18, 22);
  ctx.lineTo(-18, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 11. DETAILED HEADLIGHTS (Twin Chrome-Ringed Front Lamps)
  // Outer Left Lamp
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(-16, -42, 3, 0, Math.PI * 2);
  ctx.arc(-9, -42, 2.5, 0, Math.PI * 2);
  // Outer Right Lamp
  ctx.arc(9, -42, 2.5, 0, Math.PI * 2);
  ctx.arc(16, -42, 3, 0, Math.PI * 2);
  ctx.fill();

  // 12. MUSCLE DUCKTAIL REAR SPOILER
  // Chrome Spoiler Stanchions
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-16, 36, 3, 6);
  ctx.fillRect(13, 36, 3, 6);
  // Black Spoiler Blade
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-24, 39, 48, 5, 2);
  ctx.fill();
  // Spoiler Top Highlight
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 13. VISIBLE REAR TAILLIGHTS (Classic Triple-Bar Muscle Lights)
  // Tail light cluster background
  ctx.fillStyle = '#1e0508';
  ctx.fillRect(-19, 34, 38, 5);

  const tailGlow = isBraking ? '#ff0033' : '#e11d48';
  ctx.fillStyle = tailGlow;
  // Left 3 vertical bars
  ctx.fillRect(-17, 34, 3, 5);
  ctx.fillRect(-12, 34, 3, 5);
  ctx.fillRect(-7, 34, 3, 5);
  // Right 3 vertical bars
  ctx.fillRect(4, 34, 3, 5);
  ctx.fillRect(9, 34, 3, 5);
  ctx.fillRect(14, 34, 3, 5);

  // Intense Brake Flare when slowing down
  if (isBraking) {
    ctx.fillStyle = 'rgba(255, 0, 50, 0.6)';
    ctx.beginPath();
    ctx.arc(-12, 36, 12, 0, Math.PI * 2);
    ctx.arc(9, 36, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 14. DUAL CHROME EXHAUST TIPS & NITRO FLAMES
  // Chrome Exhaust Tips
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-14, 43, 4, 3);
  ctx.fillRect(10, 43, 4, 3);

  // Nitrous Oxide Exhaust Flames
  if (isNitro) {
    // Left flame
    const fLen = 22 + Math.random() * 18;
    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    ctx.moveTo(-15, 46);
    ctx.lineTo(-12, 46 + fLen);
    ctx.lineTo(-9, 46);
    ctx.fill();
    // Inner white core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-14, 46);
    ctx.lineTo(-12, 46 + fLen * 0.6);
    ctx.lineTo(-10, 46);
    ctx.fill();

    // Right flame
    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    ctx.moveTo(9, 46);
    ctx.lineTo(12, 46 + fLen);
    ctx.lineTo(15, 46);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(10, 46);
    ctx.lineTo(12, 46 + fLen * 0.6);
    ctx.lineTo(14, 46);
    ctx.fill();
  }

  ctx.restore();
}
