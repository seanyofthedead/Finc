/* Motion language for the FinCEN app.
 * Named easings (CSS strings + JS functions), reduced-motion awareness,
 * generic tween, and a digit-ticker for animating numeric textContent. */
(function () {
  "use strict";

  const easing = {
    standard: "cubic-bezier(0.2, 0, 0.2, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
    decel: "cubic-bezier(0, 0, 0.2, 1)",
    accel: "cubic-bezier(0.4, 0, 1, 1)",
    springSoft: "cubic-bezier(0.34, 1.56, 0.64, 1)",

    fns: {
      linear: (t) => t,
      easeIn: (t) => t * t * t,
      easeOut: (t) => 1 - Math.pow(1 - t, 3),
      easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    }
  };

  function reducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches === true;
    } catch (e) {
      return false;
    }
  }

  const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

  function tween(from, to, opts) {
    opts = opts || {};
    const duration = typeof opts.duration === "number" ? opts.duration : 300;
    const ease = typeof opts.ease === "function" ? opts.ease : easing.fns.easeOut;
    const onUpdate = opts.onUpdate || (() => {});
    const onComplete = opts.onComplete || (() => {});

    if (reducedMotion() || duration <= 0) {
      onUpdate(to, 1);
      onComplete();
      return { cancel() {} };
    }

    const start = now();
    let rafId = null;
    let cancelled = false;
    function frame() {
      if (cancelled) return;
      const t = Math.min(1, (now() - start) / duration);
      const v = from + (to - from) * ease(t);
      onUpdate(v, t);
      if (t < 1) {
        rafId = window.requestAnimationFrame(frame);
      } else {
        onComplete();
      }
    }
    rafId = window.requestAnimationFrame(frame);
    return {
      cancel() {
        cancelled = true;
        if (rafId && typeof window.cancelAnimationFrame === "function") {
          window.cancelAnimationFrame(rafId);
        }
      }
    };
  }

  function parseLeadingNumber(str) {
    if (str == null) return 0;
    const cleaned = String(str).replace(/[^\-0-9.]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function animateDigits(element, toValue, opts) {
    if (!element) return { cancel() {} };
    opts = opts || {};
    const from = parseLeadingNumber(element.textContent);
    const isInt = Number.isInteger(toValue) && Number.isInteger(from);
    const decimals = typeof opts.decimals === "number" ? opts.decimals : (isInt ? 0 : 1);
    const suffix = opts.suffix || "";
    const defaultFormat = (v) => {
      if (decimals === 0) return String(Math.round(v)) + suffix;
      return v.toFixed(decimals) + suffix;
    };
    const format = typeof opts.format === "function" ? opts.format : defaultFormat;
    return tween(from, toValue, {
      duration: typeof opts.duration === "number" ? opts.duration : 520,
      ease: opts.ease || easing.fns.easeOut,
      onUpdate(v) { element.textContent = format(v); }
    });
  }

  window.FinCENMotion = {
    easing,
    reducedMotion,
    tween,
    animateDigits
  };
})();
