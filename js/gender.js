// BASH Gender Classification Module - reCAPTCHA Style
// All settings are controlled remotely via the notARobot config Google Sheet.
const BASH_GENDER = {
  targetGender: null,
  namesData: [],
  _delayTimer: null,
  _remoteConfig: null, // cached remote config

  // URL to the published logger CSV
  LOGGER_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAKxuUcidPiW_Tj1HtGySIKmlbm86N4Eh_qDw7QhsvDzJ-aAHSysjPZcmPJwGYpFrvKglKFb_5TK_L/pub?gid=853917613&single=true&output=csv",

  // Default values (overridden by remote config)
  DEFAULTS: {
    totalNames: 6,
    sameGenderHoneypots: 1,
    otherGenderHoneypots: 1,
    delayAfterOpenSec: 10,
    cooldownHours: 10
  },

  init() {
    this.setupModalMarkup();
  },

  // ──────────────────────────────────────────────
  //  Remote Config Loader
  // ──────────────────────────────────────────────

  /**
   * Fetch and parse the notARobot config sheet.
   * Returns an object with parsed settings.
   */
  async loadRemoteConfig() {
    if (this._remoteConfig) return this._remoteConfig;

    const csvUrl = BASH_CONFIG.NOTAROBOT_CONFIG_CSV;
    if (!csvUrl) {
      console.warn("[BASH Gender] NOTAROBOT_CONFIG_CSV is empty. Using defaults.");
      this._remoteConfig = { ...this.DEFAULTS };
      return this._remoteConfig;
    }

    try {
      const res = await fetch(`${csvUrl}&_t=${Date.now()}`);
      if (!res.ok) throw new Error("HTTP " + res.status);

      const text = await res.text();
      const lines = text.split(/\r?\n/);
      const config = { ...this.DEFAULTS };

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        // Split only on first comma (value might contain commas)
        const sepIdx = lines[i].indexOf(",");
        if (sepIdx === -1) continue;
        const key = lines[i].substring(0, sepIdx).trim().toLowerCase();
        const val = lines[i].substring(sepIdx + 1).trim();

        const parsedInt = parseInt(val, 10);

        if (key.includes("total names")) {
          config.totalNames = !isNaN(parsedInt) ? parsedInt : this.DEFAULTS.totalNames;
        } else if (key.includes("same gender")) {
          config.sameGenderHoneypots = !isNaN(parsedInt) ? parsedInt : this.DEFAULTS.sameGenderHoneypots;
        } else if (key.includes("other gender")) {
          config.otherGenderHoneypots = !isNaN(parsedInt) ? parsedInt : this.DEFAULTS.otherGenderHoneypots;
        } else if (key.includes("delay after opening") || key.includes("delay after open")) {
          config.delayAfterOpenSec = !isNaN(parsedInt) ? parsedInt : this.DEFAULTS.delayAfterOpenSec;
        } else if (key.includes("fill") || key.includes("clasification") || key.includes("classification")) {
          config.cooldownHours = !isNaN(parsedInt) ? parsedInt : this.DEFAULTS.cooldownHours;
        }
      }

      console.log("[BASH Gender] Remote config loaded:", config);
      this._remoteConfig = config;
      return config;

    } catch (err) {
      console.warn("[BASH Gender] Failed to load remote config, using defaults:", err);
      this._remoteConfig = { ...this.DEFAULTS };
      return this._remoteConfig;
    }
  },

  // ──────────────────────────────────────────────
  //  Modal Setup
  // ──────────────────────────────────────────────

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
        const email = typeof BASH !== "undefined" ? BASH.getUserEmail() : null;
        if (email && email !== "anonymous") {
          reloadBtn.classList.add("spinning");
          
          // Make UI feel faster by immediately clearing grid and showing loading state
          const grid = document.getElementById("genderOptionsGrid");
          const title = document.getElementById("genderTargetTitle");
          const submitBtn = document.getElementById("genderSubmitBtn");
          if (grid) grid.innerHTML = `<div style="grid-column: span 3; text-align: center; padding: 20px; color: #64748b;">Loading new names...</div>`;
          if (title) title.textContent = "Loading...";
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Loading...";
          }
          
          this.fetchAndShowCaptcha(email, BASH_CONFIG.GENDER_CLASSIFIER_URL);
        }
      });
    }
  },

  // ──────────────────────────────────────────────
  //  Modal Show / Hide
  // ──────────────────────────────────────────────

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

  // ──────────────────────────────────────────────
  //  CSV Parsing & Cooling Period
  // ──────────────────────────────────────────────

  parseCSV(csvStr) {
    const lines = csvStr.split(/\r?\n/);
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(",");
      result.push(cols);
    }
    return result;
  },

  /**
   * Check if user completed the captcha within the cooling period via Logger CSV.
   * The cooling period (in hours) comes from remote config.
   */
  async hasCompletedRecently(email, cooldownHours) {
    try {
      const res = await fetch(`${this.LOGGER_CSV_URL}&_t=${Date.now()}`);
      if (!res.ok) return false;

      const text = await res.text();
      const rows = this.parseCSV(text);

      let latestTime = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;
        const rowEmail = row[1].trim().toLowerCase();
        const rowCourse = row[2].trim();
        
        if (rowEmail === email && rowCourse === "Prove Human Classification") {
          let tsStr = row[0].trim();
          let timeValue = Date.parse(tsStr);

          if (isNaN(timeValue)) {
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

      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      return (Date.now() - latestTime) < cooldownMs;

    } catch (err) {
      console.warn("[BASH Gender] Could not fetch/parse logger CSV:", err);
      return true;
    }
  },

  // ──────────────────────────────────────────────
  //  Main Entry Point
  // ──────────────────────────────────────────────

  /**
   * Main gate-keeper check.
   * 1. Load remote config from Google Sheet
   * 2. Check cooling period via Logger CSV
   * 3. Wait the configured delay, then show captcha
   */
  async checkVerification(email) {
    if (!email || email === "anonymous") return;

    const url = BASH_CONFIG.GENDER_CLASSIFIER_URL;
    if (!url) {
      console.warn("[BASH Gender] GENDER_CLASSIFIER_URL is empty. Skipping.");
      return;
    }

    // 1. Load remote config
    const cfg = await this.loadRemoteConfig();

    // 2. Check Cooling Period using Logger CSV
    const recentlyCompleted = await this.hasCompletedRecently(email, cfg.cooldownHours);
    if (recentlyCompleted) {
      console.log(`[BASH Gender] Completed within last ${cfg.cooldownHours}h. Skipping.`);
      return;
    }

    // 3. Wait the configured delay before showing captcha
    const delaySec = cfg.delayAfterOpenSec;
    console.log(`[BASH Gender] Will show captcha in ${delaySec} seconds...`);
    if (this._delayTimer) clearTimeout(this._delayTimer);
    this._delayTimer = setTimeout(() => {
      this.fetchAndShowCaptcha(email, url);
    }, delaySec * 1000);
  },

  // ──────────────────────────────────────────────
  //  Fetch Names & Show Captcha
  // ──────────────────────────────────────────────

  async fetchCaptchaData(email, url) {
    const cfg = this._remoteConfig || this.DEFAULTS;
    const size = cfg.totalNames;
    const sameHP = cfg.sameGenderHoneypots;
    const otherHP = cfg.otherGenderHoneypots;

    // Add a random timestamp parameter (_t) to prevent the browser from caching the GET request!
    const checkUrl = `${url}?action=check&size=${size}&sameHP=${sameHP}&otherHP=${otherHP}&email=${encodeURIComponent(email)}&_t=${Date.now()}`;
    const response = await fetch(checkUrl);
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  },

  async prefetchCaptcha(email, url) {
    if (this._isPrefetching || this.prefetchedData) return;
    this._isPrefetching = true;
    try {
      const res = await this.fetchCaptchaData(email, url);
      if (res.success && res.needsClassification && res.names && res.names.length > 0) {
        this.prefetchedData = res;
        console.log("[BASH Gender] Successfully prefetched backup names.");
      }
    } catch(err) {
      console.warn("[BASH Gender] Prefetch failed:", err);
    } finally {
      this._isPrefetching = false;
    }
  },

  async fetchAndShowCaptcha(email, url) {
    try {
      let res = null;
      if (this.prefetchedData) {
        res = this.prefetchedData;
        this.prefetchedData = null; // consume it
        console.log("[BASH Gender] Used instantly from prefetch cache.");
      } else {
        res = await this.fetchCaptchaData(email, url);
      }

      if (res && res.success && res.needsClassification && res.names && res.names.length > 0) {
        const targetGender = res.targetGender || "Female";
        this.showModal(targetGender, res.names);
        
        // Trigger background prefetch for the next reload
        this.prefetchCaptcha(email, url);
      } else {
        console.log("[BASH Gender] No names need classification.", res?.message);
        const reloadBtn = document.getElementById("genderReloadBtn");
        if (reloadBtn) reloadBtn.classList.remove("spinning");
      }
    } catch (err) {
      console.error("[BASH Gender] Failed to fetch unclassified names:", err);
      const reloadBtn = document.getElementById("genderReloadBtn");
      if (reloadBtn) reloadBtn.classList.remove("spinning");
    }
  },

  // ──────────────────────────────────────────────
  //  Submit Handler
  // ──────────────────────────────────────────────

  async handleGenderSubmit() {
    const email = BASH.getUserEmail();
    const submitBtn = document.getElementById("genderSubmitBtn");
    const errEl = document.getElementById("genderModalError");
    const url = BASH_CONFIG.GENDER_CLASSIFIER_URL;

    if (!email || email === "anonymous" || !this.targetGender || !url) return;

    // Must select at least 1 card
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

    const oppositeGender = this.targetGender === "Female" ? "Male" : "Female";

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
      const submitUrl = `${url}?action=submit&email=${encodeURIComponent(email)}&payload=${encodeURIComponent(JSON.stringify(classifications))}`;
      const response = await fetch(submitUrl);

      if (!response.ok) throw new Error("HTTP connection failed");

      const res = await response.json();
      if (res.success) {
        this.hideModal();

        // Log "Prove Human Classification" to the BASH Logger
        if (typeof BASH !== "undefined" && typeof BASH.logDriveClick === "function") {
          BASH.logDriveClick(email, "Prove Human Classification", "Security", `Target: ${this.targetGender} | Count: ${classifications.length}`);
        }
      } else {
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
