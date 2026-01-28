// assets/js/home.js
(function () {

  /* ======================================================
   *  Home page only logic
   *  ====================================================== */

  const DATA_URL = "data/courses.json";
  const PROGRESS_KEY = "qa_progress_map_v1";

  function $(id) {
    return document.getElementById(id);
  }

  /* ---------- Background ---------- */
  // Use shared background implementation
  if (window.Background && typeof window.Background.initBackground === "function") {
    window.Background.initBackground();
  }

  /* ---------- KPI loading ---------- */
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      const courses = data.courses || [];
      let lessonCount = 0;
      let minuteCount = 0;

      courses.forEach(c => {
        lessonCount += Array.isArray(c.lessons) ? c.lessons.length : 0;
        minuteCount += Number(c.minutes) || 0;
      });

      if ($("kpiCourses")) $("kpiCourses").textContent = String(courses.length);
      if ($("kpiLessons")) $("kpiLessons").textContent = String(lessonCount);
      if ($("kpiMinutes")) $("kpiMinutes").textContent = String(minuteCount);
    })
    .catch(() => {
      if ($("kpiCourses")) $("kpiCourses").textContent = "—";
      if ($("kpiLessons")) $("kpiLessons").textContent = "—";
      if ($("kpiMinutes")) $("kpiMinutes").textContent = "—";
    });

  /* ---------- Continue learning ---------- */
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

    const section = $("continueSection");
    if (!section) return;

    section.style.display = "";

    if ($("continueTitle")) {
      $("continueTitle").textContent =
        latest.lesson_title || `Course ${latest.course_id}`;
    }

    if ($("continueDesc")) {
      $("continueDesc").textContent =
        `Resume your progress in course ${latest.course_id}.`;
    }

    if ($("continueBtn")) {
      $("continueBtn").href = latest.resume_url || "lessons.html";
    }

    if ($("clearProgressBtn")) {
      $("clearProgressBtn").onclick = () => {
        localStorage.removeItem(PROGRESS_KEY);
        section.style.display = "none";
      };
    }

  } catch {
    // silent fail, homepage should never break
  }

})();
