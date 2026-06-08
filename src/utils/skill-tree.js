const NS = 'http://www.w3.org/2000/svg';

const BRANCHES = [
  {
    label: 'Backend',
    color: '#5aaa35',
    trunkAttach: { x: 428, y: 432 },
    cp1: { x: 340, y: 378 },
    cp2: { x: 155, y: 298 },
    node: { x: 102, y: 222 },
    skills: [
      { label: 'Docker',      x: 22,  y: 154 },
      { label: 'Java',        x: 62,  y: 112 },
      { label: 'SpringBoot',  x: 126, y: 90  },
      { label: 'Python',      x: 174, y: 133 },
      { label: 'PostgreSQL',  x: 26,  y: 214 },
    ],
  },
  {
    label: 'ML / AI',
    color: '#27ae60',
    trunkAttach: { x: 443, y: 376 },
    cp1: { x: 397, y: 314 },
    cp2: { x: 298, y: 196 },
    node: { x: 274, y: 146 },
    skills: [
      { label: 'PyTorch',     x: 182, y: 64  },
      { label: 'C++',         x: 264, y: 38  },
      { label: 'AMD Versal',  x: 350, y: 62  },
      { label: 'Vitis IDE',   x: 356, y: 138 },
    ],
  },
  {
    label: 'Systems',
    color: '#6ab04c',
    trunkAttach: { x: 457, y: 376 },
    cp1: { x: 503, y: 314 },
    cp2: { x: 602, y: 196 },
    node: { x: 626, y: 146 },
    skills: [
      { label: 'Linux',        x: 542, y: 52  },
      { label: 'Git',          x: 626, y: 34  },
      { label: 'Raspberry Pi', x: 706, y: 56  },
      { label: 'Arduino',      x: 698, y: 138 },
    ],
  },
  {
    label: 'Frontend',
    color: '#4a9e6a',
    trunkAttach: { x: 472, y: 432 },
    cp1: { x: 552, y: 378 },
    cp2: { x: 742, y: 298 },
    node: { x: 797, y: 222 },
    skills: [
      { label: 'Tailwind',    x: 722, y: 128 },
      { label: 'React',       x: 808, y: 88  },
      { label: 'JavaScript',  x: 872, y: 130 },
      { label: 'HTML / CSS',  x: 870, y: 206 },
    ],
  },
];

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function makePath(d, stroke, width, extra = {}) {
  return el('path', { d, stroke, 'stroke-width': width, fill: 'none', 'stroke-linecap': 'round', ...extra });
}

function makeGlowFilter(id) {
  const filter = el('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' });
  const blur = el('feGaussianBlur', { stdDeviation: '4', result: 'coloredBlur' });
  const merge = el('feMerge');
  const n1 = el('feMergeNode', { in: 'coloredBlur' });
  const n2 = el('feMergeNode', { in: 'SourceGraphic' });
  merge.append(n1, n2);
  filter.append(blur, merge);
  return filter;
}

function makeNode(x, y, r, label, color, isMain) {
  const g = el('g');
  g.style.cursor = 'pointer';

  const pulse = el('circle', { cx: x, cy: y, r: r + 12, fill: 'none', stroke: color, 'stroke-width': '1.5', opacity: '0' });
  pulse.style.transition = 'opacity 0.3s, r 0.3s';

  const bg = el('circle', { cx: x, cy: y, r, fill: '#081508', stroke: color, 'stroke-width': isMain ? '2.5' : '1.5' });
  bg.style.transition = 'fill 0.3s';

  const fontSize = isMain ? (r > 32 ? 10 : 9.5) : 8;
  const textEl = el('text', {
    x, y,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'font-family': 'Montserrat, sans-serif',
    'font-size': fontSize,
    'font-weight': '600',
    fill: '#d4e8c0',
  });
  textEl.style.pointerEvents = 'none';
  textEl.style.userSelect = 'none';

  const parts = label.split(' / ');
  if (parts.length > 1) {
    parts.forEach((part, i) => {
      const ts = el('tspan', { x, dy: i === 0 ? `${-(parts.length - 1) * 5}` : '12' });
      ts.textContent = part;
      textEl.appendChild(ts);
    });
  } else {
    textEl.textContent = label;
  }

  g.append(pulse, bg, textEl);

  g.addEventListener('mouseenter', () => {
    pulse.setAttribute('opacity', '0.5');
    bg.setAttribute('fill', color + '28');
    bg.setAttribute('filter', 'url(#glow)');
  });
  g.addEventListener('mouseleave', () => {
    pulse.setAttribute('opacity', '0');
    bg.setAttribute('fill', '#081508');
    bg.removeAttribute('filter');
  });

  return g;
}

export function initSkillTree() {
  const container = document.getElementById('skill-tree-container');
  if (!container) return;

  const svg = el('svg', { viewBox: '0 0 900 520', preserveAspectRatio: 'xMidYMid meet' });
  svg.style.cssText = 'width:100%;height:auto;display:block;';

  // Defs
  const defs = el('defs');
  defs.appendChild(makeGlowFilter('glow'));
  svg.appendChild(defs);

  // Ground / roots group
  const roots = [
    `M450,510 C430,510 410,518 395,510`,
    `M450,510 C468,510 486,518 500,512`,
    `M450,510 C445,514 435,520 420,516`,
  ];
  roots.forEach(d => svg.appendChild(makePath(d, '#4a2c1a', 4, { 'stroke-linecap': 'round' })));

  // Trunk
  svg.appendChild(makePath(
    'M450,510 C453,460 447,390 450,310',
    '#4a2c1a', 18
  ));
  // Bark highlight
  svg.appendChild(makePath(
    'M453,510 C456,460 450,390 453,310',
    '#6a3d25', 3
  ));

  // Draw branches bottom-up so nodes appear above lines
  for (const branch of BRANCHES) {
    const { trunkAttach: ta, cp1, cp2, node: n, color, skills } = branch;

    // Main branch curve
    svg.appendChild(makePath(
      `M${ta.x},${ta.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${n.x},${n.y}`,
      color, 5
    ));

    // Sub-branches (lines to skill nodes)
    for (const sk of skills) {
      svg.appendChild(makePath(`M${n.x},${n.y} L${sk.x},${sk.y}`, color + '90', 1.8));
    }

    // Skill nodes
    for (const sk of skills) {
      svg.appendChild(makeNode(sk.x, sk.y, 20, sk.label, color, false));
    }

    // Main branch node (drawn after skills so it's on top)
    svg.appendChild(makeNode(n.x, n.y, 30, branch.label, color, true));
  }

  // Central "Michael" node at trunk top
  svg.appendChild(makeNode(450, 310, 38, 'Michael', '#8bc34a', true));

  container.appendChild(svg);
}
