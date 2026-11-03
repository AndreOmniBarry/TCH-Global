// The six explorer buddies: simple, friendly, drawn in SVG.
export const BUDDIES = ['lion', 'lamb', 'dove', 'fish', 'bear', 'owl'] as const;
export type BuddyName = (typeof BUDDIES)[number];
export const BUDDY_LABEL: Record<BuddyName, string> = { lion: 'Lion', lamb: 'Lamb', dove: 'Dove', fish: 'Fish', bear: 'Bear', owl: 'Owl' };
const BG: Record<BuddyName, string> = { lion: '#ffd166', lamb: '#ffe4f1', dove: '#bfe9ff', fish: '#c9f7e4', bear: '#f3d9c4', owl: '#e3dbff' };

export default function Buddy({ name, size = 44 }: { name?: string; size?: number }) {
  const b = (BUDDIES as readonly string[]).includes(name || '') ? (name as BuddyName) : 'lion';
  const eyes = (y = 24, gap = 6, r = 1.9) => <><circle cx={24 - gap} cy={y} r={r} fill="#1a1530" /><circle cx={24 + gap} cy={y} r={r} fill="#1a1530" /></>;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill={BG[b]} />
      {b === 'lion' && <>
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={24 + Math.cos(a) * 12.5} cy={25 + Math.sin(a) * 12.5} r="5.2" fill="#f08a24" />; })}
        <circle cx="24" cy="25" r="11" fill="#ffc94d" />{eyes(23, 4.5)}
        <path d="M21.5 28.5h5l-2.5 2.2z" fill="#7a3b10" /><path d="M24 30.7v1.6M24 32.3c-1.2 1-2.6 1-3.4.2M24 32.3c1.2 1 2.6 1 3.4.2" stroke="#7a3b10" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>}
      {b === 'lamb' && <>
        {[[15, 17], [24, 13], [33, 17], [12, 26], [36, 26], [16, 34], [32, 34], [24, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#fff" />)}
        <ellipse cx="14" cy="24" rx="4" ry="2.4" fill="#4a3b3b" transform="rotate(-20 14 24)" /><ellipse cx="34" cy="24" rx="4" ry="2.4" fill="#4a3b3b" transform="rotate(20 34 24)" />
        <ellipse cx="24" cy="26" rx="8" ry="9" fill="#4a3b3b" /><circle cx="21" cy="24.5" r="1.7" fill="#fff" /><circle cx="27" cy="24.5" r="1.7" fill="#fff" />
        <path d="M22 30c1.2 1 2.8 1 4 0" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>}
      {b === 'dove' && <>
        <path d="M10 27c6-1 9-6 14-6 4 0 6 2 8 5l6-1-4 4c-1 5-6 8-12 8-6 0-10-4-12-10z" fill="#fff" />
        <path d="M18 26c3-7 9-11 16-11-2 5-6 9-12 11z" fill="#fff" stroke="#9cc9e8" strokeWidth=".8" />
        <circle cx="30" cy="25" r="1.6" fill="#1a1530" /><path d="M35 26l4 1.2-4 1z" fill="#ffb020" />
        <path d="M37 30c2 1 3 3 2 5" stroke="#4caf50" strokeWidth="1.4" fill="none" strokeLinecap="round" /><ellipse cx="39.5" cy="34" rx="2" ry="1.1" fill="#4caf50" />
      </>}
      {b === 'fish' && <>
        <path d="M9 24c5-8 15-10 23-4l6-5v18l-6-5c-8 6-18 4-23-4z" fill="#3d7bff" />
        <path d="M18 18c2 4 2 8 0 12" stroke="#7ea9ff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="14" cy="22.5" r="2.3" fill="#fff" /><circle cx="14.3" cy="22.6" r="1.2" fill="#1a1530" />
        <circle cx="38" cy="12" r="1.6" fill="#fff" /><circle cx="41" cy="8.5" r="1.1" fill="#fff" />
      </>}
      {b === 'bear' && <>
        <circle cx="13.5" cy="14" r="5.5" fill="#a0673b" /><circle cx="34.5" cy="14" r="5.5" fill="#a0673b" />
        <circle cx="13.5" cy="14" r="2.6" fill="#e2b48c" /><circle cx="34.5" cy="14" r="2.6" fill="#e2b48c" />
        <circle cx="24" cy="26" r="13" fill="#a0673b" />{eyes(23, 5)}
        <ellipse cx="24" cy="30" rx="5.5" ry="4.2" fill="#e2b48c" /><ellipse cx="24" cy="28.4" rx="2.1" ry="1.5" fill="#3b2412" />
      </>}
      {b === 'owl' && <>
        <path d="M11 15l5 4M37 15l-5 4" stroke="#6d4fd8" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="24" cy="27" rx="13" ry="14" fill="#8b6cf0" /><ellipse cx="24" cy="31" rx="7.5" ry="8" fill="#d8ccff" />
        <circle cx="18.5" cy="22.5" r="5" fill="#fff" /><circle cx="29.5" cy="22.5" r="5" fill="#fff" />
        <circle cx="18.5" cy="22.8" r="2.2" fill="#1a1530" /><circle cx="29.5" cy="22.8" r="2.2" fill="#1a1530" />
        <path d="M22.5 26.5h3L24 29z" fill="#ffb020" />
      </>}
    </svg>
  );
}
