const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const codeEditor = document.getElementById('codeEditor');
const statusMessage = document.getElementById('statusMessage');

const ROBOT_SIZE = 24;

const robot = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  angle: 0,
};

function normalizeAngle(angle) {
  return (angle + Math.PI * 2) % (Math.PI * 2);
}

function drawRobot() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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
  robot.x = Math.max(radius, Math.min(canvas.width - radius, robot.x));
  robot.y = Math.max(radius, Math.min(canvas.height - radius, robot.y));
}

function moveForward(distance = 20) {
  robot.x += Math.cos(robot.angle) * distance;
  robot.y += Math.sin(robot.angle) * distance;
  keepRobotInBounds();
}

function moveBackward(distance = 20) {
  moveForward(-distance);
}

function turnRight(degrees = 90) {
  const radians = (degrees * Math.PI) / 180;
  robot.angle = normalizeAngle(robot.angle + radians);
}

function turnLeft(degrees = 90) {
  const radians = (degrees * Math.PI) / 180;
  robot.angle = normalizeAngle(robot.angle - radians);
}

function runSimulation() {
  const lines = codeEditor.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));

  const commandPattern = /^(moveForward|moveBackward|turnRight|turnLeft)\(([-+]?\d*\.?\d+)?\);?$/;

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
      moveForward(value ?? 20);
    } else if (command === 'moveBackward') {
      moveBackward(value ?? 20);
    } else if (command === 'turnRight') {
      turnRight(value ?? 90);
    } else if (command === 'turnLeft') {
      turnLeft(value ?? 90);
    }
  }

  drawRobot();
  statusMessage.textContent = `Executed ${lines.length} command${lines.length === 1 ? '' : 's'} successfully.`;
}

function resetRobot() {
  robot.x = canvas.width / 2;
  robot.y = canvas.height / 2;
  robot.angle = 0;
  statusMessage.textContent = 'Robot reset to center.';
  drawRobot();
}

document.getElementById('runButton').addEventListener('click', runSimulation);
document.getElementById('resetButton').addEventListener('click', resetRobot);

window.addEventListener('load', () => {
  drawRobot();
  statusMessage.textContent = 'Robot initialized at center.';
});
