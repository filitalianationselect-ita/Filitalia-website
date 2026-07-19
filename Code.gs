const SPREADSHEET_ID = "INCOLLA_QUI_ID_GOOGLE_SHEET";
const PHOTO_FOLDER_ID = "INCOLLA_QUI_ID_CARTELLA_DRIVE_FOTO";

const ALLOWED_FORM_TYPES = ["camp_registration", "general_join"];
const ALLOWED_CITIES = ["Roma", "Milano", "Firenze", "Venezia", "Bologna"];
const MAX_JSON_BYTES = 7 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_FILL_TIME_MS = 3000;
const MAX_FILL_TIME_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_MINUTES = 15;
const MAX_REQUESTS_PER_WINDOW = 3;

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, error: "Richiesta vuota" });
    }

    if (e.postData.contents.length > MAX_JSON_BYTES) {
      return jsonResponse_({ success: false, error: "Richiesta troppo grande" });
    }

    const data = JSON.parse(e.postData.contents);
    const validation = validateRequest_(data);
    if (!validation.ok) {
      return jsonResponse_({ success: false, error: validation.error });
    }

    const rateKey = buildRateKey_(data);
    if (!allowRequest_(rateKey)) {
      return jsonResponse_({ success: false, error: "Troppi invii. Riprova più tardi." });
    }

    lock.waitLock(10000);

    if (data.formType === "camp_registration") {
      saveCampRegistration(data);
    } else {
      saveGeneralRegistration(data);
    }

    return jsonResponse_({ success: true });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonResponse_({ success: false, error: "Errore durante l'invio" });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function validateRequest_(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Dati non validi" };
  }

  if (String(data.website || "").trim()) {
    return { ok: false, error: "Spam rilevato" };
  }

  if (!ALLOWED_FORM_TYPES.includes(String(data.formType || ""))) {
    return { ok: false, error: "Tipo modulo non valido" };
  }

  const startedAt = Number(data.formStartedAt || 0);
  const elapsed = Date.now() - startedAt;
  if (!startedAt || elapsed < MIN_FILL_TIME_MS || elapsed > MAX_FILL_TIME_MS) {
    return { ok: false, error: "Tempo compilazione non valido" };
  }

  sanitizeObject_(data);

  const email = firstNonEmpty_(data["Email Genitore"], data["Email Giocatore"], data.Email);
  if (!isValidEmail_(email)) {
    return { ok: false, error: "Email non valida" };
  }

  const firstName = firstNonEmpty_(data.Nome, data["Nome Giocatore"]);
  const lastName = firstNonEmpty_(data.Cognome, data["Cognome Giocatore"]);
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
    return { ok: false, error: "Nome o cognome non valido" };
  }

  if (data.formType === "camp_registration") {
    const city = cleanCityName(data["Camp City"] || data.campCity || "");
    if (!ALLOWED_CITIES.includes(city)) {
      return { ok: false, error: "Città del camp non valida" };
    }
    if (!String(data["Privacy Consent"] || "").trim()) {
      return { ok: false, error: "Consenso privacy mancante" };
    }
  }

  const photo = data["Foto Giocatore"];
  if (photo && photo.data) {
    const mime = String(photo.mimeType || photo.type || "").toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return { ok: false, error: "Formato foto non consentito" };
    }
    const estimatedBytes = Math.ceil(String(photo.data).length * 3 / 4);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Foto troppo grande" };
    }
  }

  return { ok: true };
}

function sanitizeObject_(data) {
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (typeof value === "string") {
      const max = key === "Note" || key === "Motivazione" ? 2000 : 300;
      data[key] = safeCell_(value.slice(0, max));
    }
  });
}

function safeCell_(value) {
  let text = String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function isValidEmail_(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function firstNonEmpty_() {
  for (let i = 0; i < arguments.length; i++) {
    const value = String(arguments[i] || "").trim();
    if (value) return value;
  }
  return "";
}

function buildRateKey_(data) {
  const email = firstNonEmpty_(data["Email Genitore"], data["Email Giocatore"], data.Email).toLowerCase();
  const phone = firstNonEmpty_(data["Telefono Genitore"], data["Telefono Giocatore"], data.Telefono).replace(/\D/g, "");
  const raw = [data.formType, email, phone].join("|");
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(byte => (byte + 256).toString(16).slice(-2)).join("");
}

function allowRequest_(key) {
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || 0);
  if (current >= MAX_REQUESTS_PER_WINDOW) return false;
  cache.put(key, String(current + 1), RATE_LIMIT_MINUTES * 60);
  return true;
}

function saveCampRegistration(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const campsSheet = getOrCreateSheet(ss, "CAMPS");

  const city = cleanCityName(data["Camp City"] || data.campCity || "");
  if (!ALLOWED_CITIES.includes(city)) throw new Error("Camp City non valida");

  const citySheet = getOrCreateSheet(ss, city);
  setupCampHeaders(campsSheet);
  setupCampHeaders(citySheet);

  const photoUrl = saveBase64Photo(data["Foto Giocatore"], data.Nome, data.Cognome);
  const row = [
    new Date(), data["Camp Name"] || "", city, data["Camp Date"] || "",
    data["Nome Genitore"] || "", data["Cognome Genitore"] || "", data["Email Genitore"] || "",
    data["Telefono Genitore"] || "", data["Documento Genitore"] || "",
    data.Nome || data["Nome Giocatore"] || "", data.Cognome || data["Cognome Giocatore"] || "",
    data.Sesso || "", data["Data Nascita"] || "", data["Città di Residenza"] || data["Città"] || "",
    data["Email Giocatore"] || data.Email || "", data["Telefono Giocatore"] || data.Telefono || "",
    data["Taglia Maglia"] || "", photoUrl, data["Privacy Consent"] || "", data["Media Consent"] || "",
    data.Note || ""
  ];

  campsSheet.appendRow(row);
  citySheet.appendRow(row);
}

function saveGeneralRegistration(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, "DATABASE");
  sheet.appendRow([new Date(), JSON.stringify(data)]);
}

function setupCampHeaders(sheet) {
  const headers = [
    "Timestamp", "Camp Name", "Camp City", "Camp Date", "Nome Genitore", "Cognome Genitore",
    "Email Genitore", "Telefono Genitore", "Documento Genitore", "Nome Giocatore", "Cognome Giocatore",
    "Sesso", "Data Nascita", "Città di Residenza", "Email Giocatore", "Telefono Giocatore",
    "Taglia Maglia", "Foto Giocatore", "Privacy Consent", "Media Consent", "Note"
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow.every(cell => !cell)) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function cleanCityName(city) {
  const c = String(city || "").trim().toLowerCase();
  if (c.includes("roma") || c.includes("rome")) return "Roma";
  if (c.includes("milano") || c.includes("milan")) return "Milano";
  if (c.includes("firenze") || c.includes("florence")) return "Firenze";
  if (c.includes("venezia") || c.includes("venice")) return "Venezia";
  if (c.includes("bologna")) return "Bologna";
  return "";
}

function saveBase64Photo(fileData, nome, cognome) {
  if (!fileData || !fileData.data || !PHOTO_FOLDER_ID || PHOTO_FOLDER_ID.includes("INCOLLA_QUI")) return "";

  const mime = String(fileData.mimeType || fileData.type || "").toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Formato foto non valido");

  const estimatedBytes = Math.ceil(String(fileData.data).length * 3 / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) throw new Error("Foto troppo grande");

  const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const bytes = Utilities.base64Decode(fileData.data);
  const originalName = safeCell_(fileData.fileName || fileData.name || "foto.jpg").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const blob = Utilities.newBlob(bytes, mime, originalName);
  const safeName = `${nome || "player"}_${cognome || ""}_${Date.now()}_${originalName}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return folder.createFile(blob).setName(safeName).getUrl();
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
