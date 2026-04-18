// js/screens/chat.js — AI Health Chat Screen
import State from '../state.js';
import { t } from '../i18n.js';
import { streamChat } from '../api.js';
import Voice from '../voice.js';
import { showToast } from '../app.js';

let chatHistory = [];
let isStreaming = false;

const SUGGESTED_QUESTIONS = [
  { key: 'suggested_q1', default: 'Is 39°C fever serious?' },
  { key: 'suggested_q2', default: 'Should I see a specialist or a GP?' },
  { key: 'suggested_q3', default: 'What does this rash mean?' },
  { key: 'suggested_q4', default: 'My child has stomach pain' },
  { key: 'suggested_q5', default: 'I feel dizzy and nauseous' }
];

export function render() {
  chatHistory = State.get('chatHistory') || [];
  const lang = State.get('language') || 'en';
  
  return `
    <div class="chat-screen">
      <!-- Disclaimer bar -->
      <div class="chat-disclaimer-bar">
        <span>ℹ️ </span><span data-i18n="ai_disclaimer">This AI provides navigation guidance only, not medical diagnosis.</span>
      </div>

      <!-- Chat messages -->
      <div class="chat-body" id="chat-body">
        ${chatHistory.length === 0 ? renderEmptyChat() : chatHistory.map(msg => renderMessage(msg)).join('')}
      </div>

      <!-- Footer -->
      <div class="chat-footer">
        ${chatHistory.length === 0 ? `
          <div class="chat-suggested" id="suggestions">
            ${SUGGESTED_QUESTIONS.map(q => `
              <div class="suggestion-chip" role="button" aria-label="${t(q.key, q.default)}">${t(q.key, q.default)}</div>
            `).join('')}
          </div>
        ` : ''}
        <div class="chat-input-row">
          <textarea class="chat-input" id="chat-input" rows="1" placeholder="${t('send_message', 'Send a message...')}" aria-label="Type your health question"></textarea>
          <button class="btn btn-icon btn-ghost" id="voice-chat-btn" aria-label="Voice input">🎤</button>
          <button class="btn btn-primary btn-icon" id="send-chat-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyChat() {
  return `
    <div class="empty-state" style="padding-top:32px;">
      <div style="width:64px; height:64px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px;">✚</div>
      <div class="empty-title">MediRoute AI</div>
      <div class="empty-desc">Ask me anything about your symptoms, medications, or how to navigate healthcare here. I'll help you find the right care.</div>
    </div>
  `;
}

function renderMessage(msg) {
  const isUser = msg.role === 'user';
  return `
    <div class="chat-message ${isUser ? 'user' : 'bot'}">
      ${!isUser ? `<div class="chat-avatar">✚</div>` : ''}
      <div class="chat-bubble">${msg.content.replace(/\n/g, '<br>')}</div>
      ${isUser ? `<div class="chat-avatar" style="background:var(--secondary);">👤</div>` : ''}
    </div>
  `;
}

export function init() {
  const sendBtn = document.getElementById('send-chat-btn');
  const input = document.getElementById('chat-input');
  const voiceBtn = document.getElementById('voice-chat-btn');

  sendBtn?.addEventListener('click', sendMessage);
  
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Voice input
  voiceBtn?.addEventListener('click', () => {
    if (Voice.isRecording) {
      Voice.stop();
      voiceBtn.textContent = '🎤';
      return;
    }
    voiceBtn.textContent = '⏹🔴';
    Voice.start({
      lang: State.get('language'),
      onResult: (text) => {
        voiceBtn.textContent = '🎤';
        const inputEl = document.getElementById('chat-input');
        if (inputEl) { inputEl.value = text; sendMessage(); }
      },
      onEnd: () => { voiceBtn.textContent = '🎤'; }
    });
  });

  // Suggestion chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const inputEl = document.getElementById('chat-input');
      if (inputEl) {
        inputEl.value = chip.textContent;
        sendMessage();
      }
    });
  });

  // Scroll to bottom
  scrollToBottom();
}

async function sendMessage() {
  if (isStreaming) return;
  const input = document.getElementById('chat-input');
  const message = input?.value.trim();
  if (!message) return;
  if (input) { input.value = ''; input.style.height = 'auto'; }

  // Remove suggestions
  const suggestions = document.getElementById('suggestions');
  if (suggestions) suggestions.remove();

  // Add user message
  const userMsg = { role: 'user', content: message };
  chatHistory.push(userMsg);
  State.set('chatHistory', chatHistory);
  appendMessage(userMsg);

  // Add loading indicator
  const loadingId = 'loading-' + Date.now();
  appendLoadingMessage(loadingId);
  scrollToBottom();

  // Stream AI response
  isStreaming = true;
  let fullResponse = '';
  
  try {
    const profile = State.profile.get();
    const lang = State.get('language') || 'en';
    const messages = chatHistory.slice(-10); // last 10 messages for context

    const loadingEl = document.getElementById(loadingId);
    let bubbleEl = null;

    if (loadingEl) {
      loadingEl.innerHTML = '';
      loadingEl.classList.remove('user');
      bubbleEl = document.createElement('div');
      bubbleEl.className = 'chat-bubble';
      loadingEl.prepend(document.createElement('div')).className = 'chat-avatar';
      loadingEl.querySelector('.chat-avatar').textContent = '✚';
      loadingEl.appendChild(bubbleEl);
    }

    for await (const chunk of streamChat(messages, profile, lang)) {
      fullResponse += chunk;
      if (bubbleEl) {
        bubbleEl.innerHTML = fullResponse.replace(/\n/g, '<br>');
        scrollToBottom();
      }
    }

    // Check for emergency keywords
    const keywords = ['chest pain', 'difficulty breathing', 'stroke', 'unconscious', 'severe bleeding', 'anaphylaxis', 'cannot breathe', "can't breathe"];
    const isEmergency = keywords.some(k => (fullResponse + message).toLowerCase().includes(k));
    if (isEmergency && bubbleEl) {
      const urgentDiv = document.createElement('div');
      urgentDiv.style.cssText = 'margin-top:10px; padding:8px 12px; background:var(--danger-light); border-radius:8px; border-left:3px solid var(--danger);';
      urgentDiv.innerHTML = `<strong style="color:var(--danger);">⚠️ This sounds urgent.</strong> <a href="#/doctors?specialty=Emergency Medicine" style="color:var(--secondary);">Find a Doctor Now →</a>`;
      bubbleEl.parentElement?.appendChild(urgentDiv);
    }

    // Save AI response
    const aiMsg = { role: 'assistant', content: fullResponse };
    chatHistory.push(aiMsg);
    State.set('chatHistory', chatHistory);

  } catch (e) {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) {
      loadingEl.innerHTML = `<div class="chat-avatar">✚</div><div class="chat-bubble">I'm sorry, I'm having trouble connecting right now. If this is an emergency, please call 112 immediately.</div>`;
    }
  }

  isStreaming = false;
  scrollToBottom();
}

function appendMessage(msg) {
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;
  
  // Remove empty state
  const emptyState = chatBody.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const div = document.createElement('div');
  div.innerHTML = renderMessage(msg);
  const el = div.firstElementChild;
  if (el) chatBody.appendChild(el);
}

function appendLoadingMessage(id) {
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;
  const div = document.createElement('div');
  div.className = 'chat-message bot';
  div.id = id;
  div.innerHTML = `<div class="chat-avatar">✚</div><div class="chat-bubble"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div></div>`;
  chatBody.appendChild(div);
}

function scrollToBottom() {
  const chatBody = document.getElementById('chat-body');
  if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}
