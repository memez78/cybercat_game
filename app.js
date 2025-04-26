// Element refs - Updated to include new UI elements
const welcomeScreen = document.getElementById('welcomeScreen');
const nameScreen = document.getElementById('nameScreen');
const ageScreen = document.getElementById('ageScreen');
const chatScreen = document.getElementById('chatScreen');
const parentDashboard = document.getElementById('parentDashboard');
const userDashboard = document.getElementById('userDashboard');
const nameInput = document.getElementById('name');
const ageInput = document.getElementById('age');
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');
const normalUserBtn = document.getElementById('normalUserBtn');
const parentBtn = document.getElementById('parentBtn');
const ageSubmitBtn = document.getElementById('ageSubmitBtn');
const chatButton = document.getElementById('chatButton');
const parentChatBtn = document.getElementById('parentChatBtn');
const chatDiv = document.getElementById('chatMessages');
const installPrompt = document.getElementById('installPrompt');
const installBanner = document.getElementById('installBanner');
const notificationPrompt = document.getElementById('notificationPrompt');
const progressBar = document.getElementById('securityProgress');
const dashboardProgress = document.getElementById('dashboardProgress');
const scoreDisplay = document.getElementById('scoreDisplay');
const dashboardScore = document.getElementById('dashboardScore');
const parentScoreDisplay = document.getElementById('parentScoreDisplay');
const parentProgressBar = document.getElementById('parentProgressBar');
const missionProgressBar = document.getElementById('missionProgressBar');
const missionsCompleted = document.getElementById('missionsCompleted');
const timeSpent = document.getElementById('timeSpent');

// Mission-related elements
const missionCards = document.querySelectorAll('.mission-card');

// Global state
let userName = '', userAge = 0, securityScore = 0;
let userAgeGroup = 'adult'; // Default age group
let userMode = 'normal'; // 'normal' or 'parent'
let selectedAge = null;
let deferredPrompt;
let model; // TensorFlow.js QnA model
let isNotificationPromptShown = false;
let isInstallPromptShown = false;
let startTime = null;
let completedMissions = 0;
let activeMission = null;

// Game state management
class GameState {
  constructor() {
    this.coins = 0;
    this.level = 1;
    this.highScore = 0;
    this.upgrades = {
      shield: 1,
      speed: 1,
      power: 1
    };
    this.achievements = {
      firstGame: false,
      score100: false,
      score500: false,
      score1000: false,
      collect100: false,
      collect500: false,
      collect1000: false
    };
    this.childProfile = null;
    this.progress = {
      gamesPlayed: 0,
      totalScore: 0,
      highestScore: 0,
      averageScore: 0,
      achievements: [],
      timeSpent: 0,
      lastPlayed: null,
      riskAwareness: {
        socialMedia: 0,
        gaming: 0,
        messaging: 0,
        content: 0
      },
      responses: {
        correct: 0,
        incorrect: 0,
        hesitation: 0,
        patterns: {
          quickDecisions: 0,
          thoughtfulDecisions: 0,
          unsureDecisions: 0
        }
      },
      safetyScore: {
        current: 0,
        trends: []
      },
      flaggedIssues: [],
      recommendations: [],
      discussionPoints: []
    };
  }

  save() {
    try {
      localStorage.setItem('gameState', JSON.stringify(this));
      return true;
    } catch (error) {
      console.error('Failed to save game state:', error);
      return false;
    }
  }

  load() {
    try {
      const savedState = localStorage.getItem('gameState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        Object.assign(this, parsed);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return false;
    }
  }

  updateProgress(gameData) {
    this.progress.gamesPlayed++;
    this.progress.totalScore += gameData.score;
    this.progress.highestScore = Math.max(this.progress.highestScore, gameData.score);
    this.progress.averageScore = this.progress.totalScore / this.progress.gamesPlayed;
    this.progress.lastPlayed = new Date();
    
    // Update risk awareness based on game performance
    this.updateRiskAwareness(gameData);
    
    // Update response patterns
    this.updateResponsePatterns(gameData);
    
    // Update safety score
    this.updateSafetyScore(gameData);
    
    // Generate new recommendations and discussion points
    this.generateRecommendations();
    
    return this.save();
  }

  updateRiskAwareness(gameData) {
    // Update risk awareness scores based on game performance
    const riskFactors = {
      socialMedia: gameData.socialMediaScore || 0,
      gaming: gameData.gamingScore || 0,
      messaging: gameData.messagingScore || 0,
      content: gameData.contentScore || 0
    };

    for (const [category, score] of Object.entries(riskFactors)) {
      this.progress.riskAwareness[category] = Math.min(
        100,
        this.progress.riskAwareness[category] + score
      );
    }
  }

  updateResponsePatterns(gameData) {
    if (gameData.responseTime < 2) {
      this.progress.responses.patterns.quickDecisions++;
    } else if (gameData.responseTime > 5) {
      this.progress.responses.patterns.thoughtfulDecisions++;
    } else {
      this.progress.responses.patterns.unsureDecisions++;
    }

    this.progress.responses.hesitation += gameData.responseTime;
  }

  updateSafetyScore(gameData) {
    const newScore = this.calculateSafetyScore(gameData);
    this.progress.safetyScore.current = newScore;
    this.progress.safetyScore.trends.push({
      date: new Date(),
      score: newScore
    });
  }

  calculateSafetyScore(gameData) {
    const weights = {
      correctResponses: 0.4,
      responseTime: 0.2,
      riskAwareness: 0.4
    };

    const riskAwarenessScore = Object.values(this.progress.riskAwareness)
      .reduce((sum, score) => sum + score, 0) / 4;

    return Math.min(100,
      (gameData.correctResponses * weights.correctResponses * 100) +
      ((1 - gameData.averageResponseTime / 10) * weights.responseTime * 100) +
      (riskAwarenessScore * weights.riskAwareness)
    );
  }

  generateRecommendations() {
    this.progress.recommendations = [];
    this.progress.discussionPoints = [];

    // Generate recommendations based on performance
    if (this.progress.safetyScore.current < 50) {
      this.progress.recommendations.push({
        type: 'basic',
        message: 'Focus on basic cybersecurity concepts',
        priority: 'high'
      });
    }

    // Generate discussion points based on recent performance
    const recentTrends = this.progress.safetyScore.trends.slice(-3);
    if (recentTrends.length >= 2) {
      const trend = recentTrends[recentTrends.length - 1].score - recentTrends[0].score;
      if (trend < 0) {
        this.progress.discussionPoints.push({
          topic: 'Recent Performance',
          points: ['Discuss any challenges faced', 'Review basic concepts']
        });
      }
    }
  }
}

// Replace the existing gameState object with the new class
const gameState = new GameState();
gameState.load();

// Mission Data
const missions = {
  passwords: {
    title: 'Password Protector',
    description: 'Create strong passwords and protect your accounts',
    tasks: [
      {
        title: 'Create a Strong Password',
        description: 'Learn what makes a password strong',
        xp: 20,
        completed: false
      },
      {
        title: 'Password Manager',
        description: 'Set up a password manager',
        xp: 30,
        completed: false
      },
      {
        title: 'Two-Factor Authentication',
        description: 'Enable 2FA on your accounts',
        xp: 50,
        completed: false
      }
    ]
  },
  privacy: {
    title: 'Privacy Guardian',
    description: 'Learn to protect your personal information',
    tasks: [
      {
        title: 'Social Media Privacy',
        description: 'Review and update your privacy settings',
        xp: 25,
        completed: false
      },
      {
        title: 'Data Sharing',
        description: 'Understand what data you share online',
        xp: 35,
        completed: false
      },
      {
        title: 'Privacy Tools',
        description: 'Learn about privacy protection tools',
        xp: 40,
        completed: false
      }
    ]
  },
  phishing: {
    title: 'Phishing Detective',
    description: 'Spot and avoid online scams',
    tasks: [
      {
        title: 'Spot the Scam',
        description: 'Learn to identify phishing attempts',
        xp: 30,
        completed: false
      },
      {
        title: 'Safe Links',
        description: 'Practice checking links safely',
        xp: 40,
        completed: false
      },
      {
        title: 'Report Scams',
        description: 'Learn how to report phishing',
        xp: 30,
        completed: false
      }
    ]
  }
};

// Achievement System
const achievements = [
  {
    id: 'first_level',
    title: 'First Level',
    description: 'Reach level 2',
    icon: '⭐',
    unlocked: false
  },
  {
    id: 'virus_hunter',
    title: 'Virus Hunter',
    description: 'Destroy 50 viruses',
    icon: '🎯',
    unlocked: false
  },
  {
    id: 'shield_collector',
    title: 'Shield Collector',
    description: 'Collect 20 shields',
    icon: '🛡️',
    unlocked: false
  },
  {
    id: 'high_score',
    title: 'High Score',
    description: 'Score 500 points in one game',
    icon: '🏆',
    unlocked: false
  }
];

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const screens = document.querySelectorAll('.screen');
const xpBar = document.querySelector('.xp-progress');
const levelBadge = document.querySelector('.level-text');
const missionsGrid = document.querySelector('.missions-grid');
const messagesContainer = document.querySelector('.messages-container');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const startGameBtn = document.getElementById('startGame');
const coinsDisplay = document.querySelector('.coins-amount');

// DOM Elements
const gameContainer = document.getElementById('game-container');
const startButton = document.getElementById('start-game');
const levelDisplay = document.getElementById('level-display');
const highScoreDisplay = document.getElementById('high-score-display');

// Enhanced Real-world cybersecurity scenarios
const securityScenarios = {
  socialMedia: {
    title: "Social Media Safety",
    risks: [
      {
        type: "privacy",
        description: "Someone asks for your home address and school name",
        correctAction: "Don't share, report to parent",
        points: 20,
        warningSigns: ["Asking for personal details", "Pretending to be a friend"],
        followUp: "Discuss what information should never be shared online"
      },
      {
        type: "stranger",
        description: "A new 'friend' wants to meet you in person",
        correctAction: "Don't accept, tell parent immediately",
        points: 25,
        warningSigns: ["Pushing to meet offline", "Offering gifts or money"],
        followUp: "Review stranger danger rules for online interactions"
      },
      {
        type: "location",
        description: "App keeps asking to access your location",
        correctAction: "Don't allow, ask parent first",
        points: 15,
        warningSigns: ["Constant location requests", "Making it seem urgent"],
        followUp: "Explain why location sharing can be dangerous"
      },
      {
        type: "pressure",
        description: "Friends are posting risky challenges",
        correctAction: "Don't participate, tell parent",
        points: 30,
        warningSigns: ["Peer pressure", "Dangerous dares"],
        followUp: "Discuss how to handle peer pressure online"
      }
    ]
  },
  gaming: {
    title: "Online Gaming Safety",
    risks: [
      {
        type: "chat",
        description: "Someone wants to chat on a different app",
        correctAction: "Don't share contact info, report",
        points: 20,
        warningSigns: ["Trying to move conversation off-platform", "Asking for phone number"],
        followUp: "Set clear rules about gaming communication"
      },
      {
        type: "purchase",
        description: "Someone offers free game currency for your password",
        correctAction: "Don't accept, could be scam",
        points: 25,
        warningSigns: ["Too good to be true offers", "Asking for account details"],
        followUp: "Teach about common gaming scams"
      },
      {
        type: "bullying",
        description: "Players are being mean and threatening",
        correctAction: "Mute, report, tell parent",
        points: 30,
        warningSigns: ["Hate speech", "Threats", "Exclusion"],
        followUp: "Discuss how to handle online bullying"
      },
      {
        type: "account",
        description: "Friend asks to borrow your gaming account",
        correctAction: "Don't share, protect your account",
        points: 35,
        warningSigns: ["Account sharing requests", "Promises of rewards"],
        followUp: "Explain account security importance"
      }
    ]
  },
  messaging: {
    title: "Messaging Safety",
    risks: [
      {
        type: "photo",
        description: "Someone pressures you to send personal photos",
        correctAction: "Don't send, tell parent immediately",
        points: 30,
        warningSigns: ["Pressure tactics", "Threats", "Promises"],
        followUp: "Discuss the permanence of digital content"
      },
      {
        type: "meetup",
        description: "Online friend wants to meet without parents knowing",
        correctAction: "Don't agree, tell parent",
        points: 35,
        warningSigns: ["Secrecy requests", "Rushed plans"],
        followUp: "Review offline meeting safety rules"
      },
      {
        type: "pressure",
        description: "Messages become increasingly personal and uncomfortable",
        correctAction: "Block, report, tell parent",
        points: 25,
        warningSigns: ["Personal questions", "Making you uncomfortable"],
        followUp: "Discuss boundaries in online communication"
      },
      {
        type: "group",
        description: "Added to a group chat with unknown people",
        correctAction: "Leave group, tell parent",
        points: 20,
        warningSigns: ["Unknown participants", "Inappropriate content"],
        followUp: "Set rules for group chat participation"
      }
    ]
  },
  content: {
    title: "Content Safety",
    risks: [
      {
        type: "inappropriate",
        description: "You see disturbing content while browsing",
        correctAction: "Close it, tell parent",
        points: 25,
        warningSigns: ["Unexpected content", "Shocking material"],
        followUp: "Discuss content filtering and safe browsing"
      },
      {
        type: "download",
        description: "Pop-up offers free game/movie download",
        correctAction: "Don't click, could be malware",
        points: 30,
        warningSigns: ["Free offers", "Urgent messages"],
        followUp: "Teach about safe downloading practices"
      },
      {
        type: "scam",
        description: "Website says your device has a virus",
        correctAction: "Don't click, tell parent",
        points: 35,
        warningSigns: ["Fake warnings", "Urgent action needed"],
        followUp: "Explain common online scams"
      }
    ]
  }
};

// Enhanced Parent Monitoring System
const parentMonitor = {
  // Track child's progress and risk awareness
  trackProgress(childId) {
    const progress = {
      gamesPlayed: 0,
      totalScore: 0,
      highestScore: 0,
      averageScore: 0,
      timeSpent: 0,
      lastPlayed: null,
      securityLevel: 1,
      riskAwareness: {
        socialMedia: 0,
        gaming: 0,
        messaging: 0,
        content: 0
      },
      responses: {
        correct: 0,
        incorrect: 0,
        hesitation: 0,
        patterns: {
          quickDecisions: 0,
          thoughtfulDecisions: 0,
          unsureDecisions: 0
        }
      },
      flaggedIssues: [],
      recommendations: [],
      discussionPoints: [],
      safetyScore: {
        overall: 0,
        byCategory: {},
        trends: []
      }
    };

    // Load existing progress
    const savedProgress = localStorage.getItem(`child_${childId}_progress`);
    if (savedProgress) {
      Object.assign(progress, JSON.parse(savedProgress));
    }

    return progress;
  },

  // Update child's progress with risk assessment
  updateProgress(childId, gameData) {
    const progress = this.trackProgress(childId);
    
    // Update basic statistics
    progress.gamesPlayed++;
    progress.totalScore += gameData.score;
    progress.highestScore = Math.max(progress.highestScore, gameData.score);
    progress.averageScore = progress.totalScore / progress.gamesPlayed;
    progress.timeSpent += gameData.timeSpent;
    progress.lastPlayed = new Date().toISOString();
    
    // Update risk awareness scores
    if (gameData.scenarioType) {
      progress.riskAwareness[gameData.scenarioType] += gameData.points;
      this.updateSafetyScore(progress, gameData);
    }
    
    // Track response patterns
    this.updateResponsePatterns(progress, gameData);
    
    // Flag concerning patterns
    this.flagConcerningPatterns(progress, gameData);
    
    // Generate new recommendations and discussion points
    progress.recommendations = this.generateRecommendations(progress);
    progress.discussionPoints = this.generateDiscussionPoints(progress, gameData);
    
    // Save updated progress
    localStorage.setItem(`child_${childId}_progress`, JSON.stringify(progress));
    
    return progress;
  },

  // Update safety score based on performance
  updateSafetyScore(progress, gameData) {
    const category = gameData.scenarioType;
    if (!progress.safetyScore.byCategory[category]) {
      progress.safetyScore.byCategory[category] = 0;
    }
    
    progress.safetyScore.byCategory[category] += gameData.points;
    
    // Calculate overall safety score
    const totalPoints = Object.values(progress.safetyScore.byCategory).reduce((a, b) => a + b, 0);
    const maxPossiblePoints = Object.keys(securityScenarios).length * 100;
    progress.safetyScore.overall = Math.round((totalPoints / maxPossiblePoints) * 100);
    
    // Update trends
    progress.safetyScore.trends.push({
      date: new Date().toISOString(),
      score: progress.safetyScore.overall
    });
  },

  // Update response patterns
  updateResponsePatterns(progress, gameData) {
    progress.responses.correct += gameData.correctResponses || 0;
    progress.responses.incorrect += gameData.incorrectResponses || 0;
    progress.responses.hesitation += gameData.hesitationTime || 0;
    
    // Categorize decision patterns
    if (gameData.hesitationTime < 5) {
      progress.responses.patterns.quickDecisions++;
    } else if (gameData.hesitationTime < 15) {
      progress.responses.patterns.thoughtfulDecisions++;
    } else {
      progress.responses.patterns.unsureDecisions++;
    }
  },

  // Generate discussion points for parents
  generateDiscussionPoints(progress, gameData) {
    const points = [];
    
    // Add scenario-specific discussion points
    if (gameData.scenario) {
      const scenario = gameData.scenario;
      points.push({
        topic: scenario.type,
        question: `How would you handle ${scenario.description}?`,
        keyPoints: scenario.warningSigns,
        followUp: scenario.followUp
      });
    }
    
    // Add pattern-based discussion points
    if (progress.responses.patterns.quickDecisions > progress.responses.patterns.thoughtfulDecisions) {
      points.push({
        topic: "Decision Making",
        question: "Do you think before responding to online messages?",
        keyPoints: ["Taking time to think", "Asking for help when unsure"],
        followUp: "Practice pausing before responding to online messages"
      });
    }
    
    return points;
  },

  // Generate detailed parent report
  generateReport(childId) {
    const progress = this.trackProgress(childId);
    
    return {
      summary: {
        securityLevel: progress.securityLevel,
        safetyScore: progress.safetyScore.overall,
        gamesPlayed: progress.gamesPlayed,
        averageScore: Math.round(progress.averageScore),
        timeSpent: this.formatTime(progress.timeSpent),
        lastPlayed: new Date(progress.lastPlayed).toLocaleDateString()
      },
      riskAwareness: {
        socialMedia: this.calculateRiskLevel(progress.riskAwareness.socialMedia),
        gaming: this.calculateRiskLevel(progress.riskAwareness.gaming),
        messaging: this.calculateRiskLevel(progress.riskAwareness.messaging),
        content: this.calculateRiskLevel(progress.riskAwareness.content)
      },
      responsePatterns: {
        correct: progress.responses.correct,
        incorrect: progress.responses.incorrect,
        averageHesitation: Math.round(progress.responses.hesitation / progress.gamesPlayed),
        decisionStyle: this.analyzeDecisionStyle(progress.responses.patterns)
      },
      safetyTrends: this.analyzeSafetyTrends(progress.safetyScore.trends),
      flaggedIssues: progress.flaggedIssues,
      recommendations: progress.recommendations,
      discussionPoints: progress.discussionPoints
    };
  },

  // Analyze decision-making style
  analyzeDecisionStyle(patterns) {
    const total = patterns.quickDecisions + patterns.thoughtfulDecisions + patterns.unsureDecisions;
    const quickPercent = (patterns.quickDecisions / total) * 100;
    const thoughtfulPercent = (patterns.thoughtfulDecisions / total) * 100;
    
    if (quickPercent > 60) return "Quick Decision Maker";
    if (thoughtfulPercent > 60) return "Thoughtful Decision Maker";
    return "Balanced Decision Maker";
  },

  // Analyze safety score trends
  analyzeSafetyTrends(trends) {
    if (trends.length < 2) return "Not enough data";
    
    const recentTrend = trends.slice(-2);
    const change = recentTrend[1].score - recentTrend[0].score;
    
    if (change > 5) return "Improving";
    if (change < -5) return "Needs Attention";
    return "Stable";
  }
};

// AI Coach System - Updated for real-world scenarios
const aiCoach = {
  // Age-specific responses
  ageResponses: {
    child: {
      encouragement: [
        "Great job making safe choices!",
        "You're becoming a cybersecurity expert!",
        "Excellent decision to ask for help!",
        "Smart thinking about online safety!",
        "You're learning to stay safe online!"
      ],
      tips: [
        "Remember to always tell a parent about strange messages",
        "Never share personal information online",
        "If something feels wrong, it's okay to say no",
        "Always ask a parent before accepting friend requests",
        "Keep your personal information private"
      ]
    },
    teen: {
      encouragement: [
        "Excellent online safety awareness!",
        "Great job protecting your privacy!",
        "Smart decision to report that!",
        "You're showing good digital judgment!",
        "Perfect response to that situation!"
      ],
      tips: [
        "Remember to check privacy settings regularly",
        "Think before sharing anything online",
        "Be careful with location sharing",
        "Report any suspicious behavior",
        "Keep your accounts secure"
      ]
    }
  },

  // Get appropriate response based on scenario
  getResponse(ageGroup, context, scenario, response) {
    const responses = this.ageResponses[ageGroup];
    let message = '';

    switch(context) {
      case 'correct_choice':
        message = responses.encouragement[Math.floor(Math.random() * responses.encouragement.length)];
        break;
      case 'incorrect_choice':
        message = `Let's think about this: ${scenario.description}. The safest choice is to ${scenario.correctAction}.`;
        break;
      case 'hesitation':
        message = "Remember, it's always okay to ask for help if you're unsure!";
        break;
      default:
        message = responses.tips[Math.floor(Math.random() * responses.tips.length)];
    }

    return message;
  }
};

// Initialize game
function initGame() {
  // Load saved state
  const savedState = localStorage.getItem('gameState');
  if (savedState) {
    gameState = JSON.parse(savedState);
    updateUI();
  }

  // Show game container
  gameContainer.style.display = 'block';
  startButton.style.display = 'none';
}

// Update UI elements
function updateUI() {
  coinsDisplay.textContent = gameState.coins;
  levelDisplay.textContent = `Level ${gameState.level}`;
  highScoreDisplay.textContent = gameState.highScore;
}

// Save game state
function saveGameState() {
  localStorage.setItem('gameState', JSON.stringify(gameState));
}

// Show notification
function showNotification(title, message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'notification-prompt';
  
  const icon = type === 'info' ? 'ℹ️' : type === 'success' ? '✅' : '⚠️';
  
  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Event listeners
startButton.addEventListener('click', initGame);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Check if service worker is supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(err => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }

  // Initialize UI
  updateUI();
  
  // Show welcome notification
  showNotification(
    'Welcome to Cyber Cat!',
    'Defend the digital world from viruses and collect shields!',
    'info'
  );
});

// Enhanced installation prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show prompt after short delay
  setTimeout(() => {
    if (!isInstallPromptShown) {
      installPrompt.classList.remove('hidden');
      isInstallPromptShown = true;
    }
  }, 3000);
});

// Enhanced notification request
function requestNotificationPermission() {
  if ('Notification' in window) {
    // Show our custom UI first
    notificationPrompt.classList.remove('hidden');
    
    // Handle our custom buttons
    document.getElementById('notificationAccept').addEventListener('click', () => {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Schedule a welcome notification
          setTimeout(() => {
            new Notification('Welcome to Cyber Cat!', {
              body: 'You\'ll receive helpful security tips and progress updates!',
              icon: 'cyber_cat.png'
            });
          }, 1000);
          
          // Schedule periodic tips
          setInterval(() => {
            if (Notification.permission === 'granted') {
              const tips = [
                'Remember to use strong, unique passwords!',
                'Have you checked your privacy settings recently?',
                'Keep your apps and devices updated for security!'
              ];
              new Notification('Cyber Cat Tip', {
                body: tips[Math.floor(Math.random() * tips.length)],
                icon: 'cyber_cat.png'
              });
            }
          }, 3600000); // Every hour
        }
      });
      notificationPrompt.classList.add('hidden');
    });
    
    document.getElementById('notificationDismiss').addEventListener('click', () => {
      notificationPrompt.classList.add('hidden');
    });
  }
}

// Update the DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', () => {
  loadModel(); 
  nameScreen.classList.add('hidden');
  ageScreen.classList.add('hidden');
  chatScreen.classList.add('hidden');
  parentDashboard.classList.add('hidden');
  userDashboard.classList.add('hidden');
  
  // Start tracking session time
  startTime = new Date();
  
  // Immediately show install prompt if available
  setTimeout(() => {
    if (deferredPrompt && !isInstallPromptShown) {
      installPrompt.classList.remove('hidden');
      isInstallPromptShown = true;
    }
  }, 3000);
  
  // Show notification prompt after animations
  setTimeout(() => {
    if (!isNotificationPromptShown && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      notificationPrompt.classList.remove('hidden');
      isNotificationPromptShown = true;
    }
  }, 5000);
  
  // Initialize event listeners
  initializeEventListeners();
});

// Initialize all event listeners
function initializeEventListeners() {
  // Welcome screen buttons
  normalUserBtn.addEventListener('click', () => {
    userMode = 'normal';
    transitionToScreen(welcomeScreen, nameScreen);
  });
  
  parentBtn.addEventListener('click', () => {
    userMode = 'parent';
    transitionToScreen(welcomeScreen, nameScreen);
  });
  
  // Name input keypress
  nameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && nameInput.value.trim() !== '') {
      handleNameSubmit();
    }
  });
  
  // Age buttons
  document.querySelectorAll('.age-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.age-button').forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      selectedAge = button.getAttribute('data-age');
      ageSubmitBtn.classList.remove('disabled');
    });
  });
  
  // Age submit button
  ageSubmitBtn.addEventListener('click', () => {
    if (selectedAge) {
      userAgeGroup = selectedAge;
      handleAgeSubmit();
    }
  });
  
  // Chat buttons
  chatButton.addEventListener('click', () => {
    transitionToScreen(userDashboard, chatScreen);
  });
  
  parentChatBtn.addEventListener('click', () => {
    transitionToScreen(parentDashboard, chatScreen);
    initializeChatForParent();
  });
  
  // Mission cards
  missionCards.forEach(card => {
    const missionId = card.getAttribute('data-mission');
    const actionBtn = card.querySelector('.mission-action');
    
    actionBtn.addEventListener('click', () => {
      startMission(missionId);
    });
  });
  
  // Install banner
  document.getElementById('installBannerBtn').addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
      });
      installBanner.classList.add('hidden');
    }
  });
  
  document.getElementById('closeBanner').addEventListener('click', () => {
    installBanner.classList.add('hidden');
  });
  
  // Notification prompt
  document.getElementById('notificationAccept').addEventListener('click', () => {
    requestNotificationPermission();
    notificationPrompt.classList.add('hidden');
  });
  
  document.getElementById('notificationDismiss').addEventListener('click', () => {
    notificationPrompt.classList.add('hidden');
  });
  
  // Install prompt
  document.getElementById('installButton').addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
      });
      installPrompt.classList.add('hidden');
    }
  });
  
  document.getElementById('closeInstall').addEventListener('click', () => {
    installPrompt.classList.add('hidden');
  });
}

// Handle name submission
function handleNameSubmit() {
  userName = nameInput.value.trim();
  
  if (!userName) {
    showError('nameError', 'Please enter your name');
    return;
  }
  
  // Sanitize user input to prevent XSS
  const sanitizedName = document.createElement('div');
  sanitizedName.textContent = userName;
  userName = sanitizedName.innerHTML;
  
  // Transition to age screen
  transitionToScreen(nameScreen, ageScreen);
}

// Handle age submission
function handleAgeSubmit() {
  if (userMode === 'parent') {
    // Show parent dashboard
    transitionToScreen(ageScreen, parentDashboard);
    initializeParentDashboard();
  } else {
    // Show user dashboard
    transitionToScreen(ageScreen, userDashboard);
    initializeUserDashboard();
  }
}

// Initialize parent dashboard
function initializeParentDashboard() {
  const score = calculateChildScore();
  const completed = countCompletedMissions();
  const time = calculateTimeSpent();
  
  parentScoreDisplay.textContent = `${score}/100`;
  parentProgressBar.style.width = `${score}%`;
  missionsCompleted.textContent = `${completed}/5`;
  missionProgressBar.style.width = `${(completed / 5) * 100}%`;
  timeSpent.textContent = `${time} min`;
  
  // Add animation
  parentProgressBar.classList.add('progress-animate');
  missionProgressBar.classList.add('progress-animate');
  
  setTimeout(() => {
    parentProgressBar.classList.remove('progress-animate');
    missionProgressBar.classList.remove('progress-animate');
  }, 1000);
}

// Initialize user dashboard
function initializeUserDashboard() {
  // Set user name and avatar based on age group
  let avatarSrc = '';
  
  if (userAgeGroup === 'child') {
    avatarSrc = 'cyber_cat_kid.png';
  } else if (userAgeGroup === 'teen') {
    avatarSrc = 'cyber_cat_teen.png';
  } else if (userAgeGroup === 'adult') {
    avatarSrc = 'cyber_cat.png';
  } else {
    avatarSrc = 'cyber_cat_senior.png';
  }
  
  document.getElementById('dashboardAvatar').src = avatarSrc;
  
  // Initialize security score
  updateScore(5);
}

// Initialize chat for parent
function initializeChatForParent() {
  // Set chat avatar
  document.getElementById('chatAvatar').src = 'cyber_cat.png';
  
  // Clear previous messages
  chatDiv.innerHTML = '';
  
  // Add initial message
  addBotMessage("Hello! I'm Cyber Cat, your security assistant. I'm here to help you set up and monitor your child's online safety. What would you like to know about?");
  
  // Add suggestion buttons
  const suggestions = document.createElement('div');
  suggestions.className = 'suggestion-buttons';
  suggestions.innerHTML = `
    <button onclick="handleParentSuggestion('settings')">Safety Settings</button>
    <button onclick="handleParentSuggestion('monitoring')">Monitoring Tips</button>
    <button onclick="handleParentSuggestion('conversations')">Having Security Conversations</button>
  `;
  
  chatDiv.appendChild(suggestions);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Handle parent suggestion clicks
function handleParentSuggestion(type) {
  // Remove suggestion buttons
  const suggestions = document.querySelector('.suggestion-buttons');
  if (suggestions) {
    suggestions.remove();
  }
  
  // Add user message
  const messageText = {
    'settings': "Tell me about safety settings for my child.",
    'monitoring': "What are some good monitoring practices?",
    'conversations': "How can I talk to my child about online safety?"
  }[type];
  
  addUserMessage(messageText);
  
  // Show thinking animation
  addThinkingAnimation();
  
  // Generate response after a short delay
  setTimeout(() => {
    // Remove thinking animation
    const thinkingElement = document.querySelector('.thinking');
    if (thinkingElement) {
      thinkingElement.remove();
    }
    
    // Display response based on type
    let response = '';
    
    if (type === 'settings') {
      response = "Here are some effective safety settings for your child:\n\n" +
                "1. Enable parental controls on all devices (phones, tablets, computers, gaming consoles)\n" +
                "2. Use content filters to block inappropriate websites and content\n" +
                "3. Set up app store restrictions to prevent unauthorized downloads\n" +
                "4. Enable safe search on search engines\n" +
                "5. Set screen time limits and device curfews\n" +
                "6. Consider using a family-focused router with built-in protections\n\n" +
                "Remember to update these settings as your child grows and gains more digital maturity.";
    } else if (type === 'monitoring') {
      response = "Effective monitoring balances safety with privacy and trust:\n\n" +
                "1. Keep devices in common areas of the home, not in bedrooms\n" +
                "2. Regularly check browsing history and app usage together with your child\n" +
                "3. Friend/follow your child on social media (with their knowledge)\n" +
                "4. Use monitoring tools appropriate for your child's age\n" +
                "5. Establish check-in times for discussing online activities\n" +
                "6. Watch for warning signs like secrecy or anxiety around devices\n\n" +
                "As your child gets older, gradually adjust monitoring to respect their growing independence.";
    } else {
      response = "Here's how to have effective cybersecurity conversations with your child:\n\n" +
                "1. Start early and keep conversations age-appropriate\n" +
                "2. Focus on open communication rather than fear\n" +
                "3. Use real-life examples they can relate to\n" +
                "4. Establish clear rules and consequences\n" +
                "5. Be a good digital role model yourself\n" +
                "6. Create a safe space where they can come to you if they encounter problems\n" +
                "7. Praise good digital decisions\n\n" +
                "Remember, the goal is to teach critical thinking skills, not just rules.";
    }
    
    addBotMessage(response);
    
    // Add follow-up suggestion buttons
    const newSuggestions = document.createElement('div');
    newSuggestions.className = 'suggestion-buttons';
    newSuggestions.innerHTML = `
      <button onclick="handleParentSuggestion('settings')">Safety Settings</button>
      <button onclick="handleParentSuggestion('monitoring')">Monitoring Tips</button>
      <button onclick="handleParentSuggestion('conversations')">Having Security Conversations</button>
    `;
    
    chatDiv.appendChild(newSuggestions);
    chatDiv.scrollTop = chatDiv.scrollHeight;
  }, 1500);
}

// Start mission
function startMission(missionId) {
  // Set active mission
  activeMission = missionId;
  
  // Transition to chat screen
  transitionToScreen(userDashboard, chatScreen);
  
  // Initialize chat for mission
  initializeChatForMission(missionId);
}

// Initialize chat for mission
function initializeChatForMission(missionId) {
  // Set chat avatar based on age group
  let avatarSrc = '';
  
  if (userAgeGroup === 'child') {
    avatarSrc = 'cyber_cat_kid.png';
  } else if (userAgeGroup === 'teen') {
    avatarSrc = 'cyber_cat_teen.png';
  } else if (userAgeGroup === 'adult') {
    avatarSrc = 'cyber_cat.png';
  } else {
    avatarSrc = 'cyber_cat_senior.png';
  }
  
  document.getElementById('chatAvatar').src = avatarSrc;
  
  // Clear previous messages
  chatDiv.innerHTML = '';
  
  // Add mission intro
  const mission = missions[missionId];
  let intro = '';
  
  if (missionId === 'passwords') {
    intro = `Welcome to the Password Protector mission, ${userName}! Strong passwords are your first line of defense online. Let's see how we can improve your password security.`;
  } else if (missionId === 'privacy') {
    intro = `Hello ${userName}! In this Privacy Guardian mission, we'll explore how to protect your personal information online and control what others can see about you.`;
  } else if (missionId === 'phishing') {
    intro = `Ready to become a Phishing Detective, ${userName}? Phishing attacks try to trick you into revealing personal information. Let's learn how to spot and avoid them!`;
  } else if (missionId === 'updates') {
    intro = `Welcome to the Update Master mission, ${userName}! Regular updates are crucial for security. Let's discover why they matter and how to stay updated.`;
  } else if (missionId === 'online_safety') {
    intro = `Hi ${userName}! In this Safe Explorer mission, we'll learn how to navigate the web safely and recognize potential dangers before they become problems.`;
  }
  
  addBotMessage(intro);
  
  // Start first task after a short delay
  setTimeout(() => {
    startMissionTask(missionId, 0);
  }, 1500);
}

// Start mission task
function startMissionTask(missionId, taskIndex) {
  const mission = missions[missionId];
  
  if (taskIndex >= mission.tasks.length) {
    // Mission completed
    completeMission(missionId);
    return;
  }
  
  const task = mission.tasks[taskIndex];
  
  // Ask task question
  addBotMessage(task.title);
  
  // Add response buttons
  const responseButtons = document.createElement('div');
  responseButtons.className = 'response-buttons';
  responseButtons.innerHTML = `
    <button onclick="handleMissionResponse('${missionId}', ${taskIndex}, 'yes')">Yes</button>
    <button onclick="handleMissionResponse('${missionId}', ${taskIndex}, 'no')">No</button>
    <button onclick="handleMissionResponse('${missionId}', ${taskIndex}, 'not_sure')">Not Sure</button>
  `;
  
  chatDiv.appendChild(responseButtons);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Handle mission response
function handleMissionResponse(missionId, taskIndex, response) {
  // Remove response buttons
  const responseButtons = document.querySelector('.response-buttons');
  if (responseButtons) {
    responseButtons.remove();
  }
  
  // Display user's response
  const responseText = {
    'yes': "Yes, I do!",
    'no': "No, not really.",
    'not_sure': "I'm not sure."
  }[response];
  
  addUserMessage(responseText);
  
  // Show thinking animation
  addThinkingAnimation();
  
  // Generate response after a short delay
  setTimeout(() => {
    // Remove thinking animation
    const thinkingElement = document.querySelector('.thinking');
    if (thinkingElement) {
      thinkingElement.remove();
    }
    
    // Mark task as completed
    missions[missionId].tasks[taskIndex].completed = true;
    
    // Calculate mission progress
    const completedTasks = missions[missionId].tasks.filter(task => task.completed).length;
    const totalTasks = missions[missionId].tasks.length;
    missions[missionId].progress = Math.floor((completedTasks / totalTasks) * 100);
    
    // Update security score
    updateScore(10);
    
    // Get tips based on the response and age group
    let tips = missions[missionId].tips[userAgeGroup] || missions[missionId].tips.adult;
    let tip = tips[taskIndex % tips.length];
    
    let response = '';
    
    if (responseText === "Yes, I do!") {
      response = `That's great! ${tip}`;
    } else if (responseText === "No, not really.") {
      response = `That's okay, this is a good opportunity to improve. ${tip}`;
    } else {
      response = `Let me help you understand this better. ${tip}`;
    }
    
    addBotMessage(response);
    
    // Move to next task after a delay
    setTimeout(() => {
      startMissionTask(missionId, taskIndex + 1);
    }, 2000);
  }, 1500);
}

// Complete mission
function completeMission(missionId) {
  // Update the mission card
  completedMissions++;
  
  // Show mission completion message
  addBotMessage(`Congratulations, ${userName}! You've completed the ${missions[missionId].title} mission! Your security knowledge is growing stronger. 🎉`);
  
  // Add suggestion buttons
  const suggestions = document.createElement('div');
  suggestions.className = 'suggestion-buttons';
  suggestions.innerHTML = `
    <button onclick="returnToDashboard()">Return to Dashboard</button>
    <button onclick="startRandomMission()">Try Another Mission</button>
  `;
  
  chatDiv.appendChild(suggestions);
  chatDiv.scrollTop = chatDiv.scrollHeight;
  
  // Update mission card in dashboard
  updateMissionCard(missionId);
}

// Update mission card in dashboard
function updateMissionCard(missionId) {
  const missionCard = document.querySelector(`.mission-card[data-mission="${missionId}"]`);
  if (!missionCard) return;
  
  const progressBar = missionCard.querySelector('.mission-progress-bar');
  const statusText = missionCard.querySelector('.mission-status span:first-child');
  const tasksText = missionCard.querySelector('.mission-status span:last-child');
  const actionButton = missionCard.querySelector('.mission-action');
  
  const mission = missions[missionId];
  const completedTasks = mission.tasks.filter(task => task.completed).length;
  const totalTasks = mission.tasks.length;
  const progress = Math.floor((completedTasks / totalTasks) * 100);
  
  progressBar.style.width = `${progress}%`;
  statusText.textContent = `${progress}% ${progress === 100 ? '🎉' : '🚧'}`;
  tasksText.textContent = `${completedTasks}/${totalTasks} ${completedTasks === totalTasks ? '✅' : '📝'}`;
  
  if (progress === 100) {
    actionButton.textContent = 'Completed';
    actionButton.classList.add('completed');
  }
}

// Start a random mission
function startRandomMission() {
  const missionKeys = Object.keys(missions);
  const availableMissions = missionKeys.filter(key => {
    return missions[key].progress < 100;
  });
  
  if (availableMissions.length === 0) {
    addBotMessage("Amazing! You've completed all the security missions. You're now a cybersecurity expert! 🏆");
    
    setTimeout(() => {
      returnToDashboard();
    }, 2000);
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * availableMissions.length);
  const randomMission = availableMissions[randomIndex];
  
  startMission(randomMission);
}

// Return to dashboard
function returnToDashboard() {
  transitionToScreen(chatScreen, userDashboard);
}

// Show error message
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  
  setTimeout(() => {
    errorElement.classList.add('hidden');
  }, 3000);
}

// Transition between screens
function transitionToScreen(fromScreen, toScreen) {
  fromScreen.classList.add('fade-out');
  
  setTimeout(() => {
    fromScreen.classList.add('hidden');
    fromScreen.classList.remove('fade-out');
    
    toScreen.classList.add('fade-in');
    toScreen.classList.remove('hidden');
    
    setTimeout(() => {
      toScreen.classList.remove('fade-in');
    }, 300);
  }, 300);
}

// Add bot message to chat
function addBotMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot-message';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = `<img src="${document.getElementById('chatAvatar').src}" alt="Cyber Cat">`;
  
  const content = document.createElement('div');
  content.className = 'message-content';
  
  // Convert newlines to <br> tags
  const formattedMessage = message.replace(/\n/g, '<br>');
  content.innerHTML = formattedMessage;
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  chatDiv.appendChild(messageDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Add user message to chat
function addUserMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = message;
  
  messageDiv.appendChild(content);
  
  chatDiv.appendChild(messageDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Add thinking animation
function addThinkingAnimation() {
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message bot-message thinking';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = `<img src="${document.getElementById('chatAvatar').src}" alt="Cyber Cat">`;
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  
  thinkingDiv.appendChild(avatar);
  thinkingDiv.appendChild(content);
  
  chatDiv.appendChild(thinkingDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Update security score
function updateScore(increment) {
  securityScore += increment;
  if (securityScore > 100) securityScore = 100;
  
  const scorePercentage = securityScore;
  
  // Update score displays
  scoreDisplay.textContent = `${scorePercentage}/100`;
  dashboardScore.textContent = `${scorePercentage}/100`;
  
  // Update progress bars with animation
  progressBar.style.width = `${scorePercentage}%`;
  dashboardProgress.style.width = `${scorePercentage}%`;
  
  progressBar.classList.add('progress-animate');
  dashboardProgress.classList.add('progress-animate');
  
  setTimeout(() => {
    progressBar.classList.remove('progress-animate');
    dashboardProgress.classList.remove('progress-animate');
  }, 1000);
}

// Load TensorFlow.js QnA model
async function loadModel() {
  try {
    console.log('Loading TensorFlow.js QnA model...');
    model = await qna.load();
    console.log('Model loaded successfully');
  } catch (error) {
    console.error('Error loading model:', error);
  }
}

// Enhanced AI response system
async function getAnswer(question) {
  // First try to match with mission content
  const missionMatch = findAnswerInMissions(question);
  if (missionMatch) return missionMatch;
  
  // Then try to categorize the question
  const category = categorizeQuestion(question);
  const ageSpecificTips = getAgeSpecificTips(category);
  
  // If we have good tips, use them
  if (ageSpecificTips && ageSpecificTips.length > 0) {
    return formatResponse(question, ageSpecificTips);
  }
  
  // Final fallback
  return getFallbackResponse(category);
}

function findAnswerInMissions(question) {
  const questionLower = question.toLowerCase();
  
  // Search through all missions and tasks
  for (const missionKey in missions) {
    const mission = missions[missionKey];
    
    // Check mission title
    if (mission.title.toLowerCase().includes(questionLower)) {
      const tips = mission.tips[userAgeGroup] || mission.tips.adult;
      return `About ${mission.title}: ${tips[0]}`;
    }
    
    // Check tasks
    for (const task of mission.tasks) {
      if (task.title.toLowerCase().includes(questionLower)) {
        const tips = mission.tips[userAgeGroup] || mission.tips.adult;
        return `For "${task.title}": ${tips[Math.floor(Math.random() * tips.length)]}`;
      }
    }
  }
  
  return null;
}

function categorizeQuestion(question) {
  const questionLower = question.toLowerCase();
  const categories = {
    passwords: ['password', 'login', 'account', 'secure'],
    privacy: ['privacy', 'data', 'information', 'personal'],
    phishing: ['phish', 'scam', 'email', 'click', 'link'],
    updates: ['update', 'software', 'app', 'patch'],
    social: ['social', 'media', 'facebook', 'instagram', 'tiktok'],
    general: ['safe', 'security', 'protect', 'internet']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => questionLower.includes(keyword))) {
      return category;
    }
  }
  
  return 'general';
}

function getAgeSpecificTips(category) {
  // Check if we have fallback responses for this category
  if (fallbackResponses[userAgeGroup] && fallbackResponses[userAgeGroup][category]) {
    return fallbackResponses[userAgeGroup][category];
  }
  
  // Check mission tips
  for (const mission of Object.values(missions)) {
    if (mission.title.toLowerCase().includes(category) && mission.tips[userAgeGroup]) {
      return mission.tips[userAgeGroup];
    }
  }
  
  return null;
}

function formatResponse(question, tips) {
  const responses = [
    `For "${question}", here's what you should know: ${tips[0]}`,
    `Great question! ${tips[Math.floor(Math.random() * tips.length)]}`,
    `About that: ${tips[Math.floor(Math.random() * tips.length)]}`,
    `Security tip: ${tips[Math.floor(Math.random() * tips.length)]}`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function getFallbackResponse(category) {
  const genericTips = {
    passwords: "A strong password should be unique and hard to guess. Consider using a password manager!",
    privacy: "Always think before sharing personal information online. Less is more when it comes to privacy.",
    phishing: "If an email or message seems suspicious, don't click any links. Verify with the sender directly.",
    updates: "Keeping your software updated is one of the best ways to stay secure online.",
    social: "Be mindful of what you share on social media. Once it's online, it's hard to take back.",
    general: "Online security is about being careful and thinking before you act. When in doubt, ask for help!"
  };
  
  return genericTips[category] || 
    "That's an interesting question! Cybersecurity is all about being careful and thinking before you act online.";
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
        // Send a welcome notification
        setTimeout(() => {
          new Notification('Welcome to Cyber Cat!', {
            body: 'Thank you for enabling notifications. I\'ll send you security tips and reminders!',
            icon: 'cyber_cat.png'
          });
        }, 1000);
      }
    });
  }
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}

// PWA installation prompt
window.addEventListener('beforeinstallprompt', e => {
  // Prevent the default install prompt
  e.preventDefault();
  
  // Save the event for later use
  deferredPrompt = e;
  
  // Show custom install prompt after a delay
  setTimeout(() => {
    if (!isInstallPromptShown) {
      installPrompt.classList.remove('hidden');
      isInstallPromptShown = true;
    }
  }, 60000); // Show after 1 minute of using the app
});

// Handle keyboard input for chat
document.addEventListener('keydown', function(e) {
  // Check if chat screen is visible and input is focused
  const chatInputBox = document.getElementById('chatInput');
  
  if (!chatScreen.classList.contains('hidden') && chatInputBox === document.activeElement && e.key === 'Enter') {
    e.preventDefault();
    sendUserMessage();
  }
});

// Add chat input functionality
function initializeChatInput() {
  // Create chat input form if it doesn't exist
  if (!document.getElementById('chatInputForm')) {
    const inputForm = document.createElement('form');
    inputForm.id = 'chatInputForm';
    inputForm.className = 'chat-input-form';
    
    inputForm.innerHTML = `
      <input type="text" id="chatInput" placeholder="Type your security question...">
      <button type="submit" id="sendButton">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    `;
    
    chatScreen.querySelector('.chat-container').appendChild(inputForm);
    
    // Add event listener
    inputForm.addEventListener('submit', e => {
      e.preventDefault();
      sendUserMessage();
    });
  }
}

// Send user message
function sendUserMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();
  
  if (message === '') return;
  
  // Add user message to chat
  addUserMessage(message);
  
  // Clear input
  chatInput.value = '';
  
  // Show thinking animation
  addThinkingAnimation();
  
  // Get response after a short delay
  setTimeout(async () => {
    // Remove thinking animation
    const thinkingElement = document.querySelector('.thinking');
    if (thinkingElement) {
      thinkingElement.remove();
    }
    
    // Get response from model
    const response = await getAnswer(message);
    
    // Add bot response
    addBotMessage(response);
    
    // Update security score for asking a question
    updateScore(1);
    
    // Return focus to input
    chatInput.focus();
  }, 1500);
}

// Track activity time
setInterval(() => {
  if (startTime) {
    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 60000); // in minutes
    
    // Update time spent if parent dashboard is visible
    if (!parentDashboard.classList.contains('hidden')) {
      timeSpent.textContent = `${timeElapsed} min`;
    }
  }
}, 60000); // Update every minute

// Initialize chat input when switching to chat screen
const chatScreenObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      if (!chatScreen.classList.contains('hidden')) {
        initializeChatInput();
        document.getElementById('chatInput').focus();
      }
    }
  });
});

chatScreenObserver.observe(chatScreen, { attributes: true });

// Initialize global event handlers for the chat functionality
document.addEventListener('click', (e) => {
  // Handle clicks outside any specific handlers
  if (e.target.closest('.mission-card')) {
    const card = e.target.closest('.mission-card');
    const missionId = card.getAttribute('data-mission');
    
    // Handle case where the click wasn't on the button but elsewhere on the card
    if (!e.target.closest('.mission-action')) {
      // Toggle mission details or similar action
      card.classList.toggle('expanded');
    }
  }
});

function initializeParentDashboard() {
  // Set up initial data
  const score = calculateChildScore();
  const completed = countCompletedMissions();
  const time = calculateTimeSpent();
  
  // Update UI
  parentScoreDisplay.textContent = `${score}/100`;
  parentProgressBar.style.width = `${score}%`;
  missionsCompleted.textContent = `${completed}/${Object.keys(missions).length}`;
  missionProgressBar.style.width = `${(completed / Object.keys(missions).length) * 100}%`;
  timeSpent.textContent = `${time} min`;
  
  // Add animation
  parentProgressBar.classList.add('progress-animate');
  missionProgressBar.classList.add('progress-animate');
  
  setTimeout(() => {
    parentProgressBar.classList.remove('progress-animate');
    missionProgressBar.classList.remove('progress-animate');
  }, 1000);
  
  // Generate risk assessment
  generateRiskAssessment();
}

function calculateChildScore() {
  let totalPossible = 0;
  let earned = 0;
  
  for (const mission of Object.values(missions)) {
    totalPossible += mission.tasks.length * 10;
    earned += mission.tasks.filter(t => t.completed).length * 10;
  }
  
  return Math.floor((earned / totalPossible) * 100) || 0;
}

function countCompletedMissions() {
  return Object.values(missions).filter(mission => 
    mission.tasks.every(task => task.completed)
  ).length;
}

function generateRiskAssessment() {
  const riskList = document.querySelector('.risk-list');
  riskList.innerHTML = '';
  
  // Generate risks based on incomplete missions
  for (const [missionId, mission] of Object.entries(missions)) {
    const incompleteTasks = mission.tasks.filter(t => !t.completed);
    if (incompleteTasks.length > 0) {
      const riskLevel = Math.random() > 0.7 ? 'high' : (Math.random() > 0.4 ? 'medium' : 'low');
      const riskItem = document.createElement('li');
      riskItem.className = `risk-item risk-${riskLevel}`;
      
      riskItem.innerHTML = `
        <div class="risk-header">
          <span class="risk-title">${mission.title}</span>
          <span class="risk-badge badge-${riskLevel}">${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk</span>
        </div>
        <p>Your child hasn't completed ${incompleteTasks.length} of ${mission.tasks.length} tasks in this area. 
        ${getParentSuggestion(missionId, riskLevel)}</p>
      `;
      
      riskList.appendChild(riskItem);
    }
  }
}

function getParentSuggestion(missionId, riskLevel) {
  const suggestions = {
    passwords: {
      high: "Consider discussing password security and setting up a family password manager.",
      medium: "Review password practices together and enable two-factor authentication where possible.",
      low: "A quick reminder about password security might be helpful."
    },
    privacy: {
      high: "Have a conversation about what information should stay private online.",
      medium: "Review privacy settings on their devices and social media accounts together.",
      low: "A gentle reminder about privacy might be appropriate."
    },
    phishing: {
      high: "This is critical - practice identifying phishing attempts with real examples.",
      medium: "Share some recent phishing examples and discuss how to spot them.",
      low: "Consider a quick refresher on phishing awareness."
    },
    updates: {
      high: "Help them set up automatic updates on all their devices.",
      medium: "Check if their devices and apps are up to date together.",
      low: "A reminder about the importance of updates might help."
    },
    online_safety: {
      high: "Discuss safe browsing habits and consider enabling content filters.",
      medium: "Review their browsing history together and discuss safe sites.",
      low: "A quick chat about online safety could be beneficial."
    }
  };
  
  return suggestions[missionId]?.[riskLevel] || "This is an important area to discuss with your child.";
}

function calculateTimeSpent() {
  return Math.floor((new Date() - startTime) / 60000); // Minutes
}

// Navigation
function navigateTo(screenId) {
  screens.forEach(screen => {
    screen.classList.add('hidden');
  });
  document.getElementById(`${screenId}Screen`).classList.remove('hidden');
  gameState.currentScreen = screenId;
  
  // Update active nav link
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.screen === screenId) {
      link.classList.add('active');
    }
  });
}

// Parent Setup Flow
function initializeParentSetup() {
  const setupSteps = document.querySelectorAll('.setup-step');
  let currentStep = 0;
  
  document.getElementById('submitName').addEventListener('click', () => {
    const childName = document.getElementById('childName').value.trim();
    if (childName) {
      gameState.childProfile = { name: childName };
      setupSteps[currentStep].classList.remove('active');
      setupSteps[++currentStep].classList.add('active');
    }
  });
  
  document.getElementById('submitAge').addEventListener('click', () => {
    const childAge = document.getElementById('childAge').value;
    if (childAge) {
      gameState.childProfile.age = childAge;
      setupSteps[currentStep].classList.remove('active');
      setupSteps[++currentStep].classList.add('active');
    }
  });
  
  document.getElementById('startLearning').addEventListener('click', () => {
    navigateTo('missions');
  });
}

// Mission System
function initializeMissions() {
  missionsGrid.innerHTML = '';
  
  Object.entries(missions).forEach(([id, mission]) => {
    const missionCard = document.createElement('div');
    missionCard.className = 'mission-card';
    missionCard.dataset.mission = id;
    
    const progress = calculateMissionProgress(id);
    
    missionCard.innerHTML = `
      <div class="mission-icon">${getMissionIcon(id)}</div>
      <div class="mission-content">
        <h3>${mission.title}</h3>
        <p>${mission.description}</p>
        <div class="mission-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${progress}%</span>
        </div>
        <button class="mission-start">Start Mission</button>
      </div>
    `;
    
    missionCard.querySelector('.mission-start').addEventListener('click', () => {
      startMission(id);
    });
    
    missionsGrid.appendChild(missionCard);
  });
}

function calculateMissionProgress(missionId) {
  const mission = missions[missionId];
  const completedTasks = mission.tasks.filter(task => task.completed).length;
  return Math.round((completedTasks / mission.tasks.length) * 100);
}

function getMissionIcon(missionId) {
  const icons = {
    passwords: '🔑',
    privacy: '🛡️',
    phishing: '🎣'
  };
  return icons[missionId] || '🎯';
}

function startMission(missionId) {
  const mission = missions[missionId];
  navigateTo('chat');
  
  // Add mission introduction
  addMessage(`Let's start the ${mission.title} mission!`, 'ai');
  addMessage(mission.description, 'ai');
  
  // Show first task
  const currentTask = mission.tasks.find(task => !task.completed);
  if (currentTask) {
    addMessage(`Task: ${currentTask.title}`, 'ai');
    addMessage(currentTask.description, 'ai');
  }
}

// XP and Level System
function addXP(amount) {
  gameState.xp += amount;
  
  // Check for level up
  while (gameState.xp >= gameState.xpToNextLevel) {
    levelUp();
  }
  
  updateXPBar();
}

function levelUp() {
  gameState.level++;
  gameState.xp -= gameState.xpToNextLevel;
  gameState.xpToNextLevel = Math.floor(gameState.xpToNextLevel * 1.5);
  
  // Show level up animation
  const levelBadge = document.querySelector('.level-badge');
  levelBadge.classList.add('level-up');
  setTimeout(() => levelBadge.classList.remove('level-up'), 500);
  
  // Update level display
  document.querySelector('.level-text').textContent = `Level ${gameState.level}`;
  
  // Check for level-based achievements
  checkAchievements();
}

function updateXPBar() {
  const percentage = (gameState.xp / gameState.xpToNextLevel) * 100;
  xpBar.style.width = `${percentage}%`;
}

// Achievement System
function checkAchievements() {
  achievements.forEach(achievement => {
    if (!achievement.unlocked) {
      if (achievement.id === 'level_5' && gameState.level >= 5) {
        unlockAchievement(achievement);
      }
    }
  });
}

function unlockAchievement(achievement) {
  achievement.unlocked = true;
  showNotification('Achievement Unlocked!', achievement.title, 'success');
  
  // Add achievement to the list
  const achievementElement = document.createElement('div');
  achievementElement.className = 'achievement-badge';
  achievementElement.innerHTML = `
    <span class="achievement-icon">${achievement.icon}</span>
    <span class="achievement-title">${achievement.title}</span>
  `;
  
  // Add to achievements container
  const achievementsContainer = document.querySelector('.achievements-container');
  if (achievementsContainer) {
    achievementsContainer.appendChild(achievementElement);
  }
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
  
  addMessage(message, 'user');
  chatInput.value = '';
  
  // Simulate AI thinking
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

// AI Response System
function generateAIResponse(message) {
  // Simple keyword-based response system
  const keywords = {
    password: [
      "A strong password should be at least 12 characters long and include a mix of letters, numbers, and symbols.",
      "Never use the same password for multiple accounts. Consider using a password manager to help you remember them all.",
      "Two-factor authentication adds an extra layer of security to your accounts. You should enable it whenever possible."
    ],
    privacy: [
      "Review your social media privacy settings regularly to control who can see your information.",
      "Be careful about what personal information you share online. Once it's out there, it's hard to take back.",
      "Consider using privacy-focused tools like VPNs and encrypted messaging apps for sensitive communications."
    ],
    phishing: [
      "Phishing emails often create a sense of urgency or fear. Always verify the sender before clicking links.",
      "Look for spelling mistakes and suspicious email addresses - these are common signs of phishing attempts.",
      "Never share your passwords or personal information in response to an email or message."
    ]
  };
  
  // Find matching keywords
  for (const [keyword, responses] of Object.entries(keywords)) {
    if (message.toLowerCase().includes(keyword)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  
  // Default response
  return "I'm here to help you learn about cybersecurity. Try asking about passwords, privacy, or phishing!";
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
  // Initialize navigation
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navigateTo(link.dataset.screen);
    });
  });
  
  // Initialize systems
  initializeParentSetup();
  initializeMissions();
  initializeChat();
  
  // Start game button
  startGameBtn.addEventListener('click', () => {
    navigateTo('game');
    startGame();
  });
  
  // Show welcome notification
  showNotification(
    'Welcome to Cyber Cat!',
    'Defend the digital world from viruses and collect shields!',
    'info'
  );
});

// Update game stats
function updateGameStats(score, newCoins) {
  // Update coins
  gameState.coins += newCoins;
  coinsDisplay.textContent = gameState.coins;
  
  // Update XP
  gameState.xp += score;
  if (gameState.xp >= gameState.xpToNextLevel) {
    levelUp();
  }
  
  // Update XP bar
  const xpPercentage = (gameState.xp / gameState.xpToNextLevel) * 100;
  xpBar.style.width = `${xpPercentage}%`;
}

// Export functions for use in game.js
window.updateGameStats = updateGameStats;

// Initialize AI Coach and Parent Monitor
document.addEventListener('DOMContentLoaded', () => {
  // Set up AI coach for current user
  const userAgeGroup = localStorage.getItem('userAgeGroup') || 'child';
  window.currentAiCoach = {
    getResponse: (context, scenario, response) => 
      aiCoach.getResponse(userAgeGroup, context, scenario, response)
  };
  
  // Initialize parent monitoring if in parent mode
  if (localStorage.getItem('userMode') === 'parent') {
    const childId = localStorage.getItem('currentChildId');
    if (childId) {
      window.currentChildProgress = parentMonitor.trackProgress(childId);
    }
  }
});

// Export for use in game
window.securityScenarios = securityScenarios;
window.parentMonitor = parentMonitor;
window.aiCoach = aiCoach;