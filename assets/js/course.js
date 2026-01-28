// assets/js/course.js
(function () {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("course");

  if (!courseId) return;

  fetch("data/courses.json", { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      const course = data.courses.find(c => c.id === courseId);
      if (!course) return;

      // ===== 影片 =====
      const video = document.getElementById("courseVideo");
      if (course.video) {
        video.src = course.video;
      } else {
        video.replaceWith(createPlaceholder("Video not available"));
      }

      // ===== 下載 =====
      bindDownload("dlSlides", course.downloads?.slides);
      bindDownload("dlPDF", course.downloads?.pdf);
      bindDownload("dlPodcast", course.downloads?.podcast);

      // ===== 例題 =====
      const practiceWrap = document.getElementById("practice");
      if (!Array.isArray(course.practice) || !course.practice.length) {
        practiceWrap.innerHTML = `<p class="muted">No practice problems available.</p>`;
        return;
      }

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

        btn.addEventListener("click", () => {
          const open = !sol.hasAttribute("hidden");
          sol.toggleAttribute("hidden");
          btn.textContent = open ? "View solution" : "Hide solution";
        });

        practiceWrap.appendChild(item);
      });
    });

  // ===== helpers =====

  function bindDownload(id, url) {
    const el = document.getElementById(id);
    if (!el) return;

    if (url) {
      el.href = url;
    } else {
      el.classList.add("btnDisabled");
      el.removeAttribute("href");
      el.textContent += " (N/A)";
    }
  }

  function createPlaceholder(text) {
    const div = document.createElement("div");
    div.className = "videoPlaceholder";
    div.textContent = text;
    return div;
  }
})();
