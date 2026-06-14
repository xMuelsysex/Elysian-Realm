using UnityEngine;

namespace DormGame.Core
{
    /// <summary>
    /// 能力锁状态管理器 - 使用计数器处理嵌套锁定
    /// </summary>
    public class GameStateManager : MonoBehaviour
    {
        public static GameStateManager Instance { get; private set; }

        private int movementLockCount = 0;
        private int interactionLockCount = 0;
        private int cameraLockCount = 0;
        private int uiModalCount = 0;

        public bool IsMovementLocked => movementLockCount > 0;
        public bool IsInteractionLocked => interactionLockCount > 0;
        public bool IsCameraLocked => cameraLockCount > 0;
        public bool IsUIModalActive => uiModalCount > 0;

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

        public void LockForDialogue()
        {
            movementLockCount++;
            interactionLockCount++;
            cameraLockCount++;
        }

        public void UnlockForDialogue()
        {
            movementLockCount = Mathf.Max(0, movementLockCount - 1);
            interactionLockCount = Mathf.Max(0, interactionLockCount - 1);
            cameraLockCount = Mathf.Max(0, cameraLockCount - 1);
        }

        public void LockForMenu()
        {
            uiModalCount++;
            movementLockCount++;
        }

        public void UnlockForMenu()
        {
            uiModalCount = Mathf.Max(0, uiModalCount - 1);
            movementLockCount = Mathf.Max(0, movementLockCount - 1);
        }
    }
}
