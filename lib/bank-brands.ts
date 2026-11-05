// Bank marks drawn in SVG (no image files): crisp at any size, themeable,
// and nothing extra to download. Used only to show which bank an account
// is with.
export type BankBrand = 'sterling' | 'premiumtrust';

/** Sterling Bank: the glossy red sphere. */
export function sterlingMark(id: string, size = 30) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
  <defs>
    <radialGradient id="${id}-b" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#ff7a59"/><stop offset=".45" stop-color="#e3171b"/><stop offset="1" stop-color="#8e0710"/></radialGradient>
    <radialGradient id="${id}-h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="20" cy="37" rx="11" ry="2" fill="#000" opacity=".18"/>
  <circle cx="20" cy="19" r="16" fill="url(#${id}-b)"/>
  <ellipse cx="14.5" cy="12" rx="7" ry="4.6" fill="url(#${id}-h)" transform="rotate(-28 14.5 12)"/>
  <path d="M8 24c3 6 10 9 17 7" stroke="#fff" stroke-opacity=".22" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;
}

/** Premium Trust Bank: an arrow rising out of a square. */
export function premiumMark(id: string, size = 30) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
  <defs><linearGradient id="${id}-a" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff6b4a"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs>
  <path d="M22 7H10a4 4 0 0 0-4 4v19a4 4 0 0 0 4 4h19a4 4 0 0 0 4-4V18" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 24L33 7" stroke="url(#${id}-a)" stroke-width="4" stroke-linecap="round"/>
  <path d="M22.5 6.5H33.5V17.5" fill="none" stroke="url(#${id}-a)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function bankLockup(brand: BankBrand, id: string) {
  return brand === 'sterling'
    ? `<span class="bc-lock">${sterlingMark(id)}<span class="bc-word bc-word--sterling">Sterling</span></span>`
    : `<span class="bc-lock">${premiumMark(id)}<span class="bc-word bc-word--premium"><b>Premium</b>Trust<small>Bank</small></span></span>`;
}

export function bankWatermark(brand: BankBrand, id: string) {
  return brand === 'sterling' ? sterlingMark(`${id}-w`, 220) : premiumMark(`${id}-w`, 220);
}

/** EMV chip, for the bank-card look. */
export const CHIP = `<svg class="bc-chip" viewBox="0 0 46 34" width="42" height="31" aria-hidden="true"><defs><linearGradient id="bc-chip-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e3a1"/><stop offset=".5" stop-color="#d4a94c"/><stop offset="1" stop-color="#f3d27c"/></linearGradient></defs><rect x="1" y="1" width="44" height="32" rx="6" fill="url(#bc-chip-g)" stroke="#a37a2a" stroke-opacity=".5"/><path d="M1 12h13M1 22h13M32 12h13M32 22h13M14 1v32M32 1v32M14 17h18" stroke="#8a6420" stroke-opacity=".45" stroke-width="1.2" fill="none"/></svg>`;
