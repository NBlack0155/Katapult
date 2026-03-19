(() => {

  function deepQuerySelector(root, selector) {
    const walk = n => {
      if (!n) return null;
      if (n.nodeType === 1 && n.matches?.(selector)) return n;
      if (n.shadowRoot) {
        const f = walk(n.shadowRoot);
        if (f) return f;
      }
      for (const c of n.children || []) {
        const f = walk(c);
        if (f) return f;
      }
      return null;
    };
    return walk(root);
  }

  const nodeId = prompt('Enter Node ID ***Make sure edit window is open***');

  const mapEl = deepQuerySelector(document, 'katapult-map');

  const controller = (() => {
    if (typeof mapEl.zoomToNode === 'function') return mapEl;
    for (const k in mapEl) {
      if (mapEl[k] && typeof mapEl[k].zoomToNode === 'function') return mapEl[k];
    }
    return null;
  })();

  if (!controller) {
    console.error("Couldn't find map controller!");
    return;
  }

  const jobId = mapEl.__data?.jobId;

  const fakeEvent = {
    detail: {
      key: nodeId,
      jobId: jobId,
      type: 'node',
      domEvent: null
    }
  };

  // ---------- select node first ----------
  mapEl.selectNode(fakeEvent);

  // ---------- let app do its normal zoom ----------
  controller.zoomToNode(nodeId);

  // ---------- post-zoom adjustment (safe hook) ----------
  requestAnimationFrame(() => {
    try {
      const map = controller.map;
      if (!map?.getZoom) return;

      const current = map.getZoom();

      // only adjust if app lands on the "bad" zoom
      if (current === 18) {
        map.setZoom(23);
      }
    } catch (e) {
      console.warn("Zoom adjustment skipped:", e);
    }
  });

})();
