/**
 * moire.js - 莫爾條紋 (Moiré Effect) 幾何光學放大與安裝容差模擬模組
 * 對應教材 Page 30 ~ 31：
 * - 主光柵與副光柵微小夾角 θ 斜交安裝
 * - 條紋週期公式：l = w / [2·sin(θ/2)] ≈ w / θ
 * - 幾何放大倍率 M = l / w (約 57.3 倍)
 * - 水平微位移 Δx 驅動條紋高速垂直宏觀移動
 * - 安裝容許誤差大幅放寬 (累積誤差從 5.0% 驟降至 0.087%)
 */

(function () {
  const sliderAngle = document.getElementById('slider-moire-angle');
  const labelAngle = document.getElementById('label-moire-angle');
  const sliderPitch = document.getElementById('slider-moire-pitch');
  const labelPitch = document.getElementById('label-moire-pitch');
  const sliderShift = document.getElementById('slider-moire-shift');
  const labelShift = document.getElementById('label-moire-shift');

  const canvas = document.getElementById('canvas-moire');

  const calcL = document.getElementById('calc-fringe-l');
  const calcM = document.getElementById('calc-mag-ratio');
  const calcEquiv = document.getElementById('calc-equiv-err');
  const calcCum = document.getElementById('calc-cum-err');

  if (!canvas || !sliderAngle || !sliderPitch || !sliderShift) return;

  const ctx = canvas.getContext('2d');

  let thetaDeg = 1.0;
  let pitchUm = 20.0;
  let shiftUm = 0.0;

  function updateMath() {
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const wMm = pitchUm / 1000.0;

    if (thetaDeg <= 0.001) {
      // Parallel installation: Page 30 top
      calcL.textContent = `∞ (平行無莫爾條紋)`;
      calcM.textContent = `1.0 倍 (無放大效應)`;
      calcEquiv.textContent = `±5.000% (致命誤差)`;
      calcEquiv.style.color = '#ef4444';
      calcCum.textContent = `高達 ±1.000 mm (直接失效)`;
      calcCum.style.color = '#ef4444';
    } else {
      // l = w / [2 * sin(theta / 2)] in mm
      const lMm = wMm / (2.0 * Math.sin(thetaRad / 2.0));
      const mag = lMm / wMm;

      // Sensor mounting error of 1 um:
      // Parallel installation: 1 um / w = 1 / 20 = 5.0%
      // Moire installation: 1 um / (l * 1000)
      const errMoirePct = (1.0 / (lMm * 1000.0)) * 100.0;
      const cumError20mm = 20.0 * (errMoirePct / 100.0);

      calcL.textContent = `${lMm.toFixed(3)} mm`;
      calcM.textContent = `${mag.toFixed(1)} 倍`;
      calcEquiv.textContent = `${errMoirePct.toFixed(3)}%`;
      calcEquiv.style.color = '#10b981';
      calcCum.textContent = `僅 ±${cumError20mm.toFixed(3)} mm`;
      calcCum.style.color = '#10b981';
    }

    labelAngle.textContent = `${thetaDeg.toFixed(1)}°`;
    labelPitch.textContent = `${pitchUm.toFixed(0)} μm`;
    labelShift.textContent = `${shiftUm.toFixed(1)} μm`;
  }

  function drawMoireCanvas() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const thetaRad = (thetaDeg * Math.PI) / 180;
    const visualPitchPx = 8.0; // scale 20um to 8px on screen
    const visualShiftPx = (shiftUm / pitchUm) * visualPitchPx;

    // 1. Draw Background Grid pattern (Main Scale - Vertical Lines)
    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = visualPitchPx / 2;
    ctx.beginPath();
    for (let x = 0; x < w + visualPitchPx; x += visualPitchPx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();
    ctx.restore();

    // 2. Draw Tilted Moving Scale (Index Scale - Angle theta, Shift x)
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; // Optical overlay multiplication

    // Draw tilted grid
    ctx.translate(w / 2, h / 2);
    ctx.rotate(thetaRad);
    ctx.translate(-w / 2 + visualShiftPx, -h / 2);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = visualPitchPx / 2;
    ctx.beginPath();
    const diag = Math.sqrt(w * w + h * h);
    for (let x = -diag; x < w + diag; x += visualPitchPx) {
      ctx.moveTo(x, -diag);
      ctx.lineTo(x, h + diag);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Draw Side-by-Side Comparison Window (Like slide 31 circular apertures)
    // Dark overlay with circular inspection ports
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.rect(w - 280, 15, 260, h - 30);
    // Cut out circular lens aperture
    const circleX = w - 150;
    const circleY = h / 2;
    const circleR = 55;
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2, true);
    ctx.fill();

    // Lens rim
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.stroke();

    // Lens crosshair / sensor detector position
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(circleX - circleR, circleY);
    ctx.lineTo(circleX + circleR, circleY);
    ctx.moveTo(circleX, circleY - circleR);
    ctx.lineTo(circleX, circleY + circleR);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text inside overlay
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('光電受光元件感測視窗 (PD)', circleX, 38);
    ctx.font = '10px sans-serif';

    const wMm = pitchUm / 1000.0;
    if (thetaDeg <= 0.001) {
      ctx.fillStyle = '#f87171';
      ctx.fillText('平行安裝：無莫爾條紋 (僅微觀明暗交替)', circleX, h - 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('無宏觀放大 (1x)', circleX + circleR + 25, circleY + 4);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('感測宏觀莫爾暗紋縱向移動', circleX, h - 25);

      // Dynamic Fringe Vector Annotation
      const lMm = wMm / (2.0 * Math.sin(thetaRad / 2.0));
      const mag = lMm / wMm;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(circleX + circleR + 15, circleY - 30);
      ctx.lineTo(circleX + circleR + 15, circleY + 30);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(circleX + circleR + 10, circleY + 22);
      ctx.lineTo(circleX + circleR + 15, circleY + 32);
      ctx.lineTo(circleX + circleR + 20, circleY + 22);
      ctx.fillStyle = '#10b981';
      ctx.fill();

      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`宏觀位移 x${mag.toFixed(0)}`, circleX + circleR + 25, circleY + 4);
    }

    ctx.restore();
  }

  function render() {
    updateMath();
    drawMoireCanvas();
  }

  sliderAngle.addEventListener('input', (e) => {
    thetaDeg = parseFloat(e.target.value);
    render();
  });

  sliderPitch.addEventListener('input', (e) => {
    pitchUm = parseFloat(e.target.value);
    render();
  });

  sliderShift.addEventListener('input', (e) => {
    shiftUm = parseFloat(e.target.value);
    render();
  });

  render();
})();
