const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const codeEditor = document.getElementById('codeEditor');
const statusMessage = document.getElementById('statusMessage');
const runButton = document.getElementById('runButton');
const resetButton = document.getElementById('resetButton');

const ROBOT_SIZE = 24;
const MOVE_SPEED_PX_PER_SECOND = 180;
const FIELD_MARGIN = 20;
const FIELD_TILES_PER_SIDE = 6;
const BALL_RADIUS = 7;

let isRunning = false;

const basketTargets = [
  { x: 0.15, y: 0.18, alliance: 'red' },
  { x: 0.15, y: 0.82, alliance: 'red' },
  { x: 0.85, y: 0.18, alliance: 'blue' },
  { x: 0.85, y: 0.82, alliance: 'blue' },
];

const fieldBalls = [
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

function normalizeAngle(angle) {
  return (angle + Math.PI * 2) % (Math.PI * 2);
}

function toFieldPoint(point) {
  return {
    x: fieldRect.x + point.x * fieldRect.size,
    y: fieldRect.y + point.y * fieldRect.size,
  };
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
    ctx.arc(position.x, position.y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  });

  fieldBalls.forEach((ball) => {
    const position = toFieldPoint(ball);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(position.x, position.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function drawRobot() {
  drawField();

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

  ctx.restore();
}

function keepRobotInBounds() {
  const radius = ROBOT_SIZE / 2;
  robot.x = Math.max(fieldRect.x + radius, Math.min(fieldRect.x + fieldRect.size - radius, robot.x));
  robot.y = Math.max(fieldRect.y + radius, Math.min(fieldRect.y + fieldRect.size - radius, robot.y));
}

function animateMove(distance = 20) {
  return new Promise((resolve) => {
    if (distance === 0) {
      drawRobot();
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

      const deltaDistance = Math.min(
        MOVE_SPEED_PX_PER_SECOND * deltaSeconds,
        totalDistance - movedDistance,
      );

      movedDistance += deltaDistance;
      robot.x += directionX * deltaDistance * direction;
      robot.y += directionY * deltaDistance * direction;
      keepRobotInBounds();
      drawRobot();

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

  const commandPattern = /^(moveForward|moveBackward|turnRight|turnLeft)\(([-+]?\d*\.?\d+)?\);?$/;

  isRunning = true;
  runButton.disabled = true;
  statusMessage.textContent = 'Running simulation...';

  try {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const match = line.match(commandPattern);

      if (!match) {
        statusMessage.textContent = `Error on line ${i + 1}: unsupported command "${line}"`;
        drawRobot();
        return;
      }

      const command = match[1];
      const rawValue = match[2];
      const value = rawValue === undefined ? undefined : Number(rawValue);

      if (value !== undefined && Number.isNaN(value)) {
        statusMessage.textContent = `Error on line ${i + 1}: invalid number in "${line}"`;
        drawRobot();
        return;
      }

      if (command === 'moveForward') {
        await moveForward(value ?? 20);
      } else if (command === 'moveBackward') {
        await moveBackward(value ?? 20);
      } else if (command === 'turnRight') {
        turnRight(value ?? 90);
        drawRobot();
      } else if (command === 'turnLeft') {
        turnLeft(value ?? 90);
        drawRobot();
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
  statusMessage.textContent = 'Robot reset to center of the FTC-style field.';
  drawRobot();
}

runButton.addEventListener('click', runSimulation);
resetButton.addEventListener('click', resetRobot);

window.addEventListener('load', () => {
  drawRobot();
  statusMessage.textContent = 'FTC-style board initialized. Red and Blue alliances loaded.';
});
