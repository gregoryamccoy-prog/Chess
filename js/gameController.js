// Game Controller
// Manages overall game flow, coordinates between components

const GameController = {
    // UI state for keyboard navigation
    uiState: {
        currentFocus: 4, // Start focused on white king (e1)
        selectedPiece: null,
        legalMoves: [],
        state: 'neutral' // 'neutral' or 'piece-selected'
    },
    
        // Initialize the game controller
    init() {
        console.log('GameController initializing...');
        
        // Initialize UI state
        this.uiState = {
            state: 'neutral', // Can be 'neutral' or 'piece-selected'
            currentFocus: 32, // Start at e4 (center of board)
            selectedPiece: null,
            legalMoves: []
        };
        
        // AI state
        this.isAIThinking = false;
        this.isPaused = false; // Add pause state for AI vs AI debugging
        
        // Initial render
        BoardRenderer.renderBoard();
        
        console.log('GameController initialized');
    },
    
    // Handle piece selection
    selectPiece(squareIndex) {
        // Debug: Log piece selection attempt
        const piece = GameState.getPiece(squareIndex);
        const isCurrentPlayer = GameState.isCurrentPlayerPiece(squareIndex);
        console.log(`Attempting to select: square ${squareIndex} (${GameState.indexToAlgebraic(squareIndex)}), piece: ${piece}, isCurrentPlayer: ${isCurrentPlayer}, sideToMove: ${GameState.sideToMove}`);
        
        // Prevent selection if AI is thinking
        if (this.isAIThinking) {
            console.log('AI is thinking, cannot select piece');
            return false;
        }
        
        // Prevent selection in AI vs AI mode
        if (GameState.gameMode === 'ai-vs-ai') {
            console.log('AI vs AI mode - human input disabled');
            return false;
        }
        
        // Check if game is still active
        if (GameState.gameStatus !== 'active' && GameState.gameStatus !== 'check') {
            console.log('Game is not active, cannot select piece');
            return false;
        }
        
        // Check if there's a piece belonging to current player
        if (!GameState.isCurrentPlayerPiece(squareIndex)) {
            this.showError('No piece to move on this square');
            console.log('Piece does not belong to current player');
            return false;
        }
        
        // Generate legal moves for this piece
        const legalMoves = MoveGeneration.getLegalMovesForPiece(squareIndex);
        
        if (legalMoves.length === 0) {
            this.showError('Selected piece has no legal moves');
            return false;
        }
        
        // Update UI state
        this.uiState.selectedPiece = squareIndex;
        this.uiState.legalMoves = legalMoves.map(move => move.to); // Extract destination squares
        this.uiState.legalMoveObjects = legalMoves; // Keep full move objects for later use
        this.uiState.state = 'piece-selected';
        this.uiState.currentFocus = legalMoves[0].to; // Focus on first legal move destination
        
        console.log(`Piece selected at ${GameState.indexToAlgebraic(squareIndex)}, ${legalMoves.length} legal moves`);
        return true;
    },
    
    // Handle move execution
    makeMove(fromSquare, toSquare) {
        // Debug: Log the move parameters
        console.log(`makeMove called with fromSquare=${fromSquare}, toSquare=${toSquare}`);
        
        // Check if game is still active
        if (GameState.gameStatus !== 'active' && GameState.gameStatus !== 'check') {
            console.log('Game is over, no more moves allowed');
            return false;
        }
        
        // Validate the move
        if (!this.isValidMove(fromSquare, toSquare)) {
            this.showError('Invalid move');
            return false;
        }
        
        // Create move object
        const move = {
            from: fromSquare,
            to: toSquare,
            piece: GameState.getPiece(fromSquare),
            captured: GameState.getPiece(toSquare),
            timestamp: Date.now()
        };
        
        // Execute the move
        this.executeMove(move);
        
        // Check for game end conditions
        this.checkGameState();
        
        // If game is still active (or in check) and it's AI's turn, trigger AI move
        if ((GameState.gameStatus === 'active' || GameState.gameStatus === 'check') && GameState.isAITurn()) {
            const delay = GameState.gameMode === 'ai-vs-ai' ? 1500 : 500; // Longer delay for AI vs AI
            setTimeout(() => this.triggerAIMove(), delay);
        }
        
        return true;
    },
    
    // Execute a move (update game state)
    executeMove(move) {
        // Get the piece that's moving before we modify the board
        const movingPiece = GameState.getPiece(move.from);
        const pieceType = GameState.getPieceType(move.from);
        
        // Check if this move captures a king
        if (move.captured && GameState.getPieceType(move.to) === 'K') {
            console.log(`CRITICAL ERROR: King capture detected!`);
            console.log(`Move: ${GameState.indexToAlgebraic(move.from)} -> ${GameState.indexToAlgebraic(move.to)}`);
            console.log(`Captured piece: ${move.captured}`);
            console.log(`This should have been prevented by legal move generation!`);
        }
        
        // Handle special moves
        this.handleSpecialMoves(move);
        
        // Update board
        let pieceToPlace = movingPiece;
        
        // Handle promotion - replace pawn with promoted piece
        if (move.promotedPiece) {
            pieceToPlace = move.promotedPiece;
        }
        
        GameState.setPiece(move.to, pieceToPlace);
        GameState.setPiece(move.from, null);
        
        // Add move to history with complete information
        const completeMove = {
            ...move,
            piece: movingPiece,
            captured: move.captured
        };
        GameState.moveHistory.push(completeMove);
        
        // Update move clocks (use pieceType we saved earlier)
        if (move.captured || pieceType === 'P') {
            GameState.halfMoveClock = 0;
        } else {
            GameState.halfMoveClock++;
        }
        
        // Switch sides
        GameState.switchSide();
        
        // Reset UI state
        this.resetUIState();
        
        // Update display
        BoardRenderer.renderBoard();
        this.updateMoveHistory();
        
        console.log(`Move executed: ${GameState.indexToAlgebraic(move.from)} -> ${GameState.indexToAlgebraic(move.to)}`);
    },
    
    // Handle special moves (placeholder for now)
    handleSpecialMoves(move) {
        // Get move information from legal moves to check for special move types
        const legalMoves = MoveGeneration.getLegalMovesForPiece(move.from);
        const matchingMove = legalMoves.find(m => m.from === move.from && m.to === move.to);
        
        if (!matchingMove) return;
        
        // Handle castling
        if (matchingMove.type === 'castling') {
            this.handleCastling(move, matchingMove.side);
        }
        
        // Handle en passant
        if (matchingMove.type === 'enPassant') {
            this.handleEnPassant(move, matchingMove.capturedSquare);
        }
        
        // Handle pawn promotion
        if (matchingMove.type === 'promotion') {
            this.handlePromotion(move, matchingMove.promoteTo);
        }
        
        // Handle pawn double move (sets en passant square)
        if (matchingMove.type === 'pawnDoubleMove') {
            this.handlePawnDoubleMove(move);
        }
        
        // Update castling rights after any move
        this.updateCastlingRights(move);
        
        // Clear en passant square if not set this move
        if (matchingMove.type !== 'pawnDoubleMove') {
            GameState.enPassantSquare = null;
        }
    },
    
    // Handle castling move
    handleCastling(move, side) {
        const isWhite = GameState.sideToMove === 'white';
        const rank = isWhite ? 0 : 7;
        
        if (side === 'kingside') {
            // Move rook from h-file to f-file
            const rookFrom = GameState.rankFileToIndex(rank, 7);
            const rookTo = GameState.rankFileToIndex(rank, 5);
            const rook = GameState.getPiece(rookFrom);
            
            GameState.setPiece(rookTo, rook);
            GameState.setPiece(rookFrom, null);
        } else { // queenside
            // Move rook from a-file to d-file
            const rookFrom = GameState.rankFileToIndex(rank, 0);
            const rookTo = GameState.rankFileToIndex(rank, 3);
            const rook = GameState.getPiece(rookFrom);
            
            GameState.setPiece(rookTo, rook);
            GameState.setPiece(rookFrom, null);
        }
        
        // Castling rights are updated in updateCastlingRights()
    },
    
    // Handle en passant capture
    handleEnPassant(move, capturedSquare) {
        // Remove the captured pawn (which is not on the destination square)
        GameState.setPiece(capturedSquare, null);
        move.captured = 'wP'; // Will be adjusted based on actual piece
        move.capturedSquare = capturedSquare;
    },
    
    // Handle pawn promotion
    handlePromotion(move, promoteTo) {
        // The pawn will be replaced with the promoted piece after the normal move
        const color = GameState.getPieceColor(move.from);
        const promotedPiece = color === 'white' ? `w${promoteTo}` : `b${promoteTo}`;
        move.promoteTo = promoteTo;
        move.promotedPiece = promotedPiece;
    },
    
    // Handle pawn double move (sets en passant target square)
    handlePawnDoubleMove(move) {
        const isWhite = GameState.sideToMove === 'white';
        const [fromRank, fromFile] = GameState.indexToRankFile(move.from);
        const enPassantRank = isWhite ? fromRank + 1 : fromRank - 1;
        
        GameState.enPassantSquare = GameState.rankFileToIndex(enPassantRank, fromFile);
    },
    
    // Update castling rights based on piece movement
    updateCastlingRights(move) {
        const piece = GameState.getPieceType(move.from);
        const color = GameState.getPieceColor(move.from);
        
        // King moves lose all castling rights for that side
        if (piece === 'K') {
            if (color === 'white') {
                GameState.castlingRights.whiteKingside = false;
                GameState.castlingRights.whiteQueenside = false;
            } else {
                GameState.castlingRights.blackKingside = false;
                GameState.castlingRights.blackQueenside = false;
            }
        }
        
        // Rook moves lose castling rights for that side
        if (piece === 'R') {
            const [rank, file] = GameState.indexToRankFile(move.from);
            
            if (color === 'white' && rank === 0) {
                if (file === 0) { // a1 rook
                    GameState.castlingRights.whiteQueenside = false;
                } else if (file === 7) { // h1 rook
                    GameState.castlingRights.whiteKingside = false;
                }
            } else if (color === 'black' && rank === 7) {
                if (file === 0) { // a8 rook
                    GameState.castlingRights.blackQueenside = false;
                } else if (file === 7) { // h8 rook
                    GameState.castlingRights.blackKingside = false;
                }
            }
        }
        
        // Capturing a rook on its starting square also removes castling rights
        if (move.captured) {
            const [toRank, toFile] = GameState.indexToRankFile(move.to);
            
            if (toRank === 0 && toFile === 0) { // a1
                GameState.castlingRights.whiteQueenside = false;
            } else if (toRank === 0 && toFile === 7) { // h1
                GameState.castlingRights.whiteKingside = false;
            } else if (toRank === 7 && toFile === 0) { // a8
                GameState.castlingRights.blackQueenside = false;
            } else if (toRank === 7 && toFile === 7) { // h8
                GameState.castlingRights.blackKingside = false;
            }
        }
    },
    
    // Check if a move is valid
    isValidMove(fromSquare, toSquare) {
        const isValid = this.uiState.legalMoves.includes(toSquare);
        console.log(`isValidMove: from ${fromSquare} to ${toSquare}, legal moves: [${this.uiState.legalMoves.join(', ')}], valid: ${isValid}`);
        return isValid;
    },
    
    // Check game state for check, checkmate, stalemate
    checkGameState() {
        const currentPlayer = GameState.sideToMove;
        const isInCheck = MoveGeneration.isInCheck(currentPlayer);
        const legalMoves = MoveGeneration.getAllLegalMoves(currentPlayer);
        
        // Reset game status
        GameState.gameStatus = 'active';
        GameState.winner = null;
        
        // Check for checkmate or stalemate (no legal moves)
        if (legalMoves.length === 0) {
            if (isInCheck) {
                // Checkmate - opponent wins
                GameState.gameStatus = 'checkmate';
                GameState.winner = GameState.getOppositeColor(currentPlayer);
                const winnerName = GameState.winner === 'white' ? 'White' : 'Black';
                BoardRenderer.updateGameStatus(`Checkmate! ${winnerName} wins!`);
                this.endGame(GameState.winner);
                return;
            } else {
                // Stalemate - draw
                GameState.gameStatus = 'stalemate';
                BoardRenderer.updateGameStatus('Stalemate! Draw game.');
                this.endGame('draw');
                return;
            }
        }
        
        // Check for insufficient material draw
        if (this.isInsufficientMaterial()) {
            GameState.gameStatus = 'draw';
            BoardRenderer.updateGameStatus('Draw by insufficient material.');
            this.endGame('draw');
            return;
        }
        
        // Check for 50-move rule
        if (GameState.halfMoveClock >= 100) { // 50 moves per side = 100 half-moves
            GameState.gameStatus = 'draw';
            BoardRenderer.updateGameStatus('Draw by 50-move rule.');
            this.endGame('draw');
            return;
        }
        
        // Check for threefold repetition
        if (GameState.isThreefoldRepetition()) {
            GameState.gameStatus = 'draw';
            BoardRenderer.updateGameStatus('Draw by threefold repetition.');
            this.endGame('draw');
            return;
        }
        
        // Game continues - update status
        if (isInCheck) {
            GameState.gameStatus = 'check';
            const playerName = currentPlayer === 'white' ? 'White' : 'Black';
            const checkMessage = `${playerName} is in check!`;
            console.log(`Displaying check message: ${checkMessage}`);
            BoardRenderer.updateGameStatus(checkMessage);
            
            // Auto-clear check message after 3 seconds in AI vs AI mode
            if (GameState.gameMode === 'ai-vs-ai') {
                setTimeout(() => {
                    // Clear the check message and update to normal status
                    // The next checkGameState call will re-display if still in check
                    const currentColorName = GameState.sideToMove === 'white' ? 'White' : 'Black';
                    BoardRenderer.updateGameStatus(`AI vs AI - ${currentColorName} to move`);
                }, 3000);
            }
        } else {
            GameState.gameStatus = 'active';
            if (GameState.gameMode === 'ai-vs-ai') {
                const currentColorName = currentPlayer === 'white' ? 'White' : 'Black';
                BoardRenderer.updateGameStatus(`AI vs AI - ${currentColorName} to move`);
            } else if (GameState.isPlayerTurn()) {
                const playerColorName = GameState.playerColor === 'white' ? 'White' : 'Black';
                BoardRenderer.updateGameStatus(`${playerColorName} to move (Your turn)`);
            } else {
                const aiColorName = GameState.aiColor === 'white' ? 'White' : 'Black';
                BoardRenderer.updateGameStatus(`${aiColorName} to move`);
            }
        }
        
        // In AI vs AI mode, trigger the next AI move if game is still active OR in check
        if (GameState.gameMode === 'ai-vs-ai' && (GameState.gameStatus === 'active' || GameState.gameStatus === 'check') && !this.isAIThinking) {
            console.log('AI vs AI mode: scheduling next AI move...');
            const delay = 1500; // Delay for watchability
            setTimeout(() => this.triggerAIMove(), delay);
        } else {
            console.log('Not triggering next AI move:', {
                gameMode: GameState.gameMode,
                gameStatus: GameState.gameStatus,
                isAIThinking: this.isAIThinking
            });
        }
    },

    // Check for insufficient material to continue the game
    isInsufficientMaterial() {
        const pieces = this.countPieces();
        
        // King vs King
        if (pieces.total === 2) {
            return true;
        }
        
        // King and Bishop/Knight vs King
        if (pieces.total === 3) {
            return pieces.wB === 1 || pieces.bB === 1 || pieces.wN === 1 || pieces.bN === 1;
        }
        
        // King and Bishop vs King and Bishop (same colored squares)
        if (pieces.total === 4 && pieces.wB === 1 && pieces.bB === 1) {
            return this.bishopsOnSameColor();
        }
        
        return false;
    },

    // Count all pieces on the board
    countPieces() {
        const pieces = {
            wK: 0, wQ: 0, wR: 0, wB: 0, wN: 0, wP: 0,
            bK: 0, bQ: 0, bR: 0, bB: 0, bN: 0, bP: 0,
            total: 0
        };
        
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece) {
                pieces[piece]++;
                pieces.total++;
            }
        }
        
        return pieces;
    },

    // Check if bishops are on same colored squares
    bishopsOnSameColor() {
        let whiteBishopSquareColor = null;
        let blackBishopSquareColor = null;
        
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece === 'wB') {
                const [rank, file] = GameState.indexToRankFile(i);
                whiteBishopSquareColor = (rank + file) % 2;
            } else if (piece === 'bB') {
                const [rank, file] = GameState.indexToRankFile(i);
                blackBishopSquareColor = (rank + file) % 2;
            }
        }
        
        return whiteBishopSquareColor === blackBishopSquareColor;
    },

    // Handle game end
    endGame(result) {
        console.log(`Game ended: ${result}`);
        
        // Clear any selection state
        this.uiState.selectedSquare = null;
        this.uiState.legalMoves = [];
        this.uiState.focusedSquare = 32; // Reset to center
        
        // Update display - just re-render the board to clear any highlights
        BoardRenderer.renderBoard();
        
        // Disable further moves by setting game status
        GameState.gameStatus = result === 'draw' ? 'draw' : 'checkmate';
        
        // Could add game end sound or animation here
    },
    
    // Toggle pause state for AI vs AI debugging
    togglePause() {
        if (GameState.gameMode === 'ai-vs-ai') {
            this.isPaused = !this.isPaused;
            console.log(`Game ${this.isPaused ? 'PAUSED' : 'RESUMED'}`);
            
            // Update status display
            if (this.isPaused) {
                BoardRenderer.updateGameStatus('Game PAUSED - Press spacebar to resume');
            } else {
                // Resume game - check if AI should move
                if ((GameState.gameStatus === 'active' || GameState.gameStatus === 'check') && GameState.isAITurn()) {
                    setTimeout(() => this.triggerAIMove(), 500);
                }
            }
        }
    },
    
    // Trigger AI move
    triggerAIMove() {
        if (!GameState.isAITurn() || (GameState.gameStatus !== 'active' && GameState.gameStatus !== 'check')) {
            return;
        }
        
        // Check if game is paused in AI vs AI mode
        if (GameState.gameMode === 'ai-vs-ai' && this.isPaused) {
            console.log('AI move skipped - game is paused');
            return;
        }
        
        console.log('AI is thinking...');
        this.isAIThinking = true;
        this.showAIThinking(true);
        
        // Generate AI move with enhanced engine (may take time)
        this.generateAIMove().then(aiMove => {
            if (aiMove) {
                // Execute the AI move
                this.executeMove(aiMove);
                
                // Update display
                BoardRenderer.renderBoard();
                this.updateMoveHistory();
                
                // Reset AI thinking state
                this.isAIThinking = false;
                this.showAIThinking(false);
                
                // Check game state
                this.checkGameState();
            } else {
                // AI couldn't find a move
                this.checkGameState();
                this.isAIThinking = false;
                this.showAIThinking(false);
            }
        }).catch(error => {
            console.error('AI move generation failed:', error);
            this.isAIThinking = false;
            this.showAIThinking(false);
        });
    },
    
    // Generate AI move using advanced engine
    async generateAIMove() {
        try {
            const allMoves = MoveGeneration.getAllLegalMoves(GameState.sideToMove);
            if (allMoves.length === 0) {
                return null; // No legal moves (checkmate/stalemate)
            }
            
            // Use the advanced AI engine (may return promise or immediate result)
            const aiMove = await AIEngine.getBestMove();
            return aiMove;
        } catch (error) {
            console.warn('AI engine failed, using random move:', error);
            // Fallback to random move if AI engine fails
            const allMoves = MoveGeneration.getAllLegalMoves(GameState.sideToMove);
            if (allMoves.length === 0) return null;
            
            return allMoves[Math.floor(Math.random() * allMoves.length)];
        }
    },
    
    // Reset UI state to neutral
    resetUIState() {
        this.uiState.selectedPiece = null;
        this.uiState.legalMoves = [];
        this.uiState.legalMoveObjects = [];
        this.uiState.state = 'neutral';
        // Keep current focus where it is
    },
    
    // Cancel current selection
    cancelSelection() {
        if (this.uiState.state === 'piece-selected') {
            this.uiState.currentFocus = this.uiState.selectedPiece;
            this.resetUIState();
            BoardRenderer.renderBoard();
            console.log('Selection cancelled');
        }
    },
    
    // Move focus to next/previous square
    moveFocus(direction) {
        if (this.uiState.state === 'neutral') {
            // Navigate through all squares with directional movement
            const currentFile = this.uiState.currentFocus % 8;
            const currentRank = Math.floor(this.uiState.currentFocus / 8);
            let newFile = currentFile;
            let newRank = currentRank;
            
            switch (direction) {
                case 'left':
                    newFile = (currentFile - 1 + 8) % 8;
                    break;
                case 'right':
                    newFile = (currentFile + 1) % 8;
                    break;
                case 'up':
                    newRank = (currentRank + 1) % 8;
                    break;
                case 'down':
                    newRank = (currentRank - 1 + 8) % 8;
                    break;
            }
            
            this.uiState.currentFocus = newRank * 8 + newFile;
            
        } else if (this.uiState.state === 'piece-selected') {
            // Navigate through legal moves
            const currentIndex = this.uiState.legalMoves.indexOf(this.uiState.currentFocus);
            let newIndex;
            
            if (direction === 'right' || direction === 'down') {
                newIndex = (currentIndex + 1) % this.uiState.legalMoves.length;
            } else if (direction === 'left' || direction === 'up') {
                newIndex = (currentIndex - 1 + this.uiState.legalMoves.length) % this.uiState.legalMoves.length;
            }
            
            this.uiState.currentFocus = this.uiState.legalMoves[newIndex];
        }
        
        BoardRenderer.renderBoard();
    },
    
    // Handle enter key press
    handleEnter() {
        if (this.uiState.state === 'neutral') {
            // Try to select piece
            this.selectPiece(this.uiState.currentFocus);
        } else if (this.uiState.state === 'piece-selected') {
            // Try to make move
            this.makeMove(this.uiState.selectedPiece, this.uiState.currentFocus);
        }
        
        BoardRenderer.renderBoard();
    },
    
    // Show/hide AI thinking indicator
    showAIThinking(show) {
        const thinkingElement = document.getElementById('aiThinking');
        if (thinkingElement) {
            thinkingElement.style.display = show ? 'block' : 'none';
        }
    },
    
    // Update move history display
    updateMoveHistory() {
        const moveTape = document.getElementById('moveTape');
        if (!moveTape) return;
        
        moveTape.innerHTML = '';
        
        for (let i = 0; i < GameState.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = GameState.moveHistory[i];
            const blackMove = GameState.moveHistory[i + 1];
            
            const moveEntry = document.createElement('div');
            moveEntry.className = 'move-entry';
            if (i + 1 >= GameState.moveHistory.length - 1) {
                moveEntry.className += ' latest';
            }
            
            let moveText = `<span class="move-number">${moveNumber}.</span>`;
            moveText += MoveNotation.formatMove(whiteMove);
            
            if (blackMove) {
                moveText += ' ' + MoveNotation.formatMove(blackMove);
            }
            
            moveEntry.innerHTML = moveText;
            moveTape.appendChild(moveEntry);
        }
        
        // Auto-scroll to bottom
        moveTape.scrollTop = moveTape.scrollHeight;
    },
    
    // Show error message
    showError(message) {
        if (window.showError) {
            window.showError(message);
        } else {
            console.error(message);
        }
    },
    
    // Get current UI state (for rendering)
    getUIState() {
        return this.uiState;
    }
};

// Export for use by other modules
window.GameController = GameController;