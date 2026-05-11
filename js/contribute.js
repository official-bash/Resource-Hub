BASH.renderContributePage = async function() {
    const exams = this.data.exams || await this.fetchExams();
    const mainContent = document.getElementById('mainContent');
    
    const missingPapers = [];
    exams.forEach(exam => {
        if (!exam.mid_link) {
            missingPapers.push({
                course: exam.course_name,
                type: 'Mid Term',
                examType: 'mid',
                semester: exam.semester,
                year: exam.year
            });
        }
        
        if (!exam.final_link) {
            missingPapers.push({
                course: exam.course_name,
                type: 'Final',
                examType: 'final',
                semester: exam.semester,
                year: exam.year
            });
        }
    });
    
    let html = '<div class="section-title">🤝 Contribute to BASH</div>';
    html += '<p style="margin-bottom:20px; color:var(--dark-gray);">Help fellow students! Click any missing paper to contribute via WhatsApp.</p>';
    
    if (missingPapers.length === 0) {
        html += `
            <div class="empty-state success">
                <i class="fas fa-check-circle"></i>
                <h3>All Papers Available!</h3>
                <p>No missing papers at the moment. Thank you!</p>
            </div>
        `;
    } else {
        html += `<div id="missingContainer"><p style="margin-bottom:12px; color:var(--bash-navy); font-weight:600;">${missingPapers.length} missing papers found:</p>`;
        
        missingPapers.forEach(paper => {
            const message = encodeURIComponent(`Hi, I have the ${paper.type} for ${paper.course} (Semester ${paper.semester}, ${paper.year}) and want to contribute to BASH.`);
            const whatsappLink = `https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${message}`;
            
            html += `
                <div class="exam-card fade-in" data-course="${paper.course.toLowerCase()}" 
                     data-exam-type="${paper.examType}" style="border-left-color: var(--bash-orange);">
                    <div class="exam-header">
                        <div>
                            <div class="exam-course">${paper.course}</div>
                            <div class="exam-meta">Semester ${paper.semester} | ${paper.year}</div>
                        </div>
                        <div class="exam-badge" style="background:#E53935;">${paper.type}</div>
                    </div>
                    <a href="${whatsappLink}" target="_blank" class="exam-btn btn-contribute" style="text-decoration:none;">
                        <i class="fab fa-whatsapp"></i> Contribute ${paper.type}
                    </a>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    html += `
        <div class="contribute-cta">
            <h3>Have other resources?</h3>
            <p>Notes, assignments, or any helpful material - share with the community!</p>
            <a href="https://wa.me/${BASH_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I want to contribute resources to BASH!')}" 
               target="_blank" class="contribute-btn">
                <i class="fab fa-whatsapp"></i> Share Resources
            </a>
        </div>
    `;
    
    mainContent.innerHTML = html;
};

BASH.filterContribution = function(query, filter) {
    const container = document.getElementById('missingContainer');
    if (!container) return;
    
    const cards = container.querySelectorAll('.exam-card');
    cards.forEach(card => {
        const text = card.dataset.course;
        const examType = card.dataset.examType;
        
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesFilter = filter === 'all' || examType === filter;
        
        card.style.display = matchesQuery && matchesFilter ? '' : 'none';
    });
};