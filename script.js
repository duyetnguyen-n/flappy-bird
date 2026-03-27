const setupScreen = document.getElementById("setupScreen");
const playScreen = document.getElementById("playScreen");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const fireworksCanvas = document.getElementById("fireworksCanvas");
const fireworksCtx = fireworksCanvas.getContext("2d");
const gameFrame = document.querySelector(".game-frame");

const gameOverlay = document.getElementById("gameOverlay");
const resultOverlay = document.getElementById("resultOverlay");
const finishVideo = document.getElementById("finishVideo");
const resultFace = document.getElementById("resultFace");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const gameOverlayTitle = document.getElementById("gameOverlayTitle");
const gameOverlayBody = document.getElementById("gameOverlayBody");

const scoreValue = document.getElementById("scoreValue");
const goalValue = document.getElementById("goalValue");
const goalScoreValue = document.getElementById("goalScoreValue");
const statusText = document.getElementById("statusText");
const faceSummary = document.getElementById("faceSummary");
const videoSummary = document.getElementById("videoSummary");
const videoStatus = document.getElementById("videoStatus");
const soundStatus = document.getElementById("soundStatus");
const setupFacePreview = document.getElementById("setupFacePreview");

const goalScoreInput = document.getElementById("goalScore");
const faceUpload = document.getElementById("faceUpload");
const videoUpload = document.getElementById("videoUpload");
const soundUpload = document.getElementById("soundUpload");

const goToGameButton = document.getElementById("goToGameButton");
const backToSetupButton = document.getElementById("backToSetupButton");
const startRoundButton = document.getElementById("startRoundButton");
const flapButton = document.getElementById("flapButton");
const resultBackButton = document.getElementById("resultBackButton");
const resultActionButton = document.getElementById("resultActionButton");

const GAME_WIDTH = 420;
const GAME_HEIGHT = 740;
const POOP_WIDTH = 88;
const POOP_GAP = 220;
const POOP_SPEED = 2.2;
const GRAVITY = 0.285;
const FLAP_FORCE = -6.1;
const POOP_INTERVAL = 1680;
const GROUND_HEIGHT = 90;
const FIREWORK_DURATION = 5200;
const FLAP_INPUT_DEBOUNCE = 44;

const DEFAULT_FACE_PREVIEW =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffdcb5" />
          <stop offset="100%" stop-color="#ffaf72" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="44" fill="url(#bg)" />
      <circle cx="84" cy="95" r="10" fill="#38241a" />
      <circle cx="156" cy="95" r="10" fill="#38241a" />
      <path d="M75 150c16 22 74 22 90 0" fill="none" stroke="#38241a" stroke-width="10" stroke-linecap="round" />
      <text x="120" y="212" text-anchor="middle" fill="#7d3b12" font-size="24" font-family="Trebuchet MS, sans-serif">Đại</text>
    </svg>
  `);

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
fireworksCanvas.width = GAME_WIDTH;
fireworksCanvas.height = GAME_HEIGHT;

const game = {
  screen: "setup",
  running: false,
  ended: false,
  result: null,
  lastFrameTime: 0,
  spawnTimer: 0,
  score: 0,
  goal: Number(goalScoreInput.value),
  audioContext: null,
  uploadedVideoUrl: null,
  uploadedSoundUrl: null,
  uploadedSoundBuffer: null,
  finishVideoUrl: "",
  faceImage: null,
  facePreviewUrl: DEFAULT_FACE_PREVIEW,
  availableVoices: [],
  speechPrimed: false,
  lastSpeechAt: 0,
  lastInputAt: 0,
  bird: {
    x: 118,
    y: GAME_HEIGHT * 0.42,
    velocity: 0,
    radius: 28,
    hitRadius: 21,
    rotation: 0,
  },
  obstacles: [],
  clouds: createClouds(),
  fireworks: {
    active: false,
    particles: [],
    rafId: 0,
    lastBurst: 0,
    until: 0,
  },
};

function createClouds() {
  return Array.from({ length: 5 }, (_, index) => ({
    x: 70 + index * 110,
    y: 80 + (index % 3) * 72,
    width: 56 + (index % 2) * 24,
    speed: 0.18 + index * 0.03,
  }));
}

function setScreen(screenName) {
  game.screen = screenName;
  setupScreen.classList.toggle("active", screenName === "setup");
  playScreen.classList.toggle("active", screenName === "play");
}

function updateGoalUi(value) {
  game.goal = Number(value);
  goalScoreValue.textContent = String(value);
  goalValue.textContent = String(value);
}

function updateSummaries() {
  setupFacePreview.src = game.facePreviewUrl;
  faceSummary.textContent = game.faceImage ? "Đã cài mặt của Đại" : "Đang dùng mặt mặc định";
  videoSummary.textContent = game.finishVideoUrl ? "Đã nạp video chiến thắng" : "Chưa có video";
  videoStatus.textContent = game.finishVideoUrl
    ? "Video chiến thắng đã sẵn sàng."
    : "Chưa chọn video chiến thắng.";
  soundStatus.textContent = game.uploadedSoundBuffer
    ? 'Đã nạp file tiếng "Đại ngu".'
    : 'Đang dùng âm mặc định + thử đọc "Đại ngu".';
}

function prepareIdleOverlay() {
  gameOverlayTitle.textContent = "Bắt đầu để bảo vệ Đại";
  gameOverlayBody.textContent =
    'Chạm ở bất kỳ đâu trong khung game hoặc nút Bay để bắt đầu. Mỗi lần lách qua một bãi sẽ phát tiếng.';
  gameOverlay.classList.remove("hidden");
}

function clearResultMedia() {
  resultFace.classList.add("hidden");
  finishVideo.classList.add("hidden");
  finishVideo.pause();
  finishVideo.currentTime = 0;
  finishVideo.removeAttribute("src");
  finishVideo.load();
}

function resetRunState(options = {}) {
  const { showOverlay = true } = options;

  game.running = false;
  game.ended = false;
  game.result = null;
  game.lastFrameTime = 0;
  game.spawnTimer = 0;
  game.score = 0;
  game.goal = Number(goalScoreInput.value);
  game.bird.y = GAME_HEIGHT * 0.42;
  game.bird.velocity = 0;
  game.bird.rotation = 0;
  game.obstacles = [];
  game.clouds = createClouds();

  stopFireworks();
  clearFireworksCanvas();
  clearResultMedia();

  scoreValue.textContent = "0";
  statusText.textContent = "Sẵn sàng";
  goalValue.textContent = String(game.goal);
  goalScoreValue.textContent = String(game.goal);
  resultOverlay.classList.add("hidden");

  if (showOverlay) {
    prepareIdleOverlay();
  } else {
    gameOverlay.classList.add("hidden");
  }

  drawScene();
}

function startFreshRun() {
  resetRunState({ showOverlay: false });
  startGame();
}

function startGame() {
  if (game.running) {
    return;
  }

  initAudio();
  primeSpeech();
  game.running = true;
  game.ended = false;
  gameOverlay.classList.add("hidden");
  resultOverlay.classList.add("hidden");
  statusText.textContent = "Đang né cức";

  if (!game.lastFrameTime) {
    requestAnimationFrame(loop);
  }
}

function flap() {
  if (game.screen !== "play" || game.ended) {
    return;
  }

  const now = performance.now();
  if (now - game.lastInputAt < FLAP_INPUT_DEBOUNCE) {
    return;
  }
  game.lastInputAt = now;

  if (!game.running) {
    startGame();
  }

  initAudio();
  primeSpeech();
  game.bird.velocity = FLAP_FORCE;
  game.bird.rotation = -0.48;
}

function loop(timestamp) {
  if (!game.running) {
    game.lastFrameTime = 0;
    drawScene();
    return;
  }

  if (!game.lastFrameTime) {
    game.lastFrameTime = timestamp;
  }

  const delta = Math.min(timestamp - game.lastFrameTime, 32);
  game.lastFrameTime = timestamp;
  update(delta);
  drawScene();

  if (game.running) {
    requestAnimationFrame(loop);
  }
}

function update(delta) {
  const factor = delta / 16.67;

  updateClouds(factor);
  game.spawnTimer += delta;

  if (game.spawnTimer >= POOP_INTERVAL) {
    game.spawnTimer = 0;
    spawnObstacle();
  }

  game.bird.velocity += GRAVITY * factor;
  game.bird.y += game.bird.velocity * factor;
  game.bird.rotation = Math.min(Math.max(game.bird.velocity / 10, -0.65), 1.15);

  updateObstacles(factor);

  if (hasHitBounds() || hasHitObstacle()) {
    endRun(false);
    return;
  }

  if (game.score >= game.goal && !game.ended) {
    endRun(true);
  }
}

function updateClouds(factor) {
  game.clouds.forEach((cloud) => {
    cloud.x -= cloud.speed * factor;
    if (cloud.x + cloud.width * 2 < 0) {
      cloud.x = GAME_WIDTH + 40;
    }
  });
}

function spawnObstacle() {
  const safeTop = 110;
  const safeBottom = GAME_HEIGHT - GROUND_HEIGHT - 110 - POOP_GAP;
  const gapY = randomBetween(safeTop, safeBottom);

  game.obstacles.push({
    x: GAME_WIDTH + 32,
    gapY,
    passed: false,
  });
}

function updateObstacles(factor) {
  game.obstacles.forEach((obstacle) => {
    obstacle.x -= POOP_SPEED * factor;

    if (!obstacle.passed && obstacle.x + POOP_WIDTH < game.bird.x - game.bird.radius) {
      obstacle.passed = true;
      game.score += 1;
      scoreValue.textContent = String(game.score);
      statusText.textContent = `Đã lách qua ${game.score} bãi`;
      playPassSound();
    }
  });

  game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + POOP_WIDTH > -30);
}

function hasHitBounds() {
  return (
    game.bird.y + game.bird.hitRadius >= GAME_HEIGHT - GROUND_HEIGHT ||
    game.bird.y - game.bird.hitRadius <= 0
  );
}

function hasHitObstacle() {
  return game.obstacles.some((obstacle) => {
    const birdLeft = game.bird.x - game.bird.hitRadius;
    const birdRight = game.bird.x + game.bird.hitRadius;
    const birdTop = game.bird.y - game.bird.hitRadius;
    const birdBottom = game.bird.y + game.bird.hitRadius;
    const gapTop = obstacle.gapY;
    const gapBottom = obstacle.gapY + POOP_GAP;
    const withinX = birdRight > obstacle.x && birdLeft < obstacle.x + POOP_WIDTH;

    if (!withinX) {
      return false;
    }

    return birdTop < gapTop || birdBottom > gapBottom;
  });
}

function endRun(isVictory) {
  if (game.ended) {
    return;
  }

  game.running = false;
  game.ended = true;
  game.result = isVictory ? "victory" : "loss";
  statusText.textContent = isVictory ? "Đã bảo vệ thành công" : "Đại ăn cức rồi";

  showResultOverlay(isVictory);
  startFireworks();

  if (isVictory) {
    playVictorySound();
  } else {
    playCrashSound();
  }
}

function showResultOverlay(isVictory) {
  clearResultMedia();
  gameOverlay.classList.add("hidden");
  resultOverlay.classList.remove("hidden");

  if (isVictory) {
    resultKicker.textContent = "Về đích an toàn";
    resultTitle.textContent = "Chúc mừng bạn đã bảo vệ Đại khỏi những bãi cức thành công";
    resultMessage.textContent = game.finishVideoUrl
      ? `Bạn đã né sạch ${game.score} bãi shit và video chiến thắng đang chờ phía dưới.`
      : `Bạn đã né sạch ${game.score} bãi shit và cán đích cực mượt.`;
    resultActionButton.textContent = "Bảo vệ lại";

    if (game.finishVideoUrl) {
      finishVideo.src = game.finishVideoUrl;
      finishVideo.classList.remove("hidden");
      finishVideo.load();
      tryAutoplayVideo();
    }
  } else {
    resultKicker.textContent = "Ăn cức rồi";
    resultTitle.textContent = "Đại đã ăn cức ngập mồm";
    resultMessage.textContent =
      "Chim vừa đâm trúng bãi shit. Ảnh mặt đã được lôi ra để ghi nhận khoảnh khắc lịch sử này.";
    resultActionButton.textContent = "Cho đại ăn cức lại";
    resultFace.src = game.facePreviewUrl;
    resultFace.classList.remove("hidden");
  }
}

function tryAutoplayVideo() {
  finishVideo.muted = true;
  const playAttempt = finishVideo.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      resultMessage.textContent =
        "Bạn đã thắng rồi. Nếu video chưa tự phát thì chạm vào khung video để xem.";
    });
  }
}

function initAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  if (!game.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    game.audioContext = new AudioCtx();
  }

  if (game.audioContext.state === "suspended") {
    game.audioContext.resume().catch(() => {});
  }
}

function primeSpeech() {
  if (
    game.speechPrimed ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return;
  }

  try {
    cacheVoices();
    const unlockUtterance = new SpeechSynthesisUtterance(" ");
    unlockUtterance.volume = 0.01;
    unlockUtterance.rate = 1;
    unlockUtterance.lang = "vi-VN";
    window.speechSynthesis.speak(unlockUtterance);
    game.speechPrimed = true;
  } catch (_) {
    game.speechPrimed = false;
  }
}

function cacheVoices() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  game.availableVoices = window.speechSynthesis.getVoices();
}

function playPassSound() {
  if (playUploadedPassSound()) {
    return;
  }

  playPassTone();
  speakPhrase("Đại ngu");
}

function speakPhrase(text) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return false;
  }

  const now = performance.now();
  if (now - game.lastSpeechAt < 550) {
    return false;
  }
  game.lastSpeechAt = now;

  cacheVoices();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  utterance.rate = 0.9;
  utterance.pitch = 0.88;
  utterance.volume = 1;

  const vietnameseVoice = game.availableVoices.find((voice) =>
    voice.lang.toLowerCase().startsWith("vi")
  );
  if (vietnameseVoice) {
    utterance.voice = vietnameseVoice;
  }

  try {
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (_) {
    return false;
  }
}

function playUploadedPassSound() {
  if (!game.audioContext || !game.uploadedSoundBuffer) {
    return false;
  }

  const source = game.audioContext.createBufferSource();
  const gain = game.audioContext.createGain();
  source.buffer = game.uploadedSoundBuffer;
  gain.gain.value = 0.95;
  source.connect(gain);
  gain.connect(game.audioContext.destination);
  source.start();
  return true;
}

function playPassTone() {
  if (!game.audioContext) {
    return;
  }

  const now = game.audioContext.currentTime;

  [
    { start: 0, from: 560, to: 760, duration: 0.17 },
    { start: 0.19, from: 520, to: 680, duration: 0.14 },
  ].forEach((note) => {
    const osc = game.audioContext.createOscillator();
    const gain = game.audioContext.createGain();
    const start = now + note.start;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(note.from, start);
    osc.frequency.exponentialRampToValueAtTime(note.to, start + note.duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);

    osc.connect(gain);
    gain.connect(game.audioContext.destination);
    osc.start(start);
    osc.stop(start + note.duration + 0.02);
  });
}

function playCrashSound() {
  if (!game.audioContext) {
    return;
  }

  const now = game.audioContext.currentTime;
  const osc = game.audioContext.createOscillator();
  const gain = game.audioContext.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.42);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  osc.connect(gain);
  gain.connect(game.audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

function playVictorySound() {
  if (!game.audioContext) {
    return;
  }

  const notes = [523.25, 659.25, 783.99, 1046.5];
  const now = game.audioContext.currentTime;

  notes.forEach((note, index) => {
    const osc = game.audioContext.createOscillator();
    const gain = game.audioContext.createGain();
    const start = now + index * 0.1;

    osc.type = "sine";
    osc.frequency.setValueAtTime(note, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);

    osc.connect(gain);
    gain.connect(game.audioContext.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function drawScene() {
  drawBackground();
  drawObstacles();
  drawGround();
  drawBird();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#67d4ff");
  sky.addColorStop(1, "#f5fcff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  game.clouds.forEach((cloud) => {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#ffffff";
    drawCloud(cloud.x, cloud.y, cloud.width);
    ctx.restore();
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  ctx.beginPath();
  ctx.arc(334, 118, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT - 24, GAME_WIDTH, 24);
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
  ctx.arc(x + size * 0.35, y - size * 0.1, size * 0.32, 0, Math.PI * 2);
  ctx.arc(x + size * 0.62, y, size * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacles() {
  game.obstacles.forEach((obstacle) => {
    drawPoopColumn(obstacle.x, 0, obstacle.gapY, true);
    drawPoopColumn(
      obstacle.x,
      obstacle.gapY + POOP_GAP,
      GAME_HEIGHT - GROUND_HEIGHT - (obstacle.gapY + POOP_GAP),
      false
    );
  });
}

function drawPoopColumn(x, y, height, isTop) {
  const centerX = x + POOP_WIDTH / 2;
  const step = 56;

  if (isTop) {
    for (let segmentBase = height + 26; segmentBase >= -24; segmentBase -= step) {
      drawPoopPile(centerX, segmentBase, 1.08, true);
    }
  } else {
    for (let segmentBase = y - 24; segmentBase <= y + height + 38; segmentBase += step) {
      drawPoopPile(centerX, segmentBase, 1.08, false);
    }
  }
}

function drawPoopPile(centerX, baseY, scale = 1, upsideDown = false) {
  ctx.save();
  ctx.translate(centerX, baseY);
  if (upsideDown) {
    ctx.scale(1, -1);
  }
  ctx.scale(scale, scale);

  const gradient = ctx.createLinearGradient(0, -58, 0, 20);
  gradient.addColorStop(0, "#8f5a2f");
  gradient.addColorStop(0.55, "#6e421f");
  gradient.addColorStop(1, "#452612");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-34, 18);
  ctx.bezierCurveTo(-50, 8, -46, -12, -28, -16);
  ctx.bezierCurveTo(-30, -36, -8, -40, 2, -24);
  ctx.bezierCurveTo(2, -50, 30, -48, 24, -20);
  ctx.bezierCurveTo(40, -24, 52, -4, 36, 18);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 229, 195, 0.18)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-18, 4);
  ctx.quadraticCurveTo(-4, -8, 10, 2);
  ctx.quadraticCurveTo(16, 6, 22, 0);
  ctx.stroke();

  ctx.fillStyle = "rgba(178, 246, 122, 0.9)";
  ctx.beginPath();
  ctx.arc(-26, -8, 3.6, 0, Math.PI * 2);
  ctx.arc(28, 3, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(108, 80, 55, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-44, -16);
  ctx.quadraticCurveTo(-50, -34, -42, -42);
  ctx.moveTo(38, -8);
  ctx.quadraticCurveTo(50, -24, 44, -34);
  ctx.stroke();
  ctx.restore();
}

function drawGround() {
  const groundY = GAME_HEIGHT - GROUND_HEIGHT;
  const groundGradient = ctx.createLinearGradient(0, groundY, 0, GAME_HEIGHT);
  groundGradient.addColorStop(0, "#88cf72");
  groundGradient.addColorStop(0.18, "#71be63");
  groundGradient.addColorStop(0.18, "#b18248");
  groundGradient.addColorStop(1, "#7a4e2d");

  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT);

  ctx.fillStyle = "#6d462a";
  for (let x = 0; x < GAME_WIDTH; x += 26) {
    ctx.fillRect(x, groundY + 24, 14, 10);
  }
}

function drawBird() {
  const { x, y, radius, rotation } = game.bird;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const birdGradient = ctx.createRadialGradient(-8, -8, 8, 0, 0, radius);
  birdGradient.addColorStop(0, "#ffe38a");
  birdGradient.addColorStop(1, "#ff8c39");
  ctx.fillStyle = birdGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff5df";
  ctx.beginPath();
  ctx.ellipse(-6, 2, radius * 0.72, radius * 0.62, 0.2, 0, Math.PI * 2);
  ctx.fill();

  drawFaceImage(radius);
  drawBirdWing(radius);
  drawBirdEye();
  drawBirdBeak(radius);

  ctx.restore();
}

function drawFaceImage(radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(-2, 0, radius * 0.66, 0, Math.PI * 2);
  ctx.clip();

  if (game.faceImage) {
    const size = radius * 1.45;
    ctx.drawImage(game.faceImage, -size / 2 - 2, -size / 2, size, size);
  } else {
    const faceGradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
    faceGradient.addColorStop(0, "#ffd9b0");
    faceGradient.addColorStop(1, "#ffb276");
    ctx.fillStyle = faceGradient;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

    ctx.strokeStyle = "rgba(23, 34, 44, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-10, -6, 2.2, 0, Math.PI * 2);
    ctx.arc(8, -6, 2.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-1, 6, 9, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBirdWing(radius) {
  ctx.fillStyle = "rgba(229, 112, 38, 0.85)";
  ctx.beginPath();
  ctx.ellipse(-4, 10, radius * 0.45, radius * 0.24, -0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawBirdEye() {
  ctx.fillStyle = "#17222c";
  ctx.beginPath();
  ctx.arc(12, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(13, -5, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawBirdBeak(radius) {
  ctx.fillStyle = "#ff6d2f";
  ctx.beginPath();
  ctx.moveTo(radius - 4, 0);
  ctx.lineTo(radius + 18, -5);
  ctx.lineTo(radius + 6, 8);
  ctx.closePath();
  ctx.fill();
}

function startFireworks() {
  stopFireworks();
  game.fireworks.active = true;
  game.fireworks.particles = [];
  game.fireworks.lastBurst = 0;
  game.fireworks.until = performance.now() + FIREWORK_DURATION;
  game.fireworks.rafId = requestAnimationFrame(runFireworksLoop);
}

function runFireworksLoop(timestamp) {
  if (!game.fireworks.active) {
    clearFireworksCanvas();
    return;
  }

  if (!game.fireworks.lastBurst || timestamp - game.fireworks.lastBurst > 280) {
    spawnFireworkBurst();
    game.fireworks.lastBurst = timestamp;
  }

  fireworksCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  fireworksCtx.fillStyle = "rgba(13, 8, 5, 0.08)";
  fireworksCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  game.fireworks.particles = game.fireworks.particles.filter((particle) => particle.life > 0);

  game.fireworks.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.035;
    particle.life -= 1;
    particle.size *= 0.988;

    fireworksCtx.save();
    fireworksCtx.globalAlpha = particle.life / particle.maxLife;
    fireworksCtx.fillStyle = particle.color;
    fireworksCtx.beginPath();
    fireworksCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    fireworksCtx.fill();
    fireworksCtx.restore();
  });

  if (timestamp < game.fireworks.until || game.fireworks.particles.length > 0) {
    game.fireworks.rafId = requestAnimationFrame(runFireworksLoop);
  } else {
    stopFireworks();
  }
}

function spawnFireworkBurst() {
  const burstX = randomBetween(70, GAME_WIDTH - 70);
  const burstY = randomBetween(90, GAME_HEIGHT * 0.62);
  const colors = ["#ffce54", "#ff6b6b", "#7ed6df", "#a29bfe", "#7bed9f", "#ffa94d"];

  for (let index = 0; index < 34; index += 1) {
    const angle = (Math.PI * 2 * index) / 34;
    const speed = randomBetween(1.8, 4.8);
    game.fireworks.particles.push({
      x: burstX,
      y: burstY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomBetween(24, 44),
      maxLife: 44,
      size: randomBetween(2.2, 4.6),
      color: colors[index % colors.length],
    });
  }
}

function stopFireworks() {
  if (game.fireworks.rafId) {
    cancelAnimationFrame(game.fireworks.rafId);
  }
  game.fireworks.active = false;
  game.fireworks.rafId = 0;
  game.fireworks.particles = [];
  clearFireworksCanvas();
}

function clearFireworksCanvas() {
  fireworksCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function handleFaceUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      game.faceImage = image;
      game.facePreviewUrl = reader.result;
      updateSummaries();
      statusText.textContent = "Đã nạp ảnh mặt";
      drawScene();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function handleVideoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (game.uploadedVideoUrl) {
    URL.revokeObjectURL(game.uploadedVideoUrl);
  }

  game.uploadedVideoUrl = URL.createObjectURL(file);
  game.finishVideoUrl = game.uploadedVideoUrl;
  updateSummaries();
  statusText.textContent = "Đã nạp video chiến thắng";
}

function handleSoundUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  initAudio();

  if (game.uploadedSoundUrl) {
    URL.revokeObjectURL(game.uploadedSoundUrl);
  }

  game.uploadedSoundUrl = URL.createObjectURL(file);
  file
    .arrayBuffer()
    .then((buffer) => game.audioContext.decodeAudioData(buffer.slice(0)))
    .then((decodedBuffer) => {
      game.uploadedSoundBuffer = decodedBuffer;
      updateSummaries();
      statusText.textContent = 'Đã nạp file tiếng "Đại ngu"';
    })
    .catch(() => {
      game.uploadedSoundBuffer = null;
      updateSummaries();
      statusText.textContent = "File tiếng chưa đọc được, đang quay về âm mặc định";
    });
}

function preventDoubleTapZoom() {
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (event) => {
      const target = event.target.closest(".tap-target, .game-frame");
      if (!target) {
        return;
      }

      const now = Date.now();
      if (now - lastTouchEnd < 320) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener(
    "dblclick",
    (event) => {
      if (event.target.closest(".tap-target, .game-frame")) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    "gesturestart",
    (event) => {
      if (event.target.closest(".tap-target, .game-frame")) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

function handleGameTap(event) {
  if (event.target.closest("button, video")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (!resultOverlay.classList.contains("hidden")) {
    return;
  }
  flap();
}

function bindEvents() {
  goToGameButton.addEventListener("click", () => {
    initAudio();
    primeSpeech();
    setScreen("play");
    resetRunState();
  });

  backToSetupButton.addEventListener("click", () => {
    resetRunState();
    setScreen("setup");
  });

  startRoundButton.addEventListener("click", startFreshRun);
  flapButton.addEventListener("click", flap);
  resultActionButton.addEventListener("click", startFreshRun);

  resultBackButton.addEventListener("click", () => {
    resetRunState();
    setScreen("setup");
  });

  goalScoreInput.addEventListener("input", (event) => {
    updateGoalUi(event.target.value);
    if (!game.running) {
      drawScene();
    }
  });

  faceUpload.addEventListener("change", handleFaceUpload);
  videoUpload.addEventListener("change", handleVideoUpload);
  soundUpload.addEventListener("change", handleSoundUpload);

  canvas.addEventListener("touchstart", handleGameTap, { passive: false });
  canvas.addEventListener("pointerdown", handleGameTap);
  gameFrame.addEventListener("touchstart", handleGameTap, { passive: false });
  gameFrame.addEventListener("pointerdown", handleGameTap);
  flapButton.addEventListener("touchstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
    flap();
  }, { passive: false });

  window.addEventListener("keydown", (event) => {
    if (game.screen !== "play") {
      return;
    }

    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      flap();
    }
  });

  finishVideo.addEventListener("play", () => {
    statusText.textContent = "Video chiến thắng đang phát";
  });

  window.addEventListener("beforeunload", () => {
    if (game.uploadedVideoUrl) {
      URL.revokeObjectURL(game.uploadedVideoUrl);
    }
    if (game.uploadedSoundUrl) {
      URL.revokeObjectURL(game.uploadedSoundUrl);
    }
  });

  if ("speechSynthesis" in window) {
    cacheVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", cacheVoices);
  }

  preventDoubleTapZoom();
}

bindEvents();
updateGoalUi(goalScoreInput.value);
updateSummaries();
setScreen("setup");
resetRunState();
