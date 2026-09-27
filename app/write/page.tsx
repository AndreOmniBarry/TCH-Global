import Script from 'next/script';
import ComposeEditor from '@/components/ComposeEditor';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

export const metadata = { title: 'Write | The Comforters Blog' };

export default function WritePage() {
  return (
    <>
      <SiteHeader />
      <ComposeEditor />
      <SiteFooter />
      <Script src="/js/blog.js" strategy="afterInteractive" />
    </>
  );
}
