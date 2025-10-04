# dopaMine--Study-Planner
A Smart Study Planner
# dopaMine – Study Planner

## Overview
`dopaMine` is a browser-based study planner that helps learners organize their schedule, stay motivated, and track progress. The app is implemented with Vanilla JS, HTML, and CSS, and stores data in `localStorage`, so it runs entirely offline once loaded.

## Features
- **Dashboard overview** – The `index.html` dashboard highlights the day with motivational quotes, study tips, todays to-do list, goal snapshots, and achievement streaks.
- **Task management** – `script.js` lets you create, edit, categorize, and cycle the status of tasks with priorities, quick-add shortcuts, and recurring task support.
- **Calendar planner** – Switch between month, week, and day views, manage deadlines with the calendar task modal, and jump straight to any task from the analytics panel.
- **Focus sessions** – Configure deep-work blocks with custom work/break intervals from the Focus Sessions panel to guide Pomodoro-style study sessions.
- **Goal tracking** – Monitor long-term objectives, update progress, and surface summaries in the dashboard and analytics views.
- **Progress analytics** – View totals, completion metrics, streak information, and priority insights rendered dynamically in `script.js`.
- **Customization & settings** – Adjust reminder intervals, toggle sound, switch themes, and control quote rotation directly within the Settings page.

## Getting Started
- **Prerequisites** – Any modern desktop or mobile browser that supports `localStorage`.
- **Run locally**
  1. Clone or download this repository.
  2. Open `index.html` in your browser, or serve the folder with a lightweight server (e.g., VS Code Live Server) for hot-reload convenience.

## Project Structure
```
.
├── index.html    # Application layout and page shells
├── styles.css    # Styling, themes, and responsive rules
└── script.js     # App state, event handlers, and UI rendering
```

## Data & Persistence
- **Local storage** – Tasks, goals, streaks, badges, theme preferences, and settings persist in `localStorage` keys managed in `script.js` (`saveToLocalStorage()` / `loadFromLocalStorage()`).
- **Sample seed data** – `initializeApp()` seeds demo tasks and a goal the first time the app runs so that UI sections are populated immediately.

## Customization Tips
- **Quotes & tips** – Update the `quotes` and `studyTips` arrays in `script.js` to localize or personalize motivational content.
- **Appearance** – Extend or modify CSS variables and component styles in `styles.css` to align with your branding.
- **Feature tweaks** – Adjust reminder intervals, default task times, or badge definitions by editing the constants near the top of `script.js`.

## Acknowledgements
- **Font Awesome** – Icons are provided via the CDN referenced in `index.html`.

## License
No license information has been provided. Add one if you plan to distribute or open-source this project.
