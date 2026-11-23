import { mountShell } from "../shell.js";

mountShell("/");

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // Rotating last word of the headline.
  const words = ["writes.", "changes.", "ships.", "suggests."];
  const word = document.getElementById("rotate");
  let i = 0;
  setInterval(() => {
    word.classList.add("out");
    setTimeout(() => {
      i = (i + 1) % words.length;
      word.textContent = words[i];
      word.classList.remove("out");
    }, 300);
  }, 2800);

  // The better prompt types itself out.
  const typed = document.getElementById("typed");
  const full = typed.dataset.text;
  const caret = document.createElement("span");
  caret.className = "caret";
  let n = 0;
  const type = () => {
    typed.textContent = full.slice(0, n);
    typed.append(caret);
    if (n++ < full.length) setTimeout(type, 26);
    else setTimeout(() => ((n = 0), type()), 5000);
  };
  setTimeout(type, 600);

  // The preview card tilts gently toward the pointer.
  const peek = document.getElementById("peek");
  peek.parentElement.addEventListener("pointermove", (e) => {
    const r = peek.getBoundingClientRect();
    peek.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    peek.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
  });
}
