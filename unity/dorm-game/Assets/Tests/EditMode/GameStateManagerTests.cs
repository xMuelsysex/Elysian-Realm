using NUnit.Framework;
using UnityEngine;
using DormGame.Core;

namespace DormGame.Tests
{
    public class GameStateManagerTests
    {
        private GameStateManager manager;

        [SetUp]
        public void Setup()
        {
            var go = new GameObject("TestManager");
            manager = go.AddComponent<GameStateManager>();
        }

        [TearDown]
        public void Teardown()
        {
            Object.DestroyImmediate(manager.gameObject);
        }

        [Test]
        public void LockForDialogue_LocksMovementInteractionCamera()
        {
            manager.LockForDialogue();

            Assert.IsTrue(manager.IsMovementLocked);
            Assert.IsTrue(manager.IsInteractionLocked);
            Assert.IsTrue(manager.IsCameraLocked);
        }

        [Test]
        public void NestedLocks_CountCorrectly()
        {
            manager.LockForDialogue();
            manager.LockForMenu();

            // 移动锁计数应为 2
            Assert.IsTrue(manager.IsMovementLocked);

            manager.UnlockForMenu();

            // 移动锁计数应为 1，仍锁定
            Assert.IsTrue(manager.IsMovementLocked);

            manager.UnlockForDialogue();

            // 移动锁计数应为 0，全解锁
            Assert.IsFalse(manager.IsMovementLocked);
            Assert.IsFalse(manager.IsInteractionLocked);
        }

        [Test]
        public void UnlockBelowZero_ClampsToZero()
        {
            manager.UnlockForDialogue(); // 无锁时解锁

            Assert.IsFalse(manager.IsMovementLocked);
        }
    }
}
