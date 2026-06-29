import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.hash || typeof body.hash !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    if (!/^[a-f0-9]{64}$/.test(body.hash)) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    if (!process.env.ADM_HASH) {
      console.error('ADM_HASH not set in environment');
      return NextResponse.json({ valid: false }, { status: 500 });
    }

    const valid = body.hash === process.env.ADM_HASH;
    return NextResponse.json({ valid });

  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}