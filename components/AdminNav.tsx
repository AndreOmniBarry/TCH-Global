const LINKS = [['/admin/status', 'System status'], ['/admin/spotlight', 'Hero spotlight'], ['/admin/submissions', 'Submissions & members'], ['/admin/analytics', 'Analytics'], ['/write', 'Write & events']];
export default function AdminNav({ current }: { current: string }) {
  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map(([href, label]) => <a key={href} href={href} aria-current={href === current ? 'page' : undefined}>{label}</a>)}
    </nav>
  );
}
