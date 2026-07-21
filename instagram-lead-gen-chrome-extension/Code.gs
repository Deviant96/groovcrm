const SHEET_NAME = "Leads";
const SPREADSHEET_ID = "10W0y8jbp2vLOhXpr3GWJtN2n7xpXiVHcQ8PUgyoQlUo";
const SHEET_COLS = 10; // A: timestamp … I: phone, J: visited

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found`);
  return sheet;
}

function normalizeHandleKey(handle) {
  return String(handle || "").trim().toLowerCase().replace(/^@+/, "");
}

function parseVisited(value) {
  if (value === true || value === 1) return true;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "visited";
}

function findLatestRowByHandle(sheet, handle) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const key = normalizeHandleKey(handle);
  let foundRow = 0;
  const numRows = lastRow - 1;
  // getRange(row, column, numRows, numColumns) — height/width, not end coords
  const handles = sheet.getRange(2, 2, numRows, 1).getValues();

  for (let i = 0; i < handles.length; i += 1) {
    if (normalizeHandleKey(handles[i][0]) === key) {
      foundRow = i + 2;
    }
  }

  return foundRow;
}

function buildRowData(data, existingRow) {
  const links = Array.isArray(data.links)
    ? data.links.join(", ")
    : String(data.links || "");

  const base = existingRow || [new Date(), "", "", "", "", false, 0, "", "", false];

  return [
    existingRow ? base[0] : new Date(),
    data.handle != null ? String(data.handle || "") : String(base[1] || ""),
    data.name != null ? String(data.name || "") : String(base[2] || ""),
    data.website != null ? String(data.website || "") : String(base[3] || ""),
    data.links != null ? links : String(base[4] || ""),
    data.hasWebsite != null ? data.hasWebsite === true : base[5] === true,
    data.score != null ? Number(data.score) || 0 : Number(base[6]) || 0,
    data.sourceUrl != null ? String(data.sourceUrl || "") : String(base[7] || ""),
    data.phone != null ? String(data.phone || "") : String(base[8] || ""),
    data.visited != null ? parseVisited(data.visited) : parseVisited(base[9])
  ];
}

function doPost(e) {
  try {
    const sheet = getSheet();
    const data = JSON.parse(e.postData.contents || "{}");
    const rowNum = findLatestRowByHandle(sheet, data.handle);

    let existingRow = null;
    if (rowNum > 0) {
      existingRow = sheet.getRange(rowNum, 1, 1, SHEET_COLS).getValues()[0];
    }

    const rowData = buildRowData(data, existingRow);

    if (rowNum > 0) {
      // One row tall, SHEET_COLS wide — must use numRows=1 (not rowNum as height)
      sheet.getRange(rowNum, 1, 1, SHEET_COLS).setValues([rowData]);
    } else {
      rowData[0] = new Date();
      sheet.appendRow(rowData);
    }

    return jsonResponse({ status: "success", updated: rowNum > 0 });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doGet() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return jsonResponse([]);

    const numRows = lastRow - 1;
    const rows = sheet.getRange(2, 1, numRows, SHEET_COLS).getValues();
    const byHandle = {};

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rawHandle = String(row[1] || "").trim(); // B
      const rawWebsite = String(row[3] || "").trim(); // D
      const rawPhone = String(row[8] || "").trim(); // I
      const rawVisited = row[9]; // J

      if (!rawHandle) continue;

      const key = rawHandle.toLowerCase();
      byHandle[key] = {
        handle: rawHandle,
        website: rawWebsite,
        phone: rawPhone,
        visited: parseVisited(rawVisited)
      };
    }

    const leads = Object.keys(byHandle).map(k => byHandle[k]);
    return jsonResponse({ leads });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
