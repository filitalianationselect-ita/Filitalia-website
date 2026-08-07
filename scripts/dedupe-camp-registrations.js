const fs = require("fs");
const path = require("path");

function normalizeText(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function normalizeDate(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const italian = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (italian) {
    return `${italian[3]}-${String(italian[2]).padStart(2, "0")}-${String(italian[1]).padStart(2, "0")}`;
  }

  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, headers, records) {
  const lines = [headers.map(csvEscape).join(",")];
  records.forEach((record) => {
    lines.push(headers.map((header) => csvEscape(record[header])).join(","));
  });
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

function getValue(record, aliases) {
  for (const name of aliases) {
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      const value = record[name];
      if (value != null && String(value).trim() !== "") return String(value).trim();
    }
  }
  return "";
}

function identityFor(record) {
  const explicitKey = getValue(record, [
    "Player Identity Key",
    "player_identity_key",
    "playerIdentityKey"
  ]);
  if (explicitKey) return explicitKey;

  const profileId = getValue(record, [
    "Player Profile ID",
    "player_profile_id",
    "profile_id",
    "user_id"
  ]);
  if (profileId) return `profile:${profileId}`;

  const firstName = normalizeText(getValue(record, ["Nome", "First Name", "first_name"]));
  const lastName = normalizeText(getValue(record, ["Cognome", "Last Name", "last_name"]));
  const birthDate = normalizeDate(getValue(record, ["Data Nascita", "Birth Date", "birth_date"]));

  if (!firstName || !lastName || !birthDate) return "";
  return `person:${firstName}:${lastName}:${birthDate}`;
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error("Uso: node scripts/dedupe-camp-registrations.js <registrazioni.csv> [cartella-output]");
    process.exitCode = 1;
    return;
  }

  const inputPath = path.resolve(inputArg);
  const outputDir = path.resolve(process.argv[3] || path.join(path.dirname(inputPath), "dedupe-output"));

  if (!fs.existsSync(inputPath)) {
    throw new Error(`File non trovato: ${inputPath}`);
  }

  const rows = parseCsv(fs.readFileSync(inputPath, "utf8")).filter((row) => row.some((cell) => String(cell).trim()));
  if (rows.length < 2) throw new Error("Il CSV non contiene registrazioni.");

  const headers = rows[0].map((header) => String(header).trim());
  const registrations = rows.slice(1).map((row, index) => {
    const record = { __row: index + 2 };
    headers.forEach((header, column) => {
      record[header] = row[column] == null ? "" : row[column];
    });
    return record;
  });

  const players = new Map();
  const unresolved = [];

  registrations.forEach((registration) => {
    const identity = identityFor(registration);
    if (!identity) {
      unresolved.push(registration);
      return;
    }

    if (!players.has(identity)) {
      players.set(identity, {
        identity,
        first_name: getValue(registration, ["Nome", "First Name", "first_name"]),
        last_name: getValue(registration, ["Cognome", "Last Name", "last_name"]),
        birth_date: normalizeDate(getValue(registration, ["Data Nascita", "Birth Date", "birth_date"])),
        player_email: getValue(registration, ["Email Giocatore", "Player Email", "email"]),
        registrations: []
      });
    }

    players.get(identity).registrations.push(registration);
  });

  const uniquePlayers = Array.from(players.values());
  const duplicatePlayers = uniquePlayers.filter((player) => player.registrations.length > 1);

  fs.mkdirSync(outputDir, { recursive: true });

  writeCsv(
    path.join(outputDir, "unique-players.csv"),
    ["player_identity_key", "first_name", "last_name", "birth_date", "player_email", "registration_count"],
    uniquePlayers.map((player) => ({
      player_identity_key: player.identity,
      first_name: player.first_name,
      last_name: player.last_name,
      birth_date: player.birth_date,
      player_email: player.player_email,
      registration_count: player.registrations.length
    }))
  );

  const links = [];
  uniquePlayers.forEach((player) => {
    player.registrations.forEach((registration) => {
      links.push({
        source_row: registration.__row,
        player_identity_key: player.identity,
        event_name: getValue(registration, ["Camp Name", "Event", "event_name"]),
        event_city: getValue(registration, ["Camp City", "City", "event_city"]),
        event_date: getValue(registration, ["Camp Date", "Date", "event_date"])
      });
    });
  });

  writeCsv(
    path.join(outputDir, "registration-links.csv"),
    ["source_row", "player_identity_key", "event_name", "event_city", "event_date"],
    links
  );

  const duplicateRows = [];
  duplicatePlayers.forEach((player) => {
    player.registrations.forEach((registration) => {
      duplicateRows.push({
        player_identity_key: player.identity,
        source_row: registration.__row,
        first_name: player.first_name,
        last_name: player.last_name,
        birth_date: player.birth_date,
        event_name: getValue(registration, ["Camp Name", "Event", "event_name"]),
        event_city: getValue(registration, ["Camp City", "City", "event_city"])
      });
    });
  });

  writeCsv(
    path.join(outputDir, "duplicates-report.csv"),
    ["player_identity_key", "source_row", "first_name", "last_name", "birth_date", "event_name", "event_city"],
    duplicateRows
  );

  writeCsv(
    path.join(outputDir, "unresolved-report.csv"),
    ["source_row", "first_name", "last_name", "birth_date"],
    unresolved.map((registration) => ({
      source_row: registration.__row,
      first_name: getValue(registration, ["Nome", "First Name", "first_name"]),
      last_name: getValue(registration, ["Cognome", "Last Name", "last_name"]),
      birth_date: getValue(registration, ["Data Nascita", "Birth Date", "birth_date"])
    }))
  );

  console.log(`Registrazioni lette: ${registrations.length}`);
  console.log(`Giocatori unici: ${uniquePlayers.length}`);
  console.log(`Giocatori presenti in più registrazioni: ${duplicatePlayers.length}`);
  console.log(`Registrazioni senza identità sufficiente: ${unresolved.length}`);
  console.log(`Report creati in: ${outputDir}`);
}

try {
  main();
} catch (error) {
  console.error("Errore deduplica:", error.message);
  process.exitCode = 1;
}
