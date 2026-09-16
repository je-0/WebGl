import "./style.css";
import { Experience } from "./webgl/Experience.js";

export function boot(options = {}) {
  if (options.variant === "bust") {
    document.body.classList.add("type-bust");
  }

  const canvas = document.querySelector("#webgl");
  const experience = new Experience(canvas, options);

  const cursor = document.querySelector("#cursor");
  const coords = document.querySelector("#coords");
  const parallaxNodes = document.querySelectorAll("[data-parallax]");
  const cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const cursorTarget = { ...cursorPos };

  window.addEventListener("error", (event) => {
    console.error("[window.error]", event.message, event.filename, event.lineno);
  });

  window.addEventListener("pointermove", (event) => {
    cursorTarget.x = event.clientX;
    cursorTarget.y = event.clientY;
    const hover = event.target.closest("a, button");
    cursor?.classList.toggle("is-hover", Boolean(hover));
  });

  const format = (n) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

  const loop = () => {
    cursorPos.x += (cursorTarget.x - cursorPos.x) * 0.22;
    cursorPos.y += (cursorTarget.y - cursorPos.y) * 0.22;
    if (cursor) {
      cursor.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;
    }

    const pointer = experience.getPointer();
    if (coords) coords.textContent = `${format(pointer.x)} / ${format(pointer.y)}`;

    parallaxNodes.forEach((node, index) => {
      const depth = 10 + index * 6;
      node.style.transform = `translate3d(${pointer.x * depth}px, ${-pointer.y * depth * 0.6}px, 0)`;
    });

    requestAnimationFrame(loop);
  };

  loop();
  return experience;
}
