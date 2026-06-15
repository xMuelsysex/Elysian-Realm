using System;
using UnityEngine;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueNode
    {
        public string nodeId;
        public string speakerId;           // 说话者 CharacterId
        public string textKey;             // 对话文本（暂时直接用中文，i18n 留到阶段 5）
        public DialogueChoice[] choices;   // 玩家选项（空 = 自动 continue）
        public string nextNodeId;          // 无选项时的下一节点
        public DialogueEffect[] effects;   // 副作用
    }
}
