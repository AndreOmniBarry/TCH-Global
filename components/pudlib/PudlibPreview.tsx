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
          <a href="/library" className="btn btn-primary">Open PUDLIB!</a>
        </div>
        <div className="pl-preview-grid pop">
          {preview.map((it) => (
            <a key={it.id} className={`pl-card${it.kind === 'book' ? ' pl-card--book' : ''}`} href={it.kind === 'book' ? '/library' : `/library?play=${encodeURIComponent(it.id)}`}>
              <span className={it.kind === 'book' ? 'pl-cover' : 'pl-thumb'}>
                <img src={it.image} alt="" loading="lazy" />
                {it.kind !== 'book' && <><i>{it.kind === 'audio' ? 'Audio' : 'Video'}</i><b className="pl-play" aria-hidden="true">▶</b></>}
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
