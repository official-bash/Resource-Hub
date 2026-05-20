Drive click logging and email storage are wired up. Here is what was added and how to use it.

Google Apps Script + Logger sheet
Script: google-apps-script/LoggerWebApp.gs — doGet reads email, courseName, folderName, driveLink, appends a row with timestamp.
Setup guide: LOGGER-SETUP.md
Create a sheet tab Logger with headers: Timestamp | Email | Course Name | Folder Name | Drive Link
Deploy as Web App (Execute as: Me, Access: Anyone), then set the URL in config:

LOGGER_URL: "https://script.google.com/macros/s/YOUR_ID/exec",
Website (js/main.js)
logDriveClick() — fire-and-forget GET via hidden Image (no await, fails silently)
openDriveLink() — logs, then window.open() immediately
getUserEmail() / saveUserEmail() / onEmailVerified() — localStorage key bash_user_email, fallback "anonymous"
initUserEmailFromUrl() — on load, ?verified=1&bash_email=... saves email after form redirect
Drive links
courses.js — openFile() uses openDriveLink() with course name from breadcrumb + document/folder name
exams.js / books-outline.js — Drive buttons use data-drive-link handlers; logging runs before the tab opens
Email after form verification
Redirect: yoursite.com/?verified=1&bash_email=user@example.com, or
In your verification code: BASH.onEmailVerified(email)
Until LOGGER_URL is set or email is stored, logging is skipped silently and links behave as before. lecture-notes.js was not changed (only the three files you listed). Say if you want the same logging there too.