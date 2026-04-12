# Release Checklist

Use this checklist for MiniAssets releases.

## Before release

- review schema and data-impact changes
- confirm no secrets or filled env files are staged
- confirm the release still fits the low-to-medium secrecy scope
- confirm barcode lookup remains optional
- confirm AI export still excludes any newly added high-risk fields

## Release

1. update docs if behavior or deploy expectations changed
2. run `npm run lint`
3. run `npm run build`
4. deploy with `bash scripts/deploy.sh`
5. verify `/api/health`
6. verify sign-in flow
7. verify dashboard, assets, locations, and export routes

## After release

- confirm `robots.txt` still disallows the full site
- confirm the current production domain resolves to the intended server
- confirm the reverse proxy is serving the expected site instead of a default welcome page
