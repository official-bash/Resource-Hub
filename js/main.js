const BASH = {
  currentPage: "courses",
  data: {
    courses: null,
    exams: null,
    books: null,
    tasks: null,
    contributors: null,
  },

  contributorDetailId: null,

  // Store filter states for pages with multiple filter groups
  filterState: {
    type: "all",
    semester: "all",
  },

  previousState: null,
  breadcrumbPath: [],

  init() {
    this.pendingDriveOpen = null;
    this.loadNavigation();
    this.setupTasksButton();
    this.setupContactTopButton();
    this.setupBackKeyHandler();
    Notification.setupNotificationButton();
    this.setupContributeButton();
    this.applyHashRoute();
    window.addEventListener("hashchange", () => this.applyHashRoute());
    const initialHash = (window.location.hash || "").replace(/^#/, "");
    if (!initialHash) {
      this.loadPage("courses");
    }
    this.setupSearch();
    this.updateBadges();
  },

  hasStoredEmail() {
    try {
      const email = localStorage.getItem("bash_user_email");
      return !!(email && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
    } catch {
      return false;
    }
  },

  getUserEmail() {
    if (!this.hasStoredEmail()) return "anonymous";
    try {
      return localStorage.getItem("bash_user_email").trim();
    } catch {
      return "anonymous";
    }
  },

  saveUserEmail(email) {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
    try {
      localStorage.setItem("bash_user_email", trimmed);
      this.updateEmailTopBar();
      return true;
    } catch {
      return false;
    }
  },

  initUserEmailFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      const email = params.get("bash_email") || params.get("email");
      if (email) this.saveUserEmail(email);
      const clean = window.location.pathname + (window.location.hash || "");
      history.replaceState({}, "", clean);
    }
  },

  onEmailVerified(email) {
    return this.saveUserEmail(email);
  },

  async fetchVerifiedEmailSet() {
    if (this._verifiedEmailSet) return this._verifiedEmailSet;
    const url = BASH_CONFIG.VERIFIED_EMAILS;
    if (!url) return null;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const csv = await response.text();
      const emails = new Set();
      csv
        .trim()
        .split("\n")
        .slice(1)
        .forEach((line) => {
          const match = line.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/i);
          if (match) emails.add(match[0].toLowerCase());
        });
      this._verifiedEmailSet = emails;
      return emails;
    } catch {
      return null;
    }
  },

  async verifyAndSaveEmail(email) {
    const trimmed = (email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;

    const allowed = await this.fetchVerifiedEmailSet();
    if (allowed && allowed.size > 0 && !allowed.has(trimmed)) {
      return false;
    }

    return this.saveUserEmail(trimmed);
  },

  setupEmailModal() {
    if (document.getElementById("emailGateModal")) return;

    const modal = document.createElement("div");
    modal.id = "emailGateModal";
    modal.className = "tasks-modal email-gate-modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-overlay" id="emailGateOverlay"></div>
      <div class="modal-container email-gate-container">
        <div class="modal-header">
          <h2>Enter your email</h2>
          <button class="modal-close" id="emailGateClose" type="button" title="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-content">
          <p class="email-gate-desc">
            Use the same email you submitted on the
            <a href="${BASH_CONFIG.REGISTER_FORM}" target="_blank" rel="noopener noreferrer">registration form</a>.
            This is required to open course materials and for activity logging.
          </p>
          <input type="email" id="emailGateInput" class="email-gate-input"
            placeholder="you@university.edu" autocomplete="email" required>
          <p id="emailGateError" class="email-gate-error" style="display:none;"></p>
          <button type="button" id="emailGateSubmit" class="register-btn-top email-gate-submit">
            Continue
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const submit = () => this.handleEmailGateSubmit();
    document.getElementById("emailGateSubmit").addEventListener("click", submit);
    document.getElementById("emailGateInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    document.getElementById("emailGateClose").addEventListener("click", () => {
      this.hideEmailModal();
    });
    document.getElementById("emailGateOverlay").addEventListener("click", () => {
      if (!this.pendingDriveOpen) this.hideEmailModal();
    });
  },

  showEmailGateError(message) {
    const err = document.getElementById("emailGateError");
    if (err) {
      err.textContent = message;
      err.style.display = message ? "block" : "none";
    }
  },

  async handleEmailGateSubmit() {
    const input = document.getElementById("emailGateInput");
    const value = input ? input.value : "";
    this.showEmailGateError("");

    const ok = await this.verifyAndSaveEmail(value);
    if (!ok) {
      const msg = BASH_CONFIG.VERIFIED_EMAILS
        ? "Email not found. Register first, then use the same address here."
        : "Enter a valid email address.";
      this.showEmailGateError(msg);
      return;
    }

    this.hideEmailModal();
    if (this.pendingDriveOpen) {
      const { driveLink, courseName, folderName } = this.pendingDriveOpen;
      this.pendingDriveOpen = null;
      this.logDriveClick(this.getUserEmail(), courseName, folderName, driveLink);
      window.open(driveLink, "_blank");
    }
  },

  showEmailModal(forDriveClick) {
    const modal = document.getElementById("emailGateModal");
    const input = document.getElementById("emailGateInput");
    if (!modal) return;

    if (forDriveClick) {
      modal.classList.add("email-gate-modal--required");
    } else {
      modal.classList.remove("email-gate-modal--required");
    }

    if (input) {
      input.value = this.hasStoredEmail() ? this.getUserEmail() : "";
    }
    this.showEmailGateError("");
    modal.style.display = "flex";
    if (input) input.focus();
  },

  hideEmailModal() {
    const modal = document.getElementById("emailGateModal");
    if (modal) modal.style.display = "none";
    if (!this.pendingDriveOpen) return;
    this.pendingDriveOpen = null;
  },

  setupEmailTopBar() {
    const actions = document.querySelector(".top-bar-actions");
    if (!actions || document.getElementById("emailTopBtn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "emailTopBtn";
    btn.className = "icon-btn email-top-btn";
    btn.title = "Your email";
    btn.innerHTML = '<i class="fas fa-envelope"></i>';
    btn.addEventListener("click", () => this.showEmailModal(false));

    const registerBtn = document.getElementById("registerTopBtn");
    if (registerBtn) {
      actions.insertBefore(btn, registerBtn.nextSibling);
    } else {
      actions.prepend(btn);
    }
    this.updateEmailTopBar();
  },

  updateEmailTopBar() {
    const btn = document.getElementById("emailTopBtn");
    if (!btn) return;
    if (this.hasStoredEmail()) {
      const email = this.getUserEmail();
      btn.title = email;
      btn.classList.add("email-top-btn--set");
    } else {
      btn.title = "Add your email";
      btn.classList.remove("email-top-btn--set");
    }
  },

  ensureEmailForDriveClick(driveLink, courseName, folderName) {
    // Email collection is disabled; always allow the click.
    return true;
  },

  isLoggerDebug() {
    try {
      return localStorage.getItem("bash_debug") === "1";
    } catch {
      return false;
    }
  },

  logDriveClick(email, courseName, folderName, driveLink) {
    const loggerUrl = BASH_CONFIG.LOGGER_URL;
    if (!loggerUrl || !driveLink) return;

    const params = new URLSearchParams({
      email: email || "anonymous",
      courseName: courseName || "",
      folderName: folderName || "",
      driveLink: driveLink || "",
    });

    const url = `${loggerUrl}?${params.toString()}`;
    const debug = this.isLoggerDebug();

    if (debug) {
      console.log("[BASH Logger] sending", {
        email,
        courseName,
        folderName,
        driveLink,
      });
    }

    try {
      fetch(url, { mode: "no-cors", keepalive: true }).catch((err) => {
        if (debug) console.warn("[BASH Logger] fetch failed", err);
      });
    } catch (err) {
      if (debug) console.warn("[BASH Logger] fetch error", err);
    }

    try {
      const img = new Image();
      img.onerror = () => {
        if (debug) console.warn("[BASH Logger] image beacon failed", url);
      };
      img.onload = () => {
        if (debug) console.log("[BASH Logger] request dispatched", url);
      };
      img.src = url;
    } catch (err) {
      if (debug) console.warn("[BASH Logger] image beacon error", err);
    }
  },

  openDriveLink(driveLink, courseName, folderName) {
    if (!driveLink) return;
    if (!this.ensureEmailForDriveClick(driveLink, courseName, folderName)) return;

    // Check for multi-link format: "URL1 (label1), URL2 (label2)"
    const multiLinks = this.parseMultiLinks(driveLink);
    if (multiLinks) {
      this.showMultiLinkModal(multiLinks, courseName, folderName);
      return;
    }

    this.logDriveClick(this.getUserEmail(), courseName, folderName, driveLink);
    window.open(driveLink, "_blank");
  },

  escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  },

  /**
   * Parses a multi-link cell value like "URL1 (2021), URL2 (2022)"
   * Returns array of {url, label} if multiple links found, otherwise null.
   */
  parseMultiLinks(text) {
    if (!text || typeof text !== "string") return null;
    const pattern = /(\S+)\s*\(([^)]+)\)/g;
    const links = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      links.push({ url: match[1], label: match[2].trim() });
    }
    return links.length > 1 ? links : null;
  },

  /**
   * Returns a label string like " (2021, 2022)" for multi-link values,
   * or empty string for single links.
   */
  multiLinkLabel(text) {
    const links = this.parseMultiLinks(text);
    if (!links) return "";
    return " (" + links.map((l) => l.label).join(", ") + ")";
  },

  setupDriveLinkHandlers(container) {
    if (!container) return;
    container.querySelectorAll("[data-drive-link]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const link = el.getAttribute("data-drive-link") || "";
        this.openDriveLink(
          link,
          el.dataset.courseName || "",
          el.dataset.folderName || "",
        );
      });
    });
  },

  getActiveCourseName() {
    const course = this.breadcrumbPath.find((p) => p.action === "course");
    return course ? course.name : "";
  },

  setupContributeButton() {
    const contributeNavBtn = document.getElementById("contributeNavBtn");
    if (contributeNavBtn) {
      contributeNavBtn.addEventListener("click", () => {
        this.navigateTo("contribute");
      });
    }
  },

  setupContactTopButton() {
    const contactTopBtn = document.getElementById("contactTopBtn");
    if (contactTopBtn) {
      contactTopBtn.addEventListener("click", () => {
        this.navigateTo("contact");
      });
    }
  },

  async updateBadges() {
    // Contribute badge
    try {
      const exams = this.data.exams || (await this.fetchExams());
      let missing = 0;
      if (exams && exams.length > 0) {
        exams.forEach((exam) => {
          if (!exam.mid_link) missing++;
          if (!exam.final_link) missing++;
          if (!exam.book_link) missing++;
          if (!exam.outline_link) missing++;
          if (!exam.lecture_notes_link) missing++;
        });
      }
      const contributeBadge = document.getElementById("contributeBadge");
      if (contributeBadge) {
        contributeBadge.textContent = missing;
        contributeBadge.style.display = missing > 0 ? "flex" : "none";
      }
    } catch (e) {
      console.error("Failed to update contribute badge", e);
    }

    // Update notifications badge
    await Notification.updateNotificationBadge();
  },

  loadNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });
  },

  setupTasksButton() {
    const fabTasks = document.getElementById("fabTasks");
    if (!fabTasks || fabTasks.classList.contains("visually-hidden")) return;
    fabTasks.addEventListener("click", () => {
      this.openTasksModal();
    });
  },

  openTasksModal() {
    // Check if modal already exists
    let modal = document.getElementById("tasksModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "tasksModal";
      modal.className = "tasks-modal";
      modal.innerHTML = `
                <div class="modal-overlay" id="modalOverlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>📋 Tasks & Challenges</h2>
                        <button class="modal-close" id="modalClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-content" id="tasksModalContent"></div>
                </div>
            `;
      document.body.appendChild(modal);

      // Setup close button and overlay click
      document.getElementById("modalClose").addEventListener("click", () => {
        this.closeTasksModal();
      });
      document.getElementById("modalOverlay").addEventListener("click", () => {
        this.closeTasksModal();
      });
    }

    // Show modal and load tasks
    modal.style.display = "flex";
    this.loadTasksInModal();
  },

  closeTasksModal() {
    const modal = document.getElementById("tasksModal");
    if (modal) {
      modal.style.display = "none";
    }
  },

  loadTasksInModal() {
    this.fetchTasks().then(() => {
      this.renderTasksModal();
    });
  },

  renderTasksModal() {
    const tasks = this.data.tasks || [];
    const modalContent = document.getElementById("tasksModalContent");

    if (this.tasksError) {
      modalContent.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Unable to Load Tasks</h3>
                    <p>${this.tasksError}</p>
                </div>
            `;
      return;
    }

    if (!tasks || tasks.length === 0) {
      modalContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No Tasks Found</h3>
                    <p>Tasks will appear here once the data source is configured.</p>
                </div>
            `;
      return;
    }

    let html = '<div id="tasksContainer">';

    tasks.forEach((task) => {
      const isExpired = new Date(task.deadline) < new Date();

      html += `
                <div class="task-card fade-in" data-title="${task.title.toLowerCase()}" data-status="${isExpired ? "expired" : "active"}">
                    <div class="task-title">${task.title}</div>
                    <div class="task-desc">${task.description}</div>
                    <div class="task-meta">
                        <span class="task-reward">
                            <i class="fas fa-gift"></i> ${task.reward}
                        </span>
                        <span class="task-deadline ${isExpired ? "expired" : ""}">
                            <i class="fas fa-clock"></i> ${isExpired ? "Expired: " : "Due: "}${task.deadline}
                        </span>
                    </div>
                </div>
            `;
    });

    html += "</div>";
    modalContent.innerHTML = html;
  },

  navigateTo(page, options = {}) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    const contributeNavBtn = document.getElementById("contributeNavBtn");
    if (contributeNavBtn) {
      contributeNavBtn.classList.toggle("active", page === "contribute");
    }

    const contactTopBtn = document.getElementById("contactTopBtn");
    if (contactTopBtn) {
      contactTopBtn.classList.toggle("active", page === "contact");
    }

    this.currentPage = page;
    if (page !== "contribute") {
      this.contributorDetailId = null;
    } else {
      const hash = (window.location.hash || "").replace(/^#/, "");
      const detailMatch = hash.match(/^contribute\/([^/]+)$/);
      this.contributorDetailId = detailMatch
        ? decodeURIComponent(detailMatch[1])
        : null;
    }
    this.breadcrumbPath = [];
    this.filterState = { type: "all", semester: "all" };

    if (!options.skipHash) {
      if (page === "contribute" && this.contributorDetailId) {
        history.replaceState(
          {},
          "",
          `#contribute/${encodeURIComponent(this.contributorDetailId)}`,
        );
      } else {
        history.replaceState({}, "", `#${page}`);
      }
    }

    this.loadPage(page);
    this.updateFilters(page);
    document.getElementById("searchInput").value = "";
  },

  loadPage(page) {
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML =
      '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i></div>';

    setTimeout(() => {
      switch (page) {
        case "courses":
          this.renderCoursesPage();
          break;
        case "exams":
          this.renderExamsPage();
          break;
        case "books-outline":
          this.renderBooksOutlinePage();
          break;
        case "lecture-notes":
          this.renderLectureNotesPage();
          break;
        case "contribute":
          this.renderContributePage();
          break;
        case "contact":
          this.renderContactPage();
          break;
      }
    }, 200);
  },

  setupSearch() {
    const searchInput = document.getElementById("searchInput");
    let debounceTimer;

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.handleSearch(searchInput.value);
      }, 300);
    });

    // Handle Enter key for immediate search
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        clearTimeout(debounceTimer);
        this.handleSearch(searchInput.value);
      }
    });
  },

  applyHashRoute() {
    const hash = (window.location.hash || "").replace(/^#/, "");
    const contributeMatch = hash.match(/^contribute\/([^/]+)$/);
    if (contributeMatch) {
      this.contributorDetailId = decodeURIComponent(contributeMatch[1]);
      this.navigateTo("contribute", { skipHash: true });
      return;
    }
    if (hash === "contribute" && this.contributorDetailId) {
      this.contributorDetailId = null;
      if (this.currentPage === "contribute") {
        this.renderContributePage();
      }
      return;
    }
    if (hash && !contributeMatch) {
      const page = hash.split("/")[0];
      if (
        ["courses", "exams", "books-outline", "lecture-notes", "contact", "contribute"].includes(
          page,
        )
      ) {
        this.contributorDetailId = null;
        this.navigateTo(page, { skipHash: true });
      }
    }
  },

  setupBackKeyHandler() {
    // Handle back button on mobile and browser back navigation
    window.addEventListener("popstate", (event) => {
      if (this.currentPage === "contribute" && this.contributorDetailId) {
        event.preventDefault();
        this.contributorDetailId = null;
        history.replaceState({}, "", "#contribute");
        this.renderContributePage();
        return;
      }

      // Check if we're currently in courses section with breadcrumb navigation
      if (this.currentPage === "courses" && this.breadcrumbPath.length > 0) {
        // Move back one step in the breadcrumb path
        event.preventDefault();
        const lastItem = this.breadcrumbPath[this.breadcrumbPath.length - 1];
        this.breadcrumbPath.pop();

        if (this.breadcrumbPath.length === 0) {
          // Go back to semester list
          this.renderCoursesPage();
        } else {
          // Go back to the previous level
          const prevItem = this.breadcrumbPath[this.breadcrumbPath.length - 1];
          if (prevItem.action === "semester") {
            this.openSemester(prevItem.data, false);
          } else if (prevItem.action === "course") {
            this.openCourse(prevItem.data, false);
          }
        }
      }
    });
  },

  handleSearch(query) {
    query = query.toLowerCase().trim();

    switch (this.currentPage) {
      case "courses":
        this.filterCourses(query, this.filterState.type);
        break;
      case "exams":
        this.filterExams(query, this.filterState);
        break;
      case "books-outline":
        this.filterBooksOutline(query, this.filterState);
        break;
      case "lecture-notes":
        this.filterLectureNotes(query, this.filterState);
        break;
      case "contribute":
        this.filterContribution(query, this.filterState.type);
        break;
    }
  },

  updateFilters(page) {
    const filterBar = document.getElementById("filterBar");
    if (!filterBar) return;

    const filterGroups = this.getFiltersForPage(page);

    // If no filters for this page, hide the filter bar
    if (!filterGroups || filterGroups.length === 0) {
      filterBar.style.display = "none";
      return;
    }

    filterBar.style.display = "block";
    filterBar.innerHTML = "";

    filterGroups.forEach((group) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "filter-group";

      group.filters.forEach((filter, index) => {
        const chip = document.createElement("div");
        chip.className = "filter-chip" + (index === 0 ? " active" : "");
        chip.dataset.filter = filter.value;
        chip.dataset.group = group.name;
        chip.textContent = filter.label;
        chip.addEventListener("click", () => {
          this.handleFilterClick(chip, group.name);
        });
        groupDiv.appendChild(chip);
      });

      filterBar.appendChild(groupDiv);
    });
  },

  handleFilterClick(chip, groupName) {
    // Deactivate other chips in the same group
    const group = chip.parentElement;
    group
      .querySelectorAll(".filter-chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    // Update filter state
    this.filterState[groupName] = chip.dataset.filter;

    document.getElementById("searchInput").value = "";
    this.handleSearch("");
  },

  getFiltersForPage(page) {
    switch (page) {
      case "courses":
        return [
          {
            name: "type",
            filters: [
              { label: "All", value: "all" },
              { label: "Folders", value: "folder" },
              { label: "Files", value: "file" },
            ],
          },
        ];
      case "exams":
        // Get unique semesters from data
        const examSemesters = this.getUniqueSemesters(this.data.exams || []);
        return [
          {
            name: "type",
            filters: [
              { label: "All", value: "all" },
              { label: "Mid Term", value: "mid" },
              { label: "Final", value: "final" },
            ],
          },
          {
            name: "semester",
            filters: [
              { label: "All Semesters", value: "all" },
              ...examSemesters.map((sem) => ({
                label: `Semester ${sem}`,
                value: sem,
              })),
            ],
          },
        ];
      case "books-outline":
        // Get unique semesters from data
        const bookSemesters = this.getUniqueSemesters(this.data.exams || []);
        return [
          {
            name: "type",
            filters: [
              { label: "All", value: "all" },
              { label: "Book", value: "book" },
              { label: "Course Outline", value: "outline" },
            ],
          },
          {
            name: "semester",
            filters: [
              { label: "All Semesters", value: "all" },
              ...bookSemesters.map((sem) => ({
                label: `Semester ${sem}`,
                value: sem,
              })),
            ],
          },
        ];
      case "lecture-notes":
        // Get unique semesters from data
        const noteSemesters = this.getUniqueSemesters(this.data.exams || []);
        return [
          {
            name: "type",
            filters: [
              { label: "All", value: "all" },
              { label: "Available", value: "available" },
              { label: "Missing", value: "missing" },
            ],
          },
          {
            name: "semester",
            filters: [
              { label: "All Semesters", value: "all" },
              ...noteSemesters.map((sem) => ({
                label: `Semester ${sem}`,
                value: sem,
              })),
            ],
          },
        ];
      case "contribute":
        return [
          {
            name: "type",
            filters: [
              { label: "All Missing", value: "all" },
              { label: "Exam Papers", value: "mid|final", hidden: true },
              { label: "Mid Missing", value: "mid" },
              { label: "Final Missing", value: "final" },
              { label: "Books Missing", value: "book" },
              { label: "Outlines Missing", value: "outline" },
              { label: "Notes Missing", value: "notes" },
            ],
          },
        ];
      default:
        return [];
    }
  },

  getUniqueSemesters(exams) {
    const semesters = [...new Set(exams.map((e) => e.semester))].sort();
    return semesters;
  },
};

// ── Multi-Link Selection Modal ──────────────────────────────
BASH.showMultiLinkModal = function (links, courseName, folderName) {
  // Remove existing modal if present
  let modal = document.getElementById("multiLinkModal");
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = "multiLinkModal";
  modal.className = "tasks-modal multi-link-modal";

  const linksHtml = links
    .map(
      (link) => `
    <div class="multi-link-item" data-url="${BASH.escapeAttr(link.url)}">
      <div class="multi-link-icon">
        <i class="fas fa-file-alt"></i>
      </div>
      <div class="multi-link-info">
        <div class="multi-link-name">${folderName}</div>
        <div class="multi-link-label">${link.label}</div>
      </div>
      <div class="multi-link-arrow">
        <i class="fas fa-external-link-alt"></i>
      </div>
    </div>
  `,
    )
    .join("");

  modal.innerHTML = `
    <div class="modal-overlay" id="multiLinkOverlay"></div>
    <div class="modal-container multi-link-container">
      <div class="modal-header">
        <h2>\uD83D\uDCC4 Select Version</h2>
        <button class="modal-close" id="multiLinkClose" type="button">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-content">
        <p class="multi-link-course">${courseName}</p>
        <div class="multi-link-list">${linksHtml}</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = "flex";

  document
    .getElementById("multiLinkClose")
    .addEventListener("click", () => BASH.closeMultiLinkModal());
  document
    .getElementById("multiLinkOverlay")
    .addEventListener("click", () => BASH.closeMultiLinkModal());

  modal.querySelectorAll(".multi-link-item").forEach((item) => {
    item.addEventListener("click", () => {
      const url = item.dataset.url;
      BASH.logDriveClick(BASH.getUserEmail(), courseName, folderName, url);
      window.open(url, "_blank");
      BASH.closeMultiLinkModal();
    });
  });
};

BASH.closeMultiLinkModal = function () {
  const modal = document.getElementById("multiLinkModal");
  if (modal) modal.remove();
};

document.addEventListener("DOMContentLoaded", () => BASH.init());
