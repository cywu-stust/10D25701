/**
 * inductive.js - 電感式感應尺 (Inductive Scale) 互動模擬模組
 * 對應教材 Page 20 ~ 22：
 * - 主尺與副尺蜿蜒線圈 (Serpentine Coils)
 * - 位置 A, B, C, D, E 電磁結合變化
 * - 1/4 間距雙迴路輸出正交正餘弦波 (SIN / COS)
 */

(function () {
  const slider = document.getElementById('slider-inductive-pos');
  const labelPos = document.getElementById('label-inductive-pos');
  const canvasCoils = document.getElementById('canvas-inductive-coils');
  const canvasWave = document.getElementById('canvas-inductive-wave');
  const badge = document.getElementById('inductive-badge');
  const detailText = document.getElementById('inductive-detail-text');

  if (!slider || !canvasCoils || !canvasWave) return;

  const ctxCoils = canvasCoils.getContext('2d');
  const ctxWave = canvasWave.getContext('2d');

  let currentPos = 0.0; // in units of pitch (0 to 2.0)

  // Explanation database for Positions A ~ E
  const posExplanations = [
    {
      range: [0, 0.05],
      name: '位置 A (0 間距)',
      text: '尺的回路和讀取頭回路完全重合一致，磁通同向疊加，電磁結合度在正方向達到最大值 (+1.0)。'
    },
    {
      range: [0.20, 0.30],
      name: '位置 B (1/4 間距)',
      text: '偏離尺 1/4 間距，讀取頭格子剛好在直尺格子的正中間，同等接收到從讀取頭兩方向流通的電流影響，使得電磁結合變為零 (0.0)。'
    },
    {
      range: [0.45, 0.55],
      name: '位置 C (1/2 間距)',
      text: '偏離尺 1/2 間距，和位置 A 呈現逆方向反轉關係，磁通反向抵銷，因此電磁結合會在負方向達到最大值 (-1.0)。'
    },
    {
      range: [0.70, 0.80],
      name: '位置 D (3/4 間距)',
      text: '偏離尺 3/4 間距，和位置 B 的相對幾何對稱關係相同，兩向感應電流平衡抵消，電磁結合同樣變為零 (0.0)。'
    },
    {
      range: [0.95, 1.05],
      name: '位置 E (1 間距)',
      text: '偏離尺 1 間距，和位置 A 的幾何相對關係完全相同，完成一個無誤差的正弦波週期 (SIN 結合)，依此循環。'
    }
  ];

  function updateExplanation(pos) {
    const cyclePos = pos % 1.0;
    let found = null;
    for (const exp of posExplanations) {
      if (cyclePos >= exp.range[0] && cyclePos <= exp.range[1]) {
        found = exp;
        break;
      }
    }

    if (found) {
      badge.textContent = `當前狀態：${found.name}`;
      badge.style.background = '#10b981';
      detailText.innerHTML = `<strong>${found.name}：</strong>${found.text}`;
    } else {
      const couplingVal = Math.cos(cyclePos * 2 * Math.PI).toFixed(2);
      badge.textContent = `動態移動中 (${pos.toFixed(2)} Pitch)`;
      badge.style.background = '#06b6d4';
      detailText.innerHTML = `讀取頭連續位移中，主尺與副尺交疊磁通即時變化，回路 A 結合度為 <strong>${couplingVal}</strong>，回路 B 結合度為 <strong>${Math.sin(cyclePos * 2 * Math.PI).toFixed(2)}</strong>。`;
    }
  }

  // Draw serpentine coil pattern
  function drawSerpentine(ctx, xOffset, yBase, width, height, pitchPx, strokeStyle, lineWidth, label, hasCurrent) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'square';

    ctx.beginPath();
    const halfP = pitchPx / 2;
    const startX = -pitchPx * 2;
    const endX = width + pitchPx * 2;

    let up = true;
    for (let x = startX + xOffset; x < endX; x += halfP) {
      const yTop = yBase;
      const yBottom = yBase + height;
      if (up) {
        ctx.lineTo(x, yTop);
        ctx.lineTo(x + halfP, yTop);
        ctx.lineTo(x + halfP, yBottom);
      } else {
        ctx.lineTo(x, yBottom);
        ctx.lineTo(x + halfP, yBottom);
        ctx.lineTo(x + halfP, yTop);
      }
      up = !up;
    }
    ctx.stroke();

    // Label
    ctx.fillStyle = strokeStyle;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(label, 15, yBase + height / 2 + 4);

    ctx.restore();
  }

  function drawCoilsCanvas() {
    const w = canvasCoils.width;
    const h = canvasCoils.height;
    ctxCoils.clearRect(0, 0, w, h);

    // Background grid
    ctxCoils.strokeStyle = '#1e293b';
    ctxCoils.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctxCoils.beginPath();
      ctxCoils.moveTo(x, 0);
      ctxCoils.lineTo(x, h);
      ctxCoils.stroke();
    }

    const pitchPx = 70; // 1 pitch = 70px
    const shiftPx = currentPos * pitchPx;

    // 1. Draw Fixed Main Scale (Bottom Serpentine, Gold/Yellow)
    drawSerpentine(ctxCoils, 0, 125, w, 55, pitchPx, '#f59e0b', 5, '主尺傳導線圈 (固定 Scale)', false);

    // 2. Draw Moving Read Head - Circuit A (Top Serpentine, Emerald Green)
    drawSerpentine(ctxCoils, shiftPx, 35, w, 50, pitchPx, '#10b981', 4, '讀取頭 回路 A (SIN)', true);

    // 3. Draw Moving Read Head - Circuit B (Offset by 1/4 pitch, Cyan)
    const quarterPitchPx = pitchPx / 4;
    drawSerpentine(ctxCoils, shiftPx + quarterPitchPx, 85, w, 35, pitchPx, 'rgba(6, 182, 212, 0.7)', 3, '讀取頭 回路 B (COS, 相差 1/4 Pitch)', true);

    // Magnetic Coupling indicator lines between coils
    ctxCoils.save();
    const cyclePos = currentPos % 1.0;
    const couplingA = Math.cos(cyclePos * 2 * Math.PI);
    
    // Draw vertical coupling arrows at central pitch
    const centerRefX = 240 + (currentPos % 1.0) * pitchPx;
    if (Math.abs(couplingA) > 0.05) {
      ctxCoils.strokeStyle = couplingA > 0 ? '#10b981' : '#ef4444';
      ctxCoils.lineWidth = 2;
      ctxCoils.setLineDash([4, 4]);
      ctxCoils.beginPath();
      ctxCoils.moveTo(centerRefX, 85);
      ctxCoils.lineTo(centerRefX, 125);
      ctxCoils.stroke();

      ctxCoils.fillStyle = couplingA > 0 ? '#10b981' : '#ef4444';
      ctxCoils.font = '11px sans-serif';
      ctxCoils.fillText(`磁通結合: ${(couplingA * 100).toFixed(0)}%`, centerRefX - 35, 110);
    }
    ctxCoils.restore();
  }

  function drawWaveCanvas() {
    const w = canvasWave.width;
    const h = canvasWave.height;
    ctxWave.clearRect(0, 0, w, h);

    const midY = h / 2;
    const amp = 65;

    // Axis and zero baseline
    ctxWave.strokeStyle = '#475569';
    ctxWave.lineWidth = 1;
    ctxWave.beginPath();
    ctxWave.moveTo(40, midY);
    ctxWave.lineTo(w - 20, midY);
    ctxWave.stroke();

    ctxWave.beginPath();
    ctxWave.moveTo(40, 20);
    ctxWave.lineTo(40, h - 20);
    ctxWave.stroke();

    // Labels for Y axis
    ctxWave.fillStyle = '#94a3b8';
    ctxWave.font = '11px monospace';
    ctxWave.fillText('+1.0', 10, midY - amp + 4);
    ctxWave.fillText(' 0.0', 10, midY + 4);
    ctxWave.fillText('-1.0', 10, midY + amp + 4);

    // Draw reference vertical grid for A, B, C, D, E (1 pitch = 160px on graph)
    const graphPitchPx = 180;
    const keyPoints = [
      { p: 0, name: 'A' },
      { p: 0.25, name: 'B' },
      { p: 0.5, name: 'C' },
      { p: 0.75, name: 'D' },
      { p: 1.0, name: 'E' },
      { p: 1.25, name: 'B\'' },
      { p: 1.5, name: 'C\'' },
      { p: 1.75, name: 'D\'' },
      { p: 2.0, name: 'E\'' }
    ];

    ctxWave.strokeStyle = '#334155';
    ctxWave.setLineDash([2, 4]);
    keyPoints.forEach(kp => {
      const gx = 50 + kp.p * graphPitchPx;
      if (gx <= w - 10) {
        ctxWave.beginPath();
        ctxWave.moveTo(gx, 25);
        ctxWave.lineTo(gx, h - 25);
        ctxWave.stroke();

        ctxWave.fillStyle = '#94a3b8';
        ctxWave.fillText(kp.name, gx - 4, h - 10);
      }
    });
    ctxWave.setLineDash([]);

    // 1. Plot Circuit A Waveform (Cosine: +1 at 0, 0 at 0.25, -1 at 0.5...)
    ctxWave.strokeStyle = '#10b981';
    ctxWave.lineWidth = 2.5;
    ctxWave.beginPath();
    for (let x = 0; x <= (w - 70); x++) {
      const p = x / graphPitchPx;
      const val = Math.cos(p * 2 * Math.PI);
      const gy = midY - val * amp;
      if (x === 0) ctxWave.moveTo(50 + x, gy);
      else ctxWave.lineTo(50 + x, gy);
    }
    ctxWave.stroke();

    // 2. Plot Circuit B Waveform (Sine: offset by 1/4 pitch = 90 deg)
    ctxWave.strokeStyle = '#06b6d4';
    ctxWave.lineWidth = 2;
    ctxWave.setLineDash([4, 2]);
    ctxWave.beginPath();
    for (let x = 0; x <= (w - 70); x++) {
      const p = x / graphPitchPx;
      const val = Math.sin(p * 2 * Math.PI);
      const gy = midY - val * amp;
      if (x === 0) ctxWave.moveTo(50 + x, gy);
      else ctxWave.lineTo(50 + x, gy);
    }
    ctxWave.stroke();
    ctxWave.setLineDash([]);

    // 3. Current Position Indicator Dot & Line
    const curX = 50 + currentPos * graphPitchPx;
    if (curX <= w - 20) {
      // Vertical cursor
      ctxWave.strokeStyle = '#f8fafc';
      ctxWave.lineWidth = 1.5;
      ctxWave.setLineDash([3, 3]);
      ctxWave.beginPath();
      ctxWave.moveTo(curX, 20);
      ctxWave.lineTo(curX, h - 25);
      ctxWave.stroke();
      ctxWave.setLineDash([]);

      // Dot for Circuit A
      const valA = Math.cos(currentPos * 2 * Math.PI);
      const dotAy = midY - valA * amp;
      ctxWave.fillStyle = '#10b981';
      ctxWave.beginPath();
      ctxWave.arc(curX, dotAy, 6, 0, Math.PI * 2);
      ctxWave.fill();
      ctxWave.strokeStyle = '#ffffff';
      ctxWave.lineWidth = 2;
      ctxWave.stroke();

      // Dot for Circuit B
      const valB = Math.sin(currentPos * 2 * Math.PI);
      const dotBy = midY - valB * amp;
      ctxWave.fillStyle = '#06b6d4';
      ctxWave.beginPath();
      ctxWave.arc(curX, dotBy, 5, 0, Math.PI * 2);
      ctxWave.fill();
    }

    // Legend
    ctxWave.font = '11px sans-serif';
    ctxWave.fillStyle = '#10b981';
    ctxWave.fillText('— 回路 A (電磁結合度)', 60, 20);
    ctxWave.fillStyle = '#06b6d4';
    ctxWave.fillText('-- 回路 B (相差 90° 正交訊號)', 220, 20);
  }

  function renderAll() {
    drawCoilsCanvas();
    drawWaveCanvas();
    updateExplanation(currentPos);
  }

  // Slider event
  slider.addEventListener('input', (e) => {
    currentPos = parseFloat(e.target.value);
    labelPos.textContent = `${currentPos.toFixed(2)} Pitch`;
    renderAll();
  });

  // Preset buttons
  document.querySelectorAll('#section-inductive .btn-group button').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPos = parseFloat(btn.dataset.pos);
      slider.value = targetPos;
      currentPos = targetPos;
      labelPos.textContent = `${currentPos.toFixed(2)} Pitch`;
      renderAll();
    });
  });

  // Initial draw
  renderAll();
})();
