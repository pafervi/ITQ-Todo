# LatticeTodo

[Español](README.es.md) · **English**

Personal planner and lab notebook for computational catalysis research. Your
week on one screen, projects with scientific context, planning for the whole
academic year, and no connection to any server: all your data stays on your
computer.

![Weekly view with research projects](docs/screenshots/01-hero.png)

**Contents:** [Installation](#installation) ·
[Getting started](#getting-started) ·
[Day to day](#day-to-day) ·
[Projects](#projects) ·
[Course overview](#course-overview-long-term-planning) ·
[Weeks mode](#weeks-mode-what-am-i-doing-this-week) ·
[Deadlines](#deadlines-and-the-urgency-radar) ·
[Summaries](#summaries-and-the-weekly-wrap-up) ·
[Customization](#customization) ·
[Data](#where-your-data-lives) ·
[Shortcuts](#keyboard-shortcuts)

---

## Installation

Download the installer for your system from the releases page:

**[Download the latest version →](https://github.com/pafervi/ITQ-Todo/releases/latest)**

You will see several files on that page. Pick the one that matches your
system:

### Windows

Download `LatticeTodo Setup <version>.exe` and double-click it.

> The first time, Windows will show "Windows protected your PC". Click
> **More info → Run anyway**. This happens because the app is not signed with
> a corporate certificate, not because anything is wrong.

If you prefer the portable version (it installs nothing and runs straight
from the file), download `LatticeTodo <version>.exe` instead of the Setup.

### Linux (Ubuntu / Debian / derivatives)

Download `latticetodo_<version>_amd64.deb` and open a terminal in the folder
where the file is:

```bash
sudo apt install ./latticetodo_<version>_amd64.deb
```

It will appear in the application menu as "LatticeTodo".

### Linux (other distros, portable)

Download `LatticeTodo-<version>.AppImage`, make it executable and run it:

```bash
chmod +x LatticeTodo-*.AppImage
./LatticeTodo-*.AppImage
```

### macOS

Download `LatticeTodo-<version>.dmg`, open it and drag the app to the
Applications folder.

> The first time, macOS will say "cannot be opened because the developer
> cannot be verified". Right-click the app in Applications and choose
> **Open → Open**. This only happens once.

---

## Getting started

When you open the app for the first time, it creates an empty database on
your computer. Your data never leaves it; if you switch computers you have to
**export and re-import** from Settings (see
[Export and import](#export-and-import)).

Three things worth doing on day one:

1. **Pick a language and theme** in Settings (English, Spanish or Catalan;
   light or dark, plus a scientific theme for the backgrounds).
2. **Turn on the daily backup**: choose a cloud-synced folder (OneDrive,
   Google Drive, Dropbox) and the app will save a copy every day.
3. **Create your first project**, as a checklist or phased (see
   [Projects](#projects)).

Inside the app, press **?** at any time to see the keyboard shortcuts. The
feature guide is in the three-dot menu of the sidebar.

---

## What you can do with the app

### Day to day

The main screen shows Today and your active projects at the same time.
Unfinished tasks from previous days move to Today on their own when you open
the app or when the clock crosses midnight with the app open. The top strip
lets you jump to any day of the week with one click, or switch between the
**Today** view (only the centered day) and the **Week** view (seven days in a
column).

To create a quick task, press **N** from anywhere, type the text and hit
Enter. If you paste multi-line text, one task is created per line.
**Double-click** the status circle of a task to enter focus mode: a single
task on screen, a simple timer, and `Esc` to leave.

**Global capture.** With the desktop app, `Ctrl+Alt+Space` (or
`Cmd+Alt+Space` on macOS) opens a minimal window to jot down a task from any
program, without switching windows.

Tasks tag themselves: if you write VASP, MACE, DFT, SLURM or the name of a
zeolite, the app adds the matching tag (you can turn this off in Settings). A
tag bar lets you filter tasks by label and see them all again with one click.

**Weekly focus.** Below the day strip, the Today screen shows what you are
focusing on this week (the phases and goals you placed in
[Weeks mode](#weeks-mode-what-am-i-doing-this-week)). One click opens the
planner.

**Recurring tasks.** From the sidebar you can define tasks that repeat (group
meetings, weekly reviews…) and they show up on their own on the right day.

**Desktop app.** It stays in the system tray, can launch when your computer
starts and keep running in the background, and notifies you on startup of
what is due today, with optional sound.

### Projects

Each project is its own list, with a name, a color, a linked folder (which you
open with one click on the folder icon), notes in Markdown and the associated
zeolite (framework). When you create it you choose the type:

- **Checklist**: the classic project, with tasks you tick off.
- **Phased**: a scientific project with a start and end date, divided into
  phases over time.

Click a project's title to open its **crystal**: statistics, next deadline and
open tasks.

![Crystal of the MFI Defect Engineering project](docs/screenshots/03-project-crystal.png)

#### Phased projects

A phased project has three tabs: **Tasks**, **Timeline** and **Feed**.

- **Timeline**: phases with a name, dates, color and status (pending, active,
  done, blocked). For example, *DFT benchmark → MACE L1 → TS search*.
- **Feed**: the project diary. Each entry is a note, a milestone or a
  decision, with a date and an optional phase.
- **Weekly snapshots**: on Mondays when you open the app and on Fridays when
  you close the week, the app asks you for each phased project how it stands
  and what is moving (or what closed and what is left), and saves it as a
  feed entry. You can skip it.
- **Export to Markdown**: from the project menu, *Export timeline and log
  (.md)* generates a file with the phases and the feed, ready to paste into a
  report or hand to an assistant as context.

#### Project tools

You turn them on from the project's three-dot menu:

- **Paper tracker**: follow a manuscript section by section, with words
  written against a target, a conceptual outline with checkboxes, and article
  templates. On desktop it can read the `.tex` or `.md` file in the linked
  folder to update the word count. The project header shows the percentage.
- **Batch tracker**: a long batch of calculations (for example 60
  singlepoints) is followed as a single task, with a progress bar and
  `-10 / -1 / +1 / +10` buttons. Never per individual calculation.

You can also create your own list **templates** (trip, meeting, paper
wrap-up…) with a name, icon, color and checklist, and reuse them when creating
new projects.

### Course overview: long-term planning

The **Overview** button in the sidebar opens the **academic year overview**
(September to August), a lane-based board to see everything that is coming at
a glance.

![Academic year overview exported as an image](docs/screenshots/13-overview-export.png)

What it contains:

- **Projects** with a start and end date, drawn as bars. If a project has a
  paper tracker, the percentage appears on its bar.
- **Deadlines** from all tasks, with paper deadlines in purple and the next
  talk in red. You open and edit them from the view itself.
- **Your own lanes** (research, teaching, whatever you need) with blocks and
  milestones. Click an empty spot to add, drag to move (also to another lane)
  and pull the edges to change the duration.
- **Not available**: holidays, public holidays, teaching or exam periods and
  stays, painted as gray bands in the background.
- **Phases** of phased projects, which you can show or hide.
- **Ideas without a date**: a side panel to jot things down without placing
  them yet. Drag them to a lane to give them a date.
- **Load per week**: a colored strip under the months showing how many things
  coincide each week; hover to see which ones.
- **Next 30 days**: a list with what is closest and the busiest week. The same
  list appears in the Friday wrap-up and in the weekly summary.

To show your plan, the export buttons in the header generate a **PNG image**
or an A4 landscape **PDF**, always in the light theme. It also exports a `.md`
file meant as context for an AI assistant.

#### Weeks mode: what am I doing this week

The **Course / Weeks** switch in the header replaces the board with a weekly
planner, meant for when all your projects are alive at once and you need to
decide what comes now.

- **Six columns**, one per week, with navigation to move forward and go back
  to "This week". Each column shows the deadlines, milestones and absences of
  those days at the top.
- **Phases to place**: a side panel with the pending phases of your phased
  projects. Drag them to a week, or press **+** to add them to the current
  one. A phase can be spread over several weeks (the panel counts how many
  times you placed it).
- **Free goals**: "Add goal" creates a text card, with an optional project,
  for whatever is not a phase.
- **Cards**: tick them as done, drag them to another week and remove them with
  the **×** or by dragging them back to the panel. A warning tells you when
  the week falls outside the dates of the phase.

The focus of the current week also appears on the **Today** screen, below the
day strip; clicking it opens the planner. The view's `.md` export includes a
"Weekly focus" section with the coming weeks.

### Deadlines and the urgency radar

Every task can have a due date. The **Deadlines** list groups all pending ones
by urgency (overdue, today, soon, later) with the source project in view.

![Deadlines grouped by urgency](docs/screenshots/04-deadlines.png)

For a spatial view of the same material, the **deadline radar** places each
deadline as a dot on concentric rings: the closer to the center, the more
urgent. Paper dates are painted in a different color; if you have set an
upcoming talk, it stands out in red and the sidebar shows the countdown.

### Mission control

A bento board with everything that matters at once: today's tasks, upcoming
deadlines (7 days), active meetings and a heat map of your activity over the
last 12 weeks.

![Mission control with today, deadlines, meetings and activity](docs/screenshots/05-mission-control.png)

### People: who is waiting on you and whom you wait on

If you write `@name` inside a task, that person shows up in the **People**
panel, with three columns: whom you owe something, who is waiting on you, and
what you share. The `#waiting` and `#owe` tags adjust which column something
goes to. There is nothing to configure: mentions are read instantly, and the
same name with or without accents and capitals is grouped into a single
person.

![People panel with mentions of Mercedes, Rafa and Veronique](docs/screenshots/06-people.png)

### Quick box: search and run

Press **Ctrl+K** (or **/**) from anywhere: it opens a box that searches tasks
across all projects and, with the `>` prefix, runs commands (go to Mission
control, open Deadlines, change theme, change view, open the daily or weekly
summary…). With the `+` prefix it creates a task on the fly, understanding the
date (`tomorrow 10am`), tag (`#dft`), priority (`!1`, `!2`, `!3`) and project
(`/ceo2`).

![Quick box with shortcuts to every action](docs/screenshots/08-search.png)

### Summaries and the weekly wrap-up

From 17:00 the app offers you the **daily summary** (what you closed and
what is due tomorrow). On Fridays from 17:00 the **Friday wrap-up** opens:
what you finished, what you carry over to Monday, the next 30 days and three
short questions to leave the week in order. It can be exported to Markdown.
The sidebar keeps the count of your **streak** of days completed at 100%.

The **weekly summary** groups what was completed by project and by day, and
has the same upcoming-weeks block. From there you export the **lab
notebook**, weekly or monthly, in a printable view with space for a signature
(*PDF / Print*); the monthly version has a cover page.

### Scientific identity

Every day the app picks a motif from the active theme. The silhouette paints
the splash background and the project covers. You can click the badge in the
sidebar to open its card; in the zeolite theme it shows the size of the
framework's largest ring and whether it was discovered at ITQ.

![Zeolite of the day card: ITH (ITQ-13)](docs/screenshots/07-zeolite-of-day.png)

There are five scientific themes, each with its own silhouettes of the day:
**zeolites**, **organic chemistry**, **metal oxides**, **photochemistry** and
**proteins**. You change them from Settings → Display, and the app suggests an
accent color for each one.

### Customization

From Settings you can change the language (English / Spanish / Catalan), light
or dark theme, scientific theme, density (airy or dense), typography, accent
color, zoom, number of columns, compact project cards and their width, and
whether the week starts on Monday. There is a **performance mode** that turns
off the blurred backgrounds if your computer struggles with its integrated
GPU.

![Settings with the main controls](docs/screenshots/10-settings.png)

### Where your data lives

Everything is stored locally, in the IndexedDB database of the embedded
browser. Nothing is sent to any server.

#### Export and import

To move your data to another computer, or to save it by hand:

1. **Export**: Settings → Data → **Export data**. This downloads the
   `LatticeTodoBackup.wtdb` file with tasks, projects, phases, feed, overview,
   recurring tasks and settings.
2. **Import**: on the other computer, Settings → Data → **Import data** and
   choose the `.wtdb` file.

> Importing **replaces** all current data with that of the file. If the file
> is not valid, the app warns you and changes nothing.

Settings → Data also has **Clear data**, which empties the app completely and
cannot be undone.

#### Automatic backup

With the desktop app you can turn on a daily copy in a folder of your choice,
for example one synced with OneDrive. It generates
`LatticeTodoBackup-YYYY-MM-DD.wtdb` files, with the same content as a manual
export. There is also a button to make the copy right now and an option to
**load the most recent copy on startup**, useful if you work on two computers
with the same synced folder.

#### Export for reports

The three-dot menu of the sidebar includes **Export all projects**, a Markdown
summary of all your projects. Each phased project, the overview and the weekly
summaries also have their own export.

### In-app guide

If you want to see everything above with examples and concrete steps, the
**Feature guide** is inside the app (sidebar → three dots → Feature guide). It
has one tab for each block, with real examples of use.

![Feature guide with People examples](docs/screenshots/11-feature-guide.png)

---

## Keyboard shortcuts

The essentials (you can see them at any time by pressing **?**):

| Key | Action |
|---|---|
| `N` | Focuses the new-task field of the centered day |
| `T` | Back to Today |
| `← / →` | Moves one day back / forward |
| `/` | Opens search |
| `Ctrl+K` | Opens the quick command box |
| `D` | Opens deadlines |
| `?` | Shows this help |
| `Esc` | Closes the open dialog, or the overview |
| `Ctrl+Alt+Space` | Global task capture (desktop app) |

![Keyboard shortcuts modal](docs/screenshots/12-shortcuts.png)

---

## Issues and suggestions

Open an issue in the repository or write to me directly.

## License

GPL-3.0. Based on [WeekToDo](https://github.com/manuelernestog/weektodo) by
Manuel Ernesto García, extended for a daily research workflow.
