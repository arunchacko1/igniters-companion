# Deploying Igniters Companion (Hugging Face Spaces)

Target: a **Docker Space** on Hugging Face running the app container, with
**Supabase Postgres** (pgvector) as the database. HF's free CPU tier gives
2 vCPU / 16 GB RAM, so the ~700 MB embedding spike has plenty of headroom and
no swap tuning is needed. The DB lives outside the Space, so the Space's
ephemeral filesystem doesn't matter.

```
  Browser ──HTTPS──> HF Space (Docker, app on :3000) ──5432──> Supabase Postgres (pgvector)
                          ▲
                          │ git push space main
                   HF builds the Dockerfile automatically
```

The embeddings model is baked into the image at build time
(`scripts/prefetch-model.mjs`), so there's no model download at first request.

---

## 1. Supabase Postgres

1. Create a project at <https://supabase.com> (free tier is fine).
2. Project → **Connect** → choose the **Session pooler** connection string
   (port `5432`, IPv4). This is the right mode for a long-running server using a
   `pg` Pool. It looks like:
   `postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
3. Apply the schema. Either paste `src/lib/db/schema.sql` into the Supabase
   **SQL Editor** and run it, or from your machine:
   ```bash
   psql "<DATABASE_URL>" -f src/lib/db/schema.sql
   ```
   The schema creates the `vector` and `pgcrypto` extensions, both supported on
   Supabase.

## 2. Space secrets

In the Space → **Settings** → **Variables and secrets**, add these as
**Secrets** (not public variables):

| Secret | Value |
|---|---|
| `DATABASE_URL` | the Supabase Session-pooler connection string |
| `JWT_SECRET` | a long random string for signing session JWTs |
| `GROQ_API_KEY` | from <https://console.groq.com> |

Secrets are injected as environment variables at runtime. The build does **not**
need them (`next build` and the model prefetch don't touch the DB or Groq).

## 3. The Space config header

`README.md` carries the Space config in its YAML front matter:

```yaml
---
title: Igniters Companion
emoji: 🔥
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 3000
pinned: false
---
```

`sdk: docker` tells HF to build the repo `Dockerfile`; `app_port: 3000` matches
the container's `EXPOSE`/`PORT`. This header only needs to exist on the branch
you push to the Space.

## 4. Deploy

The `space` git remote points at the Space repo. HF builds and deploys from the
Space's `main` branch, so push this branch there:

```bash
git push space deploy/hf:main
```

HF picks up the push, builds the Dockerfile, and starts the container. Watch the
**Logs** tab for the build; first build takes a few minutes (model bake + Next
build). When it's running, the Space URL serves the app and
`<space-url>/api/health` returns `{"status":"ok"}`.

## 5. First user

There's no seed in production — content comes through the admin upload. Register
the first account at `/register`, choose **Leader**, then upload documents from
the admin dashboard.

---

## Notes & gotchas

- **Free Spaces sleep** after ~48 h of inactivity and cold-start on the next
  request (image + model load). Fine for a portfolio demo; upgrade the hardware
  tier to keep it always warm.
- **Use the Session pooler, not the direct connection.** Supabase's direct
  connection is IPv6-only; the pooler gives an IPv4 endpoint that works from the
  HF build/runtime network and supports the persistent `pg` Pool.
- **Secrets vs. variables:** put `DATABASE_URL`, `JWT_SECRET`, and
  `GROQ_API_KEY` under *Secrets* so they aren't exposed in the Space page.
- **Updating the deploy:** push again to `space` `main`. HF rebuilds on every
  push. Keep iterating on `deploy/hf` (or merge to `main`) and push when ready.
