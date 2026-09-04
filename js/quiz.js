/**
 * quiz.js - 隨堂評量與觀念自我檢測模組
 * 對應教材 Page 19 ~ 33 核心考點：
 * - 直接 vs 間接量測與背隙成因
 * - 電感尺 1/4 間距雙迴路
 * - 磁性尺 2 倍頻感應
 * - 四組光感測器差動抗直流飄移
 * - 莫爾條紋幾何放大原理與容差
 * - 4倍頻、方向判別與利薩爾圓調校
 */

(function () {
  const quizContainer = document.getElementById('quiz-container');
  const btnSubmit = document.getElementById('btn-submit-quiz');
  const btnRetry = document.getElementById('btn-retry-quiz');
  const scoreBox = document.getElementById('quiz-score-box');

  if (!quizContainer || !btnSubmit) return;

  const questions = [
    {
      id: 1,
      page: 'Page 19',
      question: '關於直接量測（如光學尺）與間接量測（如馬達旋轉編碼器配合導螺桿）的比較，下列敘述何者正確？',
      options: [
        '間接量測之精度遠高於直接量測，且完全沒有任何反向延遲問題',
        '直接量測將尺規直接安裝於移動軸工作台上，沒有滾珠導螺桿與螺帽之背隙 (Backlash error) 誤差，精度較高',
        '電感尺與磁性尺因採用光學原理，耐油污與耐粉塵能力較光學尺差',
        '旋轉編碼器量測馬達轉角屬於直接量測模組'
      ],
      answer: 1,
      explanation: '【教材 Page 19】直接量測將尺規安裝於移動軸上，直接讀取實際位移，沒有背隙問題，精度較高。間接量測會因導螺桿與螺帽間隙產生背隙誤差 (Backlash error)。電感尺與磁性尺抗油污粉塵能力強，適於惡劣環境。'
    },
    {
      id: 2,
      page: 'Page 20 ~ 22',
      question: '電感式感應尺 (Inductive Scale) 在讀取頭上為何要設計兩組偏離 1/4 間距（90度相位差）的線圈迴路？',
      options: [
        '為了輸出同相位的兩倍電流以驅動後級伺服馬達',
        '分別感應出正弦 (SIN) 與餘弦 (COS) 訊號，可消除上下氣隙 (Air Gap) 波動對振幅的干擾，確保高精度檢測',
        '一組線圈負責量測位移，另一組線圈提供光源照明電力',
        '為了在移動時產生光學莫爾條紋以放大訊號'
      ],
      answer: 1,
      explanation: '【教材 Page 20, 22】在讀取頭上設計兩組偏離 1/4 間距的回路，針對位置進行 SIN 和 COS 的電磁結合。藉由採用此兩組回路，可藉由反正切解算相位，達成不受間隙等變化影響的高精度位置檢測。'
    },
    {
      id: 3,
      page: 'Page 23',
      question: '磁性尺 (Magnetic Scale) 運作時，當 U 型讀取頭兩臂「正對 N、S 兩極」時，接收線圈感應出的訊號特徵為何？',
      options: [
        '此時磁通量抵消為零，接收線圈完全沒有輸出訊號',
        '輸出穩定的直流定電壓，電壓大小與激勵頻率無關',
        '磁通量達到最大，鐵心處於預磁化狀態，接收線圈感應訊號頻率為激勵電流的兩倍 (2倍頻, 2f)，振幅最大',
        '輸出訊號頻率會降為激勵電流頻率的 1/2'
      ],
      answer: 2,
      explanation: '【教材 Page 23】當 U 型軛兩臂正對 N、S 兩極時，磁通量最大，接收線圈感應出的訊號頻率會是激勵電流的兩倍 (2倍頻)。當處於 N、S 對稱點時，磁通量為零，接收線圈無輸出訊號。'
    },
    {
      id: 4,
      page: 'Page 26 ~ 27',
      question: '光學尺量測電路中，採用四組光感測器 (sinθ, cosθ, -sinθ, -cosθ) 進行差動運算 (Va=V1-V3, Vb=V2-V4) 的核心優點是什麼？',
      options: [
        '可有效消除因光源不穩定造成的直流飄移 (DC drift)，同時將訊號振幅放大一倍增加靈敏度',
        '能大幅降低光學尺的製造工藝要求並減少讀取頭體積',
        '讓光學尺不需要主光柵刻劃線即可直接解算位移',
        '完全消除滾珠導螺桿在高速運轉時的熱伸長誤差'
      ],
      answer: 0,
      explanation: '【教材 Page 27】光源不穩會產生直流飄移 V\'。四組感測器訊號為 V1=V\'+sinθ, V3=V\'-sinθ，差動 Va=V1-V3=(V\'+sinθ)-(V\'-sinθ)=2sinθ，直流飄移 V\' 被自然消除，且振幅放大一倍增加靈敏度。'
    },
    {
      id: 5,
      page: 'Page 30 ~ 31',
      question: '若光柵柵距 w = 20 μm，光感測器安裝定位誤差為 ±1 μm。平行安裝時會產生 ±5% 的致命誤差，為何改以夾角 θ 斜交產生「莫爾條紋 (Moiré effect)」即可解決此問題？',
      options: [
        '莫爾條紋會使入射光波長縮小數十倍，提高光速',
        '斜交產生週期遠大於柵距的莫爾條紋 (如 θ=1° 時放大 57.3 倍達 1.146 mm)，感測器對準放大條紋感測，大幅放寬安裝容差，誤差降至 0.1% 以下',
        '斜交安裝可以自動補償導螺桿的背隙與磨損',
        '斜交安裝能使增量式光學尺直接升級為絕對式光學尺'
      ],
      answer: 1,
      explanation: '【教材 Page 30】主尺與副尺以微小角度 θ 斜交安裝產生莫爾條紋，週期 l ≈ w/θ。若 w=20μm、θ=1°，則 l=1.146 mm。感測器是對著放大後的莫爾條紋感測，安裝定位容許誤差大幅增加，累積誤差可降到 0.1% 以下。'
    },
    {
      id: 6,
      page: 'Page 28, 32 ~ 33',
      question: '關於光學尺訊號處理、4 倍頻、方向判別與利薩爾圓調校，下列敘述何者「錯誤」？',
      options: [
        '將正餘弦波輸入示波器 X-Y 模式，若呈現正圓形，表示兩訊號相位差剛好為 90 度，感測器位置正確',
        '若主尺線距為 20 μm，經 4 倍頻方波處理後每 5 μm 計數一次，解析度提升 4 倍',
        '僅靠脈波計數無法判斷移動方向，必須根據 4 倍頻方波的編碼順序（如 11→10→00→01 代表正向）判定方向',
        '在示波器上呈現傾斜橢圓形時，表示兩訊號完美正交且已達最高精度校準，無需做任何微調'
      ],
      answer: 3,
      explanation: '【教材 Page 32】選項 D 錯誤！示波器呈現正圓形才代表相位差剛好為 90 度（已正交）；若呈現「橢圓形」表示存在相位誤差或振幅不對稱，需要微調感測器位置直到圖形變為正圓為止！'
    }
  ];

  function renderQuiz() {
    quizContainer.innerHTML = '';
    questions.forEach((q, qIndex) => {
      const qDiv = document.createElement('div');
      qDiv.className = 'quiz-item';
      qDiv.id = `quiz-item-${q.id}`;

      const titleDiv = document.createElement('div');
      titleDiv.className = 'quiz-q-title';
      titleDiv.innerHTML = `<span class="section-num">${q.page}</span> <strong>第 ${q.id} 題：${q.question}</strong>`;
      qDiv.appendChild(titleDiv);

      const optList = document.createElement('div');
      optList.className = 'quiz-options';

      q.options.forEach((optText, optIndex) => {
        const label = document.createElement('label');
        label.className = 'quiz-opt-label';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `quiz-q-${q.id}`;
        radio.value = optIndex;

        label.appendChild(radio);
        label.appendChild(document.createTextNode(optText));
        optList.appendChild(label);
      });

      qDiv.appendChild(optList);

      const feedback = document.createElement('div');
      feedback.className = 'quiz-feedback';
      feedback.id = `feedback-${q.id}`;
      qDiv.appendChild(feedback);

      quizContainer.appendChild(qDiv);
    });
  }

  function gradeQuiz() {
    let score = 0;
    let answeredAll = true;

    questions.forEach(q => {
      const selected = document.querySelector(`input[name="quiz-q-${q.id}"]:checked`);
      const itemDiv = document.getElementById(`quiz-item-${q.id}`);
      const feedbackDiv = document.getElementById(`feedback-${q.id}`);

      feedbackDiv.style.display = 'block';

      if (!selected) {
        answeredAll = false;
        itemDiv.className = 'quiz-item answered-wrong';
        feedbackDiv.className = 'quiz-feedback feedback-wrong';
        feedbackDiv.innerHTML = `⚠️ <strong>尚未作答！</strong><br>${q.explanation}`;
      } else {
        const userChoice = parseInt(selected.value, 10);
        if (userChoice === q.answer) {
          score += 1;
          itemDiv.className = 'quiz-item answered-correct';
          feedbackDiv.className = 'quiz-feedback feedback-correct';
          feedbackDiv.innerHTML = `✅ <strong>回答正確！</strong><br>${q.explanation}`;
        } else {
          itemDiv.className = 'quiz-item answered-wrong';
          feedbackDiv.className = 'quiz-feedback feedback-wrong';
          feedbackDiv.innerHTML = `❌ <strong>回答錯誤！正確答案是：${q.options[q.answer]}</strong><br>${q.explanation}`;
        }
      }
    });

    const total = questions.length;
    const scorePct = Math.round((score / total) * 100);

    scoreBox.style.display = 'block';
    scoreBox.innerHTML = `
      <h3>測驗成績結算</h3>
      <div class="quiz-score-num">${scorePct} 分</div>
      <p style="margin-top:0.5rem; color:var(--text-secondary);">
        總共 ${total} 題，您答對了 <strong>${score}</strong> 題。
        ${scorePct === 100 ? '🎉 太棒了！您已完全融會貫通線性編碼器核心知識！' : scorePct >= 80 ? '👏 表現優異！對線性編碼器原理掌握度極高！' : '💪 建議複習上方動態模擬器與教材解析，再試一次！'}
      </p>
    `;

    btnSubmit.style.display = 'none';
    btnRetry.style.display = 'inline-flex';
  }

  function resetQuiz() {
    renderQuiz();
    scoreBox.style.display = 'none';
    btnSubmit.style.display = 'inline-flex';
    btnRetry.style.display = 'none';
  }

  btnSubmit.addEventListener('click', gradeQuiz);
  btnRetry.addEventListener('click', resetQuiz);

  // Initial render
  renderQuiz();
})();
