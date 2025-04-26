// Game Configuration
const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// Game Manager Class
class GameManager {
  constructor() {
    this.game = null;
    this.player = null;
    this.viruses = [];
    this.shields = [];
    this.score = 0;
    this.level = 1;
    this.coins = 0;
    this.gameActive = false;
    this.virusesDestroyed = 0;
    this.shieldsCollected = 0;
    this.scoreText = null;
    this.levelText = null;
    this.coinsText = null;
    this.startTime = null;
  }

  init() {
    try {
      this.game = new Phaser.Game(config);
      this.gameActive = true;
      this.startTime = Date.now();
      console.log('Game initialized successfully');
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.handleError('Failed to start the game. Please try again.');
    }
  }

  handleError(message) {
    console.error(message);
    showNotification('Error', message, 'error');
  }

  updateStats() {
    try {
      if (this.scoreText) this.scoreText.setText(`Score: ${this.score}`);
      if (this.levelText) this.levelText.setText(`Level: ${this.level}`);
      if (this.coinsText) this.coinsText.setText(`Coins: ${this.coins}`);
      
      // Update game state
      window.updateGameStats(this.score, this.coins);
    } catch (error) {
      this.handleError('Failed to update game stats');
    }
  }

  levelUp() {
    try {
      this.level++;
      this.updateStats();
      
      // Increase difficulty
      this.game.time.removeAllEvents();
      this.game.time.addEvent({
        delay: Math.max(500, 2000 - (this.level * 100)),
        callback: this.spawnVirus,
        callbackScope: this,
        loop: true
      });
      
      this.game.time.addEvent({
        delay: Math.max(1000, 5000 - (this.level * 200)),
        callback: this.spawnShield,
        callbackScope: this,
        loop: true
      });
      
      showNotification('Level Up!', `You've reached level ${this.level}!`, 'success');
    } catch (error) {
      this.handleError('Failed to process level up');
    }
  }

  gameOver() {
    try {
      this.gameActive = false;
      this.game.sound.play('gameover');
      
      // Calculate time spent
      const timeSpent = Math.floor((Date.now() - this.startTime) / 60000);
      
      // Update game state
      window.updateGameStats(this.score, this.coins);
      
      // Show game over screen
      this.showGameOverScreen();
      
      showNotification('Game Over', `Final Score: ${this.score}`, 'info');
    } catch (error) {
      this.handleError('Failed to process game over');
    }
  }

  showGameOverScreen() {
    try {
      // Create game over text
      const gameOverText = this.game.add.text(400, 300, 'Game Over!', {
        fontSize: '64px',
        fill: '#ff0000',
        fontFamily: 'Press Start 2P'
      });
      gameOverText.setOrigin(0.5);
      
      // Show final score
      const finalScoreText = this.game.add.text(400, 400, `Final Score: ${this.score}`, {
        fontSize: '32px',
        fill: '#fff',
        fontFamily: 'Press Start 2P'
      });
      finalScoreText.setOrigin(0.5);
      
      // Show restart button
      const restartButton = this.game.add.text(400, 500, 'Restart', {
        fontSize: '32px',
        fill: '#fff',
        fontFamily: 'Press Start 2P'
      });
      restartButton.setOrigin(0.5);
      restartButton.setInteractive();
      
      restartButton.on('pointerdown', () => this.restart());
    } catch (error) {
      this.handleError('Failed to show game over screen');
    }
  }

  restart() {
    try {
      // Reset game state
      this.score = 0;
      this.level = 1;
      this.viruses = [];
      this.shields = [];
      this.gameActive = true;
      this.startTime = Date.now();
      
      // Reset text displays
      this.updateStats();
      
      // Remove game over elements
      const gameOverElements = this.game.children.list.filter(child => 
        child.text === 'Game Over!' || 
        child.text === 'Restart' || 
        child.text.startsWith('Final Score:')
      );
      gameOverElements.forEach(element => element.destroy());
      
      // Restart spawners
      this.game.time.addEvent({
        delay: 2000,
        callback: this.spawnVirus,
        callbackScope: this,
        loop: true
      });
      
      this.game.time.addEvent({
        delay: 5000,
        callback: this.spawnShield,
        callbackScope: this,
        loop: true
      });
      
      showNotification('Game Restarted', 'Good luck!', 'info');
    } catch (error) {
      this.handleError('Failed to restart game');
    }
  }
}

// Create game manager instance
const gameManager = new GameManager();

// Game functions
function preload() {
  try {
    // Load game assets
    this.load.image('cyber_cat', 'cyber_cat.png');
    this.load.image('virus', 'virus.png');
    this.load.image('shield', 'shield.png');
    this.load.image('background', 'background.png');
    
    // Load sound effects
    this.load.audio('click', 'click.mp3');
    this.load.audio('collect', 'collect.mp3');
    this.load.audio('gameover', 'gameover.mp3');
    console.log('Assets loaded successfully');
  } catch (error) {
    gameManager.handleError('Failed to load game assets');
  }
}

function create() {
  try {
    // Create background
    this.add.image(400, 300, 'background');
    
    // Create player
    gameManager.player = this.physics.add.sprite(400, 500, 'cyber_cat');
    gameManager.player.setScale(0.5);
    gameManager.player.setCollideWorldBounds(true);
    
    // Create score text
    gameManager.scoreText = this.add.text(16, 16, 'Score: 0', { 
      fontSize: '32px', 
      fill: '#fff',
      fontFamily: 'Press Start 2P'
    });
    
    // Create level text
    gameManager.levelText = this.add.text(16, 50, 'Level: 1', { 
      fontSize: '24px', 
      fill: '#fff',
      fontFamily: 'Press Start 2P'
    });
    
    // Create coins text
    gameManager.coinsText = this.add.text(16, 84, 'Coins: 0', { 
      fontSize: '24px', 
      fill: '#fff',
      fontFamily: 'Press Start 2P'
    });
    
    // Start spawning viruses
    this.time.addEvent({
      delay: 2000,
      callback: gameManager.spawnVirus,
      callbackScope: this,
      loop: true
    });
    
    // Start spawning shields
    this.time.addEvent({
      delay: 5000,
      callback: gameManager.spawnShield,
      callbackScope: this,
      loop: true
    });
    
    // Enable input
    this.input.on('pointerdown', handleClick, this);
    
    // Enable keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    
    console.log('Game objects created successfully');
  } catch (error) {
    gameManager.handleError('Failed to create game objects');
  }
}

function update() {
  if (!gameManager.gameActive) return;
  
  try {
    // Handle keyboard input
    if (this.cursors.left.isDown) {
      gameManager.player.x -= 5;
    } else if (this.cursors.right.isDown) {
      gameManager.player.x += 5;
    }
    
    if (this.cursors.up.isDown) {
      gameManager.player.y -= 5;
    } else if (this.cursors.down.isDown) {
      gameManager.player.y += 5;
    }
    
    // Move viruses
    gameManager.viruses.forEach(virus => {
      virus.y += 2;
      
      // Check if virus reached bottom
      if (virus.y > 600) {
        gameManager.gameOver();
      }
    });
    
    // Move shields
    gameManager.shields.forEach(shield => {
      shield.y += 1;
      
      // Remove shield if it goes off screen
      if (shield.y > 600) {
        shield.destroy();
        gameManager.shields = gameManager.shields.filter(s => s !== shield);
      }
    });
  } catch (error) {
    gameManager.handleError('Error in game update');
  }
}

function handleClick(pointer) {
  if (!gameManager.gameActive) return;
  
  try {
    // Play click sound
    this.sound.play('click');
    
    // Check if clicked on virus
    const clickedVirus = gameManager.viruses.find(virus => 
      Phaser.Geom.Rectangle.ContainsPoint(virus.getBounds(), pointer)
    );
    
    if (clickedVirus) {
      // Destroy virus
      clickedVirus.destroy();
      gameManager.viruses = gameManager.viruses.filter(v => v !== clickedVirus);
      
      // Add score
      gameManager.score += 10;
      gameManager.virusesDestroyed++;
      
      // Check for level up
      if (gameManager.score % 100 === 0) {
        gameManager.levelUp();
      }
      
      gameManager.updateStats();
    }
    
    // Check if clicked on shield
    const clickedShield = gameManager.shields.find(shield => 
      Phaser.Geom.Rectangle.ContainsPoint(shield.getBounds(), pointer)
    );
    
    if (clickedShield) {
      // Collect shield
      clickedShield.destroy();
      gameManager.shields = gameManager.shields.filter(s => s !== clickedShield);
      
      // Play collect sound
      this.sound.play('collect');
      
      // Add coins
      gameManager.coins += 5;
      gameManager.shieldsCollected++;
      
      gameManager.updateStats();
    }
  } catch (error) {
    gameManager.handleError('Error handling click');
  }
}

// Export functions for use in app.js
window.startGame = () => {
  try {
    gameManager.gameActive = true;
    gameManager.init();
    showNotification('Game Started', 'Defend the digital world!', 'info');
  } catch (error) {
    gameManager.handleError('Failed to start the game');
  }
}; 