# Deploy

This document describes a repeatable single-droplet deployment path for MiniAssets without embedding private hostnames, usernames, or secret values in the repo.

## Production shape

- one Node.js process running `next start`
- one reverse proxy in front of the app
- one SQLite database file on the server
- MiniAuth as the shared identity source
- systemd managing the app process

## Required server inputs

Prepare these values outside the repo:

- app directory
- production env file path
- domain name
- service port
- non-root app user and group
- absolute path to the Node.js bin directory
- MiniAuth base URL and MiniAuth database path

## Recommended layout

- app code in a dedicated app directory
- `.env.production` stored on the server, not committed
- systemd unit installed from [miniassets.service.example](/Users/iandorsey/dev/miniassets/deploy/miniassets.service.example)
- Caddy config installed from [Caddyfile.example](/Users/iandorsey/dev/miniassets/deploy/caddy/Caddyfile.example)

## First deploy

1. Clone the repo onto the server.
2. Install a supported Node.js version.
3. Copy [.env.production.example](/Users/iandorsey/dev/miniassets/.env.production.example) to a server-local production env file and fill real values there.
4. Copy [.env.deploy.example](/Users/iandorsey/dev/miniassets/.env.deploy.example) to `.env.deploy` in the app directory and fill real values there.
5. Run `npm ci`.
6. Run `npm run db:apply`.
7. Run `npm run build`.
8. Optionally run `npm run db:seed` only for a non-production trial instance.
9. Install and enable the systemd unit.
10. Install and reload the Caddy config.
11. Verify [health route](/Users/iandorsey/dev/miniassets/app/api/health/route.ts), MiniAuth login redirect, and end-to-end asset access.

## Standard deploy flow

Prefer the deploy script over ad hoc shell history:

`bash scripts/deploy.sh`

The script expects a server-local deploy env file and will:

- pull the requested git branch
- install exact dependencies with `npm ci`
- apply the schema
- build the app
- restart the systemd service
- optionally run a final health check if `HEALTHCHECK_URL` is set

## Health check

Confirm:

- the systemd service is active
- the Caddy reload succeeded
- `GET /api/health` returns `{"ok":true,"service":"miniassets"}`
- `GET /robots.txt` returns a full-site disallow policy
- MiniAuth sign-in returns to MiniAssets successfully
- an existing user with MiniAuth app access can load `/dashboard`

## Rollback

If a release fails after checkout:

1. Switch the server working tree back to the previous known-good commit.
2. Run `npm ci`.
3. Run `npm run db:apply`.
4. Run `npm run build`.
5. Restore the matching database backup if the failed release changed data or schema incompatibly.
6. Restart the service.

For safety, take a database backup before schema-changing releases.
