// Input Handler - Phase 6
// Manages keyboard input and navigation

const InputHandler = {
    // Handle keyboard input
    handleKeyPress(key) {
        // Handle spacebar for pause/resume in AI vs AI mode
        if (key === ' ') {
            if (GameState.gameMode === 'ai-vs-ai') {
                GameController.togglePause();
                return;
            }
        }
        
        // Only handle other input if game is active and it's human's turn
        if (GameState.gameStatus !== 'active' || GameState.sideToMove !== 'white') {
            return;
        }
        
        switch (key) {
            case 'ArrowLeft':
                GameController.moveFocus('left');
                break;
                
            case 'ArrowRight':
                GameController.moveFocus('right');
                break;
                
            case 'ArrowUp':
                GameController.moveFocus('up');
                break;
                
            case 'ArrowDown':
                GameController.moveFocus('down');
                break;
                
            case 'Enter':
                GameController.handleEnter();
                break;
                
            case 'Escape':
                GameController.cancelSelection();
                break;
                
            default:
                // Ignore other keys
                break;
        }
    }
};

window.InputHandler = InputHandler;