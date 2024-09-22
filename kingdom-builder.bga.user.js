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
            const openedTerrains = this.findOpenedTerrains(log);
            if (openedTerrains.length > 0) {
                if (activePlayerId !== this.myPlayerId) {
                    this.processMyCurrentTerrain();
                }
                openedTerrains.forEach(t => {
                    this.processTerrain(t);
                });
            } else {
                this.processFirstTerrains();
            }
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

    findOpenedTerrains: function (log) {
        const openedTerrains = [];
        if (log == null) {
            return openedTerrains;
        }
        const actions = log.filter(e => e.data && e.data.length).flatMap(e => e.data).filter(a => a.args);
        console.log(`History (${actions.length}):`)
        let terrainDetected = false;
        let terrainsCount = 0;
        let prevAction = null;
        actions.forEach(action => {
            if (this.isUserChanged(action, prevAction)) {
                terrainDetected = false;
            }
            const args = action.args;
            let terrainText = null;
            let mandatoryAction = this.isMandatoryAction(action, prevAction);
            if (mandatoryAction && !terrainDetected) {
                terrainText = args.terrainName;
                terrainDetected = true;
                terrainsCount++;
                const terrainName = this.terrains.find(t => terrainText.toLowerCase().includes(t.toLowerCase()));
                console.log(`detected ${terrainsCount} terrain: ${terrainName}`);
                openedTerrains.push(terrainName);
            }
            console.log(`${mandatoryAction ? '!' : ' '}${action.move_id} player ${args.player_id} ${args.originalType} ${args.terrainName} ${args.location_name}`);
            prevAction = action;
        });
        return openedTerrains;
    },

    isUserChanged: function (action, prevAction) {
        if (prevAction == null) {
            return true;
        }
        if (action.args == null || prevAction.args == null) {
            return false;
        }
        if (action.args.player_id == null || prevAction.args.player_id == null) {
            return false;
        }
        return action.args.player_id != prevAction.args.player_id;
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
        html += `Log is${this.logIsFull ? ' ' : ' not '}full, `;
        html += `all terrain cards played: ${this.terrainsPlayedCount} `;
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
