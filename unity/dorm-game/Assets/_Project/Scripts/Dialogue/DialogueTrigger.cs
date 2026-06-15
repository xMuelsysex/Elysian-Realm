using System;
using DormGame.Core;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueTrigger
    {
        public enum TriggerType { FirstMeet, StoryFlag, AffinityLevel }

        public TriggerType type;
        public string requiredFlagId;      // Type=StoryFlag 时检查此标记
        public int requiredFlagValue;      // 标记值门槛
        public int requiredAffinityLevel;  // Type=AffinityLevel 时检查好感度
        public bool isRepeatable;          // 可重复触发？
        public int priority;               // 多剧本同时满足时，优先级高的先播

        public bool CanTrigger(SaveData saveData, string characterId, string scriptId)
        {
            // 检查已播放记录
            string playedKey = $"{characterId}_{scriptId}";
            if (!isRepeatable && saveData.playedScripts.Contains(playedKey))
                return false;

            switch (type)
            {
                case TriggerType.FirstMeet:
                    return !saveData.playedScripts.Contains(playedKey);

                case TriggerType.StoryFlag:
                    var flags = saveData.GetStoryFlagsDict();
                    return flags.TryGetValue(requiredFlagId, out int val) && val >= requiredFlagValue;

                case TriggerType.AffinityLevel:
                    var affinity = saveData.GetAffinityFlagsDict();
                    return affinity.TryGetValue(characterId, out int aff) && aff >= requiredAffinityLevel;
            }

            return false;
        }
    }
}
