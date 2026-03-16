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

  // ---------- Find katapult map ----------
  const map = deepQuerySelector(document, 'katapult-map');

  // ---------- Get Job ID dynamically ----------
  const jobId = map.__data?.jobId;

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
  map.selectConnection(fakeEvent);
  __katapultController.zoomToConnection(connectionId);
  
})();
