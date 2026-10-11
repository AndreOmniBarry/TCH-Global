'use client';
import { useState } from 'react';
import { useClient } from 'sanity';
import { Box, Button, Card, Flex, Heading, Stack, Text, TextInput } from '@sanity/ui';

type Row = { file: File; title: string; status: 'ready' | 'uploading' | 'done' | 'error'; note?: string };

// "Song name_final (1).mp3" -> "Song Name Final"
const titleFrom = (name: string) =>
  name.replace(/\.[^.]+$/, '').replace(/\(\d+\)|PTT-\d+-WA\d+/gi, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Untitled message';

/** Studio tool: pick several audio files, upload them all as PUDLIB! Audio.
 * Runs with the signed-in editor's own session, straight to Sanity. */
export function BulkAudio() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [rows, setRows] = useState<Row[]>([]);
  const [series, setSeries] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function uploadAll() {
    setBusy(true);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.status === 'done') continue;
      set(i, { status: 'uploading', note: undefined });
      try {
        const asset = await client.assets.upload('file', row.file, { filename: row.file.name, contentType: row.file.type || 'audio/mpeg' });
        await client.create({
          _type: 'audioMessage',
          title: row.title.trim() || titleFrom(row.file.name),
          audioFile: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
          ...(series.trim() ? { series: series.trim() } : {}),
          publishedAt: new Date(row.file.lastModified || Date.now()).toISOString(),
        });
        set(i, { status: 'done' });
      } catch (e) {
        set(i, { status: 'error', note: (e as Error).message });
      }
    }
    setBusy(false);
  }

  const done = rows.filter((r) => r.status === 'done').length;
  return (
    <Box padding={5} style={{ maxWidth: 760, margin: '0 auto' }}>
      <Stack space={5}>
        <Heading size={3}>Bulk audio upload</Heading>
        <Text muted>Choose several audio files at once (MP3 or M4A). Each becomes a published PUDLIB! Audio. Edit titles here first; you can add covers, YouTube links and descriptions later under PUDLIB! Audio.</Text>
        <Card padding={4} radius={3} border tone="primary">
          <input type="file" accept="audio/*" multiple disabled={busy}
            onChange={(e) => setRows(Array.from(e.target.files ?? []).map((file) => ({ file, title: titleFrom(file.name), status: 'ready' })))} />
        </Card>
        {rows.length > 0 && (
          <Stack space={3}>
            <TextInput placeholder="Series for all (optional), e.g. Faith Series" value={series} onChange={(e) => setSeries(e.currentTarget.value)} disabled={busy} />
            {rows.map((r, i) => (
              <Card key={i} padding={3} radius={2} border tone={r.status === 'done' ? 'positive' : r.status === 'error' ? 'critical' : 'default'}>
                <Flex gap={3} align="center">
                  <Box flex={1}><TextInput value={r.title} onChange={(e) => set(i, { title: e.currentTarget.value })} disabled={busy || r.status === 'done'} /></Box>
                  <Text size={1} muted>{(r.file.size / 1048576).toFixed(1)} MB</Text>
                  <Text size={1}>{r.status === 'ready' ? 'Ready' : r.status === 'uploading' ? 'Uploading…' : r.status === 'done' ? 'Published' : 'Failed'}</Text>
                </Flex>
                {r.note && <Box marginTop={2}><Text size={1}>{r.note}</Text></Box>}
              </Card>
            ))}
            <Flex gap={3} align="center">
              <Button tone="primary" text={busy ? `Uploading ${done + 1} of ${rows.length}…` : done === rows.length ? 'All published' : `Upload and publish ${rows.length - done}`} disabled={busy || done === rows.length} onClick={uploadAll} />
              {done === rows.length && <Text muted>Done. They will show on PUDLIB! within seconds.</Text>}
            </Flex>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
