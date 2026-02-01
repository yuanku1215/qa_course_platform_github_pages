// assets/js/home.js
(function () {
  "use strict";

  /* ======================================================
   *  Home page only logic
   *  ====================================================== */

  const DATA_URL = "data/courses.json";
  const PROGRESS_KEY = "qa_progress_map_v1";

  const DEBUG = location.hostname === "localhost";

  function $(id) {
    return document.getElementById(id);
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  function safeNumber(n, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
  }

  function parseTime(value) {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }

  // Only allow relative URLs (basic hardening)
  function safeRelativeUrl(url, fallback) {
    if (typeof url !== "string") return fallback;
    const u = url.trim();
    if (!u) return fallback;
    if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("//")) return fallback;
    if (u.startsWith("javascript:")) return fallback;
    return u;
  }

  /* ---------- Background ---------- */
  if (window.Background && typeof window.Background.initBackground === "function") {
    window.Background.initBackground();
  }

  /* ---------- KPI loading ---------- */
  const kpiCoursesEl = $("kpiCourses");
  const kpiLessonsEl = $("kpiLessons");
  const kpiMinutesEl = $("kpiMinutes");

  // show loading placeholders to avoid layout jump
  setText(kpiCoursesEl, "...");
  setText(kpiLessonsEl, "...");
  setText(kpiMinutesEl, "...");

  (function loadKpis() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(DATA_URL, {
      cache: "force-cache",
      signal: controller.signal
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const courses = Array.isArray(data?.courses) ? data.courses : [];

        let lessonCount = 0;
        let minuteCount = 0;

        courses.forEach(c => {
          const lessons = Array.isArray(c?.lessons) ? c.lessons : [];
          lessonCount += lessons.length;
          minuteCount += safeNumber(c?.minutes, 0);
        });

        setText(kpiCoursesEl, String(courses.length));
        setText(kpiLessonsEl, String(lessonCount));
        setText(kpiMinutesEl, String(minuteCount));
      })
      .catch(err => {
        if (DEBUG) console.warn("KPI load failed:", err);
        setText(kpiCoursesEl, "N/A");
        setText(kpiLessonsEl, "N/A");
        setText(kpiMinutesEl, "N/A");
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  })();

  /* ---------- Continue learning ---------- */
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;

    const map = JSON.parse(raw);
    if (!map || typeof map !== "object") return;

    let latest = null;
    let latestTime = 0;

    Object.values(map).forEach(v => {
      if (!v || typeof v !== "object") return;
      const t = parseTime(v.updated_at);
      if (!latest || t > latestTime) {
        latest = v;
        latestTime = t;
      }
    });

    if (!latest) return;

    const section = $("continueSection");
    if (!section) return;

    section.style.display = "";

    const titleEl = $("continueTitle");
    const descEl = $("continueDesc");
    const btnEl = $("continueBtn");
    const clearBtnEl = $("clearProgressBtn");

    setText(titleEl, latest.lesson_title || `Course ${latest.course_id || ""}`.trim());
    setText(descEl, `Resume your progress in course ${latest.course_id || ""}.`.trim());

    if (btnEl) {
      const fallback = "lessons.html";
      btnEl.href = safeRelativeUrl(latest.resume_url, fallback);
    }

    if (clearBtnEl) {
      clearBtnEl.onclick = () => {
        // remove the main progress key
        localStorage.removeItem(PROGRESS_KEY);

        // optional: remove legacy keys by prefix, if you add them later
        // for (let i = localStorage.length - 1; i >= 0; i--) {
        //   const key = localStorage.key(i);
        //   if (key && key.startsWith("qa_progress_")) localStorage.removeItem(key);
        // }

        section.style.display = "none";
      };
    }
  } catch (err) {
    if (DEBUG) console.warn("Continue learning failed:", err);
    // silent fail, homepage should never break
  }
})();
