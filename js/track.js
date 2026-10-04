/**
 * Track Generator, Spline Interpolation, and Collision Engine
 * Supports Neon Bay Circuit, Touge Mountain Pass, and Cyber Speedway.
 */

class Track {
  constructor(type = "neon") {
    this.type = type;
    this.trackWidth = 160;
    this.centerline = [];
    this.leftBorder = [];
    this.rightBorder = [];
    this.checkpoints = [];
    this.spawnPoint = { x: 0, y: 0, angle: 0 };
    this.worldBounds = { minX: -200, minY: -200, maxX: 3000, maxY: 3000 };

    this.loadTrack(type);
  }

  loadTrack(type) {
    this.type = type;
    let controlPoints = [];

    if (type === "neon") {
      // Neon Bay Circuit: Coastal night track with chicane and harbor straights
      this.trackWidth = 170;
      controlPoints = [
        { x: 500,  y: 600 },
        { x: 1000, y: 600 },
        { x: 1500, y: 650 },
        { x: 1900, y: 900 },
        { x: 2100, y: 1300 },
        { x: 1950, y: 1750 },
        { x: 1500, y: 1900 },
        { x: 1250, y: 1650 }, // chicane in
        { x: 1050, y: 1850 }, // chicane out
        { x: 700,  y: 2000 },
        { x: 350,  y: 1700 },
        { x: 300,  y: 1100 }
      ];
    } else if (type === "touge") {
      // Touge Mountain Pass: Intense switchback hairpins
      this.trackWidth = 155;
      controlPoints = [
        { x: 400,  y: 500 },
        { x: 1200, y: 500 },
        { x: 1650, y: 750 },
        { x: 1400, y: 1150 }, // Hairpin 1
        { x: 600,  y: 1250 },
        { x: 450,  y: 1550 }, // Hairpin 2
        { x: 1450, y: 1700 },
        { x: 1600, y: 2000 }, // Hairpin 3
        { x: 750,  y: 2150 },
        { x: 500,  y: 2450 }, // Hairpin 4
        { x: 1500, y: 2600 },
        { x: 1900, y: 2200 },
        { x: 1950, y: 1200 },
        { x: 1700, y: 600 },
        { x: 900,  y: 400 }
      ];
    } else {
      // Cyber High Speedway: Wide sweeping drift arcs
      this.trackWidth = 200;
      controlPoints = [
        { x: 600,  y: 600 },
        { x: 1600, y: 600 },
        { x: 2300, y: 950 },
        { x: 2500, y: 1600 },
        { x: 2100, y: 2200 },
        { x: 1300, y: 2400 },
        { x: 800,  y: 2000 },
        { x: 500,  y: 1300 }
      ];
    }

    this.buildSplineTrack(controlPoints);
  }

  // Smooth spline interpolation using Catmull-Rom
  buildSplineTrack(pts) {
    const numSubdivisions = 24;
    const interpolated = [];
    const n = pts.length;

    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];

      for (let step = 0; step < numSubdivisions; step++) {
        const t = step / numSubdivisions;
        const pt = this.catmullRom(p0, p1, p2, p3, t);
        interpolated.push(pt);
      }
    }

    this.centerline = interpolated;
    this.leftBorder = [];
    this.rightBorder = [];
    this.checkpoints = [];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const halfWidth = this.trackWidth / 2;

    for (let i = 0; i < this.centerline.length; i++) {
      const cur = this.centerline[i];
      const next = this.centerline[(i + 1) % this.centerline.length];

      // Tangent vector
      const dx = next.x - cur.x;
      const dy = next.y - cur.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const leftPt = { x: cur.x + nx * halfWidth, y: cur.y + ny * halfWidth };
      const rightPt = { x: cur.x - nx * halfWidth, y: cur.y - ny * halfWidth };

      this.leftBorder.push(leftPt);
      this.rightBorder.push(rightPt);

      // Bounds
      minX = Math.min(minX, leftPt.x, rightPt.x);
      minY = Math.min(minY, leftPt.y, rightPt.y);
      maxX = Math.max(maxX, leftPt.x, rightPt.x);
      maxY = Math.max(maxY, leftPt.y, rightPt.y);

      // Checkpoints every ~20 segments
      if (i % 24 === 0) {
        this.checkpoints.push({
          index: this.checkpoints.length,
          center: cur,
          left: leftPt,
          right: rightPt,
          normal: { x: dx / len, y: dy / len }
        });
      }
    }

    this.worldBounds = {
      minX: minX - 300,
      minY: minY - 300,
      maxX: maxX + 300,
      maxY: maxY + 300
    };

    // Spawn point at start/finish line pointing along track
    const s0 = this.centerline[0];
    const s1 = this.centerline[1];
    this.spawnPoint = {
      x: s0.x,
      y: s0.y,
      angle: Math.atan2(s1.y - s0.y, s1.x - s0.x)
    };
  }

  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    const f0 = -0.5 * t3 + t2 - 0.5 * t;
    const f1 =  1.5 * t3 - 2.5 * t2 + 1.0;
    const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
    const f3 =  0.5 * t3 - 0.5 * t2;

    return {
      x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
      y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3
    };
  }

  // Find nearest segment on centerline and check track collision & surface type
  checkCarTrack(car) {
    let closestDistSq = Infinity;
    let closestIdx = 0;
    const carPos = { x: car.x, y: car.y };

    for (let i = 0; i < this.centerline.length; i += 2) {
      const pt = this.centerline[i];
      const dSq = (carPos.x - pt.x) ** 2 + (carPos.y - pt.y) ** 2;
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestIdx = i;
      }
    }

    const distFromCenter = Math.sqrt(closestDistSq);
    const halfWidth = this.trackWidth / 2;
    const carRadius = car.width * 0.45;

    // Check Wall Collisions
    if (distFromCenter + carRadius > halfWidth) {
      // Penetration beyond barrier
      const overflow = (distFromCenter + carRadius) - halfWidth;
      const centerPt = this.centerline[closestIdx];
      const dirX = (carPos.x - centerPt.x) / (distFromCenter || 1);
      const dirY = (carPos.y - centerPt.y) / (distFromCenter || 1);

      // Repel car back onto track
      car.x -= dirX * overflow * 0.8;
      car.y -= dirY * overflow * 0.8;

      // Bounce velocity component normal to wall
      const dot = car.vx * dirX + car.vy * dirY;
      if (dot > 0) {
        car.vx -= (1 + 0.4) * dot * dirX;
        car.vy -= (1 + 0.4) * dot * dirY;
      }

      // Lose some rotational speed
      car.angularVelocity *= 0.5;

      // Wall friction & FX
      const scrapeSpeed = Math.hypot(car.vx, car.vy);
      if (scrapeSpeed > 2.0) {
        window.particleSystem.emitSparks(car.x, car.y, -dirX, -dirY, 8);
        window.gamepadManager.rumble(0.5, 0.7, 120);
        window.soundEngine.playCrash(scrapeSpeed / 15);
      }

      return { onTrack: true, onGrass: false, hitWall: true };
    }

    // Check if on road vs curb
    const isCurb = distFromCenter > halfWidth - 18;
    return { onTrack: true, onGrass: false, onCurb: isCurb, hitWall: false };
  }

  // Check Checkpoint Crossings
  checkCheckpoint(car, currentCheckpointIdx) {
    if (!this.checkpoints.length) return false;

    const nextIdx = (currentCheckpointIdx + 1) % this.checkpoints.length;
    const cp = this.checkpoints[nextIdx];

    // Distance to checkpoint center
    const dx = car.x - cp.center.x;
    const dy = car.y - cp.center.y;
    const dist = Math.hypot(dx, dy);

    // If car is within track width of checkpoint center
    if (dist < this.trackWidth * 0.7) {
      // Check if crossing along track forward direction
      const forwardDot = dx * cp.normal.x + dy * cp.normal.y;
      if (Math.abs(forwardDot) < 50) {
        return nextIdx;
      }
    }

    return false;
  }

  // Render the track to canvas
  draw(ctx, camera) {
    // 1. Draw Asphalt Road Surface
    ctx.save();
    
    // Draw Curbs (wide stroke behind asphalt)
    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = this.trackWidth + 24;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < this.centerline.length; i++) {
      const pt = this.centerline[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Outer Neon Curb glow
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = this.trackWidth + 8;
    ctx.stroke();

    // Dark Asphalt surface
    ctx.strokeStyle = "#12151f";
    ctx.lineWidth = this.trackWidth;
    ctx.stroke();

    // Center Dashed Lane Divider
    ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
    ctx.lineWidth = 3;
    ctx.setLineDash([25, 35]);
    ctx.beginPath();
    for (let i = 0; i < this.centerline.length; i++) {
      const pt = this.centerline[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw Guard Rails / Boundaries with Neon Edge Lines
    ctx.lineWidth = 4;
    ctx.shadowBlur = 12;

    // Left Barrier (Cyan)
    ctx.strokeStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.beginPath();
    for (let i = 0; i < this.leftBorder.length; i++) {
      const pt = this.leftBorder[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Right Barrier (Magenta)
    ctx.strokeStyle = "#ff0055";
    ctx.shadowColor = "#ff0055";
    ctx.beginPath();
    for (let i = 0; i < this.rightBorder.length; i++) {
      const pt = this.rightBorder[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Draw Start / Finish Line Checkered Bar
    const cp0 = this.checkpoints[0];
    if (cp0) {
      ctx.shadowBlur = 0;
      const steps = 10;
      const lx = cp0.left.x;
      const ly = cp0.left.y;
      const rx = cp0.right.x;
      const ry = cp0.right.y;

      for (let s = 0; s < steps; s++) {
        const t1 = s / steps;
        const t2 = (s + 1) / steps;
        ctx.fillStyle = s % 2 === 0 ? "#ffffff" : "#111111";
        ctx.beginPath();
        ctx.moveTo(lx + (rx - lx) * t1, ly + (ry - ly) * t1);
        ctx.lineTo(lx + (rx - lx) * t2, ly + (ry - ly) * t2);
        ctx.lineWidth = 14;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.stroke();
      }

      // Finish Banner Posts
      ctx.fillStyle = "#ffe600";
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(lx, ly, 10, 0, Math.PI * 2);
      ctx.arc(rx, ry, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Global instance
window.Track = Track;
