# Game Planner - Project Standards

This document defines architectural and design standards to ensure consistency.

## 🎨 Design System
- **Theme**: Dark mode by default (`#0b0b0b` / `#0d0d0d`).
- **Accent Color**: Orange (`#ff4400`).
- **Typography**: Clean, sans-serif (Inter/Roboto). Monospace for IDs and coordinates.
- **Glassmorphism**: `backdropFilter: "blur(16px)"`, `backgroundColor: "rgba(11, 11, 11, 0.8)"`.

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
