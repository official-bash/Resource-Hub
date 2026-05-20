// Lecture Notes page rendering
// Fetches data from exams sheet and displays lecture_notes_link column

BASH.renderLectureNotesPage = async function () {
  const exams = await this.fetchExams();
  const mainContent = document.getElementById("mainContent");

  // Check for errors
  if (this.examsError) {
    let html = '<div class="section-title">📖 Lecture Notes</div>';
    html += `
      <div class="empty-state error">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Unable to Load Lecture Notes</h3>
        <p>${this.examsError}</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  // Check for empty state
  if (!exams || exams.length === 0) {
    let html = '<div class="section-title">📖 Lecture Notes</div>';
    html += `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Lecture Notes Found</h3>
        <p>Lecture notes will appear here once the data source is configured.</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  let html = '<div class="section-title">📖 Lecture Notes</div>';
  html += '<div id="lectureNotesContainer">';

  exams.forEach((exam) => {
    html += `
      <div class="exam-card fade-in" data-course="${exam.course_name.toLowerCase()}" 
           data-semester="${exam.semester}" data-has-notes="${!!exam.lecture_notes_link}">
        <div class="exam-header">
          <div>
            <div class="exam-course">${exam.course_name}</div>
            <div class="exam-meta">Semester ${exam.semester} | ${exam.year}</div>
          </div>
          <div class="exam-badge" style="background:#4CAF50;">Notes</div>
        </div>
        <div class="exam-links">
          ${
            exam.lecture_notes_link
              ? `<a href="#" data-drive-link="${BASH.escapeAttr(exam.lecture_notes_link)}" data-course-name="${BASH.escapeAttr(exam.course_name)}" data-folder-name="Lecture Notes" target="_blank" class="exam-btn btn-notes">
                  <i class="fas fa-file-pdf"></i> Lecture Notes
                </a>`
              : `<div class="missing-container">
                  <span class="exam-btn btn-missing">
                    <i class="fas fa-question-circle"></i> Missing
                  </span>
                  <a href="https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `Hi, I have the lecture notes for ${exam.course_name} (Semester ${exam.semester}, ${exam.year}) and want to contribute to BASH.`,
                  )}" target="_blank" class="exam-btn btn-contribute-inline">
                    <i class="fab fa-whatsapp"></i> Contribute
                  </a>
                </div>`
          }
        </div>
      </div>
    `;
  });

  html += "</div>";
  mainContent.innerHTML = html;
  this.setupDriveLinkHandlers(document.getElementById("lectureNotesContainer"));
};

BASH.filterLectureNotes = function (query, filters) {
  const cards = document.querySelectorAll("#lectureNotesContainer .exam-card");
  cards.forEach((card) => {
    const text = card.dataset.course;
    const semester = card.dataset.semester;
    const hasNotes = card.dataset.hasNotes === "true";

    const matchesQuery = !query || text.includes(query.toLowerCase());

    // Type filter
    let matchesType = filters.type === "all";
    if (filters.type === "available") matchesType = hasNotes;
    if (filters.type === "missing") matchesType = !hasNotes;

    // Semester filter
    const matchesSemester =
      filters.semester === "all" || semester === filters.semester;

    card.style.display =
      matchesQuery && matchesType && matchesSemester ? "" : "none";
  });
};
