BASH.fetchTasks = async function() {
    if (BASH_CONFIG.SHEETS.TASKS) {
        try {
            const response = await fetch(BASH_CONFIG.SHEETS.TASKS);
            const csvText = await response.text();
            this.data.tasks = this.parseTasksCSV(csvText);
            return this.data.tasks;
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }
    this.data.tasks = this.getDemoTasks();
    return this.data.tasks;
};


BASH.parseTasksCSV = function(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return this.getDemoTasks();
    
    const tasks = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 5) continue;
        
        tasks.push({
            id: values[0],
            title: values[1],
            reward: values[2],
            deadline: values[3],
            description: values[4]
        });
    }
    
    return tasks;
};

BASH.getDemoTasks = function() {
    return [
        { id: "t1", title: "Data Cleaning Challenge", reward: "Certificate", deadline: "2026-10-10", description: "Clean and prepare a raw dataset using Python or Excel. Submit your cleaned dataset with documentation." },
        { id: "t2", title: "Dashboard Design", reward: "BASH Merch", deadline: "2025-01-01", description: "Create an interactive PowerBI dashboard using the provided sales dataset." },
        { id: "t3", title: "Case Study Analysis", reward: "Bonus Points", deadline: "2025-06-15", description: "Analyze the given business case and submit a 2-page report with recommendations." }
    ];
};

BASH.renderTasksPage = async function() {
    const tasks = await this.fetchTasks();
    const mainContent = document.getElementById('mainContent');
    
    let html = '<div class="section-title">📋 Tasks & Challenges</div>';
    html += '<div id="tasksContainer">';
    
    tasks.forEach(task => {
        const isExpired = new Date(task.deadline) < new Date();
        
        html += `
            <div class="task-card fade-in" data-title="${task.title.toLowerCase()}" data-status="${isExpired ? 'expired' : 'active'}">
                <div class="task-title">${task.title}</div>
                <div class="task-desc">${task.description}</div>
                <div class="task-meta">
                    <span class="task-reward">
                        <i class="fas fa-gift"></i> ${task.reward}
                    </span>
                    <span class="task-deadline ${isExpired ? 'expired' : ''}">
                        <i class="fas fa-clock"></i> ${isExpired ? 'Expired: ' : 'Due: '}${task.deadline}
                    </span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    mainContent.innerHTML = html;
};

BASH.filterTasks = function(query, filter) {
    const cards = document.querySelectorAll('#tasksContainer .task-card');
    cards.forEach(card => {
        const text = card.dataset.title;
        const status = card.dataset.status;
        
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesFilter = filter === 'all' || status === filter;
        
        card.style.display = matchesQuery && matchesFilter ? '' : 'none';
    });
};