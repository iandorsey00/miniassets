# Asset Data Standards

These standards define the recommended data-entry model for `MiniAssets` in a generalized, reusable way.

They are intended to improve consistency, retrieval, search quality, and export quality without making entry too rigid for a small self-hosted household system.

## Scope

These standards are meant for:

- low-to-medium secrecy household asset records
- standardized placement tracking
- optional barcode-assisted entry
- export-friendly structured data for later automation or AI processing

They are not intended to be a high-security inventory standard.

## Core Rule

Prefer structured consistency over free-form phrasing.

When possible:

- store important descriptors in dedicated fields
- render them in a fixed order
- normalize obvious formatting differences
- suggest prior values before introducing new variations

## Asset Naming

The primary asset name should be noun-first.

Recommended:

- `Hand soap`
- `Backpack`
- `T-shirt`
- `Storage bin`

Avoid making the main name carry every descriptor.

Avoid:

- overly long adjective-first names
- inconsistent word order for similar items
- mixing brand, color, and model into the base noun when those can be stored separately

## Ordered Asset Description

The default display description should be rendered in a fixed order.

Recommended order:

1. primary name
2. primary color
3. secondary color
4. brand
5. variant
6. subvariant
7. model

Example patterns:

- `Backpack, black, Adidas`
- `Hand soap, aloe vera, moisturizing, Softsoap`
- `Router, white, TP-Link, Archer AX55`

Barcode data should not appear in the default description.

## Color Standards

Colors should be structured instead of combined into a single ad hoc string when possible.

Recommended:

- `primaryColor`
- `secondaryColor`

This avoids duplicate meanings such as:

- `White/Blue`
- `Blue & White`
- `Blue + White`

Preferred normalized result:

- primary color: `White`
- secondary color: `Blue`

Columns, rows, and other placement conventions should remain separate from color data.

## Variant Standards

Variant information should be stored separately from the base noun.

Recommended fields:

- `variant`
- `subvariant`

Use these for meaningful product distinctions such as:

- scent
- finish
- formulation
- edition
- size family
- product line

Examples:

- `Hand soap, aloe vera, moisturizing`
- `Storage bin, clear, IKEA, SAMLA, 5L`

## Barcode Standards

Barcode handling should remain optional.

Rules:

- a missing barcode must never block entry
- barcode lookup is an assistive feature, not the source of truth
- barcode value, format, and source should be stored separately from the default description
- if metadata is pulled from a provider, it should be treated as a suggestion and reviewed by the user

There is no complete universal consumer product database for all household goods.

## Canonicalization And Suggestions

The system should encourage consistency without becoming overly rigid.

Recommended behavior:

- normalize obvious whitespace differences
- normalize obvious capitalization for fields like colors
- reuse existing workspace values when a case-insensitive match already exists
- offer suggestions for common or previously used values
- allow custom values when necessary

Preferred model:

- suggestions first
- normalization second
- manual override still allowed

Avoid a fully locked dropdown-only system unless the domain genuinely requires it.

## Brand And Model Rules

Brand and model should remain separate fields.

Recommended:

- `brand` for the maker or commercial brand
- `model` for a specific model identifier or product model name

Model is especially useful for:

- electronics
- appliances
- tools
- networking gear
- standardized packaged goods

## Quantity And Grouping

Quantity should be explicit.

Use:

- `quantity = 1` for normal single items
- a higher quantity when the entry intentionally represents multiple identical or near-identical items

When item-by-item detail is unrealistic, grouped tracking is acceptable.

Recommended:

- keep grouped entries structurally valid
- still assign a controlled home location
- keep quantity accurate even when the entry is a group

## Location Standards

The location tree remains the primary identity for placement.

Recommended:

- stable, standardized hierarchy
- durable path segments
- minimal ambiguity

Recommended core structural types:

- `House`
- `Floor`
- `Room`
- `Area`
- `Cabinet`
- `Drawer`
- `Shelf`
- `Container`
- `Row`
- `Column`
- `Position`

Recommended structural pattern:

- `House > Floor > Room > Area`

Then add more granular structure only where needed:

- `Area > Cabinet`
- `Area > Drawer`
- `Area > Shelf`
- `Area > Container`
- `Area > Row`
- `Area > Column`
- `Area > Position`
- `Cabinet > Drawer`
- `Cabinet > Shelf`
- `Cabinet > Container`
- `Drawer > Container`
- `Shelf > Container`
- `Container > Container`
- `Cabinet > Row`
- `Cabinet > Column`
- `Cabinet > Position`
- `Drawer > Row`
- `Drawer > Column`
- `Drawer > Position`
- `Row > Column`
- `Row > Position`
- `Column > Position`

The path should be the primary placement reference.

### Parent-Child Rules

The system should constrain child types based on the selected parent.

Recommended:

- root level should default to `House`
- `House` may contain `Floor`, `Room`, or `Area`
- `Floor` may contain `Room` or `Area`
- `Room` may contain `Area`, `Cabinet`, or `Drawer`
- `Room` may also contain `Shelf` or `Container` when needed
- `Area` may contain `Area`, `Cabinet`, `Drawer`, `Shelf`, `Container`, `Row`, `Column`, or `Position`
- `Cabinet` may contain `Drawer`, `Shelf`, `Container`, `Row`, `Column`, or `Position`
- `Drawer` may contain `Container`, `Row`, `Column`, or `Position`
- `Shelf` may contain `Container`, `Row`, `Column`, or `Position`
- `Container` may contain `Container`, `Row`, `Column`, or `Position`
- `Row` may contain `Column` or `Position`
- `Column` may contain `Position`
- `Position` should be a leaf in normal usage

This keeps the hierarchy consistent while still allowing practical household modeling.

### Numeric Code Rules

For consistency, some structural types should use numeric codes only.

Recommended numeric-only types:

- `Cabinet`
- `Drawer`
- `Row`
- `Column`

Recommended flexible-name types:

- `Area`
- `Shelf`
- `Container`
- `Position`

Examples:

- `Cabinet 1`
- `Drawer 2`
- `Row 3`
- `Column 4`

The semantic meaning should usually live in the parent `Area`, not in ad hoc numbering schemes scattered across mixed node types.

Examples:

- `Kitchen > Sink area > Cabinet 1 > Drawer 2`
- `Kitchen > Upper cabinet area > Row 1 > Column 2`
- `Bathroom > Mirror cabinet area > Position: Top`
- `Kitchen > Chrome rack area > Shelf 3 > Container 1`

### Area And Position Guidance

`Area` should carry most human-meaningful spatial semantics.

Recommended uses for `Area`:

- cooking area
- sink area
- upper cabinet area
- lower cabinet area
- counter area
- mirror cabinet area

`Position` should remain flexible.

It may use controlled conventional labels such as:

- `Top`
- `Bottom`
- `Left`
- `Right`
- `Center`
- `Front`
- `Back`

But it should not be restricted only to those values if the household requires a more specific leaf label.

### UI Guidance

To keep entry user-friendly, the type picker should not feel like a raw enum list.

Recommended grouping:

- structure
- storage
- coordinates

The available types should narrow automatically based on the selected parent, and the grouped presentation should make the structural rules easier to understand at a glance.

## Zone Descriptor Standards

Locations may also have standardized secondary placement descriptors.

These should supplement the tree path, not replace it.

Recommended descriptor types:

- wall-relative zone descriptors
- in-front-of-zone descriptors

Examples of generalized patterns:

- `First zone on the north wall`
- `Second zone on the east wall`
- `In front of the shelf zone`

Multiple descriptors for one location are acceptable if they are not contradictory.

Good use:

- the same zone described from more than one wall-relative frame
- a wall-relative descriptor plus a non-wall-relative relation

Avoid:

- contradictory ordinal descriptors for the same wall
- overlapping free-form descriptions that obscure rather than clarify placement

## Placement Convention

When wall-relative descriptors are used, the app should follow a clear positional convention.

Recommended:

- columns run left to right
- ordinal zones are counted consistently along the wall
- the convention should be documented and reused instead of improvised per room

## AI And Export Standard

The recommended AI pattern is export-first.

Prefer:

- structured JSON export
- external AI analysis
- optional downstream automation

Avoid coupling the core data model too tightly to a specific AI provider or in-app model workflow.

## General Principle

The goal is not to force every entry into a perfect cataloging taxonomy.

The goal is to:

- reduce avoidable duplication
- improve retrieval
- improve search
- improve household handoff clarity
- improve export quality
- stay practical enough that real cataloging continues
