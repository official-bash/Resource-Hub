const BASH = {
    currentPage: 'courses',
    data: {
        courses: null,
        exams: null,
        tasks: null
    },
    
    previousState: null,
    breadcrumbPath: [],
    
    init() {
        this.loadNavigation();
        this.loadPage('courses');
        this.setupSearch();
    },
    
    
    loadNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });
    },
    
    navigateTo(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        this.currentPage = page;
        this.breadcrumbPath = [];
        this.loadPage(page);
        this.updateFilters(page);
        document.getElementById('searchInput').value = '';
    },
    
    loadPage(page) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i></div>';
        
        setTimeout(() => {
            switch(page) {
                case 'courses': this.renderCoursesPage(); break;
                case 'exams': this.renderExamsPage(); break;
                case 'contribute': this.renderContributePage(); break;
                case 'tasks': this.renderTasksPage(); break;
                case 'contact': this.renderContactPage(); break;
            }
        }, 200);
    },
    
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        let debounceTimer;
        
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.handleSearch(searchInput.value);
            }, 300);
        });
    },
    
    handleSearch(query) {
        query = query.toLowerCase().trim();
        const filterActive = document.querySelector('.filter-chip.active');
        const filterValue = filterActive ? filterActive.dataset.filter : 'all';
        
        switch(this.currentPage) {
            case 'courses': this.filterCourses(query, filterValue); break;
            case 'exams': this.filterExams(query, filterValue); break;
            case 'tasks': this.filterTasks(query, filterValue); break;
            case 'contribute': this.filterContribution(query, filterValue); break;
        }
    },
    
    updateFilters(page) {
        const filterContainer = document.getElementById('filterContainer');
        filterContainer.innerHTML = '';
        
        const filters = this.getFiltersForPage(page);
        if (filters.length === 0) return;
        
        filters.forEach((filter, index) => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip' + (index === 0 ? ' active' : '');
            chip.dataset.filter = filter.value;
            chip.textContent = filter.label;
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                document.getElementById('searchInput').value = '';
                this.handleSearch('');
            });
            filterContainer.appendChild(chip);
        });
    },
    
    getFiltersForPage(page) {
        switch(page) {
            case 'courses':
                return [
                    { label: 'All', value: 'all' },
                    { label: 'Folders', value: 'folder' },
                    { label: 'Files', value: 'file' }
                ];
            case 'exams':
                return [
                    { label: 'All', value: 'all' },
                    { label: 'Mid Term', value: 'mid' },
                    { label: 'Final', value: 'final' }
                ];
            case 'tasks':
                return [
                    { label: 'All', value: 'all' },
                    { label: 'Active', value: 'active' },
                    { label: 'Expired', value: 'expired' }
                ];
            case 'contribute':
                return [
                    { label: 'All Missing', value: 'all' },
                    { label: 'Mid Missing', value: 'mid' },
                    { label: 'Final Missing', value: 'final' }
                ];
            default: return [];
        }
    }
};

document.addEventListener('DOMContentLoaded', () => BASH.init());