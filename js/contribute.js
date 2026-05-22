BASH.renderContributePage = async function () {
  if (this.contributorDetailId) {
    await this.renderContributorDetailPage(this.contributorDetailId);
    return;
  }

  const exams = this.data.exams || (await this.fetchExams());
  const mainContent = document.getElementById("mainContent");

  let html = '<div class="section-title">🤝 Contribute to BASH</div>';

  const topContributorsHtml = await this.renderTopContributorsSection();
  if (topContributorsHtml) {
    html += topContributorsHtml;
  }

  // Check for errors fetching exams
  if (this.examsError) {
    html += `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Unable to Load Data</h3>
                <p>${this.examsError}</p>
            </div>
        `;
    mainContent.innerHTML = html;
    return;
  }

  html +=
    '<p style="margin-bottom:20px; color:var(--dark-gray);">Help fellow students! Share missing resources via WhatsApp.</p>';

  const missingItems = [];

  exams.forEach((exam) => {
    if (!exam.mid_link) {
      missingItems.push({
        course: exam.course_name,
        type: "Mid Term",
        itemType: "mid",
        semester: exam.semester,
        year: exam.year,
        category: "Exams",
      });
    }

    if (!exam.final_link) {
      missingItems.push({
        course: exam.course_name,
        type: "Final",
        itemType: "final",
        semester: exam.semester,
        year: exam.year,
        category: "Exams",
      });
    }

    if (!exam.book_link) {
      missingItems.push({
        course: exam.course_name,
        type: "Book",
        itemType: "book",
        semester: exam.semester,
        year: exam.year,
        category: "Books & Outline",
      });
    }

    if (!exam.outline_link) {
      missingItems.push({
        course: exam.course_name,
        type: "Course Outline",
        itemType: "outline",
        semester: exam.semester,
        year: exam.year,
        category: "Books & Outline",
      });
    }

    if (!exam.lecture_notes_link) {
      missingItems.push({
        course: exam.course_name,
        type: "Lecture Notes",
        itemType: "notes",
        semester: exam.semester,
        year: exam.year,
        category: "Lecture Notes",
      });
    }
  });

  if (missingItems.length === 0) {
    html += `
            <div class="empty-state success">
                <i class="fas fa-check-circle"></i>
                <h3>All Resources Available!</h3>
                <p>No missing resources at the moment. Thank you!</p>
            </div>
        `;
  } else {
    html += `<div id="missingContainer"><p style="margin-bottom:12px; color:var(--bash-navy); font-weight:600;">${missingItems.length} missing resources found:</p>`;

    // Group by category
    const categories = {};
    missingItems.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    // Render each category
    Object.keys(categories).forEach((category) => {
      html += `<div class="contribute-category"><h4 style="margin-bottom:10px; color:var(--bash-navy);">${category}</h4>`;

      categories[category].forEach((item) => {
        const message = encodeURIComponent(
          `Hi, I have the ${item.type} for ${item.course} (Semester ${item.semester}, ${item.year}) and want to contribute to BASH.`,
        );
        const whatsappLink = `https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${message}`;

        let badgeColor = "#E53935"; // Default red for missing
        if (item.category === "Books & Outline") badgeColor = "#7B68EE";
        if (item.category === "Lecture Notes") badgeColor = "#4CAF50";

        html += `
                  <div class="exam-card fade-in" data-course="${item.course.toLowerCase()}" 
                       data-item-type="${item.itemType}" data-category="${category}" style="border-left-color: ${badgeColor};">
                      <div class="exam-header">
                          <div>
                              <div class="exam-course">${item.course}</div>
                              <div class="exam-meta">Semester ${item.semester} | ${item.year}</div>
                          </div>
                          <div class="exam-badge" style="background:${badgeColor};">${item.type}</div>
                      </div>
                      <a href="${whatsappLink}" target="_blank" class="exam-btn btn-contribute" style="text-decoration:none;">
                          <i class="fab fa-whatsapp"></i> Contribute ${item.type}
                      </a>
                  </div>
              `;
      });

      html += "</div>";
    });

    html += "</div>";
  }

  html += `
        <div class="contribute-cta">
            <h3>Have other resources?</h3>
            <p>Notes, assignments, or any helpful material - share with the community!</p>
            <a href="https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I want to contribute resources to BASH!")}" 
               target="_blank" class="contribute-btn">
                <i class="fab fa-whatsapp"></i> Share Resources
            </a>
        </div>
    `;

  mainContent.innerHTML = html;
  this.setupContributorCardHandlers(mainContent);
};

BASH.filterContribution = function (query, filter) {
  const container = document.getElementById("missingContainer");
  if (!container) return;

  const cards = container.querySelectorAll(".exam-card");
  cards.forEach((card) => {
    const text = card.dataset.course;
    const itemType = card.dataset.itemType;

    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesFilter = filter === "all" || itemType === filter;

    card.style.display = matchesQuery && matchesFilter ? "" : "none";
  });
};
