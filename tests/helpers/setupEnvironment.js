const path = require('path');

let modulesLoaded = false;

function setupGlobalEnvironment() {
    if (!global.window) {
        global.window = global;
    }

    if (!global.window.showError) {
        global.window.showError = () => {};
    }

    if (!global.document) {
        const noop = () => {};
        const dummyElement = {
            className: '',
            dataset: {},
            style: {},
            innerHTML: '',
            textContent: '',
            appendChild: noop,
            addEventListener: noop,
            classList: {
                add: noop,
                remove: noop
            }
        };

        global.document = {
            getElementById: () => dummyElement,
            createElement: () => ({ ...dummyElement })
        };
    }
}

function loadCoreModules() {
    if (modulesLoaded) {
        return {
            GameState: window.GameState,
            MoveGeneration: window.MoveGeneration,
            AIEngine: window.AIEngine
        };
    }

    const basePath = path.join(__dirname, '../../js');

    require(path.join(basePath, 'gameState.js'));
    require(path.join(basePath, 'moveGeneration.js'));
    require(path.join(basePath, 'aiEngine.js'));

    modulesLoaded = true;

    return {
        GameState: window.GameState,
        MoveGeneration: window.MoveGeneration,
        AIEngine: window.AIEngine
    };
}

module.exports = {
    setupGlobalEnvironment,
    loadCoreModules
};
