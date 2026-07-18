# Dialogue Font Crispness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Unity dialogue text render crisply in the dorm-game scene instead of being softened by runtime font replacement, non-integer Canvas scaling, and untuned fallback SDF materials.

**Architecture:** Treat the dialogue font as one explicit serialized dependency on `DialogueUI`, not a runtime `Resources.Load` fallback. Keep UI text in screen pixels with a constant-pixel Canvas for the current 3D prototype, and tune every TMP font asset that can render dialogue glyphs so fallback characters do not look softer than primary glyphs.

**Tech Stack:** Unity 2022.3.62f3, TextMeshPro 3.0.6, Unity UI Canvas, NUnit EditMode tests, PowerShell verification commands.

---

## File Structure

- Modify `unity/dorm-game/Assets/_Project/Scripts/Dialogue/DialogueUI.cs`
  - Responsibility: owns dialogue panel state and applies the configured dialogue font to generated dialogue/choice text.
- Modify `unity/dorm-game/Assets/_Project/Scenes/TestMovement.unity`
  - Responsibility: stores the prototype scene's `DialogueCanvas`, `DialogueUI`, and TMP text component configuration.
- Modify `unity/dorm-game/Assets/_Project/Fonts/simhei SDF HQ.asset`
  - Responsibility: primary static TMP font asset for dialogue text.
- Modify `unity/dorm-game/Assets/_Project/Fonts/simhei SDF Dynamic.asset`
  - Responsibility: fallback dynamic TMP font asset for glyphs not present in the static atlas.
- Modify `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`
  - Responsibility: guards dialogue font consistency, Canvas scaling mode, and SDF material sharpness.

## Root Cause Notes

- `DialogueText`, `NextButton`, and `ChoiceButton.prefab` are assigned `simhei SDF HQ.asset` in serialized scene/prefab data.
- `DialogueUI.Show()` currently overrides that assignment at runtime by loading `Resources.Load<TMP_FontAsset>("Fonts/SimHei SDF Dynamic")` when the font name is not `"SimHei SDF Dynamic"` or `"SimHei Dialogue Static"`.
- The previous HQ material sharpness change therefore does not affect the main dialogue line during runtime, because `Show()` swaps the HQ font out.
- `DialogueCanvas` still uses `Scale With Screen Size`, so any Game view width that is not an exact multiple of the reference width can produce fractional UI scaling and softer text in the editor preview.

---

### Task 1: Add a Regression Test for Runtime Font Replacement

**Files:**
- Modify: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`
- Test: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`

- [ ] **Step 1: Add the failing test**

Append this test method inside `DialogueUiReadabilityTests`, below `DialogueFont_UsesHighResolutionAtlasAndCrispSdfMaterial()` and above `FindDialogueText()`:

```csharp
[Test]
public void DialogueUI_DoesNotReplaceConfiguredFontOnShow()
{
    EditorSceneManager.OpenScene(TestScenePath);

    var expectedFont = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(DialogueFontPath);
    var dialogueText = FindDialogueText();
    var dialogueUI = UnityEngine.Object.FindObjectOfType<DormGame.Dialogue.DialogueUI>(true);
    var character = ScriptableObject.CreateInstance<DormGame.Data.CharacterDefinition>();
    character.displayName = "测试角色";

    try
    {
        dialogueText.font = expectedFont;

        dialogueUI.Show(
            new DormGame.Dialogue.DialogueNode
            {
                nodeId = "font-test",
                textKey = "你好！我是测试角色，欢迎来到宿舍。",
                choices = new DormGame.Dialogue.DialogueChoice[0]
            },
            character);

        Assert.That(dialogueText.font, Is.SameAs(expectedFont));
    }
    finally
    {
        UnityEngine.Object.DestroyImmediate(character);
    }
}
```

- [ ] **Step 2: Run the test and verify it fails**

Run from the repository root after closing any open Unity instance for `unity/dorm-game`:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: the new test fails because `DialogueUI.Show()` changes `dialogueText.font` from `simhei SDF HQ` to `simhei SDF Dynamic`.

- [ ] **Step 3: Commit the failing test**

```bash
git add unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs
git commit -m "test: cover dialogue font replacement"
```

---

### Task 2: Remove the Hidden Font Fallback and Use an Explicit Serialized Font

**Files:**
- Modify: `unity/dorm-game/Assets/_Project/Scripts/Dialogue/DialogueUI.cs`
- Modify: `unity/dorm-game/Assets/_Project/Scenes/TestMovement.unity`
- Test: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`

- [ ] **Step 1: Add the serialized font field and helper**

In `DialogueUI.cs`, add this field below `choiceButtonPrefab`:

```csharp
[SerializeField] private TMP_FontAsset dialogueFont;
```

Add this helper method below `Awake()`:

```csharp
private void ApplyDialogueFont(TextMeshProUGUI text)
{
    if (text == null || dialogueFont == null)
    {
        return;
    }

    text.font = dialogueFont;
    text.enableWordWrapping = true;
    text.enableExtraPadding = true;
}
```

- [ ] **Step 2: Apply the explicit font during initialization**

In `Awake()`, add this line after the `nextButton.onClick.AddListener(OnNextButtonClicked);` block:

```csharp
ApplyDialogueFont(dialogueText);
```

- [ ] **Step 3: Delete the runtime font replacement block**

Remove this entire block from `Show()`:

```csharp
// 强制确保使用中文字体（运行时 workaround）
if (dialogueText != null && dialogueText.font != null)
{
    if (dialogueText.font.name != "SimHei SDF Dynamic" && dialogueText.font.name != "SimHei Dialogue Static")
    {
        var chineseFont = Resources.Load<TMPro.TMP_FontAsset>("Fonts/SimHei SDF Dynamic");
        if (chineseFont != null)
        {
            dialogueText.font = chineseFont;
            Debug.Log($"[DialogueUI] Font corrected to: {chineseFont.name}");
        }
    }
}
```

Replace it with:

```csharp
ApplyDialogueFont(dialogueText);
```

- [ ] **Step 4: Apply the font to generated choice buttons**

In `ShowChoices()`, replace this block:

```csharp
if (buttonText != null)
{
    buttonText.text = choice.choiceTextKey;
}
```

with:

```csharp
if (buttonText != null)
{
    ApplyDialogueFont(buttonText);
    buttonText.text = choice.choiceTextKey;
}
```

- [ ] **Step 5: Assign the HQ font in the scene**

In `TestMovement.unity`, locate the `DialogueUI` component block:

```yaml
choiceButtonPrefab: {fileID: 6759482811681797237, guid: f8023ee7a41016b4bb924d83750c0d78, type: 3}
typewriterSpeed: 0.05
```

Change it to:

```yaml
choiceButtonPrefab: {fileID: 6759482811681797237, guid: f8023ee7a41016b4bb924d83750c0d78, type: 3}
dialogueFont: {fileID: 11400000, guid: 90cae027eeed6b34e85c2dec07b55c4a, type: 2}
typewriterSpeed: 0.05
```

- [ ] **Step 6: Add a serialized-font assertion**

Append this test method inside `DialogueUiReadabilityTests`, below `DialogueUI_DoesNotReplaceConfiguredFontOnShow()`:

```csharp
[Test]
public void DialogueUI_HasExplicitHqFontAssigned()
{
    EditorSceneManager.OpenScene(TestScenePath);

    var expectedFont = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(DialogueFontPath);
    var dialogueUI = UnityEngine.Object.FindObjectOfType<DormGame.Dialogue.DialogueUI>(true);
    var serializedObject = new SerializedObject(dialogueUI);
    var dialogueFont = serializedObject.FindProperty("dialogueFont");

    Assert.That(dialogueFont.objectReferenceValue, Is.SameAs(expectedFont));
}
```

- [ ] **Step 7: Run the focused EditMode tests and verify they pass**

Run:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: `DialogueUI_DoesNotReplaceConfiguredFontOnShow` and `DialogueUI_HasExplicitHqFontAssigned` pass.

- [ ] **Step 8: Commit the runtime font fix**

```bash
git add unity/dorm-game/Assets/_Project/Scripts/Dialogue/DialogueUI.cs \
  unity/dorm-game/Assets/_Project/Scenes/TestMovement.unity \
  unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs
git commit -m "fix: keep dialogue on configured hq font"
```

---

### Task 3: Use Pixel-Stable Canvas Scaling for Dialogue UI

**Files:**
- Modify: `unity/dorm-game/Assets/_Project/Scenes/TestMovement.unity`
- Modify: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`
- Test: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`

- [ ] **Step 1: Update the Canvas readability test**

Replace the body of `DialogueCanvas_UsesReadablePreviewScale()` with:

```csharp
EditorSceneManager.OpenScene(TestScenePath);

var scaler = GameObject.Find("DialogueCanvas").GetComponent<CanvasScaler>();
var canvas = GameObject.Find("DialogueCanvas").GetComponent<Canvas>();
var dialogueText = FindDialogueText();
var nextButtonText = GameObject.Find("NextButton").GetComponentInChildren<TextMeshProUGUI>(true);

Assert.That(scaler.uiScaleMode, Is.EqualTo(CanvasScaler.ScaleMode.ConstantPixelSize));
Assert.That(scaler.scaleFactor, Is.EqualTo(1f));
Assert.That(canvas.pixelPerfect, Is.True);
Assert.That(dialogueText.fontSize, Is.GreaterThanOrEqualTo(40f));
Assert.That(nextButtonText.fontSize, Is.GreaterThanOrEqualTo(32f));
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: `DialogueCanvas_UsesReadablePreviewScale` fails because the scene still uses `CanvasScaler.ScaleMode.ScaleWithScreenSize` or `canvas.pixelPerfect == false`.

- [ ] **Step 3: Switch the Canvas to constant-pixel scaling**

In `TestMovement.unity`, locate the `CanvasScaler` component for `DialogueCanvas` and change:

```yaml
m_UiScaleMode: 1
m_ScaleFactor: 1
m_ReferenceResolution: {x: 1280, y: 720}
```

to:

```yaml
m_UiScaleMode: 0
m_ScaleFactor: 1
m_ReferenceResolution: {x: 1280, y: 720}
```

In the `Canvas` component for `DialogueCanvas`, change:

```yaml
m_PixelPerfect: 0
```

to:

```yaml
m_PixelPerfect: 1
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: `DialogueCanvas_UsesReadablePreviewScale` passes.

- [ ] **Step 5: Commit the Canvas scaling change**

```bash
git add unity/dorm-game/Assets/_Project/Scenes/TestMovement.unity \
  unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs
git commit -m "fix: render dialogue ui at stable pixel scale"
```

---

### Task 4: Tune Primary and Fallback SDF Materials Consistently

**Files:**
- Modify: `unity/dorm-game/Assets/_Project/Fonts/simhei SDF HQ.asset`
- Modify: `unity/dorm-game/Assets/_Project/Fonts/simhei SDF Dynamic.asset`
- Modify: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`
- Test: `unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs`

- [ ] **Step 1: Extend the SDF material test to cover fallback assets**

Replace the `DialogueFont_UsesHighResolutionAtlasAndCrispSdfMaterial()` test with:

```csharp
[Test]
public void DialogueFonts_UseHighResolutionAtlasesAndCrispSdfMaterials()
{
    AssertCrispDialogueFont("Assets/_Project/Fonts/simhei SDF HQ.asset");
    AssertCrispDialogueFont("Assets/_Project/Fonts/simhei SDF Dynamic.asset");
}
```

Add this helper method above `FindDialogueText()`:

```csharp
private static void AssertCrispDialogueFont(string assetPath)
{
    var fontAsset = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetPath);

    Assert.That(fontAsset, Is.Not.Null, assetPath);
    Assert.That(fontAsset.atlasWidth, Is.GreaterThanOrEqualTo(2048), assetPath);
    Assert.That(fontAsset.atlasHeight, Is.GreaterThanOrEqualTo(2048), assetPath);
    Assert.That(fontAsset.material.GetFloat("_Sharpness"), Is.GreaterThanOrEqualTo(0.35f), assetPath);
    Assert.That(fontAsset.material.GetFloat("_WeightNormal"), Is.GreaterThanOrEqualTo(0.1f), assetPath);
    Assert.That(fontAsset.material.GetFloat("_FaceDilate"), Is.GreaterThanOrEqualTo(0.03f), assetPath);
}
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: the test fails because `simhei SDF Dynamic.asset` has `_Sharpness: 0`, and `simhei SDF HQ.asset` does not meet the new `_Sharpness`, `_WeightNormal`, or `_FaceDilate` thresholds.

- [ ] **Step 3: Tune both font materials**

In both `simhei SDF HQ.asset` and `simhei SDF Dynamic.asset`, update the material float entries:

```yaml
- _FaceDilate: 0.03
```

```yaml
- _Sharpness: 0.35
```

```yaml
- _WeightNormal: 0.1
```

Do not change `_GradientScale: 10`, `_OutlineWidth: 0`, or `_OutlineSoftness: 0`.

- [ ] **Step 4: Run tests and verify they pass**

Run:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: `DialogueFonts_UseHighResolutionAtlasesAndCrispSdfMaterials` passes for both font assets.

- [ ] **Step 5: Commit the material tuning**

```bash
git add unity/dorm-game/Assets/_Project/Fonts/simhei\ SDF\ HQ.asset \
  unity/dorm-game/Assets/_Project/Fonts/simhei\ SDF\ Dynamic.asset \
  unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs
git commit -m "fix: tune dialogue sdf font materials"
```

---

### Task 5: Verify in Editor Preview and a Standalone Build

**Files:**
- No source file changes
- Test output: `unity/dorm-game/TestResults-EditMode.xml`
- QA output: `outputs/dialogue-font-crispness-1280x720.png`

- [ ] **Step 1: Run all EditMode tests**

Run:

```powershell
& "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" `
  -batchmode `
  -projectPath "D:/github/Elysian-Realm/unity/dorm-game" `
  -runTests `
  -testPlatform EditMode `
  -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" `
  -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" `
  -quit
```

Expected: `TestResults-EditMode.xml` reports `failures="0"` and `errors="0"`.

- [ ] **Step 2: Build the Unity C# projects**

Run:

```powershell
dotnet build "unity/dorm-game/Assembly-CSharp.csproj" --no-restore
dotnet build "unity/dorm-game/Assembly-CSharp-Editor.csproj" --no-restore
```

Expected: both commands print `0 个警告` and `0 个错误`.

- [ ] **Step 3: Capture editor visual QA**

In Unity:

```text
1. Open D:/github/Elysian-Realm/unity/dorm-game.
2. Open Assets/_Project/Scenes/TestMovement.unity.
3. Set the Game view resolution to 1280x720.
4. Set the Game view Scale dropdown to 1x.
5. Enter Play Mode.
6. Walk to the test NPC and open the dialogue.
7. Save a screenshot to outputs/dialogue-font-crispness-1280x720.png.
```

Expected: the dialogue line and `继续` button have sharp white edges at 1x scale. If the Game view Scale dropdown is not 1x, the screenshot is invalid for font clarity review because the editor preview is resampling the final framebuffer.

- [ ] **Step 4: Verify that the screenshot is not editor-resampled**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile("D:/github/Elysian-Realm/outputs/dialogue-font-crispness-1280x720.png")
Write-Output "$($image.Width)x$($image.Height)"
$image.Dispose()
```

Expected:

```text
1280x720
```

- [ ] **Step 5: Commit verification updates if test files changed during this task**

If only `TestResults-EditMode.xml` or screenshots changed, do not commit them unless the repository already tracks those files. If source or test files changed during this task, run:

```bash
git add unity/dorm-game/Assets/Tests/EditMode/DialogueUiReadabilityTests.cs
git commit -m "test: verify dialogue font crispness"
```

---

## Self-Review

- Spec coverage: The plan covers the observed blur after the first fix by addressing runtime font replacement, Canvas fractional scaling, primary/fallback SDF material softness, and editor screenshot resampling.
- Placeholder scan: The plan contains exact files, code blocks, commands, expected failures, expected passes, and commit commands.
- Type consistency: Test methods use `TMP_FontAsset`, `TextMeshProUGUI`, `CanvasScaler`, `Canvas`, `SerializedObject`, and the existing `DormGame.Dialogue` / `DormGame.Data` types consistently.

