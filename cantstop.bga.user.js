// ==UserScript==
// @name bga-cantstop
// @description Extended statistics for Can't Stop game at BGA
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.9.1-dev
// @match https://boardgamearena.com/*/cantstop*
// @match https://*.boardgamearena.com/*/cantstop*
// @grant none
// @updateURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/cantstop.bga.user.js
// @downloadURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/cantstop.bga.user.js
// ==/UserScript==

// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

console.log('BGA userscript for Can\'t Stop');

const USERSCRIPT_LOAD_TIMEOUT_MS = 5000;
const DICE_SELECT_ID_PREFIX = "dice_select_";
const PROBABILITY_PANEL_ID_PREFIX = "dice_probability_";
const PROBABILITY_PANEL_CLASS = "dice_probability_cell";
const CANT_STOP_COLUMN_PROBABILITIES = [
    0.00,  // [00]
    0.00,  // [01]
    13.19, // [02]
    23.30, // [03]
    35.57, // [04]
    44.75, // [05]
    56.10, // [06]
    64.35, // [07]
    56.10, // [08]
    44.75, // [09]
    35.57, // [10]
    23.30, // [11]
    13.19, // [12]
]
const CANT_STOP_COLUMNS_PROBABILITIES = {
    '02-03-04': 52.16,
    '02-03-05': 58.41,
    '02-03-06': 68.36,
    '02-03-07': 75.23,
    '02-03-08': 75.62,
    '02-03-09': 71.22,
    '02-03-10': 63.43,
    '02-03-11': 52.55,
    '02-03-12': 43.83,
    '02-04-05': 65.74,
    '02-04-06': 75.85,
    '02-04-07': 80.71,
    '02-04-08': 81.56,
    '02-04-09': 75.62,
    '02-04-10': 73.84,
    '02-04-11': 63.43,
    '02-04-12': 55.17,
    '02-05-06': 77.01,
    '02-05-07': 80.94,
    '02-05-08': 82.87,
    '02-05-09': 76.00,
    '02-05-10': 75.62,
    '02-05-11': 71.22,
    '02-05-12': 63.43,
    '02-06-07': 86.42,
    '02-06-08': 88.35,
    '02-06-09': 83.33,
    '02-06-10': 81.10,
    '02-06-11': 75.62,
    '02-06-12': 73.84,
    '02-07-08': 89.04,
    '02-07-09': 83.56,
    '02-07-10': 83.33,
    '02-07-11': 77.85,
    '02-07-12': 78.09,
    '02-08-09': 82.25,
    '02-08-10': 81.56,
    '02-08-11': 73.61,
    '02-08-12': 73.84,
    '02-09-10': 70.99,
    '02-09-11': 63.66,
    '02-09-12': 63.43,
    '02-10-11': 57.87,
    '02-10-12': 55.17,
    '02-11-12': 43.83,
    '03-04-05': 66.90,
    '03-04-06': 74.23,
    '03-04-07': 79.09,
    '03-04-08': 79.63,
    '03-04-09': 77.85,
    '03-04-10': 75.62,
    '03-04-11': 65.66,
    '03-04-12': 57.87,
    '03-05-06': 77.08,
    '03-05-07': 78.70,
    '03-05-08': 80.79,
    '03-05-09': 77.62,
    '03-05-10': 75.85,
    '03-05-11': 70.99,
    '03-05-12': 63.66,
    '03-06-07': 86.50,
    '03-06-08': 85.34,
    '03-06-09': 82.64,
    '03-06-10': 82.25,
    '03-06-11': 75.85,
    '03-06-12': 73.61,
    '03-07-08': 89.27,
    '03-07-09': 84.26,
    '03-07-10': 83.56,
    '03-07-11': 77.62,
    '03-07-12': 77.85,
    '03-08-09': 83.56,
    '03-08-10': 83.33,
    '03-08-11': 75.85,
    '03-08-12': 75.62,
    '03-09-10': 77.85,
    '03-09-11': 70.99,
    '03-09-12': 71.22,
    '03-10-11': 65.66,
    '03-10-12': 63.43,
    '03-11-12': 52.55,
    '04-05-06': 79.63,
    '04-05-07': 84.80,
    '04-05-08': 84.57,
    '04-05-09': 79.86,
    '04-05-10': 82.25,
    '04-05-11': 77.85,
    '04-05-12': 70.99,
    '04-06-07': 88.58,
    '04-06-08': 91.13,
    '04-06-09': 86.42,
    '04-06-10': 88.35,
    '04-06-11': 83.33,
    '04-06-12': 81.56,
    '04-07-08': 90.28,
    '04-07-09': 89.27,
    '04-07-10': 87.65,
    '04-07-11': 83.56,
    '04-07-12': 83.33,
    '04-08-09': 86.27,
    '04-08-10': 88.35,
    '04-08-11': 82.25,
    '04-08-12': 81.10,
    '04-09-10': 82.25,
    '04-09-11': 75.85,
    '04-09-12': 75.62,
    '04-10-11': 75.62,
    '04-10-12': 73.84,
    '04-11-12': 63.43,
    '05-06-07': 88.66,
    '05-06-08': 89.51,
    '05-06-09': 86.65,
    '05-06-10': 86.27,
    '05-06-11': 83.56,
    '05-06-12': 82.25,
    '05-07-08': 91.44,
    '05-07-09': 85.34,
    '05-07-10': 89.27,
    '05-07-11': 84.26,
    '05-07-12': 83.56,
    '05-08-09': 86.65,
    '05-08-10': 86.42,
    '05-08-11': 82.64,
    '05-08-12': 83.33,
    '05-09-10': 79.86,
    '05-09-11': 77.62,
    '05-09-12': 76.00,
    '05-10-11': 77.85,
    '05-10-12': 75.62,
    '05-11-12': 71.22,
    '06-07-08': 91.98,
    '06-07-09': 91.44,
    '06-07-10': 90.28,
    '06-07-11': 89.27,
    '06-07-12': 89.04,
    '06-08-09': 89.51,
    '06-08-10': 91.13,
    '06-08-11': 85.34,
    '06-08-12': 88.35,
    '06-09-10': 84.57,
    '06-09-11': 80.79,
    '06-09-12': 82.87,
    '06-10-11': 79.63,
    '06-10-12': 81.56,
    '06-11-12': 75.62,
    '07-08-09': 88.66,
    '07-08-10': 88.58,
    '07-08-11': 86.50,
    '07-08-12': 86.42,
    '07-09-10': 84.80,
    '07-09-11': 78.70,
    '07-09-12': 80.94,
    '07-10-11': 79.09,
    '07-10-12': 80.71,
    '07-11-12': 75.23,
    '08-09-10': 79.63,
    '08-09-11': 77.08,
    '08-09-12': 77.01,
    '08-10-11': 74.23,
    '08-10-12': 75.85,
    '08-11-12': 68.36,
    '09-10-11': 66.90,
    '09-10-12': 65.74,
    '09-11-12': 58.41,
    '10-11-12': 52.16,
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function objectKeys(object) {
    return Object.keys(object);
}

function objectValues(object) {
    return Object.values(object);
}

function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}

function add(accumulator, a) {
    return accumulator + a;
}

var cantStopBgaUserscriptData = {
    dojo: null,
    game: null,
    myPlayerId: -1,
    playersStats: {},
    playersServerStats: {},

    init: function () {
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui.gamedatas ||
            !window.parent.gameui.gamedatas.playerorder || !window.parent.gameui.gamedatas.playerorder[0] ||
            !window.parent.gameui.gamedatas.columns) {
            return;
        }

        // init state
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;
        const myPlayerId = objectKeys(this.game.players)
            .find(k =>
                window.parent.gameui.gamedatas.players[k].name === window.parent.gameui.current_player_name);
        if (myPlayerId) {
            this.myPlayerId = parseInt(myPlayerId);
        }

        // Connect event handlers to follow game progress
        this.dojo.subscribe("rollDice", this, "onEventRollDice");
        // Possble events: gameStateChange tableDecision rollDice saveProgress moveToken removeProgress


        this.renderContainers();

        this.processPossibleMoves(this.game.gamestate.args, this.getUnsavedColumns());

        return this;
    },

    onEventRollDice: function (e) {
        console.log("onEventRollDice");
        this.processPossibleMoves(e.args, this.getUnsavedColumns());
    },

    processPossibleMoves: function (args, unsavedColumns) {
        console.log(`processPossibleMoves with unsavedColumns ${JSON.stringify(unsavedColumns)}`);
        let diceArray = args.dice;
        let playerId = parseInt(args.player_id);
        let possibleMovesArray = args.possibleMoves;
        const movesProbabilities = Array.from(Array(possibleMovesArray.length), () => new Array(2));
        for (let i = 0; i < possibleMovesArray.length; i++) {
            let index1 = i;
            let possibleMove = possibleMovesArray[i];
            let dice1 = possibleMove[0].dice;
            let dice2 = possibleMove[1].dice;
            let sum1 = dice1[0] + dice1[1];
            let sum2 = dice2[0] + dice2[1];
            let move1 = possibleMove[0].move;
            let move2 = possibleMove[1].move;
            {
                const index2 = 0;
                let probability1;
                if (possibleMove.both) {
                    probability1 = this.calculateSumsColumnProbability([sum1, sum2], unsavedColumns)
                } else {
                    probability1 = this.calculateSumsColumnProbability([sum1], unsavedColumns)
                }
                movesProbabilities[index1][index2] = {
                    probability: probability1,
                    both: possibleMove.both,
                    move: move1,
                };
                console.log(`${index1},${index2} with dice ${JSON.stringify(dice1)} and sum ${sum1} has probability ${probability1}`);
            }
            {
                const index2 = 1;
                let probability2;
                if (possibleMove.both) {
                    probability2 = this.calculateSumsColumnProbability([sum1, sum2], unsavedColumns);
                } else {
                    probability2 = this.calculateSumsColumnProbability([sum2], unsavedColumns);
                }
                movesProbabilities[index1][index2] = {
                    probability: probability2,
                    both: possibleMove.both,
                    move: move2,
                };
                console.log(`${index1},${index2} with dice ${JSON.stringify(dice2)} and sum ${sum2} has probability ${probability2}`);
            }
        }
        this.renderMovesProbabilities(movesProbabilities);
    },

    calculateSumsColumnProbability: function (sums, unsavedColumns) {
        let columnNumbers = [];
        const unsavedColumnNumbers = objectKeys(unsavedColumns).map(s => parseInt(s));
        unsavedColumnNumbers.forEach(unsavedColumnNumber => columnNumbers.push(unsavedColumnNumber));
        sums.forEach(sum => columnNumbers.push(sum));
        columnNumbers = columnNumbers.filter(onlyUnique);
        let probability;
        if (columnNumbers.length === 1) {
            probability = this.calculateColumnsProbability(columnNumbers[0]);
        } else if (columnNumbers.length === 2) {
            probability = this.calculateColumnsProbability(columnNumbers[0], columnNumbers[1]);
        } else if (columnNumbers.length === 3) {
            probability = this.calculateColumnsProbability(columnNumbers[0], columnNumbers[1], columnNumbers[2]);
        }
        return probability;
    },

    getUnsavedColumns: function () {
        const unsavedColumns = {};
        const activePlayerId = objectKeys(this.game.players)
            .find(k =>
                parseInt(this.game.players[k].player_id) === parseInt(this.game.gamestate.active_player));
        const unsavedTokensElements = this.dojo.query('.token.color_000000:not(.unmoving)');
        unsavedTokensElements.forEach((tokenElement) => {
            const column = parseInt(this.dojo.getAttr(tokenElement, 'data-column'));
            const height = parseInt(this.dojo.getAttr(tokenElement, 'data-height'));
            unsavedColumns[column] = {};
            unsavedColumns[column][activePlayerId] = height;
        });
        return unsavedColumns;
    },

    calculateColumnsProbability: function (c1, c2, c3) {
        const sorted = [c1, c2, c3].sort((a, b) => a - b);
        const sorted1 = sorted[0];
        const sorted2 = sorted[1];
        const sorted3 = sorted[2];
        if (sorted1 == null && sorted2 == null && sorted3 == null) {
            return 0;
        }
        if (sorted2 == null && sorted3 == null) {
            return this.getMaxColumnProbability(sorted1);
        }
        if (sorted3 == null) {
            return this.getMaxColumnsProbability(sorted1, sorted2);
        }
        return this.getColumnsProbability(sorted1, sorted2, sorted3);
    },

    getColumnsProbability: function (c1, c2, c3) {
        const sorted = [c1, c2, c3].sort((a, b) => a - b);
        const formattedC1 = ('0' + sorted[0]).slice(-2);
        const formattedC2 = ('0' + sorted[1]).slice(-2);
        const formattedC3 = ('0' + sorted[2]).slice(-2);
        return CANT_STOP_COLUMNS_PROBABILITIES[`${formattedC1}-${formattedC2}-${formattedC3}`];
    },

    getMaxColumnProbability: function (c1) {
        return Math.max.apply(null, this.getPossibleColumnKeys(c1).map(n => CANT_STOP_COLUMNS_PROBABILITIES[n]));
    },

    getMaxColumnsProbability: function (c1, c2) {
        return Math.max.apply(null, this.getPossibleColumnsKeys(c1, c2).map(n => CANT_STOP_COLUMNS_PROBABILITIES[n]));
    },

    getPossibleColumnKeys: function (c1) {
        const formattedC1 = ('0' + c1).slice(-2);
        const regexp1 = new RegExp(`${formattedC1}-\\d{2}-\\d{2}`);
        const regexp2 = new RegExp(`\\d{2}-${formattedC1}-\\d{2}`);
        const regexp3 = new RegExp(`\\d{2}-\\d{2}-${formattedC1}`);
        return objectKeys(CANT_STOP_COLUMNS_PROBABILITIES)
            .filter(n => regexp1.test(n) || regexp2.test(n) || regexp3.test(n));
    },

    getPossibleColumnsKeys: function (c1, c2) {
        const sorted = [c1, c2].sort((a, b) => a - b);
        const formattedC1 = ('0' + sorted[0]).slice(-2);
        const formattedC2 = ('0' + sorted[1]).slice(-2);
        const regexp1 = new RegExp(`\\d{2}-${formattedC1}-${formattedC2}`);
        const regexp2 = new RegExp(`${formattedC1}-\\d{2}-${formattedC2}`);
        const regexp3 = new RegExp(`${formattedC1}-${formattedC2}-\\d{2}`);
        return objectKeys(CANT_STOP_COLUMNS_PROBABILITIES)
            .filter(n => regexp1.test(n) || regexp2.test(n) || regexp3.test(n));
    },

    isVisibleMove(index1, index2, moveProbability) {
        return moveProbability.move && (!moveProbability.both || index2 === 0);
    },

    renderMovesProbabilities: function (movesProbabilities) {
        console.log(`renderMovesProbabilities ${JSON.stringify(movesProbabilities)}`);
        let maxVisibleProbability = 0;
        for (let index1 = 0; index1 < movesProbabilities.length; index1++) {
            for (let index2 = 0; index2 < movesProbabilities[index1].length; index2++) {
                const moveProbability = movesProbabilities[index1][index2];
                if (this.isVisibleMove(index1, index2, moveProbability) && moveProbability.probability > maxVisibleProbability) {
                    maxVisibleProbability = moveProbability.probability;
                }
            }
        }
        for (let index1 = 0; index1 < movesProbabilities.length; index1++) {
            for (let index2 = 0; index2 < movesProbabilities[index1].length; index2++) {
                const moveProbability = movesProbabilities[index1][index2];
                this.renderMoveProbability(index1, index2, this.isVisibleMove(index1, index2, moveProbability), moveProbability.probability, moveProbability.probability === maxVisibleProbability);
            }
        }
    },

    renderMoveProbability: function (index1, index2, visible, probability, maxProbability) {
        const probabilityElement = `<div style='font-size: 70%;${maxProbability ? 'font-weight: bolder; color:' +
            ' green;' : ''}'>${visible ? probability + '%' : ''}</div>`;
        this.dojo.place(probabilityElement, `${PROBABILITY_PANEL_ID_PREFIX}${index1}_${index2}`, 'only');
    },

    renderContainers: function () {
        this.dojo.query('#dice_select_zone .dice_button_cell').forEach(buttonSelectElement => {
            const buttonSelectId = this.dojo.getAttr(buttonSelectElement, 'id');
            const probabilityElementId = buttonSelectId.replace(DICE_SELECT_ID_PREFIX, PROBABILITY_PANEL_ID_PREFIX);
            const probabilityElement = `<div id="${probabilityElementId}" class="${PROBABILITY_PANEL_CLASS}"></div>`;
            this.dojo.place(probabilityElement, buttonSelectElement, 'after');
        })
    },

};

var onload = async function () {
    console.log('onload');
    await sleep(USERSCRIPT_LOAD_TIMEOUT_MS);
    console.log('waited');
    if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name ||
        window.parent.gameui.game_name != 'cantstop') {
        console.log('Wrong state or game')
        return;
    }

    // Prevent multiple launches
    if (window.parent.isCantStopBgaUserscriptStarted) {
        return;
    } else {
        console.log('Starting...');
        window.parent.isCantStopBgaUserscriptStarted = true;
        window.parent.cantStopBgaUserscriptData = cantStopBgaUserscriptData.init();
    }
};


if (document.readyState === 'complete') {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? 'load' : 'onload', onload);
}
