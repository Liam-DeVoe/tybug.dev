// Reusable tooltip primitive. A `.tooltip` wraps a `.tooltip__trigger` and a
// `.tooltip__body`; this script wires up showing/hiding and positions the body
// with position: fixed (so it escapes multi-column / overflow clipping, flips
// when it would run off the top, and clamps to the viewport edges).
//
// Devices with a fine, hovering pointer get hover + keyboard focus; touch
// devices fall back to tap-to-toggle. The script is loaded globally and early
// -returns when a page has no .tooltip, so it costs nothing where unused.
(function () {
    "use strict";

    var GAP = 9;        // px between trigger and body (bridged by a transparent
                        // hover zone in CSS so moving onto the body never crosses
                        // dead space and fires mouseleave)
    var GUTTER = 8;     // min px from viewport edge

    function init() {
        var tips = Array.prototype.slice.call(document.querySelectorAll(".tooltip"));
        if (!tips.length) return;

        var hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        var openTip = null;

        function place(tip) {
            var trigger = tip.querySelector(".tooltip__trigger");
            var body = tip.querySelector(".tooltip__body");
            var t = trigger.getBoundingClientRect();
            var bw = body.offsetWidth;
            var bh = body.offsetHeight;

            var left = t.left + t.width / 2 - bw / 2;
            left = Math.max(GUTTER, Math.min(left, window.innerWidth - bw - GUTTER));

            var top = t.top - bh - GAP;
            var below = false;
            if (top < GUTTER) {
                top = t.bottom + GAP;
                below = true;
            }

            body.style.left = Math.round(left) + "px";
            body.style.top = Math.round(top) + "px";
            body.style.setProperty("--caret-x", Math.round(t.left + t.width / 2 - left) + "px");
            body.style.setProperty("--bridge", GAP + "px");
            tip.classList.toggle("tooltip--below", below);
        }

        function open(tip) {
            if (openTip && openTip !== tip) close(openTip);
            tip.classList.add("is-open");
            place(tip);
            openTip = tip;
        }

        function close(tip) {
            tip.classList.remove("is-open", "tooltip--below");
            if (openTip === tip) openTip = null;
        }

        tips.forEach(function (tip) {
            var trigger = tip.querySelector(".tooltip__trigger");
            var body = tip.querySelector(".tooltip__body");
            if (!trigger || !body) return;

            trigger.setAttribute("tabindex", "0");

            if (hoverCapable) {
                tip.addEventListener("mouseenter", function () { open(tip); });
                tip.addEventListener("mouseleave", function () { close(tip); });
                trigger.addEventListener("focus", function () { open(tip); });
                tip.addEventListener("focusout", function (e) {
                    if (!tip.contains(e.relatedTarget)) close(tip);
                });
            } else {
                trigger.addEventListener("click", function (e) {
                    e.preventDefault();
                    if (tip.classList.contains("is-open")) close(tip);
                    else open(tip);
                });
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && openTip) close(openTip);
        });
        document.addEventListener("click", function (e) {
            if (openTip && !openTip.contains(e.target)) close(openTip);
        });
        window.addEventListener("resize", function () { if (openTip) place(openTip); });
        window.addEventListener("scroll", function () { if (openTip) place(openTip); }, true);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
