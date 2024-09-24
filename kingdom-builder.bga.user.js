// ==UserScript==
// @name bga-kingdom-builder
// @description Автоматический подсчет игровых параметров
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.2.3-dev
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
const BGA_PLAYER_BOARD_ID_PREFIX = "overall_player_board_";
const USERSCRIPT_PLAYER_BOARD_ID_PREFIX = "userscript_player_board_";
const BGA_TERRAIN_BACK = "back";
const BGA_START_SETTLEMENTS_COUNT = 40;
const STATISTICS_PANEL_ID = "userscript_statistics_panel";
const STATISTICS_PANEL_CLASS = "userscript_statistics_panel_class";

const BGA_QUADRANT_CLASS_NAME_PATTERN = /^quadrant-(?<index>\d+)$/;
const BGA_QUADRANT_FLIPPED_CLASS_NAME = 'flipped';
const BGA_CELL_CONTAINER_ID_PREFIX = 'cell-container';

const QUADRANT_WIDTH = 10;
const QUADRANT_HEIGHT = 10;

class Coord {
    x = 0;
    y = 0;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Canvas {

    #width = -1;
    #height = -1;
    #text = '';
    #pattern;

    constructor(width, height, text) {
        this.#width = width;
        this.#height = height;
        this.#text = text;
        this.#pattern = new RegExp(`^(.{${width}}\n){${height - 1}}.{${width}}$`);
        this.validate();
    }

    get width() {
        return this.#width;
    }

    get height() {
        return this.#height;
    }

    get text() {
        return this.#text;
    }

    rows() {
        return this.#text.split(/\n/);
    }

    rotate180() {
        const rows = this.rows();
        let rotated = '';
        rows.reverse().forEach(l => {
            rotated += l.trimEnd().split('').reverse().join('') + '\n';
        });
        return new Canvas(this.width, this.height, rotated.trimEnd());
    }

    validate() {
        if (!this.#pattern.test(this.#text)) {
            throw new Error(`Text ${this.text} does not match to canvas pattern ${this.#pattern}`);
        }
    }

    getChar(x, y) {
        if (x < 0 || x >= this.width) {
            throw new Error(`Unbound exception: ${x}`);
        }
        if (y < 0 || y >= this.height) {
            throw new Error(`Unbound exception: ${y}`);
        }
        const index = y * (this.width + 1) + x;
        return this.text.charAt(index);
    }

    static merge(c1, c2, c3, c4) {
        c1.validate();
        c2.validate();
        c3.validate();
        c4.validate();

        const width = c1.width;
        const height = c1.height;
        if (width !== c2.width || width !== c3.width || width !== c4.width) {
            throw new Error('Width of canvases must be equal to each other!');
        }
        if (height !== c2.height || height !== c3.height || height !== c4.height) {
            throw new Error('Height of canvases must be equal to each other!');
        }

        const rows1 = c1.rows();
        const rows2 = c2.rows();
        const rows3 = c3.rows();
        const rows4 = c4.rows();

        let map = '';
        for (let i = 0; i < height; i++) {
            map += rows1[i].trimEnd() + rows2[i].trimEnd() + '\n';
        }
        for (let i = 0; i < width; i++) {
            map += rows3[i].trimEnd() + rows4[i].trimEnd() + '\n';
        }
        return new Canvas(width * 2, height * 2, map.trimEnd());
    }
}

class Maps {

    /**
     * Map legend:
     * G - grass
     * C - canyon
     * D - desert
     * L - flower
     * R - forest
     * W - water
     * M - mountain
     * ! - castle
     * 0 - location place
     */

    static POSSIBLE_CHARS = 'GCDLRWM!0';

    static BASE_QUADRANT_01 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'CDDDDDDDDD\n' +
        'CCCDDDDDCD\n' +
        'MMMDMM0DDC\n' +
        'CMMMMMLLCC\n' +
        'CCCMMWLLLC\n' +
        'GCCCMLLWRC\n' +
        'GG0RLLWLLR\n' +
        'GGRRLLG!RR\n' +
        'GGGRRWGGRR\n' +
        'GGGRWGGRRR');

    static BASE_QUADRANT_02 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'DDCWWRRRGG\n' +
        'D!CWRRR0GG\n' +
        'CCCLLLRCLL\n' +
        'CCLLWDDCCL\n' +
        'CGGWLLDDCC\n' +
        'GG0LWLWDDC\n' +
        'GGGRLLWWDD\n' +
        'GGRRMWWWDW\n' +
        'GMRRWWWWWW\n' +
        'RRRWWWWWWW');

    static BASE_QUADRANT_03 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'GGGRRWGRRR\n' +
        'GGG!RWGRRR\n' +
        'GLLGRRWGGR\n' +
        'LLCGRWL0RR\n' +
        'LLLCCWLLWW\n' +
        'MMCGGWWWDD\n' +
        'CCCMGLLLDD\n' +
        'CC!DMDLLCC\n' +
        'WWWDDDDMCC\n' +
        'WWWWDDDDDC');

    static BASE_QUADRANT_04 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'GGRRRWGRRL\n' +
        'GLRRWGRRLL\n' +
        'GLLRWGGLLL\n' +
        'LLRRWGMLDD\n' +
        'CL!RWGDDDD\n' +
        'CCRWGGMMDD\n' +
        'CCWWWGDDDC\n' +
        'WWGGWW0CMC\n' +
        'WD!GWMWCCC\n' +
        'WDDWWWWCCC');

    static BASE_QUADRANT_05 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'RRRRMMGMCC\n' +
        'RMRRLGMMMC\n' +
        'LLRLLLGGWM\n' +
        'DLLLW0GWMM\n' +
        'DDDDLWGWCC\n' +
        'DCDDDWWCGC\n' +
        'DDCDDWL!GC\n' +
        'CC0DWLLLGG\n' +
        'DCWWWRRLGG\n' +
        'DCCWRRRGGG');

    static BASE_QUADRANT_06 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'DDCWWRRGGG\n' +
        'DCWLLRRRGG\n' +
        'DDWLLRR0LG\n' +
        'WWWLGRLLLL\n' +
        'WWWWGGGGLL\n' +
        'WRRWGGCCDC\n' +
        'WRCRWGCCDC\n' +
        'W!CLW0DDCW\n' +
        'WWCLWWWDDW\n' +
        'WWWWWWWWWW');

    static BASE_QUADRANT_07 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'CCCDDWDDDD\n' +
        'MMCDDWDDDD\n' +
        'MMCMMWDD0L\n' +
        'MCMMWMDLLL\n' +
        'CCRRWMMCLL\n' +
        'CRRWCCCMLL\n' +
        'C0RRWLLLLL\n' +
        'GGRWG!GLGR\n' +
        'GGRRWGGGGR\n' +
        'GGRRWGGGRR');

    static BASE_QUADRANT_08 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'LDDMMDDCCC\n' +
        'LLDDDMMCCC\n' +
        'LLLLLLLMMM\n' +
        'WWL!GGRRMM\n' +
        'LLWWGGGRRC\n' +
        'LCCWGRRCCC\n' +
        'DL0CWRR0CG\n' +
        'DDCWRRGGGG\n' +
        'DDDWRRRGGG\n' +
        'DDWWRRRGGG');

    static BASE_QUADRANT_09 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'WWGGWWWLLL\n' +
        'WGGRWWWLLL\n' +
        'WWWGRWWDDL\n' +
        'RRW!RWDMLL\n' +
        'RRRWWWDDGG\n' +
        'RRRRCDGGGG\n' +
        'RR0CCCGGMG\n' +
        'RCCCCG0DDG\n' +
        'CMCCCLLLDD\n' +
        'CCCLLLLDDD');

    static BASE_QUADRANT_10 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'GGGWWWMCCC\n' +
        'GGWRDWWWCC\n' +
        'GMWR0DDDWM\n' +
        'LWRRCCDLLL\n' +
        'LWGGCCDDML\n' +
        'LW!GCCD0LL\n' +
        'LLWGCCCLLL\n' +
        'DWGGC!RRLL\n' +
        'DDWWGRRMRR\n' +
        'DDDWWRMRRR');

    static BASE_QUADRANT_11 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'CCCWWWWDDD\n' +
        'CCCW0LDDMD\n' +
        'CCCCCCLDMD\n' +
        'CGGCCMLMDD\n' +
        'CGGGDMMLLL\n' +
        'RLG0DDLLLL\n' +
        'RRLLDMLGGL\n' +
        'RRMLMR!GGG\n' +
        'RMRRRRWWGG\n' +
        'RRRRWWWGGG');

    static BASE_QUADRANT_12 = new Canvas(QUADRANT_WIDTH, QUADRANT_HEIGHT,
        'DDDDDDDGGG\n' +
        'DDDMDLLLGG\n' +
        'DMDDDLWLGR\n' +
        'CLWD!WLRRR\n' +
        'CLLWWWL0CR\n' +
        'CLLLWWLCCC\n' +
        'CCC0RWWLMC\n' +
        'GCGGRWLCCC\n' +
        'GGGGRRRRCM\n' +
        'GGGRRRRRMM');

    static getAdjacentGexes(x, y) {
        if (y % 2 === 0) {
            return [
                new Coord(x - 1, y),
                new Coord(x + 1, y),
                new Coord(x, y - 1),
                new Coord(x, y + 1),
                new Coord(x - 1, y - 1),
                new Coord(x - 1, y + 1)
            ];
        } else {
            return [
                new Coord(x - 1, y),
                new Coord(x + 1, y),
                new Coord(x, y - 1),
                new Coord(x, y + 1),
                new Coord(x + 1, y - 1),
                new Coord(x + 1, y + 1)
            ];
        }
    }

}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function objectKeys(object) {
    return Object.keys(object);
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
    map: new Canvas(1, 1, ' '),
    isRenderAsciiMap: true,
    playersStats: {},

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
        } else {
            console.log(`Found incomplete log with ${log.length} actions`);
        }
        const openedTerrains = this.findShownTerrains(log);
        if (openedTerrains.length) {
            openedTerrains.forEach(t => {
                this.processTerrain(t);
            });
            this.processAnotherCurrentPlayerTerrain(log);
        } else {
            this.processFirstTerrains();
        }

        // map
        this.map = this.parseMap();
        console.log('Map in ASCII format:');
        console.log(this.map.text);
        if (this.isRenderAsciiMap) {
            this.renderAsciiMap();
        }

        // players stats
        this.game.fplayers.forEach(p => {
            const id = parseInt(p.id);
            this.playersStats[id + ''] = this.calculatePlayerStats(id);
        })
        this.renderPlayerUserscriptPanels();

        return this;
    },

    parseMap: function () {
        const quadrantElements = this.dojo.query('#grid-container .quadrant');
        if (quadrantElements.length !== 4) {
            throw new Error(`Unexpected quadrants count: ${quadrantElements.length}`);
        }
        const q1 = this.quadrantElementToCanvas(quadrantElements[0]);
        const q2 = this.quadrantElementToCanvas(quadrantElements[1]);
        const q3 = this.quadrantElementToCanvas(quadrantElements[2]);
        const q4 = this.quadrantElementToCanvas(quadrantElements[3]);

        const map = Canvas.merge(q1, q2, q3, q4);
        return map;
    },

    calculatePlayerStats: function (id) {
        return {
            stats: this.calculateAdjacentStats(id)
        };
    },

    calculateAdjacentStats: function (id) {
        const settlementsByCoord = {};
        this.game.board.settlements.forEach(s => {
            settlementsByCoord[`${s.y}-${s.x}`] = s;
        });
        const adjacentEmptyTerrainCharsGexes = {};
        Maps.POSSIBLE_CHARS.split('').forEach(c => adjacentEmptyTerrainCharsGexes[c] = {});
        const adjacentEmptyTerrainCharsSettlementsCount = {};
        Maps.POSSIBLE_CHARS.split('').forEach(c => adjacentEmptyTerrainCharsSettlementsCount[c] = {});
        const playerSettlements = this.game.board.settlements.filter(s => s.player_id === id + '');
        playerSettlements.forEach(s => {
            const x = parseInt(s.y);
            const y = parseInt(s.x);
            const sSettlementCoord = `${x}-${y}`;
            const gexes = Maps.getAdjacentGexes(x, y);
            for (let i = 0; i < gexes.length; i++) {
                const gex = gexes[i];
                if (gex.x < 0 || gex.x >= this.map.width || gex.y < 0 || gex.y >= this.map.height) {
                    continue;
                }
                const sAdjCoord = `${gex.x}-${gex.y}`;
                if (settlementsByCoord[sAdjCoord] == null) {
                    const c = this.map.getChar(gex.x, gex.y);
                    if (adjacentEmptyTerrainCharsGexes[c][sAdjCoord] == null) {
                        adjacentEmptyTerrainCharsGexes[c][sAdjCoord] = 1;
                    } else {
                        adjacentEmptyTerrainCharsGexes[c][sAdjCoord]++;
                    }
                    if (adjacentEmptyTerrainCharsSettlementsCount[c][sSettlementCoord] == null) {
                        adjacentEmptyTerrainCharsSettlementsCount[c][sSettlementCoord] = 1;
                    } else {
                        adjacentEmptyTerrainCharsSettlementsCount[c][sSettlementCoord]++;
                    }
                }
            }
        });
        const adjacentCounts = {
            Grass: objectKeys(adjacentEmptyTerrainCharsGexes['G']).length,
            Canyon: objectKeys(adjacentEmptyTerrainCharsGexes['C']).length,
            Desert: objectKeys(adjacentEmptyTerrainCharsGexes['D']).length,
            Flower: objectKeys(adjacentEmptyTerrainCharsGexes['L']).length,
            Forest: objectKeys(adjacentEmptyTerrainCharsGexes['R']).length,
        }
        const objectivesStats = {
            Fishers: objectKeys(adjacentEmptyTerrainCharsSettlementsCount['W']).length,
            Miners: objectKeys(adjacentEmptyTerrainCharsSettlementsCount['M']).length,
            Workers: objectKeys(adjacentEmptyTerrainCharsSettlementsCount['!']).length
                + objectKeys(adjacentEmptyTerrainCharsSettlementsCount['0']).length,
        }
        return {
            adjacentCounts: adjacentCounts,
            objectivesStats: objectivesStats
            // adjacentCoords: adjacentEmptyTerrainCharsGexes
        };
    },

    renderAsciiMap: function () {
        for (let x = 0; x < this.map.width; x++) {
            for (let y = 0; y < this.map.height; y++) {
                const char = this.map.getChar(x, y);
                const cellId = `${BGA_CELL_CONTAINER_ID_PREFIX}-${y}-${x}`;
                this.dojo.place("<span "
                    + "style='font-size: 70%; font-weight: bolder; position: absolute; left: 50%; top: 50%; " +
                    "transform: translate(-50%, -50%); z-index: 10;'"
                    + ">" + char + "</span>",
                    cellId,
                    "last");
            }
        }
    },

    quadrantElementToCanvas: function (quadrantElement) {
        const classes = Array.from(quadrantElement.classList);
        const className = classes.find(c => BGA_QUADRANT_CLASS_NAME_PATTERN.test(c));
        const index = parseInt(BGA_QUADRANT_CLASS_NAME_PATTERN.exec(className).groups['index']);
        const number = index + 1;
        const postfix = (number + '').padStart(2, '0');
        const quadrantName = `BASE_QUADRANT_${postfix}`;
        const quadrantCanvas = Maps[quadrantName];
        let rotated = quadrantElement.classList.contains(BGA_QUADRANT_FLIPPED_CLASS_NAME);
        console.log(`Found quadrant ${quadrantName}${rotated ? ' (rotated)' : ''}`);
        if (rotated) {
            return quadrantCanvas.rotate180();
        } else {
            return quadrantCanvas;
        }
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

        this.game.fplayers.forEach(p => {
            const id = parseInt(p.id);
            this.dojo.place("<div id='" + (USERSCRIPT_PLAYER_BOARD_ID_PREFIX + id) + "'"
                + "style='font-size: 70%;'"
                + "></div>",
                BGA_PLAYER_BOARD_ID_PREFIX + id,
                "last");
        })
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
    },

    renderPlayerUserscriptPanels: function () {
        this.game.fplayers.forEach(p => {
            const id = parseInt(p.id);
            var html = "<div>";
            html += `Stats for user ${id}: ${JSON.stringify(this.playersStats[id + ''], null, 2)}`;
            this.dojo.place(html, USERSCRIPT_PLAYER_BOARD_ID_PREFIX + id, "only");
        });
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
