const navInput = document.getElementById("docs-nav-filter");
const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
const tocLinks = Array.from(document.querySelectorAll("[data-toc-link]"));
const articleRoot = document.querySelector("[data-docs-content]");

if (navInput && navLinks.length > 0) {
  navInput.addEventListener("input", () => {
    const keyword = navInput.value.trim().toLowerCase();
    for (const link of navLinks) {
      const visible = keyword.length === 0 || (link.textContent ?? "").toLowerCase().includes(keyword);
      link.hidden = !visible;
    }
  });
}

if (articleRoot && tocLinks.length > 0) {
  const tocById = new Map();
  for (const link of tocLinks) {
    const id = link.getAttribute("href")?.slice(1);
    if (id) {
      tocById.set(id, link);
    }
  }

  const headings = Array.from(articleRoot.querySelectorAll("h2[id], h3[id]"));
  if (headings.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const current = visible[0]?.target.id;
        if (!current) {
          return;
        }
        for (const link of tocLinks) {
          link.removeAttribute("aria-current");
        }
        tocById.get(current)?.setAttribute("aria-current", "true");
      },
      {
        rootMargin: "0px 0px -65% 0px",
        threshold: [0, 0.5, 1]
      }
    );

    for (const heading of headings) {
      observer.observe(heading);
    }
  }
}
