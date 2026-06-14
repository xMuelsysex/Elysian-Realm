using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;
using DormGame.Core;

namespace DormGame.Player
{
    [RequireComponent(typeof(NavMeshAgent))]
    public class PlayerController : MonoBehaviour
    {
        private NavMeshAgent agent;
        private PlayerInputActions inputActions;
        private Camera mainCamera;

        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private LayerMask groundLayer;
        [SerializeField] private LayerMask npcLayer;

        private enum MovementMode { None, DirectControl, Pathfinding }
        private MovementMode currentMode = MovementMode.None;

        void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            inputActions = new PlayerInputActions();
            mainCamera = Camera.main;

            // NavMeshAgent 配置（2.5D top-down）
            agent.updateRotation = false;
            agent.updateUpAxis = false;
        }

        void OnEnable()
        {
            inputActions.Enable();
            inputActions.Player.PointClick.performed += OnPointClick;
        }

        void OnDisable()
        {
            inputActions.Player.PointClick.performed -= OnPointClick;
            inputActions.Disable();
        }

        void Update()
        {
            if (GameStateManager.Instance == null || GameStateManager.Instance.IsMovementLocked) return;

            ProcessMovementInput();
        }

        private void ProcessMovementInput()
        {
            Vector2 moveInput = inputActions.Player.Move.ReadValue<Vector2>();

            if (moveInput.sqrMagnitude > 0.01f)
            {
                // WASD 有输入 → 直控模式
                if (currentMode == MovementMode.Pathfinding)
                {
                    // 打断寻路
                    agent.ResetPath();
                    agent.velocity = Vector3.zero;
                }

                currentMode = MovementMode.DirectControl;
                agent.isStopped = false;

                // 通过 agent.velocity 驱动移动（避免快照回弹）
                Vector3 moveDir = new Vector3(moveInput.x, 0, moveInput.y).normalized;
                agent.velocity = moveDir * moveSpeed;
            }
            else if (currentMode == MovementMode.DirectControl)
            {
                // WASD 松开 → 停止
                agent.velocity = Vector3.zero;
                currentMode = MovementMode.None;
            }
        }

        private void OnPointClick(UnityEngine.InputSystem.InputAction.CallbackContext context)
        {
            if (GameStateManager.Instance == null || GameStateManager.Instance.IsMovementLocked) return;

            // 确保相机存在
            if (mainCamera == null)
            {
                mainCamera = Camera.main;
                if (mainCamera == null) return;
            }

            // 优先级 1: UI 层拦截
            if (UnityEngine.EventSystems.EventSystem.current != null &&
                UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject())
                return;

            // 获取鼠标位置（使用新 Input System）
            Vector2 mousePos = Mouse.current.position.ReadValue();
            Ray ray = mainCamera.ScreenPointToRay(mousePos);

            // 优先级 2: NPC/可交互物
            if (Physics.Raycast(ray, out RaycastHit npcHit, 100f, npcLayer))
            {
                // 触发交互，阻断寻路
                Debug.Log($"Clicked NPC: {npcHit.collider.name}");
                return;
            }

            // 优先级 3: 地面寻路
            if (Physics.Raycast(ray, out RaycastHit groundHit, 100f, groundLayer))
            {
                Vector3 targetPos = groundHit.point;

                // 验证可行走
                if (NavMesh.SamplePosition(targetPos, out NavMeshHit navHit, 1f, NavMesh.AllAreas))
                {
                    if (agent.SetDestination(navHit.position))
                    {
                        currentMode = MovementMode.Pathfinding;
                        agent.isStopped = false;
                    }
                }
            }
        }
    }
}
