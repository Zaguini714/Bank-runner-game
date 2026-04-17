const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const stateEl = document.getElementById("state");
const overlay = document.getElementById("overlay");

const STORAGE_KEY = "bank-runner-best";
const keys = new Set();

const game = {
  running: false,
  gameOver: false,
  speed: 340,
  distance: 0,
  best: Number(localStorage.getItem(STORAGE_KEY) || 0),
  obstacleTimer: 0,
  platformTimer: 0,
  wallTimer: 0,
  coinTimer: 0,
  obstacles: [],
  platforms: [],
  walls: [],
  coins: [],
  stars: [],
  cameraShake: 0,
  streak: 1,
  flashTimer: 0,
};

const player = {
  x: 170,
  y: 0,
  width: 34,
  height: 76,
  vx: 0,
  vy: 0,
  onGround: false,
  canDoubleJump: true,
  sliding: false,
  slideTimer: 0,
  wallContact: false,
};

const gravity = 1680;
const groundY = 430;

function resetGame() {
  game.running = true;
  game.gameOver = false;
  game.speed = 340;
  game.distance = 0;
  game.obstacleTimer = 0.8;
  game.platformTimer = 1.6;
  game.wallTimer = 2.8;
  game.coinTimer = 0.9;
  game.obstacles = [];
  game.platforms = [];
  game.walls = [];
  game.coins = [];
  game.stars = createStars();
  game.cameraShake = 0;
  game.streak = 1;
  game.flashTimer = 0;

  player.x = 170;
  player.y = groundY - player.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.canDoubleJump = true;
  player.sliding = false;
  player.slideTimer = 0;
  player.wallContact = false;

  overlay.classList.add("hidden");
  stateEl.textContent = "x1";
  setOverlay(
    "Bank Runner",
    `Dash across rooftops, grab coins, jump gaps, and slide under blockers. It is simple on purpose, but it gets fast fast.`,
    "Start Run"
  );
  updateHud();
  overlay.classList.add("hidden");
}

function createStars() {
  return Array.from({ length: 10 }, (_, index) => ({
    x: 60 + index * 105,
    y: 70 + (index % 3) * 28,
    size: 2 + (index % 2),
  }));
}

function spawnObstacle() {
  const roll = Math.random();

  if (roll < 0.35) {
    game.obstacles.push({
      type: "barrier",
      x: canvas.width + 20,
      y: groundY - 48,
      width: 30,
      height: 48,
    });
  } else if (roll < 0.68) {
    game.obstacles.push({
      type: "lowBar",
      x: canvas.width + 20,
      y: groundY - 110,
      width: 64,
      height: 16,
    });
  } else {
    game.obstacles.push({
      type: "gap",
      x: canvas.width + 20,
      y: groundY,
      width: 95,
      height: 120,
    });
  }
}

function spawnPlatform() {
  game.platforms.push({
    x: canvas.width + 20,
    y: 290 - Math.random() * 70,
    width: 110 + Math.random() * 40,
    height: 18,
  });
}

function spawnWall() {
  game.walls.push({
    x: canvas.width + 20,
    y: groundY - 160,
    width: 22,
    height: 160,
  });
}

function spawnCoins() {
  const rowY = 260 + Math.random() * 140;
  const count = 3 + Math.floor(Math.random() * 3);
  for (let index = 0; index < count; index += 1) {
    game.coins.push({
      x: canvas.width + 60 + index * 36,
      y: rowY + Math.sin(index * 0.8) * 18,
      width: 18,
      height: 18,
      collected: false,
    });
  }
}

function jump() {
  if (!game.running) {
    resetGame();
    return;
  }

  if (player.onGround) {
    player.vy = -700;
    player.onGround = false;
    player.canDoubleJump = true;
  } else if (player.wallContact) {
    player.vy = -720;
    player.vx = -120;
    player.canDoubleJump = true;
  } else if (player.canDoubleJump) {
    player.vy = -640;
    player.canDoubleJump = false;
  }
}

function slide(active) {
  if (!game.running || !player.onGround) {
    return;
  }

  if (active) {
    player.sliding = true;
    player.slideTimer = 0.24;
  }
}

function setGameOver() {
  game.running = false;
  game.gameOver = true;
  game.cameraShake = 0.35;
  game.best = Math.max(game.best, Math.floor(game.distance));
  localStorage.setItem(STORAGE_KEY, String(game.best));
  updateHud();
  stateEl.textContent = `x${game.streak}`;
  setOverlay(
    "Wipeout",
    `You made it ${Math.floor(game.distance)} meters with a x${game.streak} streak. Hit restart and send it again.`,
    "Run Again"
  );
  overlay.classList.remove("hidden");
}

function updateHud() {
  scoreEl.textContent = `${Math.floor(game.distance)} m`;
  bestEl.textContent = `${Math.floor(game.best)} m`;
  stateEl.textContent = `x${game.streak}`;
}

function setOverlay(title, body, buttonLabel) {
  overlay.innerHTML = `
    <h2>${title}</h2>
    <p>${body}</p>
    <ul>
      <li><span>Jump</span><strong>Space / W / Up</strong></li>
      <li><span>Slide</span><strong>S / Down</strong></li>
      <li><span>Restart</span><strong>R</strong></li>
    </ul>
    <button id="startButton">${buttonLabel}</button>
  `;
  document.getElementById("startButton").addEventListener("click", resetGame);
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getPlayerHitbox() {
  const height = player.sliding ? 42 : player.height;
  return {
    x: player.x - player.width / 2,
    y: player.y + (player.height - height),
    width: player.width,
    height,
  };
}

function isOverGap(centerX) {
  return game.obstacles.some(
    (obstacle) =>
      obstacle.type === "gap" &&
      centerX > obstacle.x &&
      centerX < obstacle.x + obstacle.width
  );
}

function update(dt) {
  if (!game.running) {
    return;
  }

  game.speed += dt * 5.5;
  game.distance += dt * game.speed * 0.1;
  game.cameraShake = Math.max(0, game.cameraShake - dt);

  game.obstacleTimer -= dt;
  game.platformTimer -= dt;
  game.wallTimer -= dt;
  game.coinTimer -= dt;

  if (game.obstacleTimer <= 0) {
    spawnObstacle();
    game.obstacleTimer = 0.85 + Math.random() * 0.65;
  }

  if (game.platformTimer <= 0) {
    spawnPlatform();
    game.platformTimer = 2.2 + Math.random() * 1.2;
  }

  if (game.wallTimer <= 0) {
    spawnWall();
    game.wallTimer = 4.8 + Math.random() * 2.3;
  }

  if (game.coinTimer <= 0) {
    spawnCoins();
    game.coinTimer = 1.9 + Math.random() * 1.1;
  }

  player.vx *= 0.9;
  player.x += player.vx * dt;
  player.x = Math.max(70, Math.min(260, player.x));

  player.vy += gravity * dt;
  player.y += player.vy * dt;
  player.onGround = false;
  player.wallContact = false;

  if (player.slideTimer > 0) {
    player.slideTimer -= dt;
  } else {
    player.sliding = false;
  }

  game.flashTimer = Math.max(0, game.flashTimer - dt);

  if (player.y + player.height >= groundY && !isOverGap(player.x)) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.onGround = true;
    player.canDoubleJump = true;
  }

  for (const platform of game.platforms) {
    platform.x -= game.speed * dt;

    const feet = player.y + player.height;
    const wasAbove = feet - player.vy * dt <= platform.y;
    const overlapX =
      player.x + player.width / 2 > platform.x &&
      player.x - player.width / 2 < platform.x + platform.width;

    if (overlapX && wasAbove && feet >= platform.y && feet <= platform.y + platform.height + 18 && player.vy >= 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
      player.canDoubleJump = true;
    }
  }

  for (const wall of game.walls) {
    wall.x -= game.speed * dt;

    const hitbox = getPlayerHitbox();
    if (intersects(hitbox, wall)) {
      if (hitbox.x + hitbox.width * 0.5 < wall.x + wall.width && player.vy > -50) {
        player.x = wall.x - player.width / 2;
        player.vx = 0;
        player.wallContact = true;
        player.vy = Math.min(player.vy, 180);
      } else {
        setGameOver();
      }
    }
  }

  for (const obstacle of game.obstacles) {
    obstacle.x -= game.speed * dt;

    if (obstacle.type === "gap") {
      const centerX = player.x;
      if (centerX > obstacle.x && centerX < obstacle.x + obstacle.width && player.y > canvas.height) {
        setGameOver();
      }
      continue;
    }

    if (intersects(getPlayerHitbox(), obstacle)) {
      setGameOver();
    }
  }

  for (const coin of game.coins) {
    coin.x -= game.speed * dt;

    if (!coin.collected && intersects(getPlayerHitbox(), coin)) {
      coin.collected = true;
      game.distance += 12 * game.streak;
      game.streak = Math.min(9, game.streak + 1);
      game.flashTimer = 0.14;
    }
  }

  game.obstacles = game.obstacles.filter((item) => item.x + item.width > -60);
  game.platforms = game.platforms.filter((item) => item.x + item.width > -60);
  game.walls = game.walls.filter((item) => item.x + item.width > -60);
  game.coins = game.coins.filter((item) => item.x + item.width > -60 && !item.collected);

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = "#ffd98d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  for (const star of game.stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(145, 76, 30, 0.2)";
  ctx.beginPath();
  ctx.moveTo(0, 310);
  ctx.lineTo(120, 240);
  ctx.lineTo(250, 280);
  ctx.lineTo(430, 210);
  ctx.lineTo(660, 292);
  ctx.lineTo(860, 218);
  ctx.lineTo(960, 260);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#5b3416";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  const stripeWidth = 68;
  for (let i = 0; i < canvas.width / stripeWidth + 2; i += 1) {
    const offset = -((game.distance * 8) % stripeWidth);
    ctx.fillStyle = i % 2 === 0 ? "#70411b" : "#804c1e";
    ctx.fillRect(offset + i * stripeWidth, groundY, stripeWidth, canvas.height - groundY);
  }
}

function drawPlatforms() {
  for (const platform of game.platforms) {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(platform.x + 6, platform.y + 5, platform.width - 12, 4);
  }

  for (const wall of game.walls) {
    ctx.fillStyle = "#111827";
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(wall.x + 4, wall.y + 10, wall.width - 8, wall.height - 20);
  }
}

function drawCoins() {
  for (const coin of game.coins) {
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#9a6b00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2 - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#9a6b00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(coin.x + coin.width / 2, coin.y + 5);
    ctx.lineTo(coin.x + coin.width / 2, coin.y + coin.height - 5);
    ctx.stroke();
  }
}

function drawObstacles() {
  for (const obstacle of game.obstacles) {
    if (obstacle.type === "gap") {
      ctx.fillStyle = "#2b1909";
      ctx.fillRect(obstacle.x, groundY, obstacle.width, canvas.height - groundY);
      continue;
    }

    ctx.fillStyle = obstacle.type === "lowBar" ? "#ef4444" : "#1f2937";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

    ctx.fillStyle = "#fde68a";
    if (obstacle.type === "lowBar") {
      ctx.fillRect(obstacle.x + 6, obstacle.y + 4, obstacle.width - 12, 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawPlayer() {
  const bob = game.running ? Math.sin(performance.now() * 0.014) * 1.5 : 0;
  const headY = player.y + 12 + bob;
  const hipY = player.y + 42 + bob;
  const footY = player.y + player.height + bob;
  const torsoX = player.x;
  const slideOffset = player.sliding ? 18 : 0;

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(torsoX, headY, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(torsoX, headY + 12);
  ctx.lineTo(torsoX + slideOffset, hipY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(torsoX - 20, headY + 28);
  ctx.lineTo(torsoX + 18 + slideOffset, headY + 36);
  ctx.stroke();

  if (player.sliding) {
    ctx.beginPath();
    ctx.moveTo(torsoX + slideOffset, hipY);
    ctx.lineTo(torsoX + 34, footY - 18);
    ctx.moveTo(torsoX + slideOffset, hipY);
    ctx.lineTo(torsoX - 4, footY - 12);
    ctx.stroke();
    return;
  }

  const stride = game.running ? Math.sin(performance.now() * 0.024) * 18 : 0;
  ctx.beginPath();
  ctx.moveTo(torsoX, hipY);
  ctx.lineTo(torsoX - 14, footY - stride);
  ctx.moveTo(torsoX, hipY);
  ctx.lineTo(torsoX + 18, footY + stride * 0.5 - 4);
  ctx.stroke();
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (game.cameraShake > 0) {
    ctx.translate((Math.random() - 0.5) * 10 * game.cameraShake, (Math.random() - 0.5) * 8 * game.cameraShake);
  }

  drawBackground();
  drawPlatforms();
  drawCoins();
  drawObstacles();
  drawPlayer();

  ctx.fillStyle = "rgba(255, 247, 237, 0.9)";
  ctx.font = '20px "IBM Plex Mono"';
  ctx.fillText("Jump gaps. Slide bars. Grab coins to grow your streak.", 26, 36);

  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 255, 180, ${game.flashTimer * 1.8})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore();
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.025, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (keys.has(event.code)) {
    return;
  }
  keys.add(event.code);

  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
    jump();
  }

  if (["ArrowDown", "KeyS"].includes(event.code)) {
    slide(true);
  }

  if (event.code === "KeyR") {
    resetGame();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

setOverlay(
  "Bank Runner",
  "Dash across rooftops, grab coins, jump gaps, and slide under blockers. It is simple on purpose, but it gets fast fast.",
  "Start Run"
);
bestEl.textContent = `${Math.floor(game.best)} m`;
draw();
requestAnimationFrame(loop);
