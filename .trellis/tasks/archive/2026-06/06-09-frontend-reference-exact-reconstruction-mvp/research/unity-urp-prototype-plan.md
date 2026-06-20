# Unity URP Center-Stage Prototype Plan

## Purpose

Build a standalone Unity URP prototype for the observatory center stage before any WebGL or React integration work. The prototype is a visual validation artifact: it proves whether Unity can recreate the reference image's floating-island command-center scene closely enough to justify embedding or desktop integration later.

This plan does not authorize creating the Unity project yet. It defines the minimum scope, directory shape, scene contract, and review gates to confirm before implementation.

## Scope Decision

Selected path:

- Standalone Unity URP prototype first.
- No Unity WebGL embed in the React app during the first prototype pass.
- React remains the owner of admin API, typed view models, side rails, command forms, textual diagnostics, and accessibility surfaces.
- Unity owns only the visual center-stage composition candidate.

Out of scope for the first Unity pass:

- No backend simulation changes.
- No direct Unity API calls to the backend.
- No replacement of React dashboard rails/forms/debug panels.
- No production WebGL build committed until the prototype passes visual review.
- No large asset-store dependency without explicit approval.
- No external asset imports in the first pass; use Unity primitives, URP materials, particle systems, and simple procedural shapes only.

## Proposed Repository Layout

Use a clearly isolated module so the Unity work can be reviewed, ignored, or removed without touching the React app:

```text
unity/
  observatory-stage/
    README.md
    ProjectSettings/
    Packages/
    Assets/
      Scenes/
        ObservatoryStagePrototype.unity
      Scripts/
        StageData/
          StageSnapshot.cs
          StageLocation.cs
          StageAgentMarker.cs
          StageLink.cs
        Rendering/
          StageBootstrap.cs
          IslandController.cs
          BridgeController.cs
          BeaconController.cs
          CameraRigController.cs
        Editor/
          CaptureObservatoryStageScreenshot.cs
      Materials/
        EmissiveBridge.mat
        IslandGround.mat
        BeaconCore.mat
        StarDome.mat
      Prefabs/
        FloatingIsland.prefab
        BridgeArc.prefab
        AgentBeacon.prefab
        WaterfallRibbon.prefab
      Art/
        README.md
      QA/
        stage-snapshot.example.json
        screenshots/
```

Notes:

- Keep Unity-generated folders isolated under `unity/observatory-stage/`.
- Do not mix Unity assets under `src/app/`.
- Commit only lightweight Unity source/config artifacts: `Assets/Scenes`, `Assets/Scripts`, `Assets/Materials`, `Assets/Prefabs`, `Assets/QA/stage-snapshot.example.json`, `Packages`, `ProjectSettings`, and required `.meta` files.
- Do not commit Unity `Library/`, `Temp/`, `Obj/`, `Logs/`, `Build/`, `Builds/`, WebGL outputs, large texture/model packs, or generated IDE solution/project files.

## Scene Composition

Target visual composition: a square `1024 × 1024` stage matching the reference coordinate system.

Visual priority decision:

- Prioritize center-stage silhouette and lighting over complete UI chrome.
- First-pass visual quality depends on five-island composition, central dome, golden bridge network, colored beacons, waterfall/energy streams, star dome, particles, and Bloom.
- Unity HUD/frame elements should remain light decorative context only, because the production top bar, side rails, textual diagnostics, command forms, and replay timeline stay React DOM-owned.

Generation decision:

- Generate the main scene structure with C# scripts rather than hand-placing every object.
- `StageBootstrap` should create or position the core islands, bridges, beacons, waterfalls, and star dome from a small stage definition.
- Manual scene work is limited to camera framing, lighting/post-processing, material tuning, and optional prefab authoring.
- This keeps the prototype aligned with future `StageSnapshot` data-driven layout instead of becoming a one-off hand-built scene.

Unity scene layers:

1. **Star Dome**
   - Large inverted sphere or skybox material.
   - Starfield texture/procedural particles.
   - Subtle nebula gradients.

2. **Camera Rig**
   - Orthographic or low-FOV perspective camera.
   - Fixed isometric/front-facing composition matching the reference.
   - Output intended for square screenshots first.

3. **Floating Islands**
   - Central large island plus 4 surrounding islands.
   - Meshes may start as primitive cylinders/rocks with sculpted top discs.
   - Forest/foliage clusters can be simple billboards or mesh instances.
   - Golden central observatory/dome can start as primitives.

4. **Bridge Network**
   - Curved emissive bridge arcs between islands.
   - Use line renderers, spline mesh, or beveled curves.
   - Gold/blue emissive material with Bloom.

5. **Agent Beacons**
   - Circular vertical markers above islands.
   - Colored ring, icon placeholder, downward light beam.
   - Marker positions derived from stage coordinates.

6. **Waterfalls / Energy Streams**
   - Ribbon meshes or particle systems falling from island edges.
   - Blue emissive transparent material.
   - Lightweight looping animation.

7. **HUD Frame**
   - Minimal top/bottom ornamental frame in Unity only for the prototype screenshot.
   - Final React integration may keep HUD rails in DOM instead.

## Data Contract Draft

The first prototype should already load a local display-only JSON fixture derived from the future `RealmMapViewModel` shape. It does not connect to React or the backend yet, but it proves the scene can be data-driven from the beginning.

Draft JSON shape:

```json
{
  "stageSize": 1024,
  "locations": [
    {
      "id": "garden",
      "label": "Garden",
      "x": 300,
      "y": 680,
      "theme": "green",
      "occupancyLabel": "2 agents",
      "recentActivityLabel": "Gathering"
    }
  ],
  "links": [
    {
      "sourceId": "garden",
      "targetId": "hub",
      "activity": 0.64
    }
  ],
  "agents": [
    {
      "id": "elysia",
      "label": "Elysia",
      "locationId": "garden",
      "status": "active",
      "color": "cyan",
      "selected": true
    }
  ],
  "pulses": [
    {
      "id": "evt-1",
      "locationId": "garden",
      "source": "agent",
      "strength": 0.8
    }
  ]
}
```

Rules:

- First-pass fixture path: `Assets/QA/stage-snapshot.example.json`.
- Coordinates are stage-space values in the `1024 × 1024` reference system.
- Unity treats the snapshot as read-only display data.
- Unity may emit selection events later, but the React app owns selection state and backend commands.
- No simulation facts are computed inside Unity.
- Hardcoded fallback positions are allowed only as editor/debug defaults when the fixture is missing; they must not replace the fixture-driven path.

## Screenshot Capture

Decision: include a Unity Editor screenshot capture script in the first prototype pass.

Planned script:

```text
Assets/Scripts/Editor/CaptureObservatoryStageScreenshot.cs
```

Minimum behavior:

- Add an Editor menu item, for example `Elysian Realm/Capture Observatory Stage`.
- Open or use `Assets/Scenes/ObservatoryStagePrototype.unity`.
- Render the stage camera at `1024 × 1024`.
- Save a PNG under `Assets/QA/screenshots/` or a reviewed task research output path.
- Avoid Play Mode-only assumptions if an edit-mode render is practical.
- Do not write build artifacts or mutate simulation data.

Preferred output naming:

```text
Assets/QA/screenshots/observatory-stage-prototype-YYYYMMDD-HHMMSS.png
```

For Trellis QA, copy or export the reviewed final screenshot to:

```text
.trellis/tasks/06-09-frontend-reference-exact-reconstruction-mvp/research/unity-observatory-stage-final.png
```

## C# API Design

Script responsibilities, planned class APIs, fixture shape, controller boundaries, and implementation order are specified in:

```text
research/unity-csharp-api-design.md
```

Implementation should follow that design before adding Unity C# files.

## Prototype Milestones

### Milestone A: Static Data-Driven Composition

Deliverables:

- Unity project/module layout confirmed.
- `Assets/QA/stage-snapshot.example.json` fixture added.
- `StageSnapshot` C# DTOs added.
- `StageBootstrap` generates or positions the main scene structure from the fixture.
- One scene with camera, star dome, five floating islands, and bridges.
- One screenshot matching the reference composition at square output.

Review question:

- Does the scene silhouette match the reference strongly enough to continue?

### Milestone B: Visual Effects

Deliverables:

- Bloom/post-processing enabled.
- Emissive bridge material.
- Beacon rings and light beams.
- Waterfall/energy stream particles.
- Ambient particles/stars.

Review question:

- Does the prototype now outperform the PixiJS/canvas mock visibly?

### Milestone C: Interaction And Bridge Stub

Deliverables:

- Selected location/agent IDs can be highlighted from fixture data.
- Unity can emit a local debug selection event or log entry without calling the backend.
- The data contract is documented against the future React view-model bridge.

Review question:

- Is the bridge from React view models to Unity clear enough for future WebGL/desktop integration?

### Milestone D: QA Capture

Deliverables:

- Unity Editor screenshot capture script added.
- Screenshot saved under `Assets/QA/screenshots/` and final reviewed copy saved under the task research directory.
- Notes comparing Unity prototype against the reference and previous CSS/Pixi previews.
- Decision record: proceed to WebGL embed, desktop shell, or fallback.

## Acceptance Criteria For Prototype Approval

- The center-stage screenshot reads as a cinematic floating-island observatory, not a flat dashboard mock.
- The screenshot clearly outperforms `.trellis/tasks/06-09-frontend-reference-exact-reconstruction-mvp/research/previews/pixi-runtime-prototype.png` in depth, lighting, silhouette, and reference similarity.
- The scene includes five clearly readable floating islands, a central dome/hub, glowing gold bridges, colored agent beacons with rings and vertical light beams, star dome, particles, and waterfalls/energy streams.
- The composition aligns with the `1024 × 1024` reference coordinate system.
- The prototype can be driven by a small display-only `StageSnapshot` fixture.
- React/admin ownership boundaries remain unchanged in the plan.
- Generated build caches and heavy artifacts are excluded from git unless explicitly approved.
- If these criteria are not met, do not proceed to Unity WebGL/React integration; iterate the Unity scene or fallback to another strategy.

## Risks And Mitigations

- **Unity project size**: isolate under `unity/observatory-stage/` and ignore generated/cache folders.
- **Asset quality gap**: start with primitives to prove composition, then add custom/simple generated assets only after review.
- **Asset licensing**: committed visual assets must be original project-created assets or explicitly licensed for redistribution; do not commit extracted/datamined/proprietary assets or web-sourced files without clear compatible terms.
- **WebGL complexity**: defer embedding until visual validation passes.
- **Data drift**: use `StageSnapshot` as the single future bridge from React view models to Unity.
- **Accessibility gap**: React keeps mirrored DOM controls and textual provenance; Unity remains visual-only for the first pass.

## Environment Check

Current WSL environment findings before project generation:

- No `unity`, `Unity`, `unityhub`, or `UnityHub` command was found on `PATH`.
- No obvious Unity install directory was found under `/opt`, `/Applications`, `$HOME/Unity*`, or `$HOME/.local/share/Unity*`.
- Root `.gitignore` currently ignores Node/dist/env files only; it does not yet contain Unity cache/build exclusions.

Decision: use Windows host Unity Hub to create/open the Unity project. WSL remains responsible for repository planning, ignore rules, task docs, React/frontend code, and validation commands.

## Open Decisions Before Creating Files

1. Confirm the Unity version and URP template available on the machine that will open the project.
2. Confirmed path: Unity files live in `unity/observatory-stage/`.
3. Confirmed commit scope: commit lightweight prototype source/config/scene/material/prefab/fixture files plus required `.meta`; exclude cache, generated IDE files, builds, WebGL outputs, and large asset packs.
4. Confirmed screenshot strategy: add a Unity Editor capture script from the first prototype pass for repeatable `1024 × 1024` PNG output.
5. Confirmed asset strategy: first pass uses primitives/procedural materials/particles only; external assets are deferred to a later review gate.
6. Confirmed: add scoped Unity `.gitignore` rules before generating any Unity files.
