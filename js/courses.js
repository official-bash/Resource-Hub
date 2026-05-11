// Get courses data from Google Sheet or demo
BASH.fetchCourses = async function() {
    if (BASH_CONFIG.SHEETS.COURSES) {
        try {
            const response = await fetch(BASH_CONFIG.SHEETS.COURSES);
            const csvText = await response.text();
            this.data.courses = this.parseCoursesCSV(csvText);
            return this.data.courses;
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    }
    this.data.courses = this.getDemoCourses();
    return this.data.courses;
};


BASH.parseCoursesCSV = function(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return this.getDemoCourses();
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const semesters = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 6) continue;
        
        const [semester, course, folder, file, link, type] = values;
        
        if (!semesters[semester]) {
            semesters[semester] = {
                id: semester.toLowerCase().replace(/\s+/g, '-'),
                title: semester,
                courses: {}
            };
        }
        
        if (!semesters[semester].courses[course]) {
            semesters[semester].courses[course] = {
                id: course.toLowerCase().replace(/\s+/g, '-'),
                name: course,
                icon: 'fa-folder',
                type: 'folder',
                content: []
            };
        }
        
        if (file && link) {
            const fileObj = {
                name: file,
                type: 'file',
                link: link,
                fileType: type || 'file'
            };
            
            if (folder) {
                let folderObj = semesters[semester].courses[course].content.find(f => f.name === folder && f.type === 'folder');
                if (!folderObj) {
                    folderObj = { name: folder, type: 'folder', content: [] };
                    semesters[semester].courses[course].content.push(folderObj);
                }
                folderObj.content.push(fileObj);
            } else {
                semesters[semester].courses[course].content.push(fileObj);
            }
        }
    }
    
    return Object.values(semesters).map(sem => ({
        ...sem,
        courses: Object.values(sem.courses)
    }));
};

BASH.getDemoCourses = function() {
    return [
        {
            id: "semester-1",
            title: "Semester 1",
            courses: [
                {
                    id: "ba-101",
                    name: "Intro to BA",
                    icon: "fa-chart-pie",
                    type: "folder",
                    content: [
                        {
                            name: "Week 1 - Basics",
                            type: "folder",
                            content: [
                                { name: "Lecture 1.pdf", type: "file", link: "https://drive.google.com/file/d/sample1/preview", fileType: "pdf" },
                                { name: "Assignment 1.pdf", type: "file", link: "https://drive.google.com/file/d/sample2/preview", fileType: "pdf" }
                            ]
                        },
                        { name: "Syllabus.pdf", type: "file", link: "https://drive.google.com/file/d/sample3/preview", fileType: "pdf" }
                    ]
                },
                {
                    id: "ba-102",
                    name: "Business Math",
                    icon: "fa-calculator",
                    type: "folder",
                    content: []
                }
            ]
        },
        {
            id: "semester-2",
            title: "Semester 2",
            courses: [
                {
                    id: "ba-201",
                    name: "Data Analytics",
                    icon: "fa-chart-bar",
                    type: "folder",
                    content: []
                }
            ]
        }
    ];
};

// Render Courses Page
BASH.renderCoursesPage = async function() {
    const courses = await this.fetchCourses();
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="section-title">📚 Courses</div>
        <div id="breadcrumb" class="breadcrumb"></div>
        <div id="coursesContainer" class="course-grid"></div>
    `;
    
    this.breadcrumbPath = [];
    this.displaySemesters(courses);
};

BASH.displaySemesters = function(semesters) {
    const container = document.getElementById('coursesContainer');
    container.innerHTML = '';
    
    semesters.forEach(sem => {
        const card = this.createCard(sem, 'semester');
        container.appendChild(card);
    });
    
    this.updateBreadcrumb([{ name: 'Home', onClick: () => this.displaySemesters(this.data.courses) }]);
};

BASH.createCard = function(item, type) {
    const div = document.createElement('div');
    div.className = 'course-card fade-in';
    
    let iconClass = 'fa-graduation-cap';
    let iconColorClass = 'icon-course';
    
    switch(type) {
        case 'semester':
            iconClass = 'fa-calendar-alt';
            iconColorClass = 'icon-semester';
            break;
        case 'course':
            iconClass = item.icon || 'fa-book';
            iconColorClass = 'icon-course';
            break;
        case 'folder':
            iconClass = 'fa-folder-open';
            iconColorClass = 'icon-folder';
            break;
        default:
            if (item.fileType === 'pdf') iconClass = 'fa-file-pdf';
            else iconClass = 'fa-file';
            iconColorClass = 'icon-file';
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
    
    div.addEventListener('click', () => {
        if (type === 'semester') this.openSemester(item);
        else if (type === 'course') this.openCourse(item);
        else if (type === 'folder') this.openFolder(item);
        else this.openFile(item);
    });
    
    return div;
};

BASH.openSemester = function(semester) {
    this.breadcrumbPath.push({ name: semester.title, onClick: () => this.openSemester(semester) });
    const container = document.getElementById('coursesContainer');
    container.innerHTML = '';
    
    semester.courses.forEach(course => {
        container.appendChild(this.createCard(course, 'course'));
    });
    
    this.updateBreadcrumb(this.breadcrumbPath);
};

BASH.openCourse = function(course) {
    this.breadcrumbPath.push({ name: course.name, onClick: () => this.openCourse(course) });
    const container = document.getElementById('coursesContainer');
    container.innerHTML = '';
    
    course.content.forEach(item => {
        container.appendChild(this.createCard(item, item.type));
    });
    
    this.updateBreadcrumb(this.breadcrumbPath);
};

BASH.openFolder = function(folder) {
    this.breadcrumbPath.push({ name: folder.name, onClick: () => this.openFolder(folder) });
    const container = document.getElementById('coursesContainer');
    container.innerHTML = '';
    
    folder.content.forEach(item => {
        container.appendChild(this.createCard(item, item.type));
    });
    
    this.updateBreadcrumb(this.breadcrumbPath);
};

BASH.openFile = function(file) {
    const mainContent = document.getElementById('mainContent');
    this.previousState = mainContent.innerHTML;
    
    mainContent.innerHTML = `
        <button onclick="BASH.closeFileViewer()" style="margin-bottom:16px; padding:8px 16px; background:var(--bash-navy); color:white; border:none; border-radius:20px; cursor:pointer; font-size:14px;">
            <i class="fas fa-arrow-left"></i> Back
        </button>
        <div style="background:white; border-radius:12px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom:12px; color:var(--bash-navy);">
                <i class="fas fa-file-pdf" style="color:#E53935;"></i> ${file.name}
            </h3>
            <iframe src="${file.link}" width="100%" height="600px" style="border:none; border-radius:8px;" 
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms">
            </iframe>
        </div>
    `;
};

BASH.closeFileViewer = function() {
    if (this.previousState) {
        document.getElementById('mainContent').innerHTML = this.previousState;
    }
};

BASH.updateBreadcrumb = function(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    breadcrumb.innerHTML = '';
    path.forEach((item, index) => {
        const span = document.createElement('span');
        span.className = `breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`;
        span.textContent = item.name;
        span.addEventListener('click', () => {
            this.breadcrumbPath = path.slice(0, index + 1);
            item.onClick();
        });
        breadcrumb.appendChild(span);
        
        if (index < path.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'breadcrumb-arrow';
            arrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
            breadcrumb.appendChild(arrow);
        }
    });
};

BASH.filterCourses = function(query, filter) {
    const cards = document.querySelectorAll('.course-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const typeEl = card.querySelector('.course-card-type');
        const type = typeEl ? typeEl.textContent.toLowerCase() : '';
        
        const matchesQuery = !query || text.includes(query);
        const matchesFilter = filter === 'all' || type === filter;
        
        card.style.display = matchesQuery && matchesFilter ? '' : 'none';
    });
};