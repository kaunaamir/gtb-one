# GTB One

A student-made timetable, attendance, and campus companion for **GTB4CEC** and **GTBIT** — everything you'd normally have five different screenshots and a group-chat pin for, in one place.

🔗 **Live site:** [gtbone.vercel.app](https://gtbone.vercel.app)

Not an official college platform — just a student project, built to make the everyday stuff (what's my next class, where's this room, am I short on attendance) faster to check.

---

## What's in it

### 📅 Timetable
Pick your college, branch, year, and section, and see your schedule two ways:
- **Feed** — a scrollable day view with a live "Now" band showing your current or next class, counting down.
- **Grid** — the same day laid out as cards you can scan at a glance.

No account needed for this — it's the front page.

### ✅ Attendance
Sign up once with your college/branch/year/section, and from then on:
- Your **today's classes** are pulled straight from the timetable automatically — no re-selecting anything.
- Mark each class **Present / Absent** (or bulk-mark the whole day).
- Multi-period labs count as one session, not two or three.
- **Attendance Status** shows your overall, lecture, and lab percentages, plus a subject-by-subject breakdown and full history.

Requires an account (free, just an email + password).

### 🏫 Empty Rooms
See which rooms are free *right now*, and what's running in the ones that aren't — updates live off the clock, no login needed.

### 🔍 Find a Teacher
Search any professor by name and see whether they're in a class right now, plus their full week at a glance. Useful for catching someone during a free period.

### 📚 Resources
One tap to [dotnotes.in](https://dotnotes.in) for notes, PYQs, and study material — not hosted here, just a quick jump-off point.

---

## Getting started

1. Go to [gtbone.vercel.app](https://gtbone.vercel.app).
2. Browse the timetable, check empty rooms, or find a teacher — no account needed.
3. Want to track attendance? Tap the account icon (top right) → **Sign up**, and fill in your college/branch/year/section once. Everything after that is automatic.

## Coverage

| College | Branches |
|---|---|
| GTBIT | CSE, AI/ML, DS, ECE, IT |
| GTB4CEC | CSE |

More branches and colleges get added as timetable data comes in. If your section's missing or looks wrong, that's a data gap, not a bug — let me know and I'll get it added.

## FAQ

**Is this official?**
No — it's an independent student project, not run or endorsed by either college.

**Is my attendance data private?**
Yes. Each student can only ever see their own attendance and profile — enforced at the database level (Row Level Security), not just hidden in the UI.

**Why does it ask for Year *and* the timetable already knows my semester?**
It doesn't ask twice — "Year" is just how the timetable is labeled since that's how everyone actually thinks about it; semester numbering happens automatically underneath.

**Can I contribute or self-host this?**
Yes — see [SETUP.md](SETUP.md) for the technical setup (it's a plain static site, no build step, backed by Supabase).

---

Made by **Aamir** · GTB4CEC, CSE, First Year
