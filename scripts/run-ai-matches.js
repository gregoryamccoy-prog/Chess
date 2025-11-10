#!/usr/bin/env node

const { runMatchSeries } = require('../tests/helpers/simulator');

function parseArgs(argv) {
    const options = {};

    argv.forEach(arg => {
        const [key, value] = arg.replace(/^--/, '').split('=');
        if (!key) return;
        options[key] = value ?? true;
    });

    const deterministic = options.deterministic === 'true' || options.deterministic === true;
    const engineOverrides = {
        minThinkTime: options.minThinkTime ? parseInt(options.minThinkTime, 10) : 0,
        timeLimit: options.timeLimit ? parseInt(options.timeLimit, 10) : 500
    };

    if (deterministic) {
        engineOverrides.variationScale = 0;
    }

    return {
        games: options.games ? parseInt(options.games, 10) : 4,
        depth: options.depth ? parseInt(options.depth, 10) : 3,
        maxPly: options.maxPly ? parseInt(options.maxPly, 10) : 200,
        logGames: options.log === 'true' || options.log === true || false,
        engineOverrides
    };
}

function printSummary(result) {
    console.log('=== AI Match Series Summary ===');
    console.log(`Games played: ${result.games}`);
    console.log(`Average plies: ${result.stats.averagePly.toFixed(1)}`);
    console.log(`White wins: ${result.stats.whiteWins}`);
    console.log(`Black wins: ${result.stats.blackWins}`);
    console.log(`Draws: ${result.stats.draws}`);
    console.log('Termination reasons:', result.stats.reasons);

    console.log('\nPer-game results:');
    result.summaries.forEach(summary => {
        console.log(
            `Game ${summary.game}: ${summary.winner || 'draw'} via ${summary.reason} in ${summary.plyCount} plies`
        );
    });
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const series = await runMatchSeries(options);
    printSummary(series);
}

main().catch(error => {
    console.error('Match runner failed:', error);
    process.exit(1);
});
