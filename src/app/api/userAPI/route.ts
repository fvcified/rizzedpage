import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  const userId = process.env.DISCORD_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'DISCORD_USER_ID not set' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Lanyard fetch failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
