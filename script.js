// ===== Global State =====
let tasks = [];
let goals = [];
let streak = 0;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentView = 'month';
let theme = 'light';
let currentWeekStart = null;
let currentDayView = new Date();
let selectedDate = new Date().toISOString().split('T')[0];
let focusSession = null;
let focusSessionTimeouts = [];
const overdueWarningsShown = new Set();

const DEFAULT_TASK_TIME = '09:00';
const FALLBACK_TASK_TIME = '23:59';

// Settings
let settings = {
    taskReminderInterval: 120, // minutes
    breakReminderInterval: 60, // minutes
    soundEnabled: true,
    quoteInterval: 5 // minutes
};

// ===== Motivational & Funny Quotes =====
const quotes = [
    "You've got this! Keep learning! 🌟",
    "Coffee first, study later! ☕",
    "Your brain is like a muscle - use it or lose it! 💪",
    "Procrastination is like a credit card - fun until you get the bill! 😅",
    "Study hard, nap harder! 😴",
    "You're doing amazing, sweetie! 💖",
    "Remember: even Einstein had bad hair days! 🧠",
    "Keep calm and study on! 📚",
    "Your future self will thank you! 🎓",
    "Mistakes are proof that you're trying! ✨",
    "Study mode: ACTIVATED! 🚀",
    "You're one step closer to your dreams! 🌈",
    "Brain loading... Please wait! 🧠⏳",
    "Stressed spelled backwards is desserts! 🍰",
    "You're not lazy, you're on energy-saving mode! 🔋",
    "Knowledge is power, but coffee is life! ☕💪",
    "Study break = snack break! 🍕",
    "Your only limit is you! 🌟",
    "Make today ridiculously amazing! 🎉",
    "You're a study rockstar! 🎸"
];

const studyTips = [
    'Use the Pomodoro technique: 25 minutes of study followed by a 5 minute break. ⏳',
    'Summarize what you learned in your own words to boost retention. 🧠',
    'Tackle the toughest topic first while your energy is high. ⚡',
    'Keep a distraction list—write interruptions down and revisit them later. 📓',
    'Teach a friend the concept; explaining helps you master it. 👩‍🏫',
    'Organize your workspace to reduce mental clutter. 🧹',
    'Review notes before bed to strengthen memory consolidation. 🌙',
    'Break big goals into smaller tasks for steady progress. 🪜',
    'Stay hydrated and keep healthy snacks nearby for energy. 💧',
    'Use active recall with flashcards instead of passive rereading. 🗂️'
];

// ===== Badge System =====
const badges = [
    { id: 1, emoji: '🏆', name: 'First Task', unlocked: false },
    { id: 2, emoji: '⭐', name: '5 Day Streak', unlocked: false },
    { id: 3, emoji: '🎯', name: '10 Tasks Done', unlocked: false },
    { id: 4, emoji: '🔥', name: '30 Day Streak', unlocked: false },
    { id: 5, emoji: '👑', name: 'Study King', unlocked: false }
];

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    if (hours === undefined || minutes === undefined) return timeString;
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function renderUpcomingTasks() {
    const upcomingList = document.getElementById('upcomingDeadlines');
    const priorityInsights = document.getElementById('topPriorityInsights');

    const activeTasks = [...tasks]
        .filter(task => task.status !== 'done')
        .map(task => ({ ...task, dueDateTime: combineDateTime(task.dueDate, task.dueTime) }))
        .filter(task => task.dueDateTime !== null);

    const upcomingTasks = [...activeTasks]
        .sort((a, b) => a.dueDateTime - b.dueDateTime)
        .slice(0, 5);

    if (upcomingList) {
        upcomingList.innerHTML = '';
        if (upcomingTasks.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-state';
            emptyItem.textContent = 'No upcoming deadlines. ✅';
            upcomingList.appendChild(emptyItem);
        } else {
            upcomingTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'insight-item';
                const titleSpan = document.createElement('span');
                titleSpan.textContent = task.title;
                const dateSpan = document.createElement('span');
                dateSpan.className = 'insight-meta';
                const timePart = formatTime(task.dueTime);
                dateSpan.textContent = `${formatDate(task.dueDate)}${timePart ? ` · ${timePart}` : ''}`;
                li.appendChild(titleSpan);
                li.appendChild(dateSpan);
                li.addEventListener('click', () => openCalendarTaskModal(task.dueDate, task.id));
                upcomingList.appendChild(li);
            });
        }
    }

    if (priorityInsights) {
        priorityInsights.innerHTML = '';
        const priorityOrder = ['high', 'medium', 'low'];
        const priorityLabels = {
            high: 'High Priority',
            medium: 'Medium Priority',
            low: 'Low Priority'
        };

        let hasPriorities = false;
        priorityOrder.forEach(priority => {
            const tasksForPriority = activeTasks
                .filter(task => task.priority === priority)
                .sort((a, b) => a.dueDateTime - b.dueDateTime)
                .slice(0, 3);

            if (tasksForPriority.length > 0) {
                hasPriorities = true;
                const li = document.createElement('li');
                li.className = `insight-item priority-${priority}`;
                const header = document.createElement('div');
                header.className = 'insight-header';
                header.textContent = `${priorityLabels[priority]} · ${tasksForPriority.length} task${tasksForPriority.length > 1 ? 's' : ''}`;
                li.appendChild(header);

                const nestedList = document.createElement('ul');
                nestedList.className = 'insight-sublist';
                tasksForPriority.forEach(task => {
                    const nestedItem = document.createElement('li');
                    const timePart = formatTime(task.dueTime);
                    nestedItem.textContent = `${task.title} · ${formatDate(task.dueDate)}${timePart ? ` · ${timePart}` : ''}`;
                    nestedItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openCalendarTaskModal(task.dueDate, task.id);
                    });
                    nestedList.appendChild(nestedItem);
                });

                li.appendChild(nestedList);
                priorityInsights.appendChild(li);
            }
        });

        if (!hasPriorities) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-state';
            emptyItem.textContent = 'Add tasks to see priority insights.';
            priorityInsights.appendChild(emptyItem);
        }
    }
}

// ===== Dashboard Helpers =====

function renderTodaysTasks() {
    const todaysTasksList = document.getElementById('todaysTasksList');
    if (!todaysTasksList) return;
    todaysTasksList.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = tasks
        .filter(task => task.dueDate === today)
        .sort((a, b) =>
            combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime)
        );

    if (todaysTasks.length === 0) {
        todaysTasksList.innerHTML = '<p class="empty-state">No tasks scheduled for today. ✅</p>';
        return;
    }

    todaysTasks.forEach(task => {
        todaysTasksList.appendChild(createDashboardTaskItem(task, 'today-task'));
    });
}

function renderPriorityTasks() {
    const priorityMap = {
        high: document.getElementById('highPriorityList'),
        medium: document.getElementById('mediumPriorityList'),
        low: document.getElementById('lowPriorityList')
    };

    Object.entries(priorityMap).forEach(([priority, container]) => {
        if (!container) return;
        container.innerHTML = '';

        const filteredTasks = tasks
            .filter(task => task.priority === priority)
            .sort((a, b) => combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime))
            .slice(0, 5);

        if (filteredTasks.length === 0) {
            container.innerHTML = `<p class="empty-state">No ${priority} priority tasks.</p>`;
            return;
        }

        filteredTasks.forEach(task => {
            container.appendChild(createDashboardTaskItem(task, `priority-task ${priority}`));
        });
    });
}

function createDashboardTaskItem(task, baseClass) {
    const item = document.createElement('div');
    item.className = baseClass;

    const info = document.createElement('div');
    info.className = 'dashboard-task-info';

    const title = document.createElement('div');
    title.className = 'dashboard-task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'dashboard-task-meta';
    const timeText = formatTime(task.dueTime);
    const timeSuffix = timeText ? ` · ${timeText}` : '';
    meta.textContent = `${formatDate(task.dueDate)}${timeSuffix} · ${formatStatus(task.status)}`;

    info.appendChild(title);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'dashboard-task-actions';

    const statusBtn = document.createElement('button');
    statusBtn.className = 'task-action-btn';
    statusBtn.title = 'Cycle status';
    statusBtn.innerHTML = '<i class="fas fa-check"></i>';
    statusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTaskStatus(task.id);
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = '<i class="fas fa-pen"></i>';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCalendarTaskModal(task.dueDate, task.id);
    });

    actions.appendChild(statusBtn);
    actions.appendChild(editBtn);

    item.appendChild(info);
    item.appendChild(actions);

    item.addEventListener('click', () => openCalendarTaskModal(task.dueDate, task.id));

    return item;
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeApp();
    setupEventListeners();
    updateGreeting();
    displayRandomQuote();
    displayStudyTip();
    renderTasks();
    renderCalendarView();
    renderGoals();
    renderGoalsSummary();
    renderBadges();
    updateAnalytics();
    updateProgress();
    checkReminders();

    // Set up periodic checks
    setInterval(checkReminders, 60000); // Check every minute
    window.quoteInterval = setInterval(displayRandomQuote, settings.quoteInterval * 60000);
});

// ===== Local Storage Functions =====
function saveToLocalStorage() {
    localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
    localStorage.setItem('studyPlannerGoals', JSON.stringify(goals));
    localStorage.setItem('studyPlannerStreak', streak.toString());
    localStorage.setItem('studyPlannerBadges', JSON.stringify(badges));
    localStorage.setItem('studyPlannerTheme', theme);
    localStorage.setItem('studyPlannerSettings', JSON.stringify(settings));
}

function loadFromLocalStorage() {
    const savedTasks = localStorage.getItem('studyPlannerTasks');
    const savedGoals = localStorage.getItem('studyPlannerGoals');
    const savedStreak = localStorage.getItem('studyPlannerStreak');
    const savedBadges = localStorage.getItem('studyPlannerBadges');
    const savedTheme = localStorage.getItem('studyPlannerTheme');
    const savedSettings = localStorage.getItem('studyPlannerSettings');
    
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        tasks.forEach(ensureTaskDefaults);
    }
    if (savedGoals) goals = JSON.parse(savedGoals);
    if (savedStreak) streak = parseInt(savedStreak);
    if (savedBadges) Object.assign(badges, JSON.parse(savedBadges));
    if (savedTheme) {
        theme = savedTheme;
        document.documentElement.setAttribute('data-theme', theme);
    }
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
}

// ===== Initialize App =====
function initializeApp() {
    // Add some sample data if empty
    if (tasks.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = getTomorrowDate();
        tasks = [
            {
                id: Date.now(),
                title: 'Math Homework',
                description: 'Complete Chapter 5 exercises',
                dueDate: today,
                dueTime: '17:00',
                priority: 'high',
                status: 'todo',
                recurring: false
            },
            {
                id: Date.now() + 1,
                title: 'Read Chapter 3 Biology',
                description: 'Study cell structure',
                dueDate: tomorrow,
                dueTime: '10:00',
                priority: 'medium',
                status: 'todo',
                recurring: false
            },
            {
                id: Date.now() + 2,
                title: 'Study Group Meeting',
                description: 'Physics study session',
                dueDate: today,
                dueTime: '19:00',
                priority: 'low',
                status: 'in-progress',
                recurring: false
            }
        ];
    }
    
    if (goals.length === 0) {
        goals = [
            {
                id: Date.now(),
                title: 'Master Calculus',
                description: 'Complete all calculus topics by end of semester',
                deadline: getNextMonthDate(),
                progress: 45
            }
        ];
    }
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });
    
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Quick Add Task
    document.getElementById('quickAddBtn').addEventListener('click', openQuickAddModal);
    document.getElementById('closeQuickAdd').addEventListener('click', closeQuickAddModal);
    document.getElementById('quickAddForm').addEventListener('submit', handleQuickAddTask);
    
    // Add Goal
    document.getElementById('addGoalBtn').addEventListener('click', openAddGoalModal);
    document.getElementById('closeAddGoal').addEventListener('click', closeAddGoalModal);
    document.getElementById('addGoalForm').addEventListener('submit', handleAddGoal);
    
    // Calendar Navigation
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // Calendar View Toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.dataset.view;
            renderCalendarView();
        });
    });
    
    // Favorite Quote
    document.getElementById('favoriteQuoteBtn').addEventListener('click', favoriteQuote);

    // Study Tips
    const refreshTipBtn = document.getElementById('refreshTipBtn');
    if (refreshTipBtn) {
        refreshTipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            displayStudyTip();
        });
    }

    // Calendar task manager controls
    const openTaskManagerBtn = document.getElementById('openTaskManager');
    if (openTaskManagerBtn) {
        openTaskManagerBtn.addEventListener('click', () => openCalendarTaskModal(selectedDate));
    }

    const closeCalendarTaskModalBtn = document.getElementById('closeCalendarTaskModal');
    if (closeCalendarTaskModalBtn) {
        closeCalendarTaskModalBtn.addEventListener('click', closeCalendarTaskModal);
    }

    const calendarTaskForm = document.getElementById('calendarTaskForm');
    if (calendarTaskForm) {
        calendarTaskForm.addEventListener('submit', handleCalendarTaskSubmit);
    }

    const deleteCalendarTaskBtn = document.getElementById('deleteCalendarTaskBtn');
    if (deleteCalendarTaskBtn) {
        deleteCalendarTaskBtn.addEventListener('click', handleCalendarTaskDelete);
    }

    const focusSessionForm = document.getElementById('focusSessionForm');
    if (focusSessionForm) {
        focusSessionForm.addEventListener('submit', startFocusSession);
    }

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.theme-option-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.id === 'calendarTaskModal') {
            closeCalendarTaskModal();
        } else if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // Load settings into UI
    loadSettingsUI();
}

// ===== Navigation =====
function navigateToPage(pageName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
}

// ===== Theme Toggle =====
function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    saveToLocalStorage();
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== Greeting =====
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Morning! 🌅';
    
    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon! ☀️';
    } else if (hour >= 17 && hour < 21) {
        greeting = 'Good Evening! 🌆';
    } else if (hour >= 21 || hour < 5) {
        greeting = 'Burning the Midnight Oil! 🌙';
    }
    
    document.getElementById('greeting').textContent = greeting;
}

// ===== Quotes =====
function displayRandomQuote() {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quoteBubble').textContent = randomQuote;
}

function favoriteQuote() {
    const btn = document.getElementById('favoriteQuoteBtn');
    const icon = btn.querySelector('i');
    
    if (btn.classList.contains('favorited')) {
        btn.classList.remove('favorited');
        icon.className = 'far fa-heart';
        showNotification('Quote removed from favorites', 'info');
    } else {
        btn.classList.add('favorited');
        icon.className = 'fas fa-heart';
        showNotification('Quote added to favorites! 💖', 'success');
    }
}

function displayStudyTip() {
    const tipElement = document.getElementById('currentTip');
    if (!tipElement) return;
    const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];
    tipElement.textContent = randomTip;
}

// ===== Tasks Management =====
function renderTasks() {
    renderUpcomingTasks();
    renderTodaysTasks();
    renderPriorityTasks();
    renderGoalsSummary();
    updateCalendarTaskCount();
    checkOverdueTasks();
    const modal = document.getElementById('calendarTaskModal');
    if (modal?.classList.contains('active')) {
        populateSelectedDateTasks();
    }
}

function getTaskIcon(status) {
    const icons = {
        'todo': '📋',
        'in-progress': '⏳',
        'done': '✅'
    };
    return icons[status] || '📋';
}

function formatStatus(status) {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.status === 'todo') {
        task.status = 'in-progress';
    } else if (task.status === 'in-progress') {
        task.status = 'done';
        showNotification('Task completed! Great job! 🎉', 'success');
        triggerConfetti();
        checkBadges();
        updateStreak();
    } else {
        task.status = 'todo';
    }
    
    saveToLocalStorage();
    renderTasks();
    updateAnalytics();
    updateProgress();
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveToLocalStorage();
        renderTasks();
        updateAnalytics();
        updateProgress();
        showNotification('Task deleted', 'info');
    }
}

// ===== Quick Add Task Modal =====
function openQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    if (!modal) return;
    modal.classList.add('active');

    const confirmation = document.getElementById('quickAddConfirmation');
    if (confirmation) {
        confirmation.textContent = '';
        confirmation.classList.remove('visible', 'success', 'error');
    }

    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput) {
        dueDateInput.value = selectedDate || new Date().toISOString().split('T')[0];
    }

    const dueTimeInput = document.getElementById('taskDueTime');
    if (dueTimeInput) {
        dueTimeInput.value = getDefaultTimeForDate(dueDateInput?.value || selectedDate);
    }

    const titleInput = document.getElementById('taskTitle');
    titleInput?.focus();
}

function closeQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    if (!modal) return;
    modal.classList.remove('active');

    const form = document.getElementById('quickAddForm');
    form?.reset();

    const dueDateInput = document.getElementById('taskDueDate');
    const defaultDate = new Date().toISOString().split('T')[0];
    if (dueDateInput) {
        dueDateInput.value = defaultDate;
    }

    const dueTimeInput = document.getElementById('taskDueTime');
    if (dueTimeInput) {
        dueTimeInput.value = getDefaultTimeForDate(defaultDate);
    }

    const confirmation = document.getElementById('quickAddConfirmation');
    if (confirmation) {
        confirmation.textContent = '';
        confirmation.classList.remove('visible', 'success', 'error');
    }
}

function handleQuickAddTask(e) {
    e.preventDefault();
    
    const newTask = {
        id: Date.now(),
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        dueDate: document.getElementById('taskDueDate').value,
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value,
        recurring: document.getElementById('taskRecurring').checked
    };
    
    tasks.push(newTask);
    saveToLocalStorage();
    renderTasks();
    renderCalendarView();
    updateAnalytics();
    updateProgress();
    showNotification('Task added successfully! 🎯', 'success');
    checkBadges();

    const form = document.getElementById('quickAddForm');
    form?.reset();

    const dueDateInput = document.getElementById('taskDueDate');
    if (dueDateInput) {
        dueDateInput.value = selectedDate || new Date().toISOString().split('T')[0];
    }

    const confirmation = document.getElementById('quickAddConfirmation');
    if (confirmation) {
        confirmation.textContent = 'Task added to your planner! ✅';
        confirmation.classList.remove('error');
        confirmation.classList.add('visible', 'success');
        setTimeout(() => {
            confirmation.classList.remove('visible');
        }, 2200);
    }
}

function getTasksByDate(date) {
    return tasks
        .filter(task => task.dueDate === date)
        .sort((a, b) => combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime));
}

function setSelectedDate(date) {
    selectedDate = date;
    currentDayView = new Date(date);
    highlightSelectedCalendarDay();
    updateCalendarTaskCount();
}

function openCalendarTaskModal(date = selectedDate, taskId = null) {
    const modal = document.getElementById('calendarTaskModal');
    const form = document.getElementById('calendarTaskForm');
    if (!modal || !form) return;

    const normalizedDate = date || new Date().toISOString().split('T')[0];
    setSelectedDate(normalizedDate);

    modal.classList.add('active');
    form.reset();

    const taskIdField = document.getElementById('calendarTaskId');
    const titleInput = document.getElementById('calendarTaskTitle');
    const dateInput = document.getElementById('calendarTaskDate');
    const priorityInput = document.getElementById('calendarTaskPriority');
    const statusInput = document.getElementById('calendarTaskStatus');
    const descriptionInput = document.getElementById('calendarTaskDescription');
    const recurringInput = document.getElementById('calendarTaskRecurring');
    const timeInput = document.getElementById('calendarTaskTime');

    const selectedTask = taskId ? tasks.find(task => task.id === taskId) : null;

    taskIdField.value = selectedTask ? selectedTask.id : '';
    titleInput.value = selectedTask ? selectedTask.title : '';
    dateInput.value = normalizedDate;
    if (timeInput) {
        timeInput.value = selectedTask ? selectedTask.dueTime : getDefaultTimeForDate(normalizedDate);
    }
    priorityInput.value = selectedTask ? selectedTask.priority : 'medium';
    statusInput.value = selectedTask ? selectedTask.status : 'todo';
    descriptionInput.value = selectedTask ? (selectedTask.description || '') : '';
    recurringInput.checked = selectedTask ? Boolean(selectedTask.recurring) : false;

    const selectedDateLabel = document.getElementById('selectedDateLabel');
    if (selectedDateLabel) {
        selectedDateLabel.textContent = `Selected Date: ${formatFullDate(normalizedDate)}`;
    }

    populateSelectedDateTasks();
    titleInput?.focus();
}

function closeCalendarTaskModal() {
    const modal = document.getElementById('calendarTaskModal');
    if (!modal) return;
    modal.classList.remove('active');

    const form = document.getElementById('calendarTaskForm');
    form?.reset();

    const taskList = document.getElementById('selectedDateTasks');
    if (taskList) {
        taskList.innerHTML = '';
    }

    const taskIdField = document.getElementById('calendarTaskId');
    if (taskIdField) {
        taskIdField.value = '';
    }

    const selectedDateLabel = document.getElementById('selectedDateLabel');
    if (selectedDateLabel) {
        selectedDateLabel.textContent = '';
    }
}

function populateSelectedDateTasks() {
    const taskList = document.getElementById('selectedDateTasks');
    if (!taskList) return;

    taskList.innerHTML = '';
    const tasksForDate = getTasksByDate(selectedDate)
        .sort((a, b) => combineDateTime(a.dueDate, a.dueTime) - combineDateTime(b.dueDate, b.dueTime));

    if (tasksForDate.length === 0) {
        taskList.innerHTML = '<p class="empty-state">No tasks assigned to this date yet.</p>';
        return;
    }

    tasksForDate.forEach(task => {
        const item = document.createElement('div');
        item.className = 'calendar-task-item';

        const info = document.createElement('div');
        info.className = 'calendar-task-info';

        const title = document.createElement('div');
        title.className = 'calendar-task-title';
        title.textContent = task.title;

        const meta = document.createElement('div');
        meta.className = 'calendar-task-meta';
        const timeText = formatTime(task.dueTime);
        const statusPart = formatStatus(task.status);
        const priorityPart = `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority`;
        meta.textContent = `${statusPart} · ${priorityPart}${timeText ? ` · ${timeText}` : ''}`;

        info.appendChild(title);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'calendar-task-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-action-btn';
        editBtn.title = 'Edit task';
        editBtn.innerHTML = '<i class="fas fa-pen"></i>';
        editBtn.addEventListener('click', () => openCalendarTaskModal(task.dueDate, task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'task-action-btn danger';
        deleteBtn.title = 'Delete task';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => {
            document.getElementById('calendarTaskId').value = task.id;
            handleCalendarTaskDelete();
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);

        item.addEventListener('click', () => openCalendarTaskModal(task.dueDate, task.id));
        taskList.appendChild(item);
    });
}

function handleCalendarTaskSubmit(e) {
    e.preventDefault();

    const taskIdField = document.getElementById('calendarTaskId');
    const existingTaskId = taskIdField.value ? Number(taskIdField.value) : null;

    const updatedTask = {
        id: existingTaskId ?? Date.now(),
        title: document.getElementById('calendarTaskTitle').value.trim(),
        dueDate: document.getElementById('calendarTaskDate').value,
        dueTime: document.getElementById('calendarTaskTime').value,
        priority: document.getElementById('calendarTaskPriority').value,
        status: document.getElementById('calendarTaskStatus').value,
        description: document.getElementById('calendarTaskDescription').value.trim(),
        recurring: document.getElementById('calendarTaskRecurring').checked
    };

    if (!updatedTask.title || !updatedTask.dueDate) {
        showNotification('Please provide a task title and due date.', 'warning');
        return;
    }

    if (isPastDateTime(updatedTask.dueDate, updatedTask.dueTime) && updatedTask.status !== 'done') {
        showNotification('Deadline has already passed. Mark the task as completed or choose a future time.', 'warning');
        return;
    }

    const existingTaskIndex = tasks.findIndex(task => task.id === existingTaskId);
    const wasDone = existingTaskIndex !== -1 ? tasks[existingTaskIndex].status === 'done' : false;

    if (existingTaskIndex !== -1) {
        tasks[existingTaskIndex] = { ...tasks[existingTaskIndex], ...updatedTask };
        showNotification('Task updated successfully! ✏️', 'success');
        if (!isPastDateTime(updatedTask.dueDate, updatedTask.dueTime)) {
            overdueWarningsShown.delete(updatedTask.id);
        }
    } else {
        tasks.push(updatedTask);
        showNotification('Task added to the calendar! 📅', 'success');
    }

    if (!wasDone && updatedTask.status === 'done') {
        updateStreak();
    }

    saveToLocalStorage();
    setSelectedDate(updatedTask.dueDate);
    renderTasks();
    renderCalendarView();
    updateAnalytics();
    updateProgress();
    checkBadges();
    populateSelectedDateTasks();

    taskIdField.value = '';
    document.getElementById('calendarTaskForm').reset();
    document.getElementById('calendarTaskDate').value = updatedTask.dueDate;
    const timeInput = document.getElementById('calendarTaskTime');
    if (timeInput) {
        timeInput.value = getDefaultTimeForDate(updatedTask.dueDate);
    }
}

function handleCalendarTaskDelete() {
    const taskIdField = document.getElementById('calendarTaskId');
    if (!taskIdField || !taskIdField.value) {
        showNotification('Select a task to delete from the list.', 'warning');
        return;
    }

    const taskId = Number(taskIdField.value);
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) {
        showNotification('Task not found.', 'warning');
        return;
    }

    tasks = tasks.filter(task => task.id !== taskId);
    overdueWarningsShown.delete(taskId);
    saveToLocalStorage();
    renderTasks();
    renderCalendarView();
    updateAnalytics();
    updateProgress();
    checkBadges();
    populateSelectedDateTasks();

    taskIdField.value = '';
    document.getElementById('calendarTaskForm').reset();
    document.getElementById('calendarTaskDate').value = taskToDelete.dueDate;
    showNotification('Task removed from the calendar.', 'info');
}

function highlightSelectedCalendarDay() {
    const dayElements = document.querySelectorAll('.full-calendar-day');
    dayElements.forEach(day => {
        if (day.dataset.date === selectedDate) {
            day.classList.add('selected');
        } else {
            day.classList.remove('selected');
        }
    });

    const weekDayElements = document.querySelectorAll('.week-day-card');
    weekDayElements.forEach(day => {
        if (day.dataset.date === selectedDate) {
            day.classList.add('selected');
        } else {
            day.classList.remove('selected');
        }
    });
}

function updateCalendarTaskCount() {
    const badge = document.getElementById('calendarTaskCount');
    if (!badge) return;

    const count = tasks.filter(task => task.dueDate === selectedDate).length;
    badge.textContent = count;
    if (count === 0) {
        badge.classList.add('hidden');
    } else {
        badge.classList.remove('hidden');
    }
}

// ===== Goals Management =====
function renderGoals() {
    const goalsGrid = document.getElementById('goalsGrid');
    goalsGrid.innerHTML = '';
    
    if (goals.length === 0) {
        goalsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No goals yet. Create one to get started! 🎯</p>';
        renderGoalsSummary();
        return;
    }
    
    goals.forEach(goal => {
        const goalCard = createGoalCard(goal);
        goalsGrid.appendChild(goalCard);
    });

    renderGoalsSummary();
}

function createGoalCard(goal) {
    const goalDiv = document.createElement('div');
    goalDiv.className = 'goal-card';
    
    goalDiv.innerHTML = `
        <div class="goal-header">
            <h3 class="goal-title">${goal.title}</h3>
            <button class="goal-menu" onclick="deleteGoal(${goal.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <p class="goal-description">${goal.description || 'No description'}</p>
        <div class="goal-deadline">
            <i class="fas fa-calendar"></i>
            <span>Target: ${new Date(goal.deadline).toLocaleDateString()}</span>
        </div>
        <div class="goal-progress-section">
            <div class="goal-progress-label">
                <span>Progress</span>
                <span>${goal.progress}%</span>
            </div>
            <div class="goal-progress-bar">
                <div class="goal-progress-fill" style="width: ${goal.progress}%"></div>
            </div>
        </div>
    `;
    
    return goalDiv;
}

function deleteGoal(goalId) {
    if (confirm('Are you sure you want to delete this goal?')) {
        goals = goals.filter(g => g.id !== goalId);
        saveToLocalStorage();
        renderGoals();
        renderGoalsSummary();
        showNotification('Goal deleted', 'info');
    }
}

// ===== Add Goal Modal =====
function openAddGoalModal() {
    document.getElementById('addGoalModal').classList.add('active');
    document.getElementById('goalDeadline').value = getNextMonthDate();
}

function closeAddGoalModal() {
    document.getElementById('addGoalModal').classList.remove('active');
    document.getElementById('addGoalForm').reset();
}

function handleAddGoal(e) {
    e.preventDefault();
    
    const newGoal = {
        id: Date.now(),
        title: document.getElementById('goalTitle').value,
        description: document.getElementById('goalDescription').value,
        deadline: document.getElementById('goalDeadline').value,
        progress: parseInt(document.getElementById('goalProgress').value)
    };
    
    goals.push(newGoal);
    saveToLocalStorage();
    renderGoals();
    renderGoalsSummary();
    closeAddGoalModal();
    showNotification('Goal created successfully! 🎯', 'success');
}

function renderGoalsSummary() {
    const summaryContainer = document.getElementById('dashboardGoalsList');
    if (!summaryContainer) return;
    summaryContainer.innerHTML = '';

    const statusGroups = [
        { key: 'todo', label: 'To-Do Tasks', icon: '📋' },
        { key: 'in-progress', label: 'In Progress', icon: '⏳' },
        { key: 'done', label: 'Completed', icon: '✅' }
    ];

    let hasContent = false;

    statusGroups.forEach(({ key, label, icon }) => {
        const tasksForStatus = tasks
            .filter(task => task.status === key)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);

        if (tasksForStatus.length === 0) return;

        hasContent = true;
        const item = document.createElement('div');
        item.className = 'goal-summary-item goal-summary-task-group';

        const info = document.createElement('div');
        info.className = 'dashboard-task-info';

        const title = document.createElement('div');
        title.className = 'dashboard-task-title';
        title.textContent = `${icon} ${label}`;

        const meta = document.createElement('div');
        meta.className = 'goal-progress';
        meta.textContent = `${tasksForStatus.length} task${tasksForStatus.length > 1 ? 's' : ''}`;

        info.appendChild(title);
        info.appendChild(meta);

        const list = document.createElement('ul');
        list.className = 'goal-task-list';

        tasksForStatus.forEach(task => {
            const li = document.createElement('li');
            const timePart = formatTime(task.dueTime);
            const suffix = timePart ? ` · ${timePart}` : '';
            li.textContent = `${task.title} · ${formatDate(task.dueDate)}${suffix}`;
            li.addEventListener('click', () => openCalendarTaskModal(task.dueDate, task.id));
            list.appendChild(li);
        });

        item.appendChild(info);
        item.appendChild(list);
        summaryContainer.appendChild(item);
    });

    if (goals.length > 0) {
        hasContent = true;
        const goalsToShow = [...goals]
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 3);

        goalsToShow.forEach(goal => {
            const item = document.createElement('div');
            item.className = 'goal-summary-item';

            const info = document.createElement('div');
            info.className = 'dashboard-task-info';

            const title = document.createElement('div');
            title.className = 'dashboard-task-title';
            title.textContent = goal.title;

            const meta = document.createElement('div');
            meta.className = 'goal-progress';
            meta.textContent = `Progress: ${goal.progress}% · Due ${new Date(goal.deadline).toLocaleDateString()}`;

            info.appendChild(title);
            info.appendChild(meta);

            const bar = document.createElement('div');
            bar.className = 'goal-progress-bar compact';
            const fill = document.createElement('div');
            fill.className = 'goal-progress-fill';
            fill.style.width = `${goal.progress}%`;
            bar.appendChild(fill);

            item.appendChild(info);
            item.appendChild(bar);

            summaryContainer.appendChild(item);
        });
    }

    if (!hasContent) {
        summaryContainer.innerHTML = '<p class="empty-state">Create a goal or add tasks to see your snapshot. 🎯</p>';
    }
}

// ===== Calendar Functions =====
function renderMiniCalendar() {
    const miniCalendar = document.getElementById('miniCalendar');
    miniCalendar.innerHTML = '';
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Add day headers
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day header';
        dayHeader.textContent = day;
        miniCalendar.appendChild(dayHeader);
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        miniCalendar.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const currentDate = new Date(currentYear, currentMonth, day);
        
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Check if there are tasks on this day
        const tasksOnDay = tasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === currentDate.toDateString();
        });
        
        if (tasksOnDay.length > 0) {
            dayElement.classList.add('has-event');
        }
        
        miniCalendar.appendChild(dayElement);
    }
}

function renderFullCalendar() {
    const fullCalendar = document.getElementById('fullCalendar');
    fullCalendar.innerHTML = '';
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('calendarMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Add day headers
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'full-calendar-day header';
        dayHeader.textContent = day;
        fullCalendar.appendChild(dayHeader);
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'full-calendar-day';
        fullCalendar.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'full-calendar-day';
        
        const currentDate = new Date(currentYear, currentMonth, day);
        const dateString = currentDate.toISOString().split('T')[0];
        dayElement.dataset.date = dateString;
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        if (currentDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        if (dateString === selectedDate) {
            dayElement.classList.add('selected');
        }
        
        // Add events for this day
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-events';
        
        const tasksOnDay = tasks.filter(task => task.dueDate === dateString);
        
        tasksOnDay.forEach(task => {
            const eventElement = document.createElement('div');
            eventElement.className = `calendar-event priority-${task.priority}`;
            eventElement.textContent = task.title;
            eventElement.addEventListener('click', (e) => {
                e.stopPropagation();
                openCalendarTaskModal(dateString, task.id);
            });
            eventsContainer.appendChild(eventElement);
        });
        
        dayElement.appendChild(eventsContainer);
        dayElement.addEventListener('click', () => openCalendarTaskModal(dateString));
        fullCalendar.appendChild(dayElement);
    }
    highlightSelectedCalendarDay();
}

function changeMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    renderMiniCalendar();
    renderFullCalendar();
}

// ===== Progress & Analytics =====
function updateProgress() {
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('weeklyProgress').textContent = `${progress}%`;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function updateAnalytics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('inProgressTasks').textContent = inProgressTasks;
    document.getElementById('currentStreak').textContent = streak;
}

// ===== Badges & Gamification =====
function renderBadges() {
    const badgesContainer = document.getElementById('badgesContainer');
    badgesContainer.innerHTML = '';
    
    badges.forEach(badge => {
        const badgeElement = document.createElement('div');
        badgeElement.className = badge.unlocked ? 'badge' : 'badge locked';
        badgeElement.title = badge.name;
        badgeElement.textContent = badge.emoji;
        badgesContainer.appendChild(badgeElement);
    });
    
    document.getElementById('streakCount').textContent = streak;
}

function checkBadges() {
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    
    // First Task Badge
    if (completedTasks >= 1 && !badges[0].unlocked) {
        badges[0].unlocked = true;
        showNotification('Badge Unlocked: First Task! 🏆', 'success');
        triggerConfetti();
    }
    
    // 10 Tasks Badge
    if (completedTasks >= 10 && !badges[2].unlocked) {
        badges[2].unlocked = true;
        showNotification('Badge Unlocked: 10 Tasks Done! 🎯', 'success');
        triggerConfetti();
    }
    
    // 5 Day Streak Badge
    if (streak >= 5 && !badges[1].unlocked) {
        badges[1].unlocked = true;
        showNotification('Badge Unlocked: 5 Day Streak! ⭐', 'success');
        triggerConfetti();
    }
    
    // 30 Day Streak Badge
    if (streak >= 30 && !badges[3].unlocked) {
        badges[3].unlocked = true;
        showNotification('Badge Unlocked: 30 Day Streak! 🔥', 'success');
        triggerConfetti();
    }
    
    saveToLocalStorage();
    renderBadges();
}

function updateStreak() {
    streak++;
    saveToLocalStorage();
    updateAnalytics();
    renderBadges();
    checkBadges();
}

// ===== Sound Notification =====
function playNotificationSound(type = 'default') {
    if (!settings.soundEnabled) return;
    
    // Create audio context for notification sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sounds for different notification types
    if (type === 'success') {
        // Success chime - ascending notes
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    } else if (type === 'warning') {
        // Warning sound - two quick beeps
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.15);
    } else {
        // Default clock chime - gentle bell sound
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    }
    
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// ===== Notifications =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-text">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Play sound notification
    playNotificationSound(type);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Confetti Effect =====
function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#FF6B9D', '#FFD93D', '#6BCF7F', '#B19CD9', '#FFB347'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3000);
    }
}

// ===== Reminders =====
function checkReminders() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    tasks.forEach(task => {
        if (task.dueDate === today && task.status !== 'done') {
            // Check if we should show reminder based on settings
            const lastReminder = localStorage.getItem(`reminder_${task.id}`);
            const reminderInterval = now.getTime() - (settings.taskReminderInterval * 60 * 1000);
            
            if (!lastReminder || parseInt(lastReminder) < reminderInterval) {
                showNotification(`Reminder: ${task.title} is due today! 📅`, 'warning');
                localStorage.setItem(`reminder_${task.id}`, now.getTime().toString());
            }
        }
    });
    
    // Study break reminder based on settings
    const lastBreak = localStorage.getItem('lastBreakReminder');
    const breakInterval = now.getTime() - (settings.breakReminderInterval * 60 * 1000);
    
    if (!lastBreak || parseInt(lastBreak) < breakInterval) {
        showNotification('Time for a break! Stretch and hydrate! 💧', 'info');
        localStorage.setItem('lastBreakReminder', now.getTime().toString());
    }
}

// ===== Helper Functions =====
function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

function getNextMonthDate() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
}

// ===== Friends Page (Sample Data) =====
function renderFriends() {
    const friendsGrid = document.getElementById('friendsGrid');
    const sampleFriends = [
        { name: 'Study Buddy 1', emoji: '🦝', status: 'Studying Math' },
        { name: 'Study Buddy 2', emoji: '🦊', status: 'Taking a break' },
        { name: 'Study Buddy 3', emoji: '🐨', status: 'In library' }
    ];
    
    friendsGrid.innerHTML = '';
    
    sampleFriends.forEach(friend => {
        const friendCard = document.createElement('div');
        friendCard.className = 'friend-card';
        friendCard.innerHTML = `
            <div class="friend-card-avatar">${friend.emoji}</div>
            <div class="friend-card-name">${friend.name}</div>
            <div class="friend-card-status">${friend.status}</div>
        `;
        friendsGrid.appendChild(friendCard);
    });
}

// Initialize friends on load
setTimeout(renderFriends, 100);

// ===== Chart Initialization =====
function initializeCharts() {
    // Weekly Activity Chart
    const activityCtx = document.getElementById('activityChart');
    if (activityCtx) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const completedPerDay = days.map(() => Math.floor(Math.random() * 10)); // Sample data
        
        activityChart = createBarChart(activityCtx, days, completedPerDay, 'Tasks Completed');
    }
    
    // Trend Chart
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const completionRate = [65, 72, 78, 85]; // Sample data
        
        trendChart = createLineChart(trendCtx, weeks, completionRate, 'Completion Rate (%)');
    }
}

function createBarChart(canvas, labels, data, label) {
    const ctx = canvas.getContext('2d');
    const maxValue = Math.max(...data) || 10;
    const chartHeight = canvas.height - 40;
    const chartWidth = canvas.width - 60;
    const barWidth = chartWidth / labels.length - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    labels.forEach((lbl, index) => {
        const barHeight = (data[index] / maxValue) * chartHeight;
        const x = 40 + index * (barWidth + 10);
        const y = chartHeight - barHeight + 20;
        
        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, chartHeight + 20);
        gradient.addColorStop(0, '#FF6B9D');
        gradient.addColorStop(1, '#B19CD9');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw label
        ctx.fillStyle = '#546E7A';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, x + barWidth / 2, canvas.height - 5);
        
        // Draw value
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(data[index], x + barWidth / 2, y - 5);
    });
    
    // Draw Y-axis
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 20);
    ctx.lineTo(35, chartHeight + 20);
    ctx.stroke();
    
    // Draw X-axis
    ctx.beginPath();
    ctx.moveTo(35, chartHeight + 20);
    ctx.lineTo(canvas.width - 20, chartHeight + 20);
    ctx.stroke();
    
    return { canvas, labels, data };
}

function createLineChart(canvas, labels, data, label) {
    const ctx = canvas.getContext('2d');
    const maxValue = Math.max(...data) || 100;
    const chartHeight = canvas.height - 40;
    const chartWidth = canvas.width - 60;
    const pointSpacing = chartWidth / (labels.length - 1);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = 20 + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
    }
    
    // Draw line
    ctx.strokeStyle = '#6BCF7F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    labels.forEach((lbl, index) => {
        const x = 40 + index * pointSpacing;
        const y = chartHeight - (data[index] / maxValue) * chartHeight + 20;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw points
    labels.forEach((lbl, index) => {
        const x = 40 + index * pointSpacing;
        const y = chartHeight - (data[index] / maxValue) * chartHeight + 20;
        
        // Draw point
        ctx.fillStyle = '#FFD93D';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#FF6B9D';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = '#546E7A';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, x, canvas.height - 5);
        
        // Draw value
        ctx.fillStyle = '#2C3E50';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(data[index] + '%', x, y - 15);
    });
    
    // Draw Y-axis
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 20);
    ctx.lineTo(35, chartHeight + 20);
    ctx.stroke();
    
    // Draw X-axis
    ctx.beginPath();
    ctx.moveTo(35, chartHeight + 20);
    ctx.lineTo(canvas.width - 20, chartHeight + 20);
    ctx.stroke();
    
    return { canvas, labels, data };
}

// ===== Calendar View Rendering =====
function renderCalendarView() {
    const fullCalendar = document.getElementById('fullCalendar');
    
    if (currentView === 'month') {
        renderFullCalendar();
    } else if (currentView === 'week') {
        renderWeekView();
    } else if (currentView === 'day') {
        renderDayView();
    }
}

function renderWeekView() {
    const fullCalendar = document.getElementById('fullCalendar');
    fullCalendar.innerHTML = '';
    fullCalendar.style.display = 'grid';
    fullCalendar.style.gridTemplateColumns = 'repeat(7, 1fr)';
    
    // Get current week start (Monday) based on selected date
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    const dayOfWeek = baseDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    currentWeekStart = new Date(baseDate);
    currentWeekStart.setDate(baseDate.getDate() + diff);
    
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        const dayCard = document.createElement('div');
        dayCard.className = 'week-day-card';
        dayCard.dataset.date = dateString;
        
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        if (isToday) {
            dayCard.style.backgroundColor = '#FFD93D';
        }
        if (dateString === selectedDate) {
            dayCard.classList.add('selected');
        }
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        dayHeader.textContent = daysOfWeek[i];
        
        const dayDate = document.createElement('div');
        dayDate.className = 'week-day-date';
        dayDate.textContent = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'calendar-events';
        
        // Get tasks for this day
        const tasksOnDay = tasks.filter(task => task.dueDate === dateString);
        
        tasksOnDay.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `calendar-event priority-${task.priority}`;
            taskElement.textContent = task.title;
            taskElement.addEventListener('click', (e) => {
                e.stopPropagation();
                openCalendarTaskModal(dateString, task.id);
            });
            tasksContainer.appendChild(taskElement);
        });
        
        dayCard.appendChild(dayHeader);
        dayCard.appendChild(dayDate);
        dayCard.appendChild(tasksContainer);
        dayCard.addEventListener('click', () => openCalendarTaskModal(dateString));
        fullCalendar.appendChild(dayCard);
    }
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonth').textContent = 
        `Week of ${monthNames[currentWeekStart.getMonth()]} ${currentWeekStart.getDate()}, ${currentWeekStart.getFullYear()}`;
}

function renderDayView() {
    const fullCalendar = document.getElementById('fullCalendar');
    fullCalendar.innerHTML = '';
    fullCalendar.style.display = 'block';
    
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-view-header';
    
    const dayTitle = document.createElement('h2');
    dayTitle.className = 'day-view-title';
    dayTitle.textContent = currentDayView.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    dayHeader.appendChild(dayTitle);
    fullCalendar.appendChild(dayHeader);
    
    // Create time slots
    const timeSlotsContainer = document.createElement('div');
    timeSlotsContainer.className = 'time-slots';
    
    const hours = [
        '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
    ];
    
    // Get tasks for this day
    const dayString = currentDayView.toISOString().split('T')[0];
    const tasksOnDay = tasks.filter(task => task.dueDate === dayString);
    
    hours.forEach((hour, index) => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = hour;
        
        const timeContent = document.createElement('div');
        timeContent.className = 'time-content';
        
        // Show tasks in morning slots (simplified)
        if (index < tasksOnDay.length) {
            const taskElement = document.createElement('div');
            taskElement.className = `calendar-event priority-${tasksOnDay[index].priority}`;
            taskElement.textContent = tasksOnDay[index].title;
            taskElement.addEventListener('click', () => openCalendarTaskModal(dayString, tasksOnDay[index].id));
            timeContent.appendChild(taskElement);
        }
        
        timeSlot.appendChild(timeLabel);
        timeSlot.appendChild(timeContent);
        timeSlotsContainer.appendChild(timeSlot);
    });
    
    fullCalendar.appendChild(timeSlotsContainer);
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonth').textContent = 
        `${monthNames[currentDayView.getMonth()]} ${currentDayView.getDate()}, ${currentDayView.getFullYear()}`;
}

function ensureTaskDefaults(task) {
    if (!task.dueTime) {
        task.dueTime = FALLBACK_TASK_TIME;
    }
}

function combineDateTime(date, time) {
    if (!date) return null;
    const safeTime = time && time.length >= 4 ? time : FALLBACK_TASK_TIME;
    const isoString = `${date}T${safeTime}`;
    const dateObj = new Date(isoString);
    if (Number.isNaN(dateObj.getTime())) return null;
    return dateObj;
}

function isPastDateTime(date, time) {
    const dateTime = combineDateTime(date, time);
    if (!dateTime) return false;
    return dateTime < new Date();
}

function getDefaultTimeForDate(date) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (!date) return DEFAULT_TASK_TIME;
    if (date !== todayStr) return DEFAULT_TASK_TIME;

    const nextHour = new Date(today.getTime());
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    const nextHourStr = nextHour.toISOString().split('T')[0];
    if (nextHourStr !== todayStr) {
        return FALLBACK_TASK_TIME;
    }
    return nextHour.toTimeString().slice(0, 5);
}

function checkOverdueTasks() {
    const now = new Date();
    tasks.forEach(task => {
        const dateTime = combineDateTime(task.dueDate, task.dueTime);
        if (!dateTime || task.status === 'done' || overdueWarningsShown.has(task.id)) return;
        if (dateTime < now && (task.status === 'todo' || task.status === 'in-progress')) {
            showNotification(`The deadline for "${task.title}" has passed.`, 'warning');
            overdueWarningsShown.add(task.id);
        }
    });
}

// ===== Settings Functions =====
function loadSettingsUI() {
    document.getElementById('taskReminderInterval').value = settings.taskReminderInterval;
    document.getElementById('breakReminderInterval').value = settings.breakReminderInterval;
    document.getElementById('soundEnabled').checked = settings.soundEnabled;
    document.getElementById('quoteInterval').value = settings.quoteInterval;
    
    // Set theme button
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
}

function saveSettings() {
    settings.taskReminderInterval = parseInt(document.getElementById('taskReminderInterval').value);
    settings.breakReminderInterval = parseInt(document.getElementById('breakReminderInterval').value);
    settings.soundEnabled = document.getElementById('soundEnabled').checked;
    settings.quoteInterval = parseInt(document.getElementById('quoteInterval').value);
    
    // Get selected theme
    const selectedThemeBtn = document.querySelector('.theme-option-btn.active');
    if (selectedThemeBtn) {
        theme = selectedThemeBtn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    saveToLocalStorage();
    showNotification('Settings saved successfully! ✅', 'success');
    
    // Update intervals
    clearInterval(window.quoteInterval);
    window.quoteInterval = setInterval(displayRandomQuote, settings.quoteInterval * 60000);
}
