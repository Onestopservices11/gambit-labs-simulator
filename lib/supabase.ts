import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// Single-row ID — we store the whole simulator state as one row
export const STATE_ROW_ID = '00000000-0000-0000-0000-000000000001';
