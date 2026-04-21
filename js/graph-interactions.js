/* Pointer + drag interaction layer for the relationship graph canvas.
 * Uses public FinCENViz.hitTestNode + pinNode/unpinNode primitives; does not
 * touch the canvas itself. Callers pass callbacks for graph access + redraw. */
(function () {
  "use strict";

  const CLICK_MOVE_THRESHOLD = 5; // px

  function attach(canvas, opts) {
    opts = opts || {};
    const getGraph = opts.getGraph || (() => ({ nodes: [], edges: [] }));
    const getRiskByEntity = opts.getRiskByEntity || (() => ({}));
    const onDrag = opts.onDrag || (() => {});
    const onDragEnd = opts.onDragEnd || (() => {});
    const onClick = opts.onClick || (() => {});
    const onShiftClick = opts.onShiftClick || null;

    let draggingId = null;
    let activePointerId = null;
    let pointerDownAt = null;
    let movedFarEnough = false;
    let shiftAtPointerDown = false;
    let panning = false;
    let panStart = null;
    let cameraAtPanStart = null;

    function localPoint(evt) {
      const rect = canvas.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }

    function redraw() {
      window.FinCENViz.drawGraph(canvas, getGraph(), getRiskByEntity());
    }

    function onPointerDown(evt) {
      if (evt.button != null && evt.button !== 0) return;
      const { x, y } = localPoint(evt);
      const nodeId = window.FinCENViz.hitTestNode(x, y);
      if (nodeId) {
        draggingId = nodeId;
        activePointerId = evt.pointerId;
        pointerDownAt = { x: evt.clientX, y: evt.clientY };
        movedFarEnough = false;
        shiftAtPointerDown = Boolean(evt.shiftKey);
        const world = window.FinCENViz.screenToWorld(x, y);
        window.FinCENViz.pinNode(nodeId, world.x, world.y);
        if (canvas.setPointerCapture && evt.pointerId != null) {
          try { canvas.setPointerCapture(evt.pointerId); } catch (e) { /* jsdom quirk */ }
        }
        redraw();
        return;
      }
      // Empty space → start panning.
      panning = true;
      activePointerId = evt.pointerId;
      panStart = { x: evt.clientX, y: evt.clientY };
      cameraAtPanStart = window.FinCENViz.getCamera();
    }

    function onPointerMove(evt) {
      if (draggingId) {
        if (activePointerId != null && evt.pointerId != null && evt.pointerId !== activePointerId) return;
        if (pointerDownAt) {
          const dx = evt.clientX - pointerDownAt.x;
          const dy = evt.clientY - pointerDownAt.y;
          if (dx * dx + dy * dy > CLICK_MOVE_THRESHOLD * CLICK_MOVE_THRESHOLD) movedFarEnough = true;
        }
        const { x, y } = localPoint(evt);
        const world = window.FinCENViz.screenToWorld(x, y);
        window.FinCENViz.pinNode(draggingId, world.x, world.y);
        onDrag(draggingId, world.x, world.y);
        redraw();
        return;
      }
      if (panning) {
        if (activePointerId != null && evt.pointerId != null && evt.pointerId !== activePointerId) return;
        const dxScreen = evt.clientX - panStart.x;
        const dyScreen = evt.clientY - panStart.y;
        const zoom = cameraAtPanStart.zoom;
        window.FinCENViz.setCamera(cameraAtPanStart.x - dxScreen / zoom, cameraAtPanStart.y - dyScreen / zoom, zoom);
        redraw();
        return;
      }
      // Hover branch: update highlight state based on node under pointer.
      if (evt.target !== canvas) return;
      const { x, y } = localPoint(evt);
      const nodeId = window.FinCENViz.hitTestNode(x, y);
      const hl = nodeId ? window.FinCENViz.computeHighlight(getGraph(), nodeId) : null;
      window.FinCENViz.setHighlight(hl);
      redraw();
    }

    function onPointerLeave() {
      if (draggingId) return;
      window.FinCENViz.setHighlight(null);
      redraw();
    }

    function onPointerUp(evt) {
      if (panning) {
        if (activePointerId != null && evt.pointerId != null && evt.pointerId !== activePointerId) return;
        panning = false;
        panStart = null;
        cameraAtPanStart = null;
        activePointerId = null;
        return;
      }
      if (!draggingId) return;
      if (activePointerId != null && evt.pointerId != null && evt.pointerId !== activePointerId) return;
      const id = draggingId;
      const wasClick = !movedFarEnough;
      const wasShift = shiftAtPointerDown;
      window.FinCENViz.unpinNode(id);
      draggingId = null;
      activePointerId = null;
      pointerDownAt = null;
      movedFarEnough = false;
      shiftAtPointerDown = false;
      if (wasClick) {
        if (wasShift && onShiftClick) {
          onShiftClick(id);
        } else {
          onClick(id);
        }
      } else {
        onDragEnd(id);
      }
      redraw();
    }

    function onWheel(evt) {
      evt.preventDefault && evt.preventDefault();
      const cam = window.FinCENViz.getCamera();
      const factor = evt.deltaY < 0 ? 1.15 : 1 / 1.15;
      const oldZoom = cam.zoom;
      const newZoomRaw = oldZoom * factor;
      // Zoom around cursor: keep the world point under the cursor stable.
      const { x: cx, y: cy } = localPoint(evt);
      const beforeWorld = window.FinCENViz.screenToWorld(cx, cy);
      // Temporarily set camera to new zoom at current x/y, then adjust x/y so the world point stays.
      window.FinCENViz.setCamera(cam.x, cam.y, newZoomRaw);
      const newZoom = window.FinCENViz.getCamera().zoom;
      const newCamX = beforeWorld.x - cx / newZoom;
      const newCamY = beforeWorld.y - cy / newZoom;
      window.FinCENViz.setCamera(newCamX, newCamY, newZoom);
      redraw();
    }

    function onKeyDown(evt) {
      const tag = evt.target && evt.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const cam = window.FinCENViz.getCamera();
      if (evt.key === "0") {
        window.FinCENViz.setCamera(0, 0, 1);
        redraw();
      } else if (evt.key === "+" || evt.key === "=") {
        window.FinCENViz.setCamera(cam.x, cam.y, cam.zoom * 1.15);
        redraw();
      } else if (evt.key === "-" || evt.key === "_") {
        window.FinCENViz.setCamera(cam.x, cam.y, cam.zoom / 1.15);
        redraw();
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    return function detach() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }

  window.FinCENGraphInteractions = { attach };
})();
