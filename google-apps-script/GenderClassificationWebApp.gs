// BASH Student Gender Classification Apps Script Web App
// Deployed as a web app. Access: "Anyone", Execute as: "Me"

const SPREADSHEET_ID = "1kiZuIOobRbrYg5gVXiDE7oPLq0xdGggMMGJ5TrPhdCM";
const TARGET_GID = 944618934;

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = (params.action || "").toString().trim();
    const email = (params.email || "").toString().toLowerCase().trim(); // the user submitting

    if (!action) {
      return jsonResponse({ success: false, error: "Action parameter is required." });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = findSheetByGid_(ss, TARGET_GID);
    
    if (!sheet) {
      return jsonResponse({ success: false, error: "Sheet tab with GID " + TARGET_GID + " not found." });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    
    const emailIdx = headers.indexOf("email");
    const genderIdx = headers.indexOf("gender");
    const nameIdx = headers.indexOf("name");
    const timestampIdx = headers.indexOf("timestamp");
    const timestempIdx = headers.indexOf("timestemp");
    const targetTimestampIdx = timestempIdx !== -1 ? timestempIdx : (timestampIdx !== -1 ? timestampIdx : -1);

    if (nameIdx === -1 || genderIdx === -1 || emailIdx === -1) {
      return jsonResponse({ success: false, error: "Required columns (Name, Gender, Email) not found." });
    }

      // 1. Fetch random names for the captcha including honeypots
    if (action === "check") {
      let size = parseInt(params.size, 10);
      if (isNaN(size) || size < 2) size = 6; // Default to 6

      let sameHP = parseInt(params.sameHP, 10);
      if (isNaN(sameHP) || sameHP < 0) sameHP = 1;

      let otherHP = parseInt(params.otherHP, 10);
      if (isNaN(otherHP) || otherHP < 0) otherHP = 1;

      let unclassified = [];
      let knownMales = [];
      let knownFemales = [];
      
      for (let i = 1; i < data.length; i++) {
        const rowGender = String(data[i][genderIdx]).trim().toLowerCase();
        const rowData = {
          row: i + 1, // 1-indexed for sheet operations
          name: String(data[i][nameIdx]).trim()
        };

        if (rowGender === "male") {
          knownMales.push(rowData);
        } else if (rowGender === "female") {
          knownFemales.push(rowData);
        } else {
          unclassified.push(rowData);
        }
      }

      const numUnclassifiedNeeded = size - (sameHP + otherHP);

      // We need at least numUnclassifiedNeeded unclassified to populate
      if (unclassified.length < numUnclassifiedNeeded) {
        return jsonResponse({ success: true, needsClassification: false, message: "Not enough unclassified names left." });
      }

      let targetGender = Math.random() > 0.5 ? "Male" : "Female";

      let sameHoneypotPool = targetGender === "Male" ? knownMales : knownFemales;
      let otherHoneypotPool = targetGender === "Male" ? knownFemales : knownMales;

      // We need at least sameHP known names for the target gender and otherHP known names for the opposite gender
      if (sameHoneypotPool.length < sameHP || otherHoneypotPool.length < otherHP) {
        return jsonResponse({ success: true, needsClassification: false, message: `Bootstrap required. Please classify at least ${targetGender === "Male" ? sameHP : otherHP} Male and ${targetGender === "Female" ? sameHP : otherHP} Female names manually in the sheet.` });
      }

      // Pick sameHP random target gender honeypots
      shuffleArray(sameHoneypotPool);
      let selectedSameHoneypots = sameHoneypotPool.slice(0, sameHP);

      // Pick otherHP random opposite gender honeypots
      shuffleArray(otherHoneypotPool);
      let selectedOtherHoneypots = otherHoneypotPool.slice(0, otherHP);

      // Pick numUnclassifiedNeeded unclassified
      shuffleArray(unclassified);
      let selectedUnclassified = unclassified.slice(0, numUnclassifiedNeeded);

      // Combine and shuffle the grid
      let grid = [...selectedUnclassified, ...selectedSameHoneypots, ...selectedOtherHoneypots];
      shuffleArray(grid);

      return jsonResponse({
        success: true,
        needsClassification: true,
        targetGender: targetGender,
        names: grid
      });
    }

    // 2. Submit classifications with Honeypot verification
    if (action === "submit") {
      if (!email) {
        return jsonResponse({ success: false, error: "Email parameter is required to log the user." });
      }

      let payloadStr = params.payload || "[]";
      let classifications;
      try {
        classifications = JSON.parse(payloadStr);
      } catch (err) {
        return jsonResponse({ success: false, error: "Invalid payload JSON." });
      }

      if (!Array.isArray(classifications) || classifications.length === 0) {
        return jsonResponse({ success: false, error: "Empty or invalid classification payload." });
      }

      // VERIFICATION STEP
      // Read current sheet data again in case it changed
      const currentData = sheet.getDataRange().getValues();
      let verificationFailed = false;
      let unclassifiedUpdates = [];

      for (let i = 0; i < classifications.length; i++) {
        const item = classifications[i];
        if (!item.row || !item.gender) continue;

        const rowIdx = parseInt(item.row, 10);
        // The array is 0-indexed, rows are 1-indexed
        if (rowIdx < 2 || rowIdx > currentData.length) continue;

        const existingGender = String(currentData[rowIdx - 1][genderIdx]).trim().toLowerCase();
        
        if (existingGender === "male" || existingGender === "female") {
          // This is a honeypot (already classified). Verify it matches the user's choice.
          if (existingGender !== String(item.gender).toLowerCase()) {
            verificationFailed = true;
            break;
          }
        } else {
          // Unclassified. Store for batch update.
          unclassifiedUpdates.push(item);
        }
      }

      if (verificationFailed) {
        return jsonResponse({ success: false, error: "Verification failed. Incorrect selections." });
      }

      // PASS! Proceed with updating the UNCLASSIFIED rows
      const now = new Date();
      for (let i = 0; i < unclassifiedUpdates.length; i++) {
        const item = unclassifiedUpdates[i];
        sheet.getRange(item.row, genderIdx + 1).setValue(item.gender);
        sheet.getRange(item.row, emailIdx + 1).setValue(email);
        if (targetTimestampIdx !== -1) {
          sheet.getRange(item.row, targetTimestampIdx + 1).setValue(now);
        }
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: "Invalid action. Use action=check or action=submit." });

  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function findSheetByGid_(ss, gid) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) {
      return sheets[i];
    }
  }
  return null;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(
    JSON.stringify(data)
  ).setMimeType(ContentService.MimeType.JSON);
}
