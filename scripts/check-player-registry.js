#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

function exists(relative) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) errors.push(`Manca file: ${relative}`);
  return full;
}

const browserJs = [
  "registration-registry.js",
  "player-registry-account.js",
  "admin-registry.js",
  "admin-registry-actions.js",
  "admin-player.js",
  "admin-event-day.js",
  "admin-registry-import.js",
  "players-supabase.js",
  "camp-profile.js",
  "scripts/dedupe-camp-registrations.js",
  "scripts/build-player-registry-import.js"
];

browserJs.forEach(relative => {
  const full = exists(relative);
  if (!fs.existsSync(full)) return;
  const check = spawnSync(process.execPath, ["--check", full], { encoding: "utf8" });
  if (check.status !== 0) {
    errors.push(`Sintassi JS non valida: ${relative}\n${check.stderr || check.stdout}`);
  }
});

const migrations = [
  "supabase/migrations/20260807170000_player_registry.sql",
  "supabase/migrations/20260807171000_player_registry_admin.sql",
  "supabase/migrations/20260807172000_registry_identity_resolution.sql",
  "supabase/migrations/20260807173000_registry_parent_resolution.sql",
  "supabase/migrations/20260807174000_registry_account_linking.sql",
  "supabase/migrations/20260807175000_account_registry_history.sql",
  "supabase/migrations/20260807180000_event_day.sql",
  "supabase/migrations/20260807181000_player_card_batch.sql",
  "supabase/migrations/20260807182000_registry_documents.sql",
  "supabase/migrations/20260807183000_registry_privacy.sql"
];

migrations.forEach(relative => {
  const full = exists(relative);
  if (!fs.existsSync(full)) return;
  const sql = fs.readFileSync(full, "utf8");
  const dollarBlocks = (sql.match(/\$\$/g) || []).length;
  if (dollarBlocks % 2 !== 0) errors.push(`Blocco $$ non bilanciato: ${relative}`);
  if (!/^\s*(?:--[^\n]*\n\s*)*begin\s*;/i.test(sql)) warnings.push(`La migration non inizia con BEGIN: ${relative}`);
  if (!/commit\s*;\s*$/i.test(sql)) warnings.push(`La migration non termina con COMMIT: ${relative}`);
  if (/\bdrop\s+table\b/i.test(sql) || /\btruncate\b/i.test(sql)) {
    errors.push(`Operazione distruttiva vietata nella migration registry: ${relative}`);
  }
  if (/as\s+\$\$\s*;/i.test(sql)) errors.push(`Possibile errore sintattico "as $$;": ${relative}`);
});

const edgeFunctions = [
  "supabase/functions/register-camp/index.ts",
  "supabase/functions/admin-import-registry/index.ts"
];
edgeFunctions.forEach(relative => {
  const full = exists(relative);
  if (!fs.existsSync(full)) return;
  const source = fs.readFileSync(full, "utf8");
  if (!source.includes("Deno.serve")) errors.push(`Edge Function senza Deno.serve: ${relative}`);
  if (!source.includes("SUPABASE_SERVICE_ROLE_KEY")) errors.push(`Edge Function senza service role secret: ${relative}`);
});

const htmlFiles = [
  "account.html",
  "camp-register.html",
  "admin-registry.html",
  "admin-player.html",
  "admin-event-day.html",
  "admin-registry-import.html"
];
htmlFiles.forEach(relative => {
  const full = exists(relative);
  if (!fs.existsSync(full)) return;
  const html = fs.readFileSync(full, "utf8");
  const scripts = Array.from(html.matchAll(/<script\s+src=["']([^"']+)["']/gi)).map(match => match[1]);
  scripts.filter(src => !/^https?:\/\//i.test(src)).forEach(src => {
    const clean = src.split("?")[0].replace(/^\.\//, "");
    if (!fs.existsSync(path.join(root, clean))) errors.push(`${relative} riferisce script mancante: ${clean}`);
  });
});

const registrySql = fs.existsSync(path.join(root, migrations[0]))
  ? fs.readFileSync(path.join(root, migrations[0]), "utf8")
  : "";
[
  "create table if not exists public.players",
  "create table if not exists public.player_account_links",
  "create table if not exists public.program_events",
  "create table if not exists public.player_event_registrations",
  "unique (player_id, event_id)",
  "create table if not exists public.player_evaluations",
  "create table if not exists public.public_player_cards_v2",
  "create or replace function public.service_register_camp_submission"
].forEach(required => {
  if (registrySql && !registrySql.toLowerCase().includes(required.toLowerCase())) {
    errors.push(`Elemento registry obbligatorio assente: ${required}`);
  }
});

console.log("FIL-ITALIA Player Registry check");
console.log(`JS controllati: ${browserJs.length}`);
console.log(`Migration controllate: ${migrations.length}`);
console.log(`HTML controllati: ${htmlFiles.length}`);
if (warnings.length) {
  console.log("\nWarning:");
  warnings.forEach(item => console.log(`- ${item}`));
}
if (errors.length) {
  console.error("\nErrori:");
  errors.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log("\nOK: controlli strutturali superati.\n");
