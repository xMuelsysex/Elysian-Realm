using System;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueChoice
    {
        public string choiceTextKey;       // 选项文本
        public string nextNodeId;          // 跳转目标节点
    }
}
