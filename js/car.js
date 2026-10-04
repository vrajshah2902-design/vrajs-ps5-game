/**
 * Car Dynamics & Drift Physics Model
 * Realistic lateral tire friction, weight transfer, analog triggers, and visual rendering.
 */

class Car {
  constructor(type = "apex") {
    this.type = type;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.steerAngle = 0;

    // Dimensions
    this.width = 30;
    this.length = 56;
    this.wheelbase = 36;
    this.trackWidth = 24;

    // Nitro System
    this.nitroCapacity = 100;
    this.nitro = 100;
    this.isBoosting = false;

    // Gearbox & Engine Telemetry
    this.gear = 1;
    this.rpm = 0.2; // 0.0 to 1.0 (idle to redline)
    this.speedKmh = 0;
    this.slipAngle = 0;
    this.slipIntensity = 0;
    this.isDrifting = false;

    // Configure Vehicle Specs
    this.setSpecs(type);
  }

  setSpecs(type) {
    this.type = type;
    if (type === "apex") {
      // Balanced All-Rounder
      this.color = "#00f0ff";
      this.accentColor = "#0099ff";
      this.underglowColor = "rgba(0, 240, 255, 0.4)";
      this.maxForwardSpeed = 22; // ~220 km/h
      this.acceleration = 0.38;
      this.driftGrip = 0.90;
      this.turnSpeed = 0.065;
      this.mass = 1250;
    } else if (type === "ryu") {
      // Drift Specialist (Easy Slides, High Angle)
      this.color = "#ff0055";
      this.accentColor = "#ff5500";
      this.underglowColor = "rgba(255, 0, 85, 0.5)";
      this.maxForwardSpeed = 21;
      this.acceleration = 0.42;
      this.driftGrip = 0.85; // slips easier
      this.turnSpeed = 0.075;
      this.mass = 1150;
    } else {
      // Phantom V8 Muscle (Raw Power, Heavy)
      this.color = "#ffe600";
      this.accentColor = "#ff8800";
      this.underglowColor = "rgba(255, 230, 0, 0.45)";
      this.maxForwardSpeed = 24;
      this.acceleration = 0.48;
      this.driftGrip = 0.88;
      this.turnSpeed = 0.060;
      this.mass = 1450;
    }
  }

  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.steerAngle = 0;
    this.gear = 1;
    this.rpm = 0.2;
    this.nitro = 100;
    this.isBoosting = false;
  }

  update(dt, input) {
    const throttle = input.throttle;
    const brake = input.brake;
    const steer = input.steer;
    const handbrake = input.handbrake;
    const nitroPressed = input.nitro;

    // 1. Steering with speed sensitivity
    const speed = Math.hypot(this.vx, this.vy);
    this.speedKmh = Math.round(speed * 10);
    const speedFactor = Math.max(0.35, 1.0 - (speed / this.maxForwardSpeed) * 0.45);
    const targetSteer = steer * 0.55 * speedFactor;
    this.steerAngle += (targetSteer - this.steerAngle) * 0.28;

    // 2. Nitro Boost logic
    if (nitroPressed && this.nitro > 0 && throttle > 0.2) {
      this.isBoosting = true;
      this.nitro = Math.max(0, this.nitro - 0.45);
      window.gamepadManager.rumble(0.25, 0.5, 80);
    } else {
      this.isBoosting = false;
      // Passive recharge
      this.nitro = Math.min(this.nitroCapacity, this.nitro + 0.12);
    }

    // 3. Forward & Lateral Local Velocities
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    let forwardVel = this.vx * forwardX + this.vy * forwardY;
    let lateralVel = this.vx * rightX + this.vy * rightY;

    // 4. Engine Acceleration & Braking Forces
    let accelForce = 0;
    const boostMultiplier = this.isBoosting ? 1.45 : 1.0;

    if (throttle > 0.01) {
      if (forwardVel >= -0.5) {
        accelForce = throttle * this.acceleration * boostMultiplier;
      } else {
        // Brake to stop reverse motion
        accelForce = throttle * this.acceleration * 1.5;
      }
    }

    if (brake > 0.01) {
      if (forwardVel > 0.5) {
        // Foot brake
        accelForce = -brake * this.acceleration * 1.4;
      } else {
        // Reverse gear
        accelForce = -brake * this.acceleration * 0.6;
      }
    }

    forwardVel += accelForce;

    // 5. Tire Grip & Lateral Friction (The Drift Magic)
    // When handbrake is engaged or high lateral force occurs, rear grip drops
    let rearGrip = this.driftGrip;
    let frontGrip = 0.94;

    if (handbrake) {
      rearGrip = 0.72; // break loose!
      forwardVel *= 0.985; // slight drag
      window.gamepadManager.rumble(0.35, 0.45, 90);
    }

    // Slip angle calculation
    this.slipAngle = Math.atan2(lateralVel, Math.abs(forwardVel) + 0.1);
    this.slipIntensity = Math.abs(lateralVel) / (speed + 1.0);

    this.isDrifting = speed > 4.0 && (Math.abs(this.slipAngle) > 0.28 || handbrake);

    // Apply friction to cancel lateral slide based on grip
    lateralVel *= rearGrip;

    // 6. Angular Turning Torque & Drift Stabilization
    const turnRate = (forwardVel / (this.wheelbase * 0.4)) * Math.sin(this.steerAngle);
    this.angularVelocity = turnRate;

    // Oversteer rotation during drift
    if (this.isDrifting) {
      const oversteerTorque = this.slipAngle * 0.045 * (speed / this.maxForwardSpeed);
      this.angularVelocity += oversteerTorque;
      // Counter-steering stability
      if (Math.sign(this.steerAngle) === -Math.sign(this.slipAngle)) {
        this.angularVelocity *= 0.88; // player caught the drift nicely
      }
    }

    // Apply rotation
    this.angle += this.angularVelocity;

    // 7. Reconstruct World Velocity
    // Natural aerodynamic rolling drag
    forwardVel *= 0.992;
    this.vx = forwardVel * forwardX + lateralVel * rightX;
    this.vy = forwardVel * forwardY + lateralVel * rightY;

    // Apply positions
    this.x += this.vx;
    this.y += this.vy;

    // 8. Gearbox simulation (Gears 1 to 6)
    const gearRatios = [0, 4.5, 8.5, 13.0, 17.5, 21.5, 26.0];
    if (forwardVel < -0.1) {
      this.gear = "R";
      this.rpm = Math.min(1.0, 0.2 + Math.abs(forwardVel) / 8);
    } else {
      let currentGear = 1;
      for (let g = 1; g < gearRatios.length; g++) {
        if (forwardVel > gearRatios[g] * 0.85 && g < 6) {
          currentGear = g + 1;
        }
      }
      this.gear = currentGear;
      const lower = gearRatios[currentGear - 1];
      const upper = gearRatios[currentGear];
      const span = upper - lower || 1;
      this.rpm = Math.min(1.0, Math.max(0.2, (forwardVel - lower) / span));
      if (this.isBoosting) this.rpm = Math.min(1.0, this.rpm + 0.15);
    }

    // 9. Particle & Audio triggers
    this.updateEffects(forwardX, forwardY, rightX, rightY, speed);
  }

  // Calculate Tire Contact World Coordinates
  getTirePositions() {
    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const halfL = this.wheelbase * 0.5;
    const halfW = this.trackWidth * 0.5;

    return [
      // 0: Front-Left
      { x: this.x + cosA * halfL - sinA * -halfW, y: this.y + sinA * halfL + cosA * -halfW },
      // 1: Front-Right
      { x: this.x + cosA * halfL - sinA * halfW,  y: this.y + sinA * halfL + cosA * halfW },
      // 2: Rear-Left
      { x: this.x - cosA * halfL - sinA * -halfW, y: this.y - sinA * halfL + cosA * -halfW },
      // 3: Rear-Right
      { x: this.x - cosA * halfL - sinA * halfW,  y: this.y - sinA * halfL + cosA * halfW }
    ];
  }

  updateEffects(forwardX, forwardY, rightX, rightY, speed) {
    const tires = this.getTirePositions();

    // Skid marks & tire smoke
    if (this.isDrifting || this.slipIntensity > 0.3) {
      window.particleSystem.addSkidMarks(tires, this.slipIntensity);
      
      // Smoke from rear wheels
      window.particleSystem.emitTireSmoke(tires[2].x, tires[2].y, this.vx, this.vy, this.slipIntensity);
      window.particleSystem.emitTireSmoke(tires[3].x, tires[3].y, this.vx, this.vy, this.slipIntensity);

      // DualSense subtle drift rumble
      window.gamepadManager.rumble(this.slipIntensity * 0.4, this.slipIntensity * 0.6, 60);
    }

    // Nitro flames from dual exhaust
    if (this.isBoosting) {
      const rearCenter = {
        x: this.x - forwardX * (this.length * 0.5),
        y: this.y - forwardY * (this.length * 0.5)
      };
      window.particleSystem.emitNitroFlames(rearCenter.x - rightX * 6, rearCenter.y - rightY * 6, this.angle, speed);
      window.particleSystem.emitNitroFlames(rearCenter.x + rightX * 6, rearCenter.y + rightY * 6, this.angle, speed);
    }

    // Audio SFX updates
    window.soundEngine.updateEngine(this.rpm, window.gamepadManager.throttle, this.isBoosting);
    window.soundEngine.updateTires(this.isDrifting ? this.slipIntensity * 1.2 : 0);
    window.soundEngine.updateNitro(this.isBoosting);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const halfW = this.width / 2;
    const halfL = this.length / 2;

    // 1. Underglow Neon
    ctx.shadowBlur = 24;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.underglowColor;
    ctx.beginPath();
    ctx.roundRect(-halfW - 4, -halfL - 2, this.width + 8, this.length + 4, 12);
    ctx.fill();

    // 2. Wheels
    ctx.shadowBlur = 0;
    this.drawWheels(ctx);

    // 3. Headlight Light Cones
    this.drawHeadlights(ctx, halfL);

    // 4. Car Body Chassis
    ctx.fillStyle = "#0c0e15";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;

    // Streamlined aerodynamic silhouette
    ctx.beginPath();
    ctx.moveTo(halfL, -halfW + 8);
    ctx.lineTo(halfL - 8, -halfW);
    ctx.lineTo(-halfL + 12, -halfW);
    ctx.lineTo(-halfL, -halfW + 6);
    ctx.lineTo(-halfL, halfW - 6);
    ctx.lineTo(-halfL + 12, halfW);
    ctx.lineTo(halfL - 8, halfW);
    ctx.lineTo(halfL, halfW - 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Colored racing livery stripe
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.rect(-halfL + 14, -halfW + 4, halfL * 1.5, 4);
    ctx.rect(-halfL + 14, halfW - 8, halfL * 1.5, 4);
    ctx.fill();

    // Windshield & Roof Glass
    ctx.fillStyle = "rgba(0, 240, 255, 0.35)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(halfL - 14, -halfW + 4);
    ctx.lineTo(-halfL + 16, -halfW + 4);
    ctx.lineTo(-halfL + 16, halfW - 4);
    ctx.lineTo(halfL - 14, halfW - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Roof panel
    ctx.fillStyle = "#121722";
    ctx.fillRect(-halfL + 18, -halfW + 6, halfL * 0.8, this.width - 12);

    // Rear Carbon Spoiler Wing
    ctx.fillStyle = "#050608";
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.fillRect(-halfL - 3, -halfW + 2, 7, this.width - 4);
    ctx.strokeRect(-halfL - 3, -halfW + 2, 7, this.width - 4);

    // Rear Brake Lights (Glow bright on braking)
    const isBraking = window.gamepadManager.brake > 0.05 || window.gamepadManager.handbrake;
    ctx.fillStyle = isBraking ? "#ff0033" : "rgba(180, 0, 30, 0.7)";
    ctx.shadowBlur = isBraking ? 18 : 6;
    ctx.shadowColor = "#ff0033";
    ctx.fillRect(-halfL, -halfW + 3, 3, 8);
    ctx.fillRect(-halfL, halfW - 11, 3, 8);

    // Front Headlight Strips
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffffff";
    ctx.fillRect(halfL - 3, -halfW + 4, 3, 7);
    ctx.fillRect(halfL - 3, halfW - 11, 3, 7);

    ctx.restore();
  }

  drawWheels(ctx) {
    const halfL = this.wheelbase * 0.5;
    const halfW = this.trackWidth * 0.5;
    const wheelW = 6;
    const wheelL = 14;

    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    // Front Left (steered)
    ctx.save();
    ctx.translate(halfL, -halfW);
    ctx.rotate(this.steerAngle);
    ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
    ctx.strokeRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
    ctx.restore();

    // Front Right (steered)
    ctx.save();
    ctx.translate(halfL, halfW);
    ctx.rotate(this.steerAngle);
    ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
    ctx.strokeRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
    ctx.restore();

    // Rear Left
    ctx.fillRect(-halfL - wheelL / 2, -halfW - wheelW / 2, wheelL, wheelW);
    ctx.strokeRect(-halfL - wheelL / 2, -halfW - wheelW / 2, wheelL, wheelW);

    // Rear Right
    ctx.fillRect(-halfL - wheelL / 2, halfW - wheelW / 2, wheelL, wheelW);
    ctx.strokeRect(-halfL - wheelL / 2, halfW - wheelW / 2, wheelL, wheelW);
  }

  drawHeadlights(ctx, halfL) {
    ctx.save();
    const grad = ctx.createRadialGradient(halfL + 80, 0, 10, halfL + 80, 0, 180);
    grad.addColorStop(0, "rgba(220, 245, 255, 0.28)");
    grad.addColorStop(1, "rgba(220, 245, 255, 0.0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(halfL, -10);
    ctx.lineTo(halfL + 200, -75);
    ctx.lineTo(halfL + 200, 75);
    ctx.lineTo(halfL, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// Global instance
window.Car = Car;
