// Main entry point for the Chess Keyboard Edition game
// Initializes the game and sets up event listeners

// Main entry point for the Chess Keyboard Edition game
// Initializes the game and sets up event listeners

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chess Keyboard Edition - Initializing...');
    
    // Show color selection modal instead of immediately starting the game
    showColorSelectionModal();
});

// Show the color selection modal
function showColorSelectionModal() {
    const modal = document.getElementById('colorSelectionModal');
    const playWhiteBtn = document.getElementById('playWhiteBtn');
    const playBlackBtn = document.getElementById('playBlackBtn');
    const aiVsAiBtn = document.getElementById('aiVsAiBtn');
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Add event listeners
    playWhiteBtn.addEventListener('click', () => startGameAsColor('white'));
    playBlackBtn.addEventListener('click', () => startGameAsColor('black'));
    aiVsAiBtn.addEventListener('click', () => startGameAsColor('ai-vs-ai'));
}

// Start the game with the selected color
function startGameAsColor(playerColor) {
    if (playerColor === 'ai-vs-ai') {
        console.log('Starting AI vs AI game');
    } else {
        console.log(`Starting game - Player: ${playerColor}, AI: ${playerColor === 'white' ? 'black' : 'white'}`);
    }
    
    // Hide the modal
    const modal = document.getElementById('colorSelectionModal');
    modal.style.display = 'none';
    
    // Set the player color in game state
    GameState.setPlayerColor(playerColor);
    
    // Initialize the game
    initializeGame();
    
    // Start AI moves based on game mode
    if (playerColor === 'ai-vs-ai') {
        // In AI vs AI mode, start with white AI moving first
        setTimeout(() => {
            GameController.triggerAIMove();
        }, 1000);
    } else if (playerColor === 'black') {
        // If player chose black, AI (white) should move first
        setTimeout(() => {
            GameController.triggerAIMove();
        }, 1000);
    }
}

// Initialize the game (moved from DOMContentLoaded)
function initializeGame() {
    try {
        // Initialize game state first (sets up the board)
        GameState.init();
        
        // Initialize game controller
        GameController.init();
        console.log('Game initialized successfully');
        
        // Set up keyboard event listeners
        setupKeyboardListeners();
        
        // Render initial board state
        BoardRenderer.renderBoard();
        
        // Update initial status based on game mode
        if (GameState.gameMode === 'ai-vs-ai') {
            BoardRenderer.updateGameStatus('AI vs AI - White to move first');
        } else {
            const playerColorName = GameState.playerColor === 'white' ? 'White' : 'Black';
            if (GameState.isPlayerTurn()) {
                BoardRenderer.updateGameStatus(`${playerColorName} to move (Your turn)`);
            } else {
                BoardRenderer.updateGameStatus(`AI to move first`);
            }
        }
        
        console.log('Chess Keyboard Edition ready!');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showError('Failed to initialize game. Please refresh the page.');
    }
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', function(event) {
        // Prevent default behavior for our controlled keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape', ' '].includes(event.key)) {
            event.preventDefault();
        }
        
        // Handle keyboard input through the InputHandler
        InputHandler.handleKeyPress(event.key);
    });
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-hide error after 3 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showError('An unexpected error occurred. Please refresh the page.');
});

// Export for use by other modules
window.showError = showError;