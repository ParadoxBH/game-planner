# Game Planner - Project Standards

This document defines architectural and design standards to ensure consistency.

## 🎨 Design System
- **Theme**: Dark mode by default (`#0b0b0b` / `#0d0d0d`). Centralized in `src/theme/theme.ts`.
- **Accent Color**: Orange (`#ff4400`). Use `primary.main` from theme.
- **Typography**: Clean, sans-serif (Inter/Roboto). 
  - Titles: `h4`, `h6`.
  - Subtitles/Labels: `subtitle2` (Uppercase, 700 weight).
  - Values/Captions: `body2` or `caption`.
- **Spacing (Design Tokens)**:
  - `sectionGap`: Large spacing between major blocks (3 units).
  - `itemGap`: Spacing between items in a list (1.5 units).
  - `fieldGap`: Small spacing between a label and its value (0.5 units).
- **Glassmorphism**: `backdropFilter: "blur(16px)"`, `backgroundColor: "rgba(11, 11, 11, 0.8)"`.
- **Borders**: Standardized via MUI `Divider` and `Paper` overrides. Use `border: 1` and `borderColor: "divider"`.

## 🛠️ Styling Rules
1. **No Hardcoded `sx`**: Avoid writing ad-hoc colors, spacing, or borders in `sx` props.
2. **No All-Caps**: Never use `textTransform: "uppercase"`. Prefer normal sentence case or title case.
3. **Use Theme Tokens**: Access tokens via `theme.designTokens` (requires `useTheme` hook).
4. **Boxed Info (OutputField, DataCard & DataChip)**: Use standardized components for information display:
   - `<DataCard />`: Generic clickable/static container with project borders/background.
   - `<OutputField />`: Labeled information using `DataCard` for values.
   - `<DataChip />`: Small labels for counts/quantities (e.g., `x5`).
   - Standardized prefixes: "X:" and "Y:" for coordinates.
5. **MUI Components**: Prefer MUI components (`Paper`, `Stack`, `Box`, `Typography`) over raw HTML to benefit from theme-based styling.
6. **Prefer Stack over Box**: Avoid using `<Box />` just to wrap multiple `<Typography />` or other layout elements. Prioritize `<Stack />` for vertical or horizontal grouping to maintain consistent alignment and spacing.
7. **Consistency First**: If a new recurring style is needed, add it to `theme.ts` as a token or component override before using it.
8. **Page Structure (StyledContainer)**: ALWAYS use `<StyledContainer />` as the root component for any new Page. It should be the primary building block for page layouts.
9. **Custom Components**: Proactively create new custom components for any UI pattern that can be reused across the application. Avoid duplicating complex JSX logic.
10. **No Build or Verification Commands**: Do NOT run `npm run build`, automated verification commands, or use the browser tool to verify functionality. The user handles the live application and validation.

## 📂 Data Structure
Data in `public/data/[game-id]/`:
- `entity.json`: High-level information about game entities.
- `items.json`: Detailed information about items (including `icon` paths).
- `spawns.json`: Precise coordinates for the map.
- `games.json`: Metadata for games and maps.

## 🗺️ Map Implementation
- **Custom Markers**: Use `L.divIcon` for rendered entity icons (32x32) on the map.
- **Custom CRS**: Map game units to pixels based on the game's actual coordinate system.
- **Popups**: `SimplifiedEntity` for a standardized look with icons and coordinates.

## 🧭 Navigation
- **Stack-based**: Use `EntityDrawer` with `onPush`/`onPop` for a multi-level drill-down.
