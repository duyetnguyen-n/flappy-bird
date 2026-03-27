const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameOverlay = document.getElementById("gameOverlay");
const finishOverlay = document.getElementById("finishOverlay");
const finishVideo = document.getElementById("finishVideo");
const finishMessage = document.getElementById("finishMessage");
const gameOverlayTitle = document.getElementById("gameOverlayTitle");
const gameOverlayBody = document.getElementById("gameOverlayBody");
const scoreValue = document.getElementById("scoreValue");
const goalValue = document.getElementById("goalValue");
const goalScoreValue = document.getElementById("goalScoreValue");
const statusText = document.getElementById("statusText");
const goalScoreInput = document.getElementById("goalScore");
const faceUpload = document.getElementById("faceUpload");
const videoUpload = document.getElementById("videoUpload");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const flapButton = document.getElementById("flapButton");
const playAgainButton = document.getElementById("playAgainButton");
const closeVideoButton = document.getElementById("closeVideoButton");

const GAME_WIDTH = 420;
const GAME_HEIGHT = 740;
const PIPE_WIDTH = 72;
const PIPE_GAP = 170;
const PIPE_SPEED = 2.8;
const GRAVITY = 0.34;
const FLAP_FORCE = -6.1;
const PIPE_INTERVAL = 1350;
const GROUND_HEIGHT = 88;
const DEFAULT_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const game = {
  running: false,
  finished: false,
  lastFrameTime: 0,
  spawnTimer: 0,
  score: 0,
  goal: Number(goalScoreInput.value),
  audioContext: null,
  bird: {
    x: 118,
    y: GAME_HEIGHT * 0.42,
    velocity: 0,
    radius: 28,
    rotation: 0,
  },
  pipes: [],
  clouds: createClouds(),
  faceImage: null,
  finishVideoUrl: DEFAULT_VIDEO_URL,
  uploadedVideoUrl: null,
};

function createClouds() {
  return Array.from({ length: 5 }, (_, index) => ({
    x: 70 + index * 110,
    y: 80 + (index % 3) * 70,
    width: 56 + (index % 2) * 24,
    speed: 0.18 + index * 0.03,
  }));
}

function resetGameState() {
  game.running = false;
  game.finished = false;
  game.lastFrameTime = 0;
  game.spawnTimer = 0;
  game.score = 0;
  game.goal = Number(goalScoreInput.value);
  game.bird.y = GAME_HEIGHT * 0.42;
  game.bird.velocity = 0;
  game.bird.rotation = 0;
  game.pipes = [];
  game.clouds = createClouds();

  scoreValue.textContent = "0";
  goalValue.textContent = String(game.goal);
  goalScoreValue.textContent = String(game.goal);
  statusText.textContent = "San sang";
  gameOverlayTitle.textContent = "Flappy Bird da san sang";
  gameOverlayBody.textContent =
    "Cham vao vung game hoac nut Bay de giu chim tren khong. Khi du diem, video se hien ra.";
  gameOverlay.classList.remove("hidden");
  finishOverlay.classList.add("hidden");
  finishVideo.pause();
  finishVideo.currentTime = 0;
  finishVideo.src = game.finishVideoUrl;
  drawScene();
}

function startGame() {
  if (game.finished) {
    finishOverlay.classList.add("hidden");
  }

  initAudio();

  game.running = true;
  game.finished = false;
  gameOverlay.classList.add("hidden");
  finishOverlay.classList.add("hidden");
  statusText.textContent = "Dang bay";

  if (!game.lastFrameTime) {
    requestAnimationFrame(loop);
  }
}

function flap() {
  if (game.finished) {
    return;
  }

  if (!game.running) {
    startGame();
  }

  initAudio();
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

  if (game.spawnTimer >= PIPE_INTERVAL) {
    game.spawnTimer = 0;
    spawnPipe();
  }

  game.bird.velocity += GRAVITY * factor;
  game.bird.y += game.bird.velocity * factor;
  game.bird.rotation = Math.min(Math.max(game.bird.velocity / 10, -0.65), 1.15);

  updatePipes(factor);

  if (hasHitBounds() || hasHitPipe()) {
    endRun(false);
  }

  if (game.score >= game.goal && !game.finished) {
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

function spawnPipe() {
  const safeTop = 110;
  const safeBottom = GAME_HEIGHT - GROUND_HEIGHT - 110 - PIPE_GAP;
  const gapY = randomBetween(safeTop, safeBottom);

  game.pipes.push({
    x: GAME_WIDTH + 30,
    gapY,
    passed: false,
  });
}

function updatePipes(factor) {
  game.pipes.forEach((pipe) => {
    pipe.x -= PIPE_SPEED * factor;

    if (!pipe.passed && pipe.x + PIPE_WIDTH < game.bird.x - game.bird.radius) {
      pipe.passed = true;
      game.score += 1;
      scoreValue.textContent = String(game.score);
      statusText.textContent = `Da vuot ${game.score} ong`;
      playPassSound();
    }
  });

  game.pipes = game.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -20);
}

function hasHitBounds() {
  return (
    game.bird.y + game.bird.radius >= GAME_HEIGHT - GROUND_HEIGHT ||
    game.bird.y - game.bird.radius <= 0
  );
}

function hasHitPipe() {
  return game.pipes.some((pipe) => {
    const birdLeft = game.bird.x - game.bird.radius;
    const birdRight = game.bird.x + game.bird.radius;
    const birdTop = game.bird.y - game.bird.radius;
    const birdBottom = game.bird.y + game.bird.radius;
    const gapTop = pipe.gapY;
    const gapBottom = pipe.gapY + PIPE_GAP;
    const withinPipeX = birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH;

    if (!withinPipeX) {
      return false;
    }

    return birdTop < gapTop || birdBottom > gapBottom;
  });
}

function endRun(isVictory) {
  game.running = false;
  game.finished = isVictory;
  statusText.textContent = isVictory ? "Ve dich" : "Da roi";

  if (isVictory) {
    finishMessage.textContent = `Ban dat ${game.score} diem va da mo khoa video an mung.`;
    finishOverlay.classList.remove("hidden");
    playVictorySound();
    tryAutoplayVideo();
  } else {
    gameOverlay.classList.remove("hidden");
    gameOverlayTitle.textContent = "Thu lai mot lan nua";
    gameOverlayBody.textContent =
      "Chim da cham ong hoac roi xuong dat. Bam Bat dau hoac cham vao game de choi lai.";
  }
}

function tryAutoplayVideo() {
  finishVideo.muted = true;
  const playAttempt = finishVideo.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      finishMessage.textContent =
        "Ban da can dich. Neu video chua tu phat, cham vao khung video de xem.";
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

function playPassSound() {
  if (!game.audioContext) {
    return;
  }

  const now = game.audioContext.currentTime;
  const osc = game.audioContext.createOscillator();
  const gain = game.audioContext.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(740, now);
  osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  osc.connect(gain);
  gain.connect(game.audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function playVictorySound() {
  if (!game.audioContext) {
    return;
  }

  const notes = [523.25, 659.25, 783.99];
  const now = game.audioContext.currentTime;

  notes.forEach((note, index) => {
    const osc = game.audioContext.createOscillator();
    const gain = game.audioContext.createGain();
    const start = now + index * 0.11;

    osc.type = "sine";
    osc.frequency.setValueAtTime(note, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.06, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);

    osc.connect(gain);
    gain.connect(game.audioContext.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function drawScene() {
  drawBackground();
  drawPipes();
  drawGround();
  drawBird();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#67d4ff");
  sky.addColorStop(1, "#eefcff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  game.clouds.forEach((cloud) => {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#ffffff";
    drawCloud(cloud.x, cloud.y, cloud.width);
    ctx.restore();
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(330, 120, 42, 0, Math.PI * 2);
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

function drawPipes() {
  game.pipes.forEach((pipe) => {
    drawPipeSegment(pipe.x, 0, pipe.gapY, true);
    drawPipeSegment(
      pipe.x,
      pipe.gapY + PIPE_GAP,
      GAME_HEIGHT - GROUND_HEIGHT - (pipe.gapY + PIPE_GAP),
      false
    );
  });
}

function drawPipeSegment(x, y, height, isTop) {
  ctx.save();
  const gradient = ctx.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
  gradient.addColorStop(0, "#4caf72");
  gradient.addColorStop(1, "#24734a");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, PIPE_WIDTH, height);

  ctx.fillStyle = "#1a5a39";
  ctx.fillRect(x, y, 8, height);

  const capHeight = 18;
  const capY = isTop ? height - capHeight : y;
  ctx.fillStyle = "#37945f";
  ctx.fillRect(x - 6, capY, PIPE_WIDTH + 12, capHeight);
  ctx.restore();
}

function drawGround() {
  const groundY = GAME_HEIGHT - GROUND_HEIGHT;
  const groundGradient = ctx.createLinearGradient(0, groundY, 0, GAME_HEIGHT);
  groundGradient.addColorStop(0, "#eab55d");
  groundGradient.addColorStop(1, "#ba7a24");

  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT);

  ctx.fillStyle = "#c88b34";
  for (let x = 0; x < GAME_WIDTH; x += 22) {
    ctx.fillRect(x, groundY + 10, 12, 8);
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
      statusText.textContent = "Da them anh mat";
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
  finishVideo.src = game.finishVideoUrl;
  finishVideo.load();
  statusText.textContent = "Da them video ve dich";
}

function bindEvents() {
  startButton.addEventListener("click", () => {
    resetGameState();
    startGame();
  });

  restartButton.addEventListener("click", () => {
    resetGameState();
  });

  flapButton.addEventListener("click", flap);
  playAgainButton.addEventListener("click", () => {
    resetGameState();
    startGame();
  });

  closeVideoButton.addEventListener("click", () => {
    finishOverlay.classList.add("hidden");
    resetGameState();
  });

  goalScoreInput.addEventListener("input", (event) => {
    const value = event.target.value;
    goalScoreValue.textContent = value;
    goalValue.textContent = value;
    game.goal = Number(value);
  });

  faceUpload.addEventListener("change", handleFaceUpload);
  videoUpload.addEventListener("change", handleVideoUpload);

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    flap();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      flap();
    }
  });

  finishVideo.addEventListener("play", () => {
    finishMessage.textContent = "Video dang phat. Ban co the choi lai bat cu luc nao.";
  });
}

bindEvents();
resetGameState();
