const fs = require('fs');

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing role file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function requireFragments(file, fragments) {
  const text = read(file);
  const missing = fragments.filter(fragment => !text.includes(fragment));
  if (missing.length) throw new Error(`${file} is missing: ${missing.join(' | ')}`);
  return text;
}

requireFragments('supabase/migrations/20260728090000_filitalia_admin_complete.sql', [
  "'admin','super_admin'",
  "role = 'super_admin'",
  'create or replace function public.is_active_super_admin()'
]);

requireFragments('supabase/migrations/20260729083000_volunteer_role.sql', [
  "'volunteer'",
  "array['role','requested_role']",
  'profiles_%I_check'
]);

requireFragments('supabase/functions/admin-update-account-status/index.ts', [
  '"volunteer"',
  '"admin", "super_admin"',
  'SUPER_ADMIN_REQUIRED',
  'CANNOT_REMOVE_LAST_SUPER_ADMIN'
]);

requireFragments('supabase/functions/admin-invite-user/index.ts', [
  '"volunteer"',
  'requested_role: role'
]);

requireFragments('unified-access-v1.js', [
  'new Set(["admin", "super_admin"])',
  'profile.status === ACTIVE_STATUS'
]);

const compatibility = requireFragments('auth-super-admin-compat-v1.js', [
  'role: "admin"',
  'actual_role: "super_admin"',
  'profile.role !== "super_admin"',
  'managedProfiles.filter',
  'option.value = "super_admin"',
  'SUPER_ADMIN_REQUIRED',
  'CANNOT_REMOVE_LAST_SUPER_ADMIN'
]);

const account = read('account.html');
const compatibilityPosition = account.indexOf('auth-super-admin-compat-v1.js');
const accountUiPosition = account.indexOf('auth-pages.js');
if (compatibilityPosition < 0 || accountUiPosition < 0 || compatibilityPosition > accountUiPosition) {
  throw new Error('Super Admin compatibility must load before auth-pages.js');
}
if (!account.includes('data-role-section="player,parent,coach,coordinator,staff,volunteer,admin,super_admin"')) {
  throw new Error('Account role sections do not include volunteer and super_admin');
}
if (!account.includes('data-role-section="volunteer"')) {
  throw new Error('Volunteer workspace is missing from account.html');
}
if (!account.includes('volunteer-role-v1.js')) {
  throw new Error('Volunteer UI compatibility script is missing from account.html');
}

const login = read('login.html');
if (!login.includes('<option value="volunteer">Volontario</option>')) {
  throw new Error('Volunteer role is missing from signup');
}

const temporaryWorkflows = [
  '.github/workflows/temporary-fix-email-page.yml',
  '.github/workflows/temporary-role-consistency.yml'
].filter(fs.existsSync);
if (temporaryWorkflows.length) {
  throw new Error(`Temporary workflows still present: ${temporaryWorkflows.join(', ')}`);
}

if (!compatibility.includes('if (!isSuperAdmin(caller))')) {
  throw new Error('Ordinary Admin accounts are not protected from Super Admin records');
}

console.log('Role consistency audit passed: Admin, Super Admin and Volunteer roles are aligned and protected.');
