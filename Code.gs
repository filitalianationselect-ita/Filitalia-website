const SPREADSHEET_ID = "INCOLLA_QUI_ID_GOOGLE_SHEET";
const PHOTO_FOLDER_ID = "INCOLLA_QUI_ID_CARTELLA_DRIVE_FOTO";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");

    if (data.formType === "camp_registration") {
      saveCampRegistration(data);
    } else {
      saveGeneralRegistration(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveCampRegistration(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const campsSheet = getOrCreateSheet(ss, "CAMPS");

  const city = cleanCityName(data["Camp City"] || data.campCity || "");
  if (!city) throw new Error("Camp City mancante");

  const citySheet = getOrCreateSheet(ss, city);
  setupCampHeaders(campsSheet);
  setupCampHeaders(citySheet);

  const photoUrl = saveBase64Photo(data["Foto Giocatore"], data["Nome"], data["Cognome"]);

  const row = [
    new Date(),
    data["Camp Name"] || "",
    city,
    data["Camp Date"] || "",
    data["Nome Genitore"] || "",
    data["Cognome Genitore"] || "",
    data["Email Genitore"] || "",
    data["Telefono Genitore"] || "",
    data["Documento Genitore"] || "",
    data["Nome"] || data["Nome Giocatore"] || "",
    data["Cognome"] || data["Cognome Giocatore"] || "",
    data["Sesso"] || "",
    data["Data Nascita"] || "",
    data["Città di Residenza"] || data["Città"] || "",
    data["Email Giocatore"] || data["Email"] || "",
    data["Telefono Giocatore"] || data["Telefono"] || "",
    data["Taglia Maglia"] || "",
    photoUrl,
    data["Privacy Consent"] || "",
    data["Media Consent"] || "",
    data["Note"] || ""
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
    "Timestamp", "Camp Name", "Camp City", "Camp Date",
    "Nome Genitore", "Cognome Genitore", "Email Genitore", "Telefono Genitore", "Documento Genitore",
    "Nome Giocatore", "Cognome Giocatore", "Sesso", "Data Nascita", "Città di Residenza",
    "Email Giocatore", "Telefono Giocatore", "Taglia Maglia", "Foto Giocatore",
    "Privacy Consent", "Media Consent", "Note"
  ];

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every(cell => !cell);
  if (isEmpty) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  return city;
}

function saveBase64Photo(fileData, nome, cognome) {
  if (!fileData || !fileData.data || !PHOTO_FOLDER_ID || PHOTO_FOLDER_ID.includes("INCOLLA_QUI")) return "";

  const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const bytes = Utilities.base64Decode(fileData.data);
  const blob = Utilities.newBlob(bytes, fileData.type || "image/jpeg", fileData.name || "foto.jpg");
  const safeName = `${nome || "player"}_${cognome || ""}_${Date.now()}_${fileData.name || "foto.jpg"}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const file = folder.createFile(blob).setName(safeName);
  return file.getUrl();
}
