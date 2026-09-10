# GTB One

Live class timetable for GTB4CEC and GTBIT.

## Adding a new branch or college

Open `data.js`:

1. Add the college/branch/semester entry under `TIMETABLE_DATA`, following the same shape as `gtb4cec.branches.cse.semesters["1"]` — an object of section names, each holding a day-of-week array of `{ start, end, subject, location, professor, type, group }`. `group` is optional, used when a slot is split into batches (e.g. `A` / `B`).
2. Flip `available: true` for that college/branch in `COLLEGE_META` / `BRANCH_META`.
3. Update `SEMESTER_META` if a semester beyond what's listed is needed.
4. Update `LAST_UPDATED`.

No build step — this is a static site. Deploy the folder directly to Vercel.
