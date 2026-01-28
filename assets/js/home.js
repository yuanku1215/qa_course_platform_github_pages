// assets/js/home.js

(function () {
  const DATA_URL = "data/courses.json";
  const PROGRESS_KEY = "qa_progress_map_v1";

  function qs(id) {
    return document.getElementById(id);
  }

  // Background
  if (window.App && typeof window.App.initBackground === "function") {
    window.App.initBackground();
  }

  // Load KPIs
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      const courses = data.courses || [];

      let lessonCount = 0;
      let minuteCount = 0;

      courses.forEach(c => {
        lessonCount += (c.lessons ? c.lessons.length : 0);
        minuteCount += c.minutes || 0;
      });

      if (qs("kpiCourses")) qs("kpiCourses").textContent = courses.length;
      if (qs("kpiLessons")) qs("kpiLessons").textContent = lessonCount;
      if (qs("kpiMinutes")) qs("kpiMinutes").textContent = minuteCount;
    })
    .catch(() => {
      if (qs("kpiCourses")) qs("kpiCourses").textContent = "—";
      if (qs("kpiLessons")) qs("kpiLessons").textContent = "—";
      if (qs("kpiMinutes")) qs("kpiMinutes").textContent = "—";
    });

  // Continue progress
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;

    const map = JSON.parse(raw);
    const keys = Object.keys(map);
    if (!keys.length) return;

    // pick latest
    let latest = null;
    keys.forEach(k => {
      const v = map[k];
      if (!latest || v.updated_at > latest.updated_at) {
        latest = v;
      }
    });

    if (!latest) return;

    qs("continueSection").style.display = "block";
    qs("continueTitle").textContent =
      latest.lesson_title || `Course ${latest.course_id}`;
    qs("continueDesc").textContent =
      `Resume your progress in course ${latest.course_id}.`;
    qs("continueBtn").href = latest.resume_url || "lessons.html";

    qs("clearProgressBtn").onclick = () => {
      localStorage.removeItem(PROGRESS_KEY);
      qs("continueSection").style.display = "none";
    };
  } catch {
    // silent
  }

})();
