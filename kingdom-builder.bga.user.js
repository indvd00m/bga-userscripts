// ==UserScript==
// @name bga-kingdom-builder
// @description Автоматический подсчет игровых параметров
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.2.0-dev
// @match https://boardgamearena.com/*/kingdombuilder*
// ==/UserScript==

// TODO: @updateUrl
// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

// TODO: Which terrain is adjacent to any player
// TODO: Score for every objectives
// TODO: How many rounds is left
// TODO: Rounds played

console.log('I am an example userscript for kingdom builder from file system');

const BGA_PLAYER_BOARDS_ID = "player_boards";
const BGA_PLAYER_BOARD_CLASS = "player-board";
const BGA_TERRAIN_BACK = "back";
const BGA_START_SETTLEMENTS_COUNT = 40;
const STATISTICS_PANEL_ID = "userscript_statistics_panel";
const STATISTICS_PANEL_CLASS = "userscript_statistics_panel_class";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var kingdomBuilderBgaUserscriptData = {
    dojo: null,
    game: null,
    terrains: ['Grass', 'Canyon', 'Desert', 'Flower', 'Forest'],
    terrainsPlayed: {},
    terrainsProbability: {},
    terrainsPlayedCount: 0,
    turnsCount: 0,
    logIsFull: false,
    terrainsStackSize: 25,
    lastShowTerrainPlayerId: 0,
    myPlayerId: -1,

    // Init Pythia
    init: function () {
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui.gamedatas ||
            !window.parent.gameui.gamedatas.playerorder || !window.parent.gameui.gamedatas.playerorder[0] ||
            !window.parent.gameui.gamedatas.board || !window.parent.gameui.gamedatas.fplayers) {
            return;
        }

        // init state
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;
        const myPlayer = this.game.fplayers.find(p => p.name === window.parent.gameui.current_player_name);
        if (myPlayer) {
            this.myPlayerId = parseInt(myPlayer.id);
        }
        this.resetTerrainsStatistics();

        // Connect event handlers to follow game progress
        this.dojo.subscribe("showTerrain", this, "processShowTerrain");


        this.renderContainers();

        const activePlayerId = parseInt(this.game.gamestate.active_player);
        this.lastShowTerrainPlayerId = activePlayerId;

        const log = window.parent.gameui.notifqueue.logs_to_load;
        this.logIsFull = this.isFullLog(log);
        if (this.logIsFull) {
            console.log(`Found full log with ${log.length} actions`);
            const openedTerrains = this.findShownTerrains(log);
            openedTerrains.forEach(t => {
                this.processTerrain(t);
            });
            this.processAnotherCurrentPlayerTerrain(log);
        } else {
            console.log(`Found incomplete log with ${log.length} actions`);
            this.processFirstTerrains();
        }

        return this;
    },

    resetTerrainsStatistics: function () {
        this.terrainsPlayedCount = 0;
        this.terrains.forEach(terrain => {
            this.terrainsPlayed[terrain] = 0;
            this.terrainsProbability[terrain] = 0;
        });
    },

    processFirstTerrains: function () {
        this.game.fplayers.map(p => p.terrain).filter(t => t !== BGA_TERRAIN_BACK).forEach(terrainIndex => {
            const terrainName = this.terrains[parseInt(terrainIndex)];
            this.processTerrain(terrainName);
        })
    },

    processMyCurrentTerrain: function () {
        this.game.fplayers.filter(p => parseInt(p.id) === this.myPlayerId).map(p => p.terrain).filter(t => t !== BGA_TERRAIN_BACK).forEach(terrainIndex => {
            const terrainName = this.terrains[parseInt(terrainIndex)];
            this.processTerrain(terrainName);
        })
    },

    processAnotherCurrentPlayerTerrain: function (log) {
        const activePlayerId = parseInt(this.game.gamestate.active_player);
        const playersWithoutActions = this.game.fplayers
            .filter(p => parseInt(p.id) !== this.myPlayerId)
            .filter(p => parseInt(p.id) === activePlayerId)
            .filter(p => !this.isPlayerLastAction(log, parseInt(p.id)))
        console.log(`Found another active players without actions: ${playersWithoutActions.map(p => p.name).join(',')}`);
        playersWithoutActions
            .map(p => p.terrain)
            .forEach(terrainIndex => {
                const terrainName = this.terrains[parseInt(terrainIndex)];
                this.processTerrain(terrainName);
            });
    },

    isFirstTurn: function () {
        playersWithStartSettlementsCount = this.game.fplayers
            .filter(p => p.settlements === BGA_START_SETTLEMENTS_COUNT)
            .length;
        return playersWithStartSettlementsCount === this.game.fplayers.length
            || playersWithStartSettlementsCount === this.game.fplayers.length - 1;
    },

    processShowTerrain: function (data) {
        console.log("showTerrain", JSON.stringify(data));

        // Input check
        if (!data || !data.args || !data.args.pId || !data.args.terrain) {
            return;
        }

        console.log(JSON.stringify(data.args));

        const pId = parseInt(data.args.pId);
        const prevLastShowTerrainPlayerId = this.lastShowTerrainPlayerId;
        this.lastShowTerrainPlayerId = pId;

        if (BGA_TERRAIN_BACK === data.args.terrain) {
            console.log('Skip back terrain processing');
            return;
        }
        if (this.myPlayerId === pId && data.args.i18n == null) {
            console.log('Skip my turn second processing');
            return;
        }
        if (this.myPlayerId !== pId && prevLastShowTerrainPlayerId === pId) {
            console.log(`Skip undoing of player ${pId}`);
            return;
        }

        this.lastShowTerrainPlayerId = pId;
        const terrainName = this.terrains[parseInt(data.args.terrain)];
        this.processTerrain(terrainName);
    },

    processTerrain: function (terrainName) {
        if (this.terrainsPlayedCount === this.terrainsStackSize) {
            this.resetTerrainsStatistics();
        }
        this.terrainsPlayed[terrainName]++;
        this.terrainsPlayedCount++;
        this.turnsCount++;
        console.log('terrainsPlayed: ' + JSON.stringify(this.terrainsPlayed));
        console.log(`terrainsPlayedCount: ${this.terrainsPlayedCount}`);

        this.terrains.forEach(terrain => {
            const playedCount = this.terrainsPlayed[terrain];
            let probability = 0;
            if (this.terrainsStackSize > this.terrainsPlayedCount) {
                probability = (this.terrains.length - playedCount) / (this.terrainsStackSize - this.terrainsPlayedCount)
            }
            this.terrainsProbability[terrain] = probability;
        });
        console.log('terrainsProbability: ' + JSON.stringify(this.terrainsProbability));

        this.renderStatisticsPanel();
    },

    isFullLog: function (log) {
        if (log == null || log.length === 0) {
            return false;
        }
        return parseInt(log[0].move_id) === 1;
    },

    isPlayerLastAction: function (log, playerId) {
        if (log == null || log.length === 0) {
            return false;
        }
        const actions = log.filter(e => e.data && e.data.length).flatMap(e => e.data).filter(a => a.args);
        for (let i = actions.length - 1; i >= 0; i--) {
            const action = actions[i];
            if (action.args.player_id) {
                return playerId === action.args.player_id;
            }
        }
        return false;
    },

    findShownTerrains: function (log) {
        const openedTerrains = [];
        if (log == null) {
            return openedTerrains;
        }
        const actions = log.filter(e => e.data && e.data.length).flatMap(e => e.data).filter(a => a.args);
        console.log(`History (${actions.length}):`)
        let terrainDetected = false;
        let terrainsCount = 0;
        let prevAction = null;
        let lastPlayerId = null;
        actions.forEach(action => {
            if (this.isUserChanged(action, lastPlayerId) && !this.isMyAction(action)) {
                console.log('user changed');
                terrainDetected = false;
            }
            const args = action.args;
            let mandatoryAction = this.isMandatoryAction(action, prevAction);
            if (args.originalType === 'showTerrain') {
                terrainDetected = true;
                terrainsCount++;
                const terrainIndex = parseInt(args.terrain);
                const terrainName = this.terrains[terrainIndex];
                console.log(`detected ${terrainsCount} terrain: ${terrainName}`);
                openedTerrains.push(terrainName);
            } else if (mandatoryAction && !terrainDetected) {
                terrainDetected = true;
                terrainsCount++;
                const terrainName = this.terrains.find(t => args.terrainName.toLowerCase().includes(t.toLowerCase()));
                console.log(`detected ${terrainsCount} terrain: ${terrainName}`);
                openedTerrains.push(terrainName);
            }
            console.log(`${mandatoryAction ? '!' : ' '}${action.move_id} player ${args.player_id} ${args.originalType} ${args.terrainName} ${args.location_name}`);
            if (args.player_id) {
                lastPlayerId = args.player_id;
            }
            prevAction = action;
        });
        return openedTerrains;
    },

    isUserChanged: function (action, lastPlayerId) {
        if (action.args == null) {
            return false;
        }
        if (action.args.player_id == null) {
            return false;
        }
        if (lastPlayerId == null) {
            return true;
        }
        return action.args.player_id != lastPlayerId;
    },

    isMyAction: function (action) {
        if (action.args == null) {
            return false;
        }
        if (action.args.player_id == null) {
            return false;
        }
        return action.args.player_id == this.myPlayerId;
    },

    isMandatoryAction: function (action, prevAction) {
        const args = action.args;
        if (args.originalType === 'build') {
            if (prevAction != null) {
                const prevArgs = prevAction.args;
                if (prevArgs.originalType === 'useTile') {
                    switch (prevArgs.location_name) {
                        case 'harbor':
                        case 'paddock':
                        case 'barn':
                            return true;
                        default:
                            return false;
                    }
                }
                return true;
            }
            return true;
        }
        return false;
    },

    renderContainers: function () {
        this.dojo.place("<div id='" + STATISTICS_PANEL_ID + "'"
            + " class='" + BGA_PLAYER_BOARD_CLASS + "'"
            + "style='font-size: 70%;'"
            + "></div>",
            BGA_PLAYER_BOARDS_ID,
            "first");
    },

    renderStatisticsPanel: function () {
        var html = "<div class='" + STATISTICS_PANEL_CLASS + "'>";
        html += `Found ${this.logIsFull ? 'full' : 'incomplete'} log with ${this.turnsCount} turns `;
        html += `and ${this.terrainsPlayedCount} played terrain cards`;
        this.terrains.slice()
            .sort((t1, t2) => this.terrainsPlayed[t1] - this.terrainsPlayed[t2])
            .forEach(terrain => {
                const probability = (Math.round(this.terrainsProbability[terrain] * 100 * 100) / 100).toFixed(0)
                html += "<div>"
                    + `${terrain} played ${this.terrainsPlayed[terrain]} times, probability: ${probability}%`
                    + "</div>";
            })
        this.dojo.place(html, STATISTICS_PANEL_ID, "only");
    }

};

var onload = async function () {
    console.log('onload');
    await sleep(10000);
    console.log('waited');
    if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name ||
        window.parent.gameui.game_name != 'kingdombuilder') {
        console.log('Wrong state or game')
        return;
    }

    // Prevent multiple launches
    if (window.parent.isKingdomBuilderBgaUserscriptStarted) {
        return;
    } else {
        console.log('Starting...');
        window.parent.isKingdomBuilderBgaUserscriptStarted = true;
        window.parent.kingdomBuilderBgaUserscriptData = kingdomBuilderBgaUserscriptData.init();
    }
};


if (document.readyState === 'complete') {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? 'load' : 'onload', onload);
}
