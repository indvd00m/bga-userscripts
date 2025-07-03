// ==UserScript==
// @name bga-pull-updates
// @description Possibility to force pull of updates at BGA
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.1.0
// @match https://boardgamearena.com/*/*?*table=*
// @match https://*.boardgamearena.com/*/*?*table=*
// @grant none
// @updateURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/pull-updates.bga.user.js
// @downloadURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/pull-updates.bga.user.js
// ==/UserScript==

// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

// INFO: undo action: window.parent.gameui.ajaxcall(`https://boardgamearena.com/14/kingdombuilder/kingdombuilder/undoAction.html?lock=2d4e4b5f-604a-40bc-8bce-a84d18a6a426&table=692670204&noerrortracking=true&dojo.preventCache=${Date.now()}`, {lock: !0})

console.log('BGA userscript for force pull updates');

const USERSCRIPT_LOAD_TIMEOUT_MS = 3000;
const UPPER_RIGHT_MENU_ID = "upperrightmenu";
const PULL_UPDATES_PANEL_ID = "pull_updates_panel";
const PULL_UPDATES_BUTTON_ID = "pull_updates_button";
const BGA_URL_TABLE_ID_PATTERN = /table=(?<tableId>\d+)/;

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
        this.bgaTableId = BGA_URL_TABLE_ID_PATTERN.exec(window.location.search).groups['tableId'];

        this.renderContainers();

        this.renderPullUpdatesButton();

        return this;
    },

    onClickButton: function (e) {
        console.log(`try to pull events`);
        window.parent.gameui.reconnectAllSubscriptions();
    },

    renderPullUpdatesButton: function () {
        const buttonElement = `<a id="${PULL_UPDATES_BUTTON_ID}" class="globalaction icon20 icon20_warning self-center" href="#" style="top:0px"></a>`;
        const placedNode = this.dojo.place(buttonElement, PULL_UPDATES_PANEL_ID, 'only');
        this.dojo.connect(placedNode, "onclick", this.onClickButton);
    },

    renderContainers: function () {
        const pullUpdatesElement = `<div id="${PULL_UPDATES_PANEL_ID}" class="upperrightmenu_item flex justify-center self-center"></div>`;
        this.dojo.place(pullUpdatesElement, UPPER_RIGHT_MENU_ID, 'first');
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
    if (window.parent.isPullUpdatesBgaUserscriptStarted) {
        return;
    } else {
        console.log('Starting...');
        window.parent.isPullUpdatesBgaUserscriptStarted = true;
        window.parent.pullUpdatesBgaUserscriptData = pullUpdatesBgaUserscriptData.init();
    }
};


if (document.readyState === 'complete') {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? 'load' : 'onload', onload);
}
