// The /write editor's lightweight markup -> HTML. Shared by the editor's
// live preview and the server-side publish route, which stores the HTML
// on the post. All text is escaped first, so author input can never
// inject markup beyond these tags.

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeUrl(url: string) {
  const u = url.trim();
  return /^(https?:\/\/|\/)/i.test(u) ? esc(u) : '';
}

export function markdownToHtml(source: string): string {
  const blocks = source.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const inline = (raw: string) =>
    esc(raw)
      .replace(/\[\[bible:([^\]]+)\]\]/g, (_m, ref) => `<span class="bible-ref" data-ref="${ref}">${ref}</span>`)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  return blocks
    .map((block) => {
      const img = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) {
        const src = safeUrl(img[2]);
        return src ? `<figure class="post-image"><img src="${src}" alt="${esc(img[1])}" loading="lazy"></figure>` : '';
      }
      if (block.startsWith('### ')) return `<h3>${inline(block.slice(4))}</h3>`;
      if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
      if (block.startsWith('> ')) return `<blockquote class="pull-quote">${inline(block.slice(2))}</blockquote>`;
      return `<p>${inline(block)}</p>`;
    })
    .join('\n');
}

export function plainText(source: string) {
  return source
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[\[bible:([^\]]+)\]\]/g, '$1')
    .replace(/[#>*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
