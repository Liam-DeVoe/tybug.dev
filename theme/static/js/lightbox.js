// Click an article image (or a .figure chart) to view it enlarged and centered
// over a dimmed backdrop. Click anywhere or press Escape to dismiss.
(function () {
  "use strict";

  function build() {
    const overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("aria-hidden", "true");

    const stage = document.createElement("div");
    stage.className = "lightbox__stage";
    overlay.appendChild(stage);

    const caption = document.createElement("div");
    caption.className = "lightbox__caption";
    overlay.appendChild(caption);

    document.body.appendChild(overlay);
    return { overlay, stage, caption };
  }

  function init() {
    const images = document.querySelectorAll("article img");
    // Figures are zoomable only when opted in (Figures.figure({ zoomable: true })
    // or a `figure--zoomable` class on an explicit .figure container).
    const charts = document.querySelectorAll("article .figure--zoomable .figure__chart");
    if (!images.length && !charts.length) return;

    const { overlay, stage, caption } = build();

    function show(node, captionHTML) {
      stage.replaceChildren(node);
      caption.innerHTML = captionHTML || "";
      caption.style.display = captionHTML ? "" : "none";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    }

    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      stage.replaceChildren();
    }

    images.forEach((source) => {
      source.classList.add("zoomable");
      source.addEventListener("click", () => {
        const img = document.createElement("img");
        img.className = "lightbox__img";
        img.src = source.currentSrc || source.src;
        img.alt = source.alt || "";
        const text = source.alt || "";
        show(img, text ? escapeHTML(text) : "");
      });
    });

    charts.forEach((chart) => {
      chart.classList.add("zoomable");
      chart.addEventListener("click", () => {
        const panel = document.createElement("div");
        panel.className = "lightbox__panel";
        panel.appendChild(chart.cloneNode(true));
        const cap = chart.closest(".figure--zoomable").querySelector(".figure__caption");
        show(panel, cap ? cap.innerHTML : "");
      });
    });

    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  }

  function escapeHTML(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
