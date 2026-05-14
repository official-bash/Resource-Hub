// Notification Module
const Notification = {
  data: {
    notificationsCSV: null,
  },

  // Setup notification button click handler
  setupNotificationButton() {
    const notificationBtn = document.getElementById("notificationBtn");
    if (notificationBtn) {
      notificationBtn.addEventListener("click", () => {
        this.openNotificationsModal();
      });
    }
  },

  // Fetch and update notification badge count
  async updateNotificationBadge() {
    if (BASH_CONFIG.SHEETS.NOTIFICATIONS) {
      try {
        const response = await fetch(BASH_CONFIG.SHEETS.NOTIFICATIONS);
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.trim().split("\n");
          // header row = 1, so lines.length - 1 notifications
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

  // Open notification modal and render notifications
  openNotificationsModal() {
    // Check if modal already exists
    let modal = document.getElementById("notificationsModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "notificationsModal";
      modal.className = "tasks-modal"; // Reusing tasks modal styling
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
    }

    modal.style.display = "flex";
    this.renderNotifications();
  },

  // Render notifications from CSV data
  renderNotifications() {
    const content = document.getElementById("notificationsModalContent");
    if (this.data.notificationsCSV) {
      const lines = this.data.notificationsCSV.trim().split("\n");
      if (lines.length > 1) {
        let html =
          '<div style="display:flex; flex-direction:column; gap:10px;">';

        // Parse header row - handle quoted values
        const headerMatches =
          lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) ||
          lines[0].split(",");
        const headers = headerMatches.map((h) =>
          h.replace(/^"|"$/g, "").trim().toLowerCase(),
        );

        for (let i = 1; i < lines.length; i++) {
          // Parse CSV line correctly handling quotes if necessary,
          // but standard split is fine for simple text without commas.
          // Simple parsing:
          const values =
            lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) ||
            lines[i].split(",");
          const cleanValues = values.map((v) => v.replace(/^"|"$/g, "").trim());

          let message = cleanValues[0] || "Notification"; // Default to first column

          // Try to find a notification column
          const notifIdx = headers.findIndex(
            (h) => h.includes("notification") || h.includes("message"),
          );
          if (notifIdx !== -1 && cleanValues[notifIdx]) {
            message = cleanValues[notifIdx];
          }

          let link = null;
          const linkIdx = headers.findIndex(
            (h) => h.includes("link") || h.includes("whatsapp"),
          );
          if (linkIdx !== -1 && cleanValues[linkIdx]) {
            link = cleanValues[linkIdx];
          }

          html += `<div class="task-card fade-in" style="border-top: 4px solid var(--bash-green);">
                    <div class="task-title" style="margin-bottom:0; font-size: 15px;">${message}</div>
                    ${link ? `<a href="${link}" target="_blank" style="display:inline-block; margin-top:10px; color:var(--bash-green); font-size:13px; font-weight:600; text-decoration:none;"><i class="fas fa-external-link-alt"></i> Open Link</a>` : ""}
                </div>`;
        }
        html += "</div>";
        content.innerHTML = html;
      } else {
        content.innerHTML = `<div class="empty-state"><h3>No Notifications</h3><p>You're all caught up!</p></div>`;
      }
    } else {
      content.innerHTML = `<div class="empty-state"><h3>Unable to Load</h3><p>Could not fetch notifications.</p></div>`;
    }
  },
};
