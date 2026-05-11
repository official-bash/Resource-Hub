BASH.fetchExams = async function() {
    if (BASH_CONFIG.SHEETS.EXAMS) {
        try {
            const response = await fetch(BASH_CONFIG.SHEETS.EXAMS);
            const csvText = await response.text();
            this.data.exams = this.parseExamsCSV(csvText);
            return this.data.exams;
        } catch (error) {
            console.error('Error fetching exams:', error);
        }
    }
    this.data.exams = this.getDemoExams();
    return this.data.exams;
};


BASH.parseExamsCSV = function(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return this.getDemoExams();
    
    const exams = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 6) continue;
        
        exams.push({
            course_id: values[0],
            course_name: values[1],
            semester: values[2],
            year: values[3],
            mid_link: values[4],
            final_link: values[5]
        });
    }
    
    return exams;
};

BASH.getDemoExams = function() {
    return [
        { course_id: "ba-101", course_name: "Intro to BA", semester: "1", year: "F25", mid_link: "https://drive.google.com/file/d/sample-mid/preview", final_link: "" },
        { course_id: "ba-102", course_name: "Business Math", semester: "1", year: "S24", mid_link: "", final_link: "https://drive.google.com/file/d/sample-final/preview" },
        { course_id: "ba-201", course_name: "Data Analytics", semester: "2", year: "F25", mid_link: "https://drive.google.com/file/d/sample-mid2/preview", final_link: "https://drive.google.com/file/d/sample-final2/preview" }
    ];
};

BASH.renderExamsPage = async function() {
    const exams = await this.fetchExams();
    const mainContent = document.getElementById('mainContent');
    
    let html = '<div class="section-title">📝 Exam Papers</div>';
    html += '<div id="examsContainer">';
    
    exams.forEach(exam => {
        html += `
            <div class="exam-card fade-in" data-course="${exam.course_name.toLowerCase()}" 
                 data-has-mid="${!!exam.mid_link}" data-has-final="${!!exam.final_link}">
                <div class="exam-header">
                    <div>
                        <div class="exam-course">${exam.course_name}</div>
                        <div class="exam-meta">Semester ${exam.semester} | ${exam.year}</div>
                    </div>
                    <div class="exam-badge">Sem ${exam.semester}</div>
                </div>
                <div class="exam-links">
                    ${exam.mid_link ? 
                        `<a href="${exam.mid_link}" target="_blank" class="exam-btn btn-mid">
                            <i class="fas fa-file-pdf"></i> Mid Term
                        </a>` : 
                        `<span class="exam-btn btn-missing">
                            <i class="fas fa-question-circle"></i> Mid Missing
                        </span>`
                    }
                    ${exam.final_link ? 
                        `<a href="${exam.final_link}" target="_blank" class="exam-btn btn-final">
                            <i class="fas fa-file-pdf"></i> Final
                        </a>` : 
                        `<span class="exam-btn btn-missing">
                            <i class="fas fa-question-circle"></i> Final Missing
                        </span>`
                    }
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    mainContent.innerHTML = html;
};

BASH.filterExams = function(query, filter) {
    const cards = document.querySelectorAll('#examsContainer .exam-card');
    cards.forEach(card => {
        const text = card.dataset.course;
        const hasMid = card.dataset.hasMid === 'true';
        const hasFinal = card.dataset.hasFinal === 'true';
        
        const matchesQuery = !query || text.includes(query.toLowerCase());
        let matchesFilter = filter === 'all';
        if (filter === 'mid') matchesFilter = hasMid;
        if (filter === 'final') matchesFilter = hasFinal;
        
        card.style.display = matchesQuery && matchesFilter ? '' : 'none';
    });
};