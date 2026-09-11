# GTB One

Static site (no build step) — live class timetable, student auth, profile, and attendance tracking for GTB4CEC and GTBIT.

> This is the technical/setup reference (Supabase, SQL, environment, testing). For a plain user guide, see [README.md](README.md).

## Files

**Timetable (unchanged from before):**
`index.html` (extended, not replaced), `style.css` (extended), `app.js`, `data.js`

**New — auth, profile, attendance:**
- `config.js` — Supabase URL/anon key (public, safe to expose — see Security below)
- `lib/supabase-client.js` — creates the shared `sb` client
- `lib/tt-helpers.js` — reads `TIMETABLE_DATA` by college/branch/semester/section, merges multi-period labs into single sessions, builds a stable session id, and maps semester numbers to the "Year 1–4" labels shown in the UI
- `lib/scan-helpers.js` — cross-section scans used by Rooms and Faculty: every section in a college, room occupancy at a given moment, and a professor's full schedule
- `auth.js` — signup/login/logout/forgot-password/session restore against Supabase Auth
- `auth-view.js` — login/signup/forgot-password/reset-password forms
- `profile.js` — profile completion form, edit form, read-only view
- `attendance.js` — today's attendance page: builds today's classes from the timetable + profile, present/absent controls, bulk actions, save
- `attendance-status.js` — overall/lecture/lab percentages, subject-wise table, attendance history
- `rooms.js` — Empty Room Locator: which rooms are free vs. in use right now
- `faculty.js` — Teacher Locator: search a professor, see where they are right now and their full weekly schedule
- `main.js` — view router, topbar account menu, toast notifications, app boot
- `supabase.sql` — table definitions, indexes, RLS policies

The existing timetable UI, colors, typography, and the Feed/Grid views are untouched — they're now wrapped in a `#view-timetable` section that the new views sit alongside. The old "Faculty/Resources/Notices/Campus — SOON" placeholder block is gone; the bottom nav is now four working destinations (Timetable, Attendance, Rooms, Faculty).

## Year vs. Semester

The selector is labeled **Year** (1–4) since that's how students actually think about it, but the timetable data is keyed by real semester number (1–8). GTBIT's current data has real content in semesters 1, 3, 5, 7 — the autumn/odd semester for each of the four years — so `Year 1` resolves to semester 1, `Year 2` to semester 3, and so on. `ttResolveSemesterForYear()` in `lib/tt-helpers.js` picks whichever of a year's two semester slots actually has content; if a spring/even semester gets added later for some year, it'll be picked up automatically without any UI changes. The `profiles` table still has both `year` and `semester` columns — `year` is now always `Math.ceil(semester / 2)`, computed automatically, not asked twice.

## 1. Supabase setup

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase.sql` — this creates `profiles` and `attendance`, their indexes, and Row Level Security policies (a student can only read/write their own rows).
3. Go to **Authentication → Providers → Email** and turn **off** "Confirm email". This is the simplest path: the app creates the student's profile row immediately after signup, which requires an active session. If you'd rather keep email confirmation on, that's fine too — see "Assumptions" below for what changes.
4. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.

## 2. Configure the app

Edit `config.js`:

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

There's no build step, so there are no real "environment variables" — `config.js` holds these two values directly. The anon key is meant to be public (it's the same key Supabase's own docs tell you to ship in frontend code); the actual security boundary is the Row Level Security policies in `supabase.sql`. Never put your Supabase **service_role** key anywhere in this project.

## 3. Deploy

Same as before — no build step:

```
vercel
```

from inside this folder, or drag the folder into the Vercel dashboard.

## Testing signup / login

1. Open the site, tap the account button (top right) → **Sign up**.
2. Fill in name, email, password, roll number, then college → branch → semester → section (each list narrows based on the one before it).
3. Submit. You should land on **Profile** showing what you entered.
4. Log out from the profile page, then log back in with the same email/password from the **Log in** tab.
5. Test **Forgot password** with a real email if you want to check the reset email — the link lands back on this same page and shows a "set new password" form.

## Testing attendance

1. With a profile set up for a section that has classes today, open **Attendance** (bottom nav).
2. You'll see today's classes pulled straight from `data.js` for your college/branch/semester/section — breaks are excluded, and any lab that spans consecutive periods in the timetable (same subject, group, room, and professor) is shown as one session, not one row per hour.
3. Try **Mark All Present**, then flip one class to **Absent** individually.
4. Hit **Save Today's Attendance**. Refresh the page and reopen Attendance — your marks should still be there, and the button now says "Update Today's Attendance".
5. Open **Attendance Status** from the account menu — you should see overall/lecture/lab percentages and a subject-wise breakdown from what you just saved. Save attendance on a different date (or edit a row's `date` directly in Supabase's table editor to backfill test data) to see the History list populate.

## Testing Rooms and Faculty

Neither requires login.

1. Open **Rooms** (bottom nav) — pick a college, and you'll see which rooms are free right now and which are in use with what's running there. It recalculates from the live clock, same as the timetable's "Now" band.
2. Open **Faculty**, pick a college, and type part of a professor's name (GTB4CEC uses initials like `KV`; GTBIT uses full names). Pick a result to see whether they're in a class right now plus their full week, grouped by day.

## Testing Resources

No login required.

1. Open **Resources** (bottom nav) — pick college, branch, and year, all pulled from your real timetable data.
2. Every subject taught that year shows up as a card. Tapping "Open on Dotnotes ↗" opens `dotnotes.in/subject/<CODE>` in a new tab, using your subject's exact code (e.g. `BEE`, `PPS`, `EVS`).
3. This is a real, confirmed route on their site — `dotnotes.in/subject/SE` genuinely resolves to their Software Engineering page. Standard GGSIPU codes (most of GTBIT's, and common ones like BEE/PPS/EVS/EM) should land precisely. A few of GTB4CEC's more shorthand codes (`EPY`, `SMT`, `CS`) might not match dotnotes' own slug for that subject and could land on an empty/not-found state on their site rather than a 404 — never the wrong subject, just possibly not found yet.
4. If you (or a student) checks a subject in a real browser and finds the code dotnotes actually uses differs from ours, add it to `DOTNOTES_CODE_OVERRIDES` at the top of `resources.js` — e.g. `{"EPY": "PHY"}` — and that subject will always resolve correctly from then on.

## Assumptions about the timetable data

- `year` is collected and stored on the profile as the spec asked, but the timetable itself is only keyed by **semester**, not year — so lookups use college + branch + semester + section, and `year` is descriptive metadata only.
- A "session" for attendance purposes is a merged run of consecutive identical periods (same subject, type, group, location, professor) in a single day — this is what turns a 2-period GTBIT lab into one attendance entry instead of two.
- `timetable_session_id` is a deterministic string (`college|branch|semester|section|day|start-time|subject|group`) rather than a stored UUID, since the timetable is static JSON, not a database table — combined with `date`, it's what the unique constraint in `attendance` uses to prevent duplicate rows and to support re-saving the same day.
- If you keep Supabase's "Confirm email" setting on: signup won't have an active session yet, so the app skips writing the profile row at that moment (it would fail Row Level Security anyway) and shows "check your email to confirm, then log in" instead. The first time that student logs in, GTB One will find no profile and show the profile-completion form then — no data is lost, they just fill it in once, slightly later.

## Future ERP integration

Every attendance row has a `source` column (`'manual'` for now). To bring in ERP data later, insert rows with `source = 'erp'` from whatever job talks to the college ERP — `attendance-status.js`'s calculations already work off the raw rows regardless of `source`, so the dashboard doesn't need to change, and you can choose later whether ERP rows should override or coexist with manual ones for a given session.
