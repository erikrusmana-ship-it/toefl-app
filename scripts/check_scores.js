const fs = require('fs');
const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
env.split(/\n/).filter(Boolean).forEach((l) => {
  const idx = l.indexOf('=');
  if (idx > 0) process.env[l.slice(0, idx)] = l.slice(idx + 1);
});
const { createClient } = require('@supabase/supabase-js');
const sup = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  try {
    const { data, error } = await sup.from('test_scores').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) { console.error('ERROR', error); process.exit(2); }
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('EXCEPTION', e);
    process.exit(2);
  }
})();
