/**
 * magnetic.js - 磁性尺 (Magnetic Scale) 互動模擬模組
 * 對應教材 Page 23：
 * - 主尺 (M) 永久磁性 N-S 磁極
 * - 讀取頭 (F) U 型軛、激勵線圈 (Is) 與接收感應線圈 (S1, S2)
 * - 對正 N-S 兩極時磁通最大、接收線圈輸出「2 倍頻 (2f)」訊號
 * - 對稱中點時磁通為零、無訊號輸出
 */

(function () {
  const slider = document.getElementById('slider-mag-pos');
  const labelPos = document.getElementById('label-mag-pos');
  const btnAligned = document.getElementById('btn-mag-aligned');
  const btnSymm = document.getElementById('btn-mag-symm');

  const canvasStruct = document.getElementById('canvas-mag-structure');
  const canvasWave = document.getElementById('canvas-mag-wave');

  const dispFlux = document.getElementById('disp-mag-flux');
  const dispOut = document.getElementById('disp-mag-out');

  if (!slider || !canvasStruct || !canvasWave) return;

  const ctxStruct = canvasStruct.getContext('2d');
  const ctxWave = canvasWave.getContext('2d');

  let currentPos = 0.5; // in magnetic pole pitch units (0 to 2.0)
  let animTime = 0;
  let isRunning = true;

  function getFluxAndAmp(pos) {
    // When pos is 0.5, 1.5 etc: directly aligned with N and S poles -> max flux (+1.0)
    // When pos is 0.0, 1.0, 2.0 etc: symmetric neutral point -> flux is 0.0
    const flux = Math.sin(pos * Math.PI);
    return {
      flux: Math.abs(flux),
      signedFlux: flux
    };
  }

  function drawStructure() {
    const w = canvasStruct.width;
    const h = canvasStruct.height;
    ctxStruct.clearRect(0, 0, w, h);

    const poleWidth = 60; // 1 pole (N or S) = 60px
    const mainScaleY = 30;
    const mainScaleH = 40;

    // 1. Draw Main Magnetic Scale (M) at the top
    ctxStruct.save();
    ctxStruct.fillStyle = '#334155';
    ctxStruct.fillRect(10, mainScaleY - 15, w - 20, 15);
    ctxStruct.fillStyle = '#cbd5e1';
    ctxStruct.font = 'bold 12px sans-serif';
    ctxStruct.fillText('磁性主尺基座 (M: 永久交錯磁化尺規)', 20, mainScaleY - 4);

    const numPoles = Math.ceil(w / poleWidth) + 1;
    for (let i = 0; i < numPoles; i++) {
      const px = 15 + i * poleWidth;
      const isN = i % 2 === 0;

      // Pole color
      ctxStruct.fillStyle = isN ? '#ef4444' : '#3b82f6';
      ctxStruct.fillRect(px, mainScaleY, poleWidth - 2, mainScaleH);

      // Pole text
      ctxStruct.fillStyle = '#ffffff';
      ctxStruct.font = 'bold 16px sans-serif';
      ctxStruct.textAlign = 'center';
      ctxStruct.fillText(isN ? 'N' : 'S', px + poleWidth / 2, mainScaleY + 26);
    }
    ctxStruct.restore();

    // 2. Draw Moving U-shaped Yoke Reader Head (F)
    const yokeWidth = poleWidth; // span between arms matches pole pitch
    const headX = 120 + currentPos * poleWidth * 2;
    const headY = mainScaleY + mainScaleH + 25;
    const yokeHeight = 110;

    ctxStruct.save();
    // U-shaped iron core
    ctxStruct.fillStyle = '#64748b';
    ctxStruct.strokeStyle = '#94a3b8';
    ctxStruct.lineWidth = 2;

    ctxStruct.beginPath();
    // Left arm
    ctxStruct.moveTo(headX - yokeWidth / 2 - 16, headY);
    ctxStruct.lineTo(headX - yokeWidth / 2 + 16, headY);
    ctxStruct.lineTo(headX - yokeWidth / 2 + 16, headY + yokeHeight - 25);
    // Bottom bridge
    ctxStruct.lineTo(headX + yokeWidth / 2 - 16, headY + yokeHeight - 25);
    // Right arm
    ctxStruct.lineTo(headX + yokeWidth / 2 - 16, headY);
    ctxStruct.lineTo(headX + yokeWidth / 2 + 16, headY);
    ctxStruct.lineTo(headX + yokeWidth / 2 + 16, headY + yokeHeight);
    ctxStruct.lineTo(headX - yokeWidth / 2 - 16, headY + yokeHeight);
    ctxStruct.closePath();
    ctxStruct.fill();
    ctxStruct.stroke();

    // Excitation Coils (通交流電 Is) on both arms
    ctxStruct.fillStyle = '#f59e0b';
    // Left coil
    for (let c = 0; c < 4; c++) {
      ctxStruct.fillRect(headX - yokeWidth / 2 - 20, headY + 30 + c * 10, 40, 6);
    }
    // Right coil
    for (let c = 0; c < 4; c++) {
      ctxStruct.fillRect(headX + yokeWidth / 2 - 20, headY + 30 + c * 10, 40, 6);
    }

    // Pickup coil (接收線圈 S1, S2) at bottom center
    ctxStruct.fillStyle = '#10b981';
    for (let c = 0; c < 5; c++) {
      ctxStruct.fillRect(headX - 25 + c * 10, headY + yokeHeight - 30, 8, 35);
    }

    // Labels on yoke
    ctxStruct.fillStyle = '#f8fafc';
    ctxStruct.font = 'bold 11px sans-serif';
    ctxStruct.textAlign = 'center';
    ctxStruct.fillText('激勵線圈 (Is)', headX - yokeWidth / 2, headY + 80);
    ctxStruct.fillText('激勵線圈 (Is)', headX + yokeWidth / 2, headY + 80);
    ctxStruct.fillText('接收線圈 (S1, S2)', headX, headY + yokeHeight + 15);

    // Dynamic Magnetic Field Lines inside Yoke
    const { flux } = getFluxAndAmp(currentPos);
    if (flux > 0.08) {
      ctxStruct.strokeStyle = 'rgba(56, 189, 248, ' + (flux * 0.9).toFixed(2) + ')';
      ctxStruct.lineWidth = 3;
      ctxStruct.setLineDash([4, 4]);

      ctxStruct.beginPath();
      // Flow from left pole -> arm -> bottom -> right arm -> right pole
      ctxStruct.moveTo(headX - yokeWidth / 2, headY);
      ctxStruct.lineTo(headX - yokeWidth / 2, headY + yokeHeight - 12);
      ctxStruct.lineTo(headX + yokeWidth / 2, headY + yokeHeight - 12);
      ctxStruct.lineTo(headX + yokeWidth / 2, headY);
      ctxStruct.stroke();
      ctxStruct.setLineDash([]);
    }

    ctxStruct.restore();
  }

  function drawWaveforms() {
    const w = canvasWave.width;
    const h = canvasWave.height;
    ctxWave.clearRect(0, 0, w, h);

    const { flux } = getFluxAndAmp(currentPos);
    const midY1 = 65; // Excitation wave center
    const midY2 = 180; // Pickup wave center
    const amp1 = 35;
    const amp2 = 45 * flux;

    // Grid lines
    ctxWave.strokeStyle = '#334155';
    ctxWave.lineWidth = 1;
    ctxWave.setLineDash([2, 4]);
    ctxWave.beginPath();
    ctxWave.moveTo(20, midY1);
    ctxWave.lineTo(w - 20, midY1);
    ctxWave.moveTo(20, midY2);
    ctxWave.lineTo(w - 20, midY2);
    ctxWave.stroke();
    ctxWave.setLineDash([]);

    // 1. Excitation Current Waveform (Freq f = 10 kHz)
    ctxWave.strokeStyle = '#f59e0b';
    ctxWave.lineWidth = 2;
    ctxWave.beginPath();
    const f1 = 0.04;
    for (let x = 30; x < w - 30; x++) {
      const y = midY1 - Math.sin((x + animTime * 2) * f1) * amp1;
      if (x === 30) ctxWave.moveTo(x, y);
      else ctxWave.lineTo(x, y);
    }
    ctxWave.stroke();

    ctxWave.fillStyle = '#f59e0b';
    ctxWave.font = 'bold 11px sans-serif';
    ctxWave.fillText('激勵電流 Is (頻率 f = 10 kHz, 基準變動磁場)', 35, 25);

    // 2. Induced Output Waveform (Freq 2f = 20 kHz, amplitude proportional to flux)
    ctxWave.strokeStyle = flux > 0.05 ? '#10b981' : '#64748b';
    ctxWave.lineWidth = 2.5;
    ctxWave.beginPath();
    const f2 = f1 * 2; // Twice frequency!
    for (let x = 30; x < w - 30; x++) {
      const y = midY2 - Math.sin((x + animTime * 4) * f2) * amp2;
      if (x === 30) ctxWave.moveTo(x, y);
      else ctxWave.lineTo(x, y);
    }
    ctxWave.stroke();

    ctxWave.fillStyle = flux > 0.05 ? '#10b981' : '#94a3b8';
    ctxWave.font = 'bold 11px sans-serif';
    const statusText = flux > 0.85
      ? '接收線圈感應訊號 (2倍頻 2f = 20 kHz, 振幅最大！)'
      : flux < 0.15
      ? '接收線圈感應訊號 (處於對稱點，磁通抵消為零，無輸出)'
      : `接收線圈感應訊號 (2倍頻 2f = 20 kHz, 振幅 ${(flux * 100).toFixed(0)}%)`;
    ctxWave.fillText(statusText, 35, 135);
  }

  function updateReadouts() {
    const { flux } = getFluxAndAmp(currentPos);
    dispFlux.textContent = `${flux.toFixed(2)} (${(flux * 100).toFixed(0)}%)`;

    if (flux > 0.85) {
      labelPos.textContent = '正對 N-S 極 (磁通最大)';
      dispOut.textContent = '20 kHz (2倍頻, 100% Max)';
      dispOut.style.color = '#10b981';
    } else if (flux < 0.15) {
      labelPos.textContent = '對稱中心點 (磁通相抵為零)';
      dispOut.textContent = '0 V (無輸出)';
      dispOut.style.color = '#ef4444';
    } else {
      labelPos.textContent = `位移中 (磁通 ${(flux * 100).toFixed(0)}%)`;
      dispOut.textContent = `20 kHz (振幅 ${(flux * 100).toFixed(0)}%)`;
      dispOut.style.color = '#06b6d4';
    }
  }

  function loop() {
    if (isRunning) {
      animTime += 1;
      drawStructure();
      drawWaveforms();
    }
    requestAnimationFrame(loop);
  }

  slider.addEventListener('input', (e) => {
    currentPos = parseFloat(e.target.value);
    updateReadouts();
    drawStructure();
    drawWaveforms();
  });

  btnAligned.addEventListener('click', () => {
    slider.value = 0.5;
    currentPos = 0.5;
    updateReadouts();
    drawStructure();
    drawWaveforms();
  });

  btnSymm.addEventListener('click', () => {
    slider.value = 1.0;
    currentPos = 1.0;
    updateReadouts();
    drawStructure();
    drawWaveforms();
  });

  updateReadouts();
  loop();
})();
