const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// PostgREST auto-reloads on schema changes, but sometimes needs a nudge.
// We can try touching a table to trigger it.
(async () => {
  // Reload via PostgREST's internal channel
  await sb.rpc('exec_sql', { sql: "NOTIFY pgrst, 'reload schema'" })
    .then(r => console.log('Reload attempt 1:', r.error || 'ok'))
    .catch(e => console.log('Reload attempt 1 failed:', e.message));

  // Alternative: use the management API internal endpoint
  await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/',
    {
      method: 'HEAD',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Accept-Profile': 'public',
        'Content-Profile': 'public',
      }
    }
  ).then(r => console.log('Reload attempt 2 (HEAD):', r.status));
})();
