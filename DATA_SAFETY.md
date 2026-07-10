# HRMS Data Safety Guide

Protections added on 2026-07-02 after an accidental wipe of employee data. Four layers now stand between your data and permanent loss.

## Layer 1 — Automated backups

Run this once to schedule a daily backup at 8:00 PM:

```powershell
powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\backup_database.ps1 -Install
```

Each run dumps the PostgreSQL database to `D:\HRMS\backups\HRMS_<date>.dump` and copies uploaded files (photos, documents) to `backups\storage_files`. The 5 newest dumps are always kept; older ones are removed after 30 days. Check `backups\backup_log.txt` to confirm it ran.

To restore after a disaster:

```powershell
powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\restore_database.ps1
```

It uses the newest dump by default, asks for confirmation, and replaces the database contents with the backup. Tip: occasionally copy a dump to a USB drive or cloud storage — backups on the same disk don't survive disk failure.

## Layer 2 — Destructive commands are blocked

`php artisan migrate:fresh`, `migrate:refresh`, `migrate:reset`, and `db:wipe` now fail instead of erasing the database. This is what most likely destroyed your data last time. To intentionally run one, set `ALLOW_DESTRUCTIVE_DB=true` in `LARAVEL\.env`, run it, then set it back to `false`. Plain `php artisan migrate` (adding new tables/columns) is unaffected and always works.

## Layer 3 — Nothing is hard-deleted anymore

Every model that holds employee data (User, Employee, Attendance, Leave, Overtime, Task, Payslip, PayrollRequest) now uses soft deletes: "deleting" only sets a `deleted_at` timestamp and hides the row. Deleting a terminated employee now archives them, and `POST /api/employees/{id}/restore` (Admin/Super Admin) brings back the employee, their user account, and all related records. Restored accounts have no roles or tokens until an admin re-assigns them.

To activate this layer, run once:

```
cd D:\HRMS\LARAVEL
php artisan migrate
```

(adds `deleted_at` columns to users, overtimes, tasks, payslips, payroll_requests — existing data untouched).

## Layer 4 — Rules for AI assistants

When letting any AI tool work on this project, paste this at the start:

> Never run `migrate:fresh`, `migrate:refresh`, `db:wipe`, `git stash`, `git reset --hard`, raw `DELETE`/`TRUNCATE`/`DROP` SQL, or any seeder against this project. Never modify `.env`. If a task seems to require any of these, stop and ask me first.

And before any AI session that touches the backend, take a manual backup first:

```powershell
powershell -ExecutionPolicy Bypass -File D:\HRMS\backups\backup_database.ps1
```

## Known unique-email caveat

Because archived users keep their row, creating a new user with an archived user's email will fail with a unique-constraint error. Restore the archived employee instead, or change the old account's email first.
