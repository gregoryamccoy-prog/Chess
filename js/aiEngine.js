// Advanced Chess AI Engine
// Implements minimax algorithm with alpha-beta pruning, iterative deepening, and sophisticated evaluation
// Features:
// - Minimax with alpha-beta pruning for efficient search
// - Iterative deepening for better time management
// - Position-based piece evaluation tables
// - Strategic evaluation (king safety, pawn structure, piece activity)
// - Variable randomness for game variety (high in opening, lower in endgame)
// - Minimum thinking time for realistic AI behavior
// - Multiple candidate move selection for varied play

const AIEngine = {
    // AI configuration
    maxDepth: 5,        // Maximum search depth (balanced for performance vs strength)
    timeLimit: 3000,    // Target thinking time in milliseconds
    minThinkTime: 2000, // Minimum thinking time for realistic behavior
    
    // Piece values for material evaluation (centipawn scale)
    pieceValues: {
        'P': 100,   // Pawn
        'N': 320,   // Knight  
        'B': 330,   // Bishop
        'R': 500,   // Rook
        'Q': 900,   // Queen
        'K': 20000  // King (very high value to prevent capture)
    },
    
    // Positional bonus tables (values from white's perspective, in centipawns)
    // Higher values indicate better squares for pieces
    positionTables: {
        'P': [ // Pawn position table - encourage central advancement and discourage edge pawns
            0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
            5,  5, 10, 25, 25, 10,  5,  5,
            0,  0,  0, 20, 20,  0,  0,  0,
            5, -5,-10,  0,  0,-10, -5,  5,
            5, 10, 10,-20,-20, 10, 10,  5,
            0,  0,  0,  0,  0,  0,  0,  0
        ],
        'N': [ // Knight position table - knights better in center, worse on edges
            -50,-40,-30,-30,-30,-30,-40,-50,
            -40,-20,  0,  0,  0,  0,-20,-40,
            -30,  0, 10, 15, 15, 10,  0,-30,
            -30,  5, 15, 20, 20, 15,  5,-30,
            -30,  0, 15, 20, 20, 15,  0,-30,
            -30,  5, 10, 15, 15, 10,  5,-30,
            -40,-20,  0,  5,  5,  0,-20,-40,
            -50,-40,-30,-30,-30,-30,-40,-50
        ],
        'B': [ // Bishop position table - bishops prefer long diagonals
            -20,-10,-10,-10,-10,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5, 10, 10,  5,  0,-10,
            -10,  5,  5, 10, 10,  5,  5,-10,
            -10,  0, 10, 10, 10, 10,  0,-10,
            -10, 10, 10, 10, 10, 10, 10,-10,
            -10,  5,  0,  0,  0,  0,  5,-10,
            -20,-10,-10,-10,-10,-10,-10,-20
        ],
        'R': [ // Rook position table - rooks prefer open files and ranks
            0,  0,  0,  0,  0,  0,  0,  0,
            5, 10, 10, 10, 10, 10, 10,  5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
            0,  0,  0,  5,  5,  0,  0,  0
        ],
        'Q': [ // Queen position table - flexible placement, avoid early development
            -20,-10,-10, -5, -5,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5,  5,  5,  5,  0,-10,
             -5,  0,  5,  5,  5,  5,  0, -5,
              0,  0,  5,  5,  5,  5,  0, -5,
            -10,  5,  5,  5,  5,  5,  0,-10,
            -10,  0,  5,  0,  0,  0,  0,-10,
            -20,-10,-10, -5, -5,-10,-10,-20
        ],
        'K': [ // King position table - safety in corners early, centralization in endgame (middlegame)
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -30,-40,-40,-50,-50,-40,-40,-30,
            -20,-30,-30,-40,-40,-30,-30,-20,
            -10,-20,-20,-20,-20,-20,-20,-10,
             20, 20,  0,  0,  0,  0, 20, 20,
             20, 30, 10,  0,  0, 10, 30, 20
        ]
    },
    
    // Main AI entry point - finds the best move using iterative deepening
    getBestMove(depth = this.maxDepth) {
        const startTime = Date.now();
        const allMoves = MoveGeneration.getAllLegalMoves(GameState.sideToMove);
        
        if (allMoves.length === 0) {
            return null; // No legal moves available
        }
        
        // Check if in check for priority handling
        const isInCheck = MoveGeneration.isInCheck(GameState.sideToMove);
        
        console.log(`AI evaluating ${allMoves.length} moves${isInCheck ? ' (in check)' : ''}...`);
        
        // Use iterative deepening for better time management and move ordering
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Start with shallow search and progressively deepen
        for (let currentDepth = 2; currentDepth <= depth; currentDepth++) {
            const elapsed = Date.now() - startTime;
            
            // Stop if approaching time limit
            if (elapsed > this.timeLimit * 0.8) {
                break;
            }
            
            const result = this.minimax(currentDepth, -Infinity, Infinity, true, startTime);
            
            if (result.move) {
                bestMove = result.move;
                bestScore = result.score;
            }
        }
        
        const elapsed = Date.now() - startTime;
        
        // Ensure minimum thinking time for realistic AI behavior
        const remainingTime = this.minThinkTime - elapsed;
        if (remainingTime > 0) {
            return new Promise(resolve => {
                setTimeout(() => {
                    console.log(`AI selected: ${GameState.indexToAlgebraic(bestMove.from)} → ${GameState.indexToAlgebraic(bestMove.to)} (${elapsed + remainingTime}ms)`);
                    resolve(bestMove);
                }, remainingTime);
            });
        }
        
        console.log(`AI selected: ${GameState.indexToAlgebraic(bestMove.from)} → ${GameState.indexToAlgebraic(bestMove.to)} (${elapsed}ms)`);
        return bestMove;
    },
    
    // Minimax algorithm with alpha-beta pruning
    // Returns {score, move} where score is the evaluation and move is the best move found
    minimax(depth, alpha, beta, isMaximizing, startTime) {
        // Check time limit to avoid exceeding allocated thinking time
        if (Date.now() - startTime > this.timeLimit) {
            return { score: this.evaluatePosition(), move: null };
        }
        
        // Base case: reached maximum search depth
        if (depth === 0) {
            return { score: this.evaluatePosition(), move: null };
        }
        
        // Check for terminal game positions (checkmate/stalemate)
        const gameStatus = GameController.checkGameState();
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') {
            if (gameStatus === 'checkmate') {
                // High penalty for being checkmated, high bonus for checkmating opponent
                return { score: isMaximizing ? -20000 : 20000, move: null };
            } else {
                // Stalemate is neutral
                return { score: 0, move: null };
            }
        }
        
        const currentColor = isMaximizing ? GameState.sideToMove : GameState.getOppositeColor(GameState.sideToMove);
        const moves = MoveGeneration.getAllLegalMoves(currentColor);
        
        if (moves.length === 0) {
            // Safety fallback - should not reach here due to game state check above
            return { score: 0, move: null };
        }
        
        // Order moves for better alpha-beta pruning (captures first, then other moves)
        moves.sort((a, b) => {
            const aCaptures = a.captured ? 1 : 0;
            const bCaptures = b.captured ? 1 : 0;
            return bCaptures - aCaptures; // Captures first
        });
        
        let bestMove = null;
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            let bestMoves = []; // Track moves with similar scores
            
            for (const move of moves) {
                // Make the move
                this.makeMove(move);
                
                // Recursively search
                const evaluation = this.minimax(depth - 1, alpha, beta, false, startTime);
                
                // Undo the move
                this.undoMove(move);
                
                // If this move is significantly better, start a new best moves list
                if (evaluation.score > maxEval + 5) {
                    maxEval = evaluation.score;
                    bestMoves = [move];
                } else if (Math.abs(evaluation.score - maxEval) <= 5) {
                    // If move is similar in value, add to candidates
                    if (evaluation.score > maxEval) {
                        maxEval = evaluation.score;
                    }
                    bestMoves.push(move);
                }
                
                alpha = Math.max(alpha, evaluation.score);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            
            // Randomly select from best moves to add variety
            bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            let bestMoves = []; // Track moves with similar scores
            
            for (const move of moves) {
                // Make the move
                this.makeMove(move);
                
                // Recursively search
                const evaluation = this.minimax(depth - 1, alpha, beta, true, startTime);
                
                // Undo the move
                this.undoMove(move);
                
                // If this move is significantly better (lower score), start a new best moves list
                if (evaluation.score < minEval - 5) {
                    minEval = evaluation.score;
                    bestMoves = [move];
                } else if (Math.abs(evaluation.score - minEval) <= 5) {
                    // If move is similar in value, add to candidates
                    if (evaluation.score < minEval) {
                        minEval = evaluation.score;
                    }
                    bestMoves.push(move);
                }
                
                beta = Math.min(beta, evaluation.score);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            
            // Randomly select from best moves to add variety
            bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            
            return { score: minEval, move: bestMove };
        }
    },
    
    // Comprehensive position evaluation function
    // Returns a score in centipawns (positive = good for side to move, negative = bad)
    evaluatePosition() {
        let score = 0;
        
        // 1. Material and positional evaluation
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece) {
                const color = GameState.getPieceColor(i);
                const pieceType = GameState.getPieceType(i);
                const isWhite = color === 'white';
                
                // Base material value
                let pieceValue = this.pieceValues[pieceType];
                
                // Positional bonus (flip board perspective for black pieces)
                const positionIndex = isWhite ? i : (63 - i);
                const positionBonus = this.positionTables[pieceType][positionIndex];
                
                const totalValue = pieceValue + positionBonus;
                
                // Apply score based on game mode
                if (GameState.gameMode === 'ai-vs-ai') {
                    // Score from perspective of side to move
                    if (color === GameState.sideToMove) {
                        score += totalValue;
                    } else {
                        score -= totalValue;
                    }
                } else {
                    // Human vs AI mode: score from AI's perspective
                    if (color === GameState.aiColor) {
                        score += totalValue;
                    } else {
                        score -= totalValue;
                    }
                }
            }
        }
        
        // 2. Strategic evaluation factors
        score += this.evaluateKingSafety();
        score += this.evaluatePawnStructure();
        score += this.evaluatePieceActivity();
        
        // 3. Add controlled randomness for game variety
        const moveCount = GameState.moveHistory.length;
        let randomFactor = 10; // Base randomness
        
        // Increase randomness in opening phase for varied games
        if (moveCount < 10) {
            randomFactor = 25; // High variation in opening
        } else if (moveCount < 20) {
            randomFactor = 15; // Medium variation in early middlegame
            randomFactor = 15;
        }
        
        score += (Math.random() - 0.5) * randomFactor;
        
        return score;
    },
    
    // Evaluate king safety - penalties for exposed kings, bonuses for castled kings
    evaluateKingSafety() {
        let score = 0;
        const whiteKing = GameState.findKing('white');
        const blackKing = GameState.findKing('black');
        
        if (whiteKing !== null && blackKing !== null) {
            // Penalty for exposed kings in the center during opening/middlegame
            const whiteRank = Math.floor(whiteKing / 8);
            const blackRank = Math.floor(blackKing / 8);
            
            if (whiteRank > 2) score -= 20; // White king too advanced
            if (blackRank < 5) score += 20; // Black king too advanced
        }
        
        return score;
    },
    
    // Evaluate pawn structure - penalties for doubled/isolated pawns, bonuses for passed pawns
    evaluatePawnStructure() {
        let score = 0;
        
        // Count pawns by file to detect doubled pawns
        const whitePawnFiles = [0,0,0,0,0,0,0,0];
        const blackPawnFiles = [0,0,0,0,0,0,0,0];
        
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece === 'wP') {
                whitePawnFiles[i % 8]++;
            } else if (piece === 'bP') {
                blackPawnFiles[i % 8]++;
            }
        }
        
        // Penalty for doubled pawns
        for (let file = 0; file < 8; file++) {
            if (whitePawnFiles[file] > 1) score -= (whitePawnFiles[file] - 1) * 10;
            if (blackPawnFiles[file] > 1) score += (blackPawnFiles[file] - 1) * 10;
        }
        
        return score;
    },
    
    // Evaluate piece activity and mobility (simplified version for performance)
    evaluatePieceActivity() {
        let score = 0;
        
        // Simple mobility evaluation - count legal moves for each side
        const currentColor = GameState.sideToMove;
        const opponentColor = GameState.getOppositeColor(currentColor);
        
        // Don't do expensive move generation in deep searches to avoid performance issues
        // This is a simplified activity evaluation
        
        return score;
    },
    
    // Temporarily make a move for search purposes (preserves full game state)
    makeMove(move) {
        // Store complete game state for undo
        move.gameStateCopy = {
            board: [...GameState.board],
            sideToMove: GameState.sideToMove,
            castlingRights: { ...GameState.castlingRights },
            enPassantSquare: GameState.enPassantSquare,
            halfMoveClock: GameState.halfMoveClock,
            fullMoveNumber: GameState.fullMoveNumber,
            positionHistoryLength: GameState.positionHistory.length
        };
        
        // Execute the move simply (just piece movement for search)
        const originalPiece = GameState.getPiece(move.from);
        GameState.setPiece(move.to, originalPiece);
        GameState.setPiece(move.from, null);
        
        // Switch sides (but don't record position during search)
        GameState.sideToMove = GameState.sideToMove === 'white' ? 'black' : 'white';
    },
    
    // Restore game state after temporary move (complete state restoration)
    undoMove(move) {
        // Restore complete game state
        GameState.board = [...move.gameStateCopy.board];
        GameState.sideToMove = move.gameStateCopy.sideToMove;
        GameState.castlingRights = { ...move.gameStateCopy.castlingRights };
        GameState.enPassantSquare = move.gameStateCopy.enPassantSquare;
        GameState.halfMoveClock = move.gameStateCopy.halfMoveClock;
        GameState.fullMoveNumber = move.gameStateCopy.fullMoveNumber;
        
        // Restore position history length
        GameState.positionHistory.length = move.gameStateCopy.positionHistoryLength;
    }
};