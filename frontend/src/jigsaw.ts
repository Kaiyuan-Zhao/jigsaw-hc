import { buildPuzzlePath, gridPieceEdges, type EdgeType } from './puzzle-path'
import { htmlToElement } from './lib/dom'
import { SHOP_ITEMS } from './shop-display'
import { puzzleSVG, type PuzzleSvgOptions } from './ui/puzzle-svg'
import { PASTELS } from './lib/palette'

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

const ARCADE_HEART_PATH =
  '<path d="m12 20-1.1-1C6 14.7 3 12 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.4.8 4.5 2.1C14.1 3.8 15.8 3 17.5 3 20.6 3 23 5.4 23 8.5c0 3.5-3 6.2-7.9 10.5z"/>';

function arcadeHeartSvg(size: number, filled: boolean): string {
  return `<svg class="c-arcade-heart-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ARCADE_HEART_PATH}</svg>`;
}

const SOLVE_FLAG_PATH =
  '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>';

function solveFlagSvg(size: number): string {
  return `<svg class="c-solve-flag-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${SOLVE_FLAG_PATH}</svg>`;
}

type Notch = { top: EdgeType; right: EdgeType; bottom: EdgeType; left: EdgeType };

function puzzleEl(fill: string, notch: Notch, stroke = '#111827', strokeWidth?: number, mid?: number): string {
  const opts: PuzzleSvgOptions = { fill, stroke, mid, ...notch };
  if (strokeWidth !== undefined) opts.strokeWidth = strokeWidth;
  return puzzleSVG(opts);
}

// ============================================================
// SECTION — HERO
// ============================================================

function buildHero(): HTMLElement {
  return htmlToElement(`
<section class="c-hero c-puzzle-border c-section-shell">
  <div class="c-hero-floater c-hero-floater-1">
    ${puzzleEl(PASTELS.blue, { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-hero-floater c-hero-floater-2">
    ${puzzleEl(PASTELS.green, { top: 'hole', right: 'flat', bottom: 'hole', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-hero-floater c-hero-floater-3">
    ${puzzleEl(PASTELS.pink, { top: 'tab', right: 'flat', bottom: 'flat', left: 'hole' }, 'transparent')}
  </div>
  <div class="c-hero-floater c-hero-floater-4">
    ${puzzleEl(PASTELS.yellow, { top: 'flat', right: 'tab', bottom: 'hole', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-hero-floater c-hero-floater-5">
    ${puzzleEl('#ffdfba', { top: 'hole', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-hero-floater c-hero-floater-6">
    ${puzzleEl(PASTELS.blue, { top: 'tab', right: 'flat', bottom: 'hole', left: 'hole' }, 'transparent')}
  </div>
  <div class="c-hero-floater c-hero-floater-7" aria-hidden="true">
    ${puzzleSVG({ fill: '#FAC898', stroke: '', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
  </div>

  <div class="c-hero-content">
    <div class="c-hero-title-wrap">
      <h1 class="c-hero-title">Jigsaw</h1>
      <div class="c-hero-spinner">
        ${puzzleSVG({ fill: '#ffdfba', stroke: '', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
      </div>
    </div>
    <p class="c-hero-subtitle">Ship puzzles, solve puzzles, win puzzles!</p>
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
    icon: 'brain',
    title: 'Clever',
    desc: 'Obvious in hindsight...',
    fill: PASTELS.green,
    notch: { top: 'flat', right: 'tab', bottom: 'hole', left: 'flat' },
    startX: -420, startY: -200, startRot: -45,
  },
  {
    icon: 'globe',
    title: 'Open',
    desc: 'Open sourced and hosted live!',
    fill: PASTELS.pink,
    notch: { top: 'flat', right: 'flat', bottom: 'tab', left: 'hole' },
    startX: 420, startY: -160, startRot: 30,
  },
  {
    icon: 'mousePointer',
    title: 'Interactive',
    desc: 'Not just text riddles!',
    fill: PASTELS.blue,
    notch: { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' },
    startX: -360, startY: 310, startRot: 60,
  },
  {
    icon: 'trophy',
    title: 'Solvable',
    desc: 'Puzzle reveals a passkey',
    fill: PASTELS.yellow,
    notch: { top: 'hole', right: 'flat', bottom: 'flat', left: 'hole' },
    startX: 320, startY: 260, startRot: -20,
  },
];

function buildArcadeEngageHtml(): string {
  const heartLarge = arcadeHeartSvg(52, false);
  const heartInline = arcadeHeartSvg(20, false);
  const flagLarge = solveFlagSvg(52);
  return `
      <div class="c-creator-rewards-engage">
        <p class="c-creator-rewards-engage-title">Engage with the Arcade!</p>
        <div class="c-creator-rewards-engage-grid">
          <div class="c-creator-rewards-engage-item">
            <div class="c-creator-rewards-engage-icon" aria-hidden="true">${heartLarge}</div>
            <p class="c-creator-rewards-engage-line">Receiving 1 ${heartInline} = +2 🧩</p>
          </div>
          <div class="c-creator-rewards-engage-item">
            <div class="c-creator-rewards-engage-icon" aria-hidden="true">${flagLarge}</div>
            <p class="c-creator-rewards-engage-line">Solving 1 puzzle = +2 🧩</p>
          </div>
        </div>
      </div>`;
}

function buildPrinciples(): HTMLElement {
  const cards = PRINCIPLES.map((p, i) => `
    <div class="c-arcade-scroll-piece principle-slot-${i}" data-ui-hook="arcade-scroll-piece">
      <div class="c-principle-card">
        ${puzzleEl(p.fill, p.notch)}
        <div class="c-principle-body">
          <div class="c-icon-wrap">${icon(p.icon, 36)}</div>
          <h3 class="c-principle-name">${p.title}</h3>
          <p class="c-principle-desc">${p.desc}</p>
        </div>
      </div>
    </div>`).join('');

  const arcadeEngage = buildArcadeEngageHtml();

  return htmlToElement(`
<section class="c-principles c-arcade-stage-section c-puzzle-border c-section-shell" data-ui-hook="arcade-stage-section">
  <div class="c-dot-bg"></div>
  <div class="c-principles-decor">
    ${puzzleEl('#FAC898', { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-principles-floater c-principles-floater-1">
    ${puzzleEl('#ffdfba', { top: 'hole', right: 'tab', bottom: 'flat', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-principles-floater c-principles-floater-2">
    ${puzzleEl(PASTELS.green, { top: 'flat', right: 'flat', bottom: 'tab', left: 'hole' }, 'transparent')}
  </div>
  <div class="c-principles-floater c-principles-floater-3">
    ${puzzleEl(PASTELS.pink, { top: 'tab', right: 'hole', bottom: 'flat', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-principles-floater c-principles-floater-4">
    ${puzzleEl(PASTELS.blue, { top: 'flat', right: 'tab', bottom: 'hole', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-principles-floater c-principles-floater-5">
    ${puzzleEl(PASTELS.yellow, { top: 'hole', right: 'flat', bottom: 'tab', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-principles-floater c-principles-floater-6" aria-hidden="true">
    ${puzzleSVG({ fill: '#ffdfba', stroke: '', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
  </div>
  <div class="c-principles-inner">
    <div class="c-section-header">
      <h2 class="c-section-title">
        Puzzling 101
      </h2>
    </div>
    
    <div class="c-principles-grid c-arcade-stage">
      ${cards}
    </div>
      <h2 class="c-section-title c-section-title-lg c-section-title-shadow-blue c-arcade-title">... Then be featured on the Arcade</h2>
      <p class="c-section-subtitle c-section-subtitle-chip c-arcade-subtitle" data-ui-hook="arcade-stage-hint">Where all these pieces come together</p>
      <div class="c-principles-arcade-divider" aria-hidden="true"></div>
      ${arcadeEngage}
      <a href="/arcade" class="c-main-cta c-arcade-cta">Enter the Arcade</a>
    </div>
</section>`);
}


// ============================================================
// SECTION — CREATOR NOTE (yellow card)
// ============================================================

function buildCreator(): HTMLElement {
  const prizeCards = buildCreatorPrizeCards()
  const rewards = buildCreatorRewards()
  return htmlToElement(`
<section class="c-creator c-puzzle-border c-section-shell">
    <div class="c-creator-floater c-creator-floater-1">
      ${puzzleEl(PASTELS.blue, { top: 'tab', right: 'hole', bottom: 'flat', left: 'flat' }, 'transparent')}
    </div>
    <div class="c-creator-floater c-creator-floater-2">
      ${puzzleEl(PASTELS.pink, { top: 'flat', right: 'tab', bottom: 'tab', left: 'flat' }, 'transparent')}
    </div>
    <div class="c-creator-floater c-creator-floater-3">
      ${puzzleEl(PASTELS.yellow, { top: 'tab', right: 'flat', bottom: 'flat', left: 'hole' }, 'transparent')}
    </div>
    <div class="c-creator-floater c-creator-floater-4">
      ${puzzleEl(PASTELS.green, { top: 'hole', right: 'tab', bottom: 'hole', left: 'flat' }, 'transparent')}
    </div>
    <div class="c-creator-floater c-creator-floater-5" aria-hidden="true">
      ${puzzleSVG({ fill: '#ffdfba', stroke: '', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
    </div>
    ${rewards}
    <div class="c-creator-conveyor" aria-label="Shop prizes preview">
      <div class="c-creator-conveyor-track">
        <div class="c-creator-conveyor-set">${prizeCards}</div>
        <div class="c-creator-conveyor-set" aria-hidden="true">${prizeCards}</div>
      </div>
    </div>
    <div class="c-creator-shop-link-wrap">
      <a href="/shop" class="c-main-cta c-creator-shop-link">Go to Shop</a>
    </div>
</section>`);
}

function buildCreatorRewards(): string {
  const smallRewardOverlay = buildRewardTileOverlay(6, 2)
  const largeRewardOverlay = buildRewardTileOverlay(7, 6)

  return `
    <div class="c-creator-rewards" aria-label="Puzzle piece rewards">
      <p class="c-creator-rewards-title">Earn 🧩 pieces for your puzzle!</p>
      <p class="c-creator-rewards-tagline">building bigger and better puzzles = earn more pieces!</p>
      <p class="c-creator-rewards-example">e.g</p>
      <div class="c-creator-rewards-grid">
        <article
          class="c-creator-reward-card c-creator-reward-card-small"
        >
          <div class="c-creator-reward-overlay" aria-hidden="true">${smallRewardOverlay}</div>
          <div class="c-creator-reward-content">
            <p class="c-creator-reward-pieces"> 120 🧩</p>
            <p class="c-creator-reward-time">= ~1-2h spent</p>
          </div>
        </article>
        <article
          class="c-creator-reward-card c-creator-reward-card-large"
        >
          <div class="c-creator-reward-overlay" aria-hidden="true">${largeRewardOverlay}</div>
          <div class="c-creator-reward-content">
            <p class="c-creator-reward-pieces"> 420 🧩</p>
            <p class="c-creator-reward-time">= ~3-4h spent</p>
          </div>
        </article>
      </div>
      <p class="c-creator-rewards-hackatime">track your time with <a href="https://hackatime.hackclub.com/" target="_blank" rel="noopener noreferrer">hackatime!</a></p>
    </div>
  `
}

function buildRewardTileOverlay(cols: number, rows: number): string {
  const tile = 100
  const tiles: string[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const edges = gridPieceEdges(row, col, rows, cols)
      const path = buildPuzzlePath(edges.top, edges.right, edges.bottom, edges.left, tile / 2)
      tiles.push(
        `<path d="${path}" transform="translate(${col * tile} ${row * tile})" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
      )
    }
  }

  return `
<svg class="c-creator-reward-overlay-svg" viewBox="0 0 ${cols * tile} ${rows * tile}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  ${tiles.join('')}
</svg>`.trim()
}

function buildCreatorPrizeCards(): string {
  return SHOP_ITEMS.map((item) => `
      <article class="c-creator-prize-card">
        <div class="c-creator-prize-visual">
          <img class="c-creator-prize-img" src="${item.image}" alt="${item.title}" loading="lazy" decoding="async" />
        </div>
        <div class="c-creator-prize-body">
          <p class="c-creator-prize-title">${item.title}</p>
          <p class="c-creator-prize-price"><span aria-hidden="true">🧩</span> ${item.pricePieces}</p>
        </div>
      </article>
    `).join('')
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
    fill: PASTELS.blue,
    notch: { top: 'hole', right: 'tab', bottom: 'hole', left: 'flat' },
  },
  {
    question: 'Do I host my own puzzle?',
    answer: 'Yes! You must host your web puzzle (like GitHub Pages, Vercel, Itch.io , etc.). The Arcade will link to your live puzzle.',
    fill: PASTELS.green,
    notch: { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' },
  },
  {
    question: 'Will  ___  count as a "puzzle"?',
    answer: 'Anything goes as long as it\'s interactive and has a clear and clever solution!',
    fill: PASTELS.pink,
    notch: { top: 'flat', right: 'flat', bottom: 'tab', left: 'tab' },
  },
  {
    question: 'How do Arcade Pieces and prizes work?',
    answer: 'Most pieces are awarded for project completion, and some for receiving community engagement (upvotes or solves). Solving others\' puzzles in the arcade after your submission also earns you pieces! Pieces can be redeemed for fun rewards like puzzles, swag, and much more!',
    fill: PASTELS.yellow,
    notch: { top: 'hole', right: 'flat', bottom: 'flat', left: 'tab' },
  },
  {
    question: 'How do I start?',
    answer: 'Play some puzzles for some inspiration! Check out <a href="#docs">Arcade</a> to try others\' puzzles!',
    fill: '#ffdfba',
    notch: { top: 'tab', right: 'flat', bottom: 'tab', left: 'flat' },
  },
];

function buildFAQ(): HTMLElement {
  const items = FAQS.map((f, i) => `
    <div class="c-faq-item" data-faq="${i}" data-ui-hook="faq-item">
      <button class="c-faq-btn" data-ui-hook="faq-button" aria-expanded="false">
        <div class="c-faq-btn-left">
          <div class="c-faq-piece-icon">
            ${puzzleEl(f.fill, f.notch, '#111827', 2)}
            <span class="c-faq-piece-icon-label">?</span>
          </div>
          <h3 class="c-faq-question">${f.question}</h3>
        </div>
      </button>
      <div class="c-faq-answer" role="region">
        <div class="c-faq-answer-inner">${f.answer}</div>
      </div>
    </div>`).join('');

  return htmlToElement(`
<section class="c-faq c-section-shell">
  <div class="c-faq-decor">
    ${puzzleEl(PASTELS.blue, { top: 'flat', right: 'tab', bottom: 'flat', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-faq-floater c-faq-floater-1">
    ${puzzleEl(PASTELS.yellow, { top: 'tab', right: 'flat', bottom: 'hole', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-faq-floater c-faq-floater-2">
    ${puzzleEl('#ffdfba', { top: 'flat', right: 'hole', bottom: 'flat', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-faq-floater c-faq-floater-3">
    ${puzzleEl(PASTELS.green, { top: 'tab', right: 'tab', bottom: 'flat', left: 'flat' }, 'transparent')}
  </div>
  <div class="c-faq-floater c-faq-floater-4">
    ${puzzleEl(PASTELS.pink, { top: 'flat', right: 'flat', bottom: 'tab', left: 'tab' }, 'transparent')}
  </div>
  <div class="c-faq-floater c-faq-floater-5" aria-hidden="true">
    ${puzzleSVG({ fill: PASTELS.blue, stroke: '', top: 'tab', right: 'tab', bottom: 'tab', left: 'tab', cls: '' })}
  </div>
  <div class="c-faq-inner">
    <div class="c-section-header">
      <h2 class="c-section-title c-section-title">FAQ</h2>
    </div>
    <div class="c-faq-list">${items}</div>
  </div>
</section>`);
}

// ============================================================
// INTERACTION — FAQ ACCORDION
// ============================================================

function setupFAQ(): void {
  const items = document.querySelectorAll<HTMLElement>('[data-ui-hook="faq-item"], .c-faq-item');

  items.forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>('[data-ui-hook="faq-button"], .c-faq-btn')!;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all
      items.forEach((i) => {
        i.classList.remove('is-open');
        i.querySelector('[data-ui-hook="faq-button"], .c-faq-btn')?.setAttribute('aria-expanded', 'false');
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
  const section  = document.querySelector<HTMLElement>('[data-ui-hook="arcade-stage-section"], .c-arcade-stage-section');
  const pieceEls = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-hook="arcade-scroll-piece"], .c-arcade-scroll-piece'));
  const hint     = document.querySelector<HTMLElement>('[data-ui-hook="arcade-stage-hint"], .c-arcade-subtitle');

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
    const scrollPivot = viewH * 0.9;
    const travelDistance = rect.height * 0.5;
    const rawProg = (scrollPivot - rect.top) / travelDistance;
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
  root.appendChild(buildCreator());
  root.appendChild(buildPrinciples());
  root.appendChild(buildFAQ());

  // Wait a tick for DOM to settle before setting up observers
  requestAnimationFrame(() => {
    setupFAQ();
    setupArcade();
  });
}
