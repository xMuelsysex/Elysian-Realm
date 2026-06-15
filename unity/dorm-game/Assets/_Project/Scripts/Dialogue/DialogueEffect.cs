using System;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueEffect
    {
        public enum EffectType { SetFlag, ModifyAffinity, UnlockScript }

        public EffectType type;
        public string targetId;            // 标记名/角色ID
        public int value;                  // 设为多少/增减量
    }
}
