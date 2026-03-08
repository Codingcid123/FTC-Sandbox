const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

const robot = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  angle: 0,
};

function drawRobot() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(robot.x, robot.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#2a9d8f';
  ctx.fill();

  const directionX = robot.x + Math.cos(robot.angle) * 18;
  const directionY = robot.y + Math.sin(robot.angle) * 18;
  ctx.beginPath();
  ctx.moveTo(robot.x, robot.y);
  ctx.lineTo(directionX, directionY);
  ctx.strokeStyle = '#1d3557';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function moveForward(distance = 20) {
  robot.x += Math.cos(robot.angle) * distance;
  robot.y += Math.sin(robot.angle) * distance;

  robot.x = Math.max(12, Math.min(canvas.width - 12, robot.x));
  robot.y = Math.max(12, Math.min(canvas.height - 12, robot.y));
}

function runSimulation() {
  moveForward();
  drawRobot();
}

function resetRobot() {
  robot.x = canvas.width / 2;
  robot.y = canvas.height / 2;
  robot.angle = 0;
  drawRobot();
}

document.getElementById('runButton').addEventListener('click', runSimulation);
document.getElementById('resetButton').addEventListener('click', resetRobot);

window.addEventListener('load', drawRobot);
