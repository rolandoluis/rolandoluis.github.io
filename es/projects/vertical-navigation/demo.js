const canvas = document.getElementById('canvas-nodes');
const ctx = canvas.getContext('2d');
let particles = [];
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
class Particle {
  constructor() {
    this.reset(true);
  }
  reset(initial = false) {
    this.x = initial ? Math.random() * canvas.width : canvas.width + Math.random() * 80;
    this.y = initial ? Math.random() * canvas.height : canvas.height * (0.35 + Math.random() * 0.65);
    this.vx = -(0.35 + Math.random() * 0.55);
    this.vy = -(0.04 + Math.random() * 0.18);
    this.size = 0.7 + Math.random() * 0.9;
    this.life = 110 + Math.random() * 70;
    this.trail = [];
    this.maxTrail = 8 + Math.floor(Math.random() * 8);
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.x * 0.008) * 0.05;
    this.life -= 1;
    if (this.x < canvas.width * 0.08 || this.y < -30 || this.life <= 0) {
      this.reset();
    }
  }
  draw() {
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 0.45;
      ctx.strokeStyle = 'rgba(100, 216, 255, 0.035)';
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = 'rgba(100, 216, 255, 0.22)';
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
function initParticles() {
  particles = Array.from({ length: 28 }, () => new Particle());
}
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const particle of particles) {
    particle.update();
    particle.draw();
  }
  requestAnimationFrame(animate);
}
window.addEventListener('resize', resize);
resize();
initParticles();
animate();