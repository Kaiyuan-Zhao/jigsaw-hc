import type { EdgeType } from './puzzle-path'
import { htmlToElement } from './lib/dom'
import { puzzleSVG, type PuzzleSvgOptions } from './ui/puzzle-svg'

// ============================================================
// PUZZLES AND OTHER ICON STUFF
// ============================================================

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

function puzzleEl(fill: string, notch: Notch, stroke = '#111827', strokeWidth?: number, mid?: number): string {
  const opts: PuzzleSvgOptions = { fill, stroke, mid, ...notch };
  if (strokeWidth !== undefined) opts.strokeWidth = strokeWidth;
  if (mid == undefined) opts.mid = 50;
  return puzzleSVG(opts);
}

// ============================================================
// SECTION — HERO
// ============================================================

function buildHero(): HTMLElement {
  return htmlToElement(`
<section class="j-hero j-puzzle-border">
  <div class="j-hero-floater j-hero-floater-1">
    ${puzzleEl('#bae1ff', { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
  </div>
  <div class="j-hero-floater j-hero-floater-2">
    ${puzzleEl('#baffc9', { top: 'hole', right: 'flat', bottom: 'hole', left: 'tab' }, 'transparent')}
  </div>
  <div class="j-hero-floater j-hero-floater-3">
    ${puzzleEl('#ffb3ba', { top: 'tab', right: 'flat', bottom: 'flat', left: 'hole' }, 'transparent')}
  </div>
  <div class="j-hero-floater j-hero-floater-4">
    ${puzzleEl('#ffffba', { top: 'flat', right: 'tab', bottom: 'hole', left: 'flat' }, 'transparent')}
  </div>

  <div class="j-hero-content">
    <div class="j-hero-title-wrap">
      <h1 class="j-hero-title">Jigsaw</h1>
      <div class="j-hero-spinner">
        ${puzzleSVG({ fill: '#ffdfba', stroke: '#111827', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
      </div>
    </div>
    <p class="j-hero-subtitle">Ship puzzles, solve puzzles, win puzzles!</p>
  </div>
</section>`);
}

// ============================================================
// SECTION — EXPLAINERS
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

  return htmlToElement(`
<section class="j-principles j-arcade-stage-section j-puzzle-border">
  <div class="j-dot-bg"></div>
  <div class="j-principles-decor">
    ${puzzleEl('#FAC898', { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }, 'transparent')}
  </div>
  <div class="j-principles-floater j-principles-floater-1">
    ${puzzleEl('#ffdfba', { top: 'hole', right: 'tab', bottom: 'flat', left: 'flat' }, 'transparent')}
  </div>
  <div class="j-principles-floater j-principles-floater-2">
    ${puzzleEl('#baffc9', { top: 'flat', right: 'flat', bottom: 'tab', left: 'hole' }, 'transparent')}
  </div>
  <div class="j-principles-inner">
    <div class="j-section-header">
      <h2 class="j-section-title">
        HOW TO PUZZLE?
      </h2>
    </div>
    
    <div class="j-principles-grid j-arcade-stage">
      ${cards}
    </div>
      <h2 class="j-arcade-title">Check out the Arcade</h2>
      <p class="j-arcade-subtitle">Where all the pieces come together</p>
      <a href="/arcade" class="j-arcade-cta">Enter the Arcade</a>
    </div>
</section>`);
}


// ============================================================
// SECTION — CREATOR NOTE (yellow card)
// ============================================================

function buildCreator(): HTMLElement {
  return htmlToElement(`
<section id="docs" class="j-creator j-puzzle-border">
    <div class="j-creator-floater j-creator-floater-1">
      ${puzzleEl('#bae1ff', { top: 'tab', right: 'hole', bottom: 'flat', left: 'flat' }, 'transparent')}
    </div>
    <div class="j-creator-floater j-creator-floater-2">
      ${puzzleEl('#ffb3ba', { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
    </div>
    <div class="j-creator-card">
      <div class="j-creator-body">
        <div class="j-creator-text">
          <h3 class="j-creator-title">Need help with solve redirection?</h3>
          <p class="j-creator-desc">
            Check out the <a href="#docs">documentation</a> with code examples
            and step-by-step guides.
          </p>
        </div>
      </div>
      <div class="j-code-block">
        <div class="j-code-dots">
          <div class="j-code-dot" style="background:#ffb3ba"></div>
          <div class="j-code-dot" style="background:#ffffba"></div>
          <div class="j-code-dot" style="background:#baffc9"></div>
        </div>
        <div class="j-code-content">
          <div><span class="j-code-comment">// Lightweight solve crediting snippet</span></div>
          <div>
            &lt;<span class="j-code-fn">script</span> <span class="j-code-prop">src</span>=<span class="j-code-str">"https://api.yourdomain.com/games/sdk.js"</span> <span class="j-code-prop">defer</span>&gt;&lt;/<span class="j-code-fn">script</span>&gt;
          </div>
          <div>
            &lt;<span class="j-code-fn">button</span> <span class="j-code-prop">data-jigsaw-win</span> <span class="j-code-prop">data-puzzle-id</span>=<span class="j-code-str">"YOUR_ID"</span>&gt;win&lt;/<span class="j-code-fn">button</span>&gt;
          </div>
          <div><span class="j-code-comment">// works on third-party hosts via popup auth</span></div>
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
    question: 'Am I eligible to participate?',
    answer: 'Anyone 18 or younger can!',
    fill: '#bae1ff',
    notch: { top: 'hole', right: 'tab', bottom: 'hole', left: 'flat' },
  },
  {
    question: 'Do I host my own puzzle?',
    answer: 'Yes! You host your puzzle on your own domain or platform (like GitHub Pages, Vercel, etc.). The Arcade just links to your live puzzle.',
    fill: '#baffc9',
    notch: { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' },
  },
  {
    question: 'Does  ___  count as a "puzzle"?',
    answer: 'Anything goes as long as it\'s interactive and has a clear and clever solution! Just make sure the solve code snippet is properly added.',
    fill: '#ffb3ba',
    notch: { top: 'flat', right: 'flat', bottom: 'tab', left: 'tab' },
  },
  {
    question: 'How do Arcade Pieces and prizes work?',
    answer: 'Most pieces are awarded for project completion, and some for receiving community engagement (upvotes or solves). Solving others\' puzzles in the arcade after your submission also earns you pieces! Pieces can be redeemed for fun rewards like puzzles, swag, and much more!',
    fill: '#ffffba',
    notch: { top: 'hole', right: 'flat', bottom: 'flat', left: 'tab' },
  },
  {
    question: 'How do I start?',
    answer: 'Play some puzzles! Check out the <a href="#docs">documentation</a> for guides, resources, and inspiration to get you going!',
    fill: '#ffdfba',
    notch: { top: 'tab', right: 'flat', bottom: 'tab', left: 'flat' },
  },
];

function buildFAQ(): HTMLElement {
  const items = FAQS.map((f, i) => `
    <div class="j-faq-item" data-faq="${i}">
      <button class="j-faq-btn" aria-expanded="false">
        <div class="j-faq-btn-left">
          <div class="j-faq-piece-icon">
            ${puzzleEl(f.fill, f.notch, '#111827', 2)}
            <span class="j-faq-piece-icon-label">?</span>
          </div>
          <h3 class="j-faq-question">${f.question}</h3>
        </div>
      </button>
      <div class="j-faq-answer" role="region">
        <div class="j-faq-answer-inner">${f.answer}</div>
      </div>
    </div>`).join('');

  return htmlToElement(`
<section class="j-faq">
  <div class="j-faq-decor">
    ${puzzleEl('#bae1ff', { top: 'flat', right: 'tab', bottom: 'flat', left: 'tab' }, 'transparent')}
  </div>
  <div class="j-faq-floater j-faq-floater-1">
    ${puzzleEl('#ffffba', { top: 'tab', right: 'flat', bottom: 'hole', left: 'flat' }, 'transparent')}
  </div>
  <div class="j-faq-floater j-faq-floater-2">
    ${puzzleEl('#ffdfba', { top: 'flat', right: 'hole', bottom: 'flat', left: 'tab' }, 'transparent')}
  </div>
  <div class="j-faq-inner">
    <div class="j-section-header">
      <h2 class="j-section-title" style="filter:drop-shadow(4px 4px 0 #baffc9)">FAQ</h2>
      <p class="j-section-subtitle">Quick answers to common questions</p>
    </div>
    <div class="j-faq-list">${items}</div>
  </div>
</section>`);
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
  root.appendChild(buildCreator());
  root.appendChild(buildFAQ());

  // Wait a tick for DOM to settle before setting up observers
  requestAnimationFrame(() => {
    setupFAQ();
    setupArcade();
  });
}
