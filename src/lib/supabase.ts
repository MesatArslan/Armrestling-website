import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 [supabase] Supabase URL:', supabaseUrl)
console.log('🔧 [supabase] Supabase Key exists:', !!supabaseAnonKey)
console.log('🔧 [supabase] Supabase Key length:', supabaseAnonKey?.length || 0)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [supabase] Missing Supabase environment variables:', { 
    supabaseUrl: !!supabaseUrl, 
    supabaseAnonKey: !!supabaseAnonKey 
  })
  throw new Error('Missing Supabase environment variables')
}

console.log('🔧 [supabase] Creating Supabase client...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

console.log('✅ [supabase] Supabase client created successfully')

