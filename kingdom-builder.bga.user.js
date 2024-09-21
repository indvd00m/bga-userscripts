// ==UserScript==
// @name LOR bga-kingdom-builder
// @description Автоматический подсчет игровых параметров
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.1.0
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
    terrainsStackSize: 25,
    lastShowTerrainPlayerId: 0,

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
        this.terrains.forEach(terrain => {
            this.terrainsPlayed[terrain] = 0;
            this.terrainsProbability[terrain] = 0;
        });

        // Connect event handlers to follow game progress
        this.dojo.subscribe("showTerrain", this, "processShowTerrain");

        this.renderContainers();
        this.renderStatisticsPanel();

        return this;
    },

    // Check what came to main player in the new hand
    processShowTerrain: function (data) {
        console.log("showTerrain", JSON.stringify(data));

        // Input check
        if (!data || !data.args || !data.args.pId || !data.args.terrain) {
            return;
        }

        console.log(JSON.stringify(data.args));

        if (this.lastShowTerrainPlayerId === data.args.pId) {
            console.log(`Skip player id processing: ${data.args.pId}`);
            return;
        }

        this.lastShowTerrainPlayerId = data.args.pId;
        const terrainName = this.terrains[parseInt(data.args.terrain)];
        this.terrainsPlayed[terrainName]++;
        this.terrainsPlayedCount++;
        console.log('terrainsPlayed: ' + JSON.stringify(this.terrainsPlayed));
        console.log(`terrainsPlayedCount: ${this.terrainsPlayedCount}`);

        this.terrains.forEach(terrain => {
            const playedCount = this.terrainsPlayed[terrain];
            this.terrainsProbability[terrain] = (this.terrains.length - playedCount) / (this.terrainsStackSize - this.terrainsPlayedCount);
        });
        console.log('terrainsProbability: ' + JSON.stringify(this.terrainsProbability));

        this.renderStatisticsPanel();
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
        html += `All terrain cards played: ${this.terrainsPlayedCount} `;
        this.terrains.slice()
            .sort((t1, t2) => this.terrainsPlayed[t1] - this.terrainsPlayed[t2])
            .forEach(terrain => {
                const probability = (Math.round(this.terrainsProbability[terrain] * 100) / 100).toFixed(2)
                html += "<div>"
                    + `${terrain} played ${this.terrainsPlayed[terrain]} times, probability: ${probability}`
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
