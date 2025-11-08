// Board Renderer - Phase 5
// Handles visual representation of the chess board

const BoardRenderer = {
    // Unicode chess piece symbols
    pieceSymbols: {
        'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
        'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
    },
    
    // Render the complete chess board
    renderBoard() {
        const boardElement = document.getElementById('chessBoard');
        if (!boardElement) {
            console.error('Chess board element not found');
            return;
        }
        
        // Clear existing board
        boardElement.innerHTML = '';
        
        // Get UI state for highlighting
        const uiState = GameController.getUIState();
        
        // Create squares with white pieces at bottom
        // Render rank 7 to 0, CSS will flip the board to put white at bottom
        for (let displayRank = 7; displayRank >= 0; displayRank--) {
            for (let file = 0; file < 8; file++) {
                const squareIndex = displayRank * 8 + file;
                const square = this.createSquareElement(squareIndex, uiState);
                boardElement.appendChild(square);
            }
        }
    },
    
    // Create a single square element
    createSquareElement(squareIndex, uiState) {
        const square = document.createElement('div');
        square.className = 'chess-square';
        square.dataset.square = squareIndex;
        
        // Add data attribute for hover styling
        const piece = GameState.getPiece(squareIndex);
        if (piece && GameState.isCurrentPlayerPiece(squareIndex)) {
            square.dataset.hasCurrentPiece = 'true';
        }
        
        // Add click event listener
        square.addEventListener('click', () => {
            this.handleSquareClick(squareIndex);
        });
        
        // Add light/dark class
        const file = squareIndex % 8;
        const rank = Math.floor(squareIndex / 8);
        // In chess, a1 (bottom-left) should be a dark square
        // So we need (file + rank) % 2 === 1 for light squares
        const isLight = (file + rank) % 2 === 1;
        square.classList.add(isLight ? 'light' : 'dark');
        
        // Add highlighting classes
        if (squareIndex === uiState.currentFocus) {
            square.classList.add('focused');
        }
        
        if (squareIndex === uiState.selectedPiece) {
            square.classList.add('selected');
        }
        
        if (uiState.legalMoves.includes(squareIndex)) {
            square.classList.add('legal-move');
        }
        
        // Add piece if present
        if (piece) {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'chess-piece';
            pieceElement.textContent = this.pieceSymbols[piece] || '?';
            square.appendChild(pieceElement);
        }
        
        return square;
    },
    
    // Handle mouse clicks on squares
    handleSquareClick(squareIndex) {
        console.log(`Square clicked: ${squareIndex} (${GameState.indexToAlgebraic(squareIndex)})`);
        
        const uiState = GameController.getUIState();
        console.log(`Current UI state: ${uiState.state}, selectedPiece: ${uiState.selectedPiece}`);
        
        if (uiState.state === 'neutral') {
            // Try to select a piece
            const piece = GameState.getPiece(squareIndex);
            const pieceColor = GameState.getPieceColor(squareIndex);
            console.log(`Piece at clicked square: ${piece}, color: ${pieceColor}, sideToMove: ${GameState.sideToMove}`);
            
            if (GameState.isCurrentPlayerPiece(squareIndex)) {
                console.log('Attempting to select piece via mouse click');
                GameController.selectPiece(squareIndex);
            } else {
                console.log('Clicked square does not contain current player piece');
            }
        } else if (uiState.state === 'piece-selected') {
            console.log(`Legal moves for selected piece: [${uiState.legalMoves.map(m => `${m}(${GameState.indexToAlgebraic(m)})`).join(', ')}]`);
            console.log(`Clicked square ${squareIndex} (${GameState.indexToAlgebraic(squareIndex)}) - is legal move: ${uiState.legalMoves.includes(squareIndex)}`);
            
            if (squareIndex === uiState.selectedPiece) {
                // Clicking the same piece again - deselect (like ESC)
                console.log('Clicking same piece - deselecting');
                GameController.cancelSelection();
            } else if (uiState.legalMoves.includes(squareIndex)) {
                // Clicking a legal destination - make the move
                console.log('Attempting to make move via mouse click');
                console.log(`Selected piece: ${uiState.selectedPiece} (${GameState.indexToAlgebraic(uiState.selectedPiece)})`);
                console.log(`Destination: ${squareIndex} (${GameState.indexToAlgebraic(squareIndex)})`);
                console.log(`Piece type: ${GameState.getPieceType(uiState.selectedPiece)}`);
                GameController.makeMove(uiState.selectedPiece, squareIndex);
            } else if (GameState.isCurrentPlayerPiece(squareIndex)) {
                // Clicking a different piece - select it instead
                console.log('Clicking different piece - selecting it');
                GameController.selectPiece(squareIndex);
            } else {
                // Clicking an invalid square - show error or ignore
                console.log('Invalid square clicked');
                GameController.showError('Invalid move');
            }
        }
        
        // Re-render the board to update highlights
        this.renderBoard();
    },
    
    // Update game status display
    updateGameStatus(statusText) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = statusText;
            
            // Add special styling for game over states
            statusElement.className = 'game-status';
            
            if (statusText.includes('Checkmate') || statusText.includes('wins')) {
                statusElement.classList.add('checkmate');
            } else if (statusText.includes('Draw') || statusText.includes('Stalemate')) {
                statusElement.classList.add('draw');
            } else if (statusText.includes('check')) {
                statusElement.classList.add('check');
            } else {
                statusElement.classList.add('active');
            }
        }
    },
    
    // Highlight a specific square (for animations, etc.)
    highlightSquare(squareIndex, className, duration = 1000) {
        const square = document.querySelector(`[data-square="${squareIndex}"]`);
        if (square) {
            square.classList.add(className);
            setTimeout(() => {
                square.classList.remove(className);
            }, duration);
        }
    }
};

window.BoardRenderer = BoardRenderer;