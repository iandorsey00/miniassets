# MiniAssets

Bilingual household asset management for low-to-medium secrecy items, built around a standardized location tree and MiniAuth-backed access.

## Current scope

- MiniAuth authentication and shared workspace sync
- Shared locale, theme, and accent inheritance
- Standardized household location tree
- Location reparenting for correcting branch placement mistakes
- Assets with English and Chinese naming
- Optional barcode scanning and optional metadata lookup
- Grouped-item support when per-item detail is unrealistic
- Movement history with verified, assumed, or reported confidence
- AI-friendly JSON export for external analysis and reorganization workflows

## Development

1. Copy `.env.example` to `.env` and adjust values if needed.
2. `npm run db:init`
3. `npm run db:seed`
4. `npm run dev`

## Notes

- Barcode enrichment is intentionally optional. There is no universal product database for all household goods.
- The recommended AI pattern is export-first: let `MiniAssets` stay operationally simple, then hand structured JSON to outside AI tools.
- The shared visual baseline lives in `app/minitickets-foundation.css`, with MiniAssets-specific additions layered in `app/globals.css`.
- Footer copy follows the family convention: `MiniAssets © {year} Ian Dorsey · Open source under the MIT License`.
- Generalized cataloging and placement standards live in [docs/asset-data-standards.md](/Users/iandorsey/dev/miniassets/docs/asset-data-standards.md).
