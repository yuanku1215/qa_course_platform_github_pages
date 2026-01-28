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

      /* ===== Practice ===== */
      const practice = document.getElementById("practice");
      if (!Array.isArray(course.practice)) return;

      course.practice.forEach((p, i) => {
        const item = document.createElement("article");
        item.className = "practiceItem card softCard";

        item.innerHTML = `
          <h3 class="practiceTitle">Problem ${i + 1}</h3>
          <p class="practiceQuestion">${p.question}</p>

          <button class="btn btnGhost btnSmall">
            View solution
          </button>

          <div class="practiceSolution" hidden>
            <pre class="solutionCode">${p.answer}</pre>
            <p class="muted">${p.explain}</p>
          </div>
        `;

        const btn = item.querySelector("button");
        const sol = item.querySelector(".practiceSolution");

        btn.onclick = () => {
          const open = !sol.hasAttribute("hidden");
          sol.toggleAttribute("hidden");
          btn.textContent = open ? "View solution" : "Hide solution";
        };

        practice.appendChild(item);
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
