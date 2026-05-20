# Drive Click Logger Setup

## 1. Logger Google Sheet

Create a Google Sheet and add a tab named **Logger** with this header row (row 1):

| Timestamp | Email | Course Name | Folder Name | Drive Link |
|-----------|-------|-------------|-------------|------------|

## 2. Apps Script Web App

1. Open your **Logger Google Sheet** (the sheet where rows should appear).
2. **Extensions → Apps Script**
3. Paste the code from `google-apps-script/LoggerWebApp.gs`
4. **Save** the project
5. **Run → `doGet`** once and complete all authorization prompts (required before deploy).
6. **Deploy → Manage deployments → New deployment** (use **New**, not only “Edit”, after code changes)
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (if this is “Only myself”, the site gets **403 Forbidden** and nothing is logged)
7. Copy the **Web app URL** ending in `/exec` (not `/dev`)

### Fix 403 Forbidden

If clicks do not create rows and opening the logger URL in a browser shows **403** or a sign-in page:

1. Confirm **Who has access** is **Anyone** on the latest deployment.
2. Create a **New deployment** (old URLs stop working when deployments are removed).
3. Run `doGet` in the editor again and approve permissions.
4. Paste the **new** `/exec` URL into `LOGGER_URL` in `js/config.js`.
5. Test in the browser (replace with your URL):

   `LOGGER_URL?email=test@test.com&courseName=Test&folderName=Mid&driveLink=https://drive.google.com/test`

   Expected: `{"success":true}` — not 403, not an HTML login page.

### Debug logging on the website

In the browser console:

```js
localStorage.setItem('bash_debug', '1')
```

Click a Drive link and check the console for `[BASH Logger]` messages. Remove debug with:

```js
localStorage.removeItem('bash_debug')
```

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

## 5. Verify deployment

After updating `LOGGER_URL`, open this URL in your browser (one line):

`YOUR_LOGGER_URL?email=test@test.com&courseName=Test&folderName=Mid&driveLink=https://drive.google.com/test`

- **Working:** JSON `{"success":true}` and a new row in the **Logger** sheet tab.
- **Not working:** HTTP 403 or a Google sign-in page — redeploy with **Anyone** access (see above) and update `LOGGER_URL` with the new `/exec` URL.
