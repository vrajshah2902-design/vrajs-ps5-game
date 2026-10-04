# OVERSTEER // PS5 DualSense Drift Racer

A high-performance arcade top-down drift racing game built with HTML5 Canvas, Web Audio API, and the Web Gamepad API specifically tuned for the **PlayStation 5 DualSense Controller**.

---

## 🎮 PS5 DualSense Controller Setup

### 1. Connecting to your PC:
* **Option A: USB-C Cable (Recommended)**
  * Plug your DualSense controller into your PC via a USB-C cable. Windows will automatically recognize it as an audio & gaming controller.
* **Option B: Bluetooth**
  1. Hold down the **Create button** (top-left) and the **PS Logo button** (center) simultaneously until the lightbar starts blinking rapidly.
  2. In Windows Settings, navigate to **Bluetooth & devices** -> **Add device** -> **Bluetooth**.
  3. Select **Wireless Controller**.

### 2. DualSense Controls & Mapping:
| Button / Input | Action | Details |
| :--- | :--- | :--- |
| **R2 Trigger** | **Throttle / Acceleration** | Analog gradual acceleration curve |
| **L2 Trigger** | **Brake / Reverse** | Analog gradual foot brake & reverse |
| **Left Stick** | **Precision Steering** | Smooth 360° steering with anti-drift deadzone |
| **✕ (Cross)** | **Handbrake Slide** | Cuts rear tire traction for instant drift initiation |
| **▢ (Square) or R1** | **Nitro Boost** | High-speed acceleration boost with exhaust flames |
| **△ (Triangle)** | **Camera Toggle** | Cycles between Dynamic, Chase, and Aerial views |
| **◯ (Circle)** | **Car Reset** | Resets vehicle to current track checkpoint |
| **OPTIONS** | **Pause / Main Menu** | Opens track & car selection menu |

> **DualSense Haptic Rumble**: The game utilizes the browser's Gamepad Haptics API (`vibrationActuator`) to send vibration pulses on engine redlines, tire slides, barrier scrapes, and nitro boosts.

---

## ⌨️ Keyboard Fallback Controls
If you ever need to drive without a controller:
* **W / Up Arrow**: Accelerate
* **S / Down Arrow**: Brake / Reverse
* **A / Left Arrow**: Steer Left
* **D / Right Arrow**: Steer Right
* **Spacebar**: Handbrake
* **Shift / N**: Nitro Boost
* **C**: Change Camera
* **R**: Reset Car to Track
* **Esc / P**: Pause Menu

---

## 🏎️ Features
1. **Realistic 2D Drift Physics**:
   * Lateral slip angle calculation and rear tire traction breakdown.
   * Counter-steering stabilization so you can hold long high-angle slides.
   * Persistent tire skid marks drawn to asphalt canvas buffer.
   * Billowing tire smoke and barrier scrape sparks.
2. **Procedural Web Audio Engine**:
   * Dynamic multi-oscillator engine roar with pitch modulation and gear shifts (Gears 1 to 6).
   * Realistic tire screech with bandpass resonance filter that scales with drift angle.
   * Crisp turbo blow-off valve release (`pshh-tututu`).
   * High-resonance nitro whoosh and collision impact sound effects.
3. **Drift Scoring System**:
   * Real-time points based on slip angle, vehicle speed, and combo duration.
   * Combo multiplier up to **x4.0**.
   * Score ratings: *Nice Slide*, *Great Angle*, *Sick Drift!*, and *Drift God!!*.
4. **3 Distinct Tracks**:
   * **Neon Bay Circuit**: Coastal night track with harbor straights and chicanes.
   * **Touge Mountain Pass**: Technical downhill mountain drift paradise with 5 hairpins.
   * **Cyber High Speedway**: Wide sweeping high-speed drift arcs.
5. **3 Vehicles**:
   * **Apex GT** (Cyan): Balanced all-rounder (480 HP).
   * **Ryu Spec-D** (Magenta): Drift specialist with extra slip angle (510 HP).
   * **Phantom V8** (Yellow): Raw torque power muscle (620 HP).

---

## 🚀 How to Run
Double-click `start_game.bat` or run:
```powershell
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser (Google Chrome, Microsoft Edge, Brave, or Firefox).
