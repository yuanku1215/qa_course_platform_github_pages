// assets/js/course.js
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("course");
  if (!id) return;

  fetch("data/courses.json", { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      const course = data.courses.find(c => c.id === id);
      if (!course) return;

      /* ===== Video ===== */
      const iframe = document.getElementById("courseVideo");
      if (course.video) {
        iframe.src = course.video;
      } else {
        iframe.replaceWith(makePlaceholder("Video not available"));
      }

      /* ===== Downloads ===== */
      bindLink("dlSlides", course.downloads?.slides);
      bindLink("dlPDF", course.downloads?.pdf);
      bindLink("dlPodcast", course.downloads?.podcast);

      /* ===== Practice panel ===== */
      const panel = document.getElementById("practice");
      panel.innerHTML = "";

      if (!Array.isArray(course.practice) || course.practice.length === 0) {
        panel.innerHTML = `<p class="muted">No practice problems.</p>`;
        return;
      }

      course.practice.forEach((p, i) => {
        const item = document.createElement("details");
        item.className = "practiceItem";

        item.innerHTML = `
          <summary class="practiceSummary">
            Problem ${i + 1}
          </summary>

          <div class="practiceDetail">
            <p class="practiceQuestion">${p.question}</p>

            <div class="practiceAnswer">
              <strong>Answer</strong>
              <pre>${p.answer}</pre>
            </div>

            <div class="practiceExplain muted">
              ${p.explain}
            </div>
          </div>
        `;

        panel.appendChild(item);
      });
    });

  /* ===== helpers ===== */

  function bindLink(id, url) {
    const el = document.getElementById(id);
    if (!el) return;

    if (url) {
      el.href = url;
    } else {
      el.classList.add("btnDisabled");
      el.textContent += " (N/A)";
    }
  }

  function makePlaceholder(text) {
    const div = document.createElement("div");
    div.className = "videoPlaceholder";
    div.textContent = text;
    return div;
  }
})();
