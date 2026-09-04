/**
 * lissajous.js - 利薩爾圓 (Lissajous Circle) 示波器調校模組
 * 對應教材 Page 32：
 * - 示波器 X-Y 模式輸入正餘弦差動訊號
 * - 相位差正好為 90 度且振幅平衡時呈現「正圓形」
 * - 存在相位誤差或振幅不對稱時呈現「橢圓形」
 * - 工業現場光學尺安裝與正交校正的關鍵診斷依據
 */

(function () {
  const sliderPhase = document.getElementById('slider-phase-err');
  const labelPhase = document.getElementById('label-phase-err');
  const sliderAmp = document.getElementById('slider-amp-ratio');
  const labelAmp = document.getElementById('label-amp-ratio');
  const btnCalibrate = document.getElementById('btn-quick-calibrate');
  const btnRandom = document.getElementById('btn-random-error');

  const canvasXY = document.getElementById('canvas-lissajous');
  const canvasTime = document.getElementById('canvas-lissajous-time');

  const dispPhase = document.getElementById('disp-cur-phase');
  const dispEcc = document.getElementById('disp-eccentricity');
  const dispStatus = document.getElementById('disp-calib-status');

  if (!sliderPhase || !sliderAmp || !canvasXY || !canvasTime) return;

  const ctxXY = canvasXY.getContext('2d');
  const ctxTime = canvasTime.getContext('2d');

  let phaseErrDeg = 25.0; // Installation phase error in degrees
  let ampRatio = 1.30; // Ay / Ax
  let animAngle = 0;

  function calculateMetrics() {
    const totalPhaseDeg = 90.0 + phaseErrDeg;
    const phaseRad = (totalPhaseDeg * Math.PI) / 180;

    // Approximate ellipse semi-major and semi-minor axes to compute eccentricity
    // For x = cos(t), y = ampRatio * sin(t + phi_err)
    const bOverA = Math.cos((phaseErrDeg * Math.PI) / 180) / ampRatio;
    const ratio = Math.min(bOverA, 1 / bOverA);
    const ecc = Math.sqrt(Math.max(0, 1 - ratio * ratio));

    const isCalibrated = Math.abs(phaseErrDeg) <= 3 && Math.abs(ampRatio - 1.0) <= 0.05;

    dispPhase.textContent = `${totalPhaseDeg.toFixed(1)}° (理想 90.0°)`;
    dispEcc.textContent = `${ecc.toFixed(2)} ${ecc < 0.2 ? '(接近正圓)' : '(明顯橢圓)'}`;

    if (isCalibrated) {
      dispStatus.textContent = '✅ 正交校正合格 (標準正圓形)';
      dispStatus.className = 'status-val status-badge-ok';
    } else {
      dispStatus.textContent = '❌ 未校準 (橢圓失真，需微調感測器)';
      dispStatus.className = 'status-val status-badge-err';
    }

    labelPhase.textContent = `${phaseErrDeg > 0 ? '+' : ''}${phaseErrDeg.toFixed(0)}° ${Math.abs(phaseErrDeg) <= 2 ? '(已正交)' : '(有偏差)'}`;
    labelAmp.textContent = `${ampRatio.toFixed(2)}`;
  }

  function drawXYScope() {
    const w = canvasXY.width;
    const h = canvasXY.height;
    ctxXY.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const radiusX = 85;
    const radiusY = 85 * ampRatio;

    // 1. Oscilloscope Graticule (Grid & Crosshairs)
    ctxXY.save();
    ctxXY.strokeStyle = '#1e293b';
    ctxXY.lineWidth = 1;
    for (let x = 20; x < w; x += 40) {
      ctxXY.beginPath();
      ctxXY.moveTo(x, 0);
      ctxXY.lineTo(x, h);
      ctxXY.stroke();
    }
    for (let y = 10; y < h; y += 40) {
      ctxXY.beginPath();
      ctxXY.moveTo(0, y);
      ctxXY.lineTo(w, y);
      ctxXY.stroke();
    }

    // Main reticle
    ctxXY.strokeStyle = '#475569';
    ctxXY.lineWidth = 1.5;
    ctxXY.beginPath();
    ctxXY.moveTo(centerX, 10);
    ctxXY.lineTo(centerX, h - 10);
    ctxXY.moveTo(20, centerY);
    ctxXY.lineTo(w - 20, centerY);
    ctxXY.stroke();

    // Axis tick marks
    for (let t = -3; t <= 3; t++) {
      if (t !== 0) {
        ctxXY.moveTo(centerX + t * 40, centerY - 4);
        ctxXY.lineTo(centerX + t * 40, centerY + 4);
        ctxXY.moveTo(centerX - 4, centerY + t * 40);
        ctxXY.lineTo(centerX + 4, centerY + t * 40);
      }
    }
    ctxXY.stroke();
    ctxXY.restore();

    // 2. Draw Lissajous Figure
    const phaseRad = ((90.0 + phaseErrDeg) * Math.PI) / 180;
    ctxXY.save();
    const isCalibrated = Math.abs(phaseErrDeg) <= 3 && Math.abs(ampRatio - 1.0) <= 0.05;
    ctxXY.strokeStyle = isCalibrated ? '#10b981' : '#38bdf8';
    ctxXY.shadowColor = isCalibrated ? '#10b981' : '#38bdf8';
    ctxXY.shadowBlur = 10;
    ctxXY.lineWidth = 2.5;

    ctxXY.beginPath();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const x = centerX + Math.sin(t) * radiusX;
      const y = centerY - Math.sin(t + phaseRad) * radiusY;
      if (i === 0) ctxXY.moveTo(x, y);
      else ctxXY.lineTo(x, y);
    }
    ctxXY.closePath();
    ctxXY.stroke();

    // 3. Real-time scanning point on the Lissajous curve
    const curX = centerX + Math.sin(animAngle) * radiusX;
    const curY = centerY - Math.sin(animAngle + phaseRad) * radiusY;
    ctxXY.fillStyle = '#f8fafc';
    ctxXY.shadowColor = '#ffffff';
    ctxXY.shadowBlur = 12;
    ctxXY.beginPath();
    ctxXY.arc(curX, curY, 5, 0, Math.PI * 2);
    ctxXY.fill();
    ctxXY.restore();

    // Label in corner
    ctxXY.fillStyle = '#94a3b8';
    ctxXY.font = '10px monospace';
    ctxXY.fillText('MODE: X-Y (극座標李薩爾)', 15, 20);
    ctxXY.fillText('CH1: Va (X) | CH2: Vb (Y)', 15, 34);
  }

  function drawTimeScope() {
    const w = canvasTime.width;
    const h = canvasTime.height;
    ctxTime.clearRect(0, 0, w, h);

    const midY = h / 2;
    const baseAmp = 60;
    const phaseRad = ((90.0 + phaseErrDeg) * Math.PI) / 180;

    // 1. Grid
    ctxTime.strokeStyle = '#1e293b';
    ctxTime.lineWidth = 1;
    for (let x = 20; x < w; x += 40) {
      ctxTime.beginPath();
      ctxTime.moveTo(x, 0);
      ctxTime.lineTo(x, h);
      ctxTime.stroke();
    }
    for (let y = 10; y < h; y += 40) {
      ctxTime.beginPath();
      ctxTime.moveTo(0, y);
      ctxTime.lineTo(w, y);
      ctxTime.stroke();
    }

    ctxTime.strokeStyle = '#475569';
    ctxTime.beginPath();
    ctxTime.moveTo(20, midY);
    ctxTime.lineTo(w - 20, midY);
    ctxTime.stroke();

    // 2. Ch1 Va Waveform (Sin, Emerald)
    ctxTime.strokeStyle = '#10b981';
    ctxTime.lineWidth = 2.2;
    ctxTime.beginPath();
    for (let x = 25; x < w - 25; x++) {
      const t = ((x + animAngle * 35) / 75);
      const y = midY - Math.sin(t) * baseAmp;
      if (x === 25) ctxTime.moveTo(x, y);
      else ctxTime.lineTo(x, y);
    }
    ctxTime.stroke();

    // 3. Ch2 Vb Waveform (Cos with phase error, Cyan)
    ctxTime.strokeStyle = '#06b6d4';
    ctxTime.lineWidth = 2.2;
    ctxTime.beginPath();
    for (let x = 25; x < w - 25; x++) {
      const t = ((x + animAngle * 35) / 75);
      const y = midY - Math.sin(t + phaseRad) * (baseAmp * ampRatio);
      if (x === 25) ctxTime.moveTo(x, y);
      else ctxTime.lineTo(x, y);
    }
    ctxTime.stroke();

    // Legends
    ctxTime.fillStyle = '#10b981';
    ctxTime.font = 'bold 11px sans-serif';
    ctxTime.fillText('● CH1: Va (基準弦波)', 30, 22);
    ctxTime.fillStyle = '#06b6d4';
    ctxTime.fillText('● CH2: Vb (相移餘弦波)', 180, 22);

    // Phase difference indicator
    ctxTime.fillStyle = Math.abs(phaseErrDeg) <= 3 ? '#10b981' : '#f59e0b';
    ctxTime.fillText(`相位差: ${(90 + phaseErrDeg).toFixed(1)}°`, w - 120, 22);
  }

  function loop() {
    animAngle += 0.04;
    drawXYScope();
    drawTimeScope();
    requestAnimationFrame(loop);
  }

  sliderPhase.addEventListener('input', (e) => {
    phaseErrDeg = parseFloat(e.target.value);
    calculateMetrics();
  });

  sliderAmp.addEventListener('input', (e) => {
    ampRatio = parseFloat(e.target.value);
    calculateMetrics();
  });

  // Quick Calibration Animation
  btnCalibrate.addEventListener('click', () => {
    let steps = 25;
    const stepPhase = (0 - phaseErrDeg) / steps;
    const stepAmp = (1.0 - ampRatio) / steps;

    const timer = setInterval(() => {
      phaseErrDeg += stepPhase;
      ampRatio += stepAmp;
      steps--;

      sliderPhase.value = phaseErrDeg;
      sliderAmp.value = ampRatio;
      calculateMetrics();

      if (steps <= 0) {
        phaseErrDeg = 0.0;
        ampRatio = 1.0;
        sliderPhase.value = 0;
        sliderAmp.value = 1.0;
        calculateMetrics();
        clearInterval(timer);
      }
    }, 20);
  });

  // Random Error Button for practice
  btnRandom.addEventListener('click', () => {
    // Generate random phase error between -35 and +35 (excluding small values)
    let rPhase = (Math.random() * 50 - 25);
    if (Math.abs(rPhase) < 10) rPhase = rPhase > 0 ? 18 : -18;
    const rAmp = parseFloat((0.75 + Math.random() * 0.6).toFixed(2));

    phaseErrDeg = Math.round(rPhase);
    ampRatio = rAmp;

    sliderPhase.value = phaseErrDeg;
    sliderAmp.value = ampRatio;
    calculateMetrics();
  });

  calculateMetrics();
  loop();
})();
