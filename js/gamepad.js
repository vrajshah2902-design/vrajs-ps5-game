/**
 * PS5 DualSense Gamepad & Input Manager
 * Supports native DualSense Gamepad API triggers, analog sticks, buttons, and haptic rumble.
 * Includes complete keyboard fallback.
 */

class GamepadManager {
  constructor() {
    this.gamepadIndex = null;
    this.isConnected = false;
    this.padName = "No Controller";
    this.isDualSense = false;

    // Analog States
    this.throttle = 0;     // 0.0 to 1.0 (R2 or W/Up)
    this.brake = 0;        // 0.0 to 1.0 (L2 or S/Down)
    this.steer = 0;        // -1.0 to 1.0 (Left Stick X or A/D)
    
    // Digital Buttons
    this.handbrake = false; // Cross ✕ or Space
    this.nitro = false;     // Square ▢, R1 or Shift
    this.reset = false;     // Circle ◯ or R
    this.changeCam = false; // Triangle △ or C
    this.pause = false;     // Options or Escape
    this.select = false;    // Cross ✕ or Enter

    // Previous frame states for edge detection (pressed this frame)
    this.prevButtons = {};

    // Deadzone
    this.stickDeadzone = 0.08;

    // Rumble settings & throttling
    this.rumbleEnabled = true;
    this.lastRumbleTime = 0;
    this.rumbleActiveUntil = 0;

    // Keyboard state
    this.keys = {};

    // Setup event listeners
    this.initListeners();
  }

  initListeners() {
    window.addEventListener("gamepadconnected", (e) => {
      this.gamepadIndex = e.gamepad.index;
      this.isConnected = true;
      this.padName = e.gamepad.id;
      this.checkDualSenseType(e.gamepad.id);
      this.updateConnectionUI(true);
      console.log(`[Gamepad] Connected: ${e.gamepad.id} at index ${e.gamepad.index}`);
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        this.isConnected = false;
        this.padName = "Disconnected";
        this.updateConnectionUI(false);
        console.log(`[Gamepad] Disconnected: index ${e.gamepad.index}`);
      }
    });

    // Keyboard listeners
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  checkDualSenseType(id) {
    const lower = (id || "").toLowerCase();
    this.isDualSense = lower.includes("dualsense") || lower.includes("ps5") || lower.includes("054c") || lower.includes("sony");
  }

  updateConnectionUI(connected) {
    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");
    const statusHint = document.getElementById("controller-hint");

    if (!statusDot || !statusText) return;

    if (connected) {
      statusDot.className = "status-indicator connected";
      statusText.textContent = this.isDualSense ? "PS5 DUALSENSE CONNECTED" : "GAMEPAD CONNECTED";
      if (statusHint) statusHint.textContent = "Ready for high-speed drift!";
    } else {
      statusDot.className = "status-indicator disconnected";
      statusText.textContent = "WAITING FOR PS5 CONTROLLER";
      if (statusHint) statusHint.textContent = "Press any button on your DualSense or use Keyboard";
    }
  }

  // Query state every frame
  poll() {
    let gp = null;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Find our connected gamepad or the first available standard gamepad
    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      gp = gamepads[this.gamepadIndex];
    } else {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          this.gamepadIndex = i;
          this.isConnected = true;
          this.checkDualSenseType(gp.id);
          this.updateConnectionUI(true);
          break;
        }
      }
    }

    // Default neutral values
    let throttleVal = 0;
    let brakeVal = 0;
    let steerVal = 0;
    let handbrakeVal = false;
    let nitroVal = false;
    let resetVal = false;
    let camVal = false;
    let pauseVal = false;
    let selectVal = false;

    // 1. Read Gamepad if connected
    if (gp && gp.connected) {
      // PS5 Standard Mapping:
      // Buttons: 0=✕, 1=◯, 2=▢, 3=△, 4=L1, 5=R1, 6=L2, 7=R2, 8=Share, 9=Options, 12=Up, 13=Down, 14=Left, 15=Right
      // Axes: 0=LeftStick X, 1=LeftStick Y, 2=RightStick X, 3=RightStick Y

      // R2 Throttle (Analog 0.0 - 1.0)
      if (gp.buttons[7]) {
        throttleVal = gp.buttons[7].value;
      }

      // L2 Brake / Reverse (Analog 0.0 - 1.0)
      if (gp.buttons[6]) {
        brakeVal = gp.buttons[6].value;
      }

      // Left Stick X Steering
      let rawSteer = gp.axes[0] !== undefined ? gp.axes[0] : 0;
      if (Math.abs(rawSteer) > this.stickDeadzone) {
        // Normalize range outside deadzone
        const sign = Math.sign(rawSteer);
        steerVal = sign * ((Math.abs(rawSteer) - this.stickDeadzone) / (1 - this.stickDeadzone));
      }

      // D-Pad override for steering if used
      if (gp.buttons[14] && gp.buttons[14].pressed) steerVal = -1.0;
      if (gp.buttons[15] && gp.buttons[15].pressed) steerVal = 1.0;

      // Face buttons
      handbrakeVal = !!(gp.buttons[0] && gp.buttons[0].pressed); // ✕ Cross
      nitroVal = !!((gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[5] && gp.buttons[5].pressed)); // ▢ Square or R1
      resetVal = !!(gp.buttons[1] && gp.buttons[1].pressed); // ◯ Circle
      camVal = !!(gp.buttons[3] && gp.buttons[3].pressed); // △ Triangle
      pauseVal = !!(gp.buttons[9] && gp.buttons[9].pressed); // Options
      selectVal = handbrakeVal; // ✕ also acts as UI Select
    }

    // 2. Blend with Keyboard inputs
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) throttleVal = Math.max(throttleVal, 1.0);
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) brakeVal = Math.max(brakeVal, 1.0);
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) steerVal = Math.min(steerVal, -1.0);
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) steerVal = Math.max(steerVal, 1.0);

    if (this.keys["Space"]) handbrakeVal = true;
    if (this.keys["ShiftLeft"] || this.keys["ShiftRight"] || this.keys["KeyN"]) nitroVal = true;
    if (this.keys["KeyR"]) resetVal = true;
    if (this.keys["KeyC"]) camVal = true;
    if (this.keys["Escape"] || this.keys["KeyP"]) pauseVal = true;
    if (this.keys["Enter"] || this.keys["Space"]) selectVal = true;

    // Edge triggers (just pressed this frame)
    this.justPressedHandbrake = handbrakeVal && !this.prevButtons.handbrake;
    this.justPressedReset = resetVal && !this.prevButtons.reset;
    this.justPressedCam = camVal && !this.prevButtons.changeCam;
    this.justPressedPause = pauseVal && !this.prevButtons.pause;
    this.justPressedSelect = selectVal && !this.prevButtons.select;

    // Update active properties
    this.throttle = Math.min(1.0, Math.max(0.0, throttleVal));
    this.brake = Math.min(1.0, Math.max(0.0, brakeVal));
    this.steer = Math.min(1.0, Math.max(-1.0, steerVal));
    this.handbrake = handbrakeVal;
    this.nitro = nitroVal;
    this.reset = resetVal;
    this.changeCam = camVal;
    this.pause = pauseVal;
    this.select = selectVal;

    // Cache previous button states
    this.prevButtons = {
      handbrake: handbrakeVal,
      nitro: nitroVal,
      reset: resetVal,
      changeCam: camVal,
      pause: pauseVal,
      select: selectVal
    };

    // Update mini diagnostics HUD
    this.updateDiagnosticsUI();
  }

  // Trigger PS5 DualSense Haptic Rumble effect
  rumble(weakMagnitude = 0.4, strongMagnitude = 0.4, durationMs = 150) {
    if (!this.rumbleEnabled) return;

    const now = performance.now();
    // Throttle rumble requests to avoid saturating browser actuator queues
    if (now - this.lastRumbleTime < 50 && durationMs < 200) {
      return;
    }
    this.lastRumbleTime = now;
    this.rumbleActiveUntil = now + durationMs;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      const pad = gamepads[this.gamepadIndex];
      if (pad && pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === "function") {
        pad.vibrationActuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1.0, Math.max(0.0, weakMagnitude)),
          strongMagnitude: Math.min(1.0, Math.max(0.0, strongMagnitude))
        }).catch(() => {});
      }
    }
  }

  updateDiagnosticsUI() {
    const l2Meter = document.getElementById("l2-meter");
    const r2Meter = document.getElementById("r2-meter");
    const stickKnob = document.getElementById("stick-knob");
    const btnCross = document.getElementById("btn-cross");
    const btnCircle = document.getElementById("btn-circle");
    const btnSquare = document.getElementById("btn-square");
    const btnTriangle = document.getElementById("btn-triangle");
    const rumbleBadge = document.getElementById("rumble-indicator");

    if (l2Meter) l2Meter.style.height = `${Math.round(this.brake * 100)}%`;
    if (r2Meter) r2Meter.style.height = `${Math.round(this.throttle * 100)}%`;

    if (stickKnob) {
      const offsetX = this.steer * 15;
      stickKnob.style.transform = `translate(${offsetX}px, 0px)`;
    }

    if (btnCross) btnCross.classList.toggle("pressed", this.handbrake);
    if (btnSquare) btnSquare.classList.toggle("pressed", this.nitro);
    if (btnCircle) btnCircle.classList.toggle("pressed", this.reset);
    if (btnTriangle) btnTriangle.classList.toggle("pressed", this.changeCam);

    if (rumbleBadge) {
      const isRumbling = performance.now() < this.rumbleActiveUntil;
      rumbleBadge.classList.toggle("rumbling", isRumbling);
    }
  }
}

// Global instance
window.gamepadManager = new GamepadManager();
