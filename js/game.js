/**
 * Main Game Loop, Camera, Drift Scoring, and State Controller
 */

class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");

    // Subsystems
    this.track = new Track("neon");
    this.car = new Car("apex");
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      mode: "dynamic" // dynamic, chase, aerial
    };

    // Game States: "MENU", "COUNTDOWN", "RACING", "PAUSED", "FINISHED"
    this.state = "MENU";
    this.countdownTimer = 0;
    this.countdownStage = 3;

    // Lap & Timing
    this.currentLap = 1;
    this.totalLaps = 3;
    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.bestLapTime = null;
    this.currentCheckpoint = 0;
    this.lapSplits = {};
    this.bestSplits = {};

    // Drift Scoring
    this.activeDriftScore = 0;
    this.totalDriftScore = 0;
    this.driftMultiplier = 1.0;
    this.driftTime = 0;
    this.driftDecayTimer = 0;

    // DOM Elements
    this.bindDOMElements();

    // Resize handling
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Setup Menu Listeners
    this.setupMenuUI();

    // Reset Car to Spawn
    this.resetToSpawn();

    // Start Animation Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindDOMElements() {
    this.currentLapEl = document.getElementById("current-lap");
    this.totalLapsEl = document.getElementById("total-laps");
    this.currentTimeEl = document.getElementById("current-time");
    this.bestTimeEl = document.getElementById("best-time");

    this.driftContainerEl = document.getElementById("drift-score-container");
    this.activeDriftPtsEl = document.getElementById("active-drift-pts");
    this.driftMultiplierEl = document.getElementById("drift-multiplier");
    this.driftQualityEl = document.getElementById("drift-quality");
    this.totalDriftScoreEl = document.getElementById("total-drift-score");

    this.countdownBannerEl = document.getElementById("countdown-banner");
    this.countdownTextEl = document.getElementById("countdown-text");
    this.splitNotificationEl = document.getElementById("split-notification");
    this.splitTextEl = document.getElementById("split-text");

    this.nitroFillEl = document.getElementById("nitro-fill");
    this.nitroPctEl = document.getElementById("nitro-pct");

    this.speedValEl = document.getElementById("speed-val");
    this.gearValEl = document.getElementById("gear-val");
    this.rpmGaugeEl = document.getElementById("rpm-gauge");

    this.menuOverlayEl = document.getElementById("menu-overlay");
    this.startBtnEl = document.getElementById("start-btn");
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupMenuUI() {
    // Track Buttons
    document.querySelectorAll(".track-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".track-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const trackType = btn.dataset.track;
        this.track.loadTrack(trackType);
        window.particleSystem.clearSkids();
        this.resetToSpawn();
      });
    });

    // Car Buttons
    document.querySelectorAll(".car-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".car-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.car.setSpecs(btn.dataset.car);
      });
    });

    // Settings
    const rumbleToggle = document.getElementById("rumble-toggle");
    if (rumbleToggle) {
      rumbleToggle.addEventListener("change", (e) => {
        window.gamepadManager.rumbleEnabled = e.target.checked;
      });
    }

    const audioToggle = document.getElementById("audio-toggle");
    if (audioToggle) {
      audioToggle.addEventListener("change", (e) => {
        window.soundEngine.isMuted = !e.target.checked;
      });
    }

    // Start / Resume button
    if (this.startBtnEl) {
      this.startBtnEl.addEventListener("click", () => {
        this.startOrResume();
      });
    }
  }

  startOrResume() {
    window.soundEngine.resume();

    if (this.state === "PAUSED") {
      this.state = "RACING";
      this.menuOverlayEl.classList.add("hidden");
    } else {
      this.startCountdown();
    }
  }

  togglePause() {
    if (this.state === "RACING") {
      this.state = "PAUSED";
      this.menuOverlayEl.classList.remove("hidden");
      this.startBtnEl.textContent = "RESUME RACE [PRESS ✕ OR ENTER]";
    } else if (this.state === "PAUSED") {
      this.state = "RACING";
      this.menuOverlayEl.classList.add("hidden");
    }
  }

  startCountdown() {
    this.resetToSpawn();
    this.state = "COUNTDOWN";
    this.countdownStage = 3;
    this.countdownTimer = performance.now();
    this.menuOverlayEl.classList.add("hidden");
    this.countdownBannerEl.classList.remove("hidden");
    this.countdownTextEl.textContent = "3";
    window.soundEngine.playCountdown(false);
    window.gamepadManager.rumble(0.2, 0.4, 150);
  }

  resetToSpawn() {
    this.car.reset(this.track.spawnPoint.x, this.track.spawnPoint.y, this.track.spawnPoint.angle);
    this.camera.x = this.car.x;
    this.camera.y = this.car.y;
    this.currentCheckpoint = 0;
    this.currentLap = 1;
    this.activeDriftScore = 0;
    this.totalDriftScore = 0;
    this.driftMultiplier = 1.0;
  }

  formatTime(ms) {
    if (!ms || ms < 0) return "--:--.---";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  }

  // Main Loop
  loop(timestamp) {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    // 1. Poll Gamepad & Keyboard
    window.gamepadManager.poll();

    // Handle Menu toggles & Controller shortcuts
    if (window.gamepadManager.justPressedPause) {
      if (this.state === "RACING" || this.state === "PAUSED") {
        this.togglePause();
      }
    }

    if (this.state === "MENU" || this.state === "PAUSED") {
      if (window.gamepadManager.justPressedSelect) {
        this.startOrResume();
      }
    }

    // Camera Switch via Triangle (△) or C key
    if (window.gamepadManager.justPressedCam) {
      const modes = ["dynamic", "chase", "aerial"];
      const nextIdx = (modes.indexOf(this.camera.mode) + 1) % modes.length;
      this.camera.mode = modes[nextIdx];
      console.log(`[Camera] Mode: ${this.camera.mode}`);
    }

    // Car Reset via Circle (◯) or R key
    if (window.gamepadManager.justPressedReset && this.state === "RACING") {
      const cp = this.track.checkpoints[this.currentCheckpoint] || { center: this.track.spawnPoint, normal: { x: 1, y: 0 } };
      this.car.reset(cp.center.x, cp.center.y, Math.atan2(cp.normal.y, cp.normal.x));
      window.gamepadManager.rumble(0.4, 0.4, 150);
    }

    // 2. State Specific Logic
    if (this.state === "COUNTDOWN") {
      this.updateCountdown(timestamp);
    } else if (this.state === "RACING") {
      this.updateRacing(dt, timestamp);
    }

    // 3. Update Camera
    this.updateCamera(dt);

    // 4. Update Particles
    window.particleSystem.update(dt);

    // 5. Render Scene
    this.render();

    // 6. Update HUD
    this.updateHUD();

    requestAnimationFrame((t) => this.loop(t));
  }

  updateCountdown(timestamp) {
    const elapsed = timestamp - this.countdownTimer;
    if (elapsed > 1000 && this.countdownStage === 3) {
      this.countdownStage = 2;
      this.countdownTextEl.textContent = "2";
      window.soundEngine.playCountdown(false);
      window.gamepadManager.rumble(0.3, 0.5, 150);
    } else if (elapsed > 2000 && this.countdownStage === 2) {
      this.countdownStage = 1;
      this.countdownTextEl.textContent = "1";
      window.soundEngine.playCountdown(false);
      window.gamepadManager.rumble(0.4, 0.6, 150);
    } else if (elapsed > 3000 && this.countdownStage === 1) {
      this.countdownStage = 0;
      this.countdownTextEl.textContent = "GO!";
      window.soundEngine.playCountdown(true);
      window.gamepadManager.rumble(0.7, 0.9, 250);
      this.state = "RACING";
      this.lapStartTime = performance.now();
      setTimeout(() => {
        this.countdownBannerEl.classList.add("hidden");
      }, 700);
    }
  }

  updateRacing(dt, timestamp) {
    // 1. Car physics update
    this.car.update(dt, window.gamepadManager);

    // 2. Track barrier collisions & bounds
    const trackStatus = this.track.checkCarTrack(this.car);

    // If car scraped or hit wall while drifting, penalty combo break
    if (trackStatus.hitWall && this.activeDriftScore > 50) {
      this.activeDriftScore = 0;
      this.driftMultiplier = 1.0;
      this.driftContainerEl.classList.remove("active");
    }

    // 3. Checkpoint & Lap Progress
    const crossedIdx = this.track.checkCheckpoint(this.car, this.currentCheckpoint);
    if (crossedIdx !== false) {
      this.currentCheckpoint = crossedIdx;
      window.soundEngine.playCheckpoint();
      window.gamepadManager.rumble(0.15, 0.25, 60);

      // Check for Lap Completion (hit start/finish checkpoint 0)
      if (crossedIdx === 0) {
        this.completeLap();
      }
    }

    // 4. Lap Timer
    this.currentLapTime = performance.now() - this.lapStartTime;

    // 5. Drift Scoring Logic
    this.updateDriftScoring(dt);
  }

  updateDriftScoring(dt) {
    if (this.car.isDrifting && this.car.speedKmh > 35) {
      this.driftTime += dt;
      this.driftDecayTimer = 0.5; // grace period before banking

      // Multiplier builds up with sustained drift duration
      this.driftMultiplier = Math.min(4.0, 1.0 + Math.floor(this.driftTime * 1.5) * 0.5);

      // Base points per frame
      const rate = this.car.slipIntensity * (this.car.speedKmh / 15) * 45;
      this.activeDriftScore += Math.round(rate * this.driftMultiplier * dt * 60);

      // Display active drift HUD
      this.driftContainerEl.classList.add("active");
      this.activeDriftPtsEl.textContent = `+${this.activeDriftScore.toLocaleString()}`;
      this.driftMultiplierEl.textContent = `x${this.driftMultiplier.toFixed(1)}`;

      // Quality rating text
      if (this.activeDriftScore > 3000) {
        this.driftQualityEl.textContent = "🔥 DRIFT GOD 🔥";
        this.driftQualityEl.style.color = "#ffe600";
      } else if (this.activeDriftScore > 1400) {
        this.driftQualityEl.textContent = "SICK DRIFT!";
        this.driftQualityEl.style.color = "#ff0055";
      } else if (this.activeDriftScore > 600) {
        this.driftQualityEl.textContent = "GREAT ANGLE";
        this.driftQualityEl.style.color = "#00f0ff";
      } else {
        this.driftQualityEl.textContent = "NICE SLIDE";
        this.driftQualityEl.style.color = "#fff";
      }
    } else {
      // Drift stopped, decay timer
      if (this.driftDecayTimer > 0) {
        this.driftDecayTimer -= dt;
      } else if (this.activeDriftScore > 0) {
        // Bank active score into total!
        this.totalDriftScore += this.activeDriftScore;
        this.activeDriftScore = 0;
        this.driftMultiplier = 1.0;
        this.driftTime = 0;
        this.driftContainerEl.classList.remove("active");
        this.totalDriftScoreEl.textContent = this.totalDriftScore.toLocaleString();
      }
    }
  }

  completeLap() {
    const lapTime = this.currentLapTime;
    this.lapStartTime = performance.now();

    if (!this.bestLapTime || lapTime < this.bestLapTime) {
      this.bestLapTime = lapTime;
      this.showSplitNotification("-NEW BEST LAP!-");
      window.gamepadManager.rumble(0.6, 0.8, 300);
    }

    if (this.currentLap < this.totalLaps) {
      this.currentLap++;
    } else {
      // Finish Race
      this.showSplitNotification("RACE COMPLETE!");
      window.gamepadManager.rumble(0.8, 1.0, 500);
    }
  }

  showSplitNotification(text) {
    if (!this.splitNotificationEl) return;
    this.splitTextEl.textContent = text;
    this.splitNotificationEl.classList.remove("hidden");
    setTimeout(() => {
      this.splitNotificationEl.classList.add("hidden");
    }, 2200);
  }

  updateCamera(dt) {
    const speed = Math.hypot(this.car.vx, this.car.vy);

    // Lookahead in direction of car motion
    const lookaheadDist = Math.min(180, speed * 12);
    const targetX = this.car.x + Math.cos(this.car.angle) * lookaheadDist;
    const targetY = this.car.y + Math.sin(this.car.angle) * lookaheadDist;

    // Smooth camera lag
    const lerpFactor = this.camera.mode === "chase" ? 0.15 : 0.08;
    this.camera.x += (targetX - this.camera.x) * lerpFactor;
    this.camera.y += (targetY - this.camera.y) * lerpFactor;

    // Speed Zoom
    if (this.camera.mode === "aerial") {
      this.camera.targetZoom = 0.55;
    } else {
      const zoomOut = (speed / this.car.maxForwardSpeed) * 0.25;
      this.camera.targetZoom = 1.0 - zoomOut;
    }
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
  }

  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Clear background
    ctx.fillStyle = "#080a10";
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    // Center camera on viewport
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    if (this.camera.mode === "chase") {
      // Orient world so car is pointing upwards
      ctx.rotate(-this.car.angle - Math.PI / 2);
    }

    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Skid Marks Buffer
    window.particleSystem.drawSkids(ctx);

    // 2. Draw Track, Curbs, Checkpoints
    this.track.draw(ctx, this.camera);

    // 3. Draw Tire Smoke & Particles (under car)
    window.particleSystem.drawParticles(ctx);

    // 4. Draw Player Car
    this.car.draw(ctx);

    ctx.restore();
  }

  updateHUD() {
    // Lap Times
    if (this.currentLapEl) this.currentLapEl.textContent = this.currentLap;
    if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(this.currentLapTime);
    if (this.bestTimeEl) this.bestTimeEl.textContent = this.formatTime(this.bestLapTime);

    // Speedometer & Gear
    if (this.speedValEl) this.speedValEl.textContent = this.car.speedKmh;
    if (this.gearValEl) this.gearValEl.textContent = this.car.gear;

    // RPM Gauge (semi-circle dashoffset)
    if (this.rpmGaugeEl) {
      const maxDash = 190;
      const offset = maxDash - (this.car.rpm * maxDash);
      this.rpmGaugeEl.style.strokeDashoffset = offset;
      this.rpmGaugeEl.classList.toggle("redline", this.car.rpm > 0.85);
    }

    // Nitro Fill
    if (this.nitroFillEl) {
      const pct = Math.round((this.car.nitro / this.car.nitroCapacity) * 100);
      this.nitroFillEl.style.width = `${pct}%`;
      if (this.nitroPctEl) this.nitroPctEl.textContent = `${pct}%`;
    }
  }
}

// Initialize on DOM Load
window.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();

  const unlockAudio = () => {
    if (window.soundEngine) window.soundEngine.resume();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
});
