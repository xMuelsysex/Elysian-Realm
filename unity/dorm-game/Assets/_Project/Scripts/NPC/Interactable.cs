using UnityEngine;

namespace DormGame.NPC
{
    /// <summary>
    /// 可交互物体组件 - 标识该物体可被玩家交互
    /// </summary>
    public class Interactable : MonoBehaviour
    {
        [SerializeField] private string interactableId;
        [SerializeField] private float interactionRadius = 2f;

        public string InteractableId => interactableId;
        public float InteractionRadius => interactionRadius;

        void OnValidate()
        {
            // 自动生成 ID
            if (string.IsNullOrEmpty(interactableId))
            {
                interactableId = $"{gameObject.name}_{GetInstanceID()}";
            }
        }

        public void OnInteract()
        {
            Debug.Log($"Interacted with: {interactableId}");
        }

        void OnDrawGizmosSelected()
        {
            // 可视化交互范围
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, interactionRadius);
        }
    }
}
