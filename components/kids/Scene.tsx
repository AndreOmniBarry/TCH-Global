import type { Prop, Scene as SceneKind } from '@/lib/kids/stories';

const SKY: Record<SceneKind, [string, string]> = {
  desert: ['#ffb347', '#ffe6a8'], sea: ['#4fc3f7', '#c8f0ff'], night: ['#0b1340', '#3a2a7a'], palace: ['#c084fc', '#fde4ff'],
  field: ['#7dd3fc', '#e0f7ff'], mountain: ['#93c5fd', '#f0f7ff'], city: ['#fb923c', '#ffe4c4'], garden: ['#86efac', '#ecfff0'],
  storm: ['#374151', '#6b7280'], stable: ['#1e1b4b', '#4c3a8a'], temple: ['#fcd34d', '#fff7d6'], river: ['#38bdf8', '#dff6ff'],
};
const NIGHT: SceneKind[] = ['night', 'stable', 'storm'];

function Ground({ kind }: { kind: SceneKind }) {
  switch (kind) {
    case 'sea': case 'storm':
      return <g className="sc-waves">{[0, 1, 2].map((i) => <path key={i} className={`sc-wave sc-wave-${i}`} d={`M-40 ${170 + i * 22} q25 -14 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V260 H-40z`} fill={kind === 'storm' ? ['#1f3b57', '#243f63', '#2b4a73'][i] : ['#29b6f6', '#039be5', '#0277bd'][i]} />)}</g>;
    case 'river':
      return <><path d="M0 170 Q200 140 400 170 V240 H0z" fill="#7cb342" /><path className="sc-river" d="M-20 205 Q100 185 200 205 T420 200 V240 H-20z" fill="#29b6f6" /></>;
    case 'desert':
      return <><path d="M0 175 Q90 140 180 170 T400 160 V240 H0z" fill="#f6c27a" /><path d="M0 200 Q120 175 240 200 T400 195 V240 H0z" fill="#eaa75a" /></>;
    case 'mountain':
      return <><path d="M0 190 L80 90 L150 170 L230 70 L330 180 L400 120 V240 H0z" fill="#64748b" /><path d="M230 70 L250 98 L215 100z M80 90 L95 112 L66 112z" fill="#fff" /><path d="M0 205 Q200 180 400 205 V240 H0z" fill="#65a30d" /></>;
    case 'city': case 'palace': case 'temple':
      return <>
        <g fill={kind === 'temple' ? '#e7c873' : kind === 'palace' ? '#a78bfa' : '#c2410c'} opacity=".9">
          <rect x="20" y="120" width="60" height="80" /><rect x="90" y="100" width="50" height="100" /><rect x="260" y="110" width="55" height="90" /><rect x="320" y="125" width="60" height="75" />
          {kind === 'palace' && <><circle cx="200" cy="100" r="34" /><rect x="160" y="100" width="80" height="100" /><rect x="196" y="48" width="8" height="24" /></>}
          {kind === 'temple' && <><path d="M140 110 L200 75 L260 110z" /><rect x="145" y="110" width="110" height="90" />{[155, 180, 205, 230].map((x) => <rect key={x} x={x} y="118" width="10" height="82" fill="#fff6d8" />)}</>}
          {kind === 'city' && <rect x="150" y="90" width="90" height="110" />}
        </g>
        <path d="M0 200 H400 V240 H0z" fill={kind === 'temple' ? '#d6b25e' : '#9a3412'} opacity=".85" />
      </>;
    case 'stable':
      return <><path d="M0 195 Q200 180 400 195 V240 H0z" fill="#3f2a14" /><path d="M120 200 V120 L200 80 L280 120 V200z" fill="#8b5a2b" /><path d="M110 122 L200 74 L290 122" stroke="#5b3a1a" strokeWidth="8" fill="none" /><rect x="170" y="150" width="60" height="50" fill="#2a1a0c" /><path d="M175 182 h50 v10 h-50z" fill="#e8c26a" /></>;
    case 'garden':
      return <><path d="M0 185 Q200 160 400 185 V240 H0z" fill="#4caf50" />{[40, 330, 360].map((x, i) => <g key={x} className="sc-sway" style={{ animationDelay: `${i * -1.3}s`, transformOrigin: `${x}px 185px` }}><rect x={x - 4} y="130" width="8" height="55" fill="#6d4c2f" /><circle cx={x} cy="120" r="26" fill="#2e7d32" /><circle cx={x - 10} cy="115" r="5" fill="#ef5350" /><circle cx={x + 9} cy="126" r="5" fill="#ef5350" /></g>)}</>;
    case 'field':
      return <><path d="M0 170 Q120 140 240 165 T400 150 V240 H0z" fill="#9ccc65" /><path d="M0 200 Q200 175 400 200 V240 H0z" fill="#7cb342" />{[60, 110, 300].map((x) => <g key={x}><ellipse cx={x} cy="195" rx="14" ry="9" fill="#fff" /><circle cx={x + 12} cy="190" r="5" fill="#333" /></g>)}</>;
    case 'night':
      return <path d="M0 190 Q110 165 220 185 T400 178 V240 H0z" fill="#1e1b4b" />;
  }
}

function PropArt({ prop }: { prop: Prop }) {
  const P: Record<Prop, JSX.Element> = {
    ark: <g><path d="M-60 0 H60 L45 25 H-45z" fill="#8d5524" /><rect x="-35" y="-26" width="70" height="26" fill="#a0692f" /><path d="M-40 -26 L0 -48 L40 -26z" fill="#6d3f17" /></g>,
    star: <path className="sc-twinkle" d="M0 -40 L11 -12 L40 -10 L17 8 L25 38 L0 21 L-25 38 L-17 8 L-40 -10 L-11 -12z" fill="#ffe066" stroke="#fff3b0" strokeWidth="3" />,
    crown: <path d="M-40 20 V-12 L-20 6 L0 -24 L20 6 L40 -12 V20z" fill="#fbbf24" stroke="#b45309" strokeWidth="3" />,
    sling: <g><path d="M-30 -30 Q0 30 30 -30" stroke="#7c4a1e" strokeWidth="5" fill="none" /><circle cx="0" cy="8" r="9" fill="#9ca3af" /></g>,
    lion: <g><circle r="30" fill="#d97706" /><circle r="20" fill="#fbbf24" /><circle cx="-7" cy="-4" r="3" fill="#222" /><circle cx="7" cy="-4" r="3" fill="#222" /><path d="M-6 8 Q0 13 6 8" stroke="#222" strokeWidth="2.5" fill="none" /></g>,
    ladder: <g stroke="#e5d3a8" strokeWidth="5"><path d="M-18 40 L-8 -60 M18 40 L8 -60" />{[-40, -18, 4, 26].map((y) => <path key={y} d={`M${-16 + (y + 40) * 0.07} ${y} H${16 - (y + 40) * 0.07}`} />)}</g>,
    jar: <path d="M-18 -30 H18 V-22 Q30 -10 28 10 Q26 32 0 34 Q-26 32 -28 10 Q-30 -10 -18 -22z" fill="#c2774a" stroke="#8a4b26" strokeWidth="3" />,
    dove: <g className="sc-fly"><path d="M-30 0 Q-5 -25 20 -5 Q35 -12 40 -4 Q30 2 20 2 Q0 20 -30 0z" fill="#fff" stroke="#cbd5e1" strokeWidth="2" /><circle cx="28" cy="-6" r="2" fill="#333" /></g>,
    scroll: <g><rect x="-36" y="-22" width="72" height="44" rx="4" fill="#fdf0c9" stroke="#c9a85b" strokeWidth="3" /><rect x="-44" y="-26" width="10" height="52" rx="5" fill="#a16207" /><rect x="34" y="-26" width="10" height="52" rx="5" fill="#a16207" />{[-10, 0, 10].map((y) => <path key={y} d={`M-24 ${y} H24`} stroke="#c9a85b" strokeWidth="2" />)}</g>,
    fish: <g className="sc-swim"><path d="M-40 0 Q-10 -26 25 0 Q-10 26 -40 0z" fill="#38bdf8" /><path d="M25 0 L45 -16 V16z" fill="#0ea5e9" /><circle cx="-22" cy="-4" r="3" fill="#0b1340" /></g>,
    wall: <g fill="#b45309" stroke="#7c2d12" strokeWidth="2">{[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={-48 + c * 24 + (r % 2) * 12} y={-30 + r * 20} width="24" height="20" />))}</g>,
    cross: <g><rect x="-6" y="-50" width="12" height="90" fill="#7c4a1e" /><rect x="-32" y="-30" width="64" height="12" fill="#7c4a1e" /></g>,
    tomb: <g><path d="M-55 30 V-10 Q-55 -40 0 -40 Q55 -40 55 -10 V30z" fill="#a8a29e" /><circle cx="44" cy="12" r="24" fill="#78716c" className="sc-roll" /><path d="M-25 30 V0 Q-25 -15 0 -15 Q25 -15 25 0 V30z" fill="#fef3c7" className="sc-glow" /></g>,
    harp: <g><path d="M-28 34 V-34 Q20 -30 30 20 Z" fill="none" stroke="#d97706" strokeWidth="6" />{[-18, -8, 2, 12].map((x) => <path key={x} d={`M${x} ${-26 + (x + 28) * 0.4} V30`} stroke="#fde68a" strokeWidth="2" />)}</g>,
    sun: <g className="sc-spin"><circle r="26" fill="#ffd54f" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x="-3" y="-46" width="6" height="14" rx="3" fill="#ffca28" transform={`rotate(${i * 36})`} />)}</g>,
    boat: <g className="sc-bob"><path d="M-55 0 H55 L40 22 H-40z" fill="#8d5524" /><path d="M0 0 V-55 L35 -10 H0" fill="#fff" /><rect x="-2" y="-58" width="4" height="58" fill="#6d3f17" /></g>,
    gift: <g><rect x="-30" y="-14" width="60" height="44" rx="4" fill="#ef4444" /><rect x="-34" y="-24" width="68" height="14" rx="3" fill="#dc2626" /><rect x="-5" y="-24" width="10" height="54" fill="#fde047" /><path d="M0 -24 C-20 -50 -34 -30 0 -24 C34 -30 20 -50 0 -24" fill="#fde047" /></g>,
    lamp: <g><path d="M-30 10 Q0 30 30 10 Q30 -6 0 -4 Q-30 -6 -30 10z" fill="#d97706" /><path className="sc-flame" d="M24 -2 Q30 -22 36 -2 Q30 4 24 -2z" fill="#fbbf24" /></g>,
    tree: <g className="sc-sway" style={{ transformOrigin: '0 40px' }}><rect x="-5" y="-5" width="10" height="45" fill="#6d4c2f" />{[-60, -30, 0, 30, 60].map((r) => <path key={r} d="M0 -5 Q20 -30 48 -24" stroke="#16a34a" strokeWidth="8" fill="none" strokeLinecap="round" transform={`rotate(${r})`} />)}</g>,
    staff: <g><path d="M0 40 V-40 Q0 -55 14 -55 Q26 -55 26 -43" stroke="#7c4a1e" strokeWidth="7" fill="none" strokeLinecap="round" /></g>,
  };
  return P[prop];
}

/** A small, gently animated illustrated scene (pure SVG + CSS). */
export default function Scene({ kind, prop, page = 0 }: { kind: SceneKind; prop: Prop; page?: number }) {
  const [a, b] = SKY[kind];
  const night = NIGHT.includes(kind);
  const id = `sky-${kind}`;
  return (
    <svg className={`sc sc--${kind}`} viewBox="0 0 400 240" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="400" height="240" fill={`url(#${id})`} />
      {night ? (
        <g>{Array.from({ length: 26 }, (_, i) => <circle key={i} className="sc-star" style={{ animationDelay: `${(i * 0.37) % 3}s` }} cx={(i * 71) % 400} cy={(i * 37) % 120} r={(i % 3) * 0.6 + 0.8} fill="#fff" />)}<circle cx="330" cy="45" r="20" fill="#fef9c3" /><circle cx="338" cy="40" r="18" fill={a} /></g>
      ) : kind !== 'storm' ? (
        <g className="sc-clouds"><g className="sc-cloud"><ellipse cx="80" cy="50" rx="34" ry="12" fill="#fff" opacity=".9" /><ellipse cx="100" cy="42" rx="22" ry="12" fill="#fff" opacity=".9" /></g><g className="sc-cloud sc-cloud-2"><ellipse cx="290" cy="70" rx="40" ry="12" fill="#fff" opacity=".8" /><ellipse cx="310" cy="62" rx="24" ry="12" fill="#fff" opacity=".8" /></g></g>
      ) : (
        <g><g className="sc-clouds"><ellipse cx="120" cy="40" rx="90" ry="28" fill="#1f2937" /><ellipse cx="300" cy="50" rx="110" ry="30" fill="#111827" /></g><path className="sc-bolt" d="M230 60 L210 110 H228 L214 150 L250 95 H232 L246 60z" fill="#fde047" />{Array.from({ length: 30 }, (_, i) => <path key={i} className="sc-rain" style={{ animationDelay: `${(i * 0.13) % 1}s` }} d={`M${(i * 53) % 400} ${(i * 29) % 140} l-6 14`} stroke="#cbd5e1" strokeWidth="1.5" />)}</g>
      )}
      <Ground kind={kind} />
      <g className={`sc-prop sc-prop--${page}`} transform="translate(200 150)"><g className="sc-float"><PropArt prop={prop} /></g></g>
    </svg>
  );
}
