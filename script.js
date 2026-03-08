const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const codeEditor = document.getElementById('codeEditor');
const statusMessage = document.getElementById('statusMessage');
const runButton = document.getElementById('runButton');
const resetButton = document.getElementById('resetButton');
const scoreValue = document.getElementById('scoreValue');
const heldValue = document.getElementById('heldValue');

const ROBOT_SIZE = 24;
const ROBOT_RADIUS = ROBOT_SIZE / 2;
const MOVE_SPEED_PX_PER_SECOND = 180;
const FIELD_MARGIN = 20;
const FIELD_TILES_PER_SIDE = 6;
const BALL_RADIUS = 7;
const BALL_DRAG_PER_SECOND = 0.25;
const BOUNCE_FACTOR = 0.7;
const INTAKE_RADIUS = 26;
const MAX_HELD_BALLS = 2;
const SHOOT_POWER_MIN = 80;
const SHOOT_POWER_MAX = 500;

let isRunning = false;
let score = 0;

const basketTargets = [
  { x: 0.15, y: 0.18, alliance: 'red', radius: 14 },
  { x: 0.15, y: 0.82, alliance: 'red', radius: 14 },
  { x: 0.85, y: 0.18, alliance: 'blue', radius: 14 },
  { x: 0.85, y: 0.82, alliance: 'blue', radius: 14 },
];

const fieldBallStarts = [
  { x: 0.25, y: 0.3 },
  { x: 0.25, y: 0.5 },
  { x: 0.25, y: 0.7 },
  { x: 0.38, y: 0.22 },
  { x: 0.38, y: 0.78 },
  { x: 0.5, y: 0.35 },
  { x: 0.5, y: 0.65 },
  { x: 0.62, y: 0.22 },
  { x: 0.62, y: 0.78 },
  { x: 0.75, y: 0.3 },
  { x: 0.75, y: 0.5 },
  { x: 0.75, y: 0.7 },
];

function getFieldRect() {
  const size = Math.min(canvas.width, canvas.height) - FIELD_MARGIN * 2;
  return {
    x: (canvas.width - size) / 2,
    y: (canvas.height - size) / 2,
    size,
  };
}

const fieldRect = getFieldRect();
const robot = {
  x: fieldRect.x + fieldRect.size / 2,
  y: fieldRect.y + fieldRect.size / 2,
  angle: 0,
};

let balls = [];

function normalizeAngle(angle) {
  return (angle + Math.PI * 2) % (Math.PI * 2);
}

function toFieldPoint(point) {
  return {
    x: fieldRect.x + point.x * fieldRect.size,
    y: fieldRect.y + point.y * fieldRect.size,
  };
}

function initializeBalls() {
  balls = fieldBallStarts.map((start, index) => {
    const point = toFieldPoint(start);
    return {
      id: index,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      held: false,
      scored: false,
    };
  });
}

function getHeldCount() {
  return balls.filter((ball) => ball.held && !ball.scored).length;
}

function updateHud() {
  scoreValue.textContent = String(score);
  heldValue.textContent = String(getHeldCount());
}

function drawField() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fieldRect.x, fieldRect.y, fieldRect.size, fieldRect.size);

  ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
  ctx.fillRect(fieldRect.x, fieldRect.y, fieldRect.size / 2, fieldRect.size);

  ctx.fillStyle = 'rgba(37, 99, 235, 0.18)';
  ctx.fillRect(fieldRect.x + fieldRect.size / 2, fieldRect.y, fieldRect.size / 2, fieldRect.size);

  const tileSize = fieldRect.size / FIELD_TILES_PER_SIDE;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= FIELD_TILES_PER_SIDE; i += 1) {
    const offset = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(fieldRect.x + offset, fieldRect.y);
    ctx.lineTo(fieldRect.x + offset, fieldRect.y + fieldRect.size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(fieldRect.x, fieldRect.y + offset);
    ctx.lineTo(fieldRect.x + fieldRect.size, fieldRect.y + offset);
    ctx.stroke();
  }

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(fieldRect.x, fieldRect.y, fieldRect.size, fieldRect.size);

  ctx.strokeStyle = '#f8fafc';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(fieldRect.x + fieldRect.size / 2, fieldRect.y);
  ctx.lineTo(fieldRect.x + fieldRect.size / 2, fieldRect.y + fieldRect.size);
  ctx.stroke();
  ctx.setLineDash([]);

  basketTargets.forEach((basket) => {
    const position = toFieldPoint(basket);
    const fill = basket.alliance === 'red' ? '#dc2626' : '#2563eb';

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(position.x, position.y, basket.radius + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, basket.radius - 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawBalls() {
  balls.forEach((ball) => {
    if (ball.held || ball.scored) {
      return;
    }

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function drawRobot() {
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.angle);

  ctx.fillStyle = '#64748b';
  ctx.fillRect(-ROBOT_SIZE / 2 - 4, -ROBOT_SIZE / 2, 4, ROBOT_SIZE);
  ctx.fillRect(ROBOT_SIZE / 2, -ROBOT_SIZE / 2, 4, ROBOT_SIZE);

  ctx.fillStyle = '#2a9d8f';
  ctx.fillRect(-ROBOT_SIZE / 2, -ROBOT_SIZE / 2, ROBOT_SIZE, ROBOT_SIZE);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-6, -ROBOT_SIZE / 2 + 4, 12, 8);

  ctx.strokeStyle = '#1d3557';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ROBOT_SIZE / 2 + 12, 0);
  ctx.stroke();

  const heldCount = getHeldCount();
  for (let i = 0; i < heldCount; i += 1) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-6 + i * 10, -ROBOT_SIZE / 2 - 6, BALL_RADIUS - 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function render() {
  drawField();
  drawBalls();
  drawRobot();
}

function keepRobotInBounds() {
  robot.x = Math.max(fieldRect.x + ROBOT_RADIUS, Math.min(fieldRect.x + fieldRect.size - ROBOT_RADIUS, robot.x));
  robot.y = Math.max(fieldRect.y + ROBOT_RADIUS, Math.min(fieldRect.y + fieldRect.size - ROBOT_RADIUS, robot.y));
}

function resolveRobotBallContacts(robotVx, robotVy) {
  balls.forEach((ball) => {
    if (ball.held || ball.scored) {
      return;
    }

    const dx = ball.x - robot.x;
    const dy = ball.y - robot.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = ROBOT_RADIUS + BALL_RADIUS;

    if (distance < minDistance) {
      const nx = distance === 0 ? Math.cos(robot.angle) : dx / distance;
      const ny = distance === 0 ? Math.sin(robot.angle) : dy / distance;
      const overlap = minDistance - distance;

      robot.x -= nx * overlap * 0.5;
      robot.y -= ny * overlap * 0.5;
      keepRobotInBounds();

      ball.x += nx * overlap * 0.5;
      ball.y += ny * overlap * 0.5;

      ball.vx += robotVx * 0.22;
      ball.vy += robotVy * 0.22;
    }
  });
}

function keepBallInBounds(ball) {
  const minX = fieldRect.x + BALL_RADIUS;
  const maxX = fieldRect.x + fieldRect.size - BALL_RADIUS;
  const minY = fieldRect.y + BALL_RADIUS;
  const maxY = fieldRect.y + fieldRect.size - BALL_RADIUS;

  if (ball.x < minX) {
    ball.x = minX;
    ball.vx *= -BOUNCE_FACTOR;
  } else if (ball.x > maxX) {
    ball.x = maxX;
    ball.vx *= -BOUNCE_FACTOR;
  }

  if (ball.y < minY) {
    ball.y = minY;
    ball.vy *= -BOUNCE_FACTOR;
  } else if (ball.y > maxY) {
    ball.y = maxY;
    ball.vy *= -BOUNCE_FACTOR;
  }
}

function checkBasketScore(ball) {
  for (let i = 0; i < basketTargets.length; i += 1) {
    const basket = basketTargets[i];
    const target = toFieldPoint(basket);
    const distance = Math.hypot(target.x - ball.x, target.y - ball.y);

    if (distance <= basket.radius - 3) {
      ball.scored = true;
      ball.held = false;
      ball.vx = 0;
      ball.vy = 0;
      score += 1;
      updateHud();
      statusMessage.textContent = `Scored! Total score: ${score}`;
      return;
    }
  }
}

function updateBallPhysics(deltaSeconds) {
  const drag = Math.pow(BALL_DRAG_PER_SECOND, deltaSeconds);

  balls.forEach((ball) => {
    if (ball.held || ball.scored) {
      return;
    }

    ball.x += ball.vx * deltaSeconds;
    ball.y += ball.vy * deltaSeconds;
    ball.vx *= drag;
    ball.vy *= drag;

    if (Math.hypot(ball.vx, ball.vy) < 4) {
      ball.vx = 0;
      ball.vy = 0;
    }

    keepBallInBounds(ball);
    checkBasketScore(ball);
  });
}

function intakeBalls() {
  const availableSlots = MAX_HELD_BALLS - getHeldCount();
  if (availableSlots <= 0) {
    statusMessage.textContent = `Intake full (${MAX_HELD_BALLS} balls max).`;
    return;
  }

  const candidates = balls
    .filter((ball) => !ball.held && !ball.scored)
    .map((ball) => ({ ball, distance: Math.hypot(ball.x - robot.x, ball.y - robot.y) }))
    .filter((entry) => entry.distance <= INTAKE_RADIUS)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, availableSlots);

  candidates.forEach((entry) => {
    entry.ball.held = true;
    entry.ball.vx = 0;
    entry.ball.vy = 0;
  });

  if (candidates.length > 0) {
    statusMessage.textContent = `Intook ${candidates.length} ball${candidates.length === 1 ? '' : 's'}.`;
  } else {
    statusMessage.textContent = 'No ball close enough to intake.';
  }

  updateHud();
}

function shootBall(power = 220) {
  const clampedPower = Math.max(SHOOT_POWER_MIN, Math.min(SHOOT_POWER_MAX, power));
  const heldBall = balls.find((ball) => ball.held && !ball.scored);

  if (!heldBall) {
    statusMessage.textContent = 'No held balls to shoot.';
    return;
  }

  heldBall.held = false;
  heldBall.x = robot.x + Math.cos(robot.angle) * (ROBOT_RADIUS + BALL_RADIUS + 2);
  heldBall.y = robot.y + Math.sin(robot.angle) * (ROBOT_RADIUS + BALL_RADIUS + 2);
  heldBall.vx = Math.cos(robot.angle) * clampedPower;
  heldBall.vy = Math.sin(robot.angle) * clampedPower;

  keepBallInBounds(heldBall);
  updateHud();
  statusMessage.textContent = `Shot ball at power ${Math.round(clampedPower)}.`;
}

function animateMove(distance = 20) {
  return new Promise((resolve) => {
    if (distance === 0) {
      resolve();
      return;
    }

    const directionX = Math.cos(robot.angle);
    const directionY = Math.sin(robot.angle);
    const direction = Math.sign(distance);
    const totalDistance = Math.abs(distance);
    let movedDistance = 0;
    let lastTimestamp;

    function step(timestamp) {
      if (lastTimestamp === undefined) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const robotStep = Math.min(MOVE_SPEED_PX_PER_SECOND * deltaSeconds, totalDistance - movedDistance);

      movedDistance += robotStep;
      const robotVx = directionX * MOVE_SPEED_PX_PER_SECOND * direction;
      const robotVy = directionY * MOVE_SPEED_PX_PER_SECOND * direction;

      robot.x += directionX * robotStep * direction;
      robot.y += directionY * robotStep * direction;
      keepRobotInBounds();
      resolveRobotBallContacts(robotVx, robotVy);

      if (movedDistance >= totalDistance) {
        resolve();
      } else {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  });
}

function moveForward(distance = 20) {
  return animateMove(distance);
}

function moveBackward(distance = 20) {
  return animateMove(-distance);
}

function turnRight(degrees = 90) {
  const radians = (degrees * Math.PI) / 180;
  robot.angle = normalizeAngle(robot.angle + radians);
}

function turnLeft(degrees = 90) {
  const radians = (degrees * Math.PI) / 180;
  robot.angle = normalizeAngle(robot.angle - radians);
}

async function runSimulation() {
  if (isRunning) {
    return;
  }

  const lines = codeEditor.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));

  const commandPattern = /^(moveForward|moveBackward|turnRight|turnLeft|intake|shoot)\(([-+]?\d*\.?\d+)?\);?$/;

  isRunning = true;
  runButton.disabled = true;
  statusMessage.textContent = 'Running simulation...';

  try {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const match = line.match(commandPattern);

      if (!match) {
        statusMessage.textContent = `Error on line ${i + 1}: unsupported command "${line}"`;
        return;
      }

      const command = match[1];
      const rawValue = match[2];
      const value = rawValue === undefined ? undefined : Number(rawValue);

      if (value !== undefined && Number.isNaN(value)) {
        statusMessage.textContent = `Error on line ${i + 1}: invalid number in "${line}"`;
        return;
      }

      if (command === 'moveForward') {
        await moveForward(value ?? 20);
      } else if (command === 'moveBackward') {
        await moveBackward(value ?? 20);
      } else if (command === 'turnRight') {
        turnRight(value ?? 90);
      } else if (command === 'turnLeft') {
        turnLeft(value ?? 90);
      } else if (command === 'intake') {
        intakeBalls();
      } else if (command === 'shoot') {
        shootBall(value ?? 220);
      }
    }

    statusMessage.textContent = `Executed ${lines.length} command${lines.length === 1 ? '' : 's'} successfully.`;
  } finally {
    runButton.disabled = false;
    isRunning = false;
  }
}

function resetRobot() {
  if (isRunning) {
    return;
  }

  robot.x = fieldRect.x + fieldRect.size / 2;
  robot.y = fieldRect.y + fieldRect.size / 2;
  robot.angle = 0;
  score = 0;
  initializeBalls();
  updateHud();
  statusMessage.textContent = 'Field reset. Score cleared.';
}

let lastFrameTime;
function simulationFrame(timestamp) {
  if (lastFrameTime === undefined) {
    lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;

  updateBallPhysics(deltaSeconds);
  render();
  requestAnimationFrame(simulationFrame);
}

runButton.addEventListener('click', runSimulation);
resetButton.addEventListener('click', resetRobot);

window.addEventListener('load', () => {
  initializeBalls();
  updateHud();
  requestAnimationFrame(simulationFrame);
  statusMessage.textContent = 'FTC-style board initialized. Use intake() and shoot(power).';
});
