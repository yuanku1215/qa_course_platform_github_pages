// assets/js/background.js
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initBackground() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (prefersReducedMotion()) {
      drawStatic(ctx, canvas);
      window.addEventListener('resize', () => drawStatic(ctx, canvas));
      return;
    }

    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const blobs = [];
    const particles = [];
    let w = 0;
    let h = 0;
    let t0 = performance.now();

    function resize() {
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function init() {
      resize();
      blobs.length = 0;
      particles.length = 0;

      for (let i = 0; i < 5; i++) {
        blobs.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(260, 520),
          vx: rand(-0.10, 0.10),
          vy: rand(-0.10, 0.10),
          phase: rand(0, Math.PI * 2),
          hue: rand(12, 38)
        });
      }

      const pCount = Math.floor(Math.min(160, Math.max(80, (w * h) / 18000)));
      for (let i = 0; i < pCount; i++) {
        particles.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.8, 1.8),
          vx: rand(-0.08, 0.08),
          vy: rand(-0.05, 0.05),
          a: rand(0.05, 0.18)
        });
      }
    }

    function draw(time) {
      const dt = Math.min(40, time - t0);
      t0 = time;

      ctx.clearRect(0, 0, w, h);

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#070b14');
      g.addColorStop(0.55, '#120a10');
      g.addColorStop(1, '#1a0b0b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (const b of blobs) {
        b.phase += dt * 0.00018;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        const wobble = Math.sin(b.phase) * 0.22;
        const rr = b.r * (1 + wobble);

        if (b.x < -rr) b.x = w + rr;
        if (b.x > w + rr) b.x = -rr;
        if (b.y < -rr) b.y = h + rr;
        if (b.y > h + rr) b.y = -rr;

        const rg = ctx.createRadialGradient(b.x, b.y, rr * 0.15, b.x, b.y, rr);
        rg.addColorStop(0, `hsla(${b.hue}, 95%, 60%, 0.18)`);
        rg.addColorStop(0.55, `hsla(${b.hue + 18}, 95%, 58%, 0.10)`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.fillStyle = `rgba(255, 211, 106, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', init);
    init();
    requestAnimationFrame(draw);
  }

  function drawStatic(ctx, canvas) {
    const ww = window.innerWidth;
    const hh = window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    canvas.width = Math.floor(ww * dpr);
    canvas.height = Math.floor(hh * dpr);
    canvas.style.width = `${ww}px`;
    canvas.style.height = `${hh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const g = ctx.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, '#070b14');
    g.addColorStop(0.55, '#120a10');
    g.addColorStop(1, '#1a0b0b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ww, hh);

    const stars = Math.floor(Math.min(140, Math.max(60, (ww * hh) / 24000)));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < stars; i++) {
      const x = Math.random() * ww;
      const y = Math.random() * hh;
      const r = Math.random() * 1.6 + 0.4;
      const a = Math.random() * 0.14 + 0.05;
      ctx.fillStyle = `rgba(255, 211, 106, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  window.Background = { initBackground };
})();
