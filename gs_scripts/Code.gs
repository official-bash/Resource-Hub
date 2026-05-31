// Code.gs - Google Apps Script for dual links in Google Sheets
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('Link Helper')
    .addItem('Open Selected Links', 'openSelectedLinks')
    .addToUi();
}

/**
 * Returns a string with two URLs each followed by its year in parentheses,
 * separated by a comma.
 * Example: =DUAL_LINKS("https://example.com/doc1.pdf","2021","https://example.com/doc2.pdf","2022")
 */
function DUAL_LINKS(url1, year1, url2, year2) {
  return `${url1} (${year1}), ${url2} (${year2})`;
}

function openSelectedLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getActiveRange();
  const value = range.getDisplayValue();
  const regex = /(\S+)\s*\((\d{4})\),\s*(\S+)\s*\((\d{4})\)/;
  const match = value.match(regex);
  if (!match) {
    SpreadsheetApp.getUi().alert('Selected cell does not contain the expected dual‑link format.');
    return;
  }
  const data = {
    url1: match[1],
    year1: match[2],
    url2: match[3],
    year2: match[4]
  };
  const html = HtmlService.createTemplateFromFile('LinksDialog')
    .evaluate()
    .setWidth(420)
    .setHeight(250);
  // Pass data to the template
  html.data = data;
  SpreadsheetApp.getUi().showModalDialog(html, 'Select Document');
}
