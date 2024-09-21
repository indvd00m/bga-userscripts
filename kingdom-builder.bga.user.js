// ==UserScript==
// @name LOR bga-kingdom-builder
// @description Автоматический подсчет игровых параметров
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.0.1
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var kingdomBuilderBgaUserscriptData = {
    dojo: null,
    game: null,
    terrains: ['Grass', 'Canyon', 'Desert', 'Flower', 'Forest'],
    terrainsPlayed: {
        Grass: 0,
        Canyon: 0,
        Desert: 0,
        Flower: 0,
        Forest: 0
    },
    terrainsPlayedCount: 0,
    lastShowTerrainPlayerId: 0,

    // Init Pythia
    init: function() {
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui.gamedatas ||
            !window.parent.gameui.gamedatas.playerorder || !window.parent.gameui.gamedatas.playerorder[0] ||
            !window.parent.gameui.gamedatas.board || !window.parent.gameui.gamedatas.fplayers) {
            return;
        }
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;

        // Connect event handlers to follow game progress
        this.dojo.subscribe("showTerrain", this, "processShowTerrain");

        return this;
    },

    // Check what came to main player in the new hand
    processShowTerrain: function(data) {
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

        const terrainsProbability = JSON.parse(JSON.stringify(this.terrainsPlayed));
        this.terrains.forEach(terrain => {
            const playedCount = terrainsProbability[terrain];
            terrainsProbability[terrain] = (this.terrains.length - playedCount) / (25 - this.terrainsPlayedCount);
        });
        console.log('terrainsProbability: ' + JSON.stringify(terrainsProbability));
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
