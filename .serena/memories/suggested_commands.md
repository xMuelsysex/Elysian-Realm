# Suggested Commands

- Check Trellis package/spec context: `python ./.trellis/scripts/get_context.py --mode packages`.
- Search files/text on Windows PowerShell: prefer `rg --files` and `rg "pattern" "path"` from repo root.
- Unity EditMode tests for dorm game:
  ```powershell
  & "C:/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" -batchmode -projectPath "D:/github/Elysian-Realm/unity/dorm-game" -runTests -testPlatform EditMode -testResults "D:/github/Elysian-Realm/unity/dorm-game/TestResults-EditMode.xml" -logFile "D:/github/Elysian-Realm/unity/dorm-game/Logs/EditModeTests.log" -quit
  ```
- Build Unity generated C# projects:
  ```powershell
  dotnet build "unity/dorm-game/Assembly-CSharp.csproj" --no-restore
  dotnet build "unity/dorm-game/Assembly-CSharp-Editor.csproj" --no-restore
  ```
- Check worktree without mutating it: `git status --short` and targeted `git diff -- "path"`.