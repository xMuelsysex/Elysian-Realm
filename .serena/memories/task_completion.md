# Task Completion

For non-trivial code changes in `unity/dorm-game`, verify in this order when possible:

1. Focused or full Unity EditMode tests with Unity `2022.3.62f3` batchmode.
2. `dotnet build "unity/dorm-game/Assembly-CSharp.csproj" --no-restore`.
3. `dotnet build "unity/dorm-game/Assembly-CSharp-Editor.csproj" --no-restore`.
4. Targeted static checks with `rg`/`git diff` when Unity is blocked.

If Unity batchmode exits because another Unity instance has the project open, report that lock explicitly and do not claim tests passed. Do not commit unless the user explicitly requested a commit.