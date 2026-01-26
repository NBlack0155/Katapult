javascript:(() => {
  let paused = false;
  let stopped = false;
  let panelHandled = false;
  let currentUUID = null;
  let selectedIndex = -1;
  let selectedKeys = new Set();
  let ironListUI = null;

  // ---------------- Shadow DOM Helpers ----------------
  function deepQuerySelector(root, selector) {
    const walk = node => {
      if (!node) return null;
      if (node.nodeType === 1 && node.matches?.(selector)) return node;
      if (node.shadowRoot) {
        const found = walk(node.shadowRoot);
        if (found) return found;
      }
      for (const child of node.children || []) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(root);
  }

  function deepQuerySelectorAll(selector, root = document) {
    const results = [];
    (function walk(node) {
      if (!node) return;
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches?.(selector)) results.push(node);
        if (node.shadowRoot) walk(node.shadowRoot);
      }
      node.children && [...node.children].forEach(walk);
    })(root);
    return results;
  }

  // ---------------- Grab Map & JobId ----------------
  const map = deepQuerySelector(document, 'katapult-map');
  if (!map) return console.log('katapult-map not found');

  const JOB_ID = map.__data?.jobId;
  if (!JOB_ID) return console.log('jobId not found on map');

  // ---------------- Grab IronList ----------------
  const desktop = deepQuerySelector(document, 'katapult-maps-desktop')?.shadowRoot;
  if (!desktop) return console.log('katapult-maps-desktop not found');

  const poleList = deepQuerySelector(desktop, 'katapult-drop-down#poleList')?.shadowRoot;
  if (!poleList) return console.log('PoleList not found');

  const ironList = poleList.querySelector('iron-list#ironList');
  if (!ironList) return console.log('IronList not found');

  const items = ironList.items || [];
  if (!items.length) return console.log('IronList empty');

  // ---------------- Main UI ----------------
  ironListUI = document.createElement('div');
  ironListUI.id = 'katapultIronListUI';
  Object.assign(ironListUI.style, {
    position: 'fixed', top: '20px', left: '20px', width: '350px', height: '450px',
    background: 'rgba(30,30,30,0.95)', color:'#fff', borderRadius:'8px', padding:'8px',
    display:'flex', flexDirection:'column', gap:'6px', zIndex:99999, overflow:'hidden',
    boxShadow:'0 4px 16px rgba(0,0,0,0.4)', resize:'both', cursor:'move'
  });

  // ---------------- Dragging ----------------
  let dragOffsetX = 0, dragOffsetY = 0, dragging = false;
  ironListUI.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON' || e.target.dataset.key) return;
    dragging = true;
    const rect = ironListUI.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    ironListUI.style.left = (e.clientX - dragOffsetX) + 'px';
    ironListUI.style.top = (e.clientY - dragOffsetY) + 'px';
  });
  document.addEventListener('mouseup', () => dragging = false);

  // ---------------- Header ----------------
  const header = document.createElement('div');
  Object.assign(header.style, { display: 'flex', justifyContent: 'center', fontWeight: 'bold' });
  header.textContent = 'Filtered List + Controls';
  ironListUI.appendChild(header);

  // ---------------- List Container ----------------
  const listContainer = document.createElement('div');
  Object.assign(listContainer.style, { flex:'1', overflowY:'auto', border:'1px solid #444', borderRadius:'4px', padding:'4px', display:'flex', flexDirection:'column', gap:'2px' });

  const listItems = items.map((it, idx) => {
    const el = document.createElement('div');
    el.textContent = it.key;
    Object.assign(el.style, { padding:'4px 6px', borderRadius:'4px', cursor:'pointer', background:'#222' });
    el.dataset.key = it.key;
    el.onclick = () => selectItem(idx);
    listContainer.appendChild(el);
    return el;
  });
  ironListUI.appendChild(listContainer);

  // ---------------- Buttons ----------------
  const btnContainer = document.createElement('div');
  Object.assign(btnContainer.style, { display:'flex', flexWrap:'wrap', gap:'6px' });
  ironListUI.appendChild(btnContainer);

  const pauseBtn = mkBtn('Pause', togglePause, 'green', btnContainer);
  const starBtn = mkBtn('Star (SHIFT)', starCurrent, '#c49a00', btnContainer);
  const wBtn = mkBtn('W', () => selectItem(selectedIndex-1), '#444', btnContainer);
  const aBtn = mkBtn('A', () => fireIronKey('left'), '#444', btnContainer);
  const sBtn = mkBtn('S', () => selectItem(selectedIndex+1), '#444', btnContainer);
  const dBtn = mkBtn('D', () => fireIronKey('right'), '#444', btnContainer);
  const stopBtn = mkBtn('Stop', stopScript, 'crimson', btnContainer);

  document.body.appendChild(ironListUI);

  function mkBtn(txt, fn, bg, container){
    const b = document.createElement('button');
    b.textContent = txt;
    Object.assign(b.style, { padding:'4px 8px', fontSize:'12px', cursor:'pointer', background:bg, color:'#fff', borderRadius:'6px' });
    b.onclick = fn;
    container.appendChild(b);
    return b;
  }
  
  // ---------------- WASD Tooltips ----------------
function addTooltip(btn, text){
  const tip = document.createElement('div');
  tip.textContent = text;
  Object.assign(tip.style, {
    position: 'fixed',
    background: '#333',
    color: '#fff',
    padding: '4px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s',
    zIndex: 100000
  });
  document.body.appendChild(tip);

  btn.addEventListener('mouseenter', e=>{
    const rect = btn.getBoundingClientRect();
    tip.style.left = rect.right + 8 + 'px';
    tip.style.top = rect.top + 'px';
    tip.style.opacity = 1;
  });
  btn.addEventListener('mouseleave', ()=> tip.style.opacity = 0);
}

// Add tooltips to WASD buttons
addTooltip(wBtn, 'Press to go UP in List');
addTooltip(sBtn, 'Press to go DOWN in List');
addTooltip(aBtn, 'Press to go LEFT in Photos');
addTooltip(dBtn, 'Press to go RIGHT in Photos');


  // ---------------- IronList Select ----------------
  function selectItem(idx) {
    if (paused) return;
    if (idx < 0) idx = 0;
    if (idx >= listItems.length) idx = listItems.length - 1;
    selectedIndex = idx;
    const it = items[idx];
    selectedKeys.add(it.key);

    console.log('Selecting item:', it.key, 'at index', idx);
    console.log('JOB_ID used for dispatch:', JOB_ID);

    // Dispatch map selection event
    try {
      map.dispatchEvent(new CustomEvent('select-item', {
        detail: { key: it.key, jobId: JOB_ID, type: 'node', actionTaken: false },
        bubbles: true,
        composed: true
      }));
      console.log('Event dispatched successfully');
    } catch (err) {
      console.error('Error dispatching select-item event:', err);
    }

    // Update UI colors
    listItems.forEach((li, i) => {
      if (i === selectedIndex) li.style.background = '#0a84ff';
      else if (selectedKeys.has(li.dataset.key)) li.style.background = '#444';
      else li.style.background = '#222';
    });

    listItems[selectedIndex].scrollIntoView({ block: 'nearest' });
  }

  // ---------------- Keyboard ----------------
  const keyHandler = e => {
    if(e.repeat) return;
    if(e.target.tagName==='INPUT'||e.target.isContentEditable) return;
    if(paused) return;
    if(e.key==='Shift') starCurrent();
    if(e.key.toLowerCase()==='w') { selectItem(selectedIndex-1); e.preventDefault(); }
    if(e.key.toLowerCase()==='s') { selectItem(selectedIndex+1); e.preventDefault(); }
    if(e.key.toLowerCase()==='a') { fireIronKey('left'); e.preventDefault(); }
    if(e.key.toLowerCase()==='d') { fireIronKey('right'); e.preventDefault(); }
  };
  document.addEventListener('keydown', keyHandler);

  // ---------------- Map / Photo Functions ----------------
  function togglePause(){ paused=!paused; pauseBtn.style.background=paused?'orange':'green'; }
  function findAllPhotoViewers(root,out=[]){ if(!root) return out; if(root.tagName==='KATAPULT-PHOTO-VIEWER') out.push(root); if(root.shadowRoot) findAllPhotoViewers(root.shadowRoot,out); if(root.children) [...root.children].forEach(c=>findAllPhotoViewers(c,out)); return out; }
  function virtualClick(el){ const r=el.getBoundingClientRect(); const x=r.left+r.width/2; const y=r.top+r.height/2; ['mouseover','mousedown','mouseup','click'].forEach(t=>el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:x,clientY:y}))); }
  function clickLastThumbnail(){ if(paused||panelHandled) return; const root=document.querySelector('#pageElement')?.shadowRoot; if(!root) return; const viewers=findAllPhotoViewers(root); if(!viewers.length) return; panelHandled=true; virtualClick(viewers[viewers.length-1]); }
  function starCurrent(){ if(paused||!currentUUID) return; const root=document.querySelector('#pageElement')?.shadowRoot; const panel=root?.querySelector('katapult-tool-panel#infoPanel')?.shadowRoot; if(!panel) return; const pv=[...panel.querySelectorAll('katapult-photo-viewer')].find(p=>p.id===currentUUID); const star=pv?.querySelector('iron-icon.mainPhotoBadge[icon="star"]'); if(star) star.click(); }

  // ---------------- Polymer Arrow Control ----------------
  function fireIronKey(dir) {
    const keyEl = deepQuerySelectorAll(`iron-a11y-keys[keys="${dir}"]`)[0];
    if (!keyEl) return;
    keyEl.dispatchEvent(new CustomEvent('keys-pressed', { bubbles: true, composed: true, detail: { key: dir } }));
  }

  // ---------------- XHR Hook ----------------
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args){
    this.addEventListener('load', ()=>{
      if(stopped||paused) return;
      const url=this.responseURL||'';
      if(url.includes('small.webp')){ panelHandled=false; setTimeout(clickLastThumbnail,50); }
      if(url.includes('extra_large.webp')){ const m=url.match(/photos%2F([a-f0-9-]+)_/i); if(m) currentUUID=m[1]; }
    });
    return origOpen.apply(this,args);
  };

  // ---------------- Stop ----------------
  function stopScript(){
    stopped=true;
    XMLHttpRequest.prototype.open = origOpen;
    document.body.removeChild(ironListUI);
    document.removeEventListener('keydown', keyHandler);
    console.log('Script stopped and cleaned up');
  }

  console.log('Master script fully initialized');
})();
