javascript:(() => {
  let paused = false;
  let stopped = false;
  let panelHandled = false;
  let currentUUID = null;

  /* ---------------- UI ---------------- */
  const ui = document.createElement('div');
  Object.assign(ui.style, {
    position: 'fixed',
    top: '10px',
    left: '10px',
    zIndex: 99999,
    background: 'rgba(0,0,0,0.7)',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    gap: '6px'
  });

  const mkBtn = (txt, fn, bg) => {
    const b = document.createElement('button');
    b.textContent = txt;
    Object.assign(b.style, {
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
      background: bg,
      color: '#fff'
    });
    b.onclick = fn;
    ui.appendChild(b);
    return b;
  };

  const pauseBtn = mkBtn('Pause (CTRL)', () => togglePause(), 'green');
  mkBtn('Star (SHIFT)', () => starCurrent(), '#c49a00');
  mkBtn('Stop', () => stopScript(), 'crimson');

  document.body.appendChild(ui);

  /* ---------------- Helpers ---------------- */
  function findAllPhotoViewers(root, out = []) {
    if (!root) return out;
    if (root.tagName === 'KATAPULT-PHOTO-VIEWER') out.push(root);
    if (root.shadowRoot) findAllPhotoViewers(root.shadowRoot, out);
    if (root.children) [...root.children].forEach(c => findAllPhotoViewers(c, out));
    return out;
  }

  function virtualClick(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    ['mouseover','mousedown','mouseup','click'].forEach(t =>
      el.dispatchEvent(new MouseEvent(t, { bubbles:true, clientX:x, clientY:y }))
    );
  }

  function clickLastThumbnail() {
    if (paused || panelHandled) return;
    const root = document.querySelector('#pageElement')?.shadowRoot;
    if (!root) return;

    const viewers = findAllPhotoViewers(root);
    if (!viewers.length) return;

    const last = viewers[viewers.length - 1];
    panelHandled = true;
    virtualClick(last);
    console.log('Opened last thumbnail:', last.id);
  }

  function starCurrent() {
    if (!currentUUID) return console.log('No focused photo UUID');
    const root = document.querySelector('#pageElement')?.shadowRoot;
    const panel = root?.querySelector('katapult-tool-panel#infoPanel')?.shadowRoot;
    if (!panel) return;

    const pv = [...panel.querySelectorAll('katapult-photo-viewer')].find(p => p.id === currentUUID);
    const star = pv?.querySelector('iron-icon.mainPhotoBadge[icon="star"]');
    if (!star) return console.log('Star icon not found');

    star.click();
    console.log('Star clicked for UUID:', currentUUID);
  }

  /* ---------------- Keyboard ---------------- */
  function togglePause() {
    paused = !paused;
    pauseBtn.style.background = paused ? 'orange' : 'green';
    console.log(paused ? 'Paused' : 'Resumed');
  }

  function keyHandler(e) {
    if (e.repeat) return;
    if (e.ctrlKey) togglePause();
    if (e.key === 'Shift') starCurrent();
  }

  document.addEventListener('keydown', keyHandler);

  /* ---------------- XHR Hook ---------------- */
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    this.addEventListener('load', () => {
      if (stopped || paused) return;
      const url = this.responseURL || '';

      // panel opened → thumbnails ready
      if (url.includes('small.webp')) {
        panelHandled = false;
        setTimeout(clickLastThumbnail, 50);
      }

      // fullscreen photo → capture UUID
      if (url.includes('extra_large.webp')) {
        const m = url.match(/photos%2F([a-f0-9-]+)_/i);
        if (m) {
          currentUUID = m[1];
          console.log('Focused photo UUID:', currentUUID);
        }
      }
    });
    return origOpen.apply(this, args);
  };

  /* ---------------- Stop ---------------- */
  function stopScript() {
    stopped = true;
    XMLHttpRequest.prototype.open = origOpen;
    document.removeEventListener('keydown', keyHandler);
    ui.remove();
    console.log('Script stopped and cleaned up');
  }

  console.log('Listener active: small.webp → open last, large.webp → track UUID');
})();
