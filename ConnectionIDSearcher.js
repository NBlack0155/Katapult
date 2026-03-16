(() => {

  // ---------- Shadow DOM helper ----------
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

  // ---------- Prompt for Connection ID ----------
  const connectionId = prompt('Enter Connection ID ***Make sure edit window is open***');

  // ---------- Find katapult map element ----------
  const mapEl = deepQuerySelector(document, 'katapult-map');

  // ---------- Get internal controller dynamically ----------
  const controller = (() => {
    // Try the component itself first
    if (typeof mapEl.zoomToConnection === 'function') return mapEl;
    // Otherwise search for nested object that has zoomToConnection
    for (const k in mapEl) {
      if (mapEl[k] && typeof mapEl[k].zoomToConnection === 'function') return mapEl[k];
    }
    return null;
  })();

  if (!controller) {
    console.error("Couldn't find map controller!");
    return;
  }

  // ---------- Get Job ID dynamically ----------
  const jobId = mapEl.__data?.jobId;

  // ---------- Construct fake event detail ----------
  const fakeEvent = {
    detail: {
      key: connectionId,  // use prompted Connection ID
      jobId: jobId,       // dynamically retrieved Job ID
      type: 'connection',
      domEvent: null
    }
  };

  // ---------- Call selectConnection directly ----------
  mapEl.selectConnection(fakeEvent);

  // ---------- Zoom to connection ----------
  controller.zoomToConnection(connectionId);

})();
