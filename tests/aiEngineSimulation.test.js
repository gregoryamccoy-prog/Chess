const test = require('node:test');
const assert = require('node:assert/strict');

const { playSingleGame, runMatchSeries } = require('./helpers/simulator');

test('AI self-play game completes with a terminal result', async (t) => {
    const result = await playSingleGame({
        depth: 2,
        maxPly: 80,
        engineOverrides: { minThinkTime: 0, timeLimit: 200 }
    });

    assert.notEqual(result.status, 'ongoing', 'game should terminate');
    assert.ok(result.plyCount > 0, 'game should have at least one ply');
    t.diagnostic(`Result: ${result.status} (${result.reason}) after ${result.plyCount} plies`);
});

test('AI match series aggregates statistics', async (t) => {
    const series = await runMatchSeries({
        games: 1,
        depth: 1,
        maxPly: 60,
        engineOverrides: { minThinkTime: 0, timeLimit: 200 }
    });

    assert.equal(series.games, 1);
    assert.equal(series.summaries.length, 1);
    assert.ok(series.stats.averagePly > 0);

    t.diagnostic(`Series stats: ${JSON.stringify(series.stats)}`);
});
