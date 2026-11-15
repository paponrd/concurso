import { evento as cfg } from '../config/evento.js'

if (new URLSearchParams(location.search).has('demo')) sessionStorage.setItem('demo', '1')
const demo = !cfg.supabaseUrl || sessionStorage.getItem('demo')

export const datos = await import(demo ? './datos-demo.js' : './datos-supabase.js')
