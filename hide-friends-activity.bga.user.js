// ==UserScript==
// @name bga-hide-friends-activity
// @description Hide non-participating friends' activity in the game log
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.9.3-dev
// @match https://boardgamearena.com/*/*?*table=*
// @grant none
// @updateURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/hide-friends-activity.bga.user.js
// @downloadURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/hide-friends-activity.bga.user.js
// ==/UserScript==

// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

log('userscript');

const HFA_LOAD_TIMEOUT_MS = 3000;
const HFA_LOGS_ELEMENT_ID = "logs";
const HFA_PLAYER_NAME_ELEMENT_CLASS = "playername";
const HFA_INIT_MESSAGE_LOG_ID = "log_hide_friends_activity_init";

function log(msg) {
    console.log(`HFA: ${msg}`);
}

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
        this.renderInitMessage();

        return this;
    },

    getGamePlayers: function () {
        return []
            .concat(this.gameui.gameNeutralPlayers)
            .concat(this.gameui.gameMasculinePlayers)
            .concat(this.gameui.gameFemininePlayers);
    },

    registerObserver: function () {
        log(`Registering observer...`);
        const config = {
            attributes: false,
            childList: true,
            subtree: false,
        };
        const logsElement = Array.from(this.dojo.query(`#${HFA_LOGS_ELEMENT_ID}`))[0];
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
        log(`Processing log element: ${logElement.outerHTML}`);
        const nonParticipatingPlayerNames = Array.from(this.dojo.query(`.${HFA_PLAYER_NAME_ELEMENT_CLASS}`, logElement))
            .map(e => e.innerText)
            .filter(name => !this.players.includes(name));
        if (nonParticipatingPlayerNames.length) {
            log(`Hide activity of ${nonParticipatingPlayerNames}: ${logElement.innerText}`);
            this.dojo.destroy(logElement);
        }
    },

    renderInitMessage: function () {
        const logElement =
            `<div id="${HFA_INIT_MESSAGE_LOG_ID}" class="log" style="height: auto; display: block; color: black;">` +
            `    <div class="roundedbox" style="background-color: lightgray;">HFA userscript: activated</div>` +
            `</div>`;
        this.dojo.place(logElement, HFA_LOGS_ELEMENT_ID, 'first');
    },

};

var onload = async function () {
    log('Loaded');
    await sleep(HFA_LOAD_TIMEOUT_MS);
    log('Waited');
    if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name) {
        log('Wrong state or game')
        return;
    }

    // Prevent multiple launches
    if (window.parent.isBgaUserscriptHideFriendsActivityStarted) {
        return;
    } else {
        log('Starting...');
        window.parent.isBgaUserscriptHideFriendsActivityStarted = true;
        window.parent.bgaUserscriptHideFriendsActivityData = bgaUserscriptHideFriendsActivityData.init();
    }
};


if (document.readyState === 'complete') {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? 'load' : 'onload', onload);
}
