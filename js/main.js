const BASH = {
  currentPage: "courses",
  data: {
    courses: null,
    exams: null,
    books: null,
    tasks: null,
  },

  // Store filter states for pages with multiple filter groups
  filterState: {
    type: "all",
    semester: "all",
  },

  previousState: null,
  breadcrumbPath: [],

  init() {
    this.loadNavigation();
    this.setupTasksButton();
    this.setupBackKeyHandler();
    Notification.setupNotificationButton();
    this.setupContributeButton();
    this.loadPage("courses");
    this.setupSearch();
    this.updateBadges();
  },

  setupContributeButton() {
    const contributeTopBtn = document.getElementById("contributeTopBtn");
    if (contributeTopBtn) {
      contributeTopBtn.addEventListener("click", () => {
        this.navigateTo("contribute");
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

  navigateTo(page) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    this.currentPage = page;
    this.breadcrumbPath = [];
    this.filterState = { type: "all", semester: "all" };

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

  setupBackKeyHandler() {
    // Handle back button on mobile and browser back navigation
    window.addEventListener("popstate", (event) => {
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

document.addEventListener("DOMContentLoaded", () => BASH.init());
