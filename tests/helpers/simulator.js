const { setupGlobalEnvironment, loadCoreModules } = require('./setupEnvironment');

setupGlobalEnvironment();

const { GameState, MoveGeneration, AIEngine } = loadCoreModules();

const WHITE = 'white';
const BLACK = 'black';

function cloneMove(move) {
    const copy = { ...move };
    delete copy.gameStateCopy;
    return copy;
}

function applyMove(rawMove) {
    const move = cloneMove(rawMove);
    const movingPiece = GameState.getPiece(move.from);

    if (!movingPiece) {
        throw new Error(`No piece found on ${move.from} (${GameState.indexToAlgebraic(move.from)})`);
    }

    const color = movingPiece[0] === 'w' ? WHITE : BLACK;
    const pieceType = movingPiece[1];
    let capturedPiece = move.captured ?? GameState.getPiece(move.to);

    // Handle en passant capture (captured pawn is not on destination square)
    if (move.type === 'enPassant') {
        const capturedSquare = move.capturedSquare;
        if (typeof capturedSquare === 'number') {
            capturedPiece = GameState.getPiece(capturedSquare);
            GameState.setPiece(capturedSquare, null);
        }
    }

    // Handle castling rook movement
    if (move.type === 'castling') {
        const rank = color === WHITE ? 0 : 7;
        if (move.side === 'kingside') {
            const rookFrom = GameState.rankFileToIndex(rank, 7);
            const rookTo = GameState.rankFileToIndex(rank, 5);
            GameState.setPiece(rookTo, GameState.getPiece(rookFrom));
            GameState.setPiece(rookFrom, null);
        } else if (move.side === 'queenside') {
            const rookFrom = GameState.rankFileToIndex(rank, 0);
            const rookTo = GameState.rankFileToIndex(rank, 3);
            GameState.setPiece(rookTo, GameState.getPiece(rookFrom));
            GameState.setPiece(rookFrom, null);
        }
    }

    let pieceToPlace = movingPiece;

    if (move.type === 'promotion') {
        const promoteTo = move.promoteTo || 'Q';
        pieceToPlace = `${movingPiece[0]}${promoteTo}`;
        move.promoteTo = promoteTo;
        move.promotedPiece = pieceToPlace;
    }

    GameState.setPiece(move.to, pieceToPlace);
    GameState.setPiece(move.from, null);

    move.piece = movingPiece;
    move.captured = capturedPiece ?? null;

    updateCastlingRights(move, pieceType, color, capturedPiece);
    updateEnPassantState(move, pieceType, color);
    updateClocks(pieceType, capturedPiece);

    GameState.moveHistory.push(move);
    GameState.switchSide();

    return move;
}

function updateClocks(pieceType, capturedPiece) {
    if (pieceType === 'P' || capturedPiece) {
        GameState.halfMoveClock = 0;
    } else {
        GameState.halfMoveClock++;
    }
}

function updateEnPassantState(move, pieceType, color) {
    if (pieceType === 'P' && move.type === 'pawnDoubleMove') {
        const [fromRank, fromFile] = GameState.indexToRankFile(move.from);
        const enPassantRank = color === WHITE ? fromRank + 1 : fromRank - 1;
        GameState.enPassantSquare = GameState.rankFileToIndex(enPassantRank, fromFile);
    } else {
        GameState.enPassantSquare = null;
    }
}

function updateCastlingRights(move, pieceType, color, capturedPiece) {
    const [fromRank, fromFile] = GameState.indexToRankFile(move.from);

    if (pieceType === 'K') {
        if (color === WHITE) {
            GameState.castlingRights.whiteKingside = false;
            GameState.castlingRights.whiteQueenside = false;
        } else {
            GameState.castlingRights.blackKingside = false;
            GameState.castlingRights.blackQueenside = false;
        }
    }

    if (pieceType === 'R') {
        if (color === WHITE && fromRank === 0) {
            if (fromFile === 0) {
                GameState.castlingRights.whiteQueenside = false;
            } else if (fromFile === 7) {
                GameState.castlingRights.whiteKingside = false;
            }
        } else if (color === BLACK && fromRank === 7) {
            if (fromFile === 0) {
                GameState.castlingRights.blackQueenside = false;
            } else if (fromFile === 7) {
                GameState.castlingRights.blackKingside = false;
            }
        }
    }

    if (capturedPiece) {
        const [toRank, toFile] = GameState.indexToRankFile(move.to);
        if (toRank === 0 && toFile === 0) {
            GameState.castlingRights.whiteQueenside = false;
        } else if (toRank === 0 && toFile === 7) {
            GameState.castlingRights.whiteKingside = false;
        } else if (toRank === 7 && toFile === 0) {
            GameState.castlingRights.blackQueenside = false;
        } else if (toRank === 7 && toFile === 7) {
            GameState.castlingRights.blackKingside = false;
        }
    }
}

function evaluateGameStatus() {
    const currentPlayer = GameState.sideToMove;
    const legalMoves = MoveGeneration.getAllLegalMoves(currentPlayer);
    const inCheck = MoveGeneration.isInCheck(currentPlayer);

    if (legalMoves.length === 0) {
        if (inCheck) {
            const winner = GameState.getOppositeColor(currentPlayer);
            GameState.gameStatus = 'checkmate';
            GameState.winner = winner;
            return { status: 'checkmate', winner, reason: 'checkmate' };
        }
        GameState.gameStatus = 'stalemate';
        GameState.winner = null;
        return { status: 'stalemate', winner: null, reason: 'stalemate' };
    }

    if (isInsufficientMaterial()) {
        GameState.gameStatus = 'draw';
        GameState.winner = null;
        return { status: 'draw', winner: null, reason: 'insufficient-material' };
    }

    if (GameState.halfMoveClock >= 100) {
        GameState.gameStatus = 'draw';
        GameState.winner = null;
        return { status: 'draw', winner: null, reason: 'fifty-move' };
    }

    if (GameState.isThreefoldRepetition()) {
        GameState.gameStatus = 'draw';
        GameState.winner = null;
        return { status: 'draw', winner: null, reason: 'threefold-repetition' };
    }

    GameState.gameStatus = inCheck ? 'check' : 'active';
    GameState.winner = null;
    return { status: 'ongoing' };
}

function isInsufficientMaterial() {
    const pieces = countPieces();

    if (pieces.total === 2) {
        return true;
    }

    if (pieces.total === 3) {
        return pieces.wB === 1 || pieces.bB === 1 || pieces.wN === 1 || pieces.bN === 1;
    }

    if (pieces.total === 4 && pieces.wB === 1 && pieces.bB === 1) {
        return bishopsOnSameColor();
    }

    return false;
}

function countPieces() {
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
}

function bishopsOnSameColor() {
    let whiteColor = null;
    let blackColor = null;

    for (let i = 0; i < 64; i++) {
        const piece = GameState.getPiece(i);
        if (piece === 'wB') {
            const [rank, file] = GameState.indexToRankFile(i);
            whiteColor = (rank + file) % 2;
        } else if (piece === 'bB') {
            const [rank, file] = GameState.indexToRankFile(i);
            blackColor = (rank + file) % 2;
        }
    }

    return whiteColor !== null && whiteColor === blackColor;
}

function formatMove(move) {
    const piece = move.piece || GameState.getPiece(move.to);
    const from = GameState.indexToAlgebraic(move.from);
    const to = GameState.indexToAlgebraic(move.to);
    const capture = move.captured ? `x${move.captured}` : '';
    const promo = move.promoteTo ? `=${move.promoteTo}` : '';
    return `${piece}:${from}->${to}${capture}${promo}${move.type === 'castling' ? ` (${move.side} castle)` : ''}`;
}

function applyEngineOverrides(overrides = {}) {
    const keys = Object.keys(overrides);
    const original = {};

    for (const key of keys) {
        original[key] = AIEngine[key];
        AIEngine[key] = overrides[key];
    }

    return original;
}

function restoreEngineOverrides(original) {
    Object.entries(original).forEach(([key, value]) => {
        AIEngine[key] = value;
    });
}

async function playSingleGame(options = {}) {
    const {
        depth = AIEngine.maxDepth,
        maxPly = 200,
        engineOverrides = { minThinkTime: 0, timeLimit: 500, variationScale: 0 },
        logMoves = false
    } = options;

    const overrides = { minThinkTime: 0, ...engineOverrides };
    const originalEngineConfig = applyEngineOverrides(overrides);

    GameState.init();
    GameState.gameMode = 'ai-vs-ai';
    GameState.playerColor = null;
    GameState.aiColor = null;

    const moves = [];
    let ply = 0;

    while (ply < maxPly) {
        const bestMoveResult = AIEngine.getBestMove(depth);
        const bestMove = bestMoveResult && typeof bestMoveResult.then === 'function'
            ? await bestMoveResult
            : bestMoveResult;

        if (!bestMove) {
            restoreEngineOverrides(originalEngineConfig);
            return {
                status: 'draw',
                winner: null,
                reason: 'no-legal-moves',
                moves,
                plyCount: ply
            };
        }

        const committedMove = applyMove(bestMove);
        moves.push(committedMove);
        ply++;

        if (logMoves) {
            console.log(`Ply ${ply}: ${formatMove(committedMove)}`);
        }

        const status = evaluateGameStatus();
        if (status.status !== 'ongoing') {
            restoreEngineOverrides(originalEngineConfig);
            return {
                ...status,
                moves,
                plyCount: ply
            };
        }
    }

    restoreEngineOverrides(originalEngineConfig);
    return {
        status: 'draw',
        winner: null,
        reason: 'move-limit',
        moves,
        plyCount: ply
    };
}

async function runMatchSeries(options = {}) {
    const {
        games = 2,
        depth = AIEngine.maxDepth,
        maxPly = 200,
        engineOverrides,
        logGames = false
    } = options;

    const summaries = [];
    const stats = {
        whiteWins: 0,
        blackWins: 0,
        draws: 0,
        reasons: {},
        totalPly: 0
    };

    for (let game = 1; game <= games; game++) {
        const result = await playSingleGame({
            depth,
            maxPly,
            engineOverrides,
            logMoves: logGames
        });

        stats.totalPly += result.plyCount;

        if (result.status === 'checkmate') {
            if (result.winner === WHITE) {
                stats.whiteWins++;
            } else {
                stats.blackWins++;
            }
        } else {
            stats.draws++;
        }

        stats.reasons[result.reason] = (stats.reasons[result.reason] || 0) + 1;

        summaries.push({
            game,
            winner: result.winner,
            reason: result.reason,
            plyCount: result.plyCount
        });
    }

    const averagePly = games > 0 ? stats.totalPly / games : 0;

    return {
        games,
        stats: {
            ...stats,
            averagePly
        },
        summaries
    };
}

module.exports = {
    playSingleGame,
    runMatchSeries,
    evaluateGameStatus,
    applyMove,
    formatMove
};
