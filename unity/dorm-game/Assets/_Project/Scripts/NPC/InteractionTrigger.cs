using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DormGame.Core;

namespace DormGame.NPC
{
    /// <summary>
    /// 玩家交互检测器 - Trigger 辅助 + 每帧距离查询
    /// </summary>
    public class InteractionTrigger : MonoBehaviour
    {
        private List<Interactable> nearbyInteractables = new List<Interactable>();
        private PlayerInputActions inputActions;

        [SerializeField] private float maxInteractDistance = 3f;

        void Awake()
        {
            inputActions = new PlayerInputActions();
        }

        void OnEnable()
        {
            inputActions.Enable();
            inputActions.Player.Interact.performed += OnInteract;
        }

        void OnDisable()
        {
            inputActions.Player.Interact.performed -= OnInteract;
            inputActions.Disable();
        }

        void OnTriggerEnter(Collider other)
        {
            if (other.TryGetComponent<Interactable>(out var interactable))
            {
                if (!nearbyInteractables.Contains(interactable))
                {
                    nearbyInteractables.Add(interactable);
                }
            }
        }

        void OnTriggerExit(Collider other)
        {
            if (other.TryGetComponent<Interactable>(out var interactable))
            {
                nearbyInteractables.Remove(interactable);
            }
        }

        private void OnInteract(UnityEngine.InputSystem.InputAction.CallbackContext context)
        {
            if (GameStateManager.Instance.IsInteractionLocked) return;

            // 找最近的可交互物
            var closest = nearbyInteractables
                .OrderBy(i => Vector3.Distance(transform.position, i.transform.position))
                .FirstOrDefault();

            if (closest != null)
            {
                float distance = Vector3.Distance(transform.position, closest.transform.position);
                if (distance <= maxInteractDistance)
                {
                    closest.OnInteract();
                }
            }
        }
    }
}
