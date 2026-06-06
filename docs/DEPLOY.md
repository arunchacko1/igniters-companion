# Deploying Igniters Companion (AWS free tier)

> **The canonical deploy path is Hugging Face Spaces — see
> [DEPLOY-HF.md](DEPLOY-HF.md).** This AWS EC2 + RDS runbook is kept as an
> alternative for a self-hosted, always-on deployment.


Target: one **EC2 t3.micro** running the app container, with **RDS Postgres**
for the database. Everything here fits the AWS free tier (12-month allowances,
or signup credits). Postgres runs on RDS — not on the EC2 box — because 1GB of
RAM can't hold the app and a database together.

```
  Browser ──HTTP──> EC2 t3.micro (Docker: app on :80) ──5432──> RDS Postgres (pgvector)
                          ▲
                          │ docker compose pull (image from GHCR)
                   GitHub Actions (build + push + deploy)
```

The image is built by GitHub Actions, pushed to GHCR, and pulled by EC2. You
never run `next build` on the 1GB box (it would OOM).

---

## 1. RDS Postgres

1. RDS → **Create database** → PostgreSQL → **Free tier** template.
2. Instance: `db.t3.micro`, 20 GB gp3, **Public access: Yes** (so you can apply
   the schema from the EC2 box; lock this down later if you want).
3. Set master username `igniters` and a strong password. Initial database name
   `igniters`.
4. Security group: allow inbound **5432** — initially from your EC2's security
   group (or temporarily your IP to apply the schema).
5. Note the endpoint, e.g. `your-instance.xxxx.us-east-1.rds.amazonaws.com`.

The schema (`src/lib/db/schema.sql`) creates the `vector` and `pgcrypto`
extensions, both supported on RDS Postgres.

## 2. EC2 instance

1. EC2 → **Launch instance** → Amazon Linux 2023, `t3.micro`.
2. Create/download a key pair (`.pem`).
3. Security group inbound rules:
   - **22** (SSH) from *your IP only*
   - **80** (HTTP) from anywhere
4. Launch, then SSH in: `ssh -i key.pem ec2-user@<EC2_PUBLIC_IP>`

## 3. Bootstrap the box

Copy `scripts/ec2-bootstrap.sh` to the instance and run it once:

```bash
scp -i key.pem scripts/ec2-bootstrap.sh ec2-user@<EC2_PUBLIC_IP>:~
ssh -i key.pem ec2-user@<EC2_PUBLIC_IP> 'bash ~/ec2-bootstrap.sh'
```

It creates 2GB swap, installs Docker + Compose + psql, and makes `~/igniters`.
**Log out and back in** afterwards so docker group membership applies.

## 4. Config + schema

On the box, put the compose file and env in `~/igniters`:

```bash
# from your machine
scp -i key.pem docker-compose.prod.yml ec2-user@<EC2_PUBLIC_IP>:~/igniters/
scp -i key.pem src/lib/db/schema.sql   ec2-user@<EC2_PUBLIC_IP>:~/igniters/
```

On the box, create `~/igniters/.env` from `.env.production.example` and fill in
the real `DATABASE_URL` (RDS endpoint), `JWT_SECRET`, and `GROQ_API_KEY`. Then
apply the schema:

```bash
cd ~/igniters
export $(grep DATABASE_URL .env)
psql "$DATABASE_URL" -f schema.sql
```

## 5. Make the GHCR image pullable

By default the GHCR package is private. The simplest free option: after the
first successful build, open the package on GitHub → **Package settings** →
**Change visibility → Public**. Then EC2 can `docker compose pull` without
authenticating. (If you'd rather keep it private, create a PAT with
`read:packages` and `docker login ghcr.io` on the box before pulling.)

## 6. GitHub secrets

Repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_SSH_KEY` | contents of your `.pem` private key |

`GITHUB_TOKEN` (used to push to GHCR) is provided automatically.

## 7. Deploy

Push to `main` (or run the **deploy** workflow manually). The workflow builds
the image, pushes it to GHCR, and SSHes into EC2 to pull and restart.

For the very first run you can also pull manually on the box:

```bash
cd ~/igniters
docker compose -f docker-compose.prod.yml up -d
```

Visit `http://<EC2_PUBLIC_IP>`. Health check: `http://<EC2_PUBLIC_IP>/api/health`
→ `{"status":"ok"}`.

## 8. First user

There is no seed in production — real content comes through the admin upload.
Register the first account at `/register`, choosing **Leader**, then upload
documents from the admin dashboard.

---

## Notes & gotchas

- **RAM is tight.** The app peaks around 700MB while embedding; the 2GB swap is
  what keeps a t3.micro stable. Watch `free -h` and `docker stats` after deploy.
- **Lock down RDS** once the schema is applied: restrict 5432 to the EC2
  security group only, and flip RDS public access off.
- **Free tier is time-limited** (12 months, or ~6 months of signup credits).
  Set a billing alarm so you're not surprised when it ends.
- **TLS/domain** are out of scope here (HTTP on :80). To add HTTPS later, put
  the container behind a reverse proxy (Caddy/Nginx) with a free Let's Encrypt
  cert, or front it with CloudFront.
