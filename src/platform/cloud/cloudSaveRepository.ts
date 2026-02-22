import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseClient, isCloudSaveEnabled } from '@platform/cloud/supabaseClient'

export interface CloudSaveUser {
  id: string
  email: string | null
}

export interface CloudSaveRecord {
  id: string
  name: string
  payload: unknown
  createdAt: string
  updatedAt: string
  lastPlayedAt: string | null
}

interface SaveSlotRow {
  id: string
  user_id: string
  name: string
  payload: unknown
  version: number
  created_at: string
  updated_at: string
  last_played_at: string | null
}

const PRIMARY_SAVE_NAME = 'Primary Save'

function assertCloudClientEnabled() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Cloud saves are disabled or missing Supabase configuration.')
  }

  return client
}

function mapSaveSlotRow(row: SaveSlotRow): CloudSaveRecord {
  return {
    id: row.id,
    name: row.name,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastPlayedAt: row.last_played_at,
  }
}

function mapAuthSession(session: Session | null): CloudSaveUser | null {
  const user = session?.user
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? null,
  }
}

async function getRequiredCloudUser(): Promise<CloudSaveUser> {
  const user = await getCloudSaveUser()
  if (!user) {
    throw new Error('Sign in is required before using cloud saves.')
  }

  return user
}

async function deleteExtraSaveRows(clientUserId: string, keepId: string): Promise<void> {
  const client = assertCloudClientEnabled()

  const { data, error } = await client
    .from('save_slots')
    .select('id')
    .eq('user_id', clientUserId)
    .neq('id', keepId)

  if (error || !Array.isArray(data) || data.length === 0) {
    return
  }

  const extraIds = data
    .map((row) => row.id)
    .filter((rowId): rowId is string => typeof rowId === 'string')
  if (extraIds.length === 0) {
    return
  }

  await client
    .from('save_slots')
    .delete()
    .eq('user_id', clientUserId)
    .in('id', extraIds)
}

export function isCloudRepositoryEnabled(): boolean {
  return isCloudSaveEnabled()
}

export async function getCloudSaveUser(): Promise<CloudSaveUser | null> {
  const client = getSupabaseClient()
  if (!client) {
    return null
  }

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    return null
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  }
}

export function subscribeCloudSaveAuth(
  onAuth: (authState: { event: AuthChangeEvent; user: CloudSaveUser | null }) => void,
): () => void {
  const client = getSupabaseClient()
  if (!client) {
    return () => {}
  }

  const { data } = client.auth.onAuthStateChange((event, session) => {
    onAuth({
      event,
      user: mapAuthSession(session),
    })
  })

  return () => {
    data.subscription.unsubscribe()
  }
}

export async function sendCloudMagicLink(email: string): Promise<void> {
  const client = assertCloudClientEnabled()
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Enter an email address.')
  }

  const emailRedirectTo = typeof window === 'undefined'
    ? undefined
    : `${window.location.origin}${window.location.pathname}`
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function signOutCloudSave(): Promise<void> {
  const client = assertCloudClientEnabled()
  const { error } = await client.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export async function getPrimaryCloudSave(): Promise<CloudSaveRecord | null> {
  const client = assertCloudClientEnabled()
  const user = await getRequiredCloudUser()

  const { data, error } = await client
    .from('save_slots')
    .select('id,user_id,name,payload,version,created_at,updated_at,last_played_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as SaveSlotRow[]
  const mapped = rows.map((row) => mapSaveSlotRow(row))
  if (mapped.length === 0) {
    return null
  }

  const primary = mapped[0]
  await deleteExtraSaveRows(user.id, primary.id)
  return primary
}

export async function savePrimaryCloudSave(payload: unknown): Promise<CloudSaveRecord> {
  const client = assertCloudClientEnabled()
  const user = await getRequiredCloudUser()

  const existing = await getPrimaryCloudSave()
  const nowIso = new Date().toISOString()
  if (!existing) {
    const { data, error } = await client
      .from('save_slots')
      .insert({
        user_id: user.id,
        name: PRIMARY_SAVE_NAME,
        payload,
        version: 1,
        created_at: nowIso,
        updated_at: nowIso,
        last_played_at: nowIso,
      })
      .select('id,user_id,name,payload,version,created_at,updated_at,last_played_at')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Unable to create cloud save.')
    }

    return mapSaveSlotRow(data as SaveSlotRow)
  }

  const { data, error } = await client
    .from('save_slots')
    .update({
      name: PRIMARY_SAVE_NAME,
      payload,
      version: 1,
      updated_at: nowIso,
      last_played_at: nowIso,
    })
    .eq('id', existing.id)
    .eq('user_id', user.id)
    .select('id,user_id,name,payload,version,created_at,updated_at,last_played_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update cloud save.')
  }

  const mapped = mapSaveSlotRow(data as SaveSlotRow)
  await deleteExtraSaveRows(user.id, mapped.id)
  return mapped
}
