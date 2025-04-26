// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const ageSelectionScreen = document.getElementById('ageSelectionScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const chatScreen = document.getElementById('chatScreen');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const userAvatar = document.getElementById('userAvatar');
const levelBadge = document.getElementById('levelBadge');
const achievementsBar = document.getElementById('achievementsBar');

// State Management
let currentUser = null;
let currentAgeGroup = null;
let currentLevel = 1;
let achievements = [];

// Welcome Screen Animation
function startWelcomeAnimation() {
  const loadingBar = document.querySelector('.loading-bar');
  const loadingProgress = document.querySelector('.loading-progress');
  
  loadingProgress.style.animation = 'loading 2s ease-in-out forwards';
  
  setTimeout(() => {
    loadingBar.style.display = 'none';
    document.querySelector('.intro-animation').style.display = 'none';
    document.querySelector('.user-selection').style.display = 'flex';
  }, 2000);
}

// User Selection
function handleUserSelection(userType) {
  currentUser = userType;
  welcomeScreen.classList.add('hidden');
  ageSelectionScreen.classList.remove('hidden');
  
  // Update avatar based on user type
  const avatar = document.getElementById('ageAvatar');
  avatar.src = `assets/avatars/${userType}.png`;
}

// Age Selection
function handleAgeSelection(ageGroup) {
  currentAgeGroup = ageGroup;
  ageSelectionScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  
  // Update user avatar and level
  userAvatar.src = `assets/avatars/${currentUser}_${ageGroup}.png`;
  levelBadge.textContent = `Level ${currentLevel}`;
  
  // Initialize achievements
  initializeAchievements();
}

// Achievement System
function initializeAchievements() {
  const achievements = [
    { id: 'firstChat', icon: '💬', title: 'First Chat', description: 'Send your first message', unlocked: false },
    { id: 'levelUp', icon: '⭐', title: 'Level Up', description: 'Reach level 2', unlocked: false },
    { id: 'dailyStreak', icon: '🔥', title: 'Daily Streak', description: 'Chat for 3 days in a row', unlocked: false },
    { id: 'explorer', icon: '🌍', title: 'Explorer', description: 'Try all chat features', unlocked: false }
  ];
  
  renderAchievements(achievements);
}

function renderAchievements(achievements) {
  achievementsBar.innerHTML = '';
  
  achievements.forEach(achievement => {
    const achievementElement = document.createElement('div');
    achievementElement.className = `achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    
    achievementElement.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-text">
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
    
    achievementsBar.appendChild(achievementElement);
  });
}

// Chat System
function initializeChat() {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  sendButton.addEventListener('click', sendMessage);
}

function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Add user message
  addMessage(message, 'user');
  
  // Clear input
  chatInput.value = '';
  
  // Simulate AI response
  setTimeout(() => {
    const response = generateAIResponse(message);
    addMessage(response, 'ai');
  }, 1000);
}

function addMessage(text, sender) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}`;
  
  messageElement.innerHTML = `
    <div class="message-content">${text}</div>
  `;
  
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function generateAIResponse(message) {
  // Simple response generation based on message content
  const responses = [
    "That's interesting! Tell me more about that.",
    "I understand how you feel. What else would you like to discuss?",
    "That's a great point! Have you considered other perspectives?",
    "I'm here to help. What specific advice are you looking for?"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Notification System
function showNotification(title, message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'notification-prompt';
  
  const icon = type === 'info' ? 'ℹ️' : type === 'success' ? '✅' : '⚠️';
  
  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
      <div class="notification-actions">
        <button class="notification-accept">Accept</button>
        <button class="notification-dismiss">Dismiss</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  startWelcomeAnimation();
  initializeChat();
  
  // Show welcome notification
  showNotification(
    'Welcome to Digital Mirror!',
    'We\'re excited to have you here. Let\'s get started!',
    'info'
  );
}); 