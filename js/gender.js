// BASH Gender Classification Module - reCAPTCHA Style
const BASH_GENDER = {
  targetGender: null,
  namesData: [], // [{row: X, name: "Y"}]
  
  // URL to the published logger CSV
  LOGGER_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=853917613&single=true&output=csv",

  init() {
    this.setupModalMarkup();
  },

  setupModalMarkup() {
    if (document.getElementById("genderVerificationModal")) return;

    const modal = document.createElement("div");
    modal.id = "genderVerificationModal";
    modal.className = "gender-modal";
    modal.innerHTML = `
      <div class="modal-overlay" id="genderModalOverlay"></div>
      <div class="modal-container">
        <div class="modal-header">
          <div class="gender-modal-subtitle">Select all images with</div>
          <h2 id="genderTargetTitle">Female names</h2>
        </div>
        <div class="modal-content">
          <div class="gender-options-grid" id="genderOptionsGrid">
            <!-- Cards rendered dynamically here -->
          </div>
          <div class="gender-modal-footer">
            <button type="button" id="genderReloadBtn" class="gender-action-btn" title="Get new names">
              <i class="fas fa-redo"></i>
            </button>
            <div id="genderModalError" class="gender-modal-error"></div>
            <button type="button" id="genderSubmitBtn" class="gender-submit-btn">
              Verify
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const submitBtn = document.getElementById("genderSubmitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.handleGenderSubmit());
    }
    
    const reloadBtn = document.getElementById("genderReloadBtn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => {
        const email = window.BASH ? BASH.getUserEmail() : null;
        if (email) {
          reloadBtn.classList.add("spinning");
          this.fetchAndShowCaptcha(email, BASH_CONFIG.GENDER_CLASSIFIER_URL);
        }
      });
    }
  },

  showModal(targetGender, namesData) {
    this.targetGender = targetGender;
    this.namesData = namesData;

    const modal = document.getElementById("genderVerificationModal");
    const grid = document.getElementById("genderOptionsGrid");
    const title = document.getElementById("genderTargetTitle");
    const submitBtn = document.getElementById("genderSubmitBtn");
    const err = document.getElementById("genderModalError");

    title.textContent = `${targetGender} names`;

    // Render cards
    grid.innerHTML = "";
    namesData.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "gender-option-card";
      card.dataset.index = index;
      card.innerHTML = `<div class="gender-option-label">${item.name}</div>`;
      
      card.addEventListener("click", () => {
        card.classList.toggle("active");
        this.updateVerifyButton();
      });
      
      grid.appendChild(card);
    });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify";
    }
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }

    if (modal) modal.style.display = "flex";
    this.updateVerifyButton();
  },

  updateVerifyButton() {
    const submitBtn = document.getElementById("genderSubmitBtn");
    if (!submitBtn) return;
    submitBtn.textContent = "Verify";
  },

  hideModal() {
    const modal = document.getElementById("genderVerificationModal");
    if (modal) modal.style.display = "none";
  },

  /**
   * Helper to parse CSV simply. 
   * (Does not handle commas inside quotes perfectly, but sufficient for our Logger CSV).
   */
  parseCSV(csvStr) {
    const lines = csvStr.split(/\r?\n/);
    const result = [];
    for (let i = 1; i < lines.length; i++) { // skip header
      if (!lines[i].trim()) continue;
      // split by comma
      const cols = lines[i].split(",");
      result.push(cols);
    }
    return result;
  },

  /**
   * Check if user completed the captcha in the last 10 hours via Logger CSV.
   */
  async hasCompletedRecently(email) {
    try {
      // Append random param to bypass browser cache
      const res = await fetch(`${this.LOGGER_CSV_URL}&_t=${Date.now()}`);
      if (!res.ok) return false;
      
      const text = await res.text();
      const rows = this.parseCSV(text);
      
      // Look for action: "Prove Human Classification"
      // Timestamp (col 0), Email (col 1), Course Name (col 2), Folder Name (col 3)
      let latestTime = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;
        const rowEmail = row[1].trim().toLowerCase();
        const rowFolder = row[3].trim();
        
        if (rowEmail === email && rowFolder === "Prove Human Classification") {
          // parse timestamp (e.g., 09/06/2026 21:28:08 or similar)
          // Simple heuristic: just parse via Date (might be locale dependent, but best effort)
          // To be safe, we split DD/MM/YYYY HH:mm:ss if it's formatted like that.
          let tsStr = row[0].trim();
          let timeValue = Date.parse(tsStr);
          
          if (isNaN(timeValue)) {
            // Try swapping DD/MM to MM/DD if needed
            const parts = tsStr.split(" ");
            if (parts.length > 0) {
              const dateParts = parts[0].split("/");
              if (dateParts.length === 3) {
                // assume DD/MM/YYYY
                timeValue = Date.parse(`${dateParts[1]}/${dateParts[0]}/${dateParts[2]} ${parts[1] || ""}`);
              }
            }
          }

          if (!isNaN(timeValue) && timeValue > latestTime) {
            latestTime = timeValue;
          }
        }
      }

      const tenHoursMs = 10 * 60 * 60 * 1000;
      return (Date.now() - latestTime) < tenHoursMs;
      
    } catch (err) {
      console.warn("[BASH Gender] Could not fetch/parse logger CSV:", err);
      // Fallback: If we fail to read CSV, assume we should NOT prompt to avoid spamming
      return true;
    }
  },

  /**
   * Main gate-keeper check
   */
  async checkVerification(email) {
    if (!email || email === "anonymous") return;
    
    const url = BASH_CONFIG.GENDER_CLASSIFIER_URL;
    if (!url) {
      console.warn("[BASH Gender] GENDER_CLASSIFIER_URL is empty. Skipping gender verification.");
      return;
    }

    // 1. Check Cooling Period using Logger CSV
    const recentlyCompleted = await this.hasCompletedRecently(email);
    if (recentlyCompleted) {
      console.log("[BASH Gender] Completed recently according to Logger. Skipping.");
      return;
    }

    this.fetchAndShowCaptcha(email, url);
  },

  async fetchAndShowCaptcha(email, url) {
    // 2. Fetch Unclassified Names + Honeypot
    try {
      const size = BASH_CONFIG.GENDER_CAPTCHA_SIZE || 6;
      const checkUrl = `${url}?action=check&size=${size}&email=${encodeURIComponent(email)}`;
      const response = await fetch(checkUrl);
      if (!response.ok) return;

      const res = await response.json();
      if (res.success && res.needsClassification && res.names && res.names.length > 0) {
        // The backend now provides the targetGender that matches the honeypot
        const targetGender = res.targetGender || "Female";
        this.showModal(targetGender, res.names);
      } else {
         console.log("[BASH Gender] No names need classification.", res.message);
      }
    } catch (err) {
      console.error("[BASH Gender] Failed to fetch unclassified names:", err);
    }
  },

  async handleGenderSubmit() {
    const email = BASH.getUserEmail();
    const submitBtn = document.getElementById("genderSubmitBtn");
    const errEl = document.getElementById("genderModalError");
    const url = BASH_CONFIG.GENDER_CLASSIFIER_URL;

    if (!email || email === "anonymous" || !this.targetGender || !url) return;

    // The user MUST select at least 1 known honeypot
    const selectedCount = document.querySelectorAll(".gender-option-card.active").length;
    if (selectedCount === 0) {
      if (errEl) {
        errEl.textContent = "Please select at least 1 image.";
        errEl.style.display = "block";
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying...";
    }
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }

    // Determine the opposite gender
    const oppositeGender = this.targetGender === "Female" ? "Male" : "Female";

    // Build payload array
    const classifications = [];
    const cards = document.querySelectorAll(".gender-option-card");
    
    cards.forEach(card => {
      const idx = card.dataset.index;
      const isSelected = card.classList.contains("active");
      const assignedGender = isSelected ? this.targetGender : oppositeGender;
      
      classifications.push({
        row: this.namesData[idx].row,
        gender: assignedGender
      });
    });

    try {
      // Send batch classification
      const submitUrl = `${url}?action=submit&email=${encodeURIComponent(email)}&payload=${encodeURIComponent(JSON.stringify(classifications))}`;
      const response = await fetch(submitUrl);
      
      if (!response.ok) throw new Error("HTTP connection failed");

      const res = await response.json();
      if (res.success) {
        this.hideModal();
        
        // Log to BASH Logger to record the "Prove Human Classification" event
        // CourseName="Security", FolderName="Prove Human Classification"
        if (window.BASH && typeof window.BASH.logEvent === "function") {
           BASH.logEvent("Prove Human Classification", "Security", `Target: ${this.targetGender}`, `Count: ${classifications.length}`);
        }

      } else {
        // Validation Failed (e.g. Honeypot check failed)
        throw new Error(res.error || "Verification failed");
      }
    } catch (err) {
      console.error("[BASH Gender] Submission error:", err);
      if (errEl) {
        errEl.textContent = "Verification failed. Please try again.";
        errEl.style.display = "block";
      }
      
      // Auto-retry to fetch new names
      submitBtn.textContent = "Loading...";
      setTimeout(() => {
        this.fetchAndShowCaptcha(email, url);
      }, 1500);
    }
  }
};

// Initialize the gender classification module layout on DOM load
document.addEventListener("DOMContentLoaded", () => BASH_GENDER.init());
