BASH.escapeHtml = function (str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
};

BASH.fetchContributors = async function () {
  const hasDualConfig = BASH_CONFIG.SHEETS.CONTRIBUTORS_PROFILES && BASH_CONFIG.SHEETS.CONTRIBUTORS_ACTIVITIES;

  if (hasDualConfig) {
    try {
      const [profilesRes, activitiesRes] = await Promise.all([
        fetch(BASH_CONFIG.SHEETS.CONTRIBUTORS_PROFILES),
        fetch(BASH_CONFIG.SHEETS.CONTRIBUTORS_ACTIVITIES)
      ]);

      if (!profilesRes.ok) throw new Error(`Profiles HTTP ${profilesRes.status}`);
      if (!activitiesRes.ok) throw new Error(`Activities HTTP ${activitiesRes.status}`);

      const profilesText = await profilesRes.text();
      const activitiesText = await activitiesRes.text();

      const profiles = this.parseProfilesCSV(profilesText);
      const activities = this.parseActivitiesCSV(activitiesText);

      this.data.contributors = this.combineProfilesAndActivities(profiles, activities);
      this.contributorsError = null;
      return this.data.contributors;
    } catch (error) {
      console.error("Error fetching dual-sheet contributors:", error);
      // Fallback if dual-sheet fetch fails, try old CONTRIBUTORS if available
      if (BASH_CONFIG.SHEETS.CONTRIBUTORS) {
        return this.fetchContributorsFallback();
      }
      this.data.contributors = [];
      this.contributorsError = "Failed to load contributors. Check the sheet URLs in config.js.";
      return this.data.contributors;
    }
  } else if (BASH_CONFIG.SHEETS.CONTRIBUTORS) {
    return this.fetchContributorsFallback();
  } else {
    this.data.contributors = [];
    this.contributorsError = "No contributors data source configured. Add the published CSV URLs in config.js.";
    return this.data.contributors;
  }
};

BASH.fetchContributorsFallback = async function () {
  try {
    const response = await fetch(BASH_CONFIG.SHEETS.CONTRIBUTORS);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    this.data.contributors = this.parseContributorsCSV(csvText);
    this.contributorsError = null;
    return this.data.contributors;
  } catch (error) {
    console.error("Error fetching fallback contributors:", error);
    this.data.contributors = [];
    this.contributorsError = "Failed to load contributors. Check the sheet URL in config.js.";
    return this.data.contributors;
  }
};

BASH.normalizeContributorHeader = function (header) {
  return String(header || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, "");
};

BASH.getContributorColumn = function (headers, values, aliases) {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => {
      const n = this.normalizeContributorHeader(h);
      return n === alias || n.includes(alias);
    });
    if (idx >= 0 && values[idx] != null && String(values[idx]).trim() !== "") {
      return String(values[idx]).trim();
    }
  }
  return "";
};

BASH.parseProfilesCSV = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = this.parseCSVLine(lines[0]).map((h) => h.trim());
  const profiles = [];

  for (let i = 1; i < lines.length; i++) {
    const values = this.parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const id = this.getContributorColumn(headers, values, ["uniqueid", "id"]);
    const name = this.getContributorColumn(headers, values, [
      "name",
      "contributor",
      "studentname",
    ]);

    if (!id || !name) continue;

    profiles.push({
      id: id.trim(),
      name: name.trim(),
      email: this.getContributorColumn(headers, values, ["email", "e-mail"]),
      linkedin: this.getContributorColumn(headers, values, [
        "linkedin",
        "linkdin",
        "linkdIN",
      ]),
      portfolio: this.getContributorColumn(headers, values, [
        "portfolio",
        "portfoliolink",
        "website",
      ]),
      profile: this.getContributorColumn(headers, values, [
        "profile",
        "profilelink",
        "photolink",
        "photo",
      ]),
      semester: this.getContributorColumn(headers, values, ["semester", "sem"]),
    });
  }

  return profiles;
};

BASH.parseActivitiesCSV = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = this.parseCSVLine(lines[0]).map((h) => h.trim());
  const activities = [];

  for (let i = 1; i < lines.length; i++) {
    const values = this.parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const id = this.getContributorColumn(headers, values, ["uniqueid", "id"]);
    if (!id) continue;

    const pointsRaw = this.getContributorColumn(headers, values, [
      "point",
      "points",
      "score",
    ]);
    const points = parseFloat(pointsRaw) || 0;

    activities.push({
      id: id.trim(),
      dateAdded: this.getContributorColumn(headers, values, [
        "date",
        "dateadded",
        "added",
      ]),
      points,
      topic: this.getContributorColumn(headers, values, [
        "topiccontributions",
        "topic",
        "contributiontopic",
        "contribution",
      ]),
      fileLink: this.getContributorColumn(headers, values, [
        "linkofthecontributedfile",
        "linkofcontributedfile",
        "filelink",
        "link",
      ]),
    });
  }

  return activities;
};

BASH.combineProfilesAndActivities = function (profiles, activities) {
  const people = new Map();

  profiles.forEach((profile) => {
    const key = String(profile.id).toLowerCase().trim();
    if (!key) return;

    const personId = key.replace(/[^a-z0-9]+/gi, "-");
    people.set(key, {
      id: personId,
      uniqueId: profile.id,
      name: profile.name,
      email: profile.email,
      linkedin: profile.linkedin,
      portfolio: profile.portfolio,
      profile: profile.profile,
      semester: profile.semester,
      totalPoints: 0,
      contributions: [],
    });
  });

  activities.forEach((activity) => {
    const key = String(activity.id).toLowerCase().trim();
    if (!key) return;

    if (!people.has(key)) {
      const personId = key.replace(/[^a-z0-9]+/gi, "-");
      people.set(key, {
        id: personId,
        uniqueId: activity.id,
        name: `Contributor ${activity.id}`,
        email: "",
        linkedin: "",
        portfolio: "",
        profile: "",
        semester: "",
        totalPoints: 0,
        contributions: [],
      });
    }

    const person = people.get(key);
    person.totalPoints += activity.points;
    person.contributions.push({
      topic: activity.topic || "Contribution",
      dateAdded: activity.dateAdded,
      semester: person.semester,
      points: activity.points,
      fileLink: activity.fileLink,
    });
  });

  return Array.from(people.values())
    .map((p) => {
      p.contributions.sort((a, b) => {
        const da = a.dateAdded ? new Date(a.dateAdded) : 0;
        const db = b.dateAdded ? new Date(b.dateAdded) : 0;
        return db - da;
      });
      return p;
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
};

BASH.parseContributorsCSV = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = this.parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = this.parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const name = this.getContributorColumn(headers, values, [
      "name",
      "contributor",
      "studentname",
    ]);
    if (!name) continue;

    const pointsRaw = this.getContributorColumn(headers, values, [
      "points",
      "point",
      "score",
    ]);
    const points = parseFloat(pointsRaw) || 0;

    rows.push({
      name,
      email: this.getContributorColumn(headers, values, ["email", "e-mail"]),
      linkedin: this.getContributorColumn(headers, values, [
        "linkedin",
        "linkdin",
        "linkdIN",
      ]),
      portfolio: this.getContributorColumn(headers, values, [
        "portfolio",
        "portfoliolink",
        "website",
      ]),
      profile: this.getContributorColumn(headers, values, [
        "profile",
        "profilelink",
        "photolink",
        "photo",
      ]),
      semester: this.getContributorColumn(headers, values, ["semester", "sem"]),
      points,
      dateAdded: this.getContributorColumn(headers, values, [
        "dateadded",
        "date",
        "added",
      ]),
      topic: this.getContributorColumn(headers, values, [
        "contributiontopic",
        "topic",
        "contribution",
      ]),
    });
  }

  return rows;
};

BASH.aggregateContributors = function (rows) {
  const people = new Map();

  rows.forEach((row) => {
    const key = (row.email || row.name).toLowerCase().trim();
    if (!key) return;

    if (!people.has(key)) {
      people.set(key, {
        id: key.replace(/[^a-z0-9]+/gi, "-"),
        name: row.name,
        email: row.email,
        linkedin: row.linkedin,
        portfolio: row.portfolio,
        profile: row.profile,
        semester: row.semester,
        totalPoints: 0,
        contributions: [],
      });
    }

    const person = people.get(key);
    person.totalPoints += row.points;
    person.contributions.push({
      topic: row.topic || "Contribution",
      dateAdded: row.dateAdded,
      semester: row.semester,
      points: row.points,
    });

    if (!person.linkedin && row.linkedin) person.linkedin = row.linkedin;
    if (!person.portfolio && row.portfolio) person.portfolio = row.portfolio;
    if (!person.profile && row.profile) person.profile = row.profile;
    if (!person.email && row.email) person.email = row.email;
    if (row.semester) person.semester = row.semester;
  });

  return Array.from(people.values())
    .map((p) => {
      p.contributions.sort((a, b) => {
        const da = a.dateAdded ? new Date(a.dateAdded) : 0;
        const db = b.dateAdded ? new Date(b.dateAdded) : 0;
        return db - da;
      });
      if (p.contributions[0]?.semester) {
        p.semester = p.contributions[0].semester;
      }
      return p;
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
};

BASH.getTopContributors = function (limit = 3) {
  const contributors = this.data.contributors || [];
  const isAggregated = contributors.length > 0 && contributors[0] && Array.isArray(contributors[0].contributions);
  if (isAggregated) {
    return contributors.slice(0, limit);
  }
  return this.aggregateContributors(contributors).slice(0, limit);
};

BASH.getContributorById = function (id) {
  const contributors = this.data.contributors || [];
  const isAggregated = contributors.length > 0 && contributors[0] && Array.isArray(contributors[0].contributions);
  if (isAggregated) {
    return contributors.find((p) => p.id === id) || null;
  }
  return this.aggregateContributors(contributors).find((p) => p.id === id) || null;
};

BASH.contributorAvatarHtml = function (person, sizeClass) {
  const profile = person.profile || "";
  const name = this.escapeHtml(person.name);
  const initial = (person.name || "?").charAt(0).toUpperCase();

  if (profile && /^https?:\/\//i.test(profile)) {
    return `<img src="${this.escapeHtml(profile)}" alt="${name}" class="contributor-avatar ${sizeClass}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <div class="contributor-avatar contributor-avatar--fallback ${sizeClass}" style="display:none;">${this.escapeHtml(initial)}</div>`;
  }

  return `<div class="contributor-avatar contributor-avatar--fallback ${sizeClass}">${this.escapeHtml(initial)}</div>`;
};

BASH.renderTopContributorsSection = async function () {
  await this.fetchContributors();

  if (this.contributorsError || !this.data.contributors?.length) {
    return "";
  }

  const top = this.getTopContributors(3);
  if (!top.length) return "";

  const rankLabels = ["1st", "2nd", "3rd"];
  const rankClasses = ["rank-gold", "rank-silver", "rank-bronze"];

  let html = `
    <section class="top-contributors-section fade-in">
      <div class="top-contributors-header">
        <h2 class="top-contributors-title"><i class="fas fa-trophy"></i> Top Contributors</h2>
        <p class="top-contributors-sub">Thank you to our community champions</p>
      </div>
      <div class="top-contributors-list">
  `;

  top.forEach((person, index) => {
    const semesterLabel = person.semester
      ? person.semester.toLowerCase().includes("semester")
        ? person.semester
        : `Semester ${person.semester}`
      : "BASH Contributor";

    html += `
      <button type="button" class="contributor-card ${rankClasses[index] || ""}"
        data-contributor-id="${this.escapeHtml(person.id)}" aria-label="View ${this.escapeHtml(person.name)}">
        <div class="contributor-card-body">
          <span class="contributor-rank">${rankLabels[index] || index + 1}</span>
          <h3 class="contributor-card-name">${this.escapeHtml(person.name)}</h3>
          <p class="contributor-card-semester">${this.escapeHtml(semesterLabel)}</p>
          <span class="contributor-card-points"><i class="fas fa-star"></i> ${person.totalPoints} pts</span>
        </div>
        <div class="contributor-card-avatar-wrap">
          ${this.contributorAvatarHtml(person, "contributor-avatar--sm")}
        </div>
      </button>
    `;
  });

  html += "</div></section>";
  return html;
};

BASH.setupContributorCardHandlers = function (container) {
  if (!container) return;
  container.querySelectorAll("[data-contributor-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-contributor-id");
      if (id) this.openContributorDetail(id);
    });
  });
};

BASH.openContributorDetail = function (id) {
  this.contributorDetailId = id;
  history.pushState({ contributorDetail: id }, "", `#contribute/${id}`);

  // Log contributor profile view
  const person = this.getContributorById(id);
  BASH.logDriveClick(
    BASH.getUserEmail(),
    "Contributor Profile",
    `Viewed: ${person ? person.name : id}`,
    window.location.origin + window.location.pathname + `#contribute/${id}`
  );

  this.renderContributorDetailPage(id);
};

BASH.closeContributorDetail = function () {
  this.contributorDetailId = null;
  if (window.location.hash.includes("/")) {
    history.replaceState({}, "", "#contribute");
  }
  this.renderContributePage();
};

BASH.renderContributorDetailPage = async function (id) {
  const mainContent = document.getElementById("mainContent");
  const filterBar = document.getElementById("filterBar");
  if (filterBar) filterBar.style.display = "none";

  await this.fetchContributors();
  const person = this.getContributorById(id);

  if (!person) {
    mainContent.innerHTML = `
      <div class="contributor-detail-page fade-in">
        <button type="button" class="contributor-back-btn" id="contributorBackBtn">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div class="empty-state error">
          <i class="fas fa-user-slash"></i>
          <h3>Contributor Not Found</h3>
          <p>This profile could not be loaded.</p>
        </div>
      </div>
    `;
    document.getElementById("contributorBackBtn")?.addEventListener("click", () => {
      this.closeContributorDetail();
    });
    return;
  }

  const semesterLabel = person.semester
    ? person.semester.toLowerCase().includes("semester")
      ? person.semester
      : `Semester ${person.semester}`
    : "";

  const linkedinBtn = person.linkedin
    ? `<a href="${this.escapeHtml(person.linkedin)}" target="_blank" rel="noopener noreferrer" class="contributor-detail-link" data-track-type="LinkedIn" data-track-name="${this.escapeHtml(person.name)}">
         <i class="fab fa-linkedin"></i> LinkedIn Profile
       </a>`
    : "";

  const portfolioBtn = person.portfolio
    ? `<a href="${this.escapeHtml(person.portfolio)}" target="_blank" rel="noopener noreferrer" class="contributor-detail-link contributor-detail-link--portfolio" data-track-type="Portfolio" data-track-name="${this.escapeHtml(person.name)}">
         <i class="fas fa-globe"></i> Portfolio
       </a>`
    : "";

  const linksHtml = (linkedinBtn || portfolioBtn)
    ? `<div class="contributor-detail-links">
         ${linkedinBtn}
         ${portfolioBtn}
       </div>`
    : "";

  const emailRow = person.email
    ? `<div class="contributor-info-item">
         <span class="contributor-info-label"><i class="fas fa-envelope"></i> Email</span>
         <span class="contributor-info-value">
           <a href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(person.email)}" target="_blank" rel="noopener noreferrer" class="contributor-email-link">
             ${this.escapeHtml(person.email)}
           </a>
         </span>
       </div>`
    : "";

  let contributionsHtml = "";
  person.contributions.forEach((c) => {
    const sem = c.semester
      ? c.semester.toLowerCase().includes("semester")
        ? c.semester
        : `Sem ${c.semester}`
      : "";

    const fileLinkHtml = c.fileLink
      ? `<div class="contribution-file-wrap">
           <a href="${this.escapeHtml(c.fileLink)}" target="_blank" rel="noopener noreferrer" class="contribution-file-link">
             <i class="fas fa-external-link-alt"></i> View Contributed File
           </a>
         </div>`
      : "";

    contributionsHtml += `
      <li class="contribution-entry">
        <div class="contribution-entry-main">
          <h4 class="contribution-topic">${this.escapeHtml(c.topic || "Contribution")}</h4>
          ${c.dateAdded ? `<p class="contribution-date"><i class="fas fa-calendar-alt"></i> ${this.escapeHtml(c.dateAdded)}</p>` : ""}
          ${fileLinkHtml}
        </div>
        <div class="contribution-entry-meta">
          ${sem ? `<span class="contribution-sem">${this.escapeHtml(sem)}</span>` : ""}
          <span class="contribution-pts">+${c.points} pts</span>
        </div>
      </li>
    `;
  });

  mainContent.innerHTML = `
    <div class="contributor-detail-page fade-in">
      <button type="button" class="contributor-back-btn" id="contributorBackBtn">
        <i class="fas fa-arrow-left"></i> Back to Contribute
      </button>

      <header class="contributor-detail-hero">
        <div class="contributor-detail-avatar-wrap">
          ${this.contributorAvatarHtml(person, "contributor-avatar--lg")}
        </div>
        <div class="contributor-detail-hero-text">
          <h1 class="contributor-detail-name">${this.escapeHtml(person.name)}</h1>
          ${semesterLabel ? `<p class="contributor-detail-semester">${this.escapeHtml(semesterLabel)}</p>` : ""}
          <div class="contributor-detail-points-badge">
            <i class="fas fa-trophy"></i>
            <span>${person.totalPoints}</span>
            <small>total points</small>
          </div>
        </div>
      </header>

      <section class="contributor-detail-info">
        <h2 class="contributor-detail-section-title">Profile</h2>
        <div class="contributor-info-grid">
          ${emailRow}
          ${person.semester ? `
            <div class="contributor-info-item">
              <span class="contributor-info-label"><i class="fas fa-graduation-cap"></i> Semester</span>
              <span class="contributor-info-value">${this.escapeHtml(semesterLabel)}</span>
            </div>` : ""}
        </div>
        ${linksHtml}
      </section>

      <section class="contributor-detail-contributions">
        <h2 class="contributor-detail-section-title">
          Contributions <span class="contributor-count">${person.contributions.length}</span>
        </h2>
        <ul class="contribution-list">
          ${contributionsHtml || '<li class="contribution-entry"><p>No contribution details listed.</p></li>'}
        </ul>
      </section>
    </div>
  `;

  document.getElementById("contributorBackBtn")?.addEventListener("click", () => {
    this.closeContributorDetail();
  });

  // Track LinkedIn and Portfolio link clicks
  document.querySelectorAll(".contributor-detail-link[data-track-type]").forEach((link) => {
    link.addEventListener("click", () => {
      BASH.logDriveClick(
        BASH.getUserEmail(),
        `Contributor ${link.dataset.trackType}`,
        `Visited: ${link.dataset.trackName}`,
        link.href
      );
    });
  });
};
