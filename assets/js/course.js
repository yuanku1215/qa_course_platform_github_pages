const params = new URLSearchParams(location.search);
const id = params.get("course");

fetch("data/courses.json")
  .then(r => r.json())
  .then(data => {
    const course = data.courses.find(c => c.id === id);
    if (!course) return;

    document.getElementById("courseVideo").src = course.video;
    document.getElementById("dlSlides").href = course.downloads.slides;
    document.getElementById("dlPDF").href = course.downloads.pdf;
    document.getElementById("dlPodcast").href = course.downloads.podcast;

    const practice = document.getElementById("practice");
    course.practice.forEach((p, i) => {
      const el = document.createElement("div");
      el.className = "practiceItem";
      el.innerHTML = `
        <h4>Problem ${i + 1}</h4>
        <p>${p.question}</p>
        <button class="btn btnGhost">View solution</button>
        <div class="solution" hidden>
          <pre>${p.answer}</pre>
          <p class="muted">${p.explain}</p>
        </div>
      `;
      const btn = el.querySelector("button");
      const sol = el.querySelector(".solution");
      btn.onclick = () => sol.hidden = !sol.hidden;
      practice.appendChild(el);
    });
  });
