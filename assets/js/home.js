// assets/js/home.js
(function () {
  "use strict";

  const DATA_URL = "data/courses.json";

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

  function toCourseIdNumber(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  }

  function getTrackById(courseId) {
    const n = toCourseIdNumber(courseId);
    if (n >= 100 && n < 200) return "modeling";
    if (n >= 200 && n < 300) return "quantum";
    if (n >= 300 && n < 400) return "demo";
    return "other";
  }

  function trackMeta(track) {
    if (track === "modeling") {
      return {
        badge: "M",
        title: "Modeling and algorithm foundations",
        desc: "Learn how to define variables, constraints, objectives, and common NP hard patterns that lead to QUBO and heuristic solvers."
      };
    }
    if (track === "quantum") {
      return {
        badge: "Q",
        title: "Quantum annealing concepts",
        desc: "Understand Ising and QUBO mapping, annealing intuition, and what simulated quantum annealing is doing under the hood."
      };
    }
    if (track === "demo") {
      return {
        badge: "D",
        title: "Demos and applications",
        desc: "Run practical demos and modify templates for routing and scheduling. Focus on what you can reuse in your own projects."
      };
    }
    return {
      badge: "O",
      title: "Other",
      desc: "Miscellaneous content."
    };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function buildTrackCard(meta, stats) {
    const card = el("article", "trackCard");

    const head = el("div", "trackHead");

    const badge = el("div", "trackBadge", meta.badge);

    const headText = el("div", "");

    const title = el("h3", "trackTitle", meta.title);

    const statsLine = el("div", "mutedSmall trackStats",
      `${stats.courseCount} courses, ${stats.lessonCount} lessons, ${stats.minuteCount} minutes`
    );

    headText.appendChild(title);
    headText.appendChild(statsLine);

    head.appendChild(badge);
    head.appendChild(headText);

    const desc = el("p", "muted trackDesc", meta.desc);

    card.appendChild(head);
    card.appendChild(desc);

    return card;
  }

  function buildHighlightRow(course, track) {
    const row = el("div", "courseRow");

    const info = el("div", "courseInfo");
    const code = el("span", "courseCode", String(course.id || ""));
    const name = el("h3", "courseName", String(course.title || "Untitled"));
    const sub = el("div", "mutedSmall", trackMeta(track).title);

    info.appendChild(code);
    info.appendChild(name);
    info.appendChild(sub);

    const actions = el("div", "courseActions");
    const open = el("a", "btn btnPrimary btnTiny", "Open");
    open.href = `course.html?course=${encodeURIComponent(course.id || "")}`;
    actions.appendChild(open);

    const viewAll = el("a", "btn btnGhost btnTiny", "Lessons");
    viewAll.href = "lessons.html";
    actions.appendChild(viewAll);

    row.appendChild(info);
    row.appendChild(actions);
    return row;
  }

  // Background
  if (window.Background && typeof window.Background.initBackground === "function") {
    window.Background.initBackground();
  }

  // KPI placeholders
  const kpiCoursesEl = $("kpiCourses");
  const kpiLessonsEl = $("kpiLessons");
  const kpiMinutesEl = $("kpiMinutes");

  setText(kpiCoursesEl, "...");
  setText(kpiLessonsEl, "...");
  setText(kpiMinutesEl, "...");

  fetch(DATA_URL, { cache: "force-cache" })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const courses = Array.isArray(data && data.courses) ? data.courses : [];

      let totalLessons = 0;
      let totalMinutes = 0;

      const byTrack = {
        modeling: { courses: [], lessonCount: 0, minuteCount: 0 },
        quantum: { courses: [], lessonCount: 0, minuteCount: 0 },
        demo: { courses: [], lessonCount: 0, minuteCount: 0 },
        other: { courses: [], lessonCount: 0, minuteCount: 0 }
      };

      courses.forEach(c => {
        const lessons = Array.isArray(c && c.lessons) ? c.lessons : [];
        const mins = safeNumber(c && c.minutes, 0);

        totalLessons += lessons.length;
        totalMinutes += mins;

        const track = getTrackById(c && c.id);
        const bucket = byTrack[track] || byTrack.other;

        bucket.courses.push(c);
        bucket.lessonCount += lessons.length;
        bucket.minuteCount += mins;
      });

      setText(kpiCoursesEl, String(courses.length));
      setText(kpiLessonsEl, String(totalLessons));
      setText(kpiMinutesEl, String(totalMinutes));

      // Render three glass blocks
      const tracksGrid = $("tracksGrid");
      if (tracksGrid) {
        tracksGrid.innerHTML = "";

        ["modeling", "quantum", "demo"].forEach(track => {
          const meta = trackMeta(track);
          const stats = {
            courseCount: byTrack[track].courses.length,
            lessonCount: byTrack[track].lessonCount,
            minuteCount: byTrack[track].minuteCount
          };
          tracksGrid.appendChild(buildTrackCard(meta, stats));
        });
      }

      // Suggested order line
      const pathLine = $("pathLine");
      if (pathLine) {
        const ids = courses
          .map(c => String(c && c.id ? c.id : ""))
          .filter(Boolean)
          .sort((a, b) => toCourseIdNumber(a) - toCourseIdNumber(b));

        if (ids.length) {
          pathLine.textContent = `Suggested order: ${ids.join(" → ")}.`;
        } else {
          pathLine.textContent = "";
        }
      }

      // Highlights
      const highlightsList = $("highlightsList");
      if (highlightsList) {
        highlightsList.innerHTML = "";

        function pickFirst(track) {
          const list = (byTrack[track] && byTrack[track].courses) ? byTrack[track].courses : [];
          const sorted = list.slice().sort((a, b) => toCourseIdNumber(a.id) - toCourseIdNumber(b.id));
          return sorted[0] || null;
        }

        const h1 = pickFirst("modeling");
        const h2 = pickFirst("quantum");
        const h3 = pickFirst("demo");

        if (h1) highlightsList.appendChild(buildHighlightRow(h1, "modeling"));
        if (h2) highlightsList.appendChild(buildHighlightRow(h2, "quantum"));
        if (h3) highlightsList.appendChild(buildHighlightRow(h3, "demo"));

        if (!h1 && !h2 && !h3) {
          const empty = el("p", "muted", "No courses found. Please check data/courses.json.");
          highlightsList.appendChild(empty);
        }
      }
    })
    .catch(() => {
      setText(kpiCoursesEl, "N/A");
      setText(kpiLessonsEl, "N/A");
      setText(kpiMinutesEl, "N/A");

      const tracksGrid = $("tracksGrid");
      if (tracksGrid) {
        tracksGrid.innerHTML = "";
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Failed to load course data. Please refresh or check data/courses.json.";
        tracksGrid.appendChild(p);
      }
    });
})();
