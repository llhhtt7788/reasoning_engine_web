// State management
let chatHistory = [];
let isProcessing = false;

// DOM elements
const chatbox = document.getElementById('chatbox');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const reasoningDisplay = document.getElementById('reasoning-display');
const nextActionsDisplay = document.getElementById('next-actions-display');
const reasoningToggle = document.getElementById('reasoning-toggle');
const nextActionsToggle = document.getElementById('next-actions-toggle');
const reasoningContent = document.getElementById('reasoning-content');
const nextActionsContent = document.getElementById('next-actions-content');

// Accordion functionality
function setupAccordion(toggleBtn, content) {
    toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
        content.classList.toggle('open');
    });
}

setupAccordion(reasoningToggle, reasoningContent);
setupAccordion(nextActionsToggle, nextActionsContent);

// Markdown-like rendering (basic)
function renderMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Convert markdown-like syntax
    text = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    return text;
}

// Add message to chat
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = renderMarkdown(content);
    
    messageDiv.appendChild(contentDiv);
    chatbox.appendChild(messageDiv);
    
    // Scroll to bottom
    chatbox.scrollTop = chatbox.scrollHeight;
    
    return contentDiv;
}

// Update assistant message
function updateAssistantMessage(contentElement, text, hasReasoning = false) {
    let displayText = text;
    
    if (hasReasoning && !text.includes('🧠 本次回答包含推理过程')) {
        displayText += '\n\n> 🧠 本次回答包含推理过程，可在下方【思维链】中查看。';
    }
    
    contentElement.innerHTML = renderMarkdown(displayText);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isProcessing) {
        return;
    }
    
    isProcessing = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;
    
    // Add user message
    addMessage('user', message);
    chatHistory.push({ role: 'user', content: message });
    
    // Clear input
    messageInput.value = '';
    
    // Add assistant message placeholder
    const assistantContent = addMessage('assistant', '');
    let answerBuffer = '';
    let reasoningBuffer = '';
    let hasReasoning = false;
    
    // Clear previous reasoning and next actions
    reasoningDisplay.textContent = '';
    nextActionsDisplay.innerHTML = '';
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                // Send history excluding the just-added user message, as we send it separately
                history: chatHistory.slice(0, -1)
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        
                        if (data.type === 'update') {
                        answerBuffer = data.content;
                        reasoningBuffer = data.reasoning;
                        hasReasoning = data.has_reasoning;
                        
                        updateAssistantMessage(assistantContent, answerBuffer, hasReasoning);
                        reasoningDisplay.textContent = reasoningBuffer;
                        
                    } else if (data.type === 'complete') {
                        answerBuffer = data.content;
                        reasoningBuffer = data.reasoning;
                        
                        updateAssistantMessage(assistantContent, answerBuffer, hasReasoning);
                        reasoningDisplay.textContent = reasoningBuffer;
                        
                        // Display next actions
                        if (data.next_actions && data.next_actions.length > 0) {
                            const actionsHtml = '<h3>下一步建议</h3><ul>' +
                                data.next_actions.map(action => `<li>${action}</li>`).join('') +
                                '</ul>';
                            nextActionsDisplay.innerHTML = actionsHtml;
                        }
                        
                    } else if (data.type === 'error') {
                        updateAssistantMessage(assistantContent, data.error);
                        answerBuffer = data.error;
                    }
                    } catch (e) {
                        console.error('Failed to parse SSE data:', e);
                    }
                }
            }
        }
        
        // Update chat history with final assistant response
        chatHistory.push({ role: 'assistant', content: answerBuffer });
        
    } catch (error) {
        const errorMessage = `请求失败: ${error.message}`;
        updateAssistantMessage(assistantContent, errorMessage);
        chatHistory.push({ role: 'assistant', content: errorMessage });
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Clear conversation
function clearConversation() {
    chatHistory = [];
    chatbox.innerHTML = '';
    reasoningDisplay.textContent = '';
    nextActionsDisplay.innerHTML = '';
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearConversation);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Focus on input on load
messageInput.focus();
