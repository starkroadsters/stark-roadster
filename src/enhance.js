// Stark Roadsters — progressive enhancement. Works without JS; every effect is optional.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const root = document.documentElement;
const hasIO = "IntersectionObserver" in window;

if (hasIO && !reduce) root.classList.add("enhanced");

// Stagger hero entrance
document.querySelectorAll(".hero-copy > *").forEach((el, i) => el.style.setProperty("--i", i));

// Pointer spotlight, logo tilt and magnetic buttons (fine pointers only)
const hero = document.querySelector(".hero");
const logo = document.querySelector(".hero-logo");
if (finePointer && !reduce && hero) {
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
    hero.style.setProperty("--my", `${e.clientY - r.top}px`);
    if (logo) {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      logo.style.transform = `perspective(900px) rotateY(${nx * 12}deg) rotateX(${-ny * 9}deg)`;
    }
  });
  hero.addEventListener("pointerleave", () => { if (logo) logo.style.transform = ""; });
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
}

// Gentle scroll parallax on decorative hero text
if (!reduce) {
  const layers = [...document.querySelectorAll("[data-parallax]")];
  let ticking = false;
  const update = () => {
    ticking = false;
    layers.forEach((el) => {
      el.style.transform = `translate3d(0, ${scrollY * parseFloat(el.dataset.parallax)}px, 0)`;
    });
  };
  if (layers.length) addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
}

// Scroll reveals for section headings and content blocks
if (hasIO && !reduce) {
  const targets = document.querySelectorAll(
    ".section-marker, .statement-content > div, .design-heading-row, .team-heading-row, .context-heading, .closing-content > h2, .closing-content > a, .palette-band, .experience-topline"
  );
  targets.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((el) => io.observe(el));
}
