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
    this.setupViewerOverlay();
    this.setupHistory();

    const hash = window.location.hash.replace("#", "") || "courses";
    if (hash === "viewer") {
        history.replaceState({ id: 'tab_courses', page: 'courses' }, "", "#courses");
        this.navigateTo("courses", false);
    } else {
        const validPages = ["courses", "exams", "books-outline", "contribute", "contact"];
        const startPage = validPages.includes(hash) ? hash : "courses";
        history.replaceState({ id: 'tab_' + startPage, page: startPage }, "", "#" + startPage);
        this.navigateTo(startPage, false);
    }
    
    this.setupSearch();
  },

  setupViewerOverlay() {
    const viewerHtml = `
        <div id="documentViewer" class="viewer-overlay">
            <div class="viewer-header">
                <button class="viewer-btn" onclick="history.back()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="viewer-title" id="documentViewerTitle">Document</div>
                <div class="viewer-actions">
                    <button class="viewer-btn" id="documentViewerOpenTab" title="Open in New Tab">
                        <i class="fas fa-external-link-alt" style="font-size: 14px;"></i>
                    </button>
                    <button class="viewer-btn" id="documentViewerDownload" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="viewer-content">
                <iframe id="documentViewerIframe" src=""></iframe>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', viewerHtml);

    document.getElementById('documentViewerOpenTab').addEventListener('click', () => {
        const src = document.getElementById('documentViewerIframe').src;
        if (src && src !== 'about:blank') window.open(src, '_blank');
    });
    
    document.getElementById('documentViewerDownload').addEventListener('click', () => {
        const src = document.getElementById('documentViewerIframe').src;
        if (src && src !== 'about:blank') {
            const a = document.createElement('a');
            a.href = src;
            a.download = ''; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
  },

  openDocument(title, url) {
    document.getElementById('documentViewerTitle').textContent = title;
    document.getElementById('documentViewerIframe').src = url;
    document.getElementById('documentViewer').classList.add('active');
    history.pushState({ id: 'viewer' }, '', '#viewer');
  },

  setupHistory() {
    window.addEventListener("popstate", (e) => {
        const viewer = document.getElementById('documentViewer');
        if (viewer && viewer.classList.contains('active')) {
            viewer.classList.remove('active');
            document.getElementById('documentViewerIframe').src = 'about:blank';
            return;
        }

        const state = e.state;

        if (this.currentPage === 'courses' && this.breadcrumbPath.length > 0) {
            if (state && state.id === 'folder') {
                this.breadcrumbPath.pop();
                const lastCrumb = this.breadcrumbPath[this.breadcrumbPath.length - 1];
                if (lastCrumb) {
                    if (lastCrumb.action === 'semester') BASH.openSemester(lastCrumb.data, false);
                    else if (lastCrumb.action === 'course') BASH.openCourse(lastCrumb.data, false);
                    else if (lastCrumb.action === 'folder') BASH.openFolder(lastCrumb.data, false);
                } else {
                    this.breadcrumbPath = [];
                    BASH.displaySemesters(this.data.courses, false);
                }
                return;
            } else if (state && state.id && state.id.startsWith('tab_')) {
                this.breadcrumbPath = [];
                BASH.displaySemesters(this.data.courses, false);
                if (state.page !== 'courses') {
                     this.navigateTo(state.page, false);
                }
                return;
            }
        }

        if (state && state.page) {
             if (this.currentPage !== state.page) {
                 this.navigateTo(state.page, false);
             } else if (state.page === 'courses') {
                 this.breadcrumbPath = [];
                 BASH.displaySemesters(this.data.courses, false);
             }
        }
    });
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

  navigateTo(page, pushState = true) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    this.currentPage = page;
    this.breadcrumbPath = [];
    this.filterState = { type: "all", semester: "all" };

    if (pushState) {
        history.pushState({ id: 'tab_' + page, page: page }, '', '#' + page);
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
      case "contribute":
        this.filterContribution(query, this.filterState.type);
        break;
    }
  },

  updateFilters(page) {
    const filterContainer = document.getElementById("filterContainer");
    filterContainer.innerHTML = "";

    const filterGroups = this.getFiltersForPage(page);
    if (!filterGroups || filterGroups.length === 0) return;

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

      filterContainer.appendChild(groupDiv);
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
      case "contribute":
        return [
          {
            name: "type",
            filters: [
              { label: "All Missing", value: "all" },
              { label: "Mid Missing", value: "mid" },
              { label: "Final Missing", value: "final" },
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
