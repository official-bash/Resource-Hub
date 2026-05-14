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
    NOTIFICATIONS:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=0&single=true&output=csv", // Paste published CSV URL for Notifications sheet
    EXAMS:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1461535919&single=true&output=csv", // Paste published CSV URL for Exams sheet
    TASKS:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=1468460687&single=true&output=csv", // Paste published CSV URL for Tasks sheet
  },

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
