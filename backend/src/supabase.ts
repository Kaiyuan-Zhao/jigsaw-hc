import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './config.js'

let client: SupabaseClient | null | undefined

export function getSupabase(): SupabaseClient | null {
	if (client !== undefined) return client
	const url = SUPABASE_URL.trim()
	const key = SUPABASE_SERVICE_ROLE_KEY.trim()
	if (!url || !key) {
		client = null
		return client
	}
	client = createClient(url, key, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	})
	return client
}
