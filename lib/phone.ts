// Phone numbers with a country code. One list feeds the picker on every
// form (the raw-HTML homepage forms and the React ones) and the server,
// which turns "0803 665 9700" + NG into "+234 8036659700".

export type Country = { iso: string; name: string; dial: string };

export const COUNTRIES: Country[] = [
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'GH', name: 'Ghana', dial: '233' },
  { iso: 'KE', name: 'Kenya', dial: '254' },
  { iso: 'ZA', name: 'South Africa', dial: '27' },
  { iso: 'CM', name: 'Cameroon', dial: '237' },
  { iso: 'BJ', name: 'Benin', dial: '229' },
  { iso: 'TG', name: 'Togo', dial: '228' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'IE', name: 'Ireland', dial: '353' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'NL', name: 'Netherlands', dial: '31' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso: 'AU', name: 'Australia', dial: '61' },
];

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

const V = (body: string) => `<svg viewBox="0 0 30 20" width="22" height="15" aria-hidden="true" focusable="false">${body}</svg>`;
const tri = (a: string, b: string, c: string, vertical: boolean) => vertical
  ? `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`
  : `<rect width="30" height="6.67" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`;
const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}"/>`;
};
const UNION = `<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#C8102E" stroke-width="3.4"/>`;

const FLAGS: Record<string, string> = {
  NG: V(tri('#008751', '#fff', '#008751', true)),
  GH: V(tri('#CE1126', '#FCD116', '#006B3F', false) + star(15, 10.2, 3.2, '#000')),
  KE: V('<rect width="30" height="20" fill="#fff"/><rect width="30" height="6" fill="#000"/><rect y="7.2" width="30" height="5.6" fill="#BB0000"/><rect y="14" width="30" height="6" fill="#006600"/><ellipse cx="15" cy="10" rx="2.6" ry="5" fill="#BB0000" stroke="#000" stroke-width=".6"/><path d="M15 5.4v9.2" stroke="#fff" stroke-width=".6"/>'),
  ZA: V('<rect width="30" height="10" fill="#E03C31"/><rect y="10" width="30" height="10" fill="#001489"/><path d="M0 0l13 10L0 20" fill="#fff"/><path d="M13 10h17" stroke="#fff" stroke-width="6"/><path d="M0 2.2l10.2 7.8L0 17.8" fill="#007749"/><path d="M10 10h20" stroke="#007749" stroke-width="3.6"/><path d="M0 4.4l7.4 5.6L0 15.6z" fill="#FFB81C"/><path d="M0 6.2l5.1 3.8L0 13.8z" fill="#000"/>'),
  CM: V(tri('#007A5E', '#CE1126', '#FCD116', true) + star(15, 10.2, 3, '#FCD116')),
  BJ: V('<rect width="12" height="20" fill="#008751"/><rect x="12" width="18" height="10" fill="#FCD116"/><rect x="12" y="10" width="18" height="10" fill="#E8112D"/>'),
  TG: V('<rect width="30" height="20" fill="#006A4E"/><rect y="4" width="30" height="4" fill="#FFCE00"/><rect y="12" width="30" height="4" fill="#FFCE00"/><rect width="12" height="12" fill="#D21034"/>' + star(6, 6.2, 3.2, '#fff')),
  GB: V(UNION),
  IE: V(tri('#169B62', '#fff', '#FF883E', true)),
  DE: V(tri('#000', '#DD0000', '#FFCE00', false)),
  FR: V(tri('#002395', '#fff', '#ED2939', true)),
  IT: V(tri('#009246', '#fff', '#CE2B37', true)),
  NL: V(tri('#AE1C28', '#fff', '#21468B', false)),
  ES: V('<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>'),
  US: V('<rect width="30" height="20" fill="#fff"/>' + [0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${(i * 20 / 13).toFixed(2)}" width="30" height="${(20 / 13).toFixed(2)}" fill="#B22234"/>`).join('') + `<rect width="13" height="${(140 / 13).toFixed(2)}" fill="#3C3B6E"/>` + [0, 1, 2].map((r) => [0, 1, 2, 3].map((k) => `<circle cx="${2 + k * 3}" cy="${(2 + r * 3.4).toFixed(1)}" r=".7" fill="#fff"/>`).join('')).join('')),
  CA: V('<rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#D52B1E"/><rect x="22.5" width="7.5" height="20" fill="#D52B1E"/><path d="M15 4l1 2.2 1.6-.8-.6 3.4 2-1.8.5 1.3 1.8-.4-.9 2.2.9.4-3.4 2.6.4 1.2-3-.5V17h-.6v-3.2l-3 .5.4-1.2-3.4-2.6.9-.4-.9-2.2 1.8.4.5-1.3 2 1.8-.6-3.4 1.6.8z" fill="#D52B1E"/>'),
  AE: V('<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#00732F"/><rect y="13.33" width="30" height="6.67" fill="#000"/><rect width="8" height="20" fill="#FF0000"/>'),
  AU: V('<rect width="30" height="20" fill="#012169"/><g transform="scale(.5)">' + UNION + '</g>' + star(7.5, 15, 2.2, '#fff') + star(22, 5, 1.2, '#fff') + star(25.5, 9, 1.2, '#fff') + star(22, 16, 1.3, '#fff') + star(19, 9.5, 1.1, '#fff')),
};

export const flagSvg = (iso: string) => FLAGS[iso] || FLAGS.NG;
export const countryOf = (iso: string): Country => BY_ISO.get(iso) || COUNTRIES[0];

/** "0803 665 9700" + "NG" → "+234 8036659700". A number typed with its
 * own +code (or 00code) keeps it. Returns '' for an empty number. */
export function withCountry(national: string, iso: string): string {
  const raw = (national || '').trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  const dial = countryOf(iso).dial;
  // Already typed with the country code but no plus: 2348036659700.
  if (digits.startsWith(dial) && digits.length >= dial.length + 9) return `+${digits}`;
  digits = digits.replace(/^0+/, '');
  return `+${dial} ${digits}`;
}

// Time zone → likely country, to preselect the picker for visitors abroad.
const TZ: [RegExp, string][] = [
  [/^Africa\/Lagos/, 'NG'], [/^Africa\/Accra/, 'GH'], [/^Africa\/Nairobi/, 'KE'], [/^Africa\/Johannesburg/, 'ZA'],
  [/^Africa\/Douala/, 'CM'], [/^Africa\/Porto-Novo/, 'BJ'], [/^Africa\/Lome/, 'TG'],
  [/^Europe\/London/, 'GB'], [/^Europe\/Dublin/, 'IE'], [/^Europe\/Berlin/, 'DE'], [/^Europe\/Paris/, 'FR'],
  [/^Europe\/Rome/, 'IT'], [/^Europe\/Amsterdam/, 'NL'], [/^Europe\/Madrid/, 'ES'], [/^Asia\/Dubai/, 'AE'],
  [/^Australia\//, 'AU'],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns)/, 'CA'], [/^America\//, 'US'],
];
export function guessCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return TZ.find(([re]) => re.test(tz))?.[1] || 'NG';
  } catch {
    return 'NG';
  }
}

const CHEVRON = '<svg class="ph-chev" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 4.5L6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Markup for the raw-HTML forms. Every flag is present and the selected
 * one is shown; public/js/main.js swaps them when the country changes. */
export function phoneFieldHtml(id: string, placeholder = '803 000 0000', iso = 'NG'): string {
  const c = countryOf(iso);
  return `<div class="ph">
          <span class="ph-cc">
            ${COUNTRIES.map((k) => `<span class="ph-flag" data-iso="${k.iso}"${k.iso === c.iso ? '' : ' hidden'}>${flagSvg(k.iso)}</span>`).join('')}
            <span class="ph-dial">+${c.dial}</span>${CHEVRON}
            <select id="${id}_cc" class="ph-select" aria-label="Country code" data-autocountry>
              ${COUNTRIES.map((k) => `<option value="${k.iso}" data-dial="${k.dial}"${k.iso === c.iso ? ' selected' : ''}>${k.name} (+${k.dial})</option>`).join('')}
            </select>
          </span>
          <input type="tel" id="${id}" placeholder="${placeholder}" autocomplete="tel-national" inputmode="tel">
        </div>`;
}

export const PHONE_CHEVRON = CHEVRON;
