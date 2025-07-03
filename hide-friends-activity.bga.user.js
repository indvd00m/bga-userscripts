// ==UserScript==
// @name bga-hide-friends-activity
// @description Hide non-participating friends' activity in the game log
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.1.0-dev
// @match https://boardgamearena.com/*/*?*table=*
// @match https://*.boardgamearena.com/*/*?*table=*
// @grant none
// @updateURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/hide-friends-activity.bga.user.js
// @downloadURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/hide-friends-activity.bga.user.js
// ==/UserScript==

// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

console.log('BGA userscript: hide-friends-activity');

const USERSCRIPT_LOAD_TIMEOUT_MS = 3000;
const LOGS_ELEMENT_ID = "logs";
const PLAYER_NAME_ELEMENT_CLASS = "playername";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var bgaUserscriptHideFriendsActivityData = {
    dojo: null,
    gameui: null,
    players: null,
    observer: null,

    init: function () {
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui) {
            return;
        }

        // init state
        this.dojo = window.parent.dojo;
        this.gameui = window.parent.gameui;
        this.players = this.getGamePlayers();

        this.registerObserver();

        return this;
    },

    getGamePlayers: function () {
        return []
            .concat(window.parent.gameui.gameNeutralPlayers)
            .concat(window.parent.gameui.gameMasculinePlayers)
            .concat(window.parent.gameui.gameFemininePlayers);
    },

    registerObserver: function () {
        console.log(`Registering observer...`);
        const config = {
            attributes: false,
            childList: true,
            subtree: false,
        };
        const logsElement = Array.from(this.dojo.query(`#${LOGS_ELEMENT_ID}`))[0];
        this.observer = new MutationObserver(this.logsElementObserverCallback.bind(this));
        this.observer.observe(logsElement, config);
    },

    logsElementObserverCallback: function (mutationList, observer) {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                for (const addedNode of mutation.addedNodes) {
                    this.processLogElement(addedNode);
                }
            }
        }
    },

    processLogElement: function (logElement) {
        console.log(`Processing log element: ${logElement.outerHTML}`);
        const nonParticipatingPlayerNames = Array.from(this.dojo.query(`.${PLAYER_NAME_ELEMENT_CLASS}`, logElement))
            .map(e => e.innerText)
            .filter(name => !this.players.includes(name));
        if (nonParticipatingPlayerNames.length) {
            console.log(`Hide activity of: ${nonParticipatingPlayerNames}`);
            this.dojo.destroy(logElement);
        }
    },

};

var onload = async function () {
    console.log('onload');
    await sleep(USERSCRIPT_LOAD_TIMEOUT_MS);
    console.log('waited');
    if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name) {
        console.log('Wrong state or game')
        return;
    }

    // Prevent multiple launches
    if (window.parent.isBgaUserscriptHideFriendsActivityStarted) {
        return;
    } else {
        console.log('Starting...');
        window.parent.isBgaUserscriptHideFriendsActivityStarted = true;
        window.parent.bgaUserscriptHideFriendsActivityData = bgaUserscriptHideFriendsActivityData.init();
    }
};


if (document.readyState === 'complete') {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? 'load' : 'onload', onload);
}
