// BASH Configuration
const BASH_CONFIG = {
  // Google Sheets Published CSV URLs
  // Replace these with your own published sheet URLs
  // To get your URL: File → Share → Publish to web → Choose CSV format → Copy the URL
  //
  // EXAMS sheet is now the primary data source for Courses section
  // Exams sheet columns:
  // 1. course_id, 2. course_name, 3. semester, 4. year
  // 5. mid_link, 6. final_link, 7. book_link, 8. outline_link
  // 9. lecture_notes_link, 10. google_folder_link
  // Books & Outline page uses the same sheet and displays book_link and outline_link columns
  // Courses section now displays all documents from EXAMS sheet
  SHEETS: {
    // Notifications columns: heading, short_description, detail, link, updated
    NOTIFICATIONS:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=0&single=true&output=csv", // Paste published CSV URL for Notifications sheet
    EXAMS:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1461535919&single=true&output=csv", // Paste published CSV URL for Exams sheet
    TASKS:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1468460687&single=true&output=csv", // Paste published CSV URL for Tasks sheet
    // Contributors columns: name, Email, linkdIN, Profile (link), semester, points, date added, contribution topic
    // Points are summed per person (by email, or name if no email) for the Top 3 ranking
    CONTRIBUTORS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1836716982&single=true&output=csv", // Paste published CSV URL for Contributors sheet (File → Share → Publish to web → CSV)
    // New dual-sheet contributor setup:
    // Profiles sheet columns: unique id, name, Email, linkdIN, Profile (link), semester
    CONTRIBUTORS_PROFILES: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1836716982&single=true&output=csv", // Paste published CSV URL for Profiles sheet
    // Activities sheet columns: unique id, date, point, topic contributions, link of the contributed file
    CONTRIBUTORS_ACTIVITIES: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1477492571&single=true&output=csv", // Paste published CSV URL for Activities/Contributions sheet (e.g. gid=xxxxx)
    // Extra Material columns: Course id, folder name, File name, File Link
    EXTRA_MATERIAL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1362328577&single=true&output=csv",
  },

  // Registration Form
  REGISTER_FORM: "https://forms.gle/mmjderNyoYmzHhzq6",

  // Drive click logger — Apps Script Web App /exec URL (deploy with access: Anyone)
  // If logging fails with 403, redeploy and paste the new URL (see LOGGER-SETUP.md)
  LOGGER_URL: "https://script.google.com/macros/s/AKfycbzr4h1W_NFBvByZIRQkFzRAmgk05E0Ll9q9otkjhKPHdE8e_61jLg-_FwwXupEpM5NsUQ/exec",

  // Published CSV URL for the Logger Spreadsheet (to read history for the captcha cooldown)
  LOGGER_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=853917613&single=true&output=csv",

  // Gender classification web app URL (Deploy as Web App, Access: Anyone)
  GENDER_CLASSIFIER_URL: "https://script.google.com/macros/s/AKfycbxLIMEcfZwQplY6O2hKPMU8ml34tfvMsrzph7zsFE3SCXoBsZDVpEzZYAYCCGc4fFZb/exec",

  // notARobot config sheet (controls captcha grid size, honeypot counts, delays)
  NOTAROBOT_CONFIG_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvot6xMc3FvT6zeO1LGOTb48fXUXc54Xm1kOszCh00KYl2RNzGNJr6s-HS8oTm3qFvinb0pjQbpNLT/pub?gid=1014028119&single=true&output=csv",

  // Published CSV of registration form responses / verified email databases.
  // Only emails found in these sheets are accepted.
  VERIFIED_EMAILS: [
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvot6xMc3FvT6zeO1LGOTb48fXUXc54Xm1kOszCh00KYl2RNzGNJr6s-HS8oTm3qFvinb0pjQbpNLT/pub?gid=151021924&single=true&output=csv",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZokNJG3cs3QqvqYzT26S9mimsq8RH56cQHW42EQYjzIISVLaT5m6f5oTeXy9sFqa29t9TqCJMb_I7/pub?gid=225641271&single=true&output=csv"
  ],

  // WhatsApp Number for Contribution
  WHATSAPP_NUMBER: "923142541678",

  // Social Links
  SOCIAL: {
    whatsapp: "https://whatsapp.com/channel/0029VbC1BjbDzgT9UrefoL2Q",
    linkedin: "#",
    instagram: "https://www.instagram.com/bash.official.pk/",
    email: "bash.official",
    github: "https://github.com/official-bash",
    kaggle: "#",
  },

  // App Info
  APP_NAME: "BASH",
  APP_FULL_NAME: "Business Analytics Student Hub",
};
