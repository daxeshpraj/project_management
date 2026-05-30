# Deploy to GitHub & AWS

## Prerequisites

### GitHub repository secrets

In **GitHub → Settings → Secrets and variables → Actions**, set:

| Secret | Example | Purpose |
|--------|---------|---------|
| `EC2_HOST` | `65.1.93.48` | EC2 public IP or hostname |
| `EC2_KEY` | *(private key PEM contents)* | SSH key for `ubuntu` user |
| `PUBLIC_API_URL` | `http://65.1.93.48` | Frontend build API base URL |

If `PUBLIC_API_URL` is omitted, the workflow uses `http://65.1.93.48`.

### EC2 server layout (expected)

- App code: `/home/ubuntu/app2` (git clone of this repo)
- Frontend static files: `/home/ubuntu/frontend/build`
- Python venv: `/home/ubuntu/app2/venv`
- Services: `myapp` (FastAPI), `nginx`
- PostgreSQL database: `aemje_architect_db`

---

## 1. Push code to GitHub (triggers deploy)

```bash
git add -A
git commit -m "HK Tech rebrand, IIS fixes, remove procurement, AWS deploy updates"
git push origin main
```

GitHub Actions (`.github/workflows/deploy.yml`) will:

1. Build the React app with `REACT_APP_BACKEND_URL`
2. Upload `frontend/build` to EC2
3. `git pull` on the server, install Python deps, restart `myapp` and `nginx`

Watch progress: **GitHub → Actions → Deploy to AWS**.

---

## 2. Restore database on AWS (one-time / when migrating)

Copy your valid backup from Windows to EC2:

```powershell
scp "D:\Daxesh Data\Daxesh Project\Aemje\Backup\aemje_architect_db_20260530_144418.backup" ubuntu@65.1.93.48:/home/ubuntu/backups/
```

SSH into EC2 and run:

```bash
chmod +x /home/ubuntu/app2/scripts/aws-restore-database.sh
/home/ubuntu/app2/scripts/aws-restore-database.sh /home/ubuntu/backups/aemje_architect_db_20260530_144418.backup
```

This script:

- Backs up the current EC2 database
- Restores your `.backup` file
- Runs `post_restore_migrate.py` (schema alignment)
- Resets **admin** password to **admin123**
- Restarts `myapp` and `nginx`

### EC2 `backend/.env` (on server, not in git)

Ensure CORS allows your public URL:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/aemje_architect_db
CORS_ORIGINS=http://65.1.93.48,https://your-domain.com
```

---

## 3. Verify

- App: `http://65.1.93.48` (or your domain)
- API: `http://65.1.93.48/api/ping` → `{"status":"ok"}`
- Login: **admin** / **admin123** (change after first login)

---

## Rollback

- **Code:** revert commit on `main` and push again.
- **Database on EC2:** use the safety file created by `aws-restore-database.sh` under `/home/ubuntu/backups/`.
