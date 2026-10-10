// One source for the site menu (homepage raw HTML and every other page).
// Desktop: primary links, a "More" menu, and a Give button.
// Phones: everything, in one list (the More menu is hidden there).
const PRIMARY: [string, string][] = [
  ['#about-church', 'About'],
  ['/library', 'PUDLIB!'],
  ['/blog', 'Blog'],
  ['#events', 'Events'],
  ['/live', 'Live'],
  ['/kids', 'Kids'],
  ['/teens', 'Teens'],
];
const SECONDARY: [string, string][] = [
  ['#pastor-section', 'Meet the Pastor'],
  ['#testimonies', 'Testimonies'],
  ['#service', 'Service times'],
  ['#salvation', 'Prayer of Salvation'],
  ['#volunteer', 'Volunteer'],
  ['#contact', 'Prayer & Contact'],
  ['#join', 'Join Us'],
];

export function navHtml(onHome: boolean) {
  const h = (href: string) => (href.startsWith('#') ? (onHome ? href : `/${href}`) : href);
  const li = (cls: string) => ([href, label]: [string, string]) => `<li class="${cls}"><a href="${h(href)}">${label}</a></li>`;
  return `<ul>
${PRIMARY.map(li('nav-p')).join('\n')}
${SECONDARY.map(li('nav-s')).join('\n')}
<li class="nav-more"><details><summary>More<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary><div class="nav-more-menu">${SECONDARY.map(([href, label]) => `<a href="${h(href)}">${label}</a>`).join('')}</div></details></li>
<li class="nav-cta"><a href="${h('#give')}" class="nav-give">Give</a></li>
<li class="nav-acc"><a href="/account" class="nav-account" data-account-link>Sign in</a></li>
</ul>`;
}
