---
title: Activated swarm testing
date: 2026-06-03
tags: coding
slug: activated-swarm-testing
figures: true
---

<style>
    /* push/pop bug region — shared by both figures */
    .figure__chart .bug-region__fill {
        fill: #de1010;
        fill-opacity: 0.18;
    }
    .figure__chart .bug-region__frontier {
        fill: none;
        stroke: #d62828;
        stroke-width: 1.4px;
        stroke-opacity: 0.8;
    }
    .figure__chart .bug-region__label {
        fill: #d62828;
        font-size: 12px;
        font-style: italic;
        text-anchor: middle;
    }
    /* "unlikely to be explored" band — article-local one-off grey, not a palette token */
    .figure__chart .unexplored__hatch {
        stroke: #9a9a9a;
        stroke-width: 1px;
        stroke-opacity: 0.55;
    }
    .figure__chart .unexplored__fill {
        fill: url(#swarm-unexplored-hatch);
        stroke: #9a9a9a;
        stroke-width: 1px;
        stroke-opacity: 0.5;
        stroke-dasharray: 3 3;
    }
    .figure__chart .unexplored__label {
        fill: #6f6f6f;
        font-size: 12px;
        font-style: italic;
        text-anchor: middle;
    }
    /* swarm decomposition figure */
    /* This chart's viewBox is 520 wide vs the JointDensity charts' 460, so at
       width:100% its text renders ~0.885x smaller. Scale the fonts up by 520/460
       so axis titles (12px) and ticks (11px) match the first two figures. */
    .figure__chart.swarm .axis-label {
        font-size: 13.5px;
    }
    .figure__chart.swarm .axis text {
        font-size: 12.5px;
    }
    .swarm__contour {
        fill: var(--color-figure-rust);
        stroke: none;
    }
    .swarm__area {
        fill: var(--swarm-color);
        fill-opacity: 0.13;
        stroke: none;
    }
    .swarm__line {
        fill: none;
        stroke: var(--swarm-color);
        stroke-width: 1.5px;
        stroke-linejoin: round;
        stroke-linecap: round;
    }
    .swarm__bracket {
        fill: none;
        stroke: var(--swarm-color);
        stroke-width: 1px;
        stroke-opacity: 0.35;
        stroke-dasharray: 2 3;
    }
    .swarm__component--both {
        --swarm-color: var(--color-figure-rust);
    }
    .swarm__component--push {
        --swarm-color: var(--color-figure-teal);
    }
    .swarm__component--pop {
        --swarm-color: var(--color-figure-gold);
    }
    /* interactive "build up the swarm distribution" figure */
    .swarm-build__controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6em;
        align-items: center;
        justify-content: center;
        margin-top: 0.8em;
    }
    /* break spacer: no-op on desktop, forces count + reset onto a new line on mobile */
    .swarm-build__break {
        display: none;
    }
    .swarm-build__btn {
        cursor: pointer;
        user-select: none;
        padding: 0.3em 0.9em;
        border: 1px solid #ccc;
        border-radius: 3px;
        color: #444;
        font-size: 0.9em;
    }
    .swarm-build__btn:hover {
        border-color: var(--color-figure-rust);
        color: var(--color-figure-rust);
    }
    .swarm-build__count {
        color: #6f6f6f;
        font-size: 0.9em;
        font-variant-numeric: tabular-nums;
        min-width: 6em;
    }
    @media (max-width: 40em) {
        .swarm-build__controls {
            row-gap: 0.4em;
        }
        .swarm-build__break {
            display: block;
            flex-basis: 100%;
            height: 0;
        }
    }
    /* interactive "pick one activation config" hover figure */
    .figure__chart .swarm-hover__dot {
        fill: var(--color-figure-rust);
        stroke: #fff;
        stroke-width: 1px;
    }
    .figure__chart .swarm-hover__guide {
        stroke: var(--color-figure-rust);
        stroke-width: 1px;
        stroke-opacity: 0.4;
        stroke-dasharray: 3 3;
    }
    /* idle "ping" cue: solid dot pinging outward; signals the panel is interactive.
       Geometry/cadence are JS-driven (see the figure script); SCSS owns only the fill. */
    .figure__chart .swarm-hover__cue {
        pointer-events: none;
    }
    .figure__chart .swarm-hover__ping,
    .figure__chart .swarm-hover__core {
        fill: var(--color-figure-rust);
    }
    .figure__chart .swarm-hover__cue-label {
        fill: #6f6f6f;
        font-size: 11px;
        font-style: italic;
        text-anchor: middle;
    }
    .swarm-hover__readout {
        text-align: center;
        margin-top: 0.6em;
        color: #6f6f6f;
        font-size: 0.9em;
        font-variant-numeric: tabular-nums;
    }
    .swarm-hover__readout .val {
        color: var(--color-figure-rust);
    }
</style>

<script>
    // Shared helpers for the two figures below, so the bug-region geometry and the
    // axis-title subscripts can be tweaked in one place. (Article-local, not part of
    // the shared figures.js system.)

    // Append a subscript (1 to the x title, 2 to the rotated y title) to every
    // .axis-label in `svg`. SVG text has no markup, so we add a smaller, lowered tspan.
    function swarmAxisSubscripts(svg) {
        svg.selectAll('text.axis-label').each(function () {
            const t = d3.select(this);
            const sub = (t.attr('transform') || '').includes('rotate') ? '2' : '1';
            t.append('tspan').attr('dy', '0.28em').attr('font-size', '0.72em').text(sub);
        });
    }

    // Wavy inner edge of an L-shaped band hugging both axes, at perpendicular
    // distance `off` from each axis (data coords, domain [0,20]). Both near-axis
    // bands below — the "bug" band and the "unlikely to be explored" band just
    // outside it — share this wave, so their edges stay parallel and contiguous.
    // The wobble keeps an edge from reading as a rigid contour. Tweak the look here.
    function swarmBandEdge(off) {
        const amp = 0.4;        // wobble amplitude
        const base = (t, s) => 0.82 * Math.sin(t * 1.05 + s) + 0.18 * Math.sin(t * 2.3 + s * 1.7);   // one dominant wave + slight irregularity
        const ramp = t => Math.min(1, (t - 1) / 3);   // damp wobble to 0 near the corner so the arms meet cleanly
        const wob = (t, s) => amp * ramp(t) * base(t, s);
        const horiz = d3.range(20, off - 1e-6, -0.5).map(xv => [xv, off + wob(xv, 0)]);     // along x-axis, 20 → corner
        const vert  = d3.range(off, 20 + 1e-6, 0.5).map(yv => [off + wob(yv, 11.3), yv]);   // along y-axis, corner → 20
        return horiz.concat(vert);
    }

    // Catmull-Rom line through band-edge points, projected through the scales.
    function swarmBandLine(x, y) {
        return d3.line().curve(d3.curveCatmullRom.alpha(0.5)).x(d => x(d[0])).y(d => y(d[1]));
    }

    // Clip an overlay to the data panel [0,20]^2 so a wobbly, spline-smoothed band
    // edge can't bleed past the axes. Each call mints a fresh id: several charts
    // share this page, and clip-path: url(#id) resolves to the *first* match in the
    // document, so a shared id would clip one figure against another's bounds.
    let swarmClipSeq = 0;
    function swarmPanelClip(svg, x, y) {
        const id = `swarm-panel-clip-${++swarmClipSeq}`;
        let defs = svg.select('defs');
        if (defs.empty()) defs = svg.append('defs');
        defs.append('clipPath').attr('id', id).append('rect')
            .attr('x', x(0)).attr('y', y(20))
            .attr('width', x(20) - x(0)).attr('height', y(0) - y(20));
        return `url(#${id})`;
    }

    // The wavy L-shaped "bug" region hugging both axes (band width ~1). Bugs masked
    // by combining two rules live here; styled by the shared .bug-region__* rules.
    function swarmBugRegion(svg, x, y, labelX = 13) {
        const inner = swarmBandEdge(1);
        const line = swarmBandLine(x, y);
        const g = svg.append('g').attr('class', 'bug-region');
        g.append('path').attr('class', 'bug-region__fill')   // outer axes corner + wavy inner edge
            .attr('d', `M${x(0)},${y(0)} L${x(20)},${y(0)} ` + line(inner).replace(/^M/, 'L') + ` L${x(0)},${y(20)} Z`);
        g.append('path').attr('class', 'bug-region__frontier')
            .attr('d', line(inner));
        g.append('text').attr('class', 'bug-region__label')
            .attr('x', x(labelX)).attr('y', y(0.5)).attr('dy', '0.3em').text('bug');
        return g;
    }

    // The grey, diagonally-hatched "unlikely to be explored" band: an L-shaped ribbon
    // contiguous with the bug band but one step further from each axis (higher up in x
    // and y). Even with swarm enabled a disabled rule runs ~0 times and an enabled one
    // ~10, so test cases land on the axes or in the centre, almost never in this gap.
    function swarmUnexploredRegion(svg, x, y) {
        const inner = swarmBandEdge(1);     // = the bug band's outer edge (contiguous)
        const outer = swarmBandEdge(4);     // a handful of calls off each axis
        const ring = inner.concat(outer.slice().reverse());
        const line = swarmBandLine(x, y);

        // diagonal hatch fill (article-local grey; not a palette colour)
        svg.append('defs').append('pattern')
            .attr('id', 'swarm-unexplored-hatch').attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 6).attr('height', 6).attr('patternTransform', 'rotate(45)')
            .append('line').attr('class', 'unexplored__hatch')
            .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6);

        const g = svg.append('g').attr('class', 'unexplored').attr('clip-path', swarmPanelClip(svg, x, y));
        g.append('path').attr('class', 'unexplored__fill').attr('d', line(ring) + 'Z');
        g.append('text').attr('class', 'unexplored__label')
            .attr('x', x(10)).attr('y', y(2.3)).text('unlikely to be explored');
        return g;
    }

    // The trapezoidal "optimize bug" wedge: a bug that needs a fixed pop:push ratio
    // (5:1) once the history is long enough. A fixed ratio is an angular wedge from the
    // origin (near the pop axis); the "sufficiently long" condition lops off the apex,
    // leaving the outer trapezoid — which lands inside the under-explored grey band.
    // Shared by the optimize-bug figure and the continuous-swarm build-up figure that
    // floods this region (so both name the same bug).
    function swarmOptimizeBugRegion(svg, x, y) {
        const ratio = 5;                               // pop : push
        const slope = 1 / ratio;                       // push per unit pop along the nominal ray
        const fan = 0.07;                              // ±half-fan in slope (symmetric about the ratio ray)
        const y0 = 9;                                  // "sufficiently long history": wedge starts out here
        const onRay = (yv, s) => yv * s;               // push at pop = yv for a ray of the given slope
        const sNear = slope - fan, sFar = slope + fan;   // near-axis edge (less push) / far edge (more push)
        const wedge = [
            [onRay(y0, sNear), y0], [onRay(20, sNear), 20],   // near-axis edge
            [onRay(20, sFar), 20], [onRay(y0, sFar), y0],     // far edge
        ];
        const pts = wedge.map(([a, b]) => `${x(a)},${y(b)}`).join(' ');
        const g = svg.append('g').attr('class', 'bug-region');
        g.append('polygon').attr('class', 'bug-region__fill').attr('points', pts);
        g.append('polygon').attr('class', 'bug-region__frontier').attr('points', pts);   // outline the region (no centre spike)
        g.append('text').attr('class', 'bug-region__label')
            .attr('x', x(onRay(16, slope) + 2.65)).attr('y', y(16)).text('bug');
        return g;
    }
</script>

Swarm testing is a technique for increasing behavioral diversity in randomized testing. It's conceptually simple, yet powerful, which makes it a favorite of mine. In this post, I introduce a natural extension I call **activated swarm testing**, which yields an additional increase in behavioral diversity.

## Traditional swarm testing

First, let's cover traditional swarm testing.

Consider a stack machine with three instructions (`push`, `pop`, `add`), and the corresponding stateful test[^1]:

[^1]: In pseudocode, because I want to emphasize the behavior before any particular testing framework changes the distribution.

```python
class StackMachineTest:

    @rule(integers())
    def push(self, value):
		...

    @rule()
    def pop(self):
		# early-returns if less than one value on stack
		...

    @rule()
    def add(self):
		# early-returns if less than two values on stack
		...
```

Here is one simple approach to exercising this test. For each test case, sample the number of rules $n$ to run from some distribution centered on the desired average test case size. Then pick the next rule to run uniformly at random (from `{push, pop, add}`), until you've run $n$ rules total.

This testing strategy has a weakness for our test. Suppose the stack machine implementation has a bug, which only manifests when the stack size is large (say, > 10). We can visualize whether the test finds this bug by plotting the number of calls to `push` vs `pop`:

<script>
    Figures.figure(() => Figures.JointDensity(
        { x: Figures.dist.normal(10, 2.5), y: Figures.dist.normal(10, 2.5), xDomain: [0, 20], yDomain: [0, 20] },
        {
            equal: true,
            xLabel: '# calls to push',
            yLabel: '# calls to pop',
            // The bug needs a deep stack, so pushes must outrun pops by ~k: the
            // frontier is the line push - pop = k, and below it (few pops) the
            // bug becomes reachable. decorate() hands us the final data->pixel
            // scales, so we shade that region without touching layout geometry.
            decorate({ svg, x, y }) {
                const k = 10;                                  // stack-depth threshold
                const region = [[k, 0], [20, 0], [20, 20 - k]];   // push - pop >= k, clipped to [0,20]^2
                const g = svg.append('g').attr('class', 'bug-region');
                g.append('polygon')
                    .attr('class', 'bug-region__fill')
                    .attr('points', region.map(([a, b]) => `${x(a)},${y(b)}`).join(' '));
                g.append('line')                              // the frontier itself: push - pop = k
                    .attr('class', 'bug-region__frontier')
                    .attr('x1', x(k)).attr('y1', y(0))
                    .attr('x2', x(20)).attr('y2', y(20 - k));
                g.append('text')
                    .attr('class', 'bug-region__label')
                    .attr('x', x(17.5)).attr('y', y(3))
                    .text('bug');
            },
        }
    ));
</script>

This plot shows the joint distribution of the number of calls to `push` and `pop` within a test case[^2]. Each "point" on the plot represents a single test case. The bug lives in the lower right corner, where `push - pop ≥ 10`. Because we expect to draw roughly as many `pop` rules as `push` rules, the stack is unlikely to grow large enough to trigger the bug.

[^2]: `push` and `pop` are individually normally distributed, because picking the next rule uniformly at random is a bernoulli trial, from which repeated draws form a normal distribution.

This leads us to the following general observation: some features, like `push` and `pop` here, actively mask bugs when combined together. Conceptually, such bugs live along the axes of our plots:

<script>
    Figures.figure(() => Figures.JointDensity(
        { x: Figures.dist.normal(10, 2.5), y: Figures.dist.normal(10, 2.5), xDomain: [0, 20], yDomain: [0, 20] },
        {
            equal: true,
            xLabel: '# calls to Rule',   // subscript appended in decorate()
            yLabel: '# calls to Rule',
            // Bugs masked by combining two rules surface only when one rule
            // runs many times and the other barely at all — i.e. along the axes.
            // We shade a continuous L-shaped band hugging both axes (meeting at the
            // origin); the central blob (both rules run ~equally) never reaches it.
            decorate({ svg, x, y }) {
                swarmAxisSubscripts(svg);
                swarmBugRegion(svg, x, y, 13);
            },
        }
    ));
</script>

And are unlikely to be triggered.

We would like a testing strategy which explores this part of the search space. The insight of swarm testing is that one can achieve this by randomly disabling certain features for an individual test case. For example, one might assign a 50% probability of disabling each rule[^3]. For the interaction of Rule<span class="subscript">1</span> and Rule<span class="subscript">2</span>, there are four equally-likely possibilities in a test case:

[^3]: This is the algorithm used in the [swarm testing paper](https://users.cs.utah.edu/~regehr/papers/swarm12.pdf). Note however that this is a poor choice for other reasons: it is unlikely to disable either almost all, or almost no, rules as the number of rules grows. The fix is straightforward, but orthogonal to this article.

* Both rules are enabled. As above.
* Rule<span class="subscript">1</span> is enabled, but not Rule<span class="subscript">2</span>. We see some exploration along $y = 0$.
* Rule<span class="subscript">2</span> is enabled, but not Rule<span class="subscript">1</span>. We see some exploration along $x = 0$.
* Neither are enabled. No exploration; uninteresting.

We can visualize the resulting distribution as the sum of the first three cases:

<script>
    Figures.figure(() => {
        const N = Figures.dist.normal(10, 2.5);    // an enabled rule: ~normal
        const SPIKE = Figures.dist.normal(0, 0.5); // disabled rule, centre only: a tight blob at 0
                                                   // (σ kept small so the outermost contour stays within the y=1/x=1 band)
        // The three non-trivial swarm configurations. xOn / yOn say whether push
        // (x) / pop (y) is enabled; a disabled rule is called exactly 0 times.
        const COMPONENTS = [
            { key: 'both', xOn: true,  yOn: true  },
            { key: 'pop',  xOn: true,  yOn: false },   // pop disabled
            { key: 'push', xOn: false, yOn: true  },   // push disabled
        ];
        const dens = on => on ? N : SPIKE;             // density used for the centre mixture

        const width = 520, height = 480;
        const levels = COMPONENTS.length;
        const dStag = 40, curve = 30, pad = 10;       // stagger step, curve height, breathing room
        const mLeft = 52, mBottom = 44;
        const mTop = (levels - 1) * dStag + curve + pad;
        const mRight = (levels - 1) * dStag + curve + pad;

        const PL = mLeft, PT = mTop;
        const size = Math.min(width - mRight - PL, height - mBottom - PT);   // square panel
        const PR = PL + size, PB = PT + size;

        const X = d3.scaleLinear().domain([0, 20]).range([PL, PR]);
        const Y = d3.scaleLinear().domain([0, 20]).range([PB, PT]);

        const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart swarm');

        // grid
        svg.append('g').attr('class', 'grid').attr('transform', `translate(${PL},0)`)
            .call(d3.axisLeft(Y).ticks(5).tickSize(-(PR - PL)).tickFormat(''));
        svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${PB})`)
            .call(d3.axisBottom(X).ticks(5).tickSize(-(PB - PT)).tickFormat(''));

        // center: contours of the combined mixture (the swarm distribution).
        // Each component carries equal *mass* (1/3), but a disabled rule is a tight
        // spike at 0, so its mass is squeezed into a sliver and its *density* blows
        // up — the axis ridges would swamp the centre blob. Since all three configs
        // are equally likely, we normalise each component to unit peak before summing,
        // so the contours read at equal visual weight rather than by density.
        const n = 90;
        const g1 = i => (i / (n - 1)) * 20;
        const densPeak = on => on ? N(10) : SPIKE(0);             // peak of each 1D density
        const compPeak = c => densPeak(c.xOn) * densPeak(c.yOn);   // peak of the 2D component
        const joint = (a, b) => d3.sum(COMPONENTS, c => dens(c.xOn)(a) * dens(c.yOn)(b) / compPeak(c)) / levels;
        const vals = new Array(n * n);
        for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++) vals[j * n + i] = joint(g1(i), g1(j));
        const bands = 6, max = d3.max(vals);
        const contours = d3.contours().size([n, n])
            .thresholds(d3.range(1, bands + 1).map(k => (k / (bands + 1)) * max))(vals);
        const project = d3.geoTransform({ point(cx, cy) { this.stream.point(X(g1(cx)), Y(g1(cy))); } });
        svg.append('g').selectAll('path').data(contours).join('path')
            .attr('class', 'swarm__contour')
            .attr('fill-opacity', (d, i) => 0.10 + 0.46 * i / (bands - 1))
            .attr('d', d3.geoPath(project));

        // axes
        svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${PB})`)
            .call(d3.axisBottom(X).ticks(5).tickSizeOuter(0));
        svg.append('g').attr('class', 'axis').attr('transform', `translate(${PL},0)`)
            .call(d3.axisLeft(Y).ticks(5).tickSizeOuter(0));
        svg.append('text').attr('class', 'axis-label')
            .attr('x', (PL + PR) / 2).attr('y', height - 6).text('# calls to Rule');
        svg.append('text').attr('class', 'axis-label')
            .attr('transform', `translate(16,${(PT + PB) / 2}) rotate(-90)`).text('# calls to Rule');
        swarmAxisSubscripts(svg);

        // the same wavy L-shaped bug region as the figure above (tweak in swarmBugRegion)
        swarmBugRegion(svg, X, Y, 18.5);

        // marginals. An enabled rule is ~normal (scaled to fill the strip); a
        // disabled rule never runs, so its marginal is drawn flat at zero.
        const nPeak = d3.max(d3.range(n + 1).map(i => N((i / n) * 20)));
        const pts = d3.range(n + 1).map(i => { const t = (i / n) * 20; return [t, N(t)]; });

        COMPONENTS.forEach((c, L) => {
            const g = svg.append('g').attr('class', `swarm__component swarm__component--${c.key}`);

            // top: x-marginal
            const baseT = PT - L * dStag, hT = v => baseT - (v / nPeak) * curve;
            if (c.xOn) {
                g.append('path').attr('class', 'swarm__area')
                    .attr('d', d3.area().curve(d3.curveBasis).x(d => X(d[0])).y0(baseT).y1(d => hT(d[1]))(pts));
                g.append('path').attr('class', 'swarm__line')
                    .attr('d', d3.line().curve(d3.curveBasis).x(d => X(d[0])).y(d => hT(d[1]))(pts));
            } else {
                g.append('path').attr('class', 'swarm__line')      // disabled: flat at zero
                    .attr('d', `M${X(0)},${baseT} L${X(20)},${baseT}`);
            }

            // right: y-marginal
            const baseR = PR + L * dStag, wR = v => baseR + (v / nPeak) * curve;
            if (c.yOn) {
                g.append('path').attr('class', 'swarm__area')
                    .attr('d', d3.area().curve(d3.curveBasis).y(d => Y(d[0])).x0(baseR).x1(d => wR(d[1]))(pts));
                g.append('path').attr('class', 'swarm__line')
                    .attr('d', d3.line().curve(d3.curveBasis).y(d => Y(d[0])).x(d => wR(d[1]))(pts));
            } else {
                g.append('path').attr('class', 'swarm__line')      // disabled: flat at zero
                    .attr('d', `M${baseR},${Y(0)} L${baseR},${Y(20)}`);
            }

            if (L > 0) {   // level 0's square is the panel itself
                const cx = PR + L * dStag, cy = PT - L * dStag;
                g.append('path').attr('class', 'swarm__bracket')
                    .attr('d', `M${PR},${cy} L${cx},${cy} L${cx},${PT}`);
            }
        });

        return svg.node();
    });
</script>

This testing strategy now explores the previously unlikely state space that contains this type of bug. This testing strategy would easily find our `push` / `pop` bug, for example.

## A problem

Everything so far has been traditional swarm testing. And it's great; we get some nice increase in diversity. Specifically, we can explore states which require one rule or more rules to be completely disabled.

But, as you may have noticed, some under-explored areas remain[^4]:

[^4]: I am intentionally ignoring the search space represented by the upper right area. This area can easily be covered by increasing the average number of rules run in a test case.

<script>
    Figures.figure(() => {
        // The swarm distribution from the previous figure, as one combined density.
        const N = Figures.dist.normal(10, 2.5);    // an enabled rule: ~normal
        const SPIKE = Figures.dist.normal(0, 0.5); // a disabled rule: a tight blob at 0
        const COMPONENTS = [
            { xOn: true,  yOn: true  },
            { xOn: true,  yOn: false },
            { xOn: false, yOn: true  },
        ];
        const dens = on => on ? N : SPIKE;
        const densPeak = on => on ? N(10) : SPIKE(0);
        const compPeak = c => densPeak(c.xOn) * densPeak(c.yOn);   // normalise each component to unit peak
        const joint = (a, b) => d3.sum(COMPONENTS, c => dens(c.xOn)(a) * dens(c.yOn)(b) / compPeak(c)) / COMPONENTS.length;

        return Figures.JointDensity(
            { joint, xDomain: [0, 20], yDomain: [0, 20] },
            {
                equal: true,
                marginals: false,
                xLabel: '# calls to Rule',
                yLabel: '# calls to Rule',
                // The bug band hugs the axes; just outside it sits the grey hatched
                // band swarm leaves under-explored (a rule is ~0 or ~10, never in
                // between), which the simple extension below fills in.
                decorate({ svg, x, y }) {
                    swarmAxisSubscripts(svg);
                    swarmBugRegion(svg, x, y, 18.5);
                    swarmUnexploredRegion(svg, x, y);
                },
            }
        );
    });
</script>

The newly-highlighted area corresponds to when Rule<span class="subscript">1</span> is still enabled, but substantially less likely than Rule<span class="subscript">2</span>; or vice versa.

To give a concrete example of why we might care about this case, suppose our stack machine gains a new `optimize` opcode. When run, `optimize` looks at the execution history of the machine and performs a dynamic JIT-style optimization. Now suppose that `optimize` has a bug only when the execution history is sufficiently long, and there is the right ratio of `pop` calls to `push` calls; say, 5 to 1:

<script>
    Figures.figure(() => {
        // Same swarm distribution as the figure above, so the under-explored grey
        // band reads identically — only now we drop a concrete bug into it.
        const N = Figures.dist.normal(10, 2.5);    // an enabled rule: ~normal
        const SPIKE = Figures.dist.normal(0, 0.5); // a disabled rule: a tight blob at 0
        const COMPONENTS = [
            { xOn: true,  yOn: true  },
            { xOn: true,  yOn: false },
            { xOn: false, yOn: true  },
        ];
        const dens = on => on ? N : SPIKE;
        const densPeak = on => on ? N(10) : SPIKE(0);
        const compPeak = c => densPeak(c.xOn) * densPeak(c.yOn);   // normalise each component to unit peak
        const joint = (a, b) => d3.sum(COMPONENTS, c => dens(c.xOn)(a) * dens(c.yOn)(b) / compPeak(c)) / COMPONENTS.length;

        return Figures.JointDensity(
            { joint, xDomain: [0, 20], yDomain: [0, 20] },
            {
                equal: true,
                marginals: false,
                // Concrete example, so the axes name the concrete rules (no Rule subscripts).
                xLabel: '# calls to push',
                yLabel: '# calls to pop',
                // The under-explored grey band, with the concrete optimize bug (the
                // trapezoidal 5:1-ratio wedge) dropped into it.
                decorate({ svg, x, y }) {
                    swarmUnexploredRegion(svg, x, y);
                    swarmOptimizeBugRegion(svg, x, y);
                },
            }
        );
    });
</script>

This bug has two conditions: that `push` and `pop` have the right ratio, and that both rules are enabled. It therefore won't be caught by either the original testing strategy (which is unlikely to produce the right ratio) or by the swarm testing strategy (which will fully disable one of the rules).

## Activated swarm testing

With this motivating example in mind, I propose a simple extension, called activated swarm testing. Traditionally, each rule is disabled with 50% probability. In activated swarm testing, for each test case, each rule $r$ is instead assigned an activation probability $r_p \in [0, 1]$, sampled uniformly. Then, whenever a rule would normally be run, that run is instead skipped with probability $1 - r_p$.

It might be helpful to play around and see why this gives us coverage of the previously-rare regions:

<script>
    Figures.figure(() => {
        // "Pick one activation config" — an empty joint panel that, on hover, shows the
        // distribution a single (r_push, r_pop) draw induces: the cursor is the centre of
        // the component, so r_push = push/20, r_pop = pop/20 (a fully-enabled rule peaks
        // at 20 calls — RULES/3 — matching the build-up figure below). The two marginal
        // strips show each rule's call-count distribution; a faint contour blob previews
        // the joint the build-up figure stamps down. (Article-local & interactive.)
        const DOM = 20;
        const RULES = 60;                               // total rules per test case (matches the build-up figure)
        const MEAN = p => (RULES / 3) * p;              // activation p -> expected calls (fully-enabled peaks at 20)
        const SIGMA_FLOOR = 0.5;
        const SIGMA = p => Math.max(Math.sqrt(RULES * (p / 3) * (1 - p / 3)), SIGMA_FLOOR);   // sd of the rule-selection (binomial), floored

        const n = 80;                                   // density grid resolution
        const g = i => (i / (n - 1)) * DOM;             // grid index -> data coord

        // layout identical to the build-up figure below, so the two stack consistently
        const width = 460, height = 420;
        const margin = { top: 12, right: 12, bottom: 48, left: 52 };
        const marginal = 48;                            // thickness of each marginal strip
        let PL = margin.left, PR = width - margin.right - marginal;
        let PT = margin.top + marginal, PB = height - margin.bottom;
        const side = Math.min(PR - PL, PB - PT);        // square panel, centred in the slack
        PL += (PR - PL - side) / 2; PR = PL + side;
        PT += (PB - PT - side) / 2; PB = PT + side;
        const X = d3.scaleLinear().domain([0, DOM]).range([PL, PR]);
        const Y = d3.scaleLinear().domain([0, DOM]).range([PB, PT]);
        const TOP = { base: PT, lo: PT - marginal };    // x-marginal strip, above the panel
        const RIGHT = { base: PR, hi: PR + marginal };  // y-marginal strip, right of the panel
        const levels = 6;

        // One activation config as a separable 2D Gaussian centred at (mx,my): its
        // per-axis pdfs (also the marginals) plus the n×n joint grid for the contour.
        function componentGrid(mx, my, sx, sy) {
            const colX = new Float64Array(n), colY = new Float64Array(n);
            for (let i = 0; i < n; i++) {
                colX[i] = Math.exp(-0.5 * ((g(i) - mx) / sx) ** 2) / (sx * Math.sqrt(2 * Math.PI));
                colY[i] = Math.exp(-0.5 * ((g(i) - my) / sy) ** 2) / (sy * Math.sqrt(2 * Math.PI));
            }
            const vals = new Array(n * n);
            for (let j = 0; j < n; j++)
                for (let i = 0; i < n; i++) vals[j * n + i] = colX[i] * colY[j];
            return { vals, colX, colY };
        }

        // contours + marginals, same rust styling as the build-up figure
        function drawContours(group, vals) {
            const max = d3.max(vals) || 1;
            const contours = d3.contours().size([n, n])
                .thresholds(d3.range(1, levels + 1).map(k => (k / (levels + 1)) * max))(vals);
            const project = d3.geoTransform({ point(cx, cy) { this.stream.point(X(g(cx)), Y(g(cy))); } });
            group.selectAll('path').data(contours).join('path')
                .attr('class', 'swarm__contour')
                .attr('fill-opacity', (d, i) => 0.10 + 0.50 * i / (levels - 1))
                .attr('d', d3.geoPath(project));
        }
        function topMarginal(group, pts) {
            const h = d3.scaleLinear().domain([0, d3.max(pts, d => d[1]) || 1]).range([TOP.base, TOP.lo]);
            group.append('path').attr('class', 'density')
                .attr('d', d3.area().curve(d3.curveBasis).x(d => X(d[0])).y0(TOP.base).y1(d => h(d[1]))(pts));
            group.append('path').attr('class', 'density__line')
                .attr('d', d3.line().curve(d3.curveBasis).x(d => X(d[0])).y(d => h(d[1]))(pts));
        }
        function rightMarginal(group, pts) {
            const w = d3.scaleLinear().domain([0, d3.max(pts, d => d[1]) || 1]).range([RIGHT.base, RIGHT.hi]);
            group.append('path').attr('class', 'density')
                .attr('d', d3.area().curve(d3.curveBasis).y(d => Y(d[0])).x0(RIGHT.base).x1(d => w(d[1]))(pts));
            group.append('path').attr('class', 'density__line')
                .attr('d', d3.line().curve(d3.curveBasis).y(d => Y(d[0])).x(d => w(d[1]))(pts));
        }

        // static chart: grid + axes + labels, plus an (initially empty) hover layer
        const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart')
            .style('touch-action', 'none');   // claim tap-drag for the panel; on the root <svg> (WebKit ignores it on inner SVG els)
        svg.append('g').attr('class', 'grid').attr('transform', `translate(${PL},0)`)
            .call(d3.axisLeft(Y).ticks(5).tickSize(-(PR - PL)).tickFormat(''));
        svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${PB})`)
            .call(d3.axisBottom(X).ticks(5).tickSize(-(PB - PT)).tickFormat(''));
        const hoverG = svg.append('g').attr('class', 'swarm-hover');
        svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${PB})`)
            .call(d3.axisBottom(X).ticks(5).tickSizeOuter(0));
        svg.append('g').attr('class', 'axis').attr('transform', `translate(${PL},0)`)
            .call(d3.axisLeft(Y).ticks(5).tickSizeOuter(0));
        svg.append('text').attr('class', 'axis-label')
            .attr('x', (PL + PR) / 2).attr('y', height - 8).text('# calls to push');
        svg.append('text').attr('class', 'axis-label')
            .attr('transform', `translate(18,${(PT + PB) / 2}) rotate(-90)`).text('# calls to pop');

        // the same under-explored band + optimize bug as the figures below, for context
        swarmUnexploredRegion(svg, X, Y);
        swarmOptimizeBugRegion(svg, X, Y);

        // Idle cue: a solid dot at panel centre that pings outward and fades (two
        // staggered pings), so a blank panel reads as interactive rather than broken.
        // JS-driven for the ease-out expansion, opacity fade, and staggered cadence;
        // removed for good on the first hover/tap. CSS owns only the rust fill.
        const cueCx = (PL + PR) / 2, cueCy = (PT + PB) / 2;
        const cueG = svg.append('g').attr('class', 'swarm-hover__cue');
        const cuePings = d3.range(2).map(() => cueG.append('circle')
            .attr('class', 'swarm-hover__ping').attr('cx', cueCx).attr('cy', cueCy));
        cueG.append('circle').attr('class', 'swarm-hover__core').attr('cx', cueCx).attr('cy', cueCy).attr('r', 2.5);
        cueG.append('text').attr('class', 'swarm-hover__cue-label').attr('x', cueCx).attr('y', cueCy - 40).text('hover');
        const CUE = { pingR: 3.75, maxScale: 9.1, period: 5200, startOp: 0.55, stagger: 0.55 };
        const cueEase = t => 1 - (1 - t) * (1 - t);   // ease-out: shoots out, slows
        const cueTimer = d3.timer(elapsed => {
            cuePings.forEach((p, k) => {
                const t = (((elapsed / CUE.period) - k * CUE.stagger) % 1 + 1) % 1;   // ping k starts k*stagger into the cycle
                p.attr('r', CUE.pingR * (1 + (CUE.maxScale - 1) * cueEase(t)))
                    .attr('opacity', CUE.startOp * (1 - t));                          // fades to 0 by cycle end → invisible reset
            });
        });
        let engaged = false;
        function engage() {
            if (engaged) return;
            engaged = true;
            cueTimer.stop();
            cueG.remove();
        }

        // The labels stay put; only the two numbers blank out when not hovering. The
        // value spans always hold a 4-char tabular number ("0.00"), so hiding just their
        // visibility leaves a blank gap of exactly the right width — nothing reflows.
        const readout = document.createElement('div');
        readout.className = 'swarm-hover__readout';
        readout.innerHTML =
            `push<span class="subscript">p</span> = <span class="val" data-v="push">0.00</span>`
            + `&nbsp;&nbsp;&nbsp; pop<span class="subscript">p</span> = <span class="val" data-v="pop">0.00</span>`;
        const valPush = readout.querySelector('[data-v="push"]');
        const valPop = readout.querySelector('[data-v="pop"]');
        function setVals(rPush, rPop, visible) {
            valPush.textContent = rPush.toFixed(2);
            valPop.textContent = rPop.toFixed(2);
            valPush.style.visibility = valPop.style.visibility = visible ? 'visible' : 'hidden';
        }
        setVals(0, 0, false);   // labels shown, numbers blank but width-reserved

        function clear() {
            hoverG.selectAll('*').remove();
            setVals(0, 0, false);
        }
        function update(px, py) {
            const cx = Math.max(PL, Math.min(PR, px)), cy = Math.max(PT, Math.min(PB, py));
            const dataX = X.invert(cx), dataY = Y.invert(cy);
            const rPush = dataX / DOM, rPop = dataY / DOM;             // MEAN(p) = 20p  =>  p = mean / 20
            const { vals, colX, colY } = componentGrid(dataX, dataY, SIGMA(rPush), SIGMA(rPop));

            hoverG.selectAll('*').remove();
            drawContours(hoverG.append('g'), vals);
            topMarginal(hoverG.append('g'), d3.range(n).map(i => [g(i), colX[i]]));
            rightMarginal(hoverG.append('g'), d3.range(n).map(i => [g(i), colY[i]]));
            hoverG.append('line').attr('class', 'swarm-hover__guide')   // drop to x-axis
                .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', PB);
            hoverG.append('line').attr('class', 'swarm-hover__guide')   // across to y-axis
                .attr('x1', cx).attr('y1', cy).attr('x2', PL).attr('y2', cy);
            hoverG.append('circle').attr('class', 'swarm-hover__dot').attr('cx', cx).attr('cy', cy).attr('r', 3);

            setVals(rPush, rPop, true);
        }

        // hover (mouse) + tap/drag (touch) over the panel; touch pins the last config
        svg.append('rect')
            .attr('x', PL).attr('y', PT).attr('width', PR - PL).attr('height', PB - PT)
            .attr('fill', 'transparent').style('cursor', 'crosshair')
            .on('pointermove pointerdown', function (e) { engage(); const [px, py] = d3.pointer(e); update(px, py); })
            .on('pointerleave', function (e) { if (e.pointerType === 'mouse') clear(); });

        const wrap = document.createElement('div');
        wrap.appendChild(svg.node());
        wrap.appendChild(readout);
        return wrap;
    });
</script>

Conceptually, we are letting the distribution "roam around" our graph uniformly. Because we're uniformly sampling push<span class="subscript">p</span> $\in [0, 1]$ and pop<span class="subscript">p</span> $\in [0, 1]$, we're equally likely to get a distribution centered on any point in the space of `# calls to push` vs `# calls to pop`.

Here, you can see that exploration in practice:

<script>
    Figures.figure(() => {
        // The continuous-p swarm distribution, built up by Monte Carlo. Each click
        // samples one activation config (push_p, pop_p) ~ U[0,1] and adds its exact
        // density — a Gaussian centered at (20*push_p, 20*pop_p) — to an accumulator
        // grid. The rendered contours are the running sum; in the limit they converge
        // to the true swarm distribution: concentrated in the lower-left and fading
        // toward the far corner, flooding the under-explored band. (Article-local &
        // interactive, so it's a bespoke inline figure rather than a figures.js chart.)
        //
        // We size the test case so a fully-enabled rule averages 20 calls (a 60-rule
        // test), rather than 10 (30 rules). Uniform p_r only ever *reduces* call counts,
        // so with the shorter test the cloud would top out near the middle of the panel;
        // lengthening it lets the same distribution fill the [0,20]^2 window the
        // always-on figures used — the shape is exact, just scaled to the same canvas.
        const DOM = 20;
        const RULES = 60;                               // total rules run in a test case (vs 30 always-on); see above
        const MEAN = p => (RULES / 3) * p;              // activation p -> expected calls (a fully-enabled rule peaks at 20)
        const SIGMA_FLOOR = 0.5;                        // keep the near-zero-p spike wider than a grid cell
        const SIGMA = p => Math.max(Math.sqrt(RULES * (p / 3) * (1 - p / 3)), SIGMA_FLOOR);   // sd of the rule-selection (binomial), floored

        const n = 80;                                   // density grid resolution
        const acc = new Float64Array(n * n);            // accumulated (summed) mixture density, row-major
        let N = 0;
        const g = i => (i / (n - 1)) * DOM;             // grid index -> data coord

        // One activation config as a separable 2D Gaussian, given as its per-axis
        // column weights (each a proper pdf, so every config carries equal *mass*).
        // Used both to accumulate into `acc` and to draw the just-added component alone.
        function component() {
            const p1 = Math.random(), p2 = Math.random();
            const mx = MEAN(p1), my = MEAN(p2);
            const sx = SIGMA(p1), sy = SIGMA(p2);
            const colX = new Float64Array(n), colY = new Float64Array(n);
            for (let i = 0; i < n; i++) {
                colX[i] = Math.exp(-0.5 * ((g(i) - mx) / sx) ** 2) / (sx * Math.sqrt(2 * Math.PI));
                colY[i] = Math.exp(-0.5 * ((g(i) - my) / sy) ** 2) / (sy * Math.sqrt(2 * Math.PI));
            }
            return { colX, colY };
        }

        function addSample() {
            const { colX, colY } = component();
            for (let j = 0; j < n; j++)
                for (let i = 0; i < n; i++) acc[j * n + i] += colX[i] * colY[j];
            N++;
            return { colX, colY };                      // hand the new component back so it can be flashed
        }

        // square data panel flanked by top (x) and right (y) marginal strips, matching
        // the other joint figures. PL/PR/PT/PB are the panel edges (PT is the top — the
        // smaller pixel y); the strips hug the panel along its top and right.
        const width = 460, height = 420;
        const margin = { top: 12, right: 12, bottom: 48, left: 52 };
        const marginal = 48;                            // thickness of each marginal strip
        let PL = margin.left, PR = width - margin.right - marginal;
        let PT = margin.top + marginal, PB = height - margin.bottom;
        const side = Math.min(PR - PL, PB - PT);        // square panel (both domains are [0,20]), centred in the slack
        PL += (PR - PL - side) / 2; PR = PL + side;
        PT += (PB - PT - side) / 2; PB = PT + side;
        const X = d3.scaleLinear().domain([0, DOM]).range([PL, PR]);
        const Y = d3.scaleLinear().domain([0, DOM]).range([PB, PT]);
        const TOP = { base: PT, lo: PT - marginal };    // x-marginal strip, above the panel
        const RIGHT = { base: PR, hi: PR + marginal };  // y-marginal strip, right of the panel
        const levels = 6;

        // Filled contour bands of an n×n density grid, drawn into `group` with the
        // shared rust .swarm__contour style (faint outer → dense inner), thresholds
        // relative to the grid's own peak.
        function drawContours(group, vals) {
            const max = d3.max(vals) || 1;
            const contours = d3.contours().size([n, n])
                .thresholds(d3.range(1, levels + 1).map(k => (k / (levels + 1)) * max))(vals);
            const project = d3.geoTransform({ point(cx, cy) { this.stream.point(X(g(cx)), Y(g(cy))); } });
            group.selectAll('path').data(contours).join('path')
                .attr('class', 'swarm__contour')
                .attr('fill-opacity', (d, i) => 0.10 + 0.50 * i / (levels - 1))
                .attr('d', d3.geoPath(project));
        }

        // The two marginal strips: each axis's density collapsed from a grid (a Riemann
        // sum over the other variable), scaled to its own peak so the curve fills the
        // strip — shape is what matters as N grows. Same rust .density / .density__line
        // style as the other joint figures.
        function topMarginal(group, pts) {
            const h = d3.scaleLinear().domain([0, d3.max(pts, d => d[1]) || 1]).range([TOP.base, TOP.lo]);
            group.append('path').attr('class', 'density')
                .attr('d', d3.area().curve(d3.curveBasis).x(d => X(d[0])).y0(TOP.base).y1(d => h(d[1]))(pts));
            group.append('path').attr('class', 'density__line')
                .attr('d', d3.line().curve(d3.curveBasis).x(d => X(d[0])).y(d => h(d[1]))(pts));
        }
        function rightMarginal(group, pts) {
            const w = d3.scaleLinear().domain([0, d3.max(pts, d => d[1]) || 1]).range([RIGHT.base, RIGHT.hi]);
            group.append('path').attr('class', 'density')
                .attr('d', d3.area().curve(d3.curveBasis).y(d => Y(d[0])).x0(RIGHT.base).x1(d => w(d[1]))(pts));
            group.append('path').attr('class', 'density__line')
                .attr('d', d3.line().curve(d3.curveBasis).y(d => Y(d[0])).x(d => w(d[1]))(pts));
        }

        // A whole density — centre contours + both marginals — drawn into one group.
        // Shared by the running accumulation and the single-component flash, so both
        // read identically (centre and margins always agree).
        function drawDensity(group, vals) {
            drawContours(group.append('g'), vals);
            const mx = d3.range(n).map(i => { let s = 0; for (let j = 0; j < n; j++) s += vals[j * n + i]; return [g(i), s]; });
            const my = d3.range(n).map(j => { let s = 0; for (let i = 0; i < n; i++) s += vals[j * n + i]; return [g(j), s]; });
            topMarginal(group.append('g'), mx);
            rightMarginal(group.append('g'), my);
        }

        function render() {
            const svg = d3.create('svg').attr('viewBox', [0, 0, width, height]).attr('class', 'figure__chart');

            svg.append('g').attr('class', 'grid').attr('transform', `translate(${PL},0)`)
                .call(d3.axisLeft(Y).ticks(5).tickSize(-(PR - PL)).tickFormat(''));
            svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${PB})`)
                .call(d3.axisBottom(X).ticks(5).tickSize(-(PB - PT)).tickFormat(''));

            if (N > 0) drawDensity(svg.append('g'), Array.from(acc));   // the running sum: contours + marginals

            svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${PB})`)
                .call(d3.axisBottom(X).ticks(5).tickSizeOuter(0));
            svg.append('g').attr('class', 'axis').attr('transform', `translate(${PL},0)`)
                .call(d3.axisLeft(Y).ticks(5).tickSizeOuter(0));
            svg.append('text').attr('class', 'axis-label')
                .attr('x', (PL + PR) / 2).attr('y', height - 8).text('# calls to push');
            svg.append('text').attr('class', 'axis-label')
                .attr('transform', `translate(18,${(PT + PB) / 2}) rotate(-90)`).text('# calls to pop');

            // the under-explored band, with the optimize bug (trapezoidal wedge) the
            // continuous-p swarm now floods into — same regions as the figure above
            swarmUnexploredRegion(svg, X, Y);
            swarmOptimizeBugRegion(svg, X, Y);
            return svg.node();
        }

        const FLASH_MS = 600;     // fade-out duration of a single flashed component
        const FLASH_STAGGER_MS = 0;   // delay between successive flashes in a multi-add cascade

        // Flash the just-added config as its own independent density — centre contours
        // and both marginals, rendered exactly like the accumulation (it's already
        // folded into the running sum, so this briefly doubles its region) — then faded
        // out by opacity alone, so you watch the new component settle into the total
        // without any motion. `delay` staggers a cascade when several are added at once.
        function flashComponent(svgNode, c, delay = 0) {
            const vals = new Array(n * n);
            for (let j = 0; j < n; j++)
                for (let i = 0; i < n; i++) vals[j * n + i] = c.colX[i] * c.colY[j];
            const grp = d3.select(svgNode).append('g');
            drawDensity(grp, vals);
            grp.style('opacity', 1).transition().delay(delay).duration(FLASH_MS).ease(d3.easeQuadIn)
                .style('opacity', 0)
                .on('end', function () { d3.select(this).remove(); });
        }

        // chart + controls, wired to re-render on each click
        const wrap = document.createElement('div');
        let node = render();
        wrap.appendChild(node);

        const count = document.createElement('div');
        count.className = 'swarm-build__count';
        function refresh(flashes) {
            const next = render();
            wrap.replaceChild(next, node);
            node = next;
            count.textContent = `${N} test case${N === 1 ? '' : 's'}`;
            (flashes || []).forEach((c, i) => flashComponent(next, c, i * FLASH_STAGGER_MS));   // staggered cascade for multi-adds
        }
        function button(label, onClick) {
            const b = document.createElement('div');
            b.className = 'swarm-build__btn';
            b.setAttribute('role', 'button');
            b.setAttribute('tabindex', '0');
            b.textContent = label;
            b.addEventListener('click', onClick);
            b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } });
            return b;
        }
        const controls = document.createElement('div');
        controls.className = 'swarm-build__controls';
        controls.appendChild(button('×1', () => refresh([addSample()])));
        controls.appendChild(button('×5', () => refresh(d3.range(5).map(() => addSample()))));
        controls.appendChild(button('×100', () => { for (let i = 0; i < 100; i++) addSample(); refresh(); }));
        controls.appendChild(button('×1000', () => { for (let i = 0; i < 1000; i++) addSample(); refresh(); }));
        const controlsBreak = document.createElement('div');   // wraps count + reset to a new line on mobile
        controlsBreak.className = 'swarm-build__break';
        controls.appendChild(controlsBreak);
        controls.appendChild(count);   // sample count sits before reset, setting reset apart
        controls.appendChild(button('reset', () => { acc.fill(0); N = 0; refresh(); }));
        wrap.appendChild(controls);
        count.textContent = `${N} test cases`;

        return wrap;
    });
</script>

Activated swarm testing easily finds both the new `optimize` bug, and our original `push` / `pop` bug. I view it as a straightforward improvement on swarm testing.

## One step further

I'll conclude with a teaser. Above, I said the activation probabilities are sampled from a uniform distribution on $[0, 1]$. Let's consider a program with more features; say, 10. Now suppose this program has a bug only in some particular configuration of relative feature probabilities. For example, that some specific set of three features are half as common as some other set of three. Uniformly sampling the activation probabilities is very unlikely to produce this configuration, and so we will miss this bug.

We want a distribution of activation probabilities that is likely to produce this configuration. Not only that, we want a distribution of activation probabilities that is also likely to produce any other possible bug-inducing configuration: feature A half as likely as B half as likely as C; A ten times as likely as all other features; feature probabilities distributed according to some power law; and many others besides.

This implies the distribution of activation probabilities *should itself be randomly sampled from the space of all distributions*.

It's swarms all the way down.

*Thanks to [Zac](https://zhd.dev/) for bouncing swarm testing ideas around with me.*
