import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type CloudConfigState = 'disabled' | 'missing-config' | 'ready'

let cachedClient: SupabaseClient | null = null

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function readCloudConfigState(): CloudConfigState {
  const featureEnabled = import.meta.env.VITE_ENABLE_CLOUD_SAVES === 'true'
  if (!featureEnabled) {
    return 'disabled'
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!hasValue(supabaseUrl) || !hasValue(supabaseAnonKey)) {
    return 'missing-config'
  }

  return 'ready'
}

export function getCloudConfigState(): CloudConfigState {
  return readCloudConfigState()
}

export function isCloudSaveEnabled(): boolean {
  return readCloudConfigState() === 'ready'
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isCloudSaveEnabled()) {
    return null
  }

  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!hasValue(supabaseUrl) || !hasValue(supabaseAnonKey)) {
    return null
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return cachedClient
}
