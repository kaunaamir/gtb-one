# GTB One

A student-made timetable, attendance, and campus companion for **GTB4CEC** and **GTBIT** — everything you'd normally have five different screenshots and a group-chat pin for, in one place.

🔗 **Live site:** [gtb-one.vercel.app](https://gtb-one.vercel.app)

Not an official college platform — just a student project, built to make the everyday stuff (what's my next class, where's this room, am I short on attendance) faster to check.

---

## What's in it

### 📅 Timetable
Pick your college, branch, year, and section, and see your schedule two ways:
- **Feed** — a scrollable day view with a live "Now" band showing your current or next class, counting down.
- **Grid** — the same day laid out as cards you can scan at a glance.

No account needed for this — it's the front page. It also remembers whatever college/branch/year/section you last looked at, so it opens back on that instead of resetting to the default every time.

### ✅ Attendance
Sign up once with your college/branch/year/section, and from then on:
- Your **today's classes** are pulled straight from the timetable automatically — no re-selecting anything.
- Mark each class **Present / Absent / Cancelled** (or bulk-mark the whole day). Cancelled classes don't count toward your total at all — that's for the days a class just didn't happen (holiday, professor absent, whatever), so it doesn't unfairly drag your percentage down.
- Multi-period labs count as one session, not two or three.
- **Add Past Attendance** (top of the page) lets you backfill any earlier date — handy if you started using GTB One a few weeks into the semester and want your history to actually reflect reality.
- Free/library periods with no real class (like GTB4CEC's "SCA" slot) are automatically left out of attendance entirely — nothing to mark, nothing counted.
- **Attendance Status** shows a circular meter (green/yellow/red against your minimum criteria), overall/lecture/lab percentages, a subject-by-subject breakdown with how many classes you can skip (or need to attend) to stay above criteria, and full history.
- The minimum criteria defaults to 75% but you can change it right on the status page — everything recalculates instantly.

Requires an account (free, just an email + password). Worth knowing: this only counts what you mark here — it's not synced with the official college portal (yet), so treat it as your own tracker, not the final word.

### 🏫 Empty Rooms
See which rooms are free *right now*, and what's running in the ones that aren't — updates live off the clock, no login needed.

### 🔍 Find a Teacher
Search any professor by name and see whether they're in a class right now, plus their full week at a glance. Useful for catching someone during a free period.

### 📚 Resources
One tap to [dotnotes.in](https://dotnotes.in) for notes, PYQs, and study material — not hosted here, just a quick jump-off point.

---

## Getting started

1. Go to [gtb-one.vercel.app](https://gtb-one.vercel.app).
2. Browse the timetable, check empty rooms, or find a teacher — no account needed.
3. Want to track attendance? Tap the account icon (top right) → **Sign up**, and fill in your college/branch/year/section once. Everything after that is automatic.

## Coverage

| College | Branches |
|---|---|
| GTBIT | CSE, AI/ML, DS, ECE, IT |
| GTB4CEC | CSE, IT |

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
