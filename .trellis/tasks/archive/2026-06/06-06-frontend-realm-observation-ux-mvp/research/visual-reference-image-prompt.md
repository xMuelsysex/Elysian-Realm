# Visual Reference Image Prompt

## Purpose

Generate a visual reference image for the Frontend Realm Observation UX MVP after implementation, focused on product/UI direction rather than a production asset.

## Intended output

- File name: `.image-gen/realm-observation-dashboard-reference.png`
- Format: square 1024x1024 UI concept image
- Use: visual reference for map atmosphere, replay controls, character dossier hierarchy, and structured LLM proposal review.

## Prompt

```text
Dark futuristic dashboard UI mockup with realm map, agent chips, character dossier, replay timeline controls, and LLM review form. Purple teal glass cards, clean layout, safe for work.
```

## Expanded prompt if the generator is stable

```text
Square UI concept mockup for a React admin dashboard called Elysian Realm Observation. Dark cozy futuristic interface, not photorealistic. Main panel: atmospheric realm map with glowing location clusters, small character agent chips, activity speech bubbles. Right panel: character dossier card with current action, location, relationships, provenance badges. Bottom panel: replay timeline controls with play pause button, step buttons, speed selector, progress bar, event cards. Another compact panel: structured LLM proposal review form with safe apply button and advanced JSON collapsed. Clean product UI, readable hierarchy, soft purple and teal accents, glass cards, professional SaaS dashboard layout, no real brand logos, no tiny illegible text, safe for work.
```

## Current attempt log

- `image_gen` status reported configured: yes, model: `gpt-image-2`, output: `.image-gen`.
- The previous smoke test produced `.image-gen/image-gen-smoke-test.png` successfully.
- Repeated attempts for the realm dashboard reference returned `fetch failed`, including shortened and URL-response prompts.
- No production code was changed by these attempts.
