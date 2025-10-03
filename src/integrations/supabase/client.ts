import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// TEMP DEBUG: verify env is loaded at runtime
// Remove after confirming correct values show in the browser console
// eslint-disable-next-line no-console
console.log('SUPABASE_URL =>', supabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
