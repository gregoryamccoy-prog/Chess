// Move Generation System
// Handles pseudo-legal move generation for all chess piece types

const MoveGeneration = {
    // Direction vectors for piece movement
    directions: {
        // Orthogonal (rook-like)
        orthogonal: [
            [-1, 0], [1, 0], [0, -1], [0, 1]  // up, down, left, right
        ],
        // Diagonal (bishop-like)
        diagonal: [
            [-1, -1], [-1, 1], [1, -1], [1, 1]  // up-left, up-right, down-left, down-right
        ],
        // Knight moves
        knight: [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ],
        // King moves (one square in any direction)
        king: [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ]
    },

    // Get all legal moves for a specific piece
    getLegalMovesForPiece(squareIndex) {
        const piece = GameState.getPiece(squareIndex);
        if (!piece) return [];

        const color = GameState.getPieceColor(squareIndex);
        const pieceType = GameState.getPieceType(squareIndex);

        // Only generate moves for current player's pieces
        if (color !== GameState.sideToMove) return [];

        // Generate pseudo-legal moves based on piece type
        let pseudoLegalMoves = [];
        
        switch (pieceType) {
            case 'P':
                pseudoLegalMoves = this.generatePawnMoves(squareIndex, color);
                break;
            case 'N':
                pseudoLegalMoves = this.generateKnightMoves(squareIndex, color);
                break;
            case 'B':
                pseudoLegalMoves = this.generateBishopMoves(squareIndex, color);
                break;
            case 'R':
                pseudoLegalMoves = this.generateRookMoves(squareIndex, color);
                break;
            case 'Q':
                pseudoLegalMoves = this.generateQueenMoves(squareIndex, color);
                break;
            case 'K':
                pseudoLegalMoves = this.generateKingMoves(squareIndex, color);
                break;
            default:
                return [];
        }

        // Filter out moves that would leave king in check
        return this.filterLegalMoves(squareIndex, pseudoLegalMoves);
    },

    // Get all legal moves for a color
    getAllLegalMoves(color) {
        const allMoves = [];
        
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece && GameState.getPieceColor(i) === color) {
                const pieceMoves = this.getLegalMovesForPiece(i);
                // pieceMoves is already an array of move objects with {from, to, captured}
                allMoves.push(...pieceMoves);
            }
        }
        
        return allMoves;
    },

    // Convert square index to rank/file coordinates
    indexToCoords(index) {
        return {
            rank: Math.floor(index / 8),
            file: index % 8
        };
    },

    // Convert rank/file coordinates to square index
    coordsToIndex(rank, file) {
        if (rank < 0 || rank > 7 || file < 0 || file > 7) return null;
        return rank * 8 + file;
    },

    // Check if a square is on the board
    isValidSquare(rank, file) {
        return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
    },

        // Generate pawn moves
    generatePawnMoves(squareIndex, color) {
        const moves = [];
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        const isWhite = color === 'white';
        const direction = isWhite ? 1 : -1;  // White moves up (+1), black moves down (-1)
        const startingRank = isWhite ? 1 : 6;
        const promotionRank = isWhite ? 7 : 0;
        
        // Forward move (one square)
        const oneSquareForward = rank + direction;
        if (this.isValidSquare(oneSquareForward, file)) {
            const targetIndex = GameState.rankFileToIndex(oneSquareForward, file);
            
            if (!GameState.getPiece(targetIndex)) {
                // Check for promotion
                if (oneSquareForward === promotionRank) {
                    // Auto-promote to queen as specified in requirements
                    moves.push({
                        from: squareIndex,
                        to: targetIndex,
                        captured: null,
                        type: 'promotion',
                        promoteTo: 'Q'
                    });
                } else {
                    moves.push({
                        from: squareIndex,
                        to: targetIndex,
                        captured: null
                    });
                }
                
                // Two squares forward (only if one square forward is empty and pawn is on starting rank)
                if (rank === startingRank) {
                    const twoSquareForward = rank + (2 * direction);
                    if (this.isValidSquare(twoSquareForward, file)) {
                        const twoSquareIndex = GameState.rankFileToIndex(twoSquareForward, file);
                        
                        if (!GameState.getPiece(twoSquareIndex)) {
                            moves.push({
                                from: squareIndex,
                                to: twoSquareIndex,
                                captured: null,
                                type: 'pawnDoubleMove'
                            });
                        }
                    }
                }
            }
        }
        
        // Diagonal captures
        for (const captureFile of [file - 1, file + 1]) {
            const captureRank = rank + direction;
            
            if (this.isValidSquare(captureRank, captureFile)) {
                const captureIndex = GameState.rankFileToIndex(captureRank, captureFile);
                const targetPiece = GameState.getPiece(captureIndex);
                
                // Regular capture
                if (targetPiece && GameState.getPieceColor(captureIndex) !== color) {
                    // Check for promotion
                    if (captureRank === promotionRank) {
                        moves.push({
                            from: squareIndex,
                            to: captureIndex,
                            captured: targetPiece,
                            type: 'promotion',
                            promoteTo: 'Q'
                        });
                    } else {
                        moves.push({
                            from: squareIndex,
                            to: captureIndex,
                            captured: targetPiece
                        });
                    }
                }
                
                // En passant capture
                if (GameState.enPassantSquare === captureIndex) {
                    // The captured pawn is on the same rank as the capturing pawn
                    const capturedPawnIndex = GameState.rankFileToIndex(rank, captureFile);
                    const capturedPawn = GameState.getPiece(capturedPawnIndex);
                    
                    if (capturedPawn && 
                        GameState.getPieceType(capturedPawnIndex) === 'P' &&
                        GameState.getPieceColor(capturedPawnIndex) !== color) {
                        
                        moves.push({
                            from: squareIndex,
                            to: captureIndex,
                            captured: capturedPawn,
                            type: 'enPassant',
                            capturedSquare: capturedPawnIndex
                        });
                    }
                }
            }
        }
        
        return moves;
    },

    // Generate knight moves
    generateKnightMoves(squareIndex, color) {
        const moves = [];
        const coords = this.indexToCoords(squareIndex);

        for (const [rankOffset, fileOffset] of this.directions.knight) {
            const newRank = coords.rank + rankOffset;
            const newFile = coords.file + fileOffset;
            const targetSquare = this.coordsToIndex(newRank, newFile);

            if (targetSquare !== null) {
                const targetPiece = GameState.getPiece(targetSquare);
                // Can move to empty square or capture opponent piece
                if (!targetPiece || GameState.getPieceColor(targetSquare) !== color) {
                    moves.push({
                        from: squareIndex,
                        to: targetSquare,
                        captured: targetPiece
                    });
                }
            }
        }

        return moves;
    },

    // Generate bishop moves
    generateBishopMoves(squareIndex, color) {
        return this.generateSlidingMoves(squareIndex, color, this.directions.diagonal);
    },

    // Generate rook moves
    generateRookMoves(squareIndex, color) {
        return this.generateSlidingMoves(squareIndex, color, this.directions.orthogonal);
    },

    // Generate queen moves (combination of rook and bishop)
    generateQueenMoves(squareIndex, color) {
        const rookMoves = this.generateRookMoves(squareIndex, color);
        const bishopMoves = this.generateBishopMoves(squareIndex, color);
        return [...rookMoves, ...bishopMoves];
    },

    // Generate king moves
    generateKingMoves(squareIndex, color) {
        const moves = [];
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        
        for (const [deltaRank, deltaFile] of this.directions.king) {
            const newRank = rank + deltaRank;
            const newFile = file + deltaFile;
            
            if (this.isValidSquare(newRank, newFile)) {
                const targetIndex = GameState.rankFileToIndex(newRank, newFile);
                const targetPiece = GameState.getPiece(targetIndex);
                
                // Can move to empty square or capture opponent's piece
                if (!targetPiece || GameState.getPieceColor(targetIndex) !== color) {
                    moves.push({
                        from: squareIndex,
                        to: targetIndex,
                        captured: targetPiece
                    });
                }
            }
        }
        
        // Add castling moves
        moves.push(...this.generateCastlingMoves(squareIndex, color));
        
        return moves;
    },

    // Generate castling moves for the king
    generateCastlingMoves(kingIndex, color) {
        const moves = [];
        
        // Can't castle if in check (but use a simple check that doesn't generate moves)
        if (this.isInCheckSimple(color)) {
            return moves;
        }
        
        const isWhite = color === 'white';
        const homeRank = isWhite ? 0 : 7;
        const kingFile = 4; // King starts on e-file
        
        // Verify king is on its starting square
        if (kingIndex !== GameState.rankFileToIndex(homeRank, kingFile)) {
            return moves;
        }
        
        // Check kingside castling
        if ((isWhite && GameState.castlingRights.whiteKingside) ||
            (!isWhite && GameState.castlingRights.blackKingside)) {
            
            if (this.canCastleKingside(color, homeRank)) {
                const targetIndex = GameState.rankFileToIndex(homeRank, 6); // g-file
                moves.push({
                    from: kingIndex,
                    to: targetIndex,
                    captured: null,
                    type: 'castling',
                    side: 'kingside'
                });
            }
        }
        
        // Check queenside castling
        if ((isWhite && GameState.castlingRights.whiteQueenside) ||
            (!isWhite && GameState.castlingRights.blackQueenside)) {
            
            if (this.canCastleQueenside(color, homeRank)) {
                const targetIndex = GameState.rankFileToIndex(homeRank, 2); // c-file
                moves.push({
                    from: kingIndex,
                    to: targetIndex,
                    captured: null,
                    type: 'castling',
                    side: 'queenside'
                });
            }
        }
        
        return moves;
    },

    // Simple check detection that doesn't generate castling moves (to avoid recursion)
    isInCheckSimple(color) {
        const kingSquare = GameState.findKing(color);
        return this.isSquareAttackedSimple(kingSquare, GameState.getOppositeColor(color));
    },

    // Simple square attack check that doesn't include castling moves
    isSquareAttackedSimple(squareIndex, attackerColor) {
        // Check all opponent pieces to see if any can attack this square
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (!piece || GameState.getPieceColor(i) !== attackerColor) {
                continue;
            }
            
            // Generate attacks for this piece (but no castling for kings)
            const attacks = this.generateAttacksForPieceSimple(i, attackerColor);
            if (attacks.includes(squareIndex)) {
                return true;
            }
        }
        
        return false;
    },

    // Generate attack squares for a piece (simple version without castling)
    generateAttacksForPieceSimple(squareIndex, color) {
        const pieceType = GameState.getPieceType(squareIndex);
        
        switch (pieceType) {
            case 'P':
                return this.generatePawnAttacks(squareIndex, color);
            case 'N':
                return this.generateKnightAttacks(squareIndex, color);
            case 'B':
                return this.generateBishopAttacks(squareIndex, color);
            case 'R':
                return this.generateRookAttacks(squareIndex, color);
            case 'Q':
                return this.generateQueenAttacks(squareIndex, color);
            case 'K':
                return this.generateKingAttacksSimple(squareIndex, color);
            default:
                return [];
        }
    },

    // Generate king attack squares (simple version without castling)
    generateKingAttacksSimple(squareIndex, color) {
        const attacks = [];
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        
        for (const [deltaRank, deltaFile] of this.directions.king) {
            const newRank = rank + deltaRank;
            const newFile = file + deltaFile;
            
            if (this.isValidSquare(newRank, newFile)) {
                attacks.push(GameState.rankFileToIndex(newRank, newFile));
            }
        }
        
        return attacks;
    },

    // Check if kingside castling is possible
    canCastleKingside(color, rank) {
        // Check if squares between king and rook are empty (f and g files)
        const fSquare = GameState.rankFileToIndex(rank, 5);
        const gSquare = GameState.rankFileToIndex(rank, 6);
        
        if (GameState.getPiece(fSquare) || GameState.getPiece(gSquare)) {
            return false;
        }
        
        // Check if rook is in correct position
        const rookSquare = GameState.rankFileToIndex(rank, 7);
        const rook = GameState.getPiece(rookSquare);
        if (!rook || GameState.getPieceType(rookSquare) !== 'R' || 
            GameState.getPieceColor(rookSquare) !== color) {
            return false;
        }
        
        // Check that king doesn't pass through or end up in check
        const kingSquare = GameState.rankFileToIndex(rank, 4);
        const opponentColor = GameState.getOppositeColor(color);
        
        // Temporarily move king to f-file and check for attacks
        GameState.setPiece(fSquare, GameState.getPiece(kingSquare));
        GameState.setPiece(kingSquare, null);
        const fSquareUnderAttack = this.isSquareAttackedSimple(fSquare, opponentColor);
        
        // Temporarily move king to g-file and check for attacks  
        GameState.setPiece(gSquare, GameState.getPiece(fSquare));
        GameState.setPiece(fSquare, null);
        const gSquareUnderAttack = this.isSquareAttackedSimple(gSquare, opponentColor);
        
        // Restore king position
        GameState.setPiece(kingSquare, GameState.getPiece(gSquare));
        GameState.setPiece(gSquare, null);
        
        return !fSquareUnderAttack && !gSquareUnderAttack;
    },

    // Check if queenside castling is possible
    canCastleQueenside(color, rank) {
        // Check if squares between king and rook are empty (b, c, d files)
        const bSquare = GameState.rankFileToIndex(rank, 1);
        const cSquare = GameState.rankFileToIndex(rank, 2);
        const dSquare = GameState.rankFileToIndex(rank, 3);
        
        if (GameState.getPiece(bSquare) || GameState.getPiece(cSquare) || GameState.getPiece(dSquare)) {
            return false;
        }
        
        // Check if rook is in correct position
        const rookSquare = GameState.rankFileToIndex(rank, 0);
        const rook = GameState.getPiece(rookSquare);
        if (!rook || GameState.getPieceType(rookSquare) !== 'R' || 
            GameState.getPieceColor(rookSquare) !== color) {
            return false;
        }
        
        // Check that king doesn't pass through or end up in check (only c and d need to be checked)
        const kingSquare = GameState.rankFileToIndex(rank, 4);
        const opponentColor = GameState.getOppositeColor(color);
        
        // Temporarily move king to d-file and check for attacks
        GameState.setPiece(dSquare, GameState.getPiece(kingSquare));
        GameState.setPiece(kingSquare, null);
        const dSquareUnderAttack = this.isSquareAttackedSimple(dSquare, opponentColor);
        
        // Temporarily move king to c-file and check for attacks
        GameState.setPiece(cSquare, GameState.getPiece(dSquare));
        GameState.setPiece(dSquare, null);
        const cSquareUnderAttack = this.isSquareAttackedSimple(cSquare, opponentColor);
        
        // Restore king position
        GameState.setPiece(kingSquare, GameState.getPiece(cSquare));
        GameState.setPiece(cSquare, null);
        
        return !dSquareUnderAttack && !cSquareUnderAttack;
    },

    // Generate sliding moves (for rook, bishop, queen)
    generateSlidingMoves(squareIndex, color, directions) {
        const moves = [];
        const coords = this.indexToCoords(squareIndex);

        for (const [rankOffset, fileOffset] of directions) {
            let currentRank = coords.rank + rankOffset;
            let currentFile = coords.file + fileOffset;

            while (this.isValidSquare(currentRank, currentFile)) {
                const currentSquare = this.coordsToIndex(currentRank, currentFile);
                const targetPiece = GameState.getPiece(currentSquare);

                if (!targetPiece) {
                    // Empty square - can move here, and continue checking further squares
                    moves.push({
                        from: squareIndex,
                        to: currentSquare,
                        captured: null
                    });
                } else {
                    // Square occupied
                    if (GameState.getPieceColor(currentSquare) !== color) {
                        // Opponent piece - can capture, but can't move past it
                        moves.push({
                            from: squareIndex,
                            to: currentSquare,
                            captured: targetPiece
                        });
                    }
                    // Can't move past any piece (friendly or enemy)
                    break;
                }

                currentRank += rankOffset;
                currentFile += fileOffset;
            }
        }

        return moves;
    },

    // Filter moves to only include legal moves (don't leave king in check)
    filterLegalMoves(fromSquare, pseudoLegalMoves) {
        const legalMoves = [];
        
        for (const move of pseudoLegalMoves) {
            if (this.isMoveLegal(fromSquare, move.to)) {
                legalMoves.push(move);
            }
        }
        
        return legalMoves;
    },

    // Check if a move is legal (doesn't leave king in check)
    isMoveLegal(fromSquare, toSquare) {
        // Save current game state
        const originalPiece = GameState.getPiece(fromSquare);
        const capturedPiece = GameState.getPiece(toSquare);
        
        // Determine the color of the moving piece BEFORE making the move
        const ourColor = GameState.getPieceColor(fromSquare);
        
        // Make the move temporarily
        GameState.setPiece(toSquare, originalPiece);
        GameState.setPiece(fromSquare, null);
        
        // Check if our king is in check after this move
        const kingSquare = GameState.findKing(ourColor);
        const isLegal = !this.isSquareAttacked(kingSquare, GameState.getOppositeColor(ourColor));
        
        // Restore original position
        GameState.setPiece(fromSquare, originalPiece);
        GameState.setPiece(toSquare, capturedPiece);
        
        return isLegal;
    },

    // Check if a square is attacked by the given color
    isSquareAttacked(squareIndex, attackerColor) {
        if (squareIndex === null) return false;
        
        // Check all pieces of the attacking color
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece && GameState.getPieceColor(i) === attackerColor) {
                // Generate pseudo-legal moves for this piece (without filtering)
                const pseudoMoves = this.generatePseudoLegalMoves(i);
                // Check if any move targets the square we're checking
                for (const move of pseudoMoves) {
                    if (move.to === squareIndex) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    },

    // Generate pseudo-legal moves without legal filtering (for attack detection)
    generatePseudoLegalMoves(squareIndex) {
        const piece = GameState.getPiece(squareIndex);
        if (!piece) return [];

        const color = GameState.getPieceColor(squareIndex);
        const pieceType = GameState.getPieceType(squareIndex);

        switch (pieceType) {
            case 'P':
                return this.generatePawnMoves(squareIndex, color);
            case 'N':
                return this.generateKnightMoves(squareIndex, color);
            case 'B':
                return this.generateBishopMoves(squareIndex, color);
            case 'R':
                return this.generateRookMoves(squareIndex, color);
            case 'Q':
                return this.generateQueenMoves(squareIndex, color);
            case 'K':
                return this.generateKingMoves(squareIndex, color);
            default:
                return [];
        }
    },

    // Check if the current player is in check
    isInCheck(color) {
        const kingSquare = GameState.findKing(color);
        
        if (kingSquare === null) {
            console.log(`ERROR: No ${color} king found on the board!`);
            return false;
        }
        
        const inCheck = this.isSquareAttacked(kingSquare, GameState.getOppositeColor(color));
        
        if (inCheck) {
            console.log(`${color} king at ${GameState.indexToAlgebraic(kingSquare)} is IN CHECK`);
        }
        
        return inCheck;
    },

    // Generate pawn attack squares (diagonal only, no forward moves)
    generatePawnAttacks(squareIndex, color) {
        const attacks = [];
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        const isWhite = color === 'white';
        const direction = isWhite ? 1 : -1;
        
        // Diagonal attacks only
        for (const captureFile of [file - 1, file + 1]) {
            const captureRank = rank + direction;
            
            if (this.isValidSquare(captureRank, captureFile)) {
                attacks.push(GameState.rankFileToIndex(captureRank, captureFile));
            }
        }
        
        return attacks;
    },

    // Generate knight attack squares
    generateKnightAttacks(squareIndex, color) {
        const attacks = [];
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        
        for (const [deltaRank, deltaFile] of this.directions.knight) {
            const newRank = rank + deltaRank;
            const newFile = file + deltaFile;
            
            if (this.isValidSquare(newRank, newFile)) {
                attacks.push(GameState.rankFileToIndex(newRank, newFile));
            }
        }
        
        return attacks;
    },

    // Generate bishop attack squares
    generateBishopAttacks(squareIndex, color) {
        return this.generateSlidingAttacks(squareIndex, this.directions.diagonal);
    },

    // Generate rook attack squares
    generateRookAttacks(squareIndex, color) {
        return this.generateSlidingAttacks(squareIndex, this.directions.orthogonal);
    },

    // Generate queen attack squares
    generateQueenAttacks(squareIndex, color) {
        return this.generateSlidingAttacks(squareIndex, [...this.directions.orthogonal, ...this.directions.diagonal]);
    },

    // Generate sliding piece attacks (bishop, rook, queen)
    generateSlidingAttacks(squareIndex, directions) {
        const attacks = [];
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        
        for (const [deltaRank, deltaFile] of directions) {
            let currentRank = rank + deltaRank;
            let currentFile = file + deltaFile;
            
            while (this.isValidSquare(currentRank, currentFile)) {
                const targetIndex = GameState.rankFileToIndex(currentRank, currentFile);
                attacks.push(targetIndex);
                
                // Stop after hitting any piece (attack includes the square even if occupied)
                if (GameState.getPiece(targetIndex)) {
                    break;
                }
                
                currentRank += deltaRank;
                currentFile += deltaFile;
            }
        }
        
        return attacks;
    },

    // Debug: print all legal moves for a piece
    debugPieceMoves(squareIndex) {
        const piece = GameState.getPiece(squareIndex);
        const moves = this.getLegalMovesForPiece(squareIndex);
        
        console.log(`Legal moves for ${piece} at ${GameState.indexToAlgebraic(squareIndex)}:`);
        for (const move of moves) {
            console.log(`  -> ${GameState.indexToAlgebraic(move)}`);
        }
        
        return moves;
    }
};

window.MoveGeneration = MoveGeneration;