// Minimal stand-in for the dashboard runtime, so the same page code runs as a static site.
(function () {
  const SOURCES = {
    shp_monthly: 'data/shp_monthly.csv', shp_month_plan: 'data/shp_month_plan.csv', shp_daily: 'data/shp_daily.csv', shp_mtd: 'data/shp_mtd.csv',
    sku_daily: 'data/sku_daily.csv', items: 'data/items.csv', aff_brand_daily: 'data/aff_brand_daily.csv'
  };
  const store = {}, calcs = {}, cbs = [], cache = {};
  let version = 0;
  const tokens = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
  function load(id) {
    if (store[id]) return;
    store[id] = { status: 'loading', data: [], columns: [] };
    d3.csv(SOURCES[id] + '?v=' + (window.SHP_VERSION || '')).then(rows => {
      store[id] = { status: 'ok', data: rows, columns: rows.columns || [] }; version++; fire();
    }).catch(e => { store[id] = { status: 'error', data: [], message: String(e) }; version++; fire(); });
  }
  function calcData(id) {
    const c = calcs[id];
    const ins = c.inputs.map(i => window.dash.data(i));
    const bad = ins.find(d => d.status !== 'ok');
    if (bad) return { status: bad.status === 'error' ? 'error' : 'loading', data: [] };
    if (cache[id] && cache[id].v === version) return cache[id].r;
    let r;
    try { r = { status: 'ok', data: c.fn(...ins.map(d => d.data)) }; } catch (e) { console.error(id, e); r = { status: 'error', data: [], message: String(e) }; }
    cache[id] = { v: version, r }; return r;
  }
  let pending = false;
  function fire() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; cbs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }); }
  window.dash = {
    data(id) { if (calcs[id]) return calcData(id); if (!SOURCES[id]) return { status: 'missing', data: [] }; load(id); return store[id]; },
    calc(id, o) { calcs[id] = o; },
    loader() {},
    onData(fn) { cbs.push(fn); try { fn(); } catch (e) { console.error(e); } },
    colors: tokens.map(t => `var(${t})`),
    refresh() {}, params() { return {}; }, setParams() {}, resetParams() {},
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) {} }
  };
  Object.keys(SOURCES).forEach(load);
  let w = window.innerWidth; window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - w) > 20) { w = window.innerWidth; fire(); } });
})();
