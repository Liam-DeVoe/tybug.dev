/* figures.js — a tiny D3 chart library for tybug.dev.
 *
 * Each chart is an idiomatic D3 function: `d3.create('svg') … return svg.node()`.
 * All styling lives in _figure.scss (the `.figure__chart` rules); this file never names
 * a colour. Loaded only on articles with `Figures: true` metadata, after
 * d3.min.js. Exposed as the global `Figures`.
 *
 * Usage in an article — figure() inserts the chart where the <script> sits, so
 * there's no placeholder div or id to manage:
 *
 *   <script>
 *     Figures.figure(() => {
 *       const data = Array.from({ length: 600 }, d3.randomNormal()());
 *       return Figures.Histogram(data);
 *     });
 *   </script>
 *
 * For laid-out groups (charts side by side), use explicit
 * <div class="figure" id="…"> containers + mount(target, node).
 */
(function (global) {
  'use strict';
  const d3 = global.d3;
  if (!d3) { console.error('figures.js: d3 must be loaded before figures.js'); return; }

  // Axis titles — d3 axes don't render one, so we append a <text> ourselves.
  // `vertical` rotates it -90 for the y-axis. Styled via .axis-label in
  // _figure.scss. LABEL_PAD is the extra margin a chart reserves when a label is
  // present, so the title clears the tick numbers.
  const LABEL_PAD = 18;
  function axisLabel(svg, text, x, y, vertical) {
    if (!text) return;
    const t = svg.append('text').attr('class', 'axis-label').attr('x', x).attr('y', y).text(text);
    if (vertical) t.attr('transform', `rotate(-90,${x},${y})`);
  }

  // ---- Histogram(data, opts) --------------------------------------------
  // data: number[]
  function Histogram(data, {
    width = 460, height = 230,
    margin = { top: 12, right: 14, bottom: 28, left: 34 },
    thresholds = 22,
    xLabel, yLabel,
  } = {}) {
    margin = { ...margin };                       // reserve room for axis titles
    if (xLabel) margin.bottom += LABEL_PAD;
    if (yLabel) margin.left += LABEL_PAD;
    const x = d3.scaleLinear().domain(d3.extent(data)).nice()
                .range([margin.left, width - margin.right]);
    const bins = d3.bin().domain(x.domain()).thresholds(thresholds)(data);
    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).nice()
                .range([height - margin.bottom, margin.top]);

    const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart');

    svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`)
       .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(''));

    svg.append('g').selectAll('rect').data(bins).join('rect')
       .attr('class', 'bar')
       .attr('x', d => x(d.x0) + 1)
       .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
       .attr('y', d => y(d.length))
       .attr('height', d => y(0) - y(d.length));

    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`)
       .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`)
       .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));

    axisLabel(svg, xLabel, (margin.left + width - margin.right) / 2, height - 4, false);
    axisLabel(svg, yLabel, margin.left - 30, (margin.top + height - margin.bottom) / 2, true);
    return svg.node();
  }

  // ---- LineChart(series, opts) ------------------------------------------
  // series: { role: 'a'|'b'|…, values: {x, y}[] }[]
  function LineChart(series, {
    width = 460, height = 230,
    margin = { top: 14, right: 16, bottom: 28, left: 42 },
    yScale = 'linear',                          // 'linear' | 'log'
    xLabel, yLabel,
  } = {}) {
    margin = { ...margin };                       // reserve room for axis titles
    if (xLabel) margin.bottom += LABEL_PAD;
    if (yLabel) margin.left += LABEL_PAD;
    const allX = series.flatMap(s => s.values.map(d => d.x));
    const allY = series.flatMap(s => s.values.map(d => d.y));
    const x = d3.scaleLinear().domain(d3.extent(allX)).range([margin.left, width - margin.right]);
    const y = (yScale === 'log' ? d3.scaleLog() : d3.scaleLinear())
        .domain(yScale === 'log' ? [d3.min(allY.filter(v => v > 0)), d3.max(allY)] : [0, d3.max(allY)])
        .range([height - margin.bottom, margin.top]);
    if (yScale !== 'log') y.nice();

    const line = d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveMonotoneX);

    const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart');

    svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`)
       .call(d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(''));

    svg.append('g').selectAll('path').data(series).join('path')
       .attr('class', d => `line series--${d.role}`)
       .attr('d', d => line(d.values));

    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`)
       .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));
    const yAxis = yScale === 'log'
        ? d3.axisLeft(y).ticks(6, '.0e').tickSizeOuter(0)
        : d3.axisLeft(y).ticks(5).tickSizeOuter(0);
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(yAxis);

    axisLabel(svg, xLabel, (margin.left + width - margin.right) / 2, height - 4, false);
    axisLabel(svg, yLabel, margin.left - 30, (margin.top + height - margin.bottom) / 2, true);
    return svg.node();
  }

  // ---- ForceGraph(graph, opts) ------------------------------------------
  // graph: { nodes: {id}[], links: {source, target}[] }
  function ForceGraph({ nodes, links }, { width = 460, height = 260 } = {}) {
    nodes = nodes.map(d => ({ ...d }));          // clone — never mutate caller's data
    links = links.map(d => ({ ...d }));

    d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(46))
      .force('charge', d3.forceManyBody().strength(-170))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(15))
      .stop().tick(300);                          // converge, then freeze (static render)

    for (const n of nodes) {                      // keep inside the frame
      n.x = Math.max(16, Math.min(width - 16, n.x));
      n.y = Math.max(16, Math.min(height - 16, n.y));
    }

    const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart');

    svg.append('g').selectAll('line').data(links).join('line')
       .attr('class', 'edge')
       .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
       .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

    const node = svg.append('g').selectAll('g').data(nodes).join('g')
       .attr('class', 'node').attr('transform', d => `translate(${d.x},${d.y})`);
    node.append('circle').attr('r', 6);
    node.append('title').text(d => d.id);

    return svg.node();
  }

  // ---- joint plots ------------------------------------------------------
  // A center panel showing the joint of two variables, flanked by a top (x) and
  // right (y) marginal strip that share the center's scales. JointPlot takes an
  // empirical sample; JointDensity takes analytic pdfs. They differ only in how
  // the three panels are filled, so the layout lives in this shared frame.
  // `equal: true` matches px-per-unit on both axes (so a data circle reads as a
  // circle), insetting whichever axis has slack and centering the plot in it.
  // Both plots accept a `decorate({ svg, x, y })` opt — a hook run after the
  // marks are drawn (so its output layers on top) for annotating in data space.
  // x/y are the final scales (data → pixels), so callers never reconstruct the
  // layout geometry themselves and `equal`'s inset is handled for free.
  function jointFrame({ width, height, margin, marginal, xDomain, yDomain, equal = false, xLabel, yLabel }) {
    margin = { ...margin };                       // reserve room for axis titles
    if (xLabel) margin.bottom += LABEL_PAD;
    if (yLabel) margin.left += LABEL_PAD;
    const x = d3.scaleLinear().domain(xDomain).nice();
    const y = d3.scaleLinear().domain(yDomain).nice();

    // full pixel span available to the center panel (x grows L→R, y bottom→top)
    let xLo = margin.left, xHi = width - margin.right - marginal;
    let yLo = height - margin.bottom, yHi = margin.top + marginal;

    if (equal) {
      const [xd0, xd1] = x.domain(), [yd0, yd1] = y.domain();
      const k = Math.min((xHi - xLo) / (xd1 - xd0), (yLo - yHi) / (yd1 - yd0));  // shared px/unit
      const xPad = ((xHi - xLo) - k * (xd1 - xd0)) / 2;
      const yPad = ((yLo - yHi) - k * (yd1 - yd0)) / 2;
      xLo += xPad; xHi -= xPad;
      yLo -= yPad; yHi += yPad;
    }
    x.range([xLo, xHi]);
    y.range([yLo, yHi]);

    const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart');

    svg.append('g').attr('class', 'grid').attr('transform', `translate(${xLo},0)`)     // horizontal lines
       .call(d3.axisLeft(y).ticks(5).tickSize(-(xHi - xLo)).tickFormat(''));
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${yLo})`)     // vertical lines
       .call(d3.axisBottom(x).ticks(width / 90).tickSize(-(yLo - yHi)).tickFormat(''));

    const centerG = svg.append('g').attr('class', 'center');
    const topG    = svg.append('g').attr('class', 'marginal marginal--x');
    const rightG  = svg.append('g').attr('class', 'marginal marginal--y');

    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${yLo})`)
       .call(d3.axisBottom(x).ticks(width / 90).tickSizeOuter(0));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${xLo},0)`)
       .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));

    axisLabel(svg, xLabel, (xLo + xHi) / 2, height - 4, false);
    axisLabel(svg, yLabel, xLo - 30, (yLo + yHi) / 2, true);

    return {
      svg, x, y, centerG, topG, rightG,
      top:   { base: yHi, lo: yHi - marginal },     // strips hug the (possibly inset) panel
      right: { base: xHi, hi: xHi + marginal },
    };
  }

  // marginal densities — `pts` is [[value, density], …] along the axis, each
  // panel scaled to its own peak so it fills the strip. Drawn as a translucent
  // fill (.density) plus a stroked curve along just the top edge (.density__line),
  // so only the distribution curve is outlined, not the baseline.
  function topMarginal(group, frame, pts) {
    const h = d3.scaleLinear().domain([0, d3.max(pts, d => d[1]) || 1]).range([frame.top.base, frame.top.lo]);
    group.append('path').attr('class', 'density')
      .attr('d', d3.area().curve(d3.curveBasis).x(d => frame.x(d[0])).y0(frame.top.base).y1(d => h(d[1]))(pts));
    group.append('path').attr('class', 'density__line')
      .attr('d', d3.line().curve(d3.curveBasis).x(d => frame.x(d[0])).y(d => h(d[1]))(pts));
  }
  function rightMarginal(group, frame, pts) {
    const w = d3.scaleLinear().domain([0, d3.max(pts, d => d[1]) || 1]).range([frame.right.base, frame.right.hi]);
    group.append('path').attr('class', 'density')
      .attr('d', d3.area().curve(d3.curveBasis).y(d => frame.y(d[0])).x0(frame.right.base).x1(d => w(d[1]))(pts));
    group.append('path').attr('class', 'density__line')
      .attr('d', d3.line().curve(d3.curveBasis).y(d => frame.y(d[0])).x(d => w(d[1]))(pts));
  }

  // gaussian kernel density estimate of `data` over `domain`, Silverman bandwidth.
  function kdeSamples(data, domain, { bandwidth, n = 64 } = {}) {
    const sd = d3.deviation(data) || 1;
    const bw = bandwidth || 1.06 * sd * Math.pow(data.length, -1 / 5);
    const k = v => Math.exp(-0.5 * (v / bw) ** 2) / (bw * Math.sqrt(2 * Math.PI));
    return d3.range(n + 1).map(i => {
      const t = domain[0] + (i / n) * (domain[1] - domain[0]);
      return [t, d3.mean(data, d => k(t - d))];
    });
  }

  // ---- JointPlot(points, opts) ------------------------------------------
  // points: {x, y}[] — an empirical sample. Scatter center; KDE marginals
  // (pass `marginals: 'histogram'` to bin instead).
  function JointPlot(points, {
    width = 460, height = 380,
    margin = { top: 8, right: 8, bottom: 30, left: 38 },
    marginal = 54,
    marginals = 'kde',
    thresholds = 22,
    bandwidth,
    equal = false,
    xLabel, yLabel, decorate,
  } = {}) {
    const xs = points.map(d => d.x), ys = points.map(d => d.y);
    const frame = jointFrame({ width, height, margin, marginal, xDomain: d3.extent(xs), yDomain: d3.extent(ys), equal, xLabel, yLabel });
    const { x, y } = frame;

    frame.centerG.selectAll('circle').data(points).join('circle')
      .attr('class', 'point').attr('cx', d => x(d.x)).attr('cy', d => y(d.y));

    if (marginals === 'histogram') {
      const bx = d3.bin().domain(x.domain()).thresholds(thresholds)(xs);
      const hx = d3.scaleLinear().domain([0, d3.max(bx, b => b.length)]).range([frame.top.base, frame.top.lo]);
      frame.topG.selectAll('rect').data(bx).join('rect').attr('class', 'bar')
        .attr('x', d => x(d.x0) + 1).attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('y', d => hx(d.length)).attr('height', d => frame.top.base - hx(d.length));
      const by = d3.bin().domain(y.domain()).thresholds(thresholds)(ys);
      const wy = d3.scaleLinear().domain([0, d3.max(by, b => b.length)]).range([frame.right.base, frame.right.hi]);
      frame.rightG.selectAll('rect').data(by).join('rect').attr('class', 'bar')
        .attr('y', d => y(d.x1)).attr('height', d => Math.max(0, y(d.x0) - y(d.x1) - 1))
        .attr('x', frame.right.base).attr('width', d => wy(d.length) - frame.right.base);
    } else {
      topMarginal(frame.topG, frame, kdeSamples(xs, x.domain(), { bandwidth }));
      rightMarginal(frame.rightG, frame, kdeSamples(ys, y.domain(), { bandwidth }));
    }
    if (decorate) decorate({ svg: frame.svg, x, y });
    return frame.svg.node();
  }

  // ---- JointDensity({ x, y, joint, xDomain, yDomain }, opts) ------------
  // Analytic mode. x, y: marginal pdf fns (Figures.dist.* or any v => density).
  // joint(a, b): optional explicit joint pdf — defaults to the independent
  // product x(a)·y(b). xDomain/yDomain are required (an analytic density has no
  // sample to measure — the plotting window is the caller's call). Center is a
  // filled contour of the density grid; the marginals are that grid collapsed
  // onto each axis (a Riemann sum over the other variable), so they stay the
  // true marginals even when `joint` is correlated.
  function JointDensity({ x: px, y: py, joint, xDomain, yDomain } = {}, {
    width = 460, height = 380,
    margin = { top: 8, right: 8, bottom: 30, left: 38 },
    marginal = 54, n = 80, levels = 6, equal = false,
    xLabel, yLabel, decorate,
  } = {}) {
    if (!xDomain || !yDomain) { console.error('JointDensity: xDomain and yDomain are required'); return null; }
    const dens = joint || ((a, b) => px(a) * py(b));

    const frame = jointFrame({ width, height, margin, marginal, xDomain, yDomain, equal, xLabel, yLabel });
    const [x0, x1] = frame.x.domain(), [y0, y1] = frame.y.domain();   // .nice()'d bounds
    const gx = i => x0 + (i / (n - 1)) * (x1 - x0);
    const gy = j => y0 + (j / (n - 1)) * (y1 - y0);

    // evaluate the density on an n×n grid, row-major (y outer, x inner)
    const values = new Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) values[j * n + i] = dens(gx(i), gy(j));

    const max = d3.max(values) || 1;
    const contours = d3.contours().size([n, n])
        .thresholds(d3.range(1, levels + 1).map(k => (k / (levels + 1)) * max))(values);
    const project = d3.geoTransform({              // grid coords [0,n) → center pixels
      point(cx, cy) { this.stream.point(frame.x(gx(cx)), frame.y(gy(cy))); },
    });
    // bands faint outside → dense inside. The opacity ramp (0.1 outermost →
    // 0.6 innermost) is computed here from `levels`.
    frame.centerG.selectAll('path').data(contours).join('path')
      .attr('class', 'contour')
      .attr('fill-opacity', (d, i) => levels === 1 ? 0.35 : 0.1 + 0.5 * i / (levels - 1))
      .attr('d', d3.geoPath(project));

    // marginals: collapse the grid onto each axis
    const dxv = (x1 - x0) / (n - 1), dyv = (y1 - y0) / (n - 1);
    const mx = d3.range(n).map(i => { let s = 0; for (let j = 0; j < n; j++) s += values[j * n + i]; return [gx(i), s * dyv]; });
    const my = d3.range(n).map(j => { let s = 0; for (let i = 0; i < n; i++) s += values[j * n + i]; return [gy(j), s * dxv]; });
    topMarginal(frame.topG, frame, mx);
    rightMarginal(frame.rightG, frame, my);

    if (decorate) decorate({ svg: frame.svg, x: frame.x, y: frame.y });
    return frame.svg.node();
  }

  // ---- dist: tiny analytic-distribution kit -----------------------------
  // Sugar for the common pdf formulas. Each returns a pure pdf `v => density` —
  // it knows nothing about plotting windows; the caller passes xDomain/yDomain.
  const dist = {
    normal: (mu = 0, sigma = 1) => v => Math.exp(-0.5 * ((v - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)),
    uniform: (a = 0, b = 1) => v => (v >= a && v <= b) ? 1 / (b - a) : 0,
    exponential: (lambda = 1) => v => v >= 0 ? lambda * Math.exp(-lambda * v) : 0,
  };

  // ---- figure(builder, opts) --------------------------------------------
  // The common case: build a chart and drop it where the calling inline
  // <script> sits — no placeholder div or id to manage. `builder` returns the
  // chart node; `opts.caption` (optional, may contain $math$) is added below it.
  // `opts.zoomable` (default false) makes the chart open in the lightbox on click.
  // Relies on document.currentScript, which is only valid during the script's
  // synchronous run — fine for inline article scripts (null in defer/module).
  function figure(builder, opts = {}) {
    const script = document.currentScript;
    if (!script) { console.warn('Figures.figure: must be called from an inline <script>'); return null; }
    const block = document.createElement('div');
    block.className = opts.zoomable ? 'figure figure--zoomable' : 'figure';
    block.appendChild(builder());
    if (opts.caption) {
      const cap = document.createElement('div');
      cap.className = 'figure__caption';
      cap.innerHTML = opts.caption;
      block.appendChild(cap);
    }
    script.parentNode.insertBefore(block, script);
    return block;
  }

  // ---- mount(target, node) ----------------------------------------------
  // Explicit placement for laid-out groups (e.g. charts side by side): puts a
  // chart node into `target` (selector or element), before a `.figure__caption`
  // if the target has one. Returns the node.
  function mount(target, node) {
    const elem = typeof target === 'string' ? document.querySelector(target) : target;
    if (!elem) { console.warn('Figures.mount: no element matching', target); return null; }
    const caption = elem.querySelector('.figure__caption');
    caption ? elem.insertBefore(node, caption) : elem.append(node);
    return node;
  }

  global.Figures = { Histogram, LineChart, ForceGraph, JointPlot, JointDensity, dist, figure, mount };
})(window);
