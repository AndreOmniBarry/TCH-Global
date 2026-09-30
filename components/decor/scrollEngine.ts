// One shared, passive scroll loop for every scroll-scrubbed decoration
// (replaces GSAP ScrollTrigger). Each item maps a 0..1 progress to a
// transform; values ease toward their target so motion stays smooth.

type Item = {
  el: HTMLElement;
  progress: () => number;
  apply: (el: HTMLElement, p: number) => void;
  current: number;
  visible: boolean;
  watch: Element;
};

const items = new Set<Item>();
let raf = 0;
let io: IntersectionObserver | null = null;

function frame() {
  raf = 0;
  let moving = false;
  items.forEach((it) => {
    if (!it.visible) return;
    const target = it.progress();
    const next = it.current + (target - it.current) * 0.14;
    it.current = Math.abs(target - next) < 0.0005 ? target : next;
    if (it.current !== target) moving = true;
    it.apply(it.el, it.current);
  });
  if (moving) raf = requestAnimationFrame(frame);
}

function kick() {
  if (!raf) raf = requestAnimationFrame(frame);
}

export function track(
  el: HTMLElement,
  progress: () => number,
  apply: (el: HTMLElement, p: number) => void,
  observeEl: Element = el
) {
  if (typeof window === 'undefined') return () => {};
  if (!items.size) {
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
  }
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => items.forEach((it) => { if (it.watch === e.target) it.visible = e.isIntersecting; }));
        kick();
      },
      { rootMargin: '25% 0px' }
    );
  }
  const it: Item = { el, progress, apply, current: progress(), visible: true, watch: observeEl };
  items.add(it);
  io.observe(observeEl);
  apply(el, it.current);
  kick();
  return () => {
    items.delete(it);
    io?.unobserve(observeEl);
    if (!items.size) {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
    }
  };
}
