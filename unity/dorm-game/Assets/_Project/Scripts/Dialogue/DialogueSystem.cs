using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DormGame.Core;
using DormGame.Data;

namespace DormGame.Dialogue
{
    public class DialogueSystem : MonoBehaviour
    {
        public static DialogueSystem Instance { get; private set; }

        private DialogueScript currentScript;
        private DialogueNode currentNode;
        private SaveData saveData;
        private string currentCharacterId;

        public bool IsPlaying => currentScript != null;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void StartDialogue(CharacterDefinition character, Transform npcTransform)
        {
            Debug.Log("[DialogueSystem] StartDialogue called for: " + character.characterId);

            if (IsPlaying)
            {
                Debug.LogWarning("Dialogue already playing!");
                return;
            }

            // 加载存档（阶段 4 实现完整存档，这里先用内存临时）
            Debug.Log("[DialogueSystem] Loading save data...");
            saveData = LoadOrCreateSaveData();
            currentCharacterId = character.characterId;

            // 根据 Trigger 选择剧本
            Debug.Log($"[DialogueSystem] Selecting script from {character.mainScripts.Length} scripts...");
            var validScripts = character.mainScripts
                .Where(script => script != null && script.trigger.CanTrigger(saveData, character.characterId, script.scriptId))
                .OrderByDescending(script => script.trigger.priority);

            currentScript = validScripts.FirstOrDefault();

            if (currentScript == null)
            {
                Debug.Log($"No valid script for {character.characterId}, fallback to LLM (Stage 3)");
                return;
            }

            Debug.Log($"[DialogueSystem] Selected script: {currentScript.scriptId}, nodes: {currentScript.nodes.Length}");

            // 播放首节点
            currentNode = currentScript.nodes[0];
            Debug.Log($"[DialogueSystem] Starting node: {currentNode.nodeId}");

            // 锁定移动和交互
            Debug.Log("[DialogueSystem] Locking game state...");
            if (GameStateManager.Instance != null)
            {
                GameStateManager.Instance.LockForDialogue();
            }

            // 通知 UI 显示对话
            Debug.Log("[DialogueSystem] Showing dialogue UI...");
            if (DialogueUI.Instance != null)
            {
                DialogueUI.Instance.Show(currentNode, character);
            }

            // 触发相机切换（传递 Transform）
            Debug.Log("[DialogueSystem] Focusing camera...");
            if (Camera.CameraManager.Instance != null)
            {
                Camera.CameraManager.Instance.FocusOnCharacter(npcTransform);
            }

            Debug.Log("[DialogueSystem] StartDialogue completed");
        }

        public void OnPlayerClickNext()
        {
            if (!IsPlaying) return;

            // 执行当前节点的 Effects
            ExecuteEffects(currentNode.effects);

            // 无选项 → 自动跳转
            if (currentNode.choices == null || currentNode.choices.Length == 0)
            {
                if (string.IsNullOrEmpty(currentNode.nextNodeId))
                {
                    EndDialogue();
                }
                else
                {
                    PlayNode(currentNode.nextNodeId);
                }
            }
            else
            {
                // 有选项 → 等待玩家选择
                if (DialogueUI.Instance != null)
                {
                    DialogueUI.Instance.ShowChoices(currentNode.choices);
                }
            }
        }

        public void OnPlayerSelectChoice(int choiceIndex)
        {
            if (!IsPlaying || currentNode.choices == null) return;

            var choice = currentNode.choices[choiceIndex];
            PlayNode(choice.nextNodeId);
        }

        private void PlayNode(string nodeId)
        {
            if (string.IsNullOrEmpty(nodeId))
            {
                EndDialogue();
                return;
            }

            currentNode = System.Array.Find(currentScript.nodes, n => n.nodeId == nodeId);

            if (currentNode == null)
            {
                Debug.LogError($"Node {nodeId} not found in script {currentScript.scriptId}");
                EndDialogue();
                return;
            }

            // 查找角色定义（根据 speakerId）
            var character = FindCharacterById(currentNode.speakerId);
            if (DialogueUI.Instance != null)
            {
                DialogueUI.Instance.Show(currentNode, character);
            }
        }

        private void ExecuteEffects(DialogueEffect[] effects)
        {
            if (effects == null) return;

            var storyFlags = saveData.GetStoryFlagsDict();
            var affinityFlags = saveData.GetAffinityFlagsDict();

            foreach (var effect in effects)
            {
                switch (effect.type)
                {
                    case DialogueEffect.EffectType.SetFlag:
                        storyFlags[effect.targetId] = effect.value;
                        break;

                    case DialogueEffect.EffectType.ModifyAffinity:
                        if (!affinityFlags.ContainsKey(effect.targetId))
                            affinityFlags[effect.targetId] = 0;
                        affinityFlags[effect.targetId] += effect.value;
                        break;
                }
            }

            saveData.SetStoryFlagsDict(storyFlags);
            saveData.SetAffinityFlagsDict(affinityFlags);
        }

        private void EndDialogue()
        {
            // 记录已播放
            string playedKey = $"{currentCharacterId}_{currentScript.scriptId}";
            if (!saveData.playedScripts.Contains(playedKey))
            {
                saveData.playedScripts.Add(playedKey);
            }

            // 保存（阶段 4 实现完整存档）
            SaveSaveData(saveData);

            // 解锁移动和交互
            if (GameStateManager.Instance != null)
            {
                GameStateManager.Instance.UnlockForDialogue();
            }

            // 隐藏 UI
            if (DialogueUI.Instance != null)
            {
                DialogueUI.Instance.Hide();
            }

            // 恢复相机
            if (Camera.CameraManager.Instance != null)
            {
                Camera.CameraManager.Instance.ReturnToPlayerView();
            }

            currentScript = null;
            currentNode = null;
        }

        private CharacterDefinition FindCharacterById(string characterId)
        {
            // 简单实现：从 Resources 加载（阶段 4 可改为 Registry）
            var characters = Resources.LoadAll<CharacterDefinition>("Characters");
            return System.Array.Find(characters, c => c.characterId == characterId);
        }

        private SaveData LoadOrCreateSaveData()
        {
            // 阶段 2 临时实现：内存临时数据
            // 阶段 4 改为从 JSON 文件加载
            return new SaveData();
        }

        private void SaveSaveData(SaveData data)
        {
            // 阶段 2 临时实现：不做持久化
            // 阶段 4 改为写入 JSON 文件
        }
    }
}
