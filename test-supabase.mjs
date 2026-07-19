import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szqzeemimmafkopwqqfp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXplZW1pbW1hZmtvcHdxcWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEzMDc3OSwiZXhwIjoyMDk5NzA2Nzc5fQ.tpGh8dWCxutllyjkW10Cpek031Kd6qShEYNfUuNDcKY';

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. List all tables
const { data: tables } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public')
  .order('table_name');

console.log('\n=== TABLES IN SUPABASE ===');
if (tables && tables.length > 0) {
  tables.forEach(t => console.log('  ' + t.table_name));
} else {
  console.log('  No tables found or query failed');
}

// 2. Check row counts for key tables
const keyTables = ['users', 'doctor_profiles', 'lab_profiles', 'medications',
  'reminders', 'appointments', 'lab_bookings', 'prescriptions',
  'health_journals', 'health_scores', 'chat_messages', 'notifications',
  'families', 'family_members', 'consultation_notes', 'chronic_conditions',
  'payments', 'complaints', 'emergency_alerts'];

console.log('\n=== TABLE ROW COUNTS ===');
for (const tbl of keyTables) {
  try {
    const { count } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
    console.log(`  ${tbl}: ${count ?? 0} rows`);
  } catch (e) {
    console.log(`  ${tbl}: ERROR - ${e.message}`);
  }
}

// 3. Check columns for users table
console.log('\n=== USERS TABLE COLUMNS ===');
const { data: userCols } = await supabase
  .from('information_schema.columns')
  .select('column_name, data_type')
  .eq('table_schema', 'public')
  .eq('table_name', 'users')
  .order('ordinal_position');
if (userCols) {
  userCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
}

// 4. Check columns for medications table
console.log('\n=== MEDICATIONS TABLE COLUMNS ===');
const { data: medCols } = await supabase
  .from('information_schema.columns')
  .select('column_name, data_type')
  .eq('table_schema', 'public')
  .eq('table_name', 'medications')
  .order('ordinal_position');
if (medCols) {
  medCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
}

// 5. Try a real query to confirm connection
console.log('\n=== CONNECTION TEST ===');
const { data: testData, error: testError } = await supabase
  .from('users')
  .select('id, email, role')
  .limit(5);
if (testError) {
  console.log('  Query error:', testError.message);
} else {
  console.log('  Query succeeded. Rows:', testData?.length ?? 0);
  if (testData && testData.length > 0) {
    testData.forEach((u) => console.log(`    ${u.email} (${u.role})`));
  }
}
