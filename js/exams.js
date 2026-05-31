BASH.fetchExams = async function () {
  // If no URL configured, return empty array
  if (!BASH_CONFIG.SHEETS.EXAMS) {
    this.data.exams = [];
    this.examsError =
      "No exams data source configured. Please add the CSV URL in config.js.";
    return this.data.exams;
  }

  try {
    const response = await fetch(BASH_CONFIG.SHEETS.EXAMS);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    this.data.exams = this.parseExamsCSV(csvText);
    this.examsError = null;
    return this.data.exams;
  } catch (error) {
    console.error("Error fetching exams:", error);
    this.data.exams = [];
    this.examsError = "Failed to load exams. Please check the data source.";
    return this.data.exams;
  }
};

BASH.parseExamsCSV = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const exams = [];

  for (let i = 1; i < lines.length; i++) {
    const values = BASH.parseCSVLine(lines[i]);
    if (values.length < 6) continue;

    exams.push({
      course_id: values[0],
      course_name: values[1],
      semester: values[2],
      year: values[3],
      mid_link: values[4],
      final_link: values[5],
      book_link: values[6] || "", // New: column 7
      outline_link: values[7] || "", // New: column 8
      lecture_notes_link: values[8] || "", // New: column 9
    });
  }

  return exams;
};

BASH.renderExamsPage = async function () {
  const exams = await this.fetchExams();
  const mainContent = document.getElementById("mainContent");

  // Check for errors
  if (this.examsError) {
    let html = '<div class="section-title">📝 Exam Papers</div>';
    html += `
      <div class="empty-state error">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Unable to Load Exams</h3>
        <p>${this.examsError}</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  // Check for empty state
  if (!exams || exams.length === 0) {
    let html = '<div class="section-title">📝 Exam Papers</div>';
    html += `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Exams Found</h3>
        <p>Exam papers will appear here once the data source is configured.</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  let html = '<div class="section-title">📝 Exam Papers</div>';
  html += '<div id="examsContainer">';

  exams.forEach((exam) => {
    html += `
            <div class="exam-card fade-in" data-course="${exam.course_name.toLowerCase()}" 
                 data-semester="${exam.semester}" data-has-mid="${!!exam.mid_link}" data-has-final="${!!exam.final_link}">
                <div class="exam-header">
                    <div>
                        <div class="exam-course">${exam.course_name}</div>
                        <div class="exam-meta">Semester ${exam.semester} | ${exam.year}</div>
                    </div>
                    <div class="exam-badge">Sem ${exam.semester}</div>
                </div>
                <div class="exam-links">
                    ${
                      exam.mid_link
                        ? `<a href="#" data-drive-link="${BASH.escapeAttr(exam.mid_link)}" data-course-name="${BASH.escapeAttr(exam.course_name)}" data-folder-name="Mid Term" target="_blank" class="exam-btn btn-mid">
                            <i class="fas fa-file-pdf"></i> Mid Term${BASH.multiLinkLabel(exam.mid_link)}
                        </a>`
                        : `<div class="missing-container">
                            <span class="exam-btn btn-missing">
                              <i class="fas fa-question-circle"></i> Mid Missing
                            </span>
                            <a href="https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(
                              `Hi, I have the Mid Term for ${exam.course_name} (Semester ${exam.semester}, ${exam.year}) and want to contribute to BASH.`,
                            )}" target="_blank" class="exam-btn btn-contribute-inline">
                              <i class="fab fa-whatsapp"></i> Contribute
                            </a>
                          </div>`
                    }
                    ${
                      exam.final_link
                        ? `<a href="#" data-drive-link="${BASH.escapeAttr(exam.final_link)}" data-course-name="${BASH.escapeAttr(exam.course_name)}" data-folder-name="Final" target="_blank" class="exam-btn btn-final">
                            <i class="fas fa-file-pdf"></i> Final${BASH.multiLinkLabel(exam.final_link)}
                        </a>`
                        : `<div class="missing-container">
                            <span class="exam-btn btn-missing">
                              <i class="fas fa-question-circle"></i> Final Missing
                            </span>
                            <a href="https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(
                              `Hi, I have the Final for ${exam.course_name} (Semester ${exam.semester}, ${exam.year}) and want to contribute to BASH.`,
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
  this.setupDriveLinkHandlers(document.getElementById("examsContainer"));
};

BASH.filterExams = function (query, filters) {
  const cards = document.querySelectorAll("#examsContainer .exam-card");
  cards.forEach((card) => {
    const text = card.dataset.course;
    const semester = card.dataset.semester;
    const hasMid = card.dataset.hasMid === "true";
    const hasFinal = card.dataset.hasFinal === "true";

    const matchesQuery = !query || text.includes(query.toLowerCase());

    // Type filter (mid/final)
    let matchesType = filters.type === "all";
    if (filters.type === "mid") matchesType = hasMid;
    if (filters.type === "final") matchesType = hasFinal;

    // Semester filter
    const matchesSemester =
      filters.semester === "all" || semester === filters.semester;

    card.style.display =
      matchesQuery && matchesType && matchesSemester ? "" : "none";
  });
};
