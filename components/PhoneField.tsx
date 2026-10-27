'use client';

import { useEffect, useState } from 'react';
import { COUNTRIES, countryOf, flagSvg, guessCountry, PHONE_CHEVRON } from '@/lib/phone';

/** Phone input with a country picker (flag + dialling code). Submits
 * `<name>` (the number as typed) and `<name>_cc` (the country, e.g. NG);
 * use withCountry() from lib/phone to join them. */
export default function PhoneField({ name, id, placeholder = '803 000 0000', defaultValue, ariaLabel, autoComplete = 'tel-national' }: {
  name: string; id?: string; placeholder?: string; defaultValue?: string; ariaLabel?: string; autoComplete?: string;
}) {
  const [iso, setIso] = useState('NG');
  // After hydration, so the server and first client render agree.
  useEffect(() => { setIso(guessCountry()); }, []);
  const c = countryOf(iso);
  return (
    <div className="ph">
      <span className="ph-cc">
        <span className="ph-flag" dangerouslySetInnerHTML={{ __html: flagSvg(c.iso) }} />
        <span className="ph-dial">+{c.dial}</span>
        <span dangerouslySetInnerHTML={{ __html: PHONE_CHEVRON }} style={{ display: 'contents' }} />
        <select name={`${name}_cc`} className="ph-select" aria-label="Country code" value={iso} onChange={(e) => setIso(e.target.value)}>
          {COUNTRIES.map((k) => <option key={k.iso} value={k.iso}>{k.name} (+{k.dial})</option>)}
        </select>
      </span>
      <input type="tel" id={id} name={name} placeholder={placeholder} defaultValue={defaultValue} autoComplete={autoComplete} inputMode="tel" aria-label={ariaLabel} />
    </div>
  );
}
