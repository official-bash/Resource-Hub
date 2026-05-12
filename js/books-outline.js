// Books & Course Outline page rendering
// Fetches data from exams sheet and displays book_link and outline_link columns

BASH.renderBooksOutlinePage = async function () {
  const exams = await this.fetchExams();
  const mainContent = document.getElementById("mainContent");

  // Check for errors
  if (this.examsError) {
    let html = '<div class="section-title">📚 Books & Course Outline</div>';
    html += `
      <div class="empty-state error">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Unable to Load Books</h3>
        <p>${this.examsError}</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  // Check for empty state
  if (!exams || exams.length === 0) {
    let html = '<div class="section-title">📚 Books & Course Outline</div>';
    html += `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Books Found</h3>
        <p>Books and course outlines will appear here once the data source is configured.</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  let html = '<div class="section-title">📚 Books & Course Outline</div>';
  html += '<div id="booksContainer">';

  exams.forEach((exam) => {
    html += `
      <div class="exam-card fade-in" data-course="${exam.course_name.toLowerCase()}" 
           data-semester="${exam.semester}" data-has-book="${!!exam.book_link}" 
           data-has-outline="${!!exam.outline_link}">
        <div class="exam-header">
          <div>
            <div class="exam-course">${exam.course_name}</div>
            <div class="exam-meta">Semester ${exam.semester} | ${exam.year}</div>
          </div>
          <div class="exam-badge" style="background:#7B68EE;">Book</div>
        </div>
        <div class="exam-links">
          ${
            exam.book_link
                            ? `<a href="${exam.book_link}" target="_blank" class="exam-btn btn-book">
                  <i class="fas fa-book"></i> Book
                </a>`
              : `<span class="exam-btn btn-missing">
                  <i class="fas fa-question-circle"></i> Missing
                </span>`
          }
          ${
            exam.outline_link
              ? `<a href="${exam.outline_link}" target="_blank" class="exam-btn btn-outline">
                  <i class="fas fa-file-alt"></i> Outline
                </a>`
              : `<span class="exam-btn btn-missing">
                  <i class="fas fa-question-circle"></i> Missing
                </span>`
          }
        </div>
      </div>
    `;
  });

  html += "</div>";
  mainContent.innerHTML = html;
};

BASH.filterBooksOutline = function (query, filters) {
  const cards = document.querySelectorAll("#booksContainer .exam-card");
  cards.forEach((card) => {
    const text = card.dataset.course;
    const semester = card.dataset.semester;
    const hasBook = card.dataset.hasBook === "true";
    const hasOutline = card.dataset.hasOutline === "true";

    const matchesQuery = !query || text.includes(query.toLowerCase());

    // Type filter
    let matchesType = filters.type === "all";
    if (filters.type === "book") matchesType = hasBook;
    if (filters.type === "outline") matchesType = hasOutline;

    // Semester filter
    const matchesSemester =
      filters.semester === "all" || semester === filters.semester;

    card.style.display =
      matchesQuery && matchesType && matchesSemester ? "" : "none";
  });
};
