import { NextRequest, NextResponse } from 'next/server';
import { submitForm, FormType } from '@/lib/forms';

const REQUIRED_FIELDS: Record<FormType, string[]> = {
  volunteer: ['name', 'email', 'team'],
  prayer: ['message'],
  join: ['name', 'email'],
  give: ['name', 'email'],
  testimony: ['name', 'quote'],
  newsletter: ['email'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isFormType(value: unknown): value is FormType {
  return typeof value === 'string' && value in REQUIRED_FIELDS;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, fields, website } = body || {};

    // Honeypot: a hidden field real visitors never see or fill. A bot
    // that fills every field trips it — reply success so it doesn't
    // learn anything, but don't store the submission.
    if (typeof website === 'string' && website.trim()) {
      return NextResponse.json({ ok: true });
    }

    if (!isFormType(type)) {
      return NextResponse.json({ error: 'Unknown form type.' }, { status: 400 });
    }

    const cleanFields: Record<string, string> = {};
    if (fields && typeof fields === 'object') {
      for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') cleanFields[key] = value.trim().slice(0, 4000);
      }
    }

    for (const required of REQUIRED_FIELDS[type]) {
      if (!cleanFields[required]) {
        return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
      }
    }

    if (cleanFields.email && !EMAIL_RE.test(cleanFields.email)) {
      return NextResponse.json({ error: 'That email address doesn’t look right — please check it.' }, { status: 400 });
    }

    const result = await submitForm(type, cleanFields);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Could not save your submission right now.' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
