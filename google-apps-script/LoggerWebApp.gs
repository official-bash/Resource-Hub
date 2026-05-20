/**
 * BASH Drive Click Logger — Google Apps Script Web App
 *
 * Setup:
 * 1. Create a Google Sheet named "BASH Logger" (or any name).
 * 2. Add a sheet tab with row 1 headers:
 *    Timestamp | Email | Course Name | Folder Name | Drive Link
 * 3. Extensions → Apps Script → paste this file → Save.
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL into js/config.js as LOGGER_URL
 */

const LOGGER_SHEET_NAME = "Logger";

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const email = (params.email || "").toString().trim();
    const courseName = (params.courseName || "").toString().trim();
    const folderName = (params.folderName || "").toString().trim();
    const driveLink = (params.driveLink || "").toString().trim();
    const timestamp = new Date();

    const sheet = getLoggerSheet_();
    sheet.appendRow([timestamp, email, courseName, folderName, driveLink]);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getLoggerSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LOGGER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOGGER_SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Email",
      "Course Name",
      "Folder Name",
      "Drive Link",
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
