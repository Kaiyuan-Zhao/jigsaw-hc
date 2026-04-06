// ============================================================
// PUZZLES AND OTHER ICON STUFF
// ============================================================
type EdgeType = 'tab' | 'hole' | 'flat';

interface PuzzleOpts {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  top?: EdgeType;
  right?: EdgeType;
  bottom?: EdgeType;
  left?: EdgeType;
  mid?: number;
  /** Extra SVG class */
  cls?: string;
}

/**
 * Build an SVG path for a puzzle piece shape.
 * Tabs protrude OUTWARD from a 0..100 coordinate square.
 * Holes indent INWARD into the square.
 * Flat edges are straight with no protrusion or indentation.
 * Use overflow:visible on the SVG to show protruding tabs.
 */
function buildPuzzlePath(
  top: EdgeType, right: EdgeType, bottom: EdgeType, left: EdgeType, MID: number): string {
  const TAB  = 25;  // protrusion beyond the square edge
  const NECK = 15;  // half-width of tab at its base

  const segs: string[] = [`M 0 0`];

  // — Top edge (left → right) —
  if (top === 'tab') {
    segs.push(`L ${MID - NECK} 0`);
    segs.push(`C ${MID - NECK} ${-TAB}  ${MID + NECK} ${-TAB}  ${MID + NECK} 0`);
  } else if (top === 'hole') {
    segs.push(`L ${MID - NECK} 0`);
    segs.push(`C ${MID - NECK} ${TAB}  ${MID + NECK} ${TAB}  ${MID + NECK} 0`);
  }
  segs.push(`L 100 0`);

  // — Right edge (top → bottom) —
  if (right === 'tab') {
    segs.push(`L 100 ${MID - NECK}`);
    segs.push(`C ${100 + TAB} ${MID - NECK}  ${100 + TAB} ${MID + NECK}  100 ${MID + NECK}`);
  } else if (right === 'hole') {
    segs.push(`L 100 ${MID - NECK}`);
    segs.push(`C ${100 - TAB} ${MID - NECK}  ${100 - TAB} ${MID + NECK}  100 ${MID + NECK}`);
  }
  segs.push(`L 100 100`);

  // — Bottom edge (right → left) —
  if (bottom === 'tab') {
    segs.push(`L ${MID + NECK} 100`);
    segs.push(`C ${MID + NECK} ${100 + TAB}  ${MID - NECK} ${100 + TAB}  ${MID - NECK} 100`);
  } else if (bottom === 'hole') {
    segs.push(`L ${MID + NECK} 100`);
    segs.push(`C ${MID + NECK} ${100 - TAB}  ${MID - NECK} ${100 - TAB}  ${MID - NECK} 100`);
  }
  segs.push(`L 0 100`);

  // — Left edge (bottom → top) —
  if (left === 'tab') {
    segs.push(`L 0 ${MID + NECK}`);
    segs.push(`C ${-TAB} ${MID + NECK}  ${-TAB} ${MID - NECK}  0 ${MID - NECK}`);
  } else if (left === 'hole') {
    segs.push(`L 0 ${MID + NECK}`);
    segs.push(`C ${TAB} ${MID + NECK}  ${TAB} ${MID - NECK}  0 ${MID - NECK}`);
  }
  segs.push(`L 0 0 Z`);

  return segs.join(' ');
}

/**
 * Returns an inline SVG string for a puzzle piece.
 * Meant to be used as innerHTML inside a `position: relative` container.
 * The SVG is `position: absolute; inset: 0; overflow: visible`.
 */
function puzzleSVG(opts: PuzzleOpts = {}): string {
  const {
    fill        = '#ffffff',
    stroke      = '#111827',
    strokeWidth = 3,
    top    = 'tab',
    right  = 'tab',
    bottom = 'tab',
    left   = 'tab',
    cls    = 'j-puzzle-svg',
    mid    = 50,
  } = opts;

  const path = buildPuzzlePath(top, right, bottom, left, mid);

  return `
<svg class="${cls}" viewBox="-16 -16 132 132"
     xmlns="http://www.w3.org/2000/svg"
     style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;display:block;pointer-events:none">
  <path d="${path}" fill="${fill}"/>
  <path d="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"
        stroke-linejoin="round" paint-order="stroke fill"/>
</svg>`;
}

type IconName = 'brain' | 'mousePointer' | 'globe' | 'gamepad' | 'lock' |
                'ghost' | 'cpu' | 'star' | 'zap' | 'trophy' | 'target' | 'chevronDown';

const ICON_PATHS: Record<IconName, string> = {
  brain: `
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44
             2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58
             2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44
             2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58
             2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>`,
  mousePointer: `<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/>`,
  globe: `
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10
             15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <path d="M2 12h20"/>`,
  gamepad: `
    <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/>
    <line x1="15" x2="17" y1="13" y2="13"/><line x1="16" x2="16" y1="12" y2="12"/>
    <rect width="20" height="12" x="2" y="6" rx="2"/>`,
  lock: `
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  ghost: `
    <path d="M9 10h.01"/><path d="M15 10h.01"/>
    <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>`,
  cpu: `
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="9" y="9" width="6" height="6"/>
    <path d="M15 2v2M15 20v2M2 15h2M20 15h2M2 9h2M20 9h2M9 2v2M9 20v2"/>`,
  star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02
                          12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  trophy: `
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
  target: `
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>`,
  chevronDown: `<path d="m6 9 6 6 6-6"/>`,
};

function icon(name: IconName, size = 24): string {
  const paths = ICON_PATHS[name];
  const isFill = name === 'star' || name === 'zap';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${isFill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}


type Notch = { top: EdgeType; right: EdgeType; bottom: EdgeType; left: EdgeType };

function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as T;
}

function puzzleEl(fill: string, notch: Notch, stroke = '#111827', strokeWidth?: number, mid?: number): string {
  const opts: PuzzleOpts = { fill, stroke, mid, ...notch };
  if (strokeWidth !== undefined) opts.strokeWidth = strokeWidth;
  if (mid == undefined) opts.mid = 50;
  return puzzleSVG(opts);
}

// ============================================================
// SECTION — HERO
// ============================================================

function buildHero(): HTMLElement {
  return el(`
<section class="j-hero">
  <div class="j-hero-floater j-hero-floater-1">
    ${puzzleEl('#bae1ff', { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
  </div>
  <div class="j-hero-floater j-hero-floater-2">
    ${puzzleEl('#baffc9', { top: 'hole', right: 'flat', bottom: 'hole', left: 'tab' }, 'transparent')}
  </div>

  <div class="j-hero-content">
    <div class="j-hero-title-wrap">
      <h1 class="j-hero-title">Jigsaw</h1>
      <div class="j-hero-spinner">
        ${puzzleSVG({ fill: '#ffdfba', stroke: '#111827', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
      </div>
    </div>
    <p class="j-hero-subtitle">Ship puzzles, solve puzzles, win puzzles!</p>
    <div class="j-hero-ctas">
    </div>
  </div>
</section>`);
}

// ============================================================
// SECTION — EXEMPLARS
// ============================================================

interface Principle {
  icon: IconName;
  title: string;
  desc: string;
  fill: string;
  notch: Notch;
  startX: number;
  startY: number;
  startRot: number;
}

const PRINCIPLES: Principle[] = [
  {
    icon: 'mousePointer',
    title: 'Clever',
    desc: 'Brute-force-proof!',
    fill: '#baffc9',
    notch: { top: 'flat', right: 'tab', bottom: 'hole', left: 'flat' },
    startX: -420, startY: -200, startRot: -45,
  },
  {
    icon: 'globe',
    title: 'Solvable',
    desc: 'Credits solves (see #docs!)',
    fill: '#ffb3ba',
    notch: { top: 'flat', right: 'flat', bottom: 'tab', left: 'hole' },
    startX: 420, startY: -160, startRot: 30,
  },
  {
    icon: 'brain',
    title: 'Interactive',
    desc: 'Not just text riddles!',
    fill: '#bae1ff',
    notch: { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' },
    startX: -360, startY: 310, startRot: 60,
  },
  {
    icon: 'star',
    title: 'Fun!',
    desc: 'Brings joy',
    fill: '#ffffba',
    notch: { top: 'hole', right: 'flat', bottom: 'flat', left: 'hole' },
    startX: 320, startY: 260, startRot: -20,
  },
];

function buildPrinciples(): HTMLElement {
  const cards = PRINCIPLES.map((p, i) => `
    <div class="j-arcade-scroll-piece principle-slot-${i}" style="z-index: ${4 - i}">
      <div class="j-principle-card">
        ${puzzleEl(p.fill, p.notch)}
        <div class="j-principle-body">
          <div class="j-icon-wrap">${icon(p.icon, 48)}</div>
          <h3 class="j-principle-name">${p.title}</h3>
          <p class="j-principle-desc">${p.desc}</p>
        </div>
      </div>
    </div>`).join('');

  return el(`
<section class="j-principles j-arcade-stage-section">
  <div class="j-dot-bg"></div>
  <div class="j-principles-decor">
    ${puzzleEl('#ffffba', { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }, 'transparent')}
  </div>
  <div class="j-principles-inner">
    <div class="j-section-header j-reveal">
      <h2 class="j-section-title" style="filter:drop-shadow(4px 4px 0 #bae1ff)">
        HOW TO PUZZLE?
      </h2>
      <p class="j-section-subtitle">Scroll to assemble ↓</p>
    </div>
    
    <div class="j-principles-grid j-arcade-stage">
      ${cards}
    </div>
    
    <div class="j-arcade-msg">
      <h2 class="j-arcade-title">Welcome to the Arcade</h2>
      <p class="j-arcade-subtitle">Where all the pieces come together</p>
      <br><br>
      <a href="#arcade" class="j-arcade-cta">Enter the Arcade</a>
    </div>
  </div>
</section>`);
}

// ============================================================
// SECTION — EXAMPLE PUZZLES
// ============================================================

interface ExampleCard {
  title: string;
  author: string;
  genre: string;
  fill: string;
  icon: IconName;
  notch: Notch;
}

const EXAMPLES: ExampleCard[] = [
  {
    title: 'Color Cipher',
    author: 'by @maya_codes',
    genre: 'Browser puzzle game',
    fill: '#bae1ff',
    icon: 'gamepad',
    notch: { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' },
  },
  {
    title: 'Hidden Vault',
    author: 'by @ctf_master',
    genre: 'CTF-style challenge',
    fill: '#ffb3ba',
    icon: 'lock',
    notch: { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' },
  },
  {
    title: 'Ghost Protocol',
    author: 'by @arg_enthusiast',
    genre: 'ARG-inspired site',
    fill: '#baffc9',
    icon: 'ghost',
    notch: { top: 'tab', right: 'flat', bottom: 'tab', left: 'tab' },
  },
  {
    title: 'Neural Maze',
    author: 'by @ai_puzzler',
    genre: 'AI puzzle',
    fill: '#ffffba',
    icon: 'cpu',
    notch: { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' },
  },
];

function buildExamples(): HTMLElement {
  const cards = EXAMPLES.map((e, i) => `
    <div class="j-reveal delay-${i + 1}">
      <div class="j-example-card">
        <div class="j-example-thumb">
          <div class="j-example-piece-wrap">
            ${puzzleEl(e.fill, e.notch)}
            <div class="j-example-icon-overlay">
              <div class="j-example-icon-box">${icon(e.icon, 40)}</div>
            </div>
          </div>
        </div>
        <div class="j-example-body">
          <span class="j-genre-tag" style="background:${e.fill}">${e.genre}</span>
          <h3 class="j-example-title">${e.title}</h3>
          <p class="j-example-author">${e.author}</p>
        </div>
      </div>
    </div>`).join('');

  return el(`
<section id="examples" class="j-examples">
  <div class="j-examples-decor">
    ${puzzleEl('#ffb3ba', { top: 'tab', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
  </div>
  <div class="j-examples-inner">
    <div class="j-section-header j-reveal">
      <h2 class="j-section-title" style="filter:drop-shadow(4px 4px 0 #ffdfba)">
        Example puzzles
      </h2>
      <p class="j-section-subtitle">Get inspired by what others have built</p>
    </div>
    <div class="j-examples-grid">${cards}</div>
  </div>
</section>`);
}

// ============================================================
// SECTION — ARCADE TEASER
// ============================================================

interface ArcadePiece {
  fill: string;
  icon: IconName;
  startX: number; startY: number;
  endX: number;   endY: number;
  startRot: number;
  notch: Notch;
}

const ARCADE_PIECES: ArcadePiece[] = [
  // Top-Left — tabs face outward (top + left)
  {
    fill: '#bae1ff', icon: 'star',
    startX: -420, startY: -200, endX: -70, endY: -70, startRot: -45,
    notch: { top: 'tab', right: 'flat', bottom: 'flat', left: 'tab' },
  },
  // Top-Right — tabs face outward (top + right)
  {
    fill: '#baffc9', icon: 'zap',
    startX: 420, startY: -160, endX: 70, endY: -70, startRot: 30,
    notch: { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' },
  },
  // Bottom-Left — tabs face outward (bottom + left)
  {
    fill: '#ffb3ba', icon: 'trophy',
    startX: -360, startY: 310, endX: -70, endY: 70, startRot: 60,
    notch: { top: 'flat', right: 'flat', bottom: 'tab', left: 'tab' },
  },
  // Bottom-Right — tabs face outward (bottom + right)
  {
    fill: '#ffffba', icon: 'target',
    startX: 320, startY: 260, endX: 70, endY: 70, startRot: -20,
    notch: { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' },
  },
];

function buildArcade(): HTMLElement {
  const pieces = ARCADE_PIECES.map((p) => `
    <div class="j-arcade-piece">
      ${puzzleEl(p.fill, p.notch)}
      <div class="j-arcade-piece-icon">${icon(p.icon, 48)}</div>
    </div>`).join('');

  return el(`
<section class="j-arcade">
  <div class="j-arcade-dot-bg"></div>
  <div class="j-arcade-inner">
    <div class="j-arcade-header j-reveal">
      <h2 class="j-arcade-title">Welcome to the Arcade</h2>
      <p class="j-arcade-subtitle">Where all the pieces come together</p>
    </div>
    <div class="j-arcade-stage">
      <div class="j-arcade-backdrop">
        <a href="#arcade" class="j-arcade-cta">Enter the Arcade</a>
      </div>
      <div class="j-arcade-pieces">${pieces}</div>
    </div>
    <div class="j-arcade-scroll-hint">
      <p>Scroll to snap pieces ↓</p>
    </div>
  </div>
</section>`);
}

// ============================================================
// SECTION — CREATOR NOTE (yellow card)
// ============================================================

function buildCreator(): HTMLElement {
  return el(`
<section id="docs" class="j-creator">
  <div class="j-creator-inner">
    <div class="j-creator-card j-reveal">
      <div class="j-creator-card-decor">
        ${puzzleSVG({ fill: '#ffdfba', stroke: 'transparent', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' })}
      </div>
      <div class="j-creator-body">
        <div class="j-creator-text">
          <h3 class="j-creator-title">Need help with solve redirection?</h3>
          <p class="j-creator-desc">
            Check out our comprehensive documentation with code examples
            and step-by-step guides.
          </p>
        </div>
        <a href="#docs" class="j-creator-btn">Read the docs</a>
      </div>
      <div class="j-code-block">
        <div class="j-code-dots">
          <div class="j-code-dot" style="background:#ffb3ba"></div>
          <div class="j-code-dot" style="background:#ffffba"></div>
          <div class="j-code-dot" style="background:#baffc9"></div>
        </div>
        <div class="j-code-content">
          <div><span class="j-code-comment">// Example solve redirection</span></div>
          <div>
            <span class="j-code-keyword">function </span
            ><span class="j-code-fn">onPuzzleSolved</span>() {
          </div>
          <div style="padding-left:2em">
            <span class="j-code-prop">window.location.href</span> =
            <span class="j-code-str">'jigsaw://solved?puzzle=YOUR_ID'</span>;
          </div>
          <div>}</div>
        </div>
      </div>
    </div>
  </div>
</section>`);
}

// ============================================================
// SECTION — FAQ
// ============================================================

interface FAQItem {
  question: string;
  answer: string;
  fill: string;
  notch: Notch;
}

const FAQS: FAQItem[] = [
  {
    question: 'Do I host my own puzzle?',
    answer: 'Yes! You host your puzzle on your own domain or platform (like GitHub Pages, Vercel, Netlify, etc.). This keeps you in control of your creation and lets you iterate whenever you want. The Arcade just links to your live puzzle.',
    fill: '#bae1ff',
    notch: { top: 'flat', right: 'tab', bottom: 'flat', left: 'flat' },
  },
  {
    question: 'What counts as shipped?',
    answer: 'A puzzle is "shipped" when it\'s publicly accessible via a URL, has an open source repository, and implements the solve redirection protocol. It doesn\'t need to be perfect — just playable and shareable!',
    fill: '#baffc9',
    notch: { top: 'tab', right: 'flat', bottom: 'flat', left: 'flat' },
  },
  {
    question: 'How are solves credited?',
    answer: 'When a player solves your puzzle, your site redirects them to a special Jigsaw URL that credits the solve. This is why implementing solve redirection is important — it\'s how the arcade tracks who solved what.',
    fill: '#ffb3ba',
    notch: { top: 'flat', right: 'flat', bottom: 'tab', left: 'flat' },
  },
  {
    question: 'Do I need to be advanced?',
    answer: 'Not at all! Whether you\'re just learning HTML/CSS or building complex interactive experiences, all skill levels are welcome. Start simple and build up. The important thing is making something clever and playable.',
    fill: '#ffffba',
    notch: { top: 'flat', right: 'flat', bottom: 'flat', left: 'tab' },
  },
  {
    question: 'What kinds of rewards are there?',
    answer: 'Creators and solvers both earn recognition in the arcade. Top puzzles get featured, prolific builders get creator badges, and dedicated solvers climb the leaderboard. It\'s about reputation and community kudos!',
    fill: '#ffdfba',
    notch: { top: 'tab', right: 'flat', bottom: 'tab', left: 'flat' },
  },
];

function buildFAQ(): HTMLElement {
  const items = FAQS.map((f, i) => `
    <div class="j-faq-item j-reveal delay-${(i % 4) + 1}" data-faq="${i}">
      <button class="j-faq-btn" aria-expanded="false">
        <div class="j-faq-btn-left">
          <div class="j-faq-piece-icon">
            ${puzzleEl(f.fill, f.notch, '#111827', 2)}
            <span class="j-faq-piece-icon-label">?</span>
          </div>
          <h3 class="j-faq-question">${f.question}</h3>
        </div>
        <div class="j-faq-chevron">${icon('chevronDown', 18)}</div>
      </button>
      <div class="j-faq-answer" role="region">
        <div class="j-faq-answer-inner">${f.answer}</div>
      </div>
    </div>`).join('');

  return el(`
<section class="j-faq">
  <div class="j-faq-decor">
    ${puzzleEl('#bae1ff', { top: 'flat', right: 'tab', bottom: 'flat', left: 'tab' }, 'transparent')}
  </div>
  <div class="j-faq-inner">
    <div class="j-section-header j-reveal">
      <h2 class="j-section-title" style="filter:drop-shadow(4px 4px 0 #baffc9)">FAQ</h2>
      <p class="j-section-subtitle">Quick answers to common questions</p>
    </div>
    <div class="j-faq-list">${items}</div>
  </div>
</section>`);
}

// ============================================================
// INTERACTION — SCROLL REVEAL
// ============================================================

function setupReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('.j-reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target); // fire once
        }
      });
    },
    { threshold: 0.12 },
  );

  els.forEach((el) => obs.observe(el));
}

// ============================================================
// INTERACTION — FAQ ACCORDION
// ============================================================

function setupFAQ(): void {
  const items = document.querySelectorAll<HTMLElement>('.j-faq-item');

  items.forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>('.j-faq-btn')!;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all
      items.forEach((i) => {
        i.classList.remove('is-open');
        i.querySelector('.j-faq-btn')?.setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ============================================================
// INTERACTION — ARCADE SCROLL ASSEMBLY
// ============================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function setupArcade(): void {
  const section  = document.querySelector<HTMLElement>('.j-arcade-stage-section');
  const pieceEls = Array.from(document.querySelectorAll<HTMLElement>('.j-arcade-scroll-piece'));
  const backdrop = document.querySelector<HTMLElement>('.j-arcade-msg');
  const hint     = document.querySelector<HTMLElement>('.j-section-subtitle');

  if (!section || !pieceEls.length) return;

  const data = PRINCIPLES;

  // Set initial scattered positions
  pieceEls.forEach((el, i) => {
    el.style.transform =
      `translate(${data[i].startX}px, ${data[i].startY}px) rotate(${data[i].startRot}deg)`;
  });

  function update(): void {
    const rect    = section!.getBoundingClientRect();
    const viewH   = window.innerHeight;
    const rawProg = (viewH / 2 - rect.top) / (rect.height / 2);
    const prog    = Math.max(0, Math.min(1, rawProg));

    pieceEls.forEach((el, i) => {
      const d = data[i];
      const x   = lerp(d.startX, 0, prog); // Target is 0, 0 in grid
      const y   = lerp(d.startY, 0, prog);
      const rot = lerp(d.startRot, 0, prog);
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    });

    if (backdrop) backdrop.classList.toggle('assembled', prog > 0.82);
    if (hint)     hint.style.opacity = String(Math.max(0, 1 - prog * 2.5));
  }

  window.addEventListener('scroll', update, { passive: true });
  update(); // apply initial state
}

// ============================================================
// ENTRY POINT
// ============================================================

export function initJigsaw(root: HTMLElement): void {
  root.innerHTML = '';

  root.appendChild(buildHero());
  root.appendChild(buildPrinciples());
  // root.appendChild(buildExamples());
  root.appendChild(buildArcade());
  root.appendChild(buildCreator());
  root.appendChild(buildFAQ());

  // Wait a tick for DOM to settle before setting up observers
  requestAnimationFrame(() => {
    setupReveal();
    setupFAQ();
    setupArcade();
  });
}
