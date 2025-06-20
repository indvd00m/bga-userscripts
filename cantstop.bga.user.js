// ==UserScript==
// @name bga-cantstop
// @description Extended statistics for Can't Stop game at BGA
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 1.1.0-dev
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
const CANT_STOP_MAX_CHIPS_COUNT = 3;
const DICE_SELECT_ID_PREFIX = "dice_select_";
const PROBABILITY_PANEL_ID_PREFIX = "dice_probability_";
const PROBABILITY_PANEL_CLASS = "dice_probability_cell";

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
    possibleOutcomesValues: null,

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

        this.possibleOutcomesValues = this.calcPossibleOutcomesValues();

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
            const possibleOutcomeValuesCount = this.possibleOutcomesValues.length;
            {
                const index2 = 0;
                let columns = [];
                objectKeys(unsavedColumns).forEach((c) => columns.push(parseInt(c)));
                if (possibleMove.both) {
                    columns.push(sum1);
                    columns.push(sum2);
                } else {
                    columns.push(sum1);
                }
                columns = columns.filter(onlyUnique);
                const pProbability = this.getCommonDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spProbability = this.getOpenDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spExpectation = spProbability === 1 ? Infinity : 1 / (1 - spProbability);
                movesProbabilities[index1][index2] = {
                    progressProbability: pProbability,
                    saveProgressProbability: spProbability,
                    saveProgressExpectation: spExpectation,
                    both: possibleMove.both,
                    move: move1,
                };
                console.log(`${index1},${index2} with dice ${JSON.stringify(dice1)} and sum ${sum1} has probability ${pProbability}`);
            }
            {
                const index2 = 1;
                let columns = [];
                objectKeys(unsavedColumns).forEach((c) => columns.push(parseInt(c)));
                if (possibleMove.both) {
                    columns.push(sum1);
                    columns.push(sum2);
                } else {
                    columns.push(sum2);
                }
                columns = columns.filter(onlyUnique);
                const pProbability = this.getCommonDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spProbability = this.getOpenDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spExpectation = spProbability === 1 ? Infinity : 1 / (1 - spProbability);
                movesProbabilities[index1][index2] = {
                    progressProbability: pProbability,
                    saveProgressProbability: spProbability,
                    saveProgressExpectation: spExpectation,
                    both: possibleMove.both,
                    move: move2,
                };
                console.log(`${index1},${index2} with dice ${JSON.stringify(dice2)} and sum ${sum2} has probability ${pProbability}`);
            }
        }
        this.renderMovesProbabilities(movesProbabilities);
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

    getColumns: function () {
        const columns = {};
        objectKeys(this.game.columns).forEach(c => {
            columns[c] = {};
            objectKeys(this.game.columns[c]).forEach(p => {
                columns[c][p] = parseInt(this.game.columns[c][p]);
            })
        });
        return columns;
    },

    getClosedColumns: function () {
        const closedColumns = {};
        const columns = this.getColumns();
        objectKeys(columns).forEach(c => {
            if (objectValues(columns[c]).some(v => v === 0)) {
                closedColumns[c] = columns[c];
            }
        });
        return closedColumns;
    },

    isVisibleMove(index1, index2, moveProbability) {
        return moveProbability.move && (!moveProbability.both || index2 === 0);
    },

    calcPossibleOutcomesValues() {
        const start = Date.now();
        const values = [];
        for (let diceRed = 1; diceRed <= 6; diceRed++) {
            for (let diceGreen = 1; diceGreen <= 6; diceGreen++) {
                for (let diceBlue = 1; diceBlue <= 6; diceBlue++) {
                    for (let diceYellow = 1; diceYellow <= 6; diceYellow++) {
                        const sum1 = diceRed + diceGreen;
                        const sum2 = diceRed + diceBlue;
                        const sum3 = diceRed + diceYellow;
                        const sum4 = diceGreen + diceBlue;
                        const sum5 = diceGreen + diceYellow;
                        const sum6 = diceBlue + diceYellow;
                        const sums = [sum1, sum2, sum3, sum4, sum5, sum6].sort((a, b) => a - b).filter(onlyUnique);
                        values.push(sums);
                    }
                }
            }
        }
        console.log(`calc time=${Date.now() - start}ms`);
        return values;
    },

    getCommonDesiredOutcomesCount() {
        const args = [].slice.call(arguments);
        return this.getCommonDesiredOutcomesCountFromArray(args);
    },

    getOpenDesiredOutcomesCount() {
        const args = [].slice.call(arguments);
        return this.getOpenDesiredOutcomesCountFromArray(args);
    },

    getCommonDesiredOutcomesCountFromArray(args) {
        return this.possibleOutcomesValues.filter(sums => args.some(a => sums.includes(a))).length;
    },

    getOpenDesiredOutcomesCountFromArray(args) {
        const closedColumnNumbers = objectKeys(this.getClosedColumns());
        return this.possibleOutcomesValues
            .filter(
                sums => args.some(a => sums.includes(a))
                    || args.length < CANT_STOP_MAX_CHIPS_COUNT && !sums.every(s => closedColumnNumbers.includes(s))
            ).length;
    },

    renderMovesProbabilities: function (movesProbabilities) {
        console.log(`renderMovesProbabilities ${JSON.stringify(movesProbabilities)}`);
        let maxVisibleSaveProgressProbability = 0;
        for (let index1 = 0; index1 < movesProbabilities.length; index1++) {
            for (let index2 = 0; index2 < movesProbabilities[index1].length; index2++) {
                const moveProbability = movesProbabilities[index1][index2];
                if (this.isVisibleMove(index1, index2, moveProbability) && moveProbability.saveProgressProbability > maxVisibleSaveProgressProbability) {
                    maxVisibleSaveProgressProbability = moveProbability.saveProgressProbability;
                }
            }
        }
        let maxVisibleProgressProbability = 0;
        for (let index1 = 0; index1 < movesProbabilities.length; index1++) {
            for (let index2 = 0; index2 < movesProbabilities[index1].length; index2++) {
                const moveProbability = movesProbabilities[index1][index2];
                if (
                    this.isVisibleMove(index1, index2, moveProbability)
                    && moveProbability.saveProgressProbability === maxVisibleSaveProgressProbability
                    && moveProbability.progressProbability > maxVisibleProgressProbability) {
                    maxVisibleProgressProbability = moveProbability.progressProbability;
                }
            }
        }
        for (let index1 = 0; index1 < movesProbabilities.length; index1++) {
            for (let index2 = 0; index2 < movesProbabilities[index1].length; index2++) {
                const moveProbability = movesProbabilities[index1][index2];
                this.renderMoveProbability(
                    index1,
                    index2,
                    this.isVisibleMove(index1, index2, moveProbability),
                    moveProbability,
                    moveProbability.saveProgressProbability === maxVisibleSaveProgressProbability,
                    moveProbability.progressProbability === maxVisibleProgressProbability
                );
            }
        }
    },

    renderMoveProbability: function (index1, index2, visible, moveProbability, maxVisibleSaveProgressProbability, maxVisibleProgressProbability) {
        const formattedProgressProbability = this.formatDecimal(moveProbability.progressProbability * 100, 2);
        const formattedSaveProgressProbability = this.formatDecimal(moveProbability.saveProgressProbability * 100, 2);
        const formattedSaveProgressExpectation = this.formatDecimal(moveProbability.saveProgressExpectation, 2);
        const saveProgressProbabilityElement =
            `<div style='${maxVisibleSaveProgressProbability ? `font-weight: bolder; color: ${moveProbability.saveProgressProbability === 1 ? 'green' : '#6633FF'};` : ''}'>P(A)=${formattedSaveProgressProbability}% E[X]=${formattedSaveProgressExpectation}</div>`;
        const progressProbabilityElement = `<div style='${maxVisibleProgressProbability ? 'font-weight: bolder;' +
            ` color: ${moveProbability.progressProbability === 1 ? 'green' : '#6633FF'};` : ''}'>P(⧡)=${formattedProgressProbability}%</div>`;
        const probabilityElement = `<div style='font-size: 70%; font-family: monospace;'>${visible ? `${saveProgressProbabilityElement} ${progressProbabilityElement}` : ''}</div>`;
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

    formatDecimal: function (value, precision) {
        if (value === Infinity) {
            return '∞';
        } else {
            const multiplier = Math.pow(10, precision);
            return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
        }
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
