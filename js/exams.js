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
    const values = lines[i].split(",").map((v) => v.trim());
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
                        ? `<button onclick="BASH.openDocument('Mid Term: ${exam.course_name.replace(/'/g, "\\'")}', '${exam.mid_link}')" class="exam-btn btn-mid">
                            <i class="fas fa-file-pdf"></i> Mid Term
                        </button>`
                        : `<span class="exam-btn btn-missing">
                            <i class="fas fa-question-circle"></i> Mid Missing
                        </span>`
                    }
                    ${
                      exam.final_link
                        ? `<button onclick="BASH.openDocument('Final: ${exam.course_name.replace(/'/g, "\\'")}', '${exam.final_link}')" class="exam-btn btn-final">
                            <i class="fas fa-file-pdf"></i> Final
                        </button>`
                        : `<span class="exam-btn btn-missing">
                            <i class="fas fa-question-circle"></i> Final Missing
                        </span>`
                    }
                </div>
            </div>
        `;
  });

  html += "</div>";
  mainContent.innerHTML = html;
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
