import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key && !key.startsWith('replace-'));
export const client = configured ? createClient(url, key, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
export function db() { if (!client) throw new Error('请配置 Supabase 公开密钥后重启开发服务器。'); return client; }

