// assets/js/lessons.js
(function () {
  "use strict";

  const DATA_URL = "data/courses.json";
  const list = document.getElementById("lessonList");

  if (!list) return;

  // Background
  if (window.Background && typeof window.Background.initBackground === "function") {
    window.Background.initBackground();
  }

  const params = new URLSearchParams(window.location.search);
  const track = (params.get("track") || "").toLowerCase();

  function toIdNumber(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  }

  function inTrack(course) {
    if (!track) return true;

    const n = toIdNumber(course && course.id);

    if (track === "modeling") return n >= 100 && n < 200;
    if (track === "quantum") return n >= 200 && n < 300;
    if (track === "demo") return n >= 300 && n < 400;

    // unknown track value, show all
    return true;
  }

  function setDisabledLink(a) {
    a.removeAttribute("href");
    a.setAttribute("aria-disabled", "true");
    a.tabIndex = -1;
  }

  function setLinkOrDisable(a, href) {
    if (typeof href === "string" && href.trim()) {
      a.setAttribute("href", href.trim());
      a.removeAttribute("aria-disabled");
      a.tabIndex = 0;
    } else {
      setDisabledLink(a);
    }
  }

  function buildRow(course) {
    const row = document.createElement("div");
    row.className = "courseRow";

    const info = document.createElement("div");
    info.className = "courseInfo";

    const code = document.createElement("span");
    code.className = "courseCode";
    code.textContent = String(course.id || "");

    const name = document.createElement("h3");
    name.className = "courseName";
    name.textContent = String(course.title || "Untitled");

    info.appendChild(code);
    info.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "courseActions";

    const aSlides = document.createElement("a");
    aSlides.className = "btn btnGhost btnTiny";
    aSlides.textContent = "Keynote";
    setLinkOrDisable(aSlides, course.downloads && course.downloads.slides);

    const aPdf = document.createElement("a");
    aPdf.className = "btn btnGhost btnTiny";
    aPdf.textContent = "PDF";
    setLinkOrDisable(aPdf, course.downloads && course.downloads.pdf);

    const aPodcast = document.createElement("a");
    aPodcast.className = "btn btnGhost btnTiny";
    aPodcast.textContent = "Podcast (ZH)";
    setLinkOrDisable(aPodcast, course.downloads && course.downloads.podcast);

    const aOpen = document.createElement("a");
    aOpen.className = "btn btnPrimary btnTiny";
    aOpen.textContent = "Open";
    aOpen.setAttribute("href", `course.html?course=${encodeURIComponent(course.id || "")}`);

    actions.appendChild(aSlides);
    actions.appendChild(aPdf);
    actions.appendChild(aPodcast);
    actions.appendChild(aOpen);

    row.appendChild(info);
    row.appendChild(actions);

    return row;
  }

  function trackLabel() {
    if (track === "modeling") return "Modeling track";
    if (track === "quantum") return "Quantum track";
    if (track === "demo") return "Demo track";
    if (track) return "Selected track";
    return "";
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const courses = Array.isArray(data && data.courses) ? data.courses : [];
      const filtered = courses.filter(inTrack);

      list.innerHTML = "";

      if (!courses.length) {
        list.innerHTML = `<p class="muted">Course data is empty. Please check data/courses.json.</p>`;
        return;
      }

      if (!filtered.length) {
        const label = trackLabel();
        const msg = label
          ? `No courses found in ${label}. Please confirm your courses.json is updated on GitHub Pages.`
          : "No courses found.";
        list.innerHTML = `<p class="muted">${msg}</p>`;
        return;
      }

      filtered
        .slice()
        .sort((a, b) => toIdNumber(a.id) - toIdNumber(b.id))
        .forEach(course => {
          list.appendChild(buildRow(course));
        });
    })
    .catch(err => {
      console.error("Failed to load courses.json", err);
      list.innerHTML = `<p class="muted">Failed to load course list. Please refresh and check data/courses.json.</p>`;
    });
})();
