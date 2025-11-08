# Chess Keyboard Edition

A sophisticated browser-based chess game with full keyboard controls, featuring advanced AI, complete rule implementation, and accessibility-focused design.

## 🎯 Features

### Core Gameplay
- **Complete Chess Rules**: All standard rules including castling, en passant, pawn promotion
- **Smart AI Opponent**: Advanced minimax engine with alpha-beta pruning and iterative deepening
- **Multiple Game Modes**: Play as White, Black, or watch AI vs AI battles
- **Threefold Repetition**: Automatic draw detection for repeated positions
- **Game State Detection**: Check, checkmate, stalemate, and draw conditions

### User Experience
- **100% Keyboard Accessible**: Full navigation and control via keyboard only
- **Real-time Move Validation**: Instant feedback on legal/illegal moves
- **Move History**: Complete game record in algebraic notation
- **Visual Feedback**: Square highlighting for selections and legal moves
- **Pause/Resume**: Spacebar to pause AI vs AI games for analysis

### Technical Features
- **No Backend Required**: Runs entirely in the browser
- **Responsive Design**: Works on desktop and tablet devices
- **Performance Optimized**: Efficient move generation and AI search
- **Clean Architecture**: Modular JavaScript with clear separation of concerns

## 🎮 Controls

| Key | Action |
|-----|--------|
| **Arrow Keys** | Navigate between squares or through legal moves |
| **Enter** | Select piece or confirm move |
| **Escape** | Cancel current selection |
| **Spacebar** | Pause/Resume (AI vs AI mode only) |

## 🏗️ Project Structure

```
Chess/
├── index.html                    # Main application entry point
├── styles/
│   └── main.css                 # Complete styling and chess board design
└── js/
    ├── main.js                  # Application initialization and setup
    ├── gameState.js             # Core game state and position management
    ├── gameController.js        # Game flow, AI coordination, state detection
    ├── moveGeneration.js        # Complete chess move generation engine
    ├── aiEngine.js              # Advanced AI with minimax and evaluation
    ├── chessEngine.js           # Legacy engine (kept for compatibility)
    ├── boardRenderer.js         # Visual board rendering and highlighting
    ├── inputHandler.js          # Keyboard input processing
    └── moveNotation.js          # Algebraic notation and move formatting
```

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Chess
   ```

2. **Run locally**:
   ```bash
   # Option 1: Python
   python3 -m http.server 8000
   
   # Option 2: Node.js
   npx serve .
   
   # Option 3: Any static file server
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`

4. **Start playing**:
   - Choose your color (White/Black/AI vs AI)
   - Use arrow keys to navigate
   - Press Enter to select and move pieces

## 🧠 AI Engine Details

### Algorithm
- **Minimax with Alpha-Beta Pruning**: Efficient search tree traversal
- **Iterative Deepening**: Progressive depth increase within time limits
- **Position Evaluation**: Material + positional tables + strategic factors
- **Move Ordering**: Captures prioritized for better pruning

### Difficulty Characteristics
- **Search Depth**: 5 plies (configurable)
- **Thinking Time**: 2-3 seconds per move
- **Playing Strength**: Intermediate level (~1200-1400 ELO estimated)
- **Style Variation**: Randomized evaluation for varied games

### Strategic Knowledge
- King safety evaluation
- Pawn structure analysis
- Piece activity and mobility
- Opening variety through controlled randomness

## 🔧 Development Status

### ✅ Completed Features
- [x] Complete project architecture and modular design
- [x] Full chess rule implementation with all special moves
- [x] Advanced AI engine with sophisticated evaluation
- [x] Keyboard-only interface with accessibility focus
- [x] Game state management and detection
- [x] Visual board rendering with highlighting
- [x] Move history and algebraic notation
- [x] Multiple game modes (Human vs AI, AI vs AI)
- [x] Threefold repetition detection
- [x] Draw conditions (50-move rule, insufficient material)
- [x] Pause/resume functionality for AI analysis
- [x] Error handling and graceful degradation
- [x] Performance optimization and clean code
- [x] Comprehensive documentation

### 🎯 Optional Enhancements
- [ ] Sound effects and audio feedback
- [ ] Animated piece movements
- [ ] Game save/load functionality
- [ ] Position analysis tools
- [ ] Opening book integration
- [ ] Endgame tablebase support

## 🌐 Browser Compatibility

**Recommended**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features Used**:
- Modern JavaScript (ES6+)
- CSS Grid and Flexbox
- Local Storage API
- Promise/Async handling

## 🏆 Technical Achievements

- **Zero Dependencies**: Pure JavaScript implementation
- **Modular Architecture**: Clean separation of concerns
- **Performance Optimized**: Efficient algorithms and data structures
- **Accessibility First**: Full keyboard navigation support
- **Production Ready**: Error handling, fallbacks, and edge case management

## 📝 License

MIT License - See project requirements document for full details.

## 🤝 Contributing

This project represents a complete implementation of browser-based chess. While feature-complete, contributions for enhancements, optimizations, or additional accessibility features are welcome.

---

**Enjoy playing chess! 🏁♟️**