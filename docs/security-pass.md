# Security Pass

This document captures the current security posture for MiniAssets.

## Data scope

- intended only for low-to-medium secrecy household inventory
- not intended for highly sensitive legal, financial, identity, or similarly high-risk records
- barcode enrichment is optional and should never be treated as authoritative

## Current safeguards

- authentication is delegated to MiniAuth
- app access is gated by MiniAuth `AppAccess`
- workspace truth is synced from MiniAuth when enabled
- the app serves `robots.txt` with full-site disallow
- page metadata disables indexing and caching
- the app uses server-side rendering for authenticated views
- production SQLite is expected to live outside the repo working tree

## Operational expectations

- keep `.env.production` on the server only
- keep the SQLite database in a durable app-data path
- back up the database before schema-changing releases
- use HTTPS at the reverse proxy
- run the app as a non-root user
- keep MiniAuth and MiniAssets on the same trusted parent domain only when shared cookie behavior is intended

## Remaining limits

- robots and noindex reduce accidental discovery but do not provide access control
- barcode provider requests may disclose a scanned code to that provider when enabled
- the current release path uses SQLite and a single-node deploy model, so file backup and restore quality matter
