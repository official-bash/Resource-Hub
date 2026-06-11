// Notification Module
const Notification = {
  data: {
    notificationsCSV: null,
  },

  setupNotificationButton() {
    const notificationBtn = document.getElementById("notificationBtn");
    if (notificationBtn) {
      notificationBtn.addEventListener("click", () => {
        this.openNotificationsModal();
      });
    }

    const registerBtn = document.getElementById("registerTopBtn");
    if (registerBtn && BASH_CONFIG.REGISTER_FORM) {
      registerBtn.href = BASH_CONFIG.REGISTER_FORM;
    }
  },

  async updateNotificationBadge() {
    if (BASH_CONFIG.SHEETS.NOTIFICATIONS) {
      try {
        const response = await fetch(BASH_CONFIG.SHEETS.NOTIFICATIONS);
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.trim().split("\n");
          const count = lines.length > 1 ? lines.length - 1 : 0;
          const notifBadge = document.getElementById("notificationBadge");
          if (notifBadge) {
            notifBadge.textContent = count;
            notifBadge.style.display = count > 0 ? "flex" : "none";
          }
          this.data.notificationsCSV = csvText;
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    }
  },

  openNotificationsModal() {
    let modal = document.getElementById("notificationsModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "notificationsModal";
      modal.className = "tasks-modal";
      modal.innerHTML = `
                <div class="modal-overlay" id="notifModalOverlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>📢 Notifications</h2>
                        <button class="modal-close" id="notifModalClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-content" id="notificationsModalContent"></div>
                </div>
            `;
      document.body.appendChild(modal);

      document
        .getElementById("notifModalClose")
        .addEventListener("click", () => {
          modal.style.display = "none";
        });
      document
        .getElementById("notifModalOverlay")
        .addEventListener("click", () => {
          modal.style.display = "none";
        });

      document
        .getElementById("notificationsModalContent")
        .addEventListener("click", (e) => {
          const item = e.target.closest(".notif-item");
          if (!item || e.target.closest("a")) return;
          const expanded = item.classList.toggle("notif-item--expanded");
          const chevron = item.querySelector(".notif-item-chevron i");
          if (chevron) {
            chevron.className = expanded
              ? "fas fa-chevron-up"
              : "fas fa-chevron-down";
          }
          // Log notification click
          if (expanded) {
            const heading = item.querySelector(".notif-item-heading");
            BASH.logDriveClick(
              BASH.getUserEmail(),
              "Notification",
              `Opened: ${heading ? heading.textContent : "Unknown"}`,
              window.location.href
            );
          }
        });
    }

    modal.style.display = "flex";
    this.renderNotifications();
  },

  parseCSVLine(line) {
    // Match either:
    // 1. A quoted string (which can contain commas and spaces)
    // 2. An unquoted string (which can contain spaces but NO commas)
    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(",");
    return values.map((v) => v.replace(/^"|"$/g, "").trim());
  },

  getColumnValue(headers, values, ...names) {
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx !== -1 && values[idx]) return values[idx];
    }
    return "";
  },

  formatDisplayText(text) {
    return text.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  },

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  parseNotificationRow(headers, values) {
    let heading = this.getColumnValue(
      headers,
      values,
      "heading",
      "title",
    );
    let shortDescription = this.getColumnValue(
      headers,
      values,
      "short_description",
      "short description",
      "summary",
    );
    let detail = this.getColumnValue(
      headers,
      values,
      "detail",
      "details",
      "body",
    );
    const link = this.getColumnValue(
      headers,
      values,
      "link",
      "whatsapp",
      "url",
    );
    const date = this.getColumnValue(
      headers,
      values,
      "updated",
      "date_updated",
      "date",
    );

    const legacyMessage = this.getColumnValue(
      headers,
      values,
      "notification",
      "message",
    );

    if (!heading && legacyMessage) {
      heading = legacyMessage;
    }
    if (!heading && values[0]) {
      heading = values[0];
    }

    if (!detail && legacyMessage && legacyMessage !== heading) {
      detail = legacyMessage;
    }
    if (!detail) {
      detail = heading;
    }

    if (!shortDescription && detail && detail !== heading) {
      shortDescription =
        detail.length > 100 ? detail.slice(0, 97) + "..." : detail;
    }

    return {
      heading: this.formatDisplayText(heading || "Notification"),
      shortDescription: shortDescription
        ? this.formatDisplayText(shortDescription)
        : "",
      detail: this.formatDisplayText(detail || heading || ""),
      link,
      date,
    };
  },

  renderNotifications() {
    const content = document.getElementById("notificationsModalContent");
    if (!this.data.notificationsCSV) {
      content.innerHTML = `<div class="empty-state"><h3>Unable to Load</h3><p>Could not fetch notifications.</p></div>`;
      return;
    }

    const lines = this.data.notificationsCSV.trim().split("\n");
    if (lines.length <= 1) {
      content.innerHTML = `<div class="empty-state"><h3>No Notifications</h3><p>You're all caught up!</p></div>`;
      return;
    }

    const headerMatches =
      lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) ||
      lines[0].split(",");
    const headers = headerMatches.map((h) =>
      h.replace(/^"|"$/g, "").trim().toLowerCase(),
    );

    let html = '<div class="notif-list">';

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = this.parseNotificationRow(headers, values);

      html += `
        <div class="notif-item fade-in" role="button" tabindex="0" aria-expanded="false">
          <div class="notif-item-header">
            <div class="notif-item-summary">
              <h3 class="notif-item-heading">${this.escapeHtml(row.heading)}</h3>
              ${
                row.shortDescription
                  ? `<p class="notif-item-short">${this.escapeHtml(row.shortDescription)}</p>`
                  : ""
              }
            </div>
            <span class="notif-item-chevron" aria-hidden="true"><i class="fas fa-chevron-down"></i></span>
          </div>
          <div class="notif-item-body">
            <p class="notif-item-detail">${this.escapeHtml(row.detail)}</p>
            ${
              row.link
                ? `<a href="${this.escapeHtml(row.link)}" target="_blank" rel="noopener noreferrer" class="notif-item-link"><i class="fas fa-external-link-alt"></i> Open Link</a>`
                : ""
            }
            ${
              row.date
                ? `<p class="notif-item-date"><i class="fas fa-clock"></i> Updated: ${this.escapeHtml(row.date)}</p>`
                : ""
            }
          </div>
        </div>`;
    }

    html += "</div>";
    content.innerHTML = html;
  },
};
