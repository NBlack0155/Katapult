(() => {
  // ---------- Shadow helper ----------
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

  // ---------- Prompt ----------
  const nodeId = prompt('Enter Node ID');
  if (!nodeId) return console.log('No nodeId entered');

  // ---------- Open node (THIS IS THE CORE) ----------
  const map = deepQuerySelector(document, 'katapult-map');
  if (!map) return console.log('katapult-map not found');

  const jobId = map.__data?.jobId;
  if (!jobId) return console.log('jobId not found');

  map.dispatchEvent(new CustomEvent('select-item', {
    detail: {
      key: nodeId,
      jobId,
      type: 'node',
      actionTaken: false
    },
    bubbles: true,
    composed: true
  }));

  // ---------- Optional: zoom to node coordinates ----------
  const info = deepQuerySelector(document, '.smallInfo');
  if (!info) {
    console.log('Node opened; no coordinates found for zoom');
    return;
  }

  const [lat, lng] = info.textContent.split(',').map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    console.log('Node opened; invalid coordinates');
    return;
  }

  const gmapEl = deepQuerySelector(map.shadowRoot, 'google-map');
  const gmap =
    gmapEl?.map ||
    gmapEl?.__map ||
    gmapEl?._map ||
    gmapEl?.__data?.map;

  if (!gmap) {
    console.log('Node opened; map instance unavailable');
    return;
  }

  // Hard center, aggressive zoom
  gmap.setZoom(20);
  gmap.setCenter({ lat, lng });

  console.log('Node opened and map centered');
})();
