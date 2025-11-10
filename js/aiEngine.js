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

const WHITE = 'white';
const BLACK = 'black';

const AIEngine = {
    // AI configuration
    maxDepth: 6,        // Maximum search depth (balanced for performance vs strength)
    timeLimit: 30000,   // Target thinking time in milliseconds
    minThinkTime: 2000, // Minimum thinking time for realistic behavior
    variationScale: 0,  // Multiplier for evaluation randomness (0 = deterministic)
    mobilityWeight: 0.4, // Weight applied to mobility evaluation
    quiescenceDepth: 3,  // Maximum capture depth for quiescence search
    phaseMaterialBaseline: 62, // Approximate total non-pawn material at game start
    phasePieceValues: {
        'Q': 9,
        'R': 5,
        'B': 3,
        'N': 3
    },
    
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
        const { timeLimit: adaptiveLimit, minThinkTime: adaptiveMinThink } = this.getAdaptiveTiming();
        const baseTimeLimit = adaptiveLimit ?? this.timeLimit;
        const effectiveTimeLimit = Math.max(200, baseTimeLimit);
        const requestedMinThink = adaptiveMinThink ?? this.minThinkTime;
        const effectiveMinThink = Math.max(0, Math.min(requestedMinThink, effectiveTimeLimit));
        const deadline = startTime + effectiveTimeLimit;
        const allMoves = MoveGeneration.getAllLegalMoves(GameState.sideToMove);
        
        if (allMoves.length === 0) {
            return null; // No legal moves available
        }
        
        // Check if in check for priority handling
        const isInCheck = MoveGeneration.isInCheck(GameState.sideToMove);
        
        console.log(`AI evaluating ${allMoves.length} moves${isInCheck ? ' (in check)' : ''}...`);
        
        // Use iterative deepening for better time management and move ordering
        const perspectiveColor = GameState.sideToMove; // Keep evaluation perspective consistent for entire search
        let bestMove = null;
        let bestScore = -Infinity;
        let bestDepth = 0;
        
        // Start with shallow search and progressively deepen
        for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
            if (Date.now() >= deadline) {
                break;
            }
            
            const result = this.minimax(currentDepth, -Infinity, Infinity, true, perspectiveColor, deadline);
            
            if (result.timedOut) {
                break;
            }
            
            if (result.move) {
                bestMove = result.move;
                bestScore = result.score;
                bestDepth = currentDepth;
            }
        }
        
        if (!bestMove) {
            bestMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        }
        
        const elapsed = Date.now() - startTime;
        
        // Ensure minimum thinking time for realistic AI behavior
        const remainingTime = effectiveMinThink - elapsed;
        if (remainingTime > 0) {
            return new Promise(resolve => {
                setTimeout(() => {
                    console.log(`AI selected: ${GameState.indexToAlgebraic(bestMove.from)} → ${GameState.indexToAlgebraic(bestMove.to)} (${elapsed + remainingTime}ms, depth=${bestDepth})`);
                    resolve(bestMove);
                }, remainingTime);
            });
        }
        
        console.log(`AI selected: ${GameState.indexToAlgebraic(bestMove.from)} → ${GameState.indexToAlgebraic(bestMove.to)} (${elapsed}ms, depth=${bestDepth})`);
        return bestMove;
    },
    
    // Minimax algorithm with alpha-beta pruning
    // Returns {score, move} where score is the evaluation and move is the best move found
    minimax(depth, alpha, beta, isMaximizing, perspectiveColor, deadline) {
        // Check time limit to avoid exceeding allocated thinking time
        if (Date.now() >= deadline) {
            return { score: this.evaluatePosition(perspectiveColor), move: null, timedOut: true };
        }
        
        // Base case: reached maximum search depth
        let remainingDepth = depth;
        
        if (remainingDepth === 0) {
            // Extend search one ply if the current player is in check
            const inCheck = MoveGeneration.isInCheck(GameState.sideToMove);
            if (!inCheck) {
                const qResult = this.quiescence(alpha, beta, isMaximizing, perspectiveColor, this.quiescenceDepth, deadline);
                return { score: qResult.score, move: null, timedOut: qResult.timedOut };
            } else {
                remainingDepth = 1;
            }
        }
        
        const currentColor = GameState.sideToMove;
        const moves = MoveGeneration.getAllLegalMoves(currentColor);
        
        // Terminal node handling (checkmate or stalemate)
        if (moves.length === 0) {
            const inCheck = MoveGeneration.isInCheck(currentColor);
            if (inCheck) {
                const score = currentColor === perspectiveColor ? -20000 : 20000;
                return { score, move: null, timedOut: false };
            }
            return { score: 0, move: null, timedOut: false }; // Stalemate
        }
        
        // Order moves for better alpha-beta pruning (captures first, then other moves)
        this.orderMoves(moves);
        
        let bestMove = null;
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            let bestMoves = []; // Track moves with similar scores
            
            for (const move of moves) {
                this.makeMove(move);
                const evaluation = this.minimax(remainingDepth - 1, alpha, beta, false, perspectiveColor, deadline);
                this.undoMove(move);

                if (evaluation.timedOut) {
                    return evaluation;
                }
                
                if (evaluation.score > maxEval + 5) {
                    maxEval = evaluation.score;
                    bestMoves = [move];
                } else if (Math.abs(evaluation.score - maxEval) <= 5) {
                    if (evaluation.score > maxEval) {
                        maxEval = evaluation.score;
                    }
                    bestMoves.push(move);
                }
                
                alpha = Math.max(alpha, evaluation.score);
                if (beta <= alpha) {
                    break;
                }
            }
            
            // Randomly select from best moves to add variety
            bestMove = bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : moves[0];
            
            return { score: maxEval, move: bestMove, timedOut: false };
        } else {
            let minEval = Infinity;
            let bestMoves = []; // Track moves with similar scores
            
            for (const move of moves) {
                this.makeMove(move);
                const evaluation = this.minimax(remainingDepth - 1, alpha, beta, true, perspectiveColor, deadline);
                this.undoMove(move);

                if (evaluation.timedOut) {
                    return evaluation;
                }
                
                if (evaluation.score < minEval - 5) {
                    minEval = evaluation.score;
                    bestMoves = [move];
                } else if (Math.abs(evaluation.score - minEval) <= 5) {
                    if (evaluation.score < minEval) {
                        minEval = evaluation.score;
                    }
                    bestMoves.push(move);
                }
                
                beta = Math.min(beta, evaluation.score);
                if (beta <= alpha) {
                    break;
                }
            }
            
            // Randomly select from best moves to add variety
            bestMove = bestMoves.length > 0 ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : moves[0];
            
            return { score: minEval, move: bestMove, timedOut: false };
        }
    },
    
    orderMoves(moves) {
        moves.sort((a, b) => this.getMoveOrderingScore(b) - this.getMoveOrderingScore(a));
    },
    
    getMoveOrderingScore(move) {
        const movingPiece = GameState.getPiece(move.from) || move.piece;
        const movingValue = movingPiece ? (this.pieceValues[movingPiece[1]] || 0) : 0;
        const capturedValue = move.captured ? (this.pieceValues[move.captured[1]] || 0) : 0;
        let score = capturedValue * 10 - movingValue;
        
        if (move.type === 'promotion') {
            const promoteTo = move.promoteTo || 'Q';
            score += (this.pieceValues[promoteTo] || 0) * 5;
        }
        
        if (move.type === 'castling') {
            score += 30;
        }
        
        return score;
    },
    
    quiescence(alpha, beta, isMaximizing, perspectiveColor, depthRemaining, deadline) {
        if (Date.now() >= deadline) {
            return { score: this.evaluatePosition(perspectiveColor), timedOut: true };
        }
        
        const standPat = this.evaluatePosition(perspectiveColor);
        
        if (isMaximizing) {
            if (standPat >= beta) {
                return { score: standPat, timedOut: false };
            }
            if (standPat > alpha) {
                alpha = standPat;
            }
        } else {
            if (standPat <= alpha) {
                return { score: standPat, timedOut: false };
            }
            if (standPat < beta) {
                beta = standPat;
            }
        }
        
        if (depthRemaining === 0) {
            return { score: standPat, timedOut: false };
        }
        
        const currentColor = GameState.sideToMove;
        const captureMoves = MoveGeneration.getAllLegalMoves(currentColor).filter(move => {
            return move.captured || move.type === 'promotion';
        });
        
        if (captureMoves.length === 0) {
            return { score: standPat, timedOut: false };
        }
        
        this.orderMoves(captureMoves);
        
        if (isMaximizing) {
            let maxEval = standPat;
            
            for (const move of captureMoves) {
                this.makeMove(move);
                const result = this.quiescence(alpha, beta, false, perspectiveColor, depthRemaining - 1, deadline);
                this.undoMove(move);
                
                if (result.timedOut) {
                    return result;
                }
                
                if (result.score > maxEval) {
                    maxEval = result.score;
                }
                
                if (maxEval > alpha) {
                    alpha = maxEval;
                }
                
                if (alpha >= beta) {
                    break;
                }
            }
            
            return { score: maxEval, timedOut: false };
        } else {
            let minEval = standPat;
            
            for (const move of captureMoves) {
                this.makeMove(move);
                const result = this.quiescence(alpha, beta, true, perspectiveColor, depthRemaining - 1, deadline);
                this.undoMove(move);
                
                if (result.timedOut) {
                    return result;
                }
                
                if (result.score < minEval) {
                    minEval = result.score;
                }
                
                if (minEval < beta) {
                    beta = minEval;
                }
                
                if (alpha >= beta) {
                    break;
                }
            }
            
            return { score: minEval, timedOut: false };
        }
    },
    
    // Comprehensive position evaluation function
    // Returns a score in centipawns (positive = good for side to move, negative = bad)
    evaluatePosition(perspectiveColor = null) {
        const referenceColor = perspectiveColor 
            || (GameState.gameMode === 'ai-vs-ai' ? GameState.sideToMove : GameState.aiColor);
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
                if (color === referenceColor) {
                    score += totalValue;
                } else {
                    score -= totalValue;
                }
            }
        }
        
        // 2. Strategic evaluation factors
        score += this.evaluateKingSafety(referenceColor);
        score += this.evaluatePawnStructure(referenceColor);
        score += this.evaluatePieceActivity(referenceColor);
        score += this.evaluateRookPlacement(referenceColor);
        score += this.evaluateMinorPiecePlacement(referenceColor);
        
        // 3. Add controlled randomness for game variety
        score += this.getRandomnessContribution(GameState.moveHistory.length);
        
        return score;
    },
    
    // Evaluate king safety - penalties for exposed kings, bonuses for castled kings
    evaluateKingSafety(referenceColor) {
        const phase = this.getGamePhaseRatio();
        const whiteScore = this.calculateKingSafetyForColor(WHITE, phase);
        const blackScore = this.calculateKingSafetyForColor(BLACK, phase);
        return referenceColor === WHITE ? whiteScore - blackScore : blackScore - whiteScore;
    },
    
    calculateKingSafetyForColor(color, phase) {
        const kingIndex = GameState.findKing(color);
        if (kingIndex === null) {
            return 0;
        }
        
        const rank = Math.floor(kingIndex / 8);
        const file = kingIndex % 8;
        const homeRank = color === WHITE ? 0 : 7;
        let score = 0;
        
        // Penalize overextended kings more in early phase
        const earlyWeight = phase;
        const endgameWeight = 1 - phase;
        const safeRank = color === WHITE ? 1 : 6;
        if ((color === WHITE && rank > safeRank) || (color === BLACK && rank < safeRank)) {
            score -= earlyWeight * (Math.abs(rank - safeRank) + 1) * 8;
        }
        
        // Reward pawn shield around the king
        const direction = color === WHITE ? 1 : -1;
        let shield = 0;
        for (let step = 1; step <= 2; step++) {
            const targetRank = rank + direction * step;
            if (targetRank < 0 || targetRank > 7) continue;
            
            for (let offset = -1; offset <= 1; offset++) {
                const targetFile = file + offset;
                if (targetFile < 0 || targetFile > 7) continue;
                const idx = GameState.rankFileToIndex(targetRank, targetFile);
                const pawnCode = color === WHITE ? 'wP' : 'bP';
                if (GameState.getPiece(idx) === pawnCode) {
                    shield++;
                }
            }
        }
        
        score += shield * 4 * earlyWeight;
        if (shield === 0) {
            score -= 12;
        }
        
        // Minor bonus for castling (king still on starting rank but shifted)
        if (Math.abs(file - 4) === 2 && rank === homeRank) {
            score += 10;
        }

        // Encourage centralization in endgame
        const centerRank = 3.5;
        const centerFile = 3.5;
        const distanceFromCenter = Math.abs(rank - centerRank) + Math.abs(file - centerFile);
        score += endgameWeight * (12 - distanceFromCenter * 4);
        
        return score;
    },
    
    // Evaluate pawn structure - penalties for doubled/isolated pawns, bonuses for passed pawns
    evaluatePawnStructure(referenceColor) {
        const whiteScore = this.calculatePawnStructureForColor(WHITE);
        const blackScore = this.calculatePawnStructureForColor(BLACK);
        return referenceColor === WHITE ? whiteScore - blackScore : blackScore - whiteScore;
    },
    
    // Evaluate piece activity and mobility (simplified version for performance)
    evaluatePieceActivity(referenceColor) {
        const originalSide = GameState.sideToMove;
        let score = 0;
        
        try {
            GameState.sideToMove = referenceColor;
            const friendlyMoves = MoveGeneration.getAllLegalMoves(referenceColor).length;
            
            const opponentColor = GameState.getOppositeColor(referenceColor);
            GameState.sideToMove = opponentColor;
            const opponentMoves = MoveGeneration.getAllLegalMoves(opponentColor).length;
            
            score = (friendlyMoves - opponentMoves) * this.mobilityWeight;
        } finally {
            GameState.sideToMove = originalSide;
        }
        
        return score;
    },

    evaluateRookPlacement(referenceColor) {
        const whiteScore = this.calculateRookPlacementForColor(WHITE);
        const blackScore = this.calculateRookPlacementForColor(BLACK);
        return referenceColor === WHITE ? whiteScore - blackScore : blackScore - whiteScore;
    },

    calculateRookPlacementForColor(color) {
        const pawnCounts = {
            white: new Array(8).fill(0),
            black: new Array(8).fill(0)
        };

        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece === 'wP') pawnCounts.white[i % 8]++;
            if (piece === 'bP') pawnCounts.black[i % 8]++;
        }

        let score = 0;

        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece !== (color === WHITE ? 'wR' : 'bR')) continue;

            const file = i % 8;
            const rank = Math.floor(i / 8);
            const friendlyPawns = color === WHITE ? pawnCounts.white[file] : pawnCounts.black[file];
            const enemyPawns = color === WHITE ? pawnCounts.black[file] : pawnCounts.white[file];

            if (friendlyPawns === 0 && enemyPawns === 0) {
                score += 18; // Open file
            } else if (friendlyPawns === 0 && enemyPawns > 0) {
                score += 10; // Semi-open file
            }

            if ((color === WHITE && rank === 6) || (color === BLACK && rank === 1)) {
                score += 8; // Seventh rank pressure
            }
        }

        return score;
    },

    evaluateMinorPiecePlacement(referenceColor) {
        const whiteScore = this.calculateMinorPiecePlacement(WHITE);
        const blackScore = this.calculateMinorPiecePlacement(BLACK);
        return referenceColor === WHITE ? whiteScore - blackScore : blackScore - whiteScore;
    },

    calculateMinorPiecePlacement(color) {
        let score = 0;

        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (!piece || GameState.getPieceColor(i) !== color) {
                continue;
            }

            const [rank, file] = GameState.indexToRankFile(i);

            if (piece[1] === 'N') {
                score += this.scoreKnightPlacement(color, rank, file);
            } else if (piece[1] === 'B') {
                score += this.scoreBishopPlacement(color, rank, file);
            }
        }

        return score;
    },

    scoreKnightPlacement(color, rank, file) {
        let score = 0;
        const isEnemyHalf = color === WHITE ? rank >= 4 : rank <= 3;
        if (isEnemyHalf) {
            score += 8;
            if ((color === WHITE && rank >= 5) || (color === BLACK && rank <= 2)) {
                score += 4;
            }
        }

        const isCentralFile = file >= 2 && file <= 5;
        if (isCentralFile) {
            score += 4;
        }

        // Simple pawn support (pawn one rank behind on same file)
        const supportRank = color === WHITE ? rank - 1 : rank + 1;
        if (supportRank >= 0 && supportRank <= 7) {
            const supportIndex = GameState.rankFileToIndex(supportRank, file);
            const supportPawn = color === WHITE ? 'wP' : 'bP';
            if (GameState.getPiece(supportIndex) === supportPawn) {
                score += 3;
            }
        }

        return score;
    },

    scoreBishopPlacement(color, rank, file) {
        let score = 0;
        const isLongDiagonal = (rank === file) || (rank + file === 7);
        if (isLongDiagonal) {
            score += 6;
        }

        const enemyHalf = color === WHITE ? rank >= 4 : rank <= 3;
        if (enemyHalf) {
            score += 4;
        }

        // Reward bishops fianchettoed with pawn support
        const homeRank = color === WHITE ? 0 : 7;
        if (Math.abs(file - 2) === 1 && Math.abs(rank - (homeRank + (color === WHITE ? 1 : -1))) === 0) {
            score += 3;
        }

        return score;
    },
    
    calculatePawnStructureForColor(color) {
        const pawnCode = color === WHITE ? 'wP' : 'bP';
        const opponentPawn = color === WHITE ? 'bP' : 'wP';
        const pawnFiles = new Array(8).fill(0);
        const pawnSquares = [];
        
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (piece === pawnCode) {
                pawnFiles[i % 8]++;
                pawnSquares.push(i);
            }
        }
        
        let score = 0;
        
        // Doubled pawns
        for (let file = 0; file < 8; file++) {
            if (pawnFiles[file] > 1) {
                score -= (pawnFiles[file] - 1) * 10;
            }
        }
        
        for (const square of pawnSquares) {
            const [rank, file] = GameState.indexToRankFile(square);
            
            // Isolated pawn (no friendly pawns on adjacent files)
            const hasLeftSupport = file > 0 && pawnFiles[file - 1] > 0;
            const hasRightSupport = file < 7 && pawnFiles[file + 1] > 0;
            if (!hasLeftSupport && !hasRightSupport) {
                score -= 15;
            }
            
            // Passed pawn detection
            if (this.isPassedPawn(square, color, opponentPawn)) {
                const progress = color === WHITE ? rank : 7 - rank;
                score += 20 + progress * 2;
            }
        }
        
        return score;
    },
    
    isPassedPawn(squareIndex, color, opponentPawnCode) {
        const [rank, file] = GameState.indexToRankFile(squareIndex);
        const direction = color === WHITE ? 1 : -1;
        const startRank = rank + direction;
        
        for (let r = startRank; r >= 0 && r <= 7; r += direction) {
            for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
                const targetFile = file + fileOffset;
                if (targetFile < 0 || targetFile > 7) continue;
                const idx = GameState.rankFileToIndex(r, targetFile);
                if (GameState.getPiece(idx) === opponentPawnCode) {
                    return false;
                }
            }
        }
        
        return true;
    },
    
    getRandomnessContribution(moveCount) {
        if (this.variationScale <= 0) {
            return 0;
        }
        
        let base = 10;
        if (moveCount < 10) {
            base = 25;
        } else if (moveCount < 20) {
            base = 15;
        }
        
        const factor = base * this.variationScale;
        if (factor === 0) {
            return 0;
        }
        
        return (Math.random() - 0.5) * factor;
    },

    getAdaptiveTiming() {
        const moveCount = GameState.moveHistory.length;
        const phase = this.getGamePhaseRatio();
        const baseTime = this.timeLimit;
        const baseMinThink = this.minThinkTime;
        
        let timeLimit = baseTime;
        let minThink = baseMinThink;
        
        if (baseTime <= 1000) {
            return {
                timeLimit: baseTime,
                minThinkTime: Math.min(baseMinThink, baseTime)
            };
        }
        
        if (moveCount < 8) {
            timeLimit = Math.min(baseTime, 4000);
            minThink = Math.min(timeLimit * 0.3, 600);
        } else if (moveCount < 20) {
            timeLimit = Math.min(baseTime, 12000);
            minThink = Math.max(600, Math.min(timeLimit * 0.4, 1500));
        } else if (phase < 0.35) {
            timeLimit = baseTime;
            minThink = baseMinThink;
        } else {
            timeLimit = Math.min(baseTime, 20000);
            minThink = Math.max(baseMinThink * 0.75, 1200);
        }
        
        return {
            timeLimit,
            minThinkTime: minThink
        };
    },

    getGamePhaseRatio() {
        let total = 0;
        for (let i = 0; i < 64; i++) {
            const piece = GameState.getPiece(i);
            if (!piece) continue;
            const type = piece[1];
            if (this.phasePieceValues[type]) {
                total += this.phasePieceValues[type];
            }
        }
        return Math.min(total / this.phaseMaterialBaseline, 1);
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

if (typeof window !== 'undefined') {
    window.AIEngine = AIEngine;
}
