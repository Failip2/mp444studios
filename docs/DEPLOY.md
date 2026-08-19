# Deploying mp444studios to a VPS

The site is a Next.js app that builds to fully static pages plus a small Node
server. There is no database, no CMS and no runtime image processing — every
image derivative is generated on a workstation and committed, so the VPS only
ever runs `next build`.

That means a 1 GB / 1 vCPU box is comfortably enough.

---

## What actually ships

| Path            | What it is                                | In git |
| --------------- | ----------------------------------------- | ------ |
| `source/photos` | Camera originals, ~660 MB                 | yes    |
| `public/media`  | AVIF + WebP derivatives, ~66 MB           | yes    |
| `public/docs`   | The two CV PDFs                           | yes    |
| `src/lib/media.generated.ts` | Manifest: sizes, blur data, colours | yes |

`source/photos` is excluded from the Docker image via `.dockerignore` — it is
only needed by `npm run media`, which nobody runs on the server.

---

## Option A — Docker (recommended)

Prerequisites: Docker Engine + the compose plugin, and nginx on the host.

```bash
sudo apt update && sudo apt install -y nginx
curl -fsSL https://get.docker.com | sudo sh
```

Then:

```bash
sudo git clone https://github.com/Failip2/mp444studios.git /srv/mp444studios
cd /srv/mp444studios
sudo cp .env.example .env
sudo nano .env          # set NEXT_PUBLIC_SITE_URL and the SMTP settings
sudo docker compose up -d --build
```

`.env` is read by compose and passed to the container. See **Contact form**
below for the SMTP part; the site builds and runs fine with it left blank.

Check it is answering on loopback before pointing nginx at it:

```bash
curl -I http://127.0.0.1:3000/
```

### Put nginx in front

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mp444studios
sudo ln -s /etc/nginx/sites-available/mp444studios /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

`deploy/nginx.conf` serves `/media/` and `/docs/` directly off disk from
`/srv/mp444studios/public`, and proxies everything else. If you cloned somewhere
other than `/srv/mp444studios`, change the `root` line to match.

### TLS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mp444studios.dk -d www.mp444studios.dk
```

Certbot rewrites the TLS blocks in place and installs a renewal timer. The
config already references the paths certbot will create, so run it *after*
installing the config above — if nginx will not start because the certificates
do not exist yet, comment out the two `listen 443` server blocks, run certbot,
then restore them.

### Updating

```bash
cd /srv/mp444studios
sudo git pull
sudo docker compose up -d --build
sudo docker image prune -f
```

---

## Option B — systemd, no Docker

Requires Node 20.9 or newer on the host.

```bash
sudo adduser --system --group --home /srv/mp444studios mp444
sudo -u mp444 git clone https://github.com/Failip2/mp444studios.git /srv/mp444studios
cd /srv/mp444studios
sudo -u mp444 npm ci
sudo -u mp444 NEXT_PUBLIC_SITE_URL=https://mp444studios.dk npm run build
```

`output: "standalone"` puts a self-contained server in `.next/standalone`, but
it deliberately leaves out `.next/static` and `public`. Assemble a runnable
directory after each build:

```bash
sudo -u mp444 bash -c '
  cd /srv/mp444studios
  rm -rf run && mkdir -p run/.next
  cp -r .next/standalone/. run/
  cp -r .next/static run/.next/static
  cp -r public run/public
'
```

Then point the unit at `/srv/mp444studios/run` (edit `WorkingDirectory` and
`ReadWritePaths` in `deploy/mp444studios.service` accordingly):

```bash
sudo cp deploy/mp444studios.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mp444studios
sudo systemctl status mp444studios
```

nginx setup is identical to Option A, but set `root` to
`/srv/mp444studios/run/public`.

---

## Contact form

`/kontakt` sends enquiries over SMTP. Without credentials the page still works
and still shows the email address and phone number — only the send step reports
that it is not configured — so this can be set up after the first deploy.

### Gmail

Gmail rejects the account password over SMTP. Generate an App Password:

1. Enable 2-Step Verification on the Google account.
2. Go to https://myaccount.google.com/apppasswords and create one for "Mail".
3. Put the 16 characters in `SMTP_PASS` (spaces optional).

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=filip.raeburn@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx
CONTACT_TO=filip.raeburn@gmail.com
```

Gmail allows roughly 500 messages a day on a free account, which is far beyond
what a contact form on a portfolio will produce.

### Docker

Put the values in `/srv/mp444studios/.env`. `docker-compose.yml` already passes
them through. Restart with `sudo docker compose up -d`.

### systemd

The unit file is world-readable, so credentials must not go in it. Use an
owner-only environment file, which the unit already references:

```bash
sudo install -o mp444 -g mp444 -m 600 /dev/null /etc/mp444studios.env
sudo nano /etc/mp444studios.env      # KEY=value per line, no quotes
sudo systemctl restart mp444studios
```

### Checking it works

Submit the form and watch the log:

```bash
sudo docker compose logs -f web       # or: journalctl -u mp444studios -f
```

A failed send logs `[kontakt] send failed:` with the reason. A submission
discarded as spam logs `[kontakt] honeypot tripped` or the timing message.

Rate limiting is in-memory and per-process: it resets on redeploy and would not
be shared across replicas. That is deliberate — it is a speed bump, and the
honeypot and timing checks do most of the work.

---

## Adding or replacing photos

This happens on a workstation, never on the server.

1. Drop files into `source/photos/<group>/` — `commercial`, `events`,
   `creative`, `equipment`, `covers` or `team`.
2. Run the pipeline:

   ```bash
   npm run media
   ```

   It only touches files whose bytes changed, prunes derivatives whose source is
   gone, and skips photos that are visually identical to one already in the same
   group. Expect ~4 minutes for a cold run over the full set, under a second
   when nothing changed.

3. Commit `public/media/` and `src/lib/media.generated.ts` together — they must
   never drift apart.
4. `git push`, then update the server as above.

To force a full re-encode after changing quality settings in
`scripts/build-media.mjs`:

```bash
npm run media:force
```

---

## Rolling back

Both options deploy from a git checkout, so a rollback is a checkout:

```bash
cd /srv/mp444studios
sudo git checkout <previous-good-sha>
sudo docker compose up -d --build   # or: rebuild + systemctl restart
```

---

## Troubleshooting

**502 from nginx.** The app is not listening. `docker compose logs -f web`, or
`journalctl -u mp444studios -f`.

**Images 404 while pages work.** nginx `root` does not match where the repo
actually lives. It must point at the directory *containing* `media/`.

**Build killed on a small VPS.** Next needs roughly 1 GB during the build. Add
swap, or build elsewhere and ship the image:

```bash
docker build -t mp444studios:latest .
docker save mp444studios:latest | gzip | ssh vps 'gunzip | docker load'
```

**Fonts fail to fetch during build.** `next/font/google` downloads Inter at
build time. On a box without outbound HTTPS the build will fail; build somewhere
with network access and ship the image instead.
