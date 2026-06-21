# High-Fidelity Dorm Archive Prototype Notes

## Accepted Preview

- File: `high-fidelity-dorm-archive-prototype.html`
- Screenshot: `high-fidelity-dorm-archive-prototype.png`
- Review result: accepted after removing confusing center geometry and duplicate text layers.

## Visual Direction

Use an original soft academy dorm/archive map:

- Pastel blue-white room shell.
- Thick isometric floor slab for 2.5D depth.
- Simple wall planes with soft vertical panels.
- Single-layer Chinese location labels.
- Character markers stand on the grid with soft ground shadows.
- Colored floor hotspots indicate semantic zones.

## Avoided Patterns

- Do not place abstract 3D box furniture in the center of the map.
- Do not stack English zone labels under Chinese location labels.
- Do not rely on many polygon shapes as pseudo-furniture.
- Do not let decorative props compete with map readability.

## Implementation Implication

For a real Pixi/Tiled implementation, start with a readable tile room and semantic hotspots before adding furniture. If furniture is added, use recognizable assets or simple wall-edge objects only, and keep the center activity zone clear.
