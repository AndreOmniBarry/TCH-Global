import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import PudlibApp from '@/components/pudlib/PudlibApp';
import { getLibrary } from '@/lib/library';

export const metadata = {
  title: 'PUDLIB! | Pastor Uzor Digital Library',
  description: 'Messages, audio and books from Pastor Uzor Echiejile — the Pastor Uzor Digital Library.',
};

export const revalidate = 600;

export default async function LibraryPage({ searchParams }: { searchParams: { play?: string } }) {
  const { items, videosConnected } = await getLibrary();
  return (
    <>
      <SiteHeader />
      <main className="section pl-page">
        <div className="container">
          <PudlibApp items={items} videosConnected={videosConnected} initialPlay={searchParams.play} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
