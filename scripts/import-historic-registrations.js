#!/usr/bin/env node
"use strict";

/*
  Import storico DATI FIL-ITALIA -> public.registrations.

  Uso:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      node scripts/import-historic-registrations.js path/to/export.json

  Il file JSON deve avere questa forma:
    {
      "CAMPS": [{ "...header...": "...value..." }],
      "Venezia": [{ "...header...": "...value..." }],
      "Bologna": [],
      "FIRENZE": [],
      "ROMA": [],
      "MILANO": []
    }

  Lo script non importa foto base64: le sostituisce con metadati sicuri.
*/

const fs = require("fs");

const CITY_TABS = new Set(["CAMPS", "Venezia", "Bologna", "FIRENZE", "ROMA", "MILANO"]);

function clean(value, maxLength) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength || 5000);
}

function lower(value) {
  return clean(value, 254).toLowerCase();
}

function pick(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name) && clean(row[name], 5000)) return row[name];
  }
  return "";
}

function bool(value) {
  const text = clean(value, 20).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return text === "yes" || text === "si" || text === "true" || text === "1";
}

function uuid(value) {
  const text = clean(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function parseDate(value) {
  const text = clean(value, 80);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return [match[3], match[2].padStart(2, "0"), match[1].padStart(2, "0")].join("-");
}

function cityFrom(tab, value) {
  const text = clean(value || tab, 120).toLowerCase();
  if (text.includes("roma")) return "Roma";
  if (text.includes("milano")) return "Milano";
  if (text.includes("firenze") || text.includes("florence")) return "Firenze";
  if (text.includes("venezia") || text.includes("venice")) return "Venezia";
  if (text.includes("bologna")) return "Bologna";
  return clean(value || tab, 120) || null;
}

function eventId(city) {
  const c = cityFrom("", city);
  if (c === "Roma") return "idcamp-roma-2026";
  if (c === "Firenze") return "idcamp-firenze-2026";
  if (c === "Venezia") return "idcamp-venezia-2026";
  if (c === "Milano") return "idcamp-milano-2026";
  if (c === "Bologna") return "idcamp-bologna-2026";
  return null;
}

function paymentStatus(value) {
  const text = clean(value, 60).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!text) return "pending";
  if (text.includes("pagato") || text === "paid") return "paid";
  if (text.includes("verific")) return "to_verify";
  if (text.includes("gratis") || text.includes("gratuit") || text.includes("non richiesto")) return "not_required";
  if (text.includes("rimbors")) return "refunded";
  if (text.includes("waived")) return "waived";
  return "pending";
}

function safePhoto(value) {
  const text = clean(value, 500);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return { url: text };
  if (text.includes("base64=") || text.length > 500) return { stored: false, originalType: "inline_image" };
  return { value: text };
}

function participantName(row) {
  return [
    pick(row, ["Nome Giocatore", "Nome"]),
    pick(row, ["Cognome Giocatore", "Cognome"])
  ].map(value => clean(value, 100)).filter(Boolean).join(" ");
}

function normalizeRow(tab, row, index) {
  const name = participantName(row);
  if (!name) return null;

  const city = cityFrom(tab, pick(row, ["Camp City"]));
  const playerEmail = lower(pick(row, ["Email Giocatore", "Email"]));
  const guardianEmail = lower(pick(row, ["Email Genitore"]));
  const verifiedAccountId = uuid(pick(row, ["Verified Account ID", "Account ID"]));
  const submissionId = uuid(pick(row, ["Submission ID"])) || uuid(pick(row, ["submissionId"]));
  const original = Object.assign({}, row);
  const photo = safePhoto(pick(row, ["Foto Giocatore"]));
  if (photo) original["Foto Giocatore"] = photo;

  return {
    submission_id: submissionId || undefined,
    account_id: verifiedAccountId,
    player_id: verifiedAccountId,
    registration_type: "camp",
    source: "sheet_import",
    source_page: "DATI FIL-ITALIA/" + tab,
    camp_event_id: eventId(city),
    event_name: clean(pick(row, ["Camp Name"]), 240) || "Talent ID Camp " + city,
    event_city: city,
    event_date: clean(pick(row, ["Camp Date"]), 80) || null,
    participant_first_name: clean(pick(row, ["Nome Giocatore", "Nome"]), 100) || null,
    participant_last_name: clean(pick(row, ["Cognome Giocatore", "Cognome"]), 100) || null,
    participant_name: name,
    participant_email: playerEmail || guardianEmail || null,
    participant_phone: clean(pick(row, ["Telefono Giocatore", "Telefono"]), 80) || null,
    guardian_first_name: clean(pick(row, ["Nome Genitore"]), 100) || null,
    guardian_last_name: clean(pick(row, ["Cognome Genitore"]), 100) || null,
    guardian_name: [pick(row, ["Nome Genitore"]), pick(row, ["Cognome Genitore"])].map(v => clean(v, 100)).filter(Boolean).join(" ") || null,
    guardian_email: guardianEmail || null,
    guardian_phone: clean(pick(row, ["Telefono Genitore"]), 80) || null,
    guardian_document: clean(pick(row, ["Documento Genitore"]), 160) || null,
    birth_date: parseDate(pick(row, ["Data Nascita"])),
    sex: clean(pick(row, ["Sesso"]), 40) || null,
    residence_city: clean(pick(row, ["Citta di Residenza", "Città di Residenza"]), 120) || null,
    shirt_size: clean(pick(row, ["Taglia Maglia"]), 20).toUpperCase() || null,
    privacy_consent: bool(pick(row, ["Privacy Consent"])),
    media_consent: bool(pick(row, ["Media Consent"])),
    registration_status: "received",
    payment_status: paymentStatus(pick(row, ["Stato Pagamento"])),
    notes: clean(pick(row, ["Note"]), 2000) || null,
    original_data: original,
    sheet_copy_status: "sent",
    imported_from_sheet: tab,
    imported_row_number: index + 2,
    imported_at: new Date().toISOString()
  };
}

function recordsFromWorkbook(workbook) {
  const records = [];
  for (const tab of Object.keys(workbook || {})) {
    if (!CITY_TABS.has(tab)) continue;
    const rows = Array.isArray(workbook[tab]) ? workbook[tab] : [];
    rows.forEach((row, index) => {
      const record = normalizeRow(tab, row || {}, index);
      if (record) records.push(record);
    });
  }
  return records;
}

async function upsert(records) {
  const url = clean(process.env.SUPABASE_URL, 300).replace(/\/$/, "");
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 2000);
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

  for (let index = 0; index < records.length; index += 100) {
    const chunk = records.slice(index, index + 100);
    const response = await fetch(url + "/rest/v1/registrations?on_conflict=submission_id", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify(chunk)
    });
    if (!response.ok) {
      throw new Error("Supabase import failed: " + response.status + " " + await response.text());
    }
    console.log("Imported", Math.min(index + chunk.length, records.length), "of", records.length);
  }
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Pass the exported DATI FIL-ITALIA JSON path.");
  const workbook = JSON.parse(fs.readFileSync(input, "utf8"));
  const records = recordsFromWorkbook(workbook);
  console.log("Prepared", records.length, "registration records.");
  if (process.env.DRY_RUN === "1") {
    console.log(JSON.stringify(records.slice(0, 5), null, 2));
    return;
  }
  await upsert(records);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
