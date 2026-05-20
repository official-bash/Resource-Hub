# Drive Click Logger Setup

## 1. Logger Google Sheet

Create a Google Sheet and add a tab named **Logger** with this header row (row 1):

| Timestamp | Email | Course Name | Folder Name | Drive Link |
|-----------|-------|-------------|-------------|------------|

## 2. Apps Script Web App

1. In the sheet: **Extensions → Apps Script**
2. Paste the code from `google-apps-script/LoggerWebApp.gs`
3. **Save** the project
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL

## 3. Website config

In `js/config.js`, set:

```js
LOGGER_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
```

Leave empty (`""`) to disable logging until deployed.

## 4. User email (form verification)

After registration/form verification, store the user’s email:

- Redirect back to the site with `?verified=1&bash_email=user@example.com` (handled on load), or
- Call `BASH.onEmailVerified(email)` from your verification code.

The email is saved in `localStorage` as `bash_user_email`. Drive logs use it, or `anonymous` if missing.
