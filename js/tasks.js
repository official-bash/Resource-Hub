BASH.fetchTasks = async function () {
  // If no URL configured, return empty array
  if (!BASH_CONFIG.SHEETS.TASKS) {
    this.data.tasks = [];
    this.tasksError =
      "No tasks data source configured. Please add the CSV URL in config.js.";
    return this.data.tasks;
  }

  try {
    const response = await fetch(BASH_CONFIG.SHEETS.TASKS);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    this.data.tasks = this.parseTasksCSV(csvText);
    this.tasksError = null;
    return this.data.tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    this.data.tasks = [];
    this.tasksError = "Failed to load tasks. Please check the data source.";
    return this.data.tasks;
  }
};

BASH.parseTasksCSV = function (csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const tasks = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < 5) continue;

    tasks.push({
      id: values[0],
      title: values[1],
      reward: values[2],
      deadline: values[3],
      description: values[4],
    });
  }

  return tasks;
};

BASH.renderTasksPage = async function () {
  const tasks = await this.fetchTasks();
  const mainContent = document.getElementById("mainContent");

  // Check for errors
  if (this.tasksError) {
    let html = '<div class="section-title">📋 Tasks & Challenges</div>';
    html += `
      <div class="empty-state error">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Unable to Load Tasks</h3>
        <p>${this.tasksError}</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  // Check for empty state
  if (!tasks || tasks.length === 0) {
    let html = '<div class="section-title">📋 Tasks & Challenges</div>';
    html += `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Tasks Found</h3>
        <p>Tasks will appear here once the data source is configured.</p>
      </div>
    `;
    mainContent.innerHTML = html;
    return;
  }

  let html = '<div class="section-title">📋 Tasks & Challenges</div>';
  html += '<div id="tasksContainer">';

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
  mainContent.innerHTML = html;
};

BASH.filterTasks = function (query, filter) {
  const cards = document.querySelectorAll("#tasksContainer .task-card");
  cards.forEach((card) => {
    const text = card.dataset.title;
    const status = card.dataset.status;

    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesFilter = filter === "all" || status === filter;

    card.style.display = matchesQuery && matchesFilter ? "" : "none";
  });
};
