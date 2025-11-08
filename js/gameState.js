// Game State Management
// Handles the core chess game state, board representation, and state transitions

const GameState = {
    // Board representation - 64 element array (A1=0, B1=1, ..., H8=63)
    // Piece encoding: first letter = color (w/b), second = piece type (P/N/B/R/Q/K)
    // Empty squares = null
    board: [],
    
    // Game state properties
    sideToMove: 'white',
    playerColor: null,      // 'white', 'black', or null for AI vs AI
    aiColor: null,          // opposite of playerColor, or null for AI vs AI
    gameMode: null,         // 'human-vs-ai' or 'ai-vs-ai'
    castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true
    },
    enPassantSquare: null, // Index of en passant target square, or null
    halfMoveClock: 0,      // For 50-move rule
    fullMoveNumber: 1,     // Increments after black's move
    
    // Move history for algebraic notation and undo functionality
    moveHistory: [],
    
    // Position history for threefold repetition detection
    positionHistory: [],
    
    // Game status
    gameStatus: 'active', // 'active', 'check', 'checkmate', 'stalemate', 'draw'
    winner: null,         // 'white', 'black', or null
    
    // Initialize the game to starting position
    init() {
        this.board = this.getStartingPosition();
        this.sideToMove = 'white';
        this.castlingRights = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true
        };
        this.enPassantSquare = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.moveHistory = [];
        this.positionHistory = [];
        this.gameStatus = 'active';
        this.winner = null;
        
        // Record initial position
        this.recordPosition();
        
        console.log('Game state initialized');
    },
    
    // Set player color choice
    setPlayerColor(color) {
        if (color === 'ai-vs-ai') {
            this.playerColor = null;
            this.aiColor = null;
            this.gameMode = 'ai-vs-ai';
            console.log('AI vs AI mode enabled');
        } else {
            this.playerColor = color;
            this.aiColor = color === 'white' ? 'black' : 'white';
            this.gameMode = 'human-vs-ai';
            console.log(`Player is ${this.playerColor}, AI is ${this.aiColor}`);
        }
    },
    
    // Check if current side to move is the human player
    isPlayerTurn() {
        return this.gameMode === 'human-vs-ai' && this.sideToMove === this.playerColor;
    },
    
    // Check if current side to move is the AI
    isAITurn() {
        return this.gameMode === 'ai-vs-ai' || (this.gameMode === 'human-vs-ai' && this.sideToMove === this.aiColor);
    },
    
    // Get the standard chess starting position
    getStartingPosition() {
        const startBoard = new Array(64).fill(null);
        
        // White pieces (bottom of board, ranks 1-2)
        startBoard[0] = 'wR'; startBoard[1] = 'wN'; startBoard[2] = 'wB'; startBoard[3] = 'wQ';
        startBoard[4] = 'wK'; startBoard[5] = 'wB'; startBoard[6] = 'wN'; startBoard[7] = 'wR';
        for (let i = 8; i < 16; i++) startBoard[i] = 'wP';
        
        // Black pieces (top of board, ranks 7-8)
        for (let i = 48; i < 56; i++) startBoard[i] = 'bP';
        startBoard[56] = 'bR'; startBoard[57] = 'bN'; startBoard[58] = 'bB'; startBoard[59] = 'bQ';
        startBoard[60] = 'bK'; startBoard[61] = 'bB'; startBoard[62] = 'bN'; startBoard[63] = 'bR';
        
        return startBoard;
    },
    
    // Convert square index to algebraic notation (0 = 'a1', 63 = 'h8')
    indexToAlgebraic(index) {
        const file = String.fromCharCode(97 + (index % 8)); // a-h
        const rank = Math.floor(index / 8) + 1; // 1-8
        return file + rank;
    },
    
    // Convert square index to rank and file numbers (0 = [0,0], 63 = [7,7])
    indexToRankFile(index) {
        const rank = Math.floor(index / 8);
        const file = index % 8;
        return [rank, file];
    },
    
    // Convert rank and file numbers to square index ([0,0] = 0, [7,7] = 63)
    rankFileToIndex(rank, file) {
        return rank * 8 + file;
    },
    
    // Convert algebraic notation to square index ('a1' = 0, 'h8' = 63)
    algebraicToIndex(algebraic) {
        const file = algebraic.charCodeAt(0) - 97; // a=0, b=1, etc.
        const rank = parseInt(algebraic[1]) - 1;   // 1=0, 2=1, etc.
        return rank * 8 + file;
    },
    
    // Get piece at given square index
    getPiece(index) {
        if (index < 0 || index > 63) return null;
        return this.board[index];
    },
    
    // Set piece at given square index
    setPiece(index, piece) {
        if (index < 0 || index > 63) return false;
        this.board[index] = piece;
        return true;
    },
    
    // Check if square is empty
    isEmpty(index) {
        return this.getPiece(index) === null;
    },
    
    // Get color of piece ('white', 'black', or null for empty)
    getPieceColor(index) {
        const piece = this.getPiece(index);
        if (!piece) return null;
        return piece[0] === 'w' ? 'white' : 'black';
    },
    
    // Get piece type ('P', 'N', 'B', 'R', 'Q', 'K', or null for empty)
    getPieceType(index) {
        const piece = this.getPiece(index);
        if (!piece) return null;
        return piece[1];
    },
    
    // Check if a piece belongs to the current player
    isCurrentPlayerPiece(index) {
        const pieceColor = this.getPieceColor(index);
        return pieceColor === this.sideToMove;
    },
    
    // Find king position for given color
    findKing(color) {
        const kingPiece = color === 'white' ? 'wK' : 'bK';
        for (let i = 0; i < 64; i++) {
            if (this.board[i] === kingPiece) {
                return i;
            }
        }
        return null; // Should never happen in a valid game
    },
    
    // Make a copy of the current game state (for AI simulation)
    copy() {
        return {
            board: [...this.board],
            sideToMove: this.sideToMove,
            castlingRights: { ...this.castlingRights },
            enPassantSquare: this.enPassantSquare,
            halfMoveClock: this.halfMoveClock,
            fullMoveNumber: this.fullMoveNumber,
            moveHistory: [...this.moveHistory],
            gameStatus: this.gameStatus,
            winner: this.winner
        };
    },
    
    // Restore state from a copy
    restore(stateCopy) {
        this.board = [...stateCopy.board];
        this.sideToMove = stateCopy.sideToMove;
        this.castlingRights = { ...stateCopy.castlingRights };
        this.enPassantSquare = stateCopy.enPassantSquare;
        this.halfMoveClock = stateCopy.halfMoveClock;
        this.fullMoveNumber = stateCopy.fullMoveNumber;
        this.moveHistory = [...stateCopy.moveHistory];
        this.positionHistory = [...stateCopy.positionHistory];
        this.gameStatus = stateCopy.gameStatus;
        this.winner = stateCopy.winner;
    },
    
    // Switch the side to move
    switchSide() {
        this.sideToMove = this.sideToMove === 'white' ? 'black' : 'white';
        if (this.sideToMove === 'white') {
            this.fullMoveNumber++;
        }
        
        // Record position after each move for repetition detection
        // Only record during actual game play, not during AI search
        this.recordPosition();
    },
    
    // Record current position for threefold repetition detection
    recordPosition() {
        const positionKey = this.getPositionKey();
        this.positionHistory.push(positionKey);
        
        // Keep only last 50 positions to avoid memory issues
        if (this.positionHistory.length > 50) {
            this.positionHistory.shift();
        }
    },
    
    // Generate a unique key for the current position
    getPositionKey() {
        let key = '';
        
        // Add board state
        for (let i = 0; i < 64; i++) {
            const piece = this.board[i];
            key += piece ? piece : '.';
        }
        
        // Add side to move
        key += this.sideToMove[0]; // 'w' or 'b'
        
        // Add castling rights
        key += this.castlingRights.whiteKingside ? 'K' : '';
        key += this.castlingRights.whiteQueenside ? 'Q' : '';
        key += this.castlingRights.blackKingside ? 'k' : '';
        key += this.castlingRights.blackQueenside ? 'q' : '';
        
        // Add en passant square
        key += this.enPassantSquare !== null ? this.indexToAlgebraic(this.enPassantSquare) : '-';
        
        return key;
    },
    
    // Check for threefold repetition
    isThreefoldRepetition() {
        if (this.positionHistory.length < 6) {
            return false;
        }
        
        const currentPosition = this.getPositionKey();
        let count = 0;
        
        // Count occurrences of current position
        for (const position of this.positionHistory) {
            if (position === currentPosition) {
                count++;
            }
        }
        
        return count >= 3;
    },
    
    // Get the opposite color
    getOppositeColor(color) {
        return color === 'white' ? 'black' : 'white';
    },
    
    // Debug: print board to console
    printBoard() {
        console.log('Current board state:');
        for (let rank = 7; rank >= 0; rank--) {
            let row = '';
            for (let file = 0; file < 8; file++) {
                const index = rank * 8 + file;
                const piece = this.board[index] || '..';
                row += piece.padEnd(3);
            }
            console.log(`${rank + 1}: ${row}`);
        }
        console.log('   a  b  c  d  e  f  g  h');
        console.log(`Side to move: ${this.sideToMove}`);
        console.log(`Game status: ${this.gameStatus}`);
    }
};

// Export for use by other modules
window.GameState = GameState;