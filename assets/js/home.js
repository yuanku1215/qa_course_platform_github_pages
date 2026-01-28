// assets/js/home.js
(function () {

  /* ======================================================
   *  Dynamic background (canvas)
   *  ====================================================== */

  function initBackground() {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width, height, dpr;
    let particles = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles() {
      const count = Math.floor((width * height) / 18000);
      particles = [];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.6 + Math.random() * 1.4,
          vx: -0.15 + Math.random() * 0.3,
          vy: 0.05 + Math.random() * 0.25,
          a: 0.15 + Math.random() * 0.45
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > height + 20) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) p.x = -10;
        if (p.x < -20) p.x = width + 10;

        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });
  }

  /* ======================================================
   *  Home page logic
   *  ====================================================== */

  const DATA_URL = "data/courses.json";
  const PROGRESS_KEY = "qa_progress_map_v1";

  function $(id) {
    return document.getElementById(id);
  }

  // Init background
  initBackground();

  // KPI loading
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      const courses = data.courses || [];
      let lessonCount = 0;
      let minuteCount = 0;

      courses.forEach(c => {
        lessonCount += c.lessons ? c.lessons.length : 0;
        minuteCount += c.minutes || 0;
      });

      if ($("kpiCourses")) $("kpiCourses").textContent = courses.length;
      if ($("kpiLessons")) $("kpiLessons").textContent = lessonCount;
      if ($("kpiMinutes")) $("kpiMinutes").textContent = minuteCount;
    })
    .catch(() => {
      if ($("kpiCourses")) $("kpiCourses").textContent = "—";
      if ($("kpiLessons")) $("kpiLessons").textContent = "—";
      if ($("kpiMinutes")) $("kpiMinutes").textContent = "—";
    });

  // Continue learning
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;

    const map = JSON.parse(raw);
    let latest = null;

    Object.values(map).forEach(v => {
      if (!latest || v.updated_at > latest.updated_at) {
        latest = v;
      }
    });

    if (!latest) return;

    $("continueSection").style.display = "block";
    $("continueTitle").textContent =
      latest.lesson_title || `Course ${latest.course_id}`;
    $("continueDesc").textContent =
      `Resume your progress in course ${latest.course_id}.`;
    $("continueBtn").href = latest.resume_url || "lessons.html";

    $("clearProgressBtn").onclick = () => {
      localStorage.removeItem(PROGRESS_KEY);
      $("continueSection").style.display = "none";
    };
  } catch {
    // silent
  }

})();
