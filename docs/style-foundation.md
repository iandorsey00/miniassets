# Style Foundation

MiniAssets uses `app/minitickets-foundation.css` as its family baseline.

## Shared Rules

- Treat MiniTickets as the source template for family tokens, theme handling, accent handling, shell layout, auth layout, and control primitives.
- Keep MiniAssets-specific selectors in `app/globals.css`.
- Do not create near-duplicate token systems.
- If a shared rule changes, prefer updating sibling apps together.

## Footer Convention

For consistency across family apps, the footer line should use:

`MiniAssets © {year} Ian Dorsey · Open source under the MIT License`

If this wording changes in one sibling app, it should be reviewed as a family-wide convention rather than a one-off local tweak.
