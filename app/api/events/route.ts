import { NextRequest, NextResponse } from 'next/server';
import { writeClient, passwordOk } from '@/lib/sanity-write';

export const dynamic = 'force-dynamic';

function guard(req: NextRequest) {
  if (!writeClient) {
    return NextResponse.json({ error: 'Event publishing is not connected yet (needs SANITY_API_WRITE_TOKEN and the Sanity project ID).' }, { status: 503 });
  }
  if (!passwordOk(req.headers.get('x-write-password'))) {
    return NextResponse.json({ error: 'Wrong publishing password.' }, { status: 401 });
  }
  return null;
}

// Events that haven't ended yet.
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const events = await writeClient!.fetch(
    `*[_type == "event" && coalesce(endsAt, startsAt) > now()] | order(startsAt asc) { _id, title, startsAt, endsAt, location }`
  );
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const { title, description, startsAt, endsAt, location, link, flyerUrl } = await req.json();
    if (typeof title !== 'string' || !title.trim()) return NextResponse.json({ error: 'Give the event a name.' }, { status: 400 });
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Pick a start date and time.' }, { status: 400 });
    let end: Date | undefined;
    if (endsAt) {
      end = new Date(endsAt);
      if (Number.isNaN(end.getTime()) || end <= start) return NextResponse.json({ error: 'The end time must be after the start.' }, { status: 400 });
    }
    const url = (v: unknown) => (typeof v === 'string' && /^https?:\/\//.test(v.trim()) ? v.trim() : undefined);
    const doc = await writeClient!.create({
      _type: 'event',
      title: title.trim().slice(0, 140),
      description: typeof description === 'string' && description.trim() ? description.trim().slice(0, 600) : undefined,
      startsAt: start.toISOString(),
      endsAt: end?.toISOString(),
      location: typeof location === 'string' && location.trim() ? location.trim().slice(0, 140) : undefined,
      link: url(link),
      flyerUrl: url(flyerUrl),
    });
    return NextResponse.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('event create failed', err);
    return NextResponse.json({ error: 'Could not save the event. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  const doc = await writeClient!.fetch(`*[_id == $id && _type == "event"][0]{ _id }`, { id });
  if (!doc) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  await writeClient!.delete(id);
  return NextResponse.json({ ok: true });
}
