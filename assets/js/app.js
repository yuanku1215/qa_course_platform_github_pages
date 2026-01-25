(function () {
  'use strict';

  const STORAGE_PROGRESS = 'qa_course_progress_v2';
  const STORAGE_UI = 'qa_course_ui_state_v1';

  const State = {
    data: null,
    courses: [],
    selectedTag: 'All',
    query: '',
    sort: 'recommended',
    toastTimer: null,
    searchBound: false,
    chipBound: false,
    sortBound: false,
    loadedOnce: false,
    searchDebounce: null
  };

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function esc(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function qparam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function setQueryParams(params) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '' || v === 'All') url.searchParams.delete(k);
      else url.searchParams.set(k, String(v));
    });
    const hash = window.location.hash || '';
    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + hash;
    window.history.replaceState({}, '', next);
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('toastShow');
    clearTimeout(State.toastTimer);
    State.toastTimer = setTimeout(() => el.classList.remove('toastShow'), 1800);
  }

  function normalizeText(s) {
    return String(s ?? '').toLowerCase().trim();
  }

  function courseUrl(courseId) {
    return `course.html?course=${encodeURIComponent(courseId)}`;
  }

  function lessonUrl(courseId, lessonId) {
    return `lesson.html?course=${encodeURIComponent(courseId)}&lesson=${encodeURIComponent(lessonId)}`;
  }

  async function loadData() {
    if (State.data) return State.data;
    const res = await fetch('data/courses.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load data/courses.json');
    const data = await res.json();
    State.data = data;
    State.courses = Array.isArray(data.courses) ? data.courses : [];
    return data;
  }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getProgress() {
    const v2 = readJSON(STORAGE_PROGRESS);
    if (v2) return v2;

    // Migrate legacy last visited only
    const legacy = readJSON('qa_course_progress');
    if (legacy && legacy.courseId && legacy.lessonId) {
      const migrated = {
        last: { ...legacy },
        completed: {}
      };
      writeJSON(STORAGE_PROGRESS, migrated);
      return migrated;
    }

    return { last: null, completed: {} };
  }

  function setLastProgress(patch) {
    const p = getProgress();
    p.last = {
      courseId: patch.courseId,
      lessonId: patch.lessonId,
      courseTitle: patch.courseTitle || patch.courseId,
      lessonTitle: patch.lessonTitle || patch.lessonId,
      savedAt: patch.savedAt || new Date().toISOString()
    };
    writeJSON(STORAGE_PROGRESS, p);
  }

  function isLessonCompleted(courseId, lessonId) {
    const p = getProgress();
    const c = p.completed?.[courseId];
    return Boolean(c && c[lessonId]);
  }

  function setLessonCompleted(courseId, lessonId, val) {
    const p = getProgress();
    if (!p.completed) p.completed = {};
    if (!p.completed[courseId]) p.completed[courseId] = {};
    p.completed[courseId][lessonId] = Boolean(val);
    writeJSON(STORAGE_PROGRESS, p);
  }

  function clearAllProgress() {
    try {
      localStorage.removeItem(STORAGE_PROGRESS);
      localStorage.removeItem('qa_course_progress');
    } catch (_) {}
  }

  function getUiState() {
    const saved = readJSON(STORAGE_UI) || {};
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q');
    const tag = url.searchParams.get('tag');
    const sort = url.searchParams.get('sort');

    return {
      query: q ?? saved.query ?? '',
      selectedTag: tag ?? saved.selectedTag ?? 'All',
      sort: sort ?? saved.sort ?? 'recommended'
    };
  }

  function saveUiState() {
    writeJSON(STORAGE_UI, {
      query: State.query,
      selectedTag: State.selectedTag,
      sort: State.sort
    });
  }

  function courseMinutes(course) {
    return (course.lessons || []).reduce((acc, l) => acc + (Number(l.duration_min) || 0), 0);
  }

  function courseCompletedCount(course) {
    const lessons = course.lessons || [];
    let done = 0;
    for (const l of lessons) {
      if (isLessonCompleted(course.id, l.id)) done += 1;
    }
    return done;
  }

  function courseMatches(course) {
    const q = normalizeText(State.query);
    const tagOk = State.selectedTag === 'All' || (course.tags || []).includes(State.selectedTag);

    if (!q) return tagOk;

    const inCourse =
      normalizeText(course.title).includes(q) ||
      normalizeText(course.description).includes(q) ||
      (course.tags || []).some(t => normalizeText(t).includes(q));

    const inLessons = (course.lessons || []).some(l =>
      normalizeText(l.title).includes(q) ||
      normalizeText(l.summary).includes(q)
    );

    return tagOk && (inCourse || inLessons);
  }

  function collectTags(courses) {
    const set = new Set();
    courses.forEach(c => (c.tags || []).forEach(t => set.add(t)));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }

  function compareCourses(a, b) {
    if (State.sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
    if (State.sort === 'lessons') return (b.lessons || []).length - (a.lessons || []).length;
    if (State.sort === 'minutes') return courseMinutes(b) - courseMinutes(a);

    // Recommended: prefer courses with incomplete progress, then title
    const aDone = courseCompletedCount(a);
    const bDone = courseCompletedCount(b);
    const aTotal = (a.lessons || []).length || 1;
    const bTotal = (b.lessons || []).length || 1;
    const aRatio = aDone / aTotal;
    const bRatio = bDone / bTotal;

    // Lower completion ratio first, so users see unfinished courses earlier
    if (aRatio !== bRatio) return aRatio - bRatio;
    return String(a.title || '').localeCompare(String(b.title || ''));
  }

  function renderTagChips(tags) {
    const row = document.getElementById('tagChips');
    if (!row) return;

    row.innerHTML = tags.map(t => {
      const active = t === State.selectedTag ? 'chip chipActive' : 'chip';
      const label = t === 'All' ? 'All tags' : t;
      return `<button type="button" class="${active}" data-tag="${esc(t)}" aria-pressed="${t === State.selectedTag ? 'true' : 'false'}">${esc(label)}</button>`;
    }).join('');

    if (State.chipBound) return;
    State.chipBound = true;

    row.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tag]');
      if (!btn) return;
      State.selectedTag = btn.getAttribute('data-tag') || 'All';
      saveUiState();
      setQueryParams({ tag: State.selectedTag, q: State.query, sort: State.sort });
      renderHome(false);
      toast(State.selectedTag === 'All' ? 'All tags' : `Tag: ${State.selectedTag}`);
    });
  }

  function renderResultCount(n) {
    const el = document.getElementById('resultCount');
    if (!el) return;
    el.textContent = `${n} results`;
  }

  function renderSkeletonCards(n = 6) {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: n }).map(() => `
      <div class="skeleton">
        <div class="skelLine skelTitle"></div>
        <div class="skelLine skelLineMid"></div>
        <div class="skelLine skelLineShort"></div>
        <div class="skelLine skelLineMid"></div>
      </div>
    `).join('');
  }

  function renderHomeCards(courses) {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;

    if (!courses.length) {
      grid.innerHTML = `
        <div class="card">
          <h2 class="cardtitle">No results</h2>
          <p class="muted">Try clearing the search or switching tag filters.</p>
          <div class="actions">
            <a class="btn btnGhost" href="./index.html#courses">Reset</a>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = courses.map(c => {
      const tags = (c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
      const lessons = (c.lessons || []).length;
      const totalMin = courseMinutes(c);

      const done = courseCompletedCount(c);
      const pct = lessons ? Math.round((done / lessons) * 100) : 0;
      const showProgress = lessons > 0 && done > 0;

      const primaryHref = (function () {
        const p = getProgress().last;
        if (p && p.courseId === c.id && p.lessonId) return lessonUrl(c.id, p.lessonId);
        const firstLesson = (c.lessons || [])[0];
        if (firstLesson) return lessonUrl(c.id, firstLesson.id);
        return courseUrl(c.id);
      })();

      const primaryLabel = (function () {
        const p = getProgress().last;
        if (p && p.courseId === c.id) return 'Resume';
        return 'Start';
      })();

      return `
        <article class="card">
          <h2 class="cardtitle">${esc(c.title)}</h2>
          <p class="muted">${esc(c.description)}</p>

          ${tags ? `<div class="tags">${tags}</div>` : ''}

          ${showProgress ? `
            <div class="progressWrap" aria-label="Course progress">
              <div class="progressTop">
                <div class="mutedSmall">Progress: ${done}/${lessons} (${pct}%)</div>
              </div>
              <div class="progressBar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
                <div class="progressFill" style="width:${pct}%"></div>
              </div>
            </div>
          ` : ''}

          <div class="actions">
            <div class="tags">
              <span class="badge">${lessons} lessons</span>
              <span class="badge">${totalMin || 0} min</span>
              ${done ? `<span class="badge">${done} done</span>` : ''}
            </div>
            <a class="btn btnPrimary" href="${primaryHref}">${primaryLabel}</a>
          </div>

          <div class="actions" style="justify-content:flex-start">
            <a class="btn btnGhost" href="${courseUrl(c.id)}">Open course</a>
          </div>
        </article>
      `;
    }).join('');
  }

  function bindSearchOnce() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    if (!input || !clearBtn) return;

    if (State.searchBound) return;
    State.searchBound = true;

    input.value = State.query;

    const apply = () => {
      clearTimeout(State.searchDebounce);
      State.searchDebounce = setTimeout(() => {
        State.query = input.value || '';
        saveUiState();
        setQueryParams({ tag: State.selectedTag, q: State.query, sort: State.sort });
        renderHome(false);
      }, 80);
    };

    input.addEventListener('input', apply);

    clearBtn.addEventListener('click', () => {
      input.value = '';
      State.query = '';
      saveUiState();
      setQueryParams({ tag: State.selectedTag, q: State.query, sort: State.sort });
      renderHome(false);
      input.focus();
      toast('Search cleared');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        State.query = '';
        saveUiState();
        setQueryParams({ tag: State.selectedTag, q: State.query, sort: State.sort });
        renderHome(false);
        toast('Search cleared');
      }
    });
  }

  function bindSortOnce() {
    const sel = document.getElementById('sortSelect');
    if (!sel) return;
    if (State.sortBound) return;
    State.sortBound = true;

    sel.value = State.sort;
    sel.addEventListener('change', () => {
      State.sort = sel.value || 'recommended';
      saveUiState();
      setQueryParams({ tag: State.selectedTag, q: State.query, sort: State.sort });
      renderHome(false);
      toast(`Sorted by: ${State.sort}`);
    });
  }

  async function renderHome(showSkeleton = true) {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;

    if (showSkeleton && !State.loadedOnce) renderSkeletonCards(6);

    try {
      await loadData();

      bindSearchOnce();
      bindSortOnce();

      const tags = collectTags(State.courses);
      renderTagChips(tags);

      const filtered = State.courses
        .filter(courseMatches)
        .slice()
        .sort(compareCourses);

      renderHomeCards(filtered);
      renderResultCount(filtered.length);
      State.loadedOnce = true;

    } catch (e) {
      grid.innerHTML = `<div class="card"><h2 class="cardtitle">Error</h2><p class="muted">${esc(e.message)}</p></div>`;
    }
  }

  async function renderKpis() {
    try {
      await loadData();
      const courses = State.courses;
      const totalCourses = courses.length;
      const totalLessons = courses.reduce((acc, c) => acc + ((c.lessons || []).length), 0);
      const totalMin = courses.reduce((acc, c) => acc + courseMinutes(c), 0);

      const cEl = document.getElementById('kpiCourses');
      const lEl = document.getElementById('kpiLessons');
      const mEl = document.getElementById('kpiMinutes');

      if (cEl) cEl.textContent = String(totalCourses);
      if (lEl) lEl.textContent = String(totalLessons);
      if (mEl) mEl.textContent = String(totalMin);
    } catch (_) {}
  }

  function findNextUncompleted(course) {
    const lessons = course.lessons || [];
    for (const l of lessons) {
      if (!isLessonCompleted(course.id, l.id)) return l;
    }
    return lessons[0] || null;
  }

  async function renderHomeStartCards() {
    try {
      await loadData();
      if (!State.courses.length) return;

      const firstCourse = State.courses[0];
      const firstLesson = (firstCourse.lessons || [])[0];

      const startTitle = document.getElementById('startTitle');
      const startDesc = document.getElementById('startDesc');
      const startMetaA = document.getElementById('startMetaA');
      const startMetaB = document.getElementById('startMetaB');
      const startBtn = document.getElementById('startBtn');
      const startCourseBtn = document.getElementById('startCourseBtn');

      if (firstLesson) {
        if (startTitle) startTitle.textContent = firstLesson.title || 'Lesson';
        if (startDesc) startDesc.textContent = firstLesson.summary || firstCourse.description || '';
        if (startMetaA) startMetaA.textContent = `Course: ${firstCourse.title || firstCourse.id}`;
        if (startMetaB) startMetaB.textContent = `${Number(firstLesson.duration_min) || 0} min`;
        if (startBtn) startBtn.href = lessonUrl(firstCourse.id, firstLesson.id);
        if (startCourseBtn) startCourseBtn.href = courseUrl(firstCourse.id);
      }

      const p = getProgress();
      const cont = document.getElementById('continueCard');
      if (!p.last || !p.last.courseId || !p.last.lessonId) {
        if (cont) cont.style.display = 'none';
        return;
      }

      const course = State.courses.find(c => c.id === p.last.courseId);
      const lesson = course ? (course.lessons || []).find(l => l.id === p.last.lessonId) : null;

      const continueTitle = document.getElementById('continueTitle');
      const continueDesc = document.getElementById('continueDesc');
      const continueMetaA = document.getElementById('continueMetaA');
      const continueMetaB = document.getElementById('continueMetaB');
      const continueBtn = document.getElementById('continueBtn');
      const clearBtn = document.getElementById('clearProgressBtn');

      const lastCompleted = isLessonCompleted(p.last.courseId, p.last.lessonId);
      let targetLessonId = p.last.lessonId;

      if (course && lastCompleted) {
        const lessons = course.lessons || [];
        const idx = lessons.findIndex(l => l.id === p.last.lessonId);
        const next = idx >= 0 ? lessons[idx + 1] : null;
        if (next) targetLessonId = next.id;
      }

      if (continueTitle) continueTitle.textContent = lesson?.title || p.last.lessonTitle || 'Continue';
      if (continueDesc) continueDesc.textContent = course?.title ? `Course: ${course.title}` : 'Resume last lesson';
      if (continueMetaA) continueMetaA.textContent = lastCompleted ? 'Completed' : 'In progress';
      if (continueMetaB) continueMetaB.textContent = p.last.savedAt ? new Date(p.last.savedAt).toLocaleString() : 'Local';

      if (continueBtn) continueBtn.href = lessonUrl(p.last.courseId, targetLessonId);

      if (clearBtn) {
        clearBtn.onclick = () => {
          clearAllProgress();
          if (cont) cont.style.display = 'none';
          toast('Progress cleared');
        };
      }

      if (cont) cont.style.display = '';

    } catch (_) {}
  }

  async function renderCourse() {
    const courseId = qparam('course');
    const hero = document.getElementById('courseHero');
    const list = document.getElementById('lessonList');
    const crumbs = document.getElementById('breadcrumbs');
    const stats = document.getElementById('courseStats');

    const progressWrap = document.getElementById('courseProgress');
    const progressText = document.getElementById('courseProgressText');
    const progressFill = document.getElementById('courseProgressFill');
    const resumeBtn = document.getElementById('resumeBtn');

    if (!courseId) {
      if (hero) hero.innerHTML = '<h1 class="heroTitle">Course not specified</h1><p class="heroDesc">Missing query parameter: course</p>';
      return;
    }

    try {
      await loadData();
      const course = State.courses.find(c => c.id === courseId);

      if (!course) {
        if (hero) hero.innerHTML = '<h1 class="heroTitle">Course not found</h1><p class="heroDesc">Check data/courses.json</p>';
        return;
      }

      document.title = course.title || 'Course';

      if (crumbs) {
        crumbs.innerHTML = `<a href="./index.html">Home</a> <span class="mutedSmall">/</span> <span>${esc(course.title)}</span>`;
      }

      if (hero) {
        hero.innerHTML = `
          <h1 class="heroTitle">${esc(course.title)}</h1>
          <p class="heroDesc">${esc(course.description)}</p>
        `;
      }

      const lessons = course.lessons || [];
      const totalMin = courseMinutes(course);

      const done = courseCompletedCount(course);
      const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

      if (stats) stats.textContent = `${lessons.length} lessons · ${totalMin} min`;

      if (progressWrap && progressText && progressFill) {
        if (done > 0) {
          progressWrap.style.display = '';
          progressText.textContent = `Progress: ${done}/${lessons.length} (${pct}%)`;
          progressFill.style.width = `${pct}%`;
          const bar = progressWrap.querySelector('.progressBar');
          if (bar) bar.setAttribute('aria-valuenow', String(pct));
        } else {
          progressWrap.style.display = 'none';
        }
      }

      const last = getProgress().last;
      if (resumeBtn && last && last.courseId === course.id) {
        resumeBtn.style.display = '';
        resumeBtn.href = lessonUrl(course.id, last.lessonId);
      }

      if (list) {
        list.innerHTML = lessons.map((l, idx) => {
          const completed = isLessonCompleted(course.id, l.id);
          const isLast = last && last.courseId === course.id && last.lessonId === l.id;
          const badge = completed
            ? '<span class="checkBadge checkBadgeOn">✓ Completed</span>'
            : isLast
              ? '<span class="checkBadge">● Last visited</span>'
              : '';

          return `
            <li class="lessonitem">
              <div class="lessonmeta">
                <div class="lessontitle">${esc(l.title)}</div>
                <div class="tags">
                  <span class="badge">Lesson ${idx + 1}/${lessons.length}</span>
                  ${l.duration_min ? `<span class="badge">${esc(l.duration_min)} min</span>` : ''}
                  ${badge}
                </div>
              </div>
              ${l.summary ? `<div class="muted">${esc(l.summary)}</div>` : ''}
              <div class="actions">
                <a class="btn btnPrimary" href="${lessonUrl(course.id, l.id)}">Watch</a>
                <a class="btn btnGhost" href="${lessonUrl(course.id, l.id)}#resources">Resources</a>
              </div>
            </li>
          `;
        }).join('');
      }

    } catch (e) {
      if (hero) hero.innerHTML = `<h1 class="heroTitle">Error</h1><p class="heroDesc">${esc(e.message)}</p>`;
    }
  }

  function resIcon(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'slides') return 'S';
    if (t === 'paper') return 'P';
    if (t === 'code') return 'C';
    if (t === 'notebook') return 'N';
    return 'L';
  }

  function safeYouTubeEmbedId(raw) {
    const id = String(raw || '').trim();
    // Basic allowlist: YouTube IDs are usually 11 chars, but keep a relaxed check
    if (!id) return '';
    if (!/^[a-zA-Z0-9_-]{6,32}$/.test(id)) return '';
    return id;
  }

  function buildVideoMetaPills({ courseTitle, idx, total, durationMin, completed }) {
    const pills = [];
    if (courseTitle) pills.push(`<span class="videoPill">Course: ${esc(courseTitle)}</span>`);
    if (total) pills.push(`<span class="videoPill">Lesson ${idx + 1}/${total}</span>`);
    if (durationMin) pills.push(`<span class="videoPill">${esc(durationMin)} min</span>`);
    if (completed) pills.push(`<span class="videoPill">✓ Completed</span>`);
    return pills.join('');
  }

  function bindLessonHotkeys({ prevHref, nextHref, toggleComplete }) {
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      const tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'n' && nextHref) {
        window.location.href = nextHref;
      }
      if (e.key === 'p' && prevHref) {
        window.location.href = prevHref;
      }
      if (e.key === 'm' && typeof toggleComplete === 'function') {
        toggleComplete();
      }
    }, { passive: true });
  }

  async function renderLesson() {
    const courseId = qparam('course');
    const lessonId = qparam('lesson');

    const hero = document.getElementById('lessonHero');
    const crumbs = document.getElementById('breadcrumbs');
    const iframe = document.getElementById('ytFrame');
    const backLink = document.getElementById('backToCourse');

    const resourcesCard = document.getElementById('resourcesCard');
    const resGrid = document.getElementById('resourceList');

    const metaRow = document.getElementById('videoMeta');
    const navRow = document.getElementById('videoNav');

    if (!courseId || !lessonId) {
      if (hero) hero.innerHTML = '<h1 class="heroTitle">Lesson not specified</h1><p class="heroDesc">Missing query parameters: course and lesson</p>';
      if (backLink) backLink.href = './index.html';
      return;
    }

    if (backLink) backLink.href = courseUrl(courseId);

    try {
      await loadData();
      const course = State.courses.find(c => c.id === courseId);
      if (!course) {
        if (hero) hero.innerHTML = '<h1 class="heroTitle">Course not found</h1><p class="heroDesc">Check data/courses.json</p>';
        return;
      }

      const lessons = course.lessons || [];
      const idx = lessons.findIndex(l => l.id === lessonId);
      const lesson = idx >= 0 ? lessons[idx] : null;

      if (!lesson) {
        if (hero) hero.innerHTML = '<h1 class="heroTitle">Lesson not found</h1><p class="heroDesc">Check data/courses.json</p>';
        return;
      }

      document.title = lesson.title || 'Lesson';

      if (crumbs) {
        crumbs.innerHTML = `
          <a href="./index.html">Home</a> <span class="mutedSmall">/</span>
          <a href="${courseUrl(courseId)}">${esc(course.title)}</a> <span class="mutedSmall">/</span>
          <span>${esc(lesson.title)}</span>
        `;
      }

      if (hero) {
        hero.innerHTML = `
          <h1 class="heroTitle">${esc(lesson.title)}</h1>
          ${lesson.summary ? `<p class="heroDesc">${esc(lesson.summary)}</p>` : `<p class="heroDesc">${esc(course.title)}</p>`}
        `;
      }

      const yt = safeYouTubeEmbedId(lesson.youtube_id);
      if (iframe) {
        if (yt) {
          iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(yt)}`;
          iframe.title = lesson.title;
        } else {
          iframe.removeAttribute('src');
          iframe.title = 'Missing YouTube video id';
        }
      }

      const completed = isLessonCompleted(courseId, lessonId);

      if (metaRow) {
        metaRow.innerHTML = buildVideoMetaPills({
          courseTitle: course.title,
          idx,
          total: lessons.length,
          durationMin: lesson.duration_min,
          completed
        });

        if (!yt) {
          metaRow.innerHTML += `<span class="videoPill">Video id missing</span>`;
        }
      }

      // Navigation buttons
      const prev = idx > 0 ? lessons[idx - 1] : null;
      const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
      const prevHref = prev ? lessonUrl(courseId, prev.id) : '';
      const nextHref = next ? lessonUrl(courseId, next.id) : '';

      const copyHref = window.location.href;

      function toggleComplete() {
        const now = !isLessonCompleted(courseId, lessonId);
        setLessonCompleted(courseId, lessonId, now);
        toast(now ? 'Marked as completed' : 'Marked as not completed');
        // Refresh meta pills
        if (metaRow) {
          metaRow.innerHTML = buildVideoMetaPills({
            courseTitle: course.title,
            idx,
            total: lessons.length,
            durationMin: lesson.duration_min,
            completed: now
          });
          if (!yt) metaRow.innerHTML += `<span class="videoPill">Video id missing</span>`;
        }
      }

      if (navRow) {
        navRow.innerHTML = `
          ${prev ? `<a class="btn btnGhost" href="${prevHref}">Prev</a>` : ''}
          ${next ? `<a class="btn btnPrimary" href="${nextHref}">Next</a>` : ''}
          <button class="btn btnGhost" type="button" id="markBtn">${completed ? 'Unmark' : 'Mark completed'}</button>
          <button class="btn btnGhost" type="button" id="copyBtn">Copy link</button>
        `;

        const markBtn = document.getElementById('markBtn');
        const copyBtn = document.getElementById('copyBtn');

        if (markBtn) {
          markBtn.addEventListener('click', () => {
            toggleComplete();
            markBtn.textContent = isLessonCompleted(courseId, lessonId) ? 'Unmark' : 'Mark completed';
          });
        }

        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(copyHref);
              toast('Link copied');
            } catch (_) {
              toast('Copy failed');
            }
          });
        }
      }

      bindLessonHotkeys({ prevHref, nextHref, toggleComplete });

      const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
      if (resources.length && resourcesCard && resGrid) {
        resourcesCard.style.display = '';
        resourcesCard.id = 'resourcesCard';
        resGrid.innerHTML = resources.map(r => {
          const type = r.type ? String(r.type) : 'link';
          const url = r.url || '#';
          const title = r.title || url;

          return `
            <a class="resItem" href="${esc(url)}" target="_blank" rel="noopener">
              <div class="resIcon">${esc(resIcon(type))}</div>
              <div>
                <div class="resMetaTitle">${esc(title)}</div>
                <div class="resMetaType">${esc(type)}</div>
              </div>
            </a>
          `;
        }).join('');

        // Anchor convenience
        resourcesCard.setAttribute('id', 'resources');

      } else if (resourcesCard) {
        resourcesCard.style.display = 'none';
      }

      setLastProgress({
        courseId,
        lessonId,
        courseTitle: course.title || course.id,
        lessonTitle: lesson.title || lesson.id,
        savedAt: new Date().toISOString()
      });

    } catch (e) {
      if (hero) hero.innerHTML = `<h1 class="heroTitle">Error</h1><p class="heroDesc">${esc(e.message)}</p>`;
    }
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

      const blobCount = 5;
      for (let i = 0; i < blobCount; i++) {
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

    window.addEventListener('resize', () => init());
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

  // Initialize UI state on home page
  (function bootstrapUiState() {
    if (!document.getElementById('courseGrid')) return;
    const s = getUiState();
    State.query = s.query || '';
    State.selectedTag = s.selectedTag || 'All';
    State.sort = s.sort || 'recommended';
  })();

  window.App = {
    initBackground,
    renderHome,
    renderKpis,
    renderHomeStartCards,
    renderCourse,
    renderLesson
  };

})();
