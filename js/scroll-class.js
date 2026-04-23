/* Scroll → class-toggle primitive with hysteresis.
 *
 * Given an `enterAt` (scrollY at which the `on` state becomes true), an
 * `exitAt` (scrollY at which it flips back to false), and a `toggle(on)`
 * callback, wires up a passive scroll listener and invokes toggle only when
 * the boolean state actually changes. Invokes toggle(false) synchronously on
 * bind so callers start in a known state.
 *
 * Usage:
 *   const { dispose } = FinCENScrollClassToggle.bind({
 *     enterAt: 44,
 *     exitAt: 20,
 *     toggle: (on) => document.body.classList.toggle("is-scrolled", on)
 *   });
 */
(function () {
  "use strict";

  function bind(opts) {
    const enterAt = Number(opts && opts.enterAt);
    const exitAt = Number(opts && opts.exitAt);
    const toggle = opts && opts.toggle;
    if (typeof toggle !== "function") {
      throw new TypeError("FinCENScrollClassToggle.bind: opts.toggle must be a function");
    }
    if (!(enterAt > exitAt)) {
      throw new RangeError("FinCENScrollClassToggle.bind: enterAt must be > exitAt");
    }
    let on = false;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      let next = on;
      if (!on && y > enterAt) next = true;
      else if (on && y < exitAt) next = false;
      if (next !== on) {
        on = next;
        toggle(on);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    toggle(on); // initial sync
    return {
      dispose() {
        window.removeEventListener("scroll", onScroll);
      }
    };
  }

  window.FinCENScrollClassToggle = { bind };
})();
