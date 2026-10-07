import MotionPlay from '@/components/MotionPlay';
import { getLibrary, pickPreview } from '@/lib/library';
import PudlibLogo from './PudlibLogo';

export default async function PudlibPreview() {
  const { items } = await getLibrary();
  const preview = pickPreview(items, 6);
  const counts = { video: 0, audio: 0, book: 0 };
  items.forEach((i) => { counts[i.kind] += 1; });

  return (
    <section className="section pop-stage pl-preview" id="library" data-title="PUDLIB!">
      <div className="container">
        <div className="pl-preview-head pop">
          <div>
            <PudlibLogo size={48} />
            <p>The Pastor Uzor Digital Library &mdash; {[counts.video && `${counts.video} messages`, counts.audio && `${counts.audio} audio`, counts.book && `${counts.book} books`].filter(Boolean).join(' · ')}, picked for you.</p>
          </div>
          <a href="/library" className="pud-btn">
            <span className="pud-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <circle className="pud-ring-bg" cx="18" cy="18" r="15" />
                <circle className="pud-ring" cx="18" cy="18" r="15" />
                <path className="pud-tri" d="M14.5 11.5v13l10.5-6.5z" />
              </svg>
            </span>
            <span className="pud-btn-label">Open PUDLIB!</span>
            <span className="pud-btn-bar" aria-hidden="true"><i /><b /></span>
          </a>
        </div>
        <div className="pl-preview-grid pop">
          {preview.map((it) => (
            <a key={it.id} className={`pl-card${it.kind === 'book' ? ' pl-card--book' : ''}`} href={it.kind === 'book' ? '/library' : `/library?play=${encodeURIComponent(it.id)}`}>
              <span className={it.kind === 'book' ? 'pl-cover' : 'pl-thumb'}>
                <img src={it.image} alt="" loading="lazy" />
                {it.kind !== 'book' && <><i>{it.kind === 'audio' ? 'Audio' : 'Video'}</i><span className="pl-play"><MotionPlay size={40} /></span></>}
              </span>
              <span className="pl-title">{it.title}</span>
              <span className="pl-sub">{it.kind === 'book' ? 'Book · order a copy' : it.series ?? (it.kind === 'audio' ? 'Audio message' : 'Message')}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
