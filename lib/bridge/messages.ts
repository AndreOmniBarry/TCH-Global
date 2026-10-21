import 'server-only';
import { randomUUID } from 'crypto';
import type { FormType } from '@/lib/forms';

// Turns a website form into a SHEP.HRD message (docs/shep-bridge/CONTRACT.md).
// Only the fields SHEP needs leave the site; everything else stays here.
// Returns null when a form must not be bridged: no consent, a type that is
// never shared (teens, giving, testimonies, newsletter), or nothing usable.

export const CONSENT_VERSION = '2026-10';

export const TEAM_ALLOWLIST = [
  'Ushering & Hospitality', 'Media & Live Stream', 'Worship & Music', "Children's Ministry",
  'Outreach & Missions', 'Prayer Team', 'Protocol & Security', 'Sanitation & Facilities',
  'Follow-up & Counselling', 'Administration',
];

export type BridgeType = 'member.join' | 'care.salvation' | 'prayer.request' | 'workforce.volunteer';

export type Envelope = {
  v: 1;
  id: string;
  type: BridgeType;
  occurredAt: string;
  consent: { version: string; at: string };
  data: Record<string, string | string[]>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Strip control characters (newlines too, unless the field is free text).
function clean(v: string | undefined, max: number, multiline = false): string {
  if (!v) return '';
  const s = multiline ? v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : v.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return s.replace(/[ \t]{2,}/g, ' ').trim().slice(0, max);
}

function contact(f: Record<string, string>) {
  const email = clean(f.email, 160).toLowerCase();
  const phone = clean(f.phone, 32).replace(/[^\d+()\- ]/g, '');
  return { email: EMAIL_RE.test(email) ? email : '', phone: phone.replace(/\D/g, '').length >= 7 ? phone : '' };
}

function put(data: Record<string, string | string[]>, key: string, v: string) {
  if (v) data[key] = v;
}

export function toEnvelope(type: FormType, f: Record<string, string>): Envelope | null {
  if (f.share !== 'yes') return null;
  const data: Record<string, string | string[]> = {};
  let bt: BridgeType;
  const name = clean(f.name, 120);
  const { email, phone } = contact(f);

  switch (type) {
    case 'join':
      bt = 'member.join';
      if (name.length < 2 || (!email && !phone)) return null;
      data.full_name = name; put(data, 'email', email); put(data, 'phone', phone);
      put(data, 'note', clean(f.message || f.note, 1000, true));
      break;
    case 'salvation':
      bt = 'care.salvation';
      if (name.length < 2 || (!email && !phone)) return null;
      data.full_name = name; put(data, 'email', email); put(data, 'phone', phone);
      put(data, 'city', clean(f.city, 80)); put(data, 'note', clean(f.note, 1000, true));
      break;
    case 'prayer': {
      bt = 'prayer.request';
      const request = clean(f.message, 4000, true);
      if (request.length < 3) return null;
      data.request = request;
      break;
    }
    case 'volunteer': {
      bt = 'workforce.volunteer';
      if (name.length < 2 || (!email && !phone)) return null;
      const parts = (f.team || '').split(',').map((s) => s.trim());
      const teams = TEAM_ALLOWLIST.filter((t) => parts.includes(t));
      const idea = clean((f.team || '').split('New team idea:')[1], 600, true);
      if (!teams.length && !idea) return null;
      data.full_name = name; put(data, 'email', email); put(data, 'phone', phone);
      data.teams = teams; put(data, 'team_idea', idea);
      break;
    }
    default:
      return null;
  }
  const now = new Date().toISOString();
  return { v: 1, id: randomUUID(), type: bt, occurredAt: now, consent: { version: CONSENT_VERSION, at: now }, data };
}
