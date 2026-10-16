(function () {
  const vnd = v => v == null || isNaN(v) ? '—' : Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr' : Math.round(v).toLocaleString('vi-VN') + ' đ';
  const vshort = v => v == null || isNaN(v) ? '—' : Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ' : Math.round(v / 1e6).toLocaleString('vi-VN') + ' tr';
  const pct = v => v == null || isNaN(v) || !isFinite(v) ? '—' : (v * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
  const sgn = v => v == null || isNaN(v) || !isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
  const int = v => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('vi-VN');
  const dl = d => Number(d.slice(8)) + '/' + Number(d.slice(5, 7)) + '/' + d.slice(2, 4);
  const dshort = d => Number(d.slice(8)) + '/' + Number(d.slice(5, 7));
  const n = v => Number(v) || 0;
  const FS = 11, LIVE = dash.colors[0], VIDEO = dash.colors[2];
  const isDD = d => { const day = Number(d.slice(8)), m = Number(d.slice(5, 7)); return Math.abs(day - m) <= 1; };
  const addDays = (d, k) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
  const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
  const page = document.getElementById('brand');
  const st = { range: '30', from: null, to: null, brand: '', ch: 'all', sku: null, qb: '', qs: '', bSort: 'placed', sSort: 'placed' };
  let M = null, cacheKey = null;

  // ---------- model built once per data change ----------
  function model() {
    const sd = dash.data('sku_daily'), it = dash.data('items'), af = dash.data('aff_brand_daily');
    if (sd.status !== 'ok' || it.status !== 'ok') return null;
    const key = sd.data.length + '|' + it.data.length + '|' + (af.status === 'ok' ? af.data.length : -1);
    if (M && cacheKey === key) return M;
    const item = new Map(); it.data.forEach(r => item.set(String(r.item_id), { title: r.title || String(r.item_id), brand: r.brand || 'Chưa xác định', category: r.category || '' }));
    const rows = sd.data.map(r => ({ d: String(r.date).slice(0, 10), id: String(r.item_id), lp: n(r.lp), lc: n(r.lc), lo: n(r.lo), lk: n(r.lk), vp: n(r.vp), vc: n(r.vc) }));
    rows.forEach(r => { const i = item.get(r.id); r.b = i ? i.brand : 'Chưa xác định'; });
    rows.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
    const days = [...new Set(rows.map(r => r.d))];
    const aff = af.status === 'ok' ? af.data.map(r => ({ d: String(r.date).slice(0, 10), b: r.brand, g: n(r.aff_gmv), c: n(r.aff_commission), o: n(r.aff_orders) })) : [];
    const bt = new Map(); rows.forEach(r => bt.set(r.b, (bt.get(r.b) || 0) + r.lp + r.vp));
    const brands = [...bt.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const ad = aff.map(r => r.d).sort();
    M = { item, rows, days, min: days[0], max: days[days.length - 1], aff, brands, affOk: af.status === 'ok' && aff.length > 0, affMin: ad[0], affMax: ad[ad.length - 1] }; cacheKey = key;
    return M;
  }
  const val = r => st.ch === 'live' ? r.lp : st.ch === 'video' ? r.vp : r.lp + r.vp;
  const conf = r => st.ch === 'live' ? r.lc : st.ch === 'video' ? r.vc : r.lc + r.vc;

  function resolveRange() {
    const max = M.max, min = M.min;
    if (st.range === 'custom') { st.from = st.from || addDays(max, -29); st.to = st.to || max; }
    else if (st.range === 'all') { st.from = min; st.to = max; }
    else if (st.range === 'mtd') { st.from = max.slice(0, 8) + '01'; st.to = max; }
    else if (st.range === 'lm') { const f = addDays(max.slice(0, 8) + '01', -1); st.from = f.slice(0, 8) + '01'; st.to = f; }
    else if (st.range === 'ytd') { st.from = max.slice(0, 4) + '-01-01'; st.to = max; }
    else { st.from = addDays(max, -(Number(st.range) - 1)); st.to = max; }
    if (st.from < min) st.from = min; if (st.to > max) st.to = max; if (st.from > st.to) st.from = st.to;
  }
  const inRange = (r, f, t) => r.d >= f && r.d <= t;

  // ---------- helpers for drawing ----------
  function prep(el, ok) { el.innerHTML = ''; el.classList.remove('dash-skeleton'); if (!ok) { el.classList.add('dash-skeleton'); return false; } return true; }
  function textW(svg, s) { const t = svg.append('text').attr('font-size', FS).text(s); const w = t.node().getComputedTextLength(); t.remove(); return w; }
  function frame(el, H) { const W = Math.max(280, el.clientWidth); const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img'); const tip = d3.select(el).append('div').attr('class', 'tip'); return { W, svg, tip }; }
  function showTip(el, tip, ev, head, lines) {
    const [px, py] = d3.pointer(ev, el);
    tip.html(''); tip.append('div').attr('class', 'h').text(head);
    lines.forEach(l => { const r = tip.append('div'); if (l.color) r.append('i').style('background', l.color); r.append('span').text(l.text); });
    tip.style('display', 'block');
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    tip.style('left', Math.min(Math.max(0, px + 14), el.clientWidth - tw) + 'px').style('top', Math.max(0, Math.min(py - th - 8, el.clientHeight - th)) + 'px');
  }
  function legend(id, items) { const lg = d3.select(id); lg.selectAll('*').remove(); items.forEach(it => { const s = lg.append('span'); s.append('i').style('background', it.color); s.append('span').text(it.name); }); }
  function seg(id, opts, get, set) {
    const box = document.getElementById(id);
    if (!box.childElementCount) opts.forEach(o => { const b = document.createElement('button'); b.textContent = o.t; b.dataset.v = o.v; b.addEventListener('click', () => { set(o.v); draw(); }); box.appendChild(b); });
    [...box.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === get())));
  }
  function hbars(el, rows, onClick, sel) {
    const H = Math.max(120, rows.length * 26 + 8);
    const { W, svg, tip } = frame(el, H);
    const maxL = Math.min(W * 0.4, 230);
    const cut = s => { let t = s; while (t.length > 4 && textW(svg, t) > maxL) t = t.slice(0, -2); return t === s ? s : t + '…'; };
    const labels = rows.map(r => cut(r.label)), tot = rows.map(r => d3.sum(r.parts, p => p.v));
    const lw = d3.max(labels, l => textW(svg, l)) + 10, rw = d3.max(tot, t => textW(svg, vshort(t))) + 10;
    const x = d3.scaleLinear([0, d3.max(tot) || 1], [lw, W - rw]);
    rows.forEach((r, i) => {
      const yy = 4 + i * 26, g = svg.append('g').style('cursor', onClick ? 'pointer' : null).style('opacity', sel && sel !== r.key ? 0.45 : 1);
      g.append('text').attr('x', 0).attr('y', yy + 9).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-fg)').text(labels[i]);
      let acc = 0;
      r.parts.forEach((p, j) => { if (!p.v) return; const x0 = x(acc), w = Math.max(1, x(acc + p.v) - x0 - (j < r.parts.length - 1 ? 1 : 0)); g.append('rect').attr('x', x0).attr('y', yy).attr('width', w).attr('height', 18).attr('rx', 3).attr('fill', p.color); acc += p.v; });
      g.append('text').attr('x', x(acc) + 6).attr('y', yy + 9).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(vshort(tot[i]));
      g.append('rect').attr('x', 0).attr('y', yy - 3).attr('width', W).attr('height', 24).attr('fill', 'transparent')
        .on('mousemove', ev => showTip(el, tip, ev, r.label, [...r.parts.filter(p => p.v).map(p => ({ color: p.color, text: p.name + ': ' + vnd(p.v) })), ...(r.extra || [])]))
        .on('mouseleave', () => tip.style('display', 'none')).on('click', () => onClick && onClick(r.key));
    });
  }
  function stacked(el, keys, label, series, H, head) {
    const { W, svg, tip } = frame(el, H);
    const tot = keys.map(k => d3.sum(series, s => s.get(k) || 0));
    const y = d3.scaleLinear([0, d3.max(tot) || 1], [H - 26, 10]).nice();
    const ticks = y.ticks(5), m = { t: 10, r: 8, b: 26, l: d3.max(ticks, t => textW(svg, vshort(t))) + 12 };
    const x = d3.scaleBand(keys, [m.l, W - m.r]).paddingInner(keys.length > 60 ? 0.1 : 0.25).paddingOuter(0.1);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', m.l - 6).attr('y', d => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(vshort);
    keys.forEach(k => { let acc = 0; series.forEach(s => { const v = s.get(k) || 0; if (v <= 0) return; const y0 = y(acc), y1 = y(acc + v); svg.append('rect').attr('x', x(k)).attr('width', x.bandwidth()).attr('y', y1).attr('height', Math.max(0, y0 - y1 - (keys.length > 60 ? 0 : 1))).attr('fill', s.color); acc += v; }); });
    const lw = d3.max(keys, k => textW(svg, label(k))) + 8, every = Math.max(1, Math.ceil(keys.length / Math.max(1, Math.floor((W - m.l - m.r) / lw))));
    svg.append('g').selectAll('text').data(keys.filter((k, i) => i % every === 0)).join('text').attr('x', k => x(k) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(label);
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', H - m.b).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-axis)');
    svg.append('g').selectAll('rect').data(keys).join('rect').attr('x', k => x(k) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', m.t).attr('height', H - m.t - m.b).attr('fill', 'transparent')
      .on('mousemove', (ev, k) => showTip(el, tip, ev, head(k) + ' · tổng ' + vnd(d3.sum(series, s => s.get(k) || 0)), series.filter(s => s.get(k)).map(s => ({ color: s.color, text: s.name + ': ' + vnd(s.get(k)) }))))
      .on('mouseleave', () => tip.style('display', 'none'));
  }
  function fillTable(sel, rows, cols, keyOf, opts = {}) {
    const tb = d3.select(sel).select('tbody'); tb.selectAll('*').remove();
    rows.forEach(r => { const tr = tb.append('tr').attr('data-key', keyOf(r)).attr('class', ['click', opts.selKey != null && opts.selKey === keyOf(r) ? 'sel' : '', r.total ? 'total' : ''].join(' '));
      if (opts.onClick && !r.total) tr.on('click', () => opts.onClick(keyOf(r)));
      cols.forEach(c => { const td = tr.append('td').text(c.f ? c.f(r[c.k]) : (r[c.k] == null || r[c.k] === '' ? '—' : r[c.k])); const cl = typeof c.cls === 'function' ? c.cls(r[c.k]) : c.cls; if (cl) td.attr('class', cl); }); });
  }
  function sortHeads(sel, get, set) {
    document.querySelectorAll(sel + ' th.sort').forEach(th => {
      if (!th.dataset.bound) { th.dataset.bound = 1; th.addEventListener('click', () => { set(th.dataset.k); draw(); }); }
      if (th.dataset.k === get()) th.setAttribute('aria-sort', 'descending'); else th.removeAttribute('aria-sort');
    });
  }
  // time buckets: day (≤62 days), week (≤200), month
  function bucketer(f, t) {
    const span = diffDays(f, t) + 1;
    if (span <= 62) return { kind: 'ngày', key: d => d, label: dshort, head: d => dl(d) };
    if (span <= 200) return { kind: 'tuần', key: d => { const x = new Date(d + 'T00:00:00Z'), w = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - w); return x.toISOString().slice(0, 10); }, label: dshort, head: d => 'Tuần từ ' + dl(d) };
    return { kind: 'tháng', key: d => d.slice(0, 7), label: k => 'T' + Number(k.slice(5)) + '/' + k.slice(2, 4), head: k => 'Tháng ' + Number(k.slice(5)) + '/' + k.slice(0, 4) };
  }
  function allBuckets(f, t, bk) { const out = []; let d = f; while (d <= t) { const k = bk.key(d); if (out[out.length - 1] !== k) out.push(k); d = addDays(d, 1); } return out; }

  // ---------- controls ----------
  const fFrom = document.getElementById('f-from'), fTo = document.getElementById('f-to'), fBrand = document.getElementById('f-brand');
  fFrom.addEventListener('change', () => { if (fFrom.value && fFrom.validity.valid) { st.range = 'custom'; st.from = fFrom.value; st.to = st.to || fTo.value; draw(); } });
  fTo.addEventListener('change', () => { if (fTo.value && fTo.validity.valid) { st.range = 'custom'; st.to = fTo.value; st.from = st.from || fFrom.value; draw(); } });
  [fFrom, fTo].forEach(i => i.addEventListener('blur', () => { if (st.from) { fFrom.value = st.from; fTo.value = st.to; } }));
  fBrand.addEventListener('change', () => { st.brand = fBrand.value; st.sku = null; draw(); });
  document.getElementById('f-reset').addEventListener('click', () => { Object.assign(st, { range: '30', from: null, to: null, brand: '', ch: 'all', sku: null, qb: '', qs: '' }); document.getElementById('q-brand').value = ''; document.getElementById('q-sku').value = ''; draw(); });
  document.getElementById('q-brand').addEventListener('input', e => { st.qb = e.target.value.toLowerCase(); draw(); });
  document.getElementById('q-sku').addEventListener('input', e => { st.qs = e.target.value.toLowerCase(); draw(); });
  const pickBrand = b => { st.brand = st.brand === b ? '' : b; st.sku = null; draw(); };
  const pickSku = k => { st.sku = st.sku === k ? null : k; draw(); };

  function draw() {
    if (page.hidden) return;
    const m = model();
    seg('seg-range', [{ t: '7 ngày', v: '7' }, { t: '15 ngày', v: '15' }, { t: '30 ngày', v: '30' }, { t: 'Tháng này', v: 'mtd' }, { t: 'Tháng trước', v: 'lm' }, { t: 'Từ đầu năm', v: 'ytd' }, { t: 'Tất cả', v: 'all' }], () => st.range, v => { st.range = v; st.from = st.to = null; });
    seg('seg-ch', [{ t: 'Live + Video', v: 'all' }, { t: 'Live', v: 'live' }, { t: 'Video', v: 'video' }], () => st.ch, v => { st.ch = v; });
    const charts = ['ch-top-brand', 'ch-brand-day', 'ch-sku-day', 'ch-sku-top'].map(id => document.getElementById(id));
    if (!m) { charts.forEach(el => prep(el, false)); return; }
    resolveRange();
    const F = st.from, T = st.to, span = diffDays(F, T) + 1, PF = addDays(F, -span), PT = addDays(F, -1);
    fFrom.min = fTo.min = m.min; fFrom.max = fTo.max = m.max;
    if (document.activeElement !== fFrom) fFrom.value = F; if (document.activeElement !== fTo) fTo.value = T;
    const bs = document.getElementById('b-span'); bs.textContent = dl(m.min) + ' – ' + dl(m.max); bs.classList.remove('dash-skeleton');
    if (fBrand.dataset.n !== String(m.brands.length)) { fBrand.dataset.n = m.brands.length; fBrand.replaceChildren(new Option('Tất cả brand', ''), ...m.brands.map(b => new Option(b, b))); }
    fBrand.value = st.brand;

    const cur = m.rows.filter(r => inRange(r, F, T)), prev = m.rows.filter(r => inRange(r, PF, PT));
    const curB = st.brand ? cur.filter(r => r.b === st.brand) : cur, prevB = st.brand ? prev.filter(r => r.b === st.brand) : prev;
    const affCov = m.affOk && F >= m.affMin && T <= m.affMax, prevOk = PF >= m.min;
    const affCur = m.aff.filter(r => r.d >= F && r.d <= T && (!st.brand || r.b === st.brand));
    const S = (rs, f) => rs.reduce((a, r) => a + f(r), 0);
    const placed = S(curB, val), confirmed = S(curB, conf), pPlaced = S(prevB, val), live = S(curB, r => r.lp), video = S(curB, r => r.vp);
    const affG = S(affCur, r => r.g), affC = S(affCur, r => r.c);
    const skuSet = new Set(curB.filter(r => val(r) > 0).map(r => r.id)), brandSet = new Set(curB.filter(r => val(r) > 0).map(r => r.b));
    const ddPlaced = S(curB.filter(r => isDD(r.d)), val);
    const setT = (id, t) => { const el = document.getElementById(id); el.textContent = t; el.classList.remove('dash-skeleton'); };
    const chName = st.ch === 'live' ? 'Live' : st.ch === 'video' ? 'Video' : 'Live + Video';
    setT('k-placed', vnd(placed)); setT('k-placed-n', st.ch === 'all' ? 'Live ' + vshort(live) + ' · Video ' + vshort(video) : chName);
    setT('k-conf', vnd(confirmed)); setT('k-conf-n', pct(placed ? confirmed / placed : null) + ' đơn đã đặt');
    setT('k-prev', prevOk && pPlaced ? sgn(placed / pPlaced - 1) : '—'); setT('k-prev-n', prevOk ? 'Kỳ trước ' + dshort(PF) + '–' + dl(PT) + ': ' + vshort(pPlaced) : 'Kỳ trước (' + dl(PF) + '–' + dl(PT) + ') nằm ngoài vùng có dữ liệu');
    document.getElementById('k-prev').className = 'v ' + (prevOk && pPlaced ? (placed >= pPlaced ? 'ok' : 'bad') : '');
    const affSpan = m.affOk ? dl(m.affMin) + '–' + dl(m.affMax) : '';
    setT('k-aff', affCov ? vnd(affG) : '—'); setT('k-aff-n', affCov ? 'Hoa hồng ' + vshort(affC) + ' (' + pct(affG ? affC / affG : null) + ')' : (m.affOk ? 'Affiliate chỉ có số ' + affSpan : 'Chưa có dữ liệu'));
    document.getElementById('n-aff').textContent = affCov || !m.affOk ? '' : 'Cột Affiliate để trống vì Affiliate chỉ có số ' + affSpan + '.';
    setT('k-cnt', int(brandSet.size) + ' · ' + int(skuSet.size)); setT('k-cnt-n', st.brand ? 'SKU của ' + st.brand : 'brand · SKU');

    // brand aggregates
    const bm = new Map();
    const get = b => { let a = bm.get(b); if (!a) { a = { brand: b, placed: 0, live: 0, video: 0, confirmed: 0, prev: 0, dd: 0, normal: 0, nDays: new Set(), aff_gmv: 0, aff_commission: 0, skus: new Set() }; bm.set(b, a); } return a; };
    cur.forEach(r => { const v = val(r); if (!v && !conf(r)) return; const a = get(r.b); a.placed += v; a.live += r.lp; a.video += r.vp; a.confirmed += conf(r); if (v > 0) a.skus.add(r.id); if (isDD(r.d)) a.dd += v; else { a.normal += v; if (v > 0) a.nDays.add(r.d); } });
    if (prevOk) prev.forEach(r => { const a = bm.get(r.b); if (a) a.prev += val(r); });
    if (affCov) m.aff.forEach(r => { if (r.d >= F && r.d <= T) { const a = bm.get(r.b) || (r.g ? get(r.b) : null); if (a) { a.aff_gmv += r.g; a.aff_commission += r.c; } } });
    const totAll = [...bm.values()].reduce((s, a) => s + a.placed, 0);
    const brandRows = [...bm.values()].map(a => ({ ...a, share: totAll ? a.placed / totAll : null, prev_growth: a.prev ? a.placed / a.prev - 1 : null, dd_share: a.placed ? a.dd / a.placed : null, avg_normal: a.nDays.size ? a.normal / a.nDays.size : null, skus: a.skus.size }));
    const top = brandRows.filter(r => r.placed > 0 && r.brand !== 'Chưa xác định').sort((a, b) => b.placed - a.placed);
    const topBrand = top[0];

    const takeEl = document.getElementById('b-take');
    const range = dl(F) + ' – ' + dl(T) + ' (' + span + ' ngày)';
    takeEl.textContent = st.brand
      ? `${range}: ${st.brand} đạt ${vnd(placed)} GMV đơn đã đặt (${chName}), ${prevOk && pPlaced ? sgn(placed / pPlaced - 1) + ' so với kỳ trước' : 'kỳ trước chưa đủ dữ liệu để so'}; ${pct(totAll ? placed / totAll : null)} tổng GMV kênh, ngày đôi chiếm ${pct(placed ? ddPlaced / placed : null)}.`
      : `${range}: ${chName} đạt ${vnd(placed)} GMV đơn đã đặt từ ${int(brandSet.size)} brand, ${prevOk && pPlaced ? sgn(placed / pPlaced - 1) + ' so với kỳ trước' : 'kỳ trước chưa đủ dữ liệu để so'}. ${topBrand ? topBrand.brand + ' dẫn đầu với ' + pct(topBrand.share) + '; ' : ''}ngày đôi chiếm ${pct(placed ? ddPlaced / placed : null)}.`;

    // top brands
    const elT = charts[0];
    if (prep(elT, true)) {
      hbars(elT, top.slice(0, 15).map(r => ({ key: r.brand, label: r.brand, parts: [st.ch !== 'video' && { name: 'Live', color: LIVE, v: r.live }, st.ch !== 'live' && { name: 'Video', color: VIDEO, v: r.video }].filter(Boolean), extra: [{ text: 'Tỷ trọng: ' + pct(r.share) }, { text: 'So kỳ trước: ' + sgn(r.prev_growth) }, { text: 'Ngày đôi: ' + pct(r.dd_share) }] })), pickBrand, st.brand);
      legend('#lg-top-brand', [st.ch !== 'video' && { name: 'Live', color: LIVE }, st.ch !== 'live' && { name: 'Video', color: VIDEO }].filter(Boolean));
    }

    // over time
    const bk = bucketer(F, T), keys = allBuckets(F, T, bk), elD = charts[1];
    document.getElementById('h-brand-day').textContent = 'GMV theo ' + bk.kind + (st.brand ? ' · ' + st.brand : ' · top 5 brand');
    if (prep(elD, true)) {
      if (st.brand) {
        const agg = new Map(); curB.forEach(r => { const k = bk.key(r.d); const a = agg.get(k) || { l: 0, v: 0 }; a.l += r.lp; a.v += r.vp; agg.set(k, a); });
        const series = [st.ch !== 'video' && { name: 'Live', color: LIVE, get: k => (agg.get(k) || {}).l }, st.ch !== 'live' && { name: 'Video', color: VIDEO, get: k => (agg.get(k) || {}).v }].filter(Boolean);
        document.getElementById('n-brand-day').textContent = 'GMV đơn đã đặt của ' + st.brand + ' theo ' + bk.kind + '.';
        stacked(elD, keys, bk.label, series, 420, bk.head); legend('#lg-brand-day', series);
      } else {
        const t5 = top.slice(0, 5).map(r => r.brand), agg = new Map();
        cur.forEach(r => { const v = val(r); if (!v) return; const k = bk.key(r.d), b = t5.includes(r.b) ? r.b : 'Khác'; const a = agg.get(k) || {}; a[b] = (a[b] || 0) + v; agg.set(k, a); });
        const series = [...t5.map((b, i) => ({ name: b, color: dash.colors[[0, 1, 3, 4, 5][i]], get: k => (agg.get(k) || {})[b] })), { name: 'Khác', color: 'var(--cds-chart-muted)', get: k => (agg.get(k) || {})['Khác'] }];
        document.getElementById('n-brand-day').textContent = 'GMV đơn đã đặt theo ' + bk.kind + ', chồng theo 5 brand lớn nhất trong khoảng; phần còn lại gộp "Khác".';
        stacked(elD, keys, bk.label, series, 420, bk.head); legend('#lg-brand-day', series);
      }
    }

    // brand table
    sortHeads('#tbl-brand', () => st.bSort, v => { st.bSort = v; });
    const bt = brandRows.filter(r => (r.placed > 0 || r.aff_gmv > 0) && (!st.qb || r.brand.toLowerCase().includes(st.qb))).sort((a, b) => (b[st.bSort] ?? -1e18) - (a[st.bSort] ?? -1e18));
    fillTable('#tbl-brand', bt.slice(0, 250), [{ k: 'brand' }, { k: 'placed', f: vnd }, { k: 'share', f: pct }, { k: 'live', f: vnd }, { k: 'video', f: vnd }, { k: 'confirmed', f: vnd }, { k: 'prev_growth', f: sgn, cls: v => v == null ? '' : v >= 0 ? 'ok' : 'bad' }, { k: 'dd_share', f: pct }, { k: 'avg_normal', f: vnd }, { k: 'aff_gmv', f: affCov ? vnd : () => '—' }, { k: 'aff_commission', f: affCov ? vnd : () => '—' }, { k: 'skus', f: int }], r => r.brand, { onClick: pickBrand, selKey: st.brand });
    document.getElementById('m-brand').textContent = int(bt.length) + ' brand' + (bt.length > 250 ? ' · hiện 250 dòng đầu' : '');

    // SKU aggregates
    const sm = new Map();
    curB.forEach(r => { let a = sm.get(r.id); if (!a) { const i = m.item.get(r.id) || {}; a = { item_id: r.id, title: i.title || r.id, brand: r.b, placed: 0, live: 0, video: 0, confirmed: 0, orders: 0, clicks: 0, dd: 0, days: 0 }; sm.set(r.id, a); }
      const v = val(r); a.placed += v; a.live += r.lp; a.video += r.vp; a.confirmed += conf(r); a.orders += r.lo; a.clicks += r.lk; if (isDD(r.d)) a.dd += v; if (v > 0) a.days++; });
    const skus = [...sm.values()].filter(a => a.placed > 0 || a.confirmed > 0).sort((a, b) => b.placed - a.placed);
    skus.forEach((a, i) => { a.rank = i + 1; a.cr = a.clicks ? a.orders / a.clicks : null; a.dd_share = a.placed ? a.dd / a.placed : null; });
    sortHeads('#tbl-sku', () => st.sSort, v => { st.sSort = v; });
    const stbl = skus.filter(a => !st.qs || (a.title + ' ' + a.item_id + ' ' + a.brand).toLowerCase().includes(st.qs)).sort((a, b) => b[st.sSort] - a[st.sSort]);
    fillTable('#tbl-sku', stbl.slice(0, 300), [{ k: 'rank', f: int }, { k: 'title', cls: 'wrap' }, { k: 'brand', cls: 'l' }, { k: 'placed', f: vnd }, { k: 'live', f: vnd }, { k: 'video', f: vnd }, { k: 'confirmed', f: vnd }, { k: 'orders', f: int }, { k: 'clicks', f: int }, { k: 'cr', f: pct }, { k: 'dd_share', f: pct }, { k: 'days', f: int }, { k: 'item_id' }], r => r.item_id, { onClick: pickSku, selKey: st.sku });
    document.getElementById('m-sku').textContent = int(stbl.length) + ' SKU' + (stbl.length > 300 ? ' · hiện 300 dòng đầu, dùng ô tìm để lọc' : '');

    const elS = charts[3];
    if (prep(elS, true)) hbars(elS, skus.slice(0, 12).map(a => ({ key: a.item_id, label: a.title, parts: [st.ch !== 'video' && { name: 'Live', color: LIVE, v: a.live }, st.ch !== 'live' && { name: 'Video', color: VIDEO, v: a.video }].filter(Boolean), extra: [{ text: a.brand }, { text: 'Ngày đôi: ' + pct(a.dd_share) }] })), pickSku, st.sku);

    const elK = charts[2], pick = st.sku && sm.has(st.sku) ? st.sku : (skus[0] || {}).item_id;
    if (prep(elK, true) && pick) {
      const info = sm.get(pick), agg = new Map();
      curB.forEach(r => { if (r.id !== pick) return; const k = bk.key(r.d); const a = agg.get(k) || { l: 0, v: 0 }; a.l += r.lp; a.v += r.vp; agg.set(k, a); });
      document.getElementById('h-sku-day').textContent = 'Diễn biến · ' + info.title.slice(0, 60) + (info.title.length > 60 ? '…' : '');
      document.getElementById('n-sku-day').textContent = (st.sku === pick ? '' : 'SKU lớn nhất trong bộ lọc. ') + 'GMV đơn đã đặt theo ' + bk.kind + '; bấm SKU khác trong bảng để đổi.';
      const series = [st.ch !== 'video' && { name: 'Live', color: LIVE, get: k => (agg.get(k) || {}).l }, st.ch !== 'live' && { name: 'Video', color: VIDEO, get: k => (agg.get(k) || {}).v }].filter(Boolean);
      stacked(elK, keys, bk.label, series, 260, bk.head); legend('#lg-sku-day', series);
    }
  }

  dash.onData(draw);
  document.getElementById('tab-brand').addEventListener('click', () => setTimeout(draw, 0));
  if (location.hash.slice(1) === 'brand') document.getElementById('tab-brand').click();
})();
