// ==UserScript==
// @name bga-cantstop
// @description Extended statistics for Can't Stop game at BGA
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 1.6.0
// @match https://boardgamearena.com/*/cantstop*
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
const PROGRESS_STATE_PANEL_ID = "progress_state";
const LINE_PROBABILITIES_PANEL_ID = "line_probabilities";
const GAME_BOARD_WRAP_ID = "game_board_wrap";
const PROBABILITY_PANEL_ID_PREFIX = "dice_probability_";
const PROBABILITY_PANEL_CLASS = "dice_probability_cell";
const BGA_TOKEN_NAME_PATTERN = /^token_(?<playerId>\d+)_(?<number>\d+)$/;
const BGA_URL_TABLE_ID_PATTERN = /table=(?<tableId>\d+)/;
const DEFAULT_PROGRESS_STATE = {
    playerId: -1,
    saveProgressProbability: 0,
    saveProgressExpectation: 0,
    saveProgressNMax50PercentSuccess: 0,
    rollingDiceCount: 0,
};
const PROGRESS_STATE_KEY_PREFIX = "cantStopUserscriptProgressState-";

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
    lineProbabilities: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    currentLineCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bgaTableId: 0,
    rollDiceLog: [],
    parseLog: false,

    init: function () {
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui.gamedatas ||
            !window.parent.gameui.gamedatas.playerorder || !window.parent.gameui.gamedatas.playerorder[0] ||
            !window.parent.gameui.gamedatas.columns) {
            return;
        }

        // init state
        this.bgaTableId = BGA_URL_TABLE_ID_PATTERN.exec(window.location.search).groups['tableId'];
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;
        const myPlayerId = objectKeys(this.game.players)
            .find(k =>
                window.parent.gameui.gamedatas.players[k].name === window.parent.gameui.current_player_name);
        if (myPlayerId) {
            this.myPlayerId = parseInt(myPlayerId);
        }

        const stats = this.calcStats();
        this.possibleOutcomesValues = stats.possibleOutcomesValues;
        this.lineProbabilities = stats.lineProbabilities;

        if (this.parseLog) {
            this.parseHistoryRollDices();
        }

        // Connect event handlers to follow game progress
        this.dojo.subscribe("rollDice", this, "onEventRollDice");
        this.dojo.subscribe("removeProgress", this, "onEventRemoveProgress");
        this.dojo.subscribe("moveToken", this, "onEventMoveToken");
        // Possble events: gameStateChange tableDecision rollDice saveProgress moveToken removeProgress


        this.renderContainers();

        if (this.game.gamestate.args) {
            this.processPossibleMoves(this.game.gamestate.args, this.getUnsavedColumns());
        }
        this.recalculateAndSaveProgressState();

        this.renderProgressState();
        this.renderLineProbabilities();

        return this;
    },

    onEventRemoveProgress: function (e) {
        console.log("onEventRemoveProgress");
        console.log(JSON.stringify(e));
        this.resetProgressState();
        this.renderProgressState();
    },

    onEventMoveToken: function (e) {
        console.log("onEventMoveToken");
        console.log(JSON.stringify(e));
        const playerId = parseInt(e.args.player_id);
        this.updateProgressStateProbability(playerId);
        this.renderProgressState();
    },

    onEventRollDice: function (e) {
        console.log("onEventRollDice");
        console.log(JSON.stringify(e));
        this.addRollDiceEventToLog(e);
        this.processPossibleMoves(e.args, this.getUnsavedColumns());
        let playerId = parseInt(e.args.player_id);
        this.updateProgressStateRollingDiceCount(playerId);
        this.renderProgressState();
        this.renderLineProbabilities();
    },

    saveProgressState: function (state) {
        console.log("saveProgressState");
        sessionStorage.setItem(PROGRESS_STATE_KEY_PREFIX + this.bgaTableId, JSON.stringify(state));
    },

    readProgressState: function () {
        console.log("readProgressState");
        const sState = sessionStorage.getItem(PROGRESS_STATE_KEY_PREFIX + this.bgaTableId);
        if (sState == null) {
            return DEFAULT_PROGRESS_STATE;
        }
        const state = JSON.parse(sState);

        // Infinity not exists in JSON
        if (state.saveProgressExpectation == null) {
            state.saveProgressExpectation = Infinity;
        }
        if (state.saveProgressNMax50PercentSuccess == null) {
            state.saveProgressNMax50PercentSuccess = Infinity;
        }

        return state;
    },

    resetProgressState: function () {
        console.log("resetProgressState");
        sessionStorage.setItem(PROGRESS_STATE_KEY_PREFIX + this.bgaTableId, JSON.stringify(DEFAULT_PROGRESS_STATE));
    },

    updateProgressStateProbability: function (playerId) {
        console.log("updateProgressStateProbability");
        const progressState = this.readProgressState();
        const prevSPProbability = progressState.saveProgressProbability;
        this.recalculateProgressState(progressState, playerId);
        if (prevSPProbability !== progressState.saveProgressProbability) {
            console.log('reset rolling dice count');
            progressState.rollingDiceCount = 0;
        }
        this.saveProgressState(progressState);
    },

    updateProgressStateRollingDiceCount: function (playerId) {
        console.log("updateProgressStateRollingDiceCount");
        const progressState = this.readProgressState();
        const playerChanged = playerId !== progressState.playerId;
        this.recalculateProgressState(progressState, playerId);
        if (!playerChanged && progressState.saveProgressProbability < 1) {
            progressState.rollingDiceCount++;
            console.log('increment rolling dice count to ' + progressState.rollingDiceCount);
        }
        this.saveProgressState(progressState);
    },

    recalculateAndSaveProgressState: function () {
        console.log("recalculateAndSaveProgressState");
        const activePlayerId = parseInt(this.game.gamestate.active_player);
        const progressState = this.readProgressState();
        this.recalculateProgressState(progressState, activePlayerId);
        this.saveProgressState(progressState);
    },

    recalculateProgressState: function (progressState, playerId) {
        console.log("recalculateProgressState");
        const unsavedColumns = this.getUnsavedColumns();
        const columns = objectKeys(unsavedColumns).map(s => parseInt(s));
        const possibleOutcomeValuesCount = this.possibleOutcomesValues.length;
        const spProbability = this.getOpenDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
        const spExpectation = this.calculateExpectation(spProbability);
        const spNMax = this.calculateNMax(spProbability);
        if (progressState.playerId !== playerId) {
            progressState.playerId = playerId;
        }
        progressState.saveProgressProbability = spProbability;
        progressState.saveProgressExpectation = spExpectation;
        progressState.saveProgressNMax50PercentSuccess = spNMax;
        return progressState;
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
                objectKeys(unsavedColumns).map(s => parseInt(s)).forEach((c) => columns.push(c));
                if (possibleMove.both) {
                    columns.push(sum1);
                    columns.push(sum2);
                } else {
                    columns.push(sum1);
                }
                columns = columns.filter(onlyUnique);
                const pProbability = this.getCommonDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spProbability = this.getOpenDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spExpectation = this.calculateExpectation(spProbability);
                const spNMax = this.calculateNMax(spProbability);
                movesProbabilities[index1][index2] = {
                    progressProbability: pProbability,
                    saveProgressProbability: spProbability,
                    saveProgressExpectation: spExpectation,
                    saveProgressNMax50PercentSuccess: spNMax,
                    both: possibleMove.both,
                    move: move1,
                };
                console.log(`${index1},${index2} with dice ${JSON.stringify(dice1)} and sum ${sum1} has probability ${pProbability}`);
            }
            {
                const index2 = 1;
                let columns = [];
                objectKeys(unsavedColumns).map(s => parseInt(s)).forEach((c) => columns.push(c));
                if (possibleMove.both) {
                    columns.push(sum1);
                    columns.push(sum2);
                } else {
                    columns.push(sum2);
                }
                columns = columns.filter(onlyUnique);
                const pProbability = this.getCommonDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spProbability = this.getOpenDesiredOutcomesCountFromArray(columns) / possibleOutcomeValuesCount;
                const spExpectation = this.calculateExpectation(spProbability);
                const spNMax = this.calculateNMax(spProbability);
                movesProbabilities[index1][index2] = {
                    progressProbability: pProbability,
                    saveProgressProbability: spProbability,
                    saveProgressExpectation: spExpectation,
                    saveProgressNMax50PercentSuccess: spNMax,
                    both: possibleMove.both,
                    move: move2,
                };
                console.log(`${index1},${index2} with dice ${JSON.stringify(dice2)} and sum ${sum2} has probability ${pProbability}`);
            }
        }
        this.renderMovesProbabilities(movesProbabilities);
    },

    calculateNMax: function (saveProgressProbability) {
        return saveProgressProbability === 1 ? Infinity : Math.floor(Math.log(0.5) / Math.log(saveProgressProbability));
    },

    calculateExpectation: function (saveProgressProbability) {
        return saveProgressProbability === 1 ? Infinity : 1 / (1 - saveProgressProbability);
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
        objectKeys(this.game.columns).map(s => parseInt(s)).forEach(c => {
            columns[c] = {};
            objectKeys(this.game.columns[c]).map(s => parseInt(s)).forEach(p => {
                columns[c][p] = parseInt(this.game.columns[c][p]);
            })
        });
        return columns;
    },

    parseColumns: function () {
        const columns = {};
        const savedTokensElements = this.dojo.query('#game_board>.token:not(.color_000000):not(.unmoving)');
        savedTokensElements.forEach((tokenElement) => {
            const column = parseInt(this.dojo.getAttr(tokenElement, 'data-column'));
            const height = parseInt(this.dojo.getAttr(tokenElement, 'data-height'));
            const id = this.dojo.getAttr(tokenElement, 'id');
            const playerId = parseInt(BGA_TOKEN_NAME_PATTERN.exec(id).groups['playerId']);
            if (columns[column] == null) {
                columns[column] = {};
            }
            columns[column][playerId] = height;
        })
        return columns;
    },

    getClosedColumns: function () {
        const closedColumns = {};
        const columns = this.parseColumns();
        objectKeys(columns).map(s => parseInt(s)).forEach(c => {
            if (objectValues(columns[c]).map(s => parseInt(s)).some(v => v === 0)) {
                closedColumns[c] = columns[c];
            }
        });
        return closedColumns;
    },

    isVisibleMove(index1, index2, moveProbability) {
        return moveProbability.move && (!moveProbability.both || index2 === 0);
    },

    getSums(dice1, dice2, dice3, dice4) {
        const sum1 = dice1 + dice2;
        const sum2 = dice1 + dice3;
        const sum3 = dice1 + dice4;
        const sum4 = dice2 + dice3;
        const sum5 = dice2 + dice4;
        const sum6 = dice3 + dice4;
        return [sum1, sum2, sum3, sum4, sum5, sum6].sort((a, b) => a - b).filter(onlyUnique);
    },

    calcStats() {
        const start = Date.now();
        const values = [];
        const lineCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let diceRed = 1; diceRed <= 6; diceRed++) {
            for (let diceGreen = 1; diceGreen <= 6; diceGreen++) {
                for (let diceBlue = 1; diceBlue <= 6; diceBlue++) {
                    for (let diceYellow = 1; diceYellow <= 6; diceYellow++) {
                        const sums = this.getSums(diceRed, diceGreen, diceBlue, diceYellow);
                        values.push(sums);
                        sums.forEach(sum => lineCounts[sum - 1]++);
                    }
                }
            }
        }
        const lineProbabilities = lineCounts.map(count => count / values.length)
        const stats = {
            possibleOutcomesValues: values,
            lineProbabilities: lineProbabilities,
        }
        console.log(`calc time=${Date.now() - start}ms`);
        return stats;
    },

    getCommonDesiredOutcomesCount() {
        const args = [].slice.call(arguments);
        return this.getCommonDesiredOutcomesCountFromArray(args);
    },

    getCommonDesiredOutcomesCountFromArray(args) {
        return this.possibleOutcomesValues.filter(sums => args.some(a => sums.includes(a))).length;
    },

    getOpenDesiredOutcomesCount() {
        const args = [].slice.call(arguments);
        return this.getOpenDesiredOutcomesCountFromArray(args);
    },

    getOpenDesiredOutcomesCountFromArray(args) {
        const closedColumnNumbers = objectKeys(this.getClosedColumns()).map(s => parseInt(s));
        return this.possibleOutcomesValues
            .filter(sums =>
                    !sums.every(s => closedColumnNumbers.includes(s))
                    && (
                        args.some(a => sums.includes(a))
                        || args.length < CANT_STOP_MAX_CHIPS_COUNT
                    )
            ).length;
    },

    getLastRollDiceLogMatchedCount() {
        const args = [].slice.call(arguments);
        return this.getLastRollDiceLogMatchedCountFromArray(args);
    },

    getLastRollDiceLogMatchedCountFromArray(args) {
        let matches = 0;
        const log = this.rollDiceLog;
        for (let i = log.length - 1; i > 0; i--) {
            const action = log[i];
            const dice = action.dice;
            const sums = this.getSums(dice[0], dice[1], dice[2], dice[3]);
            if (args.some(a => sums.includes(a))) {
                matches++;
            } else {
                break;
            }
        }
        return matches;
    },

    getHistory() {
        return window.parent.gameui.notifqueue.logs_to_load.filter(e => e.data && e.data.length).flatMap(e => e.data).filter(a => a.args);
    },

    filterHistory(originalType) {
        return this.getHistory().filter(a => a.args.originalType === originalType);
    },

    parseHistoryRollDices() {
        this.filterHistory('rollDice').forEach(e => {
            this.addRollDiceHistoryElementToLog(e);
        });
    },

    addRollDiceEventToLog(e) {
        const dice = e.args.dice;
        this.rollDiceLog.push({
            uid: e.uid,
            playerId: parseInt(e.args.player_id),
            dice: dice,
        });
        const sums = this.getSums(dice[0], dice[1], dice[2], dice[3]);
        sums.forEach(sum => this.currentLineCounts[sum - 1]++);
    },

    addRollDiceHistoryElementToLog(e) {
        const dice = e.args.dice;
        this.rollDiceLog.push({
            uid: e.uid,
            playerId: parseInt(e.args.player_id),
            dice: dice,
        });
        const sums = this.getSums(dice[0], dice[1], dice[2], dice[3]);
        sums.forEach(sum => this.currentLineCounts[sum - 1]++);
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
        const formattedSaveProgressNMax50PercentSuccess = this.formatDecimal(moveProbability.saveProgressNMax50PercentSuccess, 0);
        const saveProgressProbabilityElement =
            `<div style='${maxVisibleSaveProgressProbability ? `font-weight: bolder; color: ${moveProbability.saveProgressProbability === 1 ? 'green' : '#6633FF'};` : ''}'>P(A)=${formattedSaveProgressProbability}% E[X]=${formattedSaveProgressExpectation} n_max=${formattedSaveProgressNMax50PercentSuccess}</div>`;
        const progressProbabilityElement = `<div style='${maxVisibleProgressProbability ? 'font-weight: bolder;' +
            ` color: ${moveProbability.progressProbability === 1 ? 'green' : '#6633FF'};` : ''}'>P(⧡)=${formattedProgressProbability}%</div>`;
        const probabilityElement = `<div style='font-size: 60%; font-family: monospace;'>${visible ? `${saveProgressProbabilityElement} ${progressProbabilityElement}` : ''}</div>`;
        this.dojo.place(probabilityElement, `${PROBABILITY_PANEL_ID_PREFIX}${index1}_${index2}`, 'only');
    },

    renderProgressState: function () {
        const progressState = this.readProgressState();
        const nMax = progressState.saveProgressNMax50PercentSuccess;
        const spExpectation = progressState.saveProgressExpectation;
        const rdCount = progressState.rollingDiceCount;
        const minDangerZoneFactor = 0.95;
        let scaleMaxValue = nMax * 2;
        if (spExpectation > 0 && spExpectation / minDangerZoneFactor > scaleMaxValue) {
            scaleMaxValue = Math.ceil(spExpectation / minDangerZoneFactor);
        }

        let nMaxPercentage;
        let expectationPercentage;
        let nonlinearRDCountPercentage = 0;
        let rdCountPercentage = 0;
        let nextRDCountPercentage = 0;
        if (scaleMaxValue === 0) {
            nMaxPercentage = 50;
            expectationPercentage = 100;
            nonlinearRDCountPercentage = 0;
            rdCountPercentage = 0;
            nextRDCountPercentage = 0;
        } else if (scaleMaxValue === Infinity) {
            nMaxPercentage = 50;
            expectationPercentage = 100;
            nonlinearRDCountPercentage = 0;
            rdCountPercentage = 0;
            nextRDCountPercentage = 0;
        } else if (scaleMaxValue > 0) {
            nMaxPercentage = 100 * nMax / scaleMaxValue;
            expectationPercentage = 100 * spExpectation / scaleMaxValue;
            if (rdCount < spExpectation) {
                nonlinearRDCountPercentage = 100 * rdCount / (nMax * 2);
                rdCountPercentage = 100 * rdCount / scaleMaxValue;
                nextRDCountPercentage = 100 * (rdCount + 1) / scaleMaxValue;
            } else {
                const k = 0.2;
                const rdCountDangerValue = spExpectation + (scaleMaxValue - spExpectation) * (1 - 2.71828 ** (-k * (rdCount - spExpectation)));
                const nextRDCountDangerValue = spExpectation + (scaleMaxValue - spExpectation) * (1 - 2.71828 ** (-k * (rdCount + 1 - spExpectation)));
                nonlinearRDCountPercentage = 100 * rdCountDangerValue / scaleMaxValue;
                rdCountPercentage = 100 * rdCountDangerValue / scaleMaxValue;
                nextRDCountPercentage = 100 * (nextRDCountDangerValue) / scaleMaxValue;
            }
        } else {
            nMaxPercentage = 50;
            expectationPercentage = 100;
            rdCountPercentage = 0;
            nextRDCountPercentage = 0;
        }
        let color = 'green';
        let icon = 'bgasmiley';
        switch (true) {
            case (rdCountPercentage >= expectationPercentage):
                color = '#330000';
                icon = 'bgasmiley_unsmile';
                break;
            case (nonlinearRDCountPercentage <= 10):
                color = '#33FF99';
                icon = 'bgasmiley_sunglass';
                break;
            case (nonlinearRDCountPercentage <= 20):
                color = '#00FF99';
                icon = 'bgasmiley_bigsmile';
                break;
            case (nonlinearRDCountPercentage <= 30):
                color = '#33CC66';
                icon = 'bgasmiley_bigsmile';
                break;
            case (nonlinearRDCountPercentage <= 40):
                color = '#00CC66';
                icon = 'bgasmiley_smile';
                break;
            case (nonlinearRDCountPercentage <= 50):
                color = '#009933';
                icon = 'bgasmiley_smile';
                break;
            case (nonlinearRDCountPercentage <= 55):
                color = '#FFCC00';
                icon = 'bgasmiley_surprised';
                break;
            case (nonlinearRDCountPercentage <= 60):
                color = '#FF9933';
                icon = 'bgasmiley_surprised';
                break;
            case (nonlinearRDCountPercentage <= 65):
                color = '#CC3333';
                icon = 'bgasmiley_bad';
                break;
            case (nonlinearRDCountPercentage <= 70):
                color = '#993333';
                icon = 'bgasmiley_shocked';
                break;
            case (nonlinearRDCountPercentage <= 80):
                color = '#990033';
                icon = 'bgasmiley_shocked';
                break;
            case (nonlinearRDCountPercentage <= 90):
                color = '#330000';
                icon = 'bgasmiley_unsmile';
                break;
            default:
                color = '#330000';
                icon = 'bgasmiley_unsmile';
        }

        const formattedNMax = this.formatDecimal(nMax, 0);
        const formattedExpectation = this.formatDecimal(spExpectation, 0);
        const formattedSaveProgressProbability = this.formatDecimal(progressState.saveProgressProbability * 100, 2);

        const stateProgressBarElement =
            `<div class="progressbar_with_info">` +
            `   <div class="progressbar_inner">` +
            `       <div class="progressbar" style="background-color: darkgray;">` +
            `           <div class="progressbar_label" style="background-color: #0099FF; width: 100px;">` +
            `               <span class="symbol icon20 ${icon}" style="position: relative;top:2px;"></span>` +
            `               <span style="position: relative;top:-2px;">${formattedSaveProgressProbability}%</span>` +
            `           </div>` +
            `           <div class="progressbar_bar" style="margin-left: 100px;">` +
            `               <div class="progressbar_content" style="width: ${rdCountPercentage}%; background-color: ${color};">` +
            `                    <span class="progressbar_valuename"></span>` +
            `               </div>` +
            `               <div class="grad" style="left: 0%; background-color: darkgray;">` +
            `                    <span style="position: absolute; top: 50%; left: 5px; transform: translate(0%, -50%); color: white; font-size: 75%;">${rdCount}</span>` +
            `               </div>` +
            `               <div class="grad" style="left: ${nMaxPercentage}%; background-color: blue;">` +
            `                    <span style="position: absolute; top: 50%; left: 2px; transform: translate(0%, -50%); color: blue; font-size: 75%;">${formattedNMax}</span>` +
            `               </div>` +
            `               <div class="grad" style="left: ${expectationPercentage}%; background-color: red;">` +
            `                    <span style="position: absolute; top: 50%; left: 2px; transform: translate(0%, -50%); color: red; font-size: 75%;">${formattedExpectation}</span>` +
            `               </div>` +
            `               <div class="grad" style="left: ${nextRDCountPercentage}%;"></div>` +
            `           </div>` +
            `       </di>` +
            `   </div>` +
            `</div>`;
        const stateJsonElement = `<span style="font-size: 60%; font-family: monospace; white-space: pre-wrap;">${JSON.stringify(progressState, null, 4)}</span>`;
        // const stateElement = `${stateJsonElement}${stateProgressBarElement}`;
        const stateElement = `${stateProgressBarElement}`;
        this.dojo.place(stateElement, PROGRESS_STATE_PANEL_ID, 'only');
    },

    renderLineProbabilities: function () {
        let linesTableElement =
            `<table class="statstable" id="line_stats_table" style="font-size: 60%; table-layout: fixed; max-width: 500px; margin: 0 auto;">` +
            `    <tbody>` +
            `    <tr id="line_stats_header">` +
            `        <th>Line</th>`;
        for (let i = 1; i < this.lineProbabilities.length; i++) {
            linesTableElement +=
                `    <th>${i + 1}</th>`;
        }
        linesTableElement +=
            `    </tr>` +
            `    </tbody>` +
            `    <tr>` +
            `        <th>Prob.</th>`;
        for (let i = 1; i < this.lineProbabilities.length; i++) {
            const probability = this.lineProbabilities[i];
            linesTableElement +=
                `    <td>${this.formatDecimal(probability * 100, 2)}%</td>`;
        }
        linesTableElement +=
            `    </tr>` +
            `</table>`;
        const lineProbabilitiesElement = `${linesTableElement}`;
        this.dojo.place(lineProbabilitiesElement, LINE_PROBABILITIES_PANEL_ID, 'only');
    },

    renderContainers: function () {
        this.dojo.query('#dice_select_zone .dice_button_cell').forEach(buttonSelectElement => {
            const buttonSelectId = this.dojo.getAttr(buttonSelectElement, 'id');
            const probabilityElementId = buttonSelectId.replace(DICE_SELECT_ID_PREFIX, PROBABILITY_PANEL_ID_PREFIX);
            const probabilityElement = `<div id="${probabilityElementId}" class="${PROBABILITY_PANEL_CLASS}"></div>`;
            this.dojo.place(probabilityElement, buttonSelectElement, 'after');
        });
        const lineProbabilitiesElement = `<div id="${LINE_PROBABILITIES_PANEL_ID}" style="width: 100%;"></div>`;
        this.dojo.place(lineProbabilitiesElement, GAME_BOARD_WRAP_ID, 'first');
        const progressStateElement = `<div id="${PROGRESS_STATE_PANEL_ID}" style="width: 100%;"></div>`;
        this.dojo.place(progressStateElement, GAME_BOARD_WRAP_ID, 'first');
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
