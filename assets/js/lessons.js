fetch("data/courses.json")
  .then(r => r.json())
  .then(data => {
    const wrap = document.getElementById("lessonList");
    data.courses.forEach(c => {
      const el = document.createElement("div");
      el.className = "lessonRow";
      el.innerHTML = `
        <div class="lessonCode">${c.id}</div>
        <div>
          <h3>${c.title}</h3>
          <p class="muted">${c.description}</p>
        </div>
        <a class="btn btnPrimary" href="course.html?course=${c.id}">
          Open
        </a>
      `;
      wrap.appendChild(el);
    });
  });
