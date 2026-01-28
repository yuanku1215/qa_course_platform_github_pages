// assets/js/lessons.js
(function () {

  const DATA_URL = "data/courses.json";
  const list = document.getElementById("lessonList");

  // Background
  if (window.Background?.initBackground) {
    window.Background.initBackground();
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      if (!data.courses || !Array.isArray(data.courses)) return;

      data.courses.forEach(course => {
        const row = document.createElement("div");
        row.className = "courseRow";

        row.innerHTML = `
          <div class="courseInfo">
            <span class="courseCode">${course.id}</span>
            <h3 class="courseName">${course.title}</h3>
          </div>

          <div class="courseActions">
            <a class="btn btnGhost btnTiny"
               href="${course.downloads?.slides || "#"}"
               ${course.downloads?.slides ? "" : "aria-disabled='true'"}>
              Keynote
            </a>

            <a class="btn btnGhost btnTiny"
               href="${course.downloads?.pdf || "#"}"
               ${course.downloads?.pdf ? "" : "aria-disabled='true'"}>
              PDF
            </a>

            <a class="btn btnGhost btnTiny"
               href="${course.downloads?.podcast || "#"}"
               ${course.downloads?.podcast ? "" : "aria-disabled='true'"}>
              Podcast (ZH)
            </a>

            <a class="btn btnPrimary btnTiny"
               href="course.html?course=${course.id}">
              Open
            </a>
          </div>
        `;

        list.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Failed to load courses.json", err);
      list.innerHTML = `<p class="muted">Failed to load course list.</p>`;
    });

})();
