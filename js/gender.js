// BASH Gender Classification Module - reCAPTCHA Style
const BASH_GENDER = {
  targetGender: null,
  namesData: [], // [{row: X, name: "Y"}]
  _delayTimer: null,
  
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
        <div class="modal-topbar">
          <i class="fas fa-shield-alt"></i>
          <span>Prove you are human</span>
        </div>
        <div class="modal-header">
          <div class="gender-modal-subtitle">Select all squares with</div>
          <h2 id="genderTargetTitle">Female names</h2>
        </div>
        <div class="modal-content">
          <div class="gender-options-grid" id="genderOptionsGrid">
            <!-- Cards rendered dynamically here -->
          </div>
          <div class="gender-modal-footer">
            <button type="button" id="genderReloadBtn" class="gender-action-btn" title="Get new names">
              <i class="fas fa-sync-alt"></i>
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
        if (email && email !== "anonymous") {
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
    const reloadBtn = document.getElementById("genderReloadBtn");

    title.textContent = `${targetGender} names`;

    // Stop reload spinner
    if (reloadBtn) reloadBtn.classList.remove("spinning");

    // Render cards
    grid.innerHTML = "";
    namesData.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "gender-option-card";
      card.dataset.index = index;
      card.innerHTML = `<div class="gender-option-label">${item.name}</div>`;
      
      card.addEventListener("click", () => {
        card.classList.toggle("active");
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

    // Smooth fade-in
    if (modal) {
      modal.style.display = "flex";
      modal.classList.remove("visible");
      // Force reflow so the transition plays
      void modal.offsetWidth;
      modal.classList.add("visible");
    }
  },

  hideModal() {
    const modal = document.getElementById("genderVerificationModal");
    if (modal) {
      modal.classList.remove("visible");
      setTimeout(() => { modal.style.display = "none"; }, 350);
    }
  },

  /**
   * Helper to parse CSV simply. 
   */
  parseCSV(csvStr) {
    const lines = csvStr.split(/\r?\n/);
    const result = [];
    for (let i = 1; i < lines.length; i++) { // skip header
      if (!lines[i].trim()) continue;
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
          let tsStr = row[0].trim();
          let timeValue = Date.parse(tsStr);
          
          if (isNaN(timeValue)) {
            // Try swapping DD/MM to MM/DD if needed
            const parts = tsStr.split(" ");
            if (parts.length > 0) {
              const dateParts = parts[0].split("/");
              if (dateParts.length === 3) {
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
      return true;
    }
  },

  /**
   * Main gate-keeper check.
   * Only triggered for verified/authorized emails after authentication.
   * Adds a 10-second delay so the user can settle in before the captcha appears.
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

    // 2. Wait 10 seconds before showing the captcha
    console.log("[BASH Gender] Will show captcha in 10 seconds...");
    if (this._delayTimer) clearTimeout(this._delayTimer);
    this._delayTimer = setTimeout(() => {
      this.fetchAndShowCaptcha(email, url);
    }, 10000);
  },

  async fetchAndShowCaptcha(email, url) {
    try {
      const size = BASH_CONFIG.GENDER_CAPTCHA_SIZE || 6;
      const checkUrl = `${url}?action=check&size=${size}&email=${encodeURIComponent(email)}`;
      const response = await fetch(checkUrl);
      if (!response.ok) return;

      const res = await response.json();
      if (res.success && res.needsClassification && res.names && res.names.length > 0) {
        const targetGender = res.targetGender || "Female";
        this.showModal(targetGender, res.names);
      } else {
         console.log("[BASH Gender] No names need classification.", res.message);
         // Stop reload spinner in case this was a reload
         const reloadBtn = document.getElementById("genderReloadBtn");
         if (reloadBtn) reloadBtn.classList.remove("spinning");
      }
    } catch (err) {
      console.error("[BASH Gender] Failed to fetch unclassified names:", err);
      const reloadBtn = document.getElementById("genderReloadBtn");
      if (reloadBtn) reloadBtn.classList.remove("spinning");
    }
  },

  async handleGenderSubmit() {
    const email = BASH.getUserEmail();
    const submitBtn = document.getElementById("genderSubmitBtn");
    const errEl = document.getElementById("genderModalError");
    const url = BASH_CONFIG.GENDER_CLASSIFIER_URL;

    if (!email || email === "anonymous" || !this.targetGender || !url) return;

    // The user MUST select at least 1 card
    const selectedCount = document.querySelectorAll(".gender-option-card.active").length;
    if (selectedCount === 0) {
      if (errEl) {
        errEl.textContent = "Please select at least 1 name.";
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
        if (window.BASH && typeof window.BASH.logEvent === "function") {
           BASH.logEvent("Prove Human Classification", "Security", `Target: ${this.targetGender}`, `Count: ${classifications.length}`);
        }

      } else {
        // Honeypot check failed
        throw new Error(res.error || "Verification failed");
      }
    } catch (err) {
      console.error("[BASH Gender] Submission error:", err);
      if (errEl) {
        errEl.textContent = "Verification failed. Try again.";
        errEl.style.display = "block";
      }
      
      // Auto-retry with new names after 1.5s
      if (submitBtn) submitBtn.textContent = "Loading...";
      setTimeout(() => {
        this.fetchAndShowCaptcha(email, url);
      }, 1500);
    }
  }
};

// Initialize the gender classification module layout on DOM load
document.addEventListener("DOMContentLoaded", () => BASH_GENDER.init());
