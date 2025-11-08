// Move Notation - Standard Algebraic Notation
// Converts chess moves to proper algebraic notation (e.g., e4, Nf3, Bxf7+, O-O)

const MoveNotation = {
    // Piece symbols for notation (pawn moves don't include piece symbol)
    pieceSymbols: {
        'K': 'K', 'Q': 'Q', 'R': 'R', 'B': 'B', 'N': 'N', 'P': ''
    },

    // Format a move for display in move history
    formatMove(move) {
        if (!move) return '';
        
        const piece = GameState.getPieceType(move.from) || move.piece?.[1];
        const fromSquare = GameState.indexToAlgebraic(move.from);
        const toSquare = GameState.indexToAlgebraic(move.to);
        const isCapture = move.captured !== null;
        
        // Handle special moves first
        if (this.isCastling(move)) {
            return this.formatCastling(move);
        }
        
        let notation = '';
        
        // Add piece symbol (empty for pawns)
        notation += this.pieceSymbols[piece] || '';
        
        // Handle disambiguation for pieces (when multiple pieces of same type can reach same square)
        if (piece !== 'P') {
            const disambiguation = this.getDisambiguation(move);
            notation += disambiguation;
        }
        
        // Handle pawn captures (include file of departure)
        if (piece === 'P' && isCapture) {
            notation += fromSquare[0]; // file letter (a-h)
        }
        
        // Add capture symbol
        if (isCapture) {
            notation += 'x';
        }
        
        // Add destination square
        notation += toSquare;
        
        // Handle pawn promotion
        if (this.isPromotion(move)) {
            notation += '=' + (move.promoteTo || 'Q');
        }
        
        // Handle en passant
        if (this.isEnPassant(move)) {
            // En passant is indicated by destination square, capture already noted
            // Optionally add "e.p." suffix
        }
        
        // Add check/checkmate indicators
        const checkStatus = this.getCheckStatus(move);
        notation += checkStatus;
        
        return notation;
    },
    
    // Check if move is castling
    isCastling(move) {
        const piece = GameState.getPieceType(move.from) || move.piece?.[1];
        if (piece !== 'K') return false;
        
        const fromFile = move.from % 8;
        const toFile = move.to % 8;
        const distance = Math.abs(toFile - fromFile);
        
        return distance === 2; // King moves 2 squares in castling
    },
    
    // Format castling notation
    formatCastling(move) {
        const toFile = move.to % 8;
        
        // Kingside castling (king goes to g-file)
        if (toFile === 6) {
            return 'O-O';
        }
        // Queenside castling (king goes to c-file)
        else if (toFile === 2) {
            return 'O-O-O';
        }
        
        return 'O-O'; // fallback
    },
    
    // Get disambiguation for piece moves when multiple pieces can reach same square
    getDisambiguation(move) {
        const piece = GameState.getPieceType(move.from) || move.piece?.[1];
        if (piece === 'P') return ''; // Pawns don't need disambiguation
        
        // Find all pieces of same type and color that can move to the same destination
        const color = GameState.getPieceColor(move.from) || move.piece?.[0] === 'w' ? 'white' : 'black';
        const allMoves = MoveGeneration.getAllLegalMoves(color);
        
        const conflictingMoves = allMoves.filter(m => 
            m.to === move.to && 
            m.from !== move.from && 
            GameState.getPieceType(m.from) === piece
        );
        
        if (conflictingMoves.length === 0) {
            return ''; // No disambiguation needed
        }
        
        const fromFile = move.from % 8;
        const fromRank = Math.floor(move.from / 8);
        
        // Check if file disambiguation is sufficient
        const fileConflicts = conflictingMoves.filter(m => m.from % 8 === fromFile);
        if (fileConflicts.length === 0) {
            return String.fromCharCode(97 + fromFile); // Return file letter (a-h)
        }
        
        // Check if rank disambiguation is sufficient
        const rankConflicts = conflictingMoves.filter(m => Math.floor(m.from / 8) === fromRank);
        if (rankConflicts.length === 0) {
            return String(fromRank + 1); // Return rank number (1-8)
        }
        
        // Need both file and rank
        return String.fromCharCode(97 + fromFile) + String(fromRank + 1);
    },
    
    // Check if move is a pawn promotion
    isPromotion(move) {
        const piece = GameState.getPieceType(move.from) || move.piece?.[1];
        if (piece !== 'P') return false;
        
        const toRank = Math.floor(move.to / 8);
        return toRank === 0 || toRank === 7; // Reached first or last rank
    },
    
    // Check if move is en passant
    isEnPassant(move) {
        const piece = GameState.getPieceType(move.from) || move.piece?.[1];
        if (piece !== 'P') return false;
        
        // En passant: pawn captures diagonally to an empty square
        const fromFile = move.from % 8;
        const toFile = move.to % 8;
        
        return Math.abs(fromFile - toFile) === 1 && !move.captured;
    },
    
    // Get check/checkmate status after move
    getCheckStatus(move) {
        // Create a temporary game state to test the position after the move
        const originalFromPiece = GameState.getPiece(move.from);
        const originalToPiece = GameState.getPiece(move.to);
        
        // Temporarily make the move
        GameState.setPiece(move.to, originalFromPiece);
        GameState.setPiece(move.from, null);
        
        const oppositeColor = GameState.getOppositeColor(
            GameState.getPieceColor(move.to)
        );
        
        let status = '';
        
        // Check if opponent is in check
        if (MoveGeneration.isInCheck(oppositeColor)) {
            // Check if it's checkmate
            const legalMoves = MoveGeneration.getAllLegalMoves(oppositeColor);
            if (legalMoves.length === 0) {
                status = '#'; // Checkmate
            } else {
                status = '+'; // Check
            }
        }
        
        // Restore board position
        GameState.setPiece(move.from, originalFromPiece);
        GameState.setPiece(move.to, originalToPiece);
        
        return status;
    },
    
    // Convert move to standard algebraic notation (primary method)
    toAlgebraic(move) {
        return this.formatMove(move);
    },
    
    // Format a complete game move pair (White move, Black move)
    formatMovePair(whiteMove, blackMove, moveNumber) {
        let result = `${moveNumber}.`;
        
        if (whiteMove) {
            result += ` ${this.formatMove(whiteMove)}`;
        }
        
        if (blackMove) {
            result += ` ${this.formatMove(blackMove)}`;
        }
        
        return result;
    },
    
    // Parse algebraic notation back to move (for future use)
    fromAlgebraic(notation, gameState) {
        // TODO: Implement parsing of algebraic notation to move object
        // This would be useful for loading games from PGN format
        return null;
    }
};

window.MoveNotation = MoveNotation;