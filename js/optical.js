/**
 * optical.js - 光學尺量測原理模組
 * 包含：
 * 1. 直接量測 vs 間接量測與滾珠導螺桿背隙 (Backlash) 模擬 (Page 19)
 * 2. 四組感測器差動消除直流飄移 (DC Drift) 與振幅放大 (Page 25 ~ 27)
 */

(function () {
  /* =========================================================================
     PART 1: Direct vs Indirect Measurement & Backlash Simulation (Page 19)
     ========================================================================= */
  const canvasBacklash = document.getElementById('canvas-backlash');
  const btnMoveLeft = document.getElementById('btn-move-left');
  const btnMoveRight = document.getElementById('btn-move-right');
  const btnReverseDir = document.getElementById('btn-reverse-dir');
  const btnResetMotion = document.getElementById('btn-reset-motion');

  const dispIndirect = document.getElementById('disp-indirect-pos');
  const dispDirect = document.getElementById('disp-direct-pos');
  const dispBacklash = document.getElementById('disp-backlash-err');

  if (canvasBacklash) {
    const ctx = canvasBacklash.getContext('2d');

    const BACKLASH_GAP = 0.050; // 50 microns backlash (0.050 mm)
    const PITCH_MM = 5.0; // 5mm per revolution (360 deg)
    
    let motorAngleDeg = 0; // Motor rotation in degrees
    let indirectPos = 0.0; // calculated purely from motor: (motorAngle / 360) * PITCH_MM
    let carriagePos = 0.0; // actual carriage position (optical scale direct reading)
    let nutCavityOffset = BACKLASH_GAP; // 0 = touching left wall, BACKLASH_GAP = touching right wall
    let lastDirection = 1; // 1 = right, -1 = left

    function applyBacklashStep(deltaMm) {
      if (Math.abs(deltaMm) < 0.0001) return;
      const dir = deltaMm > 0 ? 1 : -1;
      lastDirection = dir;

      motorAngleDeg += (deltaMm / PITCH_MM) * 360;
      indirectPos += deltaMm;

      if (deltaMm > 0) {
        // Driving right: nut moves right inside cavity towards BACKLASH_GAP
        nutCavityOffset += deltaMm;
        if (nutCavityOffset >= BACKLASH_GAP) {
          const excess = nutCavityOffset - BACKLASH_GAP;
          carriagePos += excess; // Table only moves after nut contacts right wall
          nutCavityOffset = BACKLASH_GAP; // Firmly against right wall (偏右)
        }
      } else {
        // Driving left: nut moves left inside cavity towards 0
        nutCavityOffset += deltaMm; // deltaMm is negative
        if (nutCavityOffset <= 0) {
          const excess = nutCavityOffset; // negative
          carriagePos += excess; // Table only moves after nut contacts left wall
          nutCavityOffset = 0; // Firmly against left wall (偏左)
        }
      }

      // Clamp carriage range on screen
      if (carriagePos > 1.2) carriagePos = 1.2;
      if (carriagePos < -1.2) carriagePos = -1.2;

      updateBacklashUI();
      drawBacklashScene();
    }

    function runSmoothMotion(totalDeltaMm, frameCount = 12) {
      const stepDelta = totalDeltaMm / frameCount;
      let frameIdx = 0;
      function animFrame() {
        frameIdx++;
        applyBacklashStep(stepDelta);
        if (frameIdx < frameCount) {
          requestAnimationFrame(animFrame);
        }
      }
      requestAnimationFrame(animFrame);
    }

    function updateBacklashUI() {
      dispIndirect.textContent = `${indirectPos.toFixed(3)} mm`;
      dispDirect.textContent = `${carriagePos.toFixed(3)} mm`;
      const err = Math.abs(indirectPos - carriagePos);
      const inTransit = nutCavityOffset > 0.002 && nutCavityOffset < BACKLASH_GAP - 0.002;

      if (inTransit) {
        dispBacklash.textContent = `${err.toFixed(3)} mm (螺桿空轉消除背隙中！)`;
        dispBacklash.style.color = '#ef4444';
      } else if (err > 0.001) {
        dispBacklash.textContent = `${err.toFixed(3)} mm (反向換向產生背隙滯後！)`;
        dispBacklash.style.color = '#ef4444';
      } else {
        dispBacklash.textContent = `${err.toFixed(3)} mm (緊密嚙合傳動中)`;
        dispBacklash.style.color = '#10b981';
      }
    }

    function drawBacklashScene() {
      const w = canvasBacklash.width;
      const h = canvasBacklash.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Draw Linear Guide Rail (Bottom Base)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40, 160, w - 80, 25);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(40, 160, w - 80, 25);

      // 2. Draw Optical Scale Glass on Rail (Direct Measurement)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(60, 165, w - 120, 12);
      // Gratings on scale
      ctx.fillStyle = '#ffffff';
      for (let x = 65; x < w - 65; x += 10) {
        ctx.fillRect(x, 165, 2, 12);
      }
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px sans-serif';
      ctx.fillText('光學尺主尺 (直接固定於床台，無背隙)', 70, 195);

      // 3. Draw Motor & Lead Screw (Indirect Measurement)
      const motorX = 50;
      const motorY = 60;
      // Motor Body
      ctx.fillStyle = '#334155';
      ctx.fillRect(motorX, motorY, 70, 70);
      ctx.strokeStyle = '#64748b';
      ctx.strokeRect(motorX, motorY, 70, 70);
      // Rotary Encoder on Motor
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(motorX - 15, motorY + 15, 15, 40);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('旋轉編碼', motorX - 14, motorY + 38);

      // Rotating Screw Shaft
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(motorX + 70, motorY + 28, w - 240, 14);
      // Screw threads
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      for (let x = motorX + 80; x < w - 180; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, motorY + 28);
        ctx.lineTo(x + 6, motorY + 42);
        ctx.stroke();
      }

      // 4. Moving Worktable Carriage (Mounted on guide rail)
      const centerScreenX = 380;
      const carriageScreenX = centerScreenX + carriagePos * 100; // 1mm = 100px on screen

      // Draw Carriage (Platform)
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(carriageScreenX - 60, 85, 120, 75);
      ctx.strokeRect(carriageScreenX - 60, 85, 120, 75);

      // Optical Scale Read Head attached to carriage
      ctx.fillStyle = '#10b981';
      ctx.fillRect(carriageScreenX - 25, 150, 50, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('光學讀取頭', carriageScreenX - 22, 163);

      // 5. Carriage Nut Cavity & Ball Nut showing backlash contact & gap
      const cavityWidth = 66;
      const cavityHeight = 36;
      const cavityLeft = carriageScreenX - cavityWidth / 2;
      const cavityRight = carriageScreenX + cavityWidth / 2;
      const cavityY = motorY + 17;

      // Draw Cavity background in carriage
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cavityLeft, cavityY, cavityWidth, cavityHeight);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cavityLeft, cavityY, cavityWidth, cavityHeight);

      // Calculate Nut position inside cavity:
      // When nutCavityOffset = 0: contactRatio = 0.0 -> nut is on LEFT wall (偏左)
      // When nutCavityOffset = BACKLASH_GAP: contactRatio = 1.0 -> nut is on RIGHT wall (偏右)
      const contactRatio = Math.max(0, Math.min(1, nutCavityOffset / BACKLASH_GAP));
      const nutWidth = 38;
      const nutHeight = 28;
      const gapTotalWidth = cavityWidth - nutWidth; // 28px visual clearance gap
      const nutX = cavityLeft + contactRatio * gapTotalWidth;
      const nutY = cavityY + 4;

      // Draw Backlash Gap Highlighting
      const leftGapWidth = nutX - cavityLeft;
      const rightGapWidth = cavityRight - (nutX + nutWidth);

      if (leftGapWidth > 1.5) {
        // Gap is on the left (Moving Right -> Nut is on RIGHT)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(cavityLeft, cavityY, leftGapWidth, cavityHeight);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(cavityLeft, cavityY, leftGapWidth, cavityHeight);
        if (leftGapWidth > 12) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('背隙', cavityLeft + 2, cavityY + 22);
        }
      }

      if (rightGapWidth > 1.5) {
        // Gap is on the right (Moving Left -> Nut is on LEFT)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(nutX + nutWidth, cavityY, rightGapWidth, cavityHeight);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(nutX + nutWidth, cavityY, rightGapWidth, cavityHeight);
        if (rightGapWidth > 12) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('背隙', nutX + nutWidth + 2, cavityY + 22);
        }
      }

      // Draw the Moving Nut itself
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(nutX, nutY, nutWidth, nutHeight);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(nutX, nutY, nutWidth, nutHeight);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('導螺帽', nutX + 4, nutY + 18);

      // Contact Surface Glow & Direction Text
      if (contactRatio >= 0.98) {
        // Nut touches RIGHT wall -> pushing right
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cavityRight, cavityY);
        ctx.lineTo(cavityRight, cavityY + cavityHeight);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('➡ 向右移動：導螺帽偏右貼緊右壁推動平台', carriageScreenX - 95, 75);
      } else if (contactRatio <= 0.02) {
        // Nut touches LEFT wall -> pushing left
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cavityLeft, cavityY);
        ctx.lineTo(cavityLeft, cavityY + cavityHeight);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('⬅ 向左移動：導螺帽偏左貼緊左壁推動平台', carriageScreenX - 95, 75);
      } else {
        // Nut is in transit across the gap
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('⚠️ 螺桿空轉消除背隙中！工作台停滯不動', carriageScreenX - 95, 75);
      }
    }

    btnMoveRight.addEventListener('click', () => runSmoothMotion(0.150));
    btnMoveLeft.addEventListener('click', () => runSmoothMotion(-0.150));
    btnReverseDir.addEventListener('click', () => {
      // Instantly reverse direction and step across the 50um gap
      const targetDir = -lastDirection;
      runSmoothMotion(targetDir * 0.080);
    });
    btnResetMotion.addEventListener('click', () => {
      motorAngleDeg = 0;
      indirectPos = 0;
      carriagePos = 0;
      nutCavityOffset = BACKLASH_GAP;
      lastDirection = 1;
      updateBacklashUI();
      drawBacklashScene();
    });

    drawBacklashScene();
    updateBacklashUI();
  }


  /* =========================================================================
     PART 2: 4 Photodetectors Differential DC Drift Cancellation (Page 25~27)
     ========================================================================= */
  const sliderDcDrift = document.getElementById('slider-dc-drift');
  const labelDcDrift = document.getElementById('label-dc-drift');
  const sliderOptPos = document.getElementById('slider-opt-pos');
  const labelOptPos = document.getElementById('label-opt-pos');
  const btnAutoRun = document.getElementById('btn-auto-run-opt');

  const canvasRaw = document.getElementById('canvas-raw-signals');
  const canvasDiff = document.getElementById('canvas-diff-signals');

  if (sliderDcDrift && canvasRaw && canvasDiff) {
    const ctxRaw = canvasRaw.getContext('2d');
    const ctxDiff = canvasDiff.getContext('2d');

    let dcDrift = 0.6; // V' offset
    let optThetaDeg = 0; // phase position
    let isAutoRunning = false;
    let autoInterval = null;

    function renderDiffWaveforms() {
      const w = canvasRaw.width;
      const h = canvasRaw.height;
      const midY = h / 2;
      const baseAmp = 40; // 1V = 40px

      // -------------------------------------------------------------
      // 1. Draw Raw 4 Signals (V1, V2, V3, V4)
      // -------------------------------------------------------------
      ctxRaw.clearRect(0, 0, w, h);
      // Zero axis
      ctxRaw.strokeStyle = '#64748b';
      ctxRaw.lineWidth = 1;
      ctxRaw.setLineDash([3, 3]);
      ctxRaw.beginPath();
      ctxRaw.moveTo(35, midY);
      ctxRaw.lineTo(w - 15, midY);
      ctxRaw.stroke();
      ctxRaw.setLineDash([]);

      ctxRaw.fillStyle = '#64748b';
      ctxRaw.font = '10px monospace';
      ctxRaw.fillText('0V', 10, midY + 3);

      // Plot V1 (sin), V2 (cos), V3 (-sin), V4 (-cos)
      const colors = ['#38bdf8', '#f59e0b', '#a855f7', '#ec4899'];
      const phases = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

      for (let ch = 0; ch < 4; ch++) {
        ctxRaw.strokeStyle = colors[ch];
        ctxRaw.lineWidth = 1.8;
        ctxRaw.beginPath();
        for (let x = 0; x < w - 50; x++) {
          const theta = ((x + optThetaDeg) / (w - 50)) * 4 * Math.PI + phases[ch];
          const v = dcDrift + Math.sin(theta);
          const py = midY - v * baseAmp;
          if (x === 0) ctxRaw.moveTo(35 + x, py);
          else ctxRaw.lineTo(35 + x, py);
        }
        ctxRaw.stroke();
      }

      // Draw DC Drift Average Line
      if (Math.abs(dcDrift) > 0.05) {
        const driftY = midY - dcDrift * baseAmp;
        ctxRaw.strokeStyle = '#ef4444';
        ctxRaw.lineWidth = 1.5;
        ctxRaw.setLineDash([4, 4]);
        ctxRaw.beginPath();
        ctxRaw.moveTo(35, driftY);
        ctxRaw.lineTo(w - 15, driftY);
        ctxRaw.stroke();
        ctxRaw.setLineDash([]);

        ctxRaw.fillStyle = '#ef4444';
        ctxRaw.font = '11px sans-serif';
        ctxRaw.fillText(`直流飄移 V' = ${dcDrift.toFixed(2)}V`, w - 150, driftY - 5);
      }

      // -------------------------------------------------------------
      // 2. Draw Differential Signals (Va = 2sin, Vb = 2cos)
      // -------------------------------------------------------------
      ctxDiff.clearRect(0, 0, w, h);
      // Zero axis
      ctxDiff.strokeStyle = '#64748b';
      ctxDiff.lineWidth = 1.5;
      ctxDiff.setLineDash([3, 3]);
      ctxDiff.beginPath();
      ctxDiff.moveTo(35, midY);
      ctxDiff.lineTo(w - 15, midY);
      ctxDiff.stroke();
      ctxDiff.setLineDash([]);

      ctxDiff.fillStyle = '#64748b';
      ctxDiff.font = '10px monospace';
      ctxDiff.fillText('0V', 10, midY + 3);

      // Va = V1 - V3 = 2 sin(theta) -> Green
      ctxDiff.strokeStyle = '#10b981';
      ctxDiff.lineWidth = 2.5;
      ctxDiff.beginPath();
      for (let x = 0; x < w - 50; x++) {
        const theta = ((x + optThetaDeg) / (w - 50)) * 4 * Math.PI;
        // Va = (dcDrift + sin) - (dcDrift - sin) = 2*sin
        const va = 2 * Math.sin(theta);
        const py = midY - va * baseAmp;
        if (x === 0) ctxDiff.moveTo(35 + x, py);
        else ctxDiff.lineTo(35 + x, py);
      }
      ctxDiff.stroke();

      // Vb = V2 - V4 = 2 cos(theta) -> Cyan
      ctxDiff.strokeStyle = '#06b6d4';
      ctxDiff.lineWidth = 2.5;
      ctxDiff.beginPath();
      for (let x = 0; x < w - 50; x++) {
        const theta = ((x + optThetaDeg) / (w - 50)) * 4 * Math.PI;
        // Vb = (dcDrift + cos) - (dcDrift - cos) = 2*cos
        const vb = 2 * Math.cos(theta);
        const py = midY - vb * baseAmp;
        if (x === 0) ctxDiff.moveTo(35 + x, py);
        else ctxDiff.lineTo(35 + x, py);
      }
      ctxDiff.stroke();

      // Text annotation for 2x amplitude
      ctxDiff.fillStyle = '#10b981';
      ctxDiff.font = 'bold 11px sans-serif';
      ctxDiff.fillText('直流飄移已被完全消除！振幅自動放大為 2 倍 (2.0Vpk)', 40, 25);
    }

    sliderDcDrift.addEventListener('input', (e) => {
      dcDrift = parseFloat(e.target.value);
      labelDcDrift.textContent = `${dcDrift >= 0 ? '+' : ''}${dcDrift.toFixed(2)} V`;
      labelDcDrift.style.color = Math.abs(dcDrift) > 0.05 ? '#ef4444' : '#10b981';
      renderDiffWaveforms();
    });

    sliderOptPos.addEventListener('input', (e) => {
      optThetaDeg = parseFloat(e.target.value);
      labelOptPos.textContent = `${optThetaDeg.toFixed(0)}°`;
      renderDiffWaveforms();
    });

    btnAutoRun.addEventListener('click', () => {
      isAutoRunning = !isAutoRunning;
      if (isAutoRunning) {
        btnAutoRun.textContent = '⏸ 暫停自動位移';
        btnAutoRun.classList.remove('btn-primary');
        btnAutoRun.classList.add('btn-warning');
        autoInterval = setInterval(() => {
          optThetaDeg = (optThetaDeg + 4) % 720;
          sliderOptPos.value = optThetaDeg;
          labelOptPos.textContent = `${optThetaDeg.toFixed(0)}°`;
          renderDiffWaveforms();
        }, 30);
      } else {
        btnAutoRun.textContent = '▶️ 自動連續移動副尺';
        btnAutoRun.classList.remove('btn-warning');
        btnAutoRun.classList.add('btn-primary');
        clearInterval(autoInterval);
      }
    });

    renderDiffWaveforms();
  }
})();
