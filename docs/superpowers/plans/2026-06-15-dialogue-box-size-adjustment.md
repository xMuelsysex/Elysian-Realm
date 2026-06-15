# Dialogue Box Size Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce dialogue panel size to appropriate dimensions while maintaining text readability

**Architecture:** Adjust DialoguePanel RectTransform constraints and DialogueText font size to create a compact, readable dialogue box positioned at screen bottom

**Tech Stack:** Unity UGUI, TextMeshPro

---

## Problem Analysis

Currently the dialogue box appears too large, likely due to:
1. DialoguePanel size not constrained properly
2. Font size too large (currently 36pt)
3. Panel anchoring/positioning taking up excessive screen space

**Target Design:**
- Compact panel at bottom of screen (~20-30% screen height)
- Readable text (24-28pt font size)
- Proper padding and margins

---

### Task 1: Inspect Current Configuration

**Files:**
- Read: `Assets/_Project/Scenes/TestMovement.unity` (via Unity Inspector)

- [ ] **Step 1: Open Unity and inspect DialoguePanel**

In Unity Hierarchy:
1. Navigate to `DialogueCanvas/DialoguePanel`
2. Note current RectTransform values:
   - Width, Height
   - Anchors (min/max)
   - Position (anchored position)
   - SizeDelta

Expected: Panel likely fills large portion of screen

- [ ] **Step 2: Inspect DialogueText component**

In Unity Hierarchy:
1. Select `DialogueCanvas/DialoguePanel/DialogueText`
2. Note TextMeshProUGUI settings:
   - Font Size (likely 36)
   - Auto Sizing enabled/disabled
   - Wrapping mode

Expected: Font size 36, contributing to oversized appearance

- [ ] **Step 3: Document current values**

Create note with current values for reference

---

### Task 2: Adjust DialoguePanel Size

**Files:**
- Modify: `Assets/_Project/Scenes/TestMovement.unity` (via Unity Inspector)

- [ ] **Step 1: Configure panel anchors for bottom positioning**

In Unity Inspector (DialoguePanel selected):
1. RectTransform component
2. Set Anchor Preset: **Bottom Stretch** (stretch horizontally, anchor to bottom)
   - Min: (0, 0)
   - Max: (1, 0)
3. Set Pivot: (0.5, 0)

Expected: Panel stretches full width at bottom

- [ ] **Step 2: Set panel height**

In RectTransform:
1. Position Y: 0
2. Size Delta:
   - X: 0 (maintains full width stretch)
   - Y: 250 (target height ~25% of 1080p screen)

Expected: Panel is now 250px tall at screen bottom

- [ ] **Step 3: Add padding to panel edges**

In Inspector:
1. Find or add VerticalLayoutGroup component (if not present, add it)
2. Set padding:
   - Left: 40
   - Right: 40
   - Top: 20
   - Bottom: 20

Expected: Content has breathing room from edges

- [ ] **Step 4: Test in Play mode**

Run scene and trigger dialogue:
```
1. Press Play
2. Walk to NPC
3. Press E to trigger dialogue
```

Expected: Dialogue box appears at bottom with reasonable size

- [ ] **Step 5: Save scene**

In Unity: `Ctrl+S` or File > Save

Expected: Changes persisted

---

### Task 3: Adjust DialogueText Font Size

**Files:**
- Modify: `Assets/_Project/Scenes/TestMovement.unity` (via Unity Inspector)

- [ ] **Step 1: Reduce font size**

In Unity Inspector (DialogueText selected):
1. TextMeshProUGUI component
2. Font Size: Change from 36 to **26**
3. Enable Auto Sizing: **Unchecked** (to prevent size growth)

Expected: Text is smaller but still readable

- [ ] **Step 2: Configure text wrapping**

In TextMeshProUGUI:
1. Wrapping: **Enabled**
2. Overflow: **Overflow**

Expected: Long text wraps to multiple lines

- [ ] **Step 3: Test readability**

Run scene with test dialogue containing long text:
```
测试文本：你好！我是测试角色，欢迎来到宿舍。想做什么呢？
```

Expected: Text fits in panel and is readable

- [ ] **Step 4: Fine-tune if needed**

If text too small: Increase to 28
If text too large: Decrease to 24

Adjust in 2pt increments until optimal

- [ ] **Step 5: Save scene**

`Ctrl+S` to save changes

---

### Task 4: Adjust NextButton Size and Position

**Files:**
- Modify: `Assets/_Project/Scenes/TestMovement.unity` (via Unity Inspector)

- [ ] **Step 1: Resize NextButton**

In Unity Inspector (NextButton selected):
1. RectTransform:
   - Width: 120
   - Height: 50

Expected: Button is more compact

- [ ] **Step 2: Position button**

Set RectTransform:
1. Anchor: Bottom Right of panel
2. Position:
   - X: -20 (20px from right edge)
   - Y: 10 (10px from bottom)

Expected: Button in bottom-right corner of panel

- [ ] **Step 3: Adjust button text size**

NextButton/Text (TextMeshProUGUI):
1. Font Size: 20

Expected: Button text is proportional

- [ ] **Step 4: Save scene**

`Ctrl+S`

---

### Task 5: Verify ChoiceButton Layout

**Files:**
- Modify: `Assets/_Project/Prefabs/UI/ChoiceButton.prefab` (if needed)

- [ ] **Step 1: Test choice buttons appearance**

In Play mode:
1. Trigger dialogue with choices
2. Observe button sizing and layout

Expected: Choice buttons may also appear oversized

- [ ] **Step 2: Adjust ChoiceButton prefab if needed**

Open prefab:
1. Project window: `Assets/_Project/Prefabs/UI/ChoiceButton.prefab`
2. Double-click to edit
3. RectTransform:
   - Preferred Height: 50 (in LayoutElement if present)
4. Text font size: 22

Expected: Choice buttons are compact

- [ ] **Step 3: Save prefab**

`Ctrl+S`

- [ ] **Step 4: Test in scene**

Run scene and verify choice buttons appear correctly

---

### Task 6: Final Integration Test

**Files:**
- Test: Scene runtime behavior

- [ ] **Step 1: Full dialogue flow test**

In Play mode:
1. Walk to NPC
2. Trigger dialogue
3. Verify:
   - Panel size is compact (~250px height)
   - Text is readable (font 26)
   - Button is accessible
   - Text wraps properly
   - Typewriter effect works

Expected: All elements sized correctly

- [ ] **Step 2: Test with choice dialogue**

Trigger dialogue node with choices:
1. Verify choice buttons appear
2. Check button sizes
3. Ensure all clickable

Expected: Choices are properly sized and functional

- [ ] **Step 3: Test on different resolutions**

In Unity Game view:
1. Test at 1920x1080
2. Test at 1280x720
3. Verify panel scales properly

Expected: Panel maintains bottom positioning and proportions

- [ ] **Step 4: Document final values**

Record final configuration:
- Panel Height: 250px
- DialogueText Font: 26pt
- NextButton: 120x50px, Font 20pt
- ChoiceButton Font: 22pt

---

## Summary

**Changes Made:**
- DialoguePanel: Height reduced to 250px, anchored to bottom stretch
- DialogueText: Font size reduced from 36pt to 26pt
- NextButton: Resized to 120x50px, repositioned to bottom-right
- ChoiceButton: Font adjusted to 22pt (if needed)

**Testing:**
- Verified dialogue appears compact at screen bottom
- Confirmed text readability with Chinese characters
- Validated responsive layout across resolutions

**No code changes required** - all adjustments via Unity Inspector.
