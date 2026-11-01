import Script from 'next/script';
import { asset } from '@/lib/asset-version';
import ComposeEditor from '@/components/ComposeEditor';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

export const metadata = { title: 'Write | The Comforters Blog', robots: { index: false } };

export default function WritePage() {
  return (
    <>
      <SiteHeader />
      <ComposeEditor />
      <SiteFooter />
      <Script src={asset("/js/blog.js")} strategy="afterInteractive" />
    </>
  );
}
