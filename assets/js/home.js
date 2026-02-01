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
        title: "Modeling and algorithm foundations",
        desc: "Learn how to define variables, constraints, objectives, and common NP hard patterns that lead to QUBO and heuristic solvers.",
        cta: "Open modeling track",
        href: "lessons.html?track=modeling"
      };
    }
    if (track === "quantum") {
      return {
        title: "Quantum annealing concepts",
        desc: "Understand Ising and QUBO mapping, annealing intuition, and what simulated quantum annealing is doing under the hood.",
        cta: "Open quantum track",
        href: "lessons.html?track=quantum"
      };
    }
    if (track === "demo") {
      return {
        title: "Demos and applications",
        desc: "Run practical demos and modify templates for routing and scheduling. Focus on what you can reuse in your own projects.",
        cta: "Open demo track",
        href: "lessons.html?track=demo"
      };
    }
    return {
      title: "Other",
      desc: "Miscellaneous content.",
      cta: "Open lessons",
      href: "lessons.html"
    };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function buildTrackRow(meta, stats) {
    const row = el("div", "courseRow");

    const info = el("div", "courseInfo");
    const badge = el("span", "courseCode", stats.code);
    const name = el("h3", "courseName", meta.title);
    const small = el("div", "mutedSmall", `${stats.courseCount} courses, ${stats.lessonCount} lessons, ${stats.minuteCount} minutes`);

    info.appendChild(badge);
    info.appendChild(name);
    info.appendChild(small);

    const actions = el("div", "courseActions");
    const a = el("a", "btn btnGhost btnTiny", meta.cta);
    a.href = meta.href;
    actions.appendChild(a);

    row.appendChild(info);
    row.appendChild(actions);

    const desc = el("p", "muted");
    desc.style.margin = "10px 0 0 0";
    desc.textContent = meta.desc;

    const wrap = el("div", "");
    wrap.appendChild(row);
    wrap.appendChild(desc);

    return wrap;
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

    const goTrack = el("a", "btn btnGhost btnTiny", "View track");
    goTrack.href = trackMeta(track).href;
    actions.appendChild(goTrack);

    row.appendChild(info);
    row.appendChild(actions);
    return row;
  }

  /* Background */
  if (window.Background && typeof window.Background.initBackground === "function") {
    window.Background.initBackground();
  }

  /* Load data */
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

      let lessonCount = 0;
      let minuteCount = 0;

      const byTrack = {
        modeling: { courses: [], lessonCount: 0, minuteCount: 0, code: "M" },
        quantum: { courses: [], lessonCount: 0, minuteCount: 0, code: "Q" },
        demo: { courses: [], lessonCount: 0, minuteCount: 0, code: "D" },
        other: { courses: [], lessonCount: 0, minuteCount: 0, code: "O" }
      };

      courses.forEach(c => {
        const lessons = Array.isArray(c && c.lessons) ? c.lessons : [];
        const mins = safeNumber(c && c.minutes, 0);
        lessonCount += lessons.length;
        minuteCount += mins;

        const track = getTrackById(c && c.id);
        const bucket = byTrack[track] || byTrack.other;
        bucket.courses.push(c);
        bucket.lessonCount += lessons.length;
        bucket.minuteCount += mins;
      });

      setText(kpiCoursesEl, String(courses.length));
      setText(kpiLessonsEl, String(lessonCount));
      setText(kpiMinutesEl, String(minuteCount));

      const tracksList = $("tracksList");
      if (tracksList) {
        tracksList.innerHTML = "";

        ["modeling", "quantum", "demo"].forEach(track => {
          const meta = trackMeta(track);
          const stats = {
            code: byTrack[track].code,
            courseCount: byTrack[track].courses.length,
            lessonCount: byTrack[track].lessonCount,
            minuteCount: byTrack[track].minuteCount
          };
          tracksList.appendChild(buildTrackRow(meta, stats));
        });
      }

      const pathLine = $("pathLine");
      if (pathLine) {
        const ids = courses
          .map(c => String(c && c.id ? c.id : ""))
          .filter(Boolean)
          .sort((a, b) => toCourseIdNumber(a) - toCourseIdNumber(b));

        if (ids.length) {
          pathLine.textContent = `Suggested order: ${ids.join("  ")}.`;
        } else {
          pathLine.textContent = "";
        }
      }

      const highlightsList = $("highlightsList");
      if (highlightsList) {
        highlightsList.innerHTML = "";

        const pickFirst = (track) => {
          const list = (byTrack[track] && byTrack[track].courses) ? byTrack[track].courses : [];
          const sorted = list.slice().sort((a, b) => toCourseIdNumber(a.id) - toCourseIdNumber(b.id));
          return sorted[0] || null;
        };

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

      const tracksList = $("tracksList");
      if (tracksList) {
        tracksList.innerHTML = "";
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Failed to load course data. Please refresh or check data/courses.json.";
        tracksList.appendChild(p);
      }
    });
})();
