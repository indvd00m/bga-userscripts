// ==UserScript==
// @name bga-kingdom-builder
// @description Extended statistics for Kingdom Builder game at BGA
// @author indvd00m <gotoindvdum [at] gmail [dot] com>
// @license Creative Commons Attribution 3.0 Unported
// @version 0.9.1
// @match https://boardgamearena.com/*/kingdombuilder*
// @match https://*.boardgamearena.com/*/kingdombuilder*
// @grant none
// @updateURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/kingdom-builder.bga.user.js
// @downloadURL https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/kingdom-builder.bga.user.js
// ==/UserScript==

// TODO: @icon
// TODO: @grant
// TODO: @exclude-match

// TODO: Rounds played

console.log('BGA userscript for Kingdom Builder');

const BGA_PLAYER_BOARDS_ID = "player_boards";
const BGA_PLAYER_BOARD_CLASS = "player-board";
const BGA_PLAYER_BOARD_ID_PREFIX = "overall_player_board_";
const BGA_PLAYER_SCORE_ID_PREFIX = "player_score_";
const BGA_PLAYER_SETTLEMENTS_ID_PREFIX = "player-settlements-";
const USERSCRIPT_PLAYER_BOARD_ID_PREFIX = "userscript_player_board_";
const USERSCRIPT_PLAYER_SCORE_ID_PREFIX = "userscript_player_score_";
const USERSCRIPT_PLAYER_SETTLEMENTS_ID_PREFIX = "userscript_player_settlements_";
const BGA_TERRAIN_BACK = "back";
const BGA_START_SETTLEMENTS_COUNT = 40;
const BGA_MANDATORY_SETTLEMENTS_BUILD_COUNT = 3;
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

function objectValues(object) {
    return Object.values(object);
}

function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}

function add(accumulator, a) {
    return accumulator + a;
}

/**
 *
 * X and Y coordinates at bga adaptation for some reason is inverted!
 *
 */

var kingdomBuilderBgaUserscriptData = {
    dojo: null,
    game: null,
    settlements: {},
    terrains: ['Grass', 'Canyon', 'Desert', 'Flower', 'Forest'],
    // unfortunetally we do not have language independent terrain name in actions history
    terrainsRu: ['Трава', 'Каньон', 'Пустыня', 'Цвет', 'Лес'],
    terrainsPlayed: {},
    terrainsProbability: {},
    terrainsPlayedCount: 0,
    turnsCount: 0,
    logIsFull: false,
    terrainsStackSize: 25,
    lastShowTerrainPlayerId: 0,
    myPlayerId: -1,
    map: new Canvas(1, 1, ' '),
    isRenderAsciiMap: false,
    playersStats: {},
    playersServerStats: {},
    objectivesIdToName: {
        0: 'Castles',
        1: 'Fishermen',
        2: 'Merchants',
        3: 'Discoverers',
        4: 'Hermits',
        5: 'Citizens',
        6: 'Miners',
        7: 'Workers',
        8: 'Knights',
        9: 'Lords',
        10: 'Farmers'
    },
    terrainsImage: '',
    objectivesImage: '',
    showTextTerrainStat: false,
    showTextPlayerStat: false,
    playersTiles: {},
    locationTypes: ['Oracle', 'Farm', 'Tavern', 'Tower', 'Harbor', 'Paddock', 'Oasis', 'Barn', 'Caravan', 'Quarry', 'Village', 'Garden'],
    locationTypesByBgaId: {
        8: 'Oracle',
        9: 'Farm',
        10: 'Tavern',
        11: 'Tower',
        12: 'Harbor',
        13: 'Paddock',
        14: 'Oasis',
        15: 'Barn',
        16: 'Caravan',
        17: 'Quarry',
        18: 'Village',
        19: 'Garden'
    },
    turnsToGameEnd: 0,
    showTextStack: false,

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
        this.game.board.settlements.forEach(s => {
            const x = parseInt(s.y);
            const y = parseInt(s.x);
            this.settlements[`${x}-${y}`] = {
                player_id: parseInt(s.player_id),
                x: x,
                y: y
            };
        })
        const myPlayer = this.game.fplayers.find(p => p.name === window.parent.gameui.current_player_name);
        if (myPlayer) {
            this.myPlayerId = parseInt(myPlayer.id);
        }
        this.resetTerrainsStatistics();

        // images
        this.detectImagesPaths();

        // Connect event handlers to follow game progress
        this.dojo.subscribe("showTerrain", this, "processShowTerrain");
        this.dojo.subscribe("build", this, "processBuild");
        this.dojo.subscribe("move", this, "processMove");
        this.dojo.subscribe("cancel", this, "processCancel");
        this.dojo.subscribe("updateScores", this, "processUpdateScores");
        this.dojo.subscribe("obtainTile", this, "processObtainTile");
        this.dojo.subscribe("loseTile", this, "processLoseTile");


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
        this.initTiles(this.game.fplayers);
        objectKeys(this.game.players).forEach(sId => {
            let id = parseInt(sId);
            if (this.playersServerStats[id] == null) {
                this.playersServerStats[id] = {};
            }
            let score = 0;
            if (this.game.players[sId].score != null) {
                score = parseInt(this.game.players[sId].score);
            }
            this.playersServerStats[id].score = score;
        })
        this.recalculateAllPlayerStats();
        this.renderPlayerUserscriptPanels();
        this.recalculateTurnsToGameEnd();
        this.renderStatisticsPanel();

        return this;
    },

    detectImagesPaths: function () {
        this.terrainsImage = objectKeys(window.parent.gameui.images_loading_status)
            .find(p => p.endsWith('/terrains.png'));
        this.objectivesImage = objectKeys(window.parent.gameui.images_loading_status)
            .find(p => p.endsWith('/card-backgrounds.jpg'));
    },

    initTiles: function (players) {
        players.forEach(p => {
            // {"id":"1","status":"hand","location":"9","x":"1","y":"7","player_id":"84875203"}
            const playerId = parseInt(p.id);
            if (p.tiles) {
                this.playersTiles[playerId] = p.tiles.map(t => {
                    return {
                        id: parseInt(t.id),
                        status: t.status,
                        type: this.locationTypesByBgaId[parseInt(t.location)],
                        x: parseInt(t.y),
                        y: parseInt(t.x)
                    }
                });
            } else {
                this.playersTiles[playerId] = [];
            }
        })
    },

    recalculateTurnsToGameEnd: function () {
        console.log(`playersTiles: ${JSON.stringify(this.playersTiles)}`);

        const allPlayerTurnsToGameEnd = this.game.fplayers.map(p => {
            const playerId = parseInt(p.id);
            const turnsToGameEnd = this.calculatePlayerTurnsToGameEnd(playerId);
            return {
                playerId: playerId,
                turnsToGameEnd: turnsToGameEnd
            }
        });
        this.turnsToGameEnd = Math.min.apply(null, allPlayerTurnsToGameEnd.map(o => o.turnsToGameEnd));
    },

    calculatePlayerTurnsToGameEnd: function (playerId) {
        const playerSettlements = objectValues(this.settlements).filter(s => s.player_id === playerId);
        const remainsSettlementsCount = BGA_START_SETTLEMENTS_COUNT - playerSettlements.length;
        const production = this.playersStats[playerId].maxProduction;
        return Math.ceil(remainsSettlementsCount / production);
    },

    getPlayerMaxProduction: function (playerId) {
        const productionTilesCount = this.playersTiles[playerId].filter(t => {
            switch (t.type) {
                case 'Oracle':
                case 'Farm':
                case 'Tavern':
                case 'Tower':
                case 'Oasis':
                    return true;
                case 'Harbor':
                case 'Paddock':
                case 'Barn':
                    return false;
                case 'Caravan':
                case 'Quarry':
                case 'Village':
                case 'Garden':
                    return false;
                default:
                    return false;
            }
        }).length;
        return BGA_MANDATORY_SETTLEMENTS_BUILD_COUNT + productionTilesCount;
    },

    recalculateAllPlayerStats: function () {
        const objectiveNames = {};
        this.game.objectives.map(o => this.objectivesIdToName[o.id]).forEach(n => objectiveNames[n] = n);
        const playerIds = this.game.fplayers.map(p => parseInt(p.id));
        playerIds.forEach(id => {
            this.playersStats[id] = this.calculatePlayerStats(id, objectiveNames);
        })
        if (objectiveNames['Lords']) {
            this.calculateLords(playerIds, this.playersStats);
        }
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

    calculatePlayerStats: function (id, objectiveNames) {
        const stats = {
            adjacentCounts: {},
            objectives: {},
            score: 0,
            builtSettlementsCount: objectValues(this.settlements).filter(s => s.player_id === id),
            maxProduction: this.getPlayerMaxProduction(id)
        };
        this.calculateAdjacentObjectives(id, stats);
        this.calculateKnights(id, stats);
        if (objectiveNames['Hermits'] || objectiveNames['Merchants'] || objectiveNames['Castles'] || objectiveNames['Citizens']) {
            this.calculateAreasObjectives(id, stats);
        }
        if (objectiveNames['Farmers']) {
            this.calculateFarmers(id, stats);
        }
        if (objectiveNames['Discoverers']) {
            this.calculateDiscoverers(id, stats);
        }

        const toRemoveNames = objectKeys(stats.objectives).filter(n => !objectiveNames[n]);
        toRemoveNames.forEach(n => delete stats.objectives[n]);

        stats.score = objectValues(stats.objectives).map(o => o.score).reduce(add, 0);
        return stats;
    },

    calculateKnights: function (id, stats) {
        const yCounts = {};
        const playerSettlements = objectValues(this.settlements).filter(s => s.player_id === id);
        playerSettlements.forEach(s => {
            if (yCounts[s.y] == null) {
                yCounts[s.y] = 0;
            }
            yCounts[s.y]++;
        });
        let maxLineCount = 0;
        const linesCount = objectValues(yCounts);
        if (linesCount.length) {
            maxLineCount = Math.max.apply(null, linesCount);
        }
        stats['objectives']['Knights'] = {
            score: maxLineCount * 2,
            maxLineSettlementsCount: maxLineCount
        };
    },

    calculateDiscoverers: function (id, stats) {
        const playerSettlements = objectValues(this.settlements).filter(s => s.player_id === id);
        stats['objectives']['Discoverers'] = {
            score: playerSettlements.map(s => s.y).filter(onlyUnique).length
        };
    },

    calculateAreaSettlements(id) {
        const areaSettlements = [0, 0, 0, 0];
        const playerSettlements = objectValues(this.settlements).filter(s => s.player_id === id);
        playerSettlements.forEach(s => {
            if (s.x < QUADRANT_WIDTH && s.y < QUADRANT_HEIGHT) {
                areaSettlements[0]++;
            } else if (s.x >= QUADRANT_WIDTH && s.y < QUADRANT_HEIGHT) {
                areaSettlements[1]++;
            } else if (s.x < QUADRANT_WIDTH && s.y >= QUADRANT_HEIGHT) {
                areaSettlements[2]++;
            } else if (s.x >= QUADRANT_WIDTH && s.y >= QUADRANT_HEIGHT) {
                areaSettlements[3]++;
            }
        });
        return areaSettlements;
    },

    calculateFarmers: function (id, stats) {
        const areaSettlements = this.calculateAreaSettlements(id);
        stats['objectives']['Farmers'] = {
            score: Math.min.apply(null, areaSettlements) * 3,
            areaSettlements: areaSettlements
        };
    },

    calculateLords: function (playerIds, playersStats) {
        const areasSettlements = playerIds.map(id => this.calculateAreaSettlements(id));
        const quadrant1MaxCount = Math.max.apply(null, areasSettlements.map(s => s[0]));
        const quadrant2MaxCount = Math.max.apply(null, areasSettlements.map(s => s[1]));
        const quadrant3MaxCount = Math.max.apply(null, areasSettlements.map(s => s[2]));
        const quadrant4MaxCount = Math.max.apply(null, areasSettlements.map(s => s[3]));
        let quadrant1WithoutMaxCounts = areasSettlements.map(s => s[0]).filter(c => c !== quadrant1MaxCount);
        let quadrant2WithoutMaxCounts = areasSettlements.map(s => s[1]).filter(c => c !== quadrant2MaxCount);
        let quadrant3WithoutMaxCounts = areasSettlements.map(s => s[2]).filter(c => c !== quadrant3MaxCount);
        let quadrant4WithoutMaxCounts = areasSettlements.map(s => s[3]).filter(c => c !== quadrant4MaxCount);
        let quadrant1SecondMaxCount = 0;
        if (quadrant1WithoutMaxCounts.length) {
            quadrant1SecondMaxCount = Math.max.apply(null, quadrant1WithoutMaxCounts);
        }
        let quadrant2SecondMaxCount = 0;
        if (quadrant2WithoutMaxCounts.length) {
            quadrant2SecondMaxCount = Math.max.apply(null, quadrant2WithoutMaxCounts);
        }
        let quadrant3SecondMaxCount = 0;
        if (quadrant3WithoutMaxCounts.length) {
            quadrant3SecondMaxCount = Math.max.apply(null, quadrant3WithoutMaxCounts);
        }
        let quadrant4SecondMaxCount = 0;
        if (quadrant4WithoutMaxCounts.length) {
            quadrant4SecondMaxCount = Math.max.apply(null, quadrant4WithoutMaxCounts);
        }
        for (let i = 0; i < playerIds.length; i++) {
            const id = playerIds[i];
            let areaSettlements = areasSettlements[i];
            let score1 = 0;
            let score2 = 0;
            let score3 = 0;
            let score4 = 0;

            // quadrant 1
            if (quadrant1MaxCount > 0) {
                if (areaSettlements[0] === quadrant1MaxCount) {
                    score1 += 12;
                }
            }
            if (quadrant1SecondMaxCount > 0) {
                if (areaSettlements[0] === quadrant1SecondMaxCount) {
                    score1 += 6;
                }
            }
            // quadrant 2
            if (quadrant2MaxCount > 0) {
                if (areaSettlements[1] === quadrant2MaxCount) {
                    score2 += 12;
                }
            }
            if (quadrant2SecondMaxCount > 0) {
                if (areaSettlements[1] === quadrant2SecondMaxCount) {
                    score2 += 6;
                }
            }
            // quadrant 3
            if (quadrant3MaxCount > 0) {
                if (areaSettlements[2] === quadrant3MaxCount) {
                    score3 += 12;
                }
            }
            if (quadrant3SecondMaxCount > 0) {
                if (areaSettlements[2] === quadrant3SecondMaxCount) {
                    score3 += 6;
                }
            }
            // quadrant 4
            if (quadrant4MaxCount > 0) {
                if (areaSettlements[3] === quadrant4MaxCount) {
                    score4 += 12;
                }
            }
            if (quadrant4SecondMaxCount > 0) {
                if (areaSettlements[3] === quadrant4SecondMaxCount) {
                    score4 += 6;
                }
            }
            const score = score1 + score2 + score3 + score4;
            playersStats[id]['objectives']['Lords'] = {
                areaSettlements: areaSettlements,
                areaScores: [score1, score2, score3, score4],
                score: score
            }
            playersStats[id].score += score;
        }
    },

    calculateAreasObjectives: function (id, stats) {
        let areas = [{
            number: 1,
            adjacentLocations: {},
            adjacentCastles: {},
            size: 0,
        }];
        const processedSettlements = {};
        const playerSettlements = objectValues(this.settlements).filter(s => s.player_id === id);
        playerSettlements.forEach(s => {
            if (this.processNextArea(s, processedSettlements, areas[areas.length - 1])) {
                const nextNumber = areas.length + 1;
                areas.push({
                    number: nextNumber,
                    adjacentLocations: {},
                    adjacentCastles: {},
                    size: 0,
                });
            }
        });

        areas = areas.filter(a => a.size > 0);

        // hermits
        stats['objectives']['Hermits'] = {
            score: areas.length
        };

        // merchants
        let merchantsScore = 0;
        const processedLocations = {};
        areas.forEach(a => {
            let adjacentLocationKeys = objectKeys(a.adjacentLocations);
            const newLocationKeys = adjacentLocationKeys.filter(key => !processedLocations[key]);
            const newLocationsCount = newLocationKeys.length;
            let locationsCount = newLocationsCount;
            if (newLocationKeys < adjacentLocationKeys) {
                locationsCount++;
            }
            if (locationsCount > 1) {
                merchantsScore += newLocationsCount * 4;
                newLocationKeys.forEach(l => processedLocations[l] = l);
            }
        });
        stats['objectives']['Merchants'] = {
            score: merchantsScore
        };

        // castle
        const allAdjacentCastles = {};
        areas.flatMap(a => objectKeys(a.adjacentCastles)).forEach(key => allAdjacentCastles[key] = key);
        let adjacentCastlesCount = objectKeys(allAdjacentCastles).length;
        stats['objectives']['Castles'] = {
            score: adjacentCastlesCount * 3,
            castlesCount: adjacentCastlesCount
        };

        // citizens
        let maxAreaSettlements = 0;
        if (areas.length) {
            maxAreaSettlements = Math.max.apply(null, areas.map(a => a.size));
        }
        stats['objectives']['Citizens'] = {
            score: Math.floor(maxAreaSettlements / 2),
            settlements: maxAreaSettlements
        };
    },

    processNextArea: function (settlement, processedSettlements, area) {
        const key = `${settlement.x}-${settlement.y}`;
        if (!processedSettlements[key]) {
            processedSettlements[key] = area;
            area.size++;
            const adjacentGexes = Maps.getAdjacentGexes(settlement.x, settlement.y)
                .filter(g => g.x >= 0 && g.y >= 0 && g.x < QUADRANT_WIDTH * 2 && g.y < QUADRANT_HEIGHT * 2);
            adjacentGexes.forEach(g => {
                const char = this.map.getChar(g.x, g.y);
                if (char === '!') {
                    area.adjacentCastles[`${g.x}-${g.y}`] = char;
                }
                if (char === '0' || char === '!') {
                    area.adjacentLocations[`${g.x}-${g.y}`] = char;
                }
            });
            const playerAdjacentSettlements = adjacentGexes
                .filter(g => processedSettlements[`${g.x}-${g.y}`] == null)
                .filter(g => this.settlements[`${g.x}-${g.y}`])
                .map(g => this.settlements[`${g.x}-${g.y}`])
                .filter(s => s.player_id === settlement.player_id);
            playerAdjacentSettlements.forEach(s => this.processNextArea(s, processedSettlements, area));
            return true;
        }
        return false;
    },

    calculateAdjacentObjectives: function (id, stats) {
        const adjacentEmptyTerrainCharsGexes = {};
        Maps.POSSIBLE_CHARS.split('').forEach(c => adjacentEmptyTerrainCharsGexes[c] = {});
        const adjacentEmptyTerrainCharsSettlementsCount = {};
        Maps.POSSIBLE_CHARS.split('').forEach(c => adjacentEmptyTerrainCharsSettlementsCount[c] = {});
        const playerSettlements = objectValues(this.settlements).filter(s => s.player_id === id);
        playerSettlements.forEach(s => {
            const sSettlementCoord = `${s.x}-${s.y}`;
            const sSettlementTerrainChar = this.map.getChar(s.x, s.y);
            const gexes = Maps.getAdjacentGexes(s.x, s.y);
            for (let i = 0; i < gexes.length; i++) {
                const gex = gexes[i];
                if (gex.x < 0 || gex.x >= this.map.width || gex.y < 0 || gex.y >= this.map.height) {
                    continue;
                }
                const sAdjCoord = `${gex.x}-${gex.y}`;
                const sAdjTerrainChar = this.map.getChar(gex.x, gex.y);
                if (this.settlements[sAdjCoord] == null) {
                    if (adjacentEmptyTerrainCharsGexes[sAdjTerrainChar][sAdjCoord] == null) {
                        adjacentEmptyTerrainCharsGexes[sAdjTerrainChar][sAdjCoord] = 1;
                    } else {
                        adjacentEmptyTerrainCharsGexes[sAdjTerrainChar][sAdjCoord]++;
                    }
                    if (sSettlementTerrainChar === 'W' && sAdjTerrainChar === 'W') {
                        // fishermen issue
                        continue;
                    }
                    if (adjacentEmptyTerrainCharsSettlementsCount[sAdjTerrainChar][sSettlementCoord] == null) {
                        adjacentEmptyTerrainCharsSettlementsCount[sAdjTerrainChar][sSettlementCoord] = 1;
                    } else {
                        adjacentEmptyTerrainCharsSettlementsCount[sAdjTerrainChar][sSettlementCoord]++;
                    }
                } else if (sSettlementTerrainChar !== 'W' && sAdjTerrainChar === 'W') {
                    // adjacent water gexes
                    if (adjacentEmptyTerrainCharsSettlementsCount[sAdjTerrainChar][sSettlementCoord] == null) {
                        adjacentEmptyTerrainCharsSettlementsCount[sAdjTerrainChar][sSettlementCoord] = 1;
                    } else {
                        adjacentEmptyTerrainCharsSettlementsCount[sAdjTerrainChar][sSettlementCoord]++;
                    }
                }
            }
        });

        stats['adjacentCounts']['Grass'] = objectKeys(adjacentEmptyTerrainCharsGexes['G']).length;
        stats['adjacentCounts']['Canyon'] = objectKeys(adjacentEmptyTerrainCharsGexes['C']).length;
        stats['adjacentCounts']['Desert'] = objectKeys(adjacentEmptyTerrainCharsGexes['D']).length;
        stats['adjacentCounts']['Flower'] = objectKeys(adjacentEmptyTerrainCharsGexes['L']).length;
        stats['adjacentCounts']['Forest'] = objectKeys(adjacentEmptyTerrainCharsGexes['R']).length;
        stats['adjacentCounts']['Water'] = objectKeys(adjacentEmptyTerrainCharsGexes['W']).length;

        stats['objectives']['Fishermen'] = {
            score: objectKeys(adjacentEmptyTerrainCharsSettlementsCount['W']).length
        };
        stats['objectives']['Miners'] = {
            score: objectKeys(adjacentEmptyTerrainCharsSettlementsCount['M']).length
        };
        stats['objectives']['Workers'] = {
            score: objectKeys(adjacentEmptyTerrainCharsSettlementsCount['!']).length
                + objectKeys(adjacentEmptyTerrainCharsSettlementsCount['0']).length
        };
        // stats['adjacentCoords'] = adjacentEmptyTerrainCharsGexes;
    },

    renderAsciiMap: function () {
        for (let x = 0; x < this.map.width; x++) {
            for (let y = 0; y < this.map.height; y++) {
                const char = this.map.getChar(x, y);
                const cellId = `${BGA_CELL_CONTAINER_ID_PREFIX}-${y}-${x}`;
                this.dojo.place(`<span `
                    + `style="font-size: 70%; font-weight: bolder; position: absolute; left: 50%; top: 50%; `
                    + `transform: translate(-50%, -50%); z-index: 10; `
                    + `text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white; `
                    + `">${char}</span>`,
                    cellId,
                    "last");
                this.dojo.place(`<span `
                    + `style="font-size: 40%; font-weight: bolder; position: absolute; left: 50%; top: 75%; `
                    + `transform: translate(-50%, -50%); z-index: 10; `
                    + `text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white; `
                    + `">${x}-${y}</span>`,
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

    processUpdateScores: function (data) {
        console.log("updateScores", JSON.stringify(data));

        // Input check
        if (!data || !data.args || !data.args.scores) {
            return;
        }

        objectKeys(data.args.scores).forEach(sId => {
            let id = parseInt(sId);
            if (this.playersServerStats[id] == null) {
                this.playersServerStats[id] = {};
            }
            this.playersServerStats[id].score = parseInt(data.args.scores[sId]);
        })

        this.renderPlayerUserscriptPanels();
    },

    processObtainTile: function (data) {
        console.log("obtainTile", JSON.stringify(data));

        // Input check
        if (!data || !data.args || !data.args.location_name || !data.args.location
            || !data.args.status || !data.args.player_id || !data.args.id) {
            return;
        }
        const args = data.args;
        const playerId = parseInt(args.player_id);
        this.playersTiles[playerId].push({
            id: parseInt(args.id),
            status: args.status,
            type: this.locationTypesByBgaId[parseInt(args.location)],
            x: parseInt(args.y),
            y: parseInt(args.x)
        });

        this.recalculateTurnsToGameEnd();
        this.renderStatisticsPanel();
    },

    processLoseTile: function (data) {
        console.log("loseTile", JSON.stringify(data));

        // Input check
        if (!data || !data.args || !data.args) {
            // {"i18n":["location_name"],"player_name":"<!--PNS--><span class=\"playername\" style=\"color:#0000ff;\">indvd00m</span><!--PNE-->",
            // "location_name":"Barn","player_id":91988291,"id":"7"}
            return;
        }
        const playerId = parseInt(data.args.player_id);
        const locationId = parseInt(data.args.id);
        const indexToRemove = this.playersTiles[playerId].findIndex(l => l.id === locationId);
        this.playersTiles[playerId].splice(indexToRemove, 1);

        this.recalculateTurnsToGameEnd();
        this.renderStatisticsPanel();
    },

    processBuild: function (data) {
        console.log("build", JSON.stringify(data));

        // Input check
        if (!data || !data.args || !data.args.player_id || data.args.x == null || data.args.y == null) {
            return;
        }
        const x = parseInt(data.args.y);
        const y = parseInt(data.args.x);
        this.settlements[`${x}-${y}`] = {
            player_id: parseInt(data.args.player_id),
            x: x,
            y: y
        };
        this.recalculateAllPlayerStats();
        this.recalculateTurnsToGameEnd();
        this.renderStatisticsPanel();
        this.renderPlayerUserscriptPanels();
    },

    processMove: function (data) {
        console.log("move", JSON.stringify(data));
        // Input check
        if (!data || !data.args || !data.args.player_id || !data.args.from || data.args.x == null || data.args.y == null) {
            return;
        }
        const prevX = parseInt(data.args.from.y);
        const prevY = parseInt(data.args.from.x);
        const newX = parseInt(data.args.y);
        const newY = parseInt(data.args.x);
        delete this.settlements[`${prevX}-${prevY}`];
        this.settlements[`${newX}-${newY}`] = {
            player_id: parseInt(data.args.player_id),
            x: newX,
            y: newY
        };
        this.recalculateAllPlayerStats();
        this.renderPlayerUserscriptPanels();
    },

    processCancel: function (data) {
        console.log("cancel", JSON.stringify(data));
        // Input check
        if (!data || !data.args || !data.args.board || !data.args.fplayers) {
            return;
        }
        this.settlements = {};
        data.args.board.settlements.forEach(s => {
            const x = parseInt(s.y);
            const y = parseInt(s.x);
            this.settlements[`${x}-${y}`] = {
                player_id: parseInt(s.player_id),
                x: x,
                y: y
            };
        })

        this.initTiles(data.args.fplayers);

        this.recalculateAllPlayerStats();
        this.recalculateTurnsToGameEnd();
        this.renderStatisticsPanel();
        this.renderPlayerUserscriptPanels();
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
                let terrainName = this.terrains.find(t => args.terrainName.toLowerCase().includes(t.toLowerCase()));
                if (terrainName == null) {
                    // unfortunetally we do not have language independent terrain name in actions history
                    const index = this.terrainsRu.findIndex(t => args.terrainName.toLowerCase().includes(t.toLowerCase()));
                    if (index !== -1) {
                        terrainName = this.terrains[index];
                    }
                }
                if (terrainName != null) {
                    terrainDetected = true;
                    terrainsCount++;
                    console.log(`detected ${terrainsCount} terrain: ${terrainName}`);
                    openedTerrains.push(terrainName);
                } else {
                    console.log(`can not detect terrain: ${args.terrainName}`);
                }
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
                        // we do not have some language independent location name!
                        case 'Гавань':
                        case 'Загон':
                        case 'Сарай':
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
            this.dojo.place("<span id='" + (USERSCRIPT_PLAYER_SCORE_ID_PREFIX + id) + "'>?</span>",
                BGA_PLAYER_SCORE_ID_PREFIX + id,
                "after");
            this.dojo.place("<span id='" + (USERSCRIPT_PLAYER_SETTLEMENTS_ID_PREFIX + id) + "'> ?</span>",
                `${BGA_PLAYER_SETTLEMENTS_ID_PREFIX}${id}`,
                "last");
        })
    },

    renderStatisticsPanel: function () {
        var html = "<div class='" + STATISTICS_PANEL_CLASS + "'>";
        if (this.showTextStack) {
            html += `Found ${this.logIsFull ? 'full' : 'incomplete'} log with ${this.turnsCount} turns `;
            html += `and ${this.terrainsPlayedCount} played terrain cards.`;
            if (this.showTextTerrainStat) {
                this.terrains.slice()
                    .sort((t1, t2) => this.terrainsPlayed[t1] - this.terrainsPlayed[t2])
                    .forEach(terrain => {
                        const probability = (Math.round(this.terrainsProbability[terrain] * 100 * 100) / 100).toFixed(0)
                        html += "<div>"
                            + `${terrain} played ${this.terrainsPlayed[terrain]} times, probability: ${probability}%`
                            + "</div>";
                    })
            } else {
                html += ` Stack now contains${this.logIsFull ? '' : ' no more than'} cards: `;
            }
        }

        html += `<div style="width: 100%; height: 80px; margin: 2.5px; position: relative;">`;
        for (let i = 0; i < this.terrains.length; i++) {
            const terrain = this.terrains[i];
            const remainsCount = 5 - this.terrainsPlayed[terrain];
            const probability = (Math.round(this.terrainsProbability[terrain] * 100 * 100) / 100).toFixed(0)
            html += `<div style="position: absolute; left: ${20 * i + 10}%; top: 0%; width: 20%; height: 100%; `;
            html += `transform: translate(-50%, 0%); max-height: 80px; max-width: 46px;`;
            html += `background-image: url(${this.terrainsImage}); background-repeat: no-repeat; background-size: 600%; `;
            html += `background-position: ${(i + 1) * 20}%;`;
            if (remainsCount <= 0) {
                html += `filter: grayscale(100%);`;
            }
            html += `">`;
            html += `<span style="font-size: 200%; font-weight: bolder; position: absolute; left: 50%; top: 50%; `;
            html += `transform: translate(-50%, -50%); text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
            if (!this.logIsFull) {
                html += `color: gray;`;
            }
            html += `">${remainsCount}${this.logIsFull ? '' : '-'}</span>`;
            html += `<span style="font-size: 80%; position: absolute; left: 50%; top: 25%; `;
            html += `transform: translate(-50%, -50%); text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
            html += `">${probability}%</span>`;
            html += `</div>`;
        }
        html += `</div>`;

        html += `<div style="width: 100%; height: 80px; margin: 2.5px; position: relative;">`;
        const discardSize = this.terrainsPlayedCount;
        const stackSize = this.terrainsStackSize - this.terrainsPlayedCount;
        // stack
        html += `<div style="position: absolute; left: 25%; top: 0%; width: 20%; height: 100%; `;
        html += `transform: translate(-50%, 0%); max-height: 80px; max-width: 46px;`;
        html += `background-image: url(${this.terrainsImage}); background-repeat: no-repeat; background-size: 600%; `;
        html += `background-position: 0%;`;
        if (stackSize <= 0) {
            html += `filter: grayscale(100%);`;
        }
        html += `">`;
        html += `<span style="font-size: 200%; font-weight: bolder; position: absolute; left: 50%; top: 50%; `;
        html += `transform: translate(-50%, -50%); text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
        if (!this.logIsFull) {
            html += `color: gray;`;
        }
        html += `">${stackSize}${this.logIsFull ? '' : '-'}</span>`;
        html += `</div>`;
        // discard
        html += `<div style="position: absolute; left: 50%; top: 0%; width: 20%; height: 100%; `;
        html += `transform: translate(-50%, 0%); max-height: 80px; max-width: 46px;`;
        html += `background-image: url(${this.terrainsImage}); background-repeat: no-repeat; background-size: 600%; `;
        html += `background-position: 0%;`;
        html += `filter: grayscale(100%);`;
        html += `">`;
        html += `<span style="font-size: 200%; font-weight: bolder; position: absolute; left: 50%; top: 50%; `;
        html += `transform: translate(-50%, -50%); text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
        if (!this.logIsFull) {
            html += `color: gray;`;
        }
        html += `">${discardSize}${this.logIsFull ? '' : '+'}</span>`;
        html += `</div>`;
        // round
        html += `<div style="position: absolute; left: 75%; top: 0%; width: 20%; height: 100%; `;
        html += `transform: translate(-50%, 0%); max-height: 80px; max-width: 46px;`;
        html += `">`;
        html += `<span style="font-size: 350%; font-weight: bolder; position: absolute; left: 50%; top: 50%; `;
        html += `transform: translate(-50%, -50%); text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
        if (this.turnsToGameEnd <= 1) {
            html += `color: red;`;
        } else if (this.turnsToGameEnd <= 3) {
            html += `color: #CC6600;`;
        } else {
            html += `color: blue;`;
        }
        html += `">${this.turnsToGameEnd}</span>`;
        html += `</div>`;
        html += `</div>`;

        this.dojo.place(html, STATISTICS_PANEL_ID, "only");
    },

    renderPlayerUserscriptPanels: function () {
        this.game.fplayers.forEach(p => {
            const id = parseInt(p.id);
            const stats = this.playersStats[id];

            let html = '';

            if (this.showTextPlayerStat) {
                html += "<div>";
                html += `Stats for user ${id}: ${JSON.stringify(stats, null, 2)}`;
                html += `</div>`;
            }

            // objectives
            html += `<div style="width: 100%; height: 54px; margin: 2.5px; position: relative;">`;
            const objectiveKeys = objectKeys(stats.objectives);
            for (let i = 0; i < objectiveKeys.length; i++) {
                const objectiveName = objectiveKeys[i];
                const objectiveStats = stats.objectives[objectiveName];
                const bgaId = parseInt(objectKeys(this.objectivesIdToName)
                    .find(k => this.objectivesIdToName[k] === objectiveName));
                const score = objectiveStats.score;
                const widthPercent = 100 / objectiveKeys.length;
                const positionX = (bgaId % 7) * (100 / 6);
                const positionY = bgaId < 7 ? 0 : 100;
                html += `<div style="position: absolute; left: ${widthPercent * i + widthPercent * 0.5}%; top: 0%; width: ${widthPercent}%; height: 100%; `;
                html += `transform: translate(-50%, 0%); max-width: 55px; max-height: 49px; `;
                html += `background-image: url(${this.objectivesImage}); background-repeat: no-repeat; background-size: 700% 200%; `;
                html += `background-position: ${positionX}% ${positionY}%; opacity: 80%;`;
                html += `border: 0.5px solid black; border-radius: 5px; `;
                if (score <= 0) {
                    html += `filter: grayscale(100%);`;
                }
                html += `">`;
                html += `<span style="font-size: 130%; font-weight: bolder; position: absolute; right: 1%; bottom: 1%; `;
                html += `text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
                html += `">${score}</span>`;
                let info1 = '';
                let info2 = '';
                if (objectiveName === 'Farmers') {
                    info1 = JSON.stringify(objectiveStats.areaSettlements);
                } else if (objectiveName === 'Lords') {
                    info1 = JSON.stringify(objectiveStats.areaSettlements);
                    info2 = JSON.stringify(objectiveStats.areaScores);
                } else if (objectiveName === 'Citizens') {
                    info1 = JSON.stringify(objectiveStats.settlements);
                } else if (objectiveName === 'Castles') {
                    info1 = JSON.stringify(objectiveStats.castlesCount);
                } else if (objectiveName === 'Knights') {
                    info1 = JSON.stringify(objectiveStats.maxLineSettlementsCount);
                }
                if (info1) {
                    html += `<span style="font-size: 90%; position: absolute; right: 1%; top: 1%; `;
                    html += `text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white; `;
                    html += `">${info1}</span>`;
                }
                if (info2) {
                    html += `<span style="font-size: 90%; position: absolute; right: 1%; top: 25%; `;
                    html += `text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white; `;
                    html += `">${info2}</span>`;
                }
                html += `</div>`;
            }
            html += `</div>`;

            // jumping
            html += `<div style="width: 100%; height: 60px; margin: 2.5px; position: relative;">`;
            for (let i = 0; i < this.terrains.length; i++) {
                const terrain = this.terrains[i];
                const adjacentCount = stats.adjacentCounts[terrain];
                html += `<div style="position: absolute; left: ${20 * i + 20 * 0.5}%; top: 0%; width: ${20 * 0.75}%; height: 100%; `;
                html += `transform: translate(-50%, 0%); max-height: 60px; max-width: 35px;`;
                html += `background-image: url(${this.terrainsImage}); background-repeat: no-repeat; background-size: 600%; `;
                html += `background-position: ${(i + 1) * 20}%;`;
                if (adjacentCount > 0) {
                    html += `filter: grayscale(100%);`;
                }
                html += `">`;
                html += `<span style="font-size: 130%; font-weight: bolder; position: absolute; left: 50%; top: 50%; `;
                html += `transform: translate(-50%, -50%); text-shadow: 1px 1px 2px white, 0 0 1em white, 0 0 0.2em white;`;
                html += `">${adjacentCount}${adjacentCount > 0 ? '+' : ''}</span>`;
                html += `</div>`;
            }
            html += `</div>`;

            html += `</div>`;
            this.dojo.place(html, USERSCRIPT_PLAYER_BOARD_ID_PREFIX + id, "only");

            // score
            const serverScore = this.playersServerStats[id].score;
            const diff = stats.score - serverScore;
            if (diff !== 0) {
                this.dojo.place(
                    `<span style="color: ${diff > 0 ? 'green' : 'red'};"> ${diff > 0 ? '+' : '-'}${diff}</span>`
                    , USERSCRIPT_PLAYER_SCORE_ID_PREFIX + id, "only");
            } else {
                this.dojo.place('<span></span>', USERSCRIPT_PLAYER_SCORE_ID_PREFIX + id, "only");
            }

            // production
            this.dojo.place(
                `<span style="color: red;">&nbsp;-${stats.maxProduction}</span>`
                , USERSCRIPT_PLAYER_SETTLEMENTS_ID_PREFIX + id, "only");

            // fix bug with disappeared player settlements counter on ios
            this.dojo.replaceClass(`${BGA_PLAYER_SETTLEMENTS_ID_PREFIX}${id}`, 'player-settlements', 'hex-grid-content');
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
