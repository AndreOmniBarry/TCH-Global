// Media-control icons for PUDLIB! (24px grid, currentColor).
type P = { size?: number };
const base = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const });

export const IconPlay = ({ size }: P) => <svg {...base(size)} fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>;
export const IconPause = ({ size }: P) => <svg {...base(size)} fill="currentColor"><rect x="6" y="5" width="4.2" height="14" rx="1.2" /><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" /></svg>;
export const IconBack = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui">10</text>
  </svg>
);
export const IconForward = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4h-4" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" fontFamily="system-ui">10</text>
  </svg>
);
export const IconVolume = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
export const IconMute = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></svg>;
export const IconFull = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
export const IconMinimize = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" /></svg>;
export const IconExpand = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>;
export const IconClose = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IconNext = ({ size }: P) => <svg {...base(size)} fill="currentColor"><path d="M6 5.5v13a1 1 0 0 0 1.5.86L16 14V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4L7.5 4.64A1 1 0 0 0 6 5.5z" /></svg>;
export const IconHistory = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4h4M12 8v4.5l3 2" /></svg>;
export const IconBook = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /></svg>;
export const IconAudio = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3.5" y="13" width="4" height="7" rx="1.5" fill="currentColor" /><rect x="16.5" y="13" width="4" height="7" rx="1.5" fill="currentColor" /></svg>;
export const IconVideo = ({ size }: P) => <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10.5l5-3v9l-5-3z" fill="currentColor" /></svg>;
