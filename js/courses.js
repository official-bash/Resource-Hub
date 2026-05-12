// Get courses data from Google Sheet
BASH.fetchCourses = async function () {
  // If no URL configured, return empty array
  if (!BASH_CONFIG.SHEETS.COURSES) {
    this.data.courses = [];
    this.coursesError =
      "No courses data source configured. Please add the CSV URL in config.js.";
    return this.data.courses;
  }

  try {
    const response = await fetch(BASH_CONFIG.SHEETS.COURSES);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    this.data.courses = this.parseCoursesCSV(csvText);
    this.coursesError = null;
    return this.data.courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    this.data.courses = [];
    this.coursesError = "Failed to load courses. Please check the data source.";
    return this.data.courses;
  }
};

BASH.parseCoursesCSV = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const semesters = {};

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < 6) continue;

    const [semester, course, folder, file, link, type] = values;

    if (!semesters[semester]) {
      semesters[semester] = {
        id: semester.toLowerCase().replace(/\s+/g, "-"),
        title: semester,
        courses: {},
      };
    }

    if (!semesters[semester].courses[course]) {
      semesters[semester].courses[course] = {
        id: course.toLowerCase().replace(/\s+/g, "-"),
        name: course,
        icon: "fa-folder",
        type: "folder",
        content: [],
      };
    }

    if (file && link) {
      const fileObj = {
        name: file,
        type: "file",
        link: link,
        fileType: type || "file",
      };

      if (folder) {
        let folderObj = semesters[semester].courses[course].content.find(
          (f) => f.name === folder && f.type === "folder",
        );
        if (!folderObj) {
          folderObj = { name: folder, type: "folder", content: [] };
          semesters[semester].courses[course].content.push(folderObj);
        }
        folderObj.content.push(fileObj);
      } else {
        semesters[semester].courses[course].content.push(fileObj);
      }
    }
  }

  return Object.values(semesters).map((sem) => ({
    ...sem,
    courses: Object.values(sem.courses),
  }));
};

// Render Courses Page
BASH.renderCoursesPage = async function () {
  const courses = await this.fetchCourses();
  const mainContent = document.getElementById("mainContent");

  // Check for errors or empty state
  if (this.coursesError) {
    mainContent.innerHTML = `
            <div class="section-title">📚 Courses</div>
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Unable to Load Courses</h3>
                <p>${this.coursesError}</p>
            </div>
        `;
    return;
  }

  if (!courses || courses.length === 0) {
    mainContent.innerHTML = `
            <div class="section-title">📚 Courses</div>
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Courses Found</h3>
                <p>Courses will appear here once the data source is configured.</p>
            </div>
        `;
    return;
  }

  mainContent.innerHTML = `
        <div class="section-title">📚 Courses</div>
        <div id="breadcrumb" class="breadcrumb"></div>
        <div id="coursesContainer" class="course-grid"></div>
    `;

  this.breadcrumbPath = [];
  this.displaySemesters(courses);
};

BASH.displaySemesters = function (semesters, pushHistory = false) {
  this.breadcrumbPath = [];
  const container = document.getElementById("coursesContainer");
  container.innerHTML = "";

  semesters.forEach((sem) => {
    const card = this.createCard(sem, "semester");
    container.appendChild(card);
  });

  this.updateBreadcrumb();
};

BASH.createCard = function (item, type) {
  const div = document.createElement("div");
  div.className = "course-card fade-in";

  let iconClass = "fa-graduation-cap";
  let iconColorClass = "icon-course";

  switch (type) {
    case "semester":
      iconClass = "fa-calendar-alt";
      iconColorClass = "icon-semester";
      break;
    case "course":
      iconClass = item.icon || "fa-book";
      iconColorClass = "icon-course";
      break;
    case "folder":
      iconClass = "fa-folder-open";
      iconColorClass = "icon-folder";
      break;
    default:
      if (item.fileType === "pdf") iconClass = "fa-file-pdf";
      else iconClass = "fa-file";
      iconColorClass = "icon-file";
  }

  div.innerHTML = `
        <div class="course-card-icon ${iconColorClass}">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="course-card-info">
            <div class="course-card-name">${item.name || item.title}</div>
            <div class="course-card-type">${type}</div>
        </div>
    `;

  div.addEventListener("click", () => {
    if (type === "semester") this.openSemester(item);
    else if (type === "course") this.openCourse(item);
    else if (type === "folder") this.openFolder(item);
    else this.openFile(item);
  });

  return div;
};

BASH.openSemester = function (semester, pushHistory = true) {
  if (pushHistory) {
      this.breadcrumbPath.push({ name: semester.title, action: 'semester', data: semester });
      history.pushState({ id: 'folder', page: 'courses' }, '', '#courses');
  }
  const container = document.getElementById("coursesContainer");
  container.innerHTML = "";

  semester.courses.forEach((course) => {
    container.appendChild(this.createCard(course, "course"));
  });

  this.updateBreadcrumb();
};

BASH.openCourse = function (course, pushHistory = true) {
  if (pushHistory) {
      this.breadcrumbPath.push({ name: course.name, action: 'course', data: course });
      history.pushState({ id: 'folder', page: 'courses' }, '', '#courses');
  }
  const container = document.getElementById("coursesContainer");
  container.innerHTML = "";

  course.content.forEach((item) => {
    container.appendChild(this.createCard(item, item.type));
  });

  this.updateBreadcrumb();
};

BASH.openFolder = function (folder, pushHistory = true) {
  if (pushHistory) {
      this.breadcrumbPath.push({ name: folder.name, action: 'folder', data: folder });
      history.pushState({ id: 'folder', page: 'courses' }, '', '#courses');
  }
  const container = document.getElementById("coursesContainer");
  container.innerHTML = "";

  folder.content.forEach((item) => {
    container.appendChild(this.createCard(item, item.type));
  });

  this.updateBreadcrumb();
};

BASH.openFile = function (file) {
  BASH.openDocument(file.name, file.link);
};

BASH.updateBreadcrumb = function () {
  const breadcrumb = document.getElementById("breadcrumb");
  if (!breadcrumb) return;

  breadcrumb.innerHTML = "";
  
  const homeSpan = document.createElement("span");
  homeSpan.className = `breadcrumb-item ${this.breadcrumbPath.length === 0 ? "active" : ""}`;
  homeSpan.textContent = "Home";
  homeSpan.addEventListener("click", () => {
      if (this.breadcrumbPath.length > 0) {
          history.go(-this.breadcrumbPath.length);
      }
  });
  breadcrumb.appendChild(homeSpan);

  if (this.breadcrumbPath.length > 0) {
      const arrow = document.createElement("span");
      arrow.className = "breadcrumb-arrow";
      arrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
      breadcrumb.appendChild(arrow);
  }

  this.breadcrumbPath.forEach((item, index) => {
    const span = document.createElement("span");
    span.className = `breadcrumb-item ${index === this.breadcrumbPath.length - 1 ? "active" : ""}`;
    span.textContent = item.name;
    span.addEventListener("click", () => {
       const stepsBack = this.breadcrumbPath.length - 1 - index;
       if (stepsBack > 0) {
           history.go(-stepsBack);
       }
    });
    breadcrumb.appendChild(span);

    if (index < this.breadcrumbPath.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "breadcrumb-arrow";
      arrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
      breadcrumb.appendChild(arrow);
    }
  });
};

BASH.filterCourses = function (query, filter) {
  const cards = document.querySelectorAll(".course-card");
  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    const typeEl = card.querySelector(".course-card-type");
    const type = typeEl ? typeEl.textContent.toLowerCase() : "";

    const matchesQuery = !query || text.includes(query);
    const matchesFilter = filter === "all" || type === filter;

    card.style.display = matchesQuery && matchesFilter ? "" : "none";
  });
};
