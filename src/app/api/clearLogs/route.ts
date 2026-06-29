import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();
    if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (hash !== process.env.ADM_HASH) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const { error } = await supabase.from('security_logs').delete().neq('id', 0);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}