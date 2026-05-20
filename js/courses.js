// CSV Parser helper - handles quoted values properly
BASH.parseCSVLine = function (line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());
  return result;
};

// Get courses data from EXAMS sheet (new data structure)
BASH.fetchCourses = async function () {
  // Fetch from EXAMS sheet to get course documents
  if (!BASH_CONFIG.SHEETS.EXAMS) {
    this.data.courses = [];
    this.coursesError =
      "No courses data source configured. Please add the CSV URL in config.js.";
    return this.data.courses;
  }

  try {
    const response = await fetch(BASH_CONFIG.SHEETS.EXAMS);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    this.data.courses = this.parseCoursesFromExams(csvText);
    this.coursesError = null;
    console.log("Courses loaded successfully:", this.data.courses);
    return this.data.courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    this.data.courses = [];
    this.coursesError = "Failed to load courses. Please check the data source.";
    return this.data.courses;
  }
};

BASH.parseCoursesFromExams = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const semesters = {};

  for (let i = 1; i < lines.length; i++) {
    const values = this.parseCSVLine(lines[i]);
    if (values.length < 4) continue;

    const courseId = values[0];
    const courseName = values[1];
    const semester = values[2];
    const year = values[3];
    const midLink = values[4] || "";
    const finalLink = values[5] || "";
    const bookLink = values[6] || "";
    const outlineLink = values[7] || "";
    const lectureNotesLink = values[8] || "";
    const googleFolderLink = values[9] || "";

    // Group by semester
    if (!semesters[semester]) {
      semesters[semester] = {
        id: semester.toLowerCase().replace(/\s+/g, "-"),
        title: semester,
        courses: {},
      };
    }

    // Group by course within semester
    if (!semesters[semester].courses[courseName]) {
      semesters[semester].courses[courseName] = {
        id: courseId.toLowerCase().replace(/\s+/g, "-"),
        name: courseName,
        icon: "fa-book",
        type: "course",
        documents: [],
      };
    }

    const course = semesters[semester].courses[courseName];

    // Add document items from EXAMS columns (only if they have links)
    if (midLink) {
      course.documents.push({
        name: "Mid Term Exam",
        type: "document",
        link: midLink,
        icon: "fa-file-pdf",
        fileType: "pdf",
      });
    }

    if (finalLink) {
      course.documents.push({
        name: "Final Exam",
        type: "document",
        link: finalLink,
        icon: "fa-file-pdf",
        fileType: "pdf",
      });
    }

    if (outlineLink) {
      course.documents.push({
        name: "Course Outline",
        type: "document",
        link: outlineLink,
        icon: "fa-list",
        fileType: "outline",
      });
    }

    if (bookLink) {
      course.documents.push({
        name: "Course Book",
        type: "document",
        link: bookLink,
        icon: "fa-book",
        fileType: "book",
      });
    }

    if (lectureNotesLink) {
      course.documents.push({
        name: "Lecture Notes",
        type: "document",
        link: lectureNotesLink,
        icon: "fa-clipboard",
        fileType: "notes",
      });
    }

    if (googleFolderLink) {
      course.documents.push({
        name: "📁 Google Drive Folder",
        type: "folder",
        link: googleFolderLink,
        icon: "fa-google-drive",
        fileType: "google-drive",
      });
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
  container.className = "course-grid grid-2-col";
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
    case "document":
      // Use icon from document item if available
      iconClass = item.icon || "fa-file";
      if (item.fileType === "pdf") iconClass = "fa-file-pdf";
      else if (item.fileType === "book") iconClass = "fa-book";
      else if (item.fileType === "outline") iconClass = "fa-list";
      else if (item.fileType === "notes") iconClass = "fa-clipboard";
      iconColorClass = "icon-document";
      break;
    case "folder":
      iconClass = item.icon || "fa-folder-open";
      if (item.fileType === "google-drive") iconClass = "fa-folder";
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
    else if (type === "folder") {
      // Folder is always a link in new structure
      this.openFile(item);
    } else {
      // Document item - open the link
      this.openFile(item);
    }
  });

  return div;
};

BASH.openSemester = function (semester, pushHistory = true) {
  if (pushHistory) {
    this.breadcrumbPath.push({
      name: semester.title,
      action: "semester",
      data: semester,
    });
    history.pushState({ id: "folder", page: "courses" }, "", "#courses");
  }
  const container = document.getElementById("coursesContainer");
  container.className = "course-grid grid-1-col";
  container.innerHTML = "";

  semester.courses.forEach((course) => {
    container.appendChild(this.createCard(course, "course"));
  });

  this.updateBreadcrumb();
};

BASH.openCourse = function (course, pushHistory = true) {
  if (pushHistory) {
    this.breadcrumbPath.push({
      name: course.name,
      action: "course",
      data: course,
    });
    history.pushState({ id: "course", page: "courses" }, "", "#courses");
  }
  const container = document.getElementById("coursesContainer");
  container.className = "course-grid grid-2-col";
  container.innerHTML = "";

  // Display all documents for this course
  if (course.documents && course.documents.length > 0) {
    course.documents.forEach((doc) => {
      container.appendChild(
        this.createCard(doc, doc.type === "folder" ? "folder" : "document"),
      );
    });
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Documents Available</h3>
        <p>No documents have been added for this course yet.</p>
      </div>
    `;
  }

  this.updateBreadcrumb();
};

BASH.openFile = function (file) {
  if (!file.link) return;
  const courseName = this.getActiveCourseName();
  const folderName = file.name || file.title || "";
  BASH.openDriveLink(file.link, courseName, folderName);
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
