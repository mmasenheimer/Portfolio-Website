class Firefly {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * this.canvas.width;
    this.y = initial
      ? Math.random() * this.canvas.height
      : this.canvas.height * 0.1 + Math.random() * this.canvas.height * 0.8;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.vy = (Math.random() - 0.5) * 0.25 - 0.05;
    this.size = Math.random() * 1.4 + 0.4;
    this.maxAlpha = Math.random() * 0.75 + 0.15;
    this.glowRadius = this.size * (Math.random() * 9 + 7);
    this.phase = Math.random() * Math.PI * 2;
    this.phaseSpeed = Math.random() * 0.018 + 0.007;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = Math.random() * 0.012 + 0.005;
  }

  update() {
    this.phase += this.phaseSpeed;
    this.wobble += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobble) * 0.18;
    this.y += this.vy + Math.cos(this.wobble * 0.7) * 0.1;

    if (this.x < -30) this.x = this.canvas.width + 30;
    if (this.x > this.canvas.width + 30) this.x = -30;
    if (this.y < -30) { this.reset(); }
    if (this.y > this.canvas.height + 30) { this.reset(); }
  }

  get alpha() {
    return this.maxAlpha * (0.5 + 0.5 * Math.sin(this.phase * 2.8));
  }

  draw() {
    const a = this.alpha;
    if (a <= 0.02) return;
    const ctx = this.ctx;
    ctx.save();

    const grad = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.glowRadius
    );
    grad.addColorStop(0, `rgba(191, 255, 107, ${a * 0.65})`);
    grad.addColorStop(0.35, `rgba(140, 210, 55, ${a * 0.18})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(222, 255, 155, ${Math.min(1, a * 1.6)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Leaf {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * (this.canvas.width + 200) - 100;
    this.y = initial ? Math.random() * this.canvas.height : -25;
    this.vx = (Math.random() - 0.5) * 0.7;
    this.vy = Math.random() * 0.55 + 0.25;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.038;
    this.w = Math.random() * 9 + 5;
    this.h = this.w * 0.52;
    this.alpha = Math.random() * 0.45 + 0.15;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = Math.random() * 0.022 + 0.008;
    const palette = [
      '#3a6a1a', '#4a8a25', '#2d5516',
      '#5a9a30', '#3d7020', '#629a35',
      '#567f2a', '#7ab040',
    ];
    this.color = palette[Math.floor(Math.random() * palette.length)];
  }

  update() {
    this.wobble += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobble) * 0.42;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    if (this.y > this.canvas.height + 25) this.reset();
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w, this.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 20, 0, 0.25)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(-this.w * 0.82, 0);
    ctx.lineTo(this.w * 0.82, 0);
    ctx.stroke();
    ctx.restore();
  }
}

export function initParticles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  container.appendChild(canvas);

  function resize() {
    const rect = container.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
  }
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const fireflies = Array.from({ length: 38 }, () => new Firefly(canvas));
  const leaves = Array.from({ length: 14 }, () => new Leaf(canvas));

  let animId;

  function animate() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    leaves.forEach(l => { l.update(); l.draw(); });
    fireflies.forEach(f => { f.update(); f.draw(); });
    animId = requestAnimationFrame(animate);
  }

  animate();

  return () => {
    cancelAnimationFrame(animId);
    ro.disconnect();
  };
}
