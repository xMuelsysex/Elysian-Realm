# Map Visual Style Open Source Research

## Goal

Research open-source projects and implementation approaches for improving the current realm map into either a pixel-art map or a Blue Archive dorm-like isometric room/map style.

## User Intent

- Improve the current map area visually.
- Explore pixel-art and Blue Archive dorm-like visual directions.
- First look for comparable open-source projects before implementation.

## Constraints

- This task is research-only unless explicitly continued into implementation.
- Preserve existing backend-owned `RealmMapViewModel` data flow and accessible text fallback.
- Avoid copying copyrighted Blue Archive assets or proprietary game resources.
- Prefer approaches compatible with the existing React + PixiJS v8 center-stage boundary.
- Keep rollback path to the current `RealmPixiStage` implementation.

## Acceptance Criteria

- [x] Identify relevant open-source references for pixel-art, isometric tilemaps, room/dorm rendering, and Blue Archive-adjacent UI/animation references.
- [x] Compare references by reuse value, license/IP risk, stack compatibility, and implementation complexity.
- [x] Recommend a practical first implementation direction for this project.
- [x] Record findings under `research/` for future implementation planning.
