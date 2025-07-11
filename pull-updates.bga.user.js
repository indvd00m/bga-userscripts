// ==UserScript==
// @name bga-pull-updates
// @description Possibility to force pull of updates at BGA
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.9.3-dev
// @match https://boardgamearena.com/*/*?*table=*
// @grant none
// @updateURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/pull-updates.bga.user.js
// @downloadURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/pull-updates.bga.user.js
// ==/UserScript==

// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

// TODO: log into game log on button click
// TODO: message about activating in mobile log

log('userscript');

const PU_LOAD_TIMEOUT_MS = 3000;
const PU_UPPER_RIGHT_MENU_ID = "upperrightmenu";
const PU_PANEL_ID = "pull_updates_panel";
const PU_BUTTON_ID = "pull_updates_button";
const PU_LOGS_ELEMENT_ID = "logs";
const PU_INIT_MESSAGE_LOG_ID = "log_pull_updates_init";
const PU_URL_TABLE_ID_PATTERN = /table=(?<tableId>\d+)/;

function log(msg) {
    console.log(`PU: ${msg}`);
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

var pullUpdatesBgaUserscriptData = {
    dojo: null,
    gameui: null,
    bgaTableId: 0,

    init: function () {
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui) {
            return;
        }

        // init state
        this.dojo = window.parent.dojo;
        this.gameui = window.parent.gameui;
        this.bgaTableId = PU_URL_TABLE_ID_PATTERN.exec(window.location.search).groups['tableId'];


        this.renderContainers();

        this.renderPullUpdatesButton();

        this.registerSocketListeners();

        this.renderInitMessage();

        return this;
    },

    registerSocketListeners: function () {
        log(`Registering socket listeners...`);
        window.parent.gameui.socket.on('connected', function (ctx) {
            log(`socket connected`);
            window.parent.pullUpdatesBgaUserscriptData.pullUpdates();
        }).on('disconnected', function (ctx) {
            log(`socket disconnected`);
        });
    },

    pullUpdates: function () {
        log(`Trying to pull updates`);
        window.parent.gameui.reconnectAllSubscriptions();
    },

    onClickButton: function (e) {
        this.pullUpdates();
    },

    showLogMessage: function (message) {
        const logElement =
            `<div id="${PU_INIT_MESSAGE_LOG_ID}" class="log" style="height: auto; display: block; color: black;">` +
            `    <div class="roundedbox" style="background-color: lightgray;">PU: ${message}</div>` +
            `</div>`;
        this.dojo.place(logElement, PU_LOGS_ELEMENT_ID, 'first');
    },

    renderPullUpdatesButton: function () {
        const buttonElement = `<a id="${PU_BUTTON_ID}" class="globalaction icon20 icon20_warning self-center" href="#" style="top:0px"></a>`;
        const placedNode = this.dojo.place(buttonElement, PU_PANEL_ID, 'only');
        this.dojo.connect(placedNode, "onclick", this.onClickButton.bind(this));
    },

    renderContainers: function () {
        const pullUpdatesElement = `<div id="${PU_PANEL_ID}" class="upperrightmenu_item flex justify-center self-center"></div>`;
        this.dojo.place(pullUpdatesElement, PU_UPPER_RIGHT_MENU_ID, 'first');
    },

    renderInitMessage: function () {
        this.showLogMessage(`userscript activated`);
    },

};

var onload = async function () {
    log('Loaded');
    await sleep(PU_LOAD_TIMEOUT_MS);
    log('Waited');
    if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name) {
        log('Wrong state or game')
        return;
    }

    // Prevent multiple launches
    if (window.parent.isPullUpdatesBgaUserscriptStarted) {
        return;
    } else {
        log('Starting...');
        window.parent.isPullUpdatesBgaUserscriptStarted = true;
        window.parent.pullUpdatesBgaUserscriptData = pullUpdatesBgaUserscriptData.init();
    }
};


if (document.readyState === 'complete') {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? 'load' : 'onload', onload);
}
