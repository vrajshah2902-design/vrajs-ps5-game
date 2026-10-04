/**
 * Particle System & Skid Mark Buffer
 * Handles tire smoke, sparks, nitro exhaust flames, and asphalt tire rubber tracks.
 */

class ParticleSystem {
  constructor(worldWidth = 4000, worldHeight = 4000) {
    this.particles = [];
    
    // Persistent skid marks canvas buffer
    this.skidCanvas = document.createElement("canvas");
    this.skidCanvas.width = worldWidth;
    this.skidCanvas.height = worldHeight;
    this.skidCtx = this.skidCanvas.getContext("2d", { willReadFrequently: false });
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    // Previous tire positions for connecting continuous skid lines
    this.prevTires = null;
  }

  resizeWorld(w, h) {
    this.worldWidth = w;
    this.worldHeight = h;
    this.skidCanvas.width = w;
    this.skidCanvas.height = h;
    this.clearSkids();
  }

  clearSkids() {
    this.skidCtx.clearRect(0, 0, this.worldWidth, this.worldHeight);
    this.prevTires = null;
    this.particles = [];
  }

  // Draw skid mark line segments between previous and current tire contacts
  addSkidMarks(tires, slipIntensity) {
    if (slipIntensity < 0.25) {
      this.prevTires = null;
      return;
    }

    const alpha = Math.min(0.65, (slipIntensity - 0.2) * 0.7);
    this.skidCtx.strokeStyle = `rgba(10, 10, 15, ${alpha})`;
    this.skidCtx.lineWidth = 4.5;
    this.skidCtx.lineCap = "round";

    if (this.prevTires) {
      for (let i = 0; i < tires.length; i++) {
        // Draw rear tires primarily (indices 2 and 3)
        if (i >= 2 || slipIntensity > 0.6) {
          this.skidCtx.beginPath();
          this.skidCtx.moveTo(this.prevTires[i].x, this.prevTires[i].y);
          this.skidCtx.lineTo(tires[i].x, tires[i].y);
          this.skidCtx.stroke();
        }
      }
    }

    this.prevTires = tires.map(t => ({ x: t.x, y: t.y }));
  }

  // Emit tire smoke puffs
  emitTireSmoke(x, y, vx, vy, slipIntensity) {
    const count = Math.min(4, Math.floor(slipIntensity * 3) + 1);
    for (let i = 0; i < count; i++) {
      const spread = 8;
      const p = {
        type: "smoke",
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: vx * 0.2 + (Math.random() - 0.5) * 1.5,
        vy: vy * 0.2 + (Math.random() - 0.5) * 1.5,
        radius: 4 + Math.random() * 5,
        maxRadius: 18 + Math.random() * 12,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        color: `rgba(220, 230, 240,`
      };
      this.particles.push(p);
    }
  }

  // Wall scrape sparks
  emitSparks(x, y, normalX, normalY, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(normalY, normalX) + (Math.random() - 0.5) * 1.2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        type: "spark",
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 1.5,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.06,
        color: Math.random() > 0.3 ? "#ffe600" : "#ff5500"
      });
    }
  }

  // Nitro exhaust flame jets
  emitNitroFlames(x, y, angle, speed) {
    for (let i = 0; i < 3; i++) {
      const jetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.25;
      const jetSpeed = 4 + Math.random() * 6 + speed * 0.3;
      this.particles.push({
        type: "nitro",
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(jetAngle) * jetSpeed,
        vy: Math.sin(jetAngle) * jetSpeed,
        radius: 3 + Math.random() * 4,
        maxRadius: 10 + Math.random() * 5,
        life: 1.0,
        decay: 0.08 + Math.random() * 0.06,
        color: Math.random() > 0.4 ? "#00f0ff" : "#0055ff"
      });
    }
  }

  // Turbo exhaust backfire pop
  emitBackfire(x, y, angle) {
    for (let i = 0; i < 8; i++) {
      const jetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
      const jetSpeed = 3 + Math.random() * 5;
      this.particles.push({
        type: "nitro",
        x: x,
        y: y,
        vx: Math.cos(jetAngle) * jetSpeed,
        vy: Math.sin(jetAngle) * jetSpeed,
        radius: 4 + Math.random() * 4,
        maxRadius: 14,
        life: 1.0,
        decay: 0.09,
        color: Math.random() > 0.5 ? "#ff5500" : "#ffe600"
      });
    }
  }

  // Update particles
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.type === "smoke") {
        p.radius += (p.maxRadius - p.radius) * 0.08;
        p.vx *= 0.95;
        p.vy *= 0.95;
      } else if (p.type === "spark") {
        p.vx *= 0.92;
        p.vy *= 0.92;
      } else if (p.type === "nitro") {
        p.radius += 0.4;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Render skid marks that are in camera viewport
  drawSkids(ctx) {
    ctx.drawImage(this.skidCanvas, 0, 0);
  }

  // Render active particle effects
  drawParticles(ctx) {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);

      if (p.type === "smoke") {
        ctx.fillStyle = `${p.color} ${p.life * 0.35})`;
        ctx.fill();
      } else if (p.type === "spark") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
      } else if (p.type === "nitro") {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = p.life * 0.8;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
    ctx.restore();
  }
}

// Global instance
window.particleSystem = new ParticleSystem();
