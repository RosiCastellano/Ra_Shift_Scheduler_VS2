
# Don Schedule Manager 📅

A scheduling tool designed specifically for **Residence Dons** to balance their academic responsibilities with don duties and personal time.

![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![License](https://img.shields.io/badge/License-MIT-green)

## What is this?

Being a Don (Residence Advisor) at university means juggling:
- 📚 **Classes & studying** - You're still a student first
- 🏠 **Don on Duty (DOD)** - Evening shifts watching over your floor
- 🎉 **Friday Night Hangouts (FNH)** - Planned social events
- 👥 **Community Connections** - Getting to know every resident
- 📋 **Meetings** - Team meetings, 1:1s with Senior Dons, RLC meetings
- 🍽️ **Meals & personal time** - Taking care of yourself

This app helps Dons visualize their week and ensure they're balancing everything properly.

## Features

### 📚 Class Schedule Input
- Upload your timetable screenshot for reference
- Manually add classes with day, start time, and end time
- Classes appear as locked blocks in your schedule

### 📅 RLM Calendar Reference
- Upload your Residence Life Manager (RLM) calendar
- Keep deadlines visible while planning

### 🏠 Don on Duty Tracking
- Select which days you're on duty (8-10 PM shifts)
- DOD blocks are automatically added and locked

### 🎉 Friday Night Hangouts
- Add FNH shifts with specific dates and times
- Tracks total hours for the semester

### 👥 Meeting Management
Four meeting types with different frequencies:
| Meeting | Frequency | Duration |
|---------|-----------|----------|
| Team Meeting | Weekly | 1 hour |
| Senior Don 1:1 | Monthly | 30 min |
| RLC Meeting | Bi-weekly | 30 min |
| Community Meeting | As scheduled | 30 min |

### 💬 Community Connections Planner
- Enter your community size (number of residents)
- Set start date and due date for connections
- Calculates:
  - Connections needed per day
  - Connections needed per week
  - Connections per DOD shift
- Automatically adds "Connection" blocks before DOD shifts

### 📊 Generated Schedule
- Visual weekly grid (7 AM - 11 PM)
- Color-coded blocks (pastel theme)
- **Locked blocks** (🔒): Classes, DOD, FNH, Meetings, Connections
- **Unlocked blocks**: Meals, Study, Personal, Social
- Edit modes:
  - **Move**: Drag & drop unlocked blocks
  - **Delete**: Click to remove unlocked blocks
  - **Add**: Click empty slots to add new blocks

### 📈 Hour Tracking
Displays totals for:
- Class + Study hours (target: ~20h)
- Don Duties hours (DOD + FNH + Meetings + Connections)
- Personal + Social hours (target: ~10h)

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Lucide React** - Icons
- **CSS-in-JS** - Styled components with inline styles
- **GitHub Pages** - Hosting

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/don-scheduler.git
cd don-scheduler

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Project Structure

```
don-scheduler/
├── src/
│   ├── App.jsx          # Main application component
│   └── main.jsx         # React entry point
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies & scripts
└── README.md            # This file
```

## How It Was Built

### Development Process

1. **Initial Concept**: Built to solve a real problem - Dons struggling to balance their responsibilities

2. **Core Features First**:
   - Class schedule input
   - DOD shift selection
   - Basic schedule generation

3. **Iterative Improvements**:
   - Added FNH tracking with hours calculation
   - Added multiple meeting types with durations
   - Added Community Connections planner
   - Improved schedule generation algorithm

4. **UX Enhancements**:
   - Drag & drop file upload
   - Image preview modals
   - Edit modes (move/delete/add)
   - Pastel color scheme for better readability

5. **Smart Scheduling**:
   - Connection blocks scheduled before DOD shifts
   - Study time fills gaps to reach ~20h target
   - Personal/social time balanced in evenings

### Design Decisions

- **Single-file component**: Kept everything in `App.jsx` for simplicity
- **No external state management**: React useState is sufficient
- **Pastel colors**: Easier on the eyes during long planning sessions
- **Locked vs unlocked blocks**: Prevents accidental changes to commitments
- **Mobile-responsive**: Works on phones for on-the-go planning

## Color Scheme

| Block Type | Color | Hex |
|------------|-------|-----|
| Classes | Soft blue | `#a8c5e2` |
| DOD | Soft gold | `#f5d5a0` |
| FNH | Soft pink | `#e8b4c8` |
| Meetings | Soft teal | `#9dd5c8` |
| Connections | Soft purple | `#c5b3d9` |
| Meals | Soft coral | `#f0b8b8` |
| Personal | Light sky | `#b8d4e8` |
| Study | Soft yellow | `#f5e6a3` |
| Social | Soft green | `#c8e6c9` |

## Future Ideas

- [ ] Export schedule as image/PDF
- [ ] Save/load schedules to localStorage
- [ ] Sync with Google Calendar
- [ ] Dark/light theme toggle
- [ ] Multiple schedule templates
- [ ] Resident tracking for connections

## Contributing

Pull requests welcome! This is an open project to help student residence staff.

## License

MIT License - feel free to use and modify for your residence!

---

Made with ❤️ for Dons everywhere
