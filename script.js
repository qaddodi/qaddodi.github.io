const filters = [...document.querySelectorAll(".filter")];
const projects = [...document.querySelectorAll(".project-card")];
const status = document.querySelector(".filter-status");

const labels = {
  creative: "Creative technology",
  clinical: "Clinical tools",
  simulation: "Medical simulators",
  design: "Design and automation",
};

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    const selected = filter.dataset.filter;
    let visible = 0;

    filters.forEach((item) => {
      const active = item === filter;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });

    projects.forEach((project) => {
      const show = selected === "all" || project.dataset.category === selected;
      project.hidden = !show;
      if (show) visible += 1;
    });

    status.textContent = selected === "all"
      ? `Showing all ${visible} projects`
      : `Showing ${visible} ${visible === 1 ? "project" : "projects"} in ${labels[selected]}`;
  });
});
