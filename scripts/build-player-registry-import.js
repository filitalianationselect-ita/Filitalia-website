#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || "").trim());
  return rows.slice(1).filter(r => r.some(v => String(v || "").trim())).map(r => {
    const out = {};
    headers.forEach((h, i) => { out[h] = r[i] == null ? "" : String(r[i]).trim(); });
    return out;
  });
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function pick(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalize(alias);
    const key = keys.find(k => normalize(k) === target);
    if (key && String(row[key] || "").trim()) return String(row[key]).trim();
  }
  return "";
}

function isoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  return raw;
}

function normalizePayment(value) {
  const v = normalize(value).replace(/-/g,"_");
  if (["paid","pagato","pagata","confirmed","confermato"].includes(v)) return "paid";
  if (["partial","parziale"].includes(v)) return "partial";
  if (["waived","free","gratis","esente"].includes(v)) return "waived";
  if (["refunded","rimborsato","rimborsata"].includes(v)) return "refunded";
  if (["not_required","non_richiesto","non_richiesta"].includes(v)) return "not_required";
  return "pending";
}

function rowData(row, index) {
  const first = pick(row,["Nome","Nome Giocatore","First Name","Player First Name"]);
  const last = pick(row,["Cognome","Cognome Giocatore","Last Name","Player Last Name"]);
  const birth = isoDate(pick(row,["Data Nascita","Data di nascita","Birth Date","DOB"]));
  const profileId = pick(row,["Player Profile ID","Profile ID","User ID"]);
  const explicitKey = pick(row,["Player Identity Key","Identity Key"]);
  const manualKey = first && last && birth ? `person:${normalize(first)}:${normalize(last)}:${birth}` : "";
  const identityKey = explicitKey || (profileId ? `profile:${profileId}` : manualKey);

  const eventId = pick(row,["eventId","Event ID","ID Evento"]);
  const eventName = pick(row,["Camp Name","Evento","Event","Nome Evento"]);
  const eventCity = pick(row,["Camp City","Città Evento","Event City","City"]);
  const eventDate = isoDate(pick(row,["Camp Date","Data Evento","Event Date"]));
  const fallbackEventId = eventName ? `legacy:${normalize([eventName,eventCity,eventDate].join("-"))}` : "";

  const submission = {
    submissionId: pick(row,["submissionId","Submission ID","ID Registrazione"]),
    "Player Identity Key": identityKey,
    "Player Registry Version": "2-import",
    "Nome": first,
    "Cognome": last,
    "Data Nascita": birth,
    "Sesso": pick(row,["Sesso","Sex"]),
    "Città di Residenza": pick(row,["Città di Residenza","Residence City","Citta Residenza"]),
    "Email Giocatore": pick(row,["Email Giocatore","Player Email","Email"]),
    "Telefono Giocatore": pick(row,["Telefono Giocatore","Player Phone","Phone"]),
    "Taglia Maglia": pick(row,["Taglia Maglia","Shirt Size","T-Shirt Size"]),
    "Nome Genitore": pick(row,["Nome Genitore","Parent First Name","Guardian First Name"]),
    "Cognome Genitore": pick(row,["Cognome Genitore","Parent Last Name","Guardian Last Name"]),
    "Email Genitore": pick(row,["Email Genitore","Parent Email","Guardian Email"]),
    "Telefono Genitore": pick(row,["Telefono Genitore","Parent Phone","Guardian Phone"]),
    "Documento Genitore": pick(row,["Documento Genitore","Parent Document","Guardian Document"]),
    "Privacy Consent": pick(row,["Privacy Consent","Privacy"]),
    "Media Consent": pick(row,["Media Consent","Media"]),
    "Profile Photo Path": pick(row,["Profile Photo Path","Foto Giocatore","Player Photo","Photo URL","Foto"]),
    eventId: eventId || fallbackEventId,
    "Camp Name": eventName,
    "Camp City": eventCity,
    "Camp Date": eventDate,
    importedLegacyRow: index + 2
  };

  return {
    rowNumber: index + 2,
    identityKey,
    manualKey,
    profileId,
    firstName:first,lastName:last,birthDate:birth,
    eventId:submission.eventId,eventName,eventCity,eventDate,
    paymentStatus:normalizePayment(pick(row,["Payment Status","Stato Pagamento","Pagamento","payment_status"])),
    registrationStatus:pick(row,["Registration Status","Stato Registrazione","status"]) || "registered",
    sourcePhoto:submission["Profile Photo Path"],
    submission,
    raw:row
  };
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Uso: node scripts/build-player-registry-import.js <registrazioni.csv> [output.json]");
    process.exit(1);
  }
  const output = process.argv[3] || path.join("tmp","registry-import.json");
  const rows = parseCsv(fs.readFileSync(input,"utf8"));
  const prepared = rows.map(rowData);
  const valid = prepared.filter(r => r.identityKey && r.eventName);
  const unresolved = prepared.filter(r => !r.identityKey || !r.eventName);

  const players = new Map();
  const manualGroups = new Map();
  valid.forEach(r => {
    if (!players.has(r.identityKey)) players.set(r.identityKey,{identityKey:r.identityKey,firstName:r.firstName,lastName:r.lastName,birthDate:r.birthDate,registrations:0,events:new Set(),rows:[]});
    const p = players.get(r.identityKey); p.registrations += 1; p.events.add(r.eventId); p.rows.push(r.rowNumber);
    if (r.manualKey) {
      if (!manualGroups.has(r.manualKey)) manualGroups.set(r.manualKey,new Set());
      manualGroups.get(r.manualKey).add(r.identityKey);
    }
  });

  const possibleIdentityConflicts = Array.from(manualGroups.entries())
    .filter(([,keys]) => keys.size > 1)
    .map(([manualKey,keys]) => ({manualKey,identityKeys:Array.from(keys)}));

  const bundle = {
    generatedAt:new Date().toISOString(),
    source:path.basename(input),
    summary:{
      sourceRows:rows.length,
      validRegistrations:valid.length,
      unresolvedRows:unresolved.length,
      uniquePlayers:players.size,
      playersWithMultipleRegistrations:Array.from(players.values()).filter(p=>p.registrations>1).length,
      possibleIdentityConflicts:possibleIdentityConflicts.length
    },
    players:Array.from(players.values()).map(p=>({identityKey:p.identityKey,firstName:p.firstName,lastName:p.lastName,birthDate:p.birthDate,registrations:p.registrations,eventIds:Array.from(p.events),sourceRows:p.rows})),
    registrations:valid.map(r=>({rowNumber:r.rowNumber,identityKey:r.identityKey,eventId:r.eventId,eventName:r.eventName,paymentStatus:r.paymentStatus,registrationStatus:r.registrationStatus,sourcePhoto:r.sourcePhoto,submission:r.submission})),
    possibleIdentityConflicts,
    unresolved:unresolved.map(r=>({rowNumber:r.rowNumber,firstName:r.firstName,lastName:r.lastName,birthDate:r.birthDate,eventName:r.eventName,reason:!r.identityKey?"PLAYER_IDENTITY_MISSING":"EVENT_MISSING"}))
  };

  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(bundle,null,2));

  const reviewPath = output.replace(/\.json$/i,"-review.csv");
  const reviewRows = [["identity_key","nome","cognome","nascita","registrazioni","eventi","righe_origine"]];
  bundle.players.forEach(p=>reviewRows.push([p.identityKey,p.firstName,p.lastName,p.birthDate,p.registrations,p.eventIds.join(" | "),p.sourceRows.join(" | ")]));
  fs.writeFileSync(reviewPath,reviewRows.map(r=>r.map(csvCell).join(",")).join("\n"));

  console.log(JSON.stringify(bundle.summary,null,2));
  console.log(`Creato: ${output}`);
  console.log(`Creato: ${reviewPath}`);
}

main();
