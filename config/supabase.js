// ─────────────────────────────────────────────────────────────
// backend/config/supabase.js
//
// Initialises and exports the Supabase client using the
// SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security (RLS)
// when inserting payments or updating order statuses.
// ─────────────────────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');

let _supabaseInstance = null;

/**
 * getSupabase()
 * Returns the initialized Supabase client.
 * Throws a clear error if credentials are missing in the environment.
 */
const getSupabase = () => {
  if (_supabaseInstance) return _supabaseInstance;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase URL or Service Role Key is missing!\n' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Render environment variables.'
    );
  }

  // Initialise Supabase client with service role key (RLS bypass)
  _supabaseInstance = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return _supabaseInstance;
};

module.exports = getSupabase;
