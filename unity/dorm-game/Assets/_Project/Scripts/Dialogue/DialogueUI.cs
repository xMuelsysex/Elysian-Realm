using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using DormGame.Data;

namespace DormGame.Dialogue
{
    public class DialogueUI : MonoBehaviour
    {
        public static DialogueUI Instance { get; private set; }

        [Header("UI References")]
        [SerializeField] private GameObject dialoguePanel;
        [SerializeField] private TextMeshProUGUI dialogueText;
        [SerializeField] private Button nextButton;
        [SerializeField] private Transform choicesContainer;
        [SerializeField] private GameObject choiceButtonPrefab;
        [SerializeField] private TMP_FontAsset dialogueFont;

        [Header("Typewriter Settings")]
        [SerializeField] private float typewriterSpeed = 0.05f;

        private Coroutine typewriterCoroutine;
        private string fullText;
        private bool isTyping;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            if (dialoguePanel != null)
            {
                dialoguePanel.SetActive(false);
            }

            if (nextButton != null)
            {
                nextButton.onClick.AddListener(OnNextButtonClicked);
            }

            ApplyDialogueFont(dialogueText);
        }

        private void ApplyDialogueFont(TextMeshProUGUI text)
        {
            if (text == null || dialogueFont == null)
            {
                return;
            }

            text.font = dialogueFont;
            text.enableWordWrapping = true;
            text.extraPadding = true;
        }

        public void Show(DialogueNode node, CharacterDefinition character)
        {
            Debug.Log($"[DialogueUI] Show called for node: {node.nodeId}, character: {character.displayName}");

            ApplyDialogueFont(dialogueText);

            if (dialoguePanel != null)
            {
                dialoguePanel.SetActive(true);
                Debug.Log("[DialogueUI] Panel activated");
            }
            else
            {
                Debug.LogError("[DialogueUI] dialoguePanel is null!");
            }

            // 清空选项
            if (choicesContainer != null)
            {
                foreach (Transform child in choicesContainer)
                {
                    Destroy(child.gameObject);
                }
                choicesContainer.gameObject.SetActive(false);
                Debug.Log("[DialogueUI] Choices cleared");
            }

            if (nextButton != null)
            {
                nextButton.gameObject.SetActive(true);
            }

            // 显示文本（带打字机效果）
            fullText = node.textKey;
            Debug.Log($"[DialogueUI] Starting typewriter for text: {fullText}");

            if (typewriterCoroutine != null)
            {
                StopCoroutine(typewriterCoroutine);
            }

            typewriterCoroutine = StartCoroutine(TypewriterEffect());
            Debug.Log("[DialogueUI] Show completed");
        }

        public void ShowChoices(DialogueChoice[] choices)
        {
            if (nextButton != null)
            {
                nextButton.gameObject.SetActive(false);
            }

            if (choicesContainer != null)
            {
                choicesContainer.gameObject.SetActive(true);
            }

            if (choiceButtonPrefab == null || choicesContainer == null)
            {
                Debug.LogError("ChoiceButtonPrefab or ChoicesContainer is null!");
                return;
            }

            for (int i = 0; i < choices.Length; i++)
            {
                int index = i; // 闭包捕获
                var choice = choices[i];

                var buttonGo = Instantiate(choiceButtonPrefab, choicesContainer);
                var button = buttonGo.GetComponent<Button>();
                var buttonText = buttonGo.GetComponentInChildren<TextMeshProUGUI>();

                if (buttonText != null)
                {
                    ApplyDialogueFont(buttonText);
                    buttonText.text = choice.choiceTextKey;
                }

                if (button != null)
                {
                    button.onClick.AddListener(() => OnChoiceSelected(index));
                }
            }
        }

        public void Hide()
        {
            if (dialoguePanel != null)
            {
                dialoguePanel.SetActive(false);
            }

            if (typewriterCoroutine != null)
            {
                StopCoroutine(typewriterCoroutine);
                typewriterCoroutine = null;
            }
        }

        private IEnumerator TypewriterEffect()
        {
            isTyping = true;

            if (dialogueText != null)
            {
                dialogueText.text = "";

                foreach (char c in fullText)
                {
                    dialogueText.text += c;
                    yield return new WaitForSeconds(typewriterSpeed);
                }
            }

            isTyping = false;
            typewriterCoroutine = null;
        }

        private void OnNextButtonClicked()
        {
            // 如果正在打字 → 直接显示完整文本
            if (isTyping)
            {
                if (typewriterCoroutine != null)
                {
                    StopCoroutine(typewriterCoroutine);
                    typewriterCoroutine = null;
                }

                if (dialogueText != null)
                {
                    dialogueText.text = fullText;
                }

                isTyping = false;
            }
            else
            {
                // 打字完成 → 通知 DialogueSystem 继续
                if (DialogueSystem.Instance != null)
                {
                    DialogueSystem.Instance.OnPlayerClickNext();
                }
            }
        }

        private void OnChoiceSelected(int index)
        {
            if (DialogueSystem.Instance != null)
            {
                DialogueSystem.Instance.OnPlayerSelectChoice(index);
            }
        }
    }
}
