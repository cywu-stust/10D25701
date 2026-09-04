/**
 * app.js - 全局控制、導覽切換與 4 倍頻方向狀態機 (Quadrature & State Machine)
 * 對應教材 Page 28 ~ 29, 33：
 * - 弦波轉方波 (零交越比較器)
 * - 4 倍頻解析度提升 (20μm 節距 -> 5μm 計數)
 * - 狀態機順時針/逆時針方向邏輯 (11 <-> 10 <-> 00 <-> 01)
 * - 參考刻劃線 (Reference Mark) 消除累積誤差機制
 */

(function () {
  /* =========================================================================
     1. Theme Switcher & Navigation Scroll Spy
     ========================================================================= */
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      themeToggle.textContent = document.body.classList.contains('light-theme') ? '🌙' : '🌓';
    });
  }

  // Active navigation link on scroll
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.lab-card');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPos = window.scrollY + 120;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${currentId}`) {
        item.classList.add('active');
      }
    });
  });

  /* =========================================================================
     2. Section 6: Quadrature 4x Decoding & Direction State Machine
     ========================================================================= */
  const sliderCarriage = document.getElementById('slider-carriage-pos');
  const labelCarriage = document.getElementById('label-carriage-pos');
  const btnJogLeft = document.getElementById('btn-jog-left');
  const btnJogRight = document.getElementById('btn-jog-right');
  const btnPassRef = document.getElementById('btn-pass-ref');
  const btnResetCounter = document.getElementById('btn-reset-counter');

  const canvasQuad = document.getElementById('canvas-quadrature');
  const canvasSM = document.getElementById('canvas-state-machine');

  const dispAB = document.getElementById('disp-ab-state');
  const dispDirection = document.getElementById('disp-direction');
  const dispCounts = document.getElementById('disp-counts');
  const dispCalcPos = document.getElementById('disp-calc-pos');
  const refAlert = document.getElementById('ref-alert');

  if (sliderCarriage && canvasQuad && canvasSM) {
    const ctxQ = canvasQuad.getContext('2d');
    const ctxSM = canvasSM.getContext('2d');

    const PITCH_UM = 20.0; // 20 um physical line spacing
    const SUB_STEP_UM = PITCH_UM / 4.0; // 5 um per quadrature count

    let carriagePosUm = 0.0;
    let prevPosUm = 0.0;
    let totalCounts = 0;
    let currentDir = 1; // 1 = forward, -1 = reverse
    const REF_MARK_POS_UM = 50.0; // Reference mark located at 50um
    let refMarkTriggered = false;

    // States definition:
    // Angle in cycle:
    // 0 ~ 90 deg: A=1, B=1  -> state 0 (11)
    // 90 ~ 180 deg: A=1, B=0 -> state 1 (10)
    // 180 ~ 270 deg: A=0, B=0 -> state 2 (00)
    // 270 ~ 360 deg: A=0, B=1 -> state 3 (01)
    const stateSequence = [
      { a: 1, b: 1, code: '(1, 1)', label: '11' },
      { a: 1, b: 0, code: '(1, 0)', label: '10' },
      { a: 0, b: 0, code: '(0, 0)', label: '00' },
      { a: 0, b: 1, code: '(0, 1)', label: '01' }
    ];

    function getQuadratureState(posUm) {
      // In one 20um pitch, 4 states of 5um each
      const cyclePos = ((posUm % PITCH_UM) + PITCH_UM) % PITCH_UM;
      const stateIndex = Math.floor(cyclePos / SUB_STEP_UM) % 4;
      return {
        index: stateIndex,
        state: stateSequence[stateIndex]
      };
    }

    function updateQuadratureLogic(newPosUm) {
      const delta = newPosUm - carriagePosUm;
      if (Math.abs(delta) > 0.001) {
        currentDir = delta >= 0 ? 1 : -1;

        // Calculate count change
        const oldIndexTotal = Math.floor(carriagePosUm / SUB_STEP_UM);
        const newIndexTotal = Math.floor(newPosUm / SUB_STEP_UM);
        const countDiff = newIndexTotal - oldIndexTotal;
        totalCounts += countDiff;

        // Check reference mark crossing
        if (
          (carriagePosUm < REF_MARK_POS_UM && newPosUm >= REF_MARK_POS_UM) ||
          (carriagePosUm > REF_MARK_POS_UM && newPosUm <= REF_MARK_POS_UM)
        ) {
          triggerReferenceMark();
        }
      }

      prevPosUm = carriagePosUm;
      carriagePosUm = newPosUm;

      updateQuadUI();
      drawQuadratureWave();
      drawStateMachine();
    }

    function triggerReferenceMark() {
      // Synchronize / calibrate count to exact reference distance
      totalCounts = Math.round(REF_MARK_POS_UM / SUB_STEP_UM);
      refAlert.style.display = 'block';
      setTimeout(() => {
        refAlert.style.display = 'none';
      }, 3500);
    }

    function updateQuadUI() {
      labelCarriage.textContent = `${carriagePosUm.toFixed(1)} μm`;
      const { state } = getQuadratureState(carriagePosUm);

      dispAB.textContent = state.code;
      dispDirection.textContent = currentDir >= 0 ? '正向 (+ / Forward)' : '反向 (- / Reverse)';
      dispDirection.style.color = currentDir >= 0 ? '#10b981' : '#f59e0b';

      dispCounts.textContent = `${totalCounts} 脈波 (Pulses)`;
      const decodedPos = totalCounts * SUB_STEP_UM;
      dispCalcPos.textContent = `${decodedPos.toFixed(1)} μm`;
    }

    function drawQuadratureWave() {
      const w = canvasQuad.width;
      const h = canvasQuad.height;
      ctxQ.clearRect(0, 0, w, h);

      const startX = 45;
      const totalCycles = 5;
      const cyclePx = 78; // 5 * 78 = 390px, spans from 45 to 435px
      const totalLengthPx = totalCycles * cyclePx;
      const subPx = cyclePx / 4; // 19.5px per 5um state

      const trackAY = 55;
      const trackBY = 140;
      const waveAmp = 22;

      // 1. Draw Background Grid & Pitch / State Markers
      for (let s = 0; s <= totalCycles * 4; s++) {
        const x = startX + s * subPx;
        const isCycleBorder = s % 4 === 0;

        ctxQ.beginPath();
        ctxQ.strokeStyle = isCycleBorder ? '#475569' : '#1e293b';
        ctxQ.lineWidth = isCycleBorder ? 1.5 : 1;
        ctxQ.setLineDash(isCycleBorder ? [] : [2, 3]);
        ctxQ.moveTo(x, 22);
        ctxQ.lineTo(x, h - 35);
        ctxQ.stroke();

        // Label distance in um at cycle borders
        if (isCycleBorder) {
          ctxQ.fillStyle = '#94a3b8';
          ctxQ.font = '10px monospace';
          ctxQ.textAlign = 'center';
          ctxQ.fillText(`${(s / 4) * 20}μm`, x, h - 22);
        }
      }
      ctxQ.setLineDash([]);

      // 2. Reference Mark line at 50 um (Cycle 3 center)
      const refX = startX + (REF_MARK_POS_UM / 20.0) * cyclePx;
      ctxQ.save();
      ctxQ.strokeStyle = '#f59e0b';
      ctxQ.lineWidth = 2;
      ctxQ.setLineDash([3, 3]);
      ctxQ.beginPath();
      ctxQ.moveTo(refX, 20);
      ctxQ.lineTo(refX, h - 35);
      ctxQ.stroke();
      ctxQ.fillStyle = '#f59e0b';
      ctxQ.font = 'bold 10px sans-serif';
      ctxQ.textAlign = 'center';
      ctxQ.fillText('📍參考標記 (50μm)', refX, h - 8);
      ctxQ.restore();

      // 3. Draw Square Wave A across all 5 cycles
      ctxQ.strokeStyle = '#38bdf8';
      ctxQ.lineWidth = 2.5;
      ctxQ.beginPath();
      for (let c = 0; c < totalCycles; c++) {
        const cx = startX + c * cyclePx;
        const x1 = cx;
        const x2 = cx + subPx * 2;
        const x3 = cx + cyclePx;
        const yHigh = trackAY - waveAmp;
        const yLow = trackAY + waveAmp;

        if (c === 0) ctxQ.moveTo(x1, yHigh);
        else ctxQ.lineTo(x1, yHigh);

        ctxQ.lineTo(x2, yHigh);
        ctxQ.lineTo(x2, yLow);
        ctxQ.lineTo(x3, yLow);
        if (c < totalCycles - 1) {
          ctxQ.lineTo(x3, yHigh);
        }
      }
      ctxQ.stroke();

      ctxQ.fillStyle = '#38bdf8';
      ctxQ.font = 'bold 11px sans-serif';
      ctxQ.textAlign = 'left';
      ctxQ.fillText('方波 A (Ch A)', 6, trackAY - waveAmp - 4);

      // 4. Draw Square Wave B across all 5 cycles (shifted by 90 deg = 1 subPx)
      ctxQ.strokeStyle = '#f59e0b';
      ctxQ.lineWidth = 2.5;
      ctxQ.beginPath();
      for (let c = 0; c < totalCycles; c++) {
        const cx = startX + c * cyclePx;
        const x1 = cx;
        const x2 = cx + subPx;
        const x3 = cx + subPx * 3;
        const x4 = cx + cyclePx;
        const yHigh = trackBY - waveAmp;
        const yLow = trackBY + waveAmp;

        if (c === 0) ctxQ.moveTo(x1, yHigh);
        else ctxQ.lineTo(x1, yHigh);

        ctxQ.lineTo(x2, yHigh);
        ctxQ.lineTo(x2, yLow);
        ctxQ.lineTo(x3, yLow);
        ctxQ.lineTo(x3, yHigh);
        ctxQ.lineTo(x4, yHigh);
      }
      ctxQ.stroke();

      ctxQ.fillStyle = '#f59e0b';
      ctxQ.font = 'bold 11px sans-serif';
      ctxQ.textAlign = 'left';
      ctxQ.fillText('方波 B (Ch B)', 6, trackBY - waveAmp - 4);

      // 5. Unrestricted Scanner Indicator across the FULL 0~100um range
      const scannerX = startX + (carriagePosUm / 100.0) * totalLengthPx;

      ctxQ.save();
      ctxQ.strokeStyle = '#10b981';
      ctxQ.lineWidth = 2.5;
      ctxQ.shadowColor = '#10b981';
      ctxQ.shadowBlur = 10;
      ctxQ.beginPath();
      ctxQ.moveTo(scannerX, 15);
      ctxQ.lineTo(scannerX, h - 35);
      ctxQ.stroke();
      ctxQ.shadowBlur = 0;

      // Indicator Arrow / Pointer
      ctxQ.fillStyle = '#10b981';
      ctxQ.beginPath();
      ctxQ.moveTo(scannerX - 6, 12);
      ctxQ.lineTo(scannerX + 6, 12);
      ctxQ.lineTo(scannerX, 22);
      ctxQ.closePath();
      ctxQ.fill();

      // State label on scanner
      const { state } = getQuadratureState(carriagePosUm);
      ctxQ.fillStyle = '#10b981';
      ctxQ.font = 'bold 11px monospace';
      const labelText = `狀態: ${state.label} (${carriagePosUm.toFixed(1)}μm)`;
      let textX = scannerX;
      if (scannerX < startX + 50) {
        textX = startX + 50;
      } else if (scannerX > startX + totalLengthPx - 50) {
        textX = startX + totalLengthPx - 50;
      }
      ctxQ.textAlign = 'center';
      ctxQ.fillText(labelText, textX, 10);
      ctxQ.restore();
    }

    function drawStateMachine() {
      const w = canvasSM.width;
      const h = canvasSM.height;
      ctxSM.clearRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2 - 10;
      const radius = 68;

      // 4 Node positions arranged in circle (like Page 33 Fig 2.13)
      // Top: 11, Right: 10, Bottom: 00, Left: 01
      const nodes = [
        { label: '11', x: centerX, y: centerY - radius },
        { label: '10', x: centerX + radius + 15, y: centerY },
        { label: '00', x: centerX, y: centerY + radius },
        { label: '01', x: centerX - radius - 15, y: centerY }
      ];

      const { index } = getQuadratureState(carriagePosUm);

      // Draw Circular Flow Arrows
      ctxSM.strokeStyle = currentDir >= 0 ? '#10b981' : '#f59e0b';
      ctxSM.lineWidth = 2;
      ctxSM.setLineDash([4, 4]);
      ctxSM.beginPath();
      ctxSM.arc(centerX, centerY, radius - 15, 0, Math.PI * 2);
      ctxSM.stroke();
      ctxSM.setLineDash([]);

      // Flow direction arrow text in center
      ctxSM.fillStyle = currentDir >= 0 ? '#10b981' : '#f59e0b';
      ctxSM.font = 'bold 12px sans-serif';
      ctxSM.textAlign = 'center';
      ctxSM.fillText(currentDir >= 0 ? '正向: 順時針轉移 ↻' : '反向: 逆時針轉移 ↺', centerX, centerY - 4);
      ctxSM.font = '10px sans-serif';
      ctxSM.fillStyle = '#94a3b8';
      ctxSM.fillText(currentDir >= 0 ? '11 → 10 → 00 → 01' : '11 → 01 → 00 → 10', centerX, centerY + 14);

      // Draw Node Boxes
      nodes.forEach((node, nIdx) => {
        const isActive = nIdx === index;
        const boxW = 54;
        const boxH = 34;

        ctxSM.save();
        if (isActive) {
          ctxSM.fillStyle = '#0284c7';
          ctxSM.strokeStyle = '#38bdf8';
          ctxSM.lineWidth = 2.5;
          ctxSM.shadowColor = '#38bdf8';
          ctxSM.shadowBlur = 12;
        } else {
          ctxSM.fillStyle = '#1e293b';
          ctxSM.strokeStyle = '#475569';
          ctxSM.lineWidth = 1.5;
        }

        ctxSM.beginPath();
        if (typeof ctxSM.roundRect === 'function') {
          ctxSM.roundRect(node.x - boxW / 2, node.y - boxH / 2, boxW, boxH, 6);
        } else {
          ctxSM.rect(node.x - boxW / 2, node.y - boxH / 2, boxW, boxH);
        }
        ctxSM.fill();
        ctxSM.stroke();

        ctxSM.fillStyle = isActive ? '#ffffff' : '#94a3b8';
        ctxSM.font = 'bold 15px monospace';
        ctxSM.fillText(node.label, node.x, node.y + 5);
        ctxSM.restore();
      });

      // Bottom Legend
      ctxSM.fillStyle = '#cbd5e1';
      ctxSM.font = '11px sans-serif';
      ctxSM.textAlign = 'center';
      ctxSM.fillText('4 倍頻方向狀態轉移邏輯 (Page 33 圖 2.13)', centerX, h - 10);
    }

    // Event listeners
    sliderCarriage.addEventListener('input', (e) => {
      updateQuadratureLogic(parseFloat(e.target.value));
    });

    btnJogLeft.addEventListener('click', () => {
      const target = Math.max(0, carriagePosUm - 2.5);
      sliderCarriage.value = target;
      updateQuadratureLogic(target);
    });

    btnJogRight.addEventListener('click', () => {
      const target = Math.min(100, carriagePosUm + 2.5);
      sliderCarriage.value = target;
      updateQuadratureLogic(target);
    });

    btnPassRef.addEventListener('click', () => {
      sliderCarriage.value = REF_MARK_POS_UM;
      updateQuadratureLogic(REF_MARK_POS_UM);
    });

    btnResetCounter.addEventListener('click', () => {
      totalCounts = 0;
      updateQuadUI();
    });

    // Initial render
    updateQuadratureLogic(parseFloat(sliderCarriage.value) || 0);
  }
})();
