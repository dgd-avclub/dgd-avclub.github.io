// game.js for Perlenspiel 3.3.x
// The following comment lines are for JSHint. Don't remove them!

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

/*

Sound credits:
Impact - https://freesound.org/people/nabz871/sounds/315723/

 */


const G = (function () {
    "use strict";

    class Vector {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        equals(v) {
            return this.x === v.x && this.y === v.y;
        }

        plus(v) {
            return new Vector(this.x + v.x, this.y + v.y);
        }

        minus(v) {
            return new Vector(this.x - v.x, this.y - v.y);
        }
    }

    const RIGHT = new Vector(1, 0);
    const UP = new Vector(0, -1);
    const LEFT = new Vector(-1, 0);
    const DOWN = new Vector(0, 1);

    const dirs = [ RIGHT, UP, LEFT, DOWN ];
    const colors = [ PS.COLOR_RED, PS.COLOR_GREEN, PS.COLOR_BLUE ];
    const selectionColor = PS.COLOR_YELLOW;
    const mirrorArrows = [ '⮞', '⮝', '⮜', '⮟' ];
    const emitterArrows = [ '⇢', '⇡', '⇠', '⇣'  ];

    const impactSound = "impact";
    const clickSound = "fx_click";
    const laserSound = "fx_shoot6";
    const mirrorSound = "fx_powerup2";
    const winSound = "fx_ding";

    const audioPath = "sounds/";

    const laserTime = 30;
    const fadeTime = 15;
    const levelAdvanceTime = 60;

    const db = "opalescence";

    let id = 0;

    // MAP DATA
    const CLR = id++; // Clear

    const RBL = id++; // Red block
    const GBL = id++; // Green block
    const BBL = id++; // Blue block

    const RER = id++; // Red emitter (right)
    const REU = id++; // Red emitter (up)
    const REL = id++; // Red emitter (left)
    const RED = id++; // Red emitter (down)

    const GER = id++; // Green emitter (right)
    const GEU = id++; // Green emitter (up)
    const GEL = id++; // Green emitter (left)
    const GED = id++; // Green emitter (down)

    const BER = id++; // Blue emitter (right)
    const BEU = id++; // Blue emitter (up)
    const BEL = id++; // Blue emitter (left)
    const BED = id++; // Blue emitter (down)

    const RMR = id++; // Red mirror (right)
    const RMU = id++; // Red mirror (up)
    const RML = id++; // Red mirror (left)
    const RMD = id++; // Red mirror (down)

    const GMR = id++; // Green mirror (right)
    const GMU = id++; // Green mirror (up)
    const GML = id++; // Green mirror (left)
    const GMD = id++; // Green mirror (down)

    const BMR = id++; // Blue mirror (right)
    const BMU = id++; // Blue mirror (up)
    const BML = id++; // Blue mirror (left)
    const BMD = id++; // Blue mirror (down)

    const BOM = id++; // Bomb
    const DOG = id++; // Dog
    const SPL = id++; // Splitter

    // END MAP DATA

    const levels = [
        {
            size: new Vector(6, 6),
            statusText: "Destroy blocks with lasers to win.",
            data: [
                [ CLR, CLR, CLR, GBL, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ GER, CLR, CLR, CLR, CLR, CLR ]
            ]
        },
        {
            size: new Vector(6, 6),
            statusText: "Click two adjacent blocks to swap them.",
            data: [
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, BBL, BER, CLR, CLR ]
            ]
        },
        {
            size: new Vector(6, 6),
            statusText: "Mirrors can redirect a laser.",
            data: [
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ RMU, CLR, CLR, CLR, REU, CLR ],
                [ RBL, CLR, CLR, CLR, RML, CLR ]
            ]
        },
        {
            size: new Vector(6, 6),
            statusText: "Blocks must be hit by the correct color.",
            data: [
                [ CLR, CLR, BBL, RBL, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, REU, BEU, CLR, CLR ]
            ]
        },
        {
            size: new Vector(6, 6),
            statusText: "Mirrors can change the color of light.",
            data: [
                [ CLR, CLR, BBL, RBL, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ GER, CLR, RMU, BMU, CLR, GEL ]
            ]
        },
        {
            size: new Vector(6, 6),
            statusText: "",
            data: [
                [ CLR, CLR, GBL, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, RMU, RBL, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, BBL, BMU, CLR, CLR ],
                [ GER, CLR, CLR, CLR, CLR, CLR ]
            ]
        },
        {
            size: new Vector(6, 6),
            statusText: "",
            data: [
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, CLR, CLR, CLR, CLR, CLR ],
                [ CLR, BBL, CLR, GBL, CLR, CLR ],
                [ CLR, GMU, GBL, BML, CLR, CLR ],
                [ CLR, GML, BBL, BMU, CLR, BEL ]
            ]
        }
    ];

    const startLevel = 0;

    let time = 0;
    let timeSinceLoad = 0;
    let timeSinceMove = 0;
    let winTime = -1;
    let selected = null;
    let moves = 0;
    const scene = {
        size: null,
        level: -1,
        grid: [],
        lasers: [],
        blockCount: 0
    };

    let buttons = {};

    class GridObject {
        constructor(pos) {
            this.pos = pos;
            this.hasGravity = true;
            this.destroyed = false;
        }

        draw() { }
        tick() { }
        onHit(by) { }
        onHitEnd(by) { }
        onMove() { }
        onDestroy() { }
        swappable() { return true; }

        destroy() {
            if (!this.destroyed) {
                this.destroyed = true;
                setData(scene.grid, this.pos, null);
                this.onDestroy();
            }
        }

        move(to) {
            if (getData(scene.grid, this.pos) === this) {
                setData(scene.grid, this.pos, null);
            }

            this.pos = to;
            setData(scene.grid, this.pos, this);
            this.onMove();
        }

        doGravity() {
            const below = this.pos.plus(DOWN);
            if (inBounds(below)) {
                let objBelow = getData(scene.grid, below);
                if (objBelow instanceof Laser) {
                    objBelow.destroy();
                    objBelow = null;
                }

                if (objBelow === null) {
                    this.move(below);
                }
            }
        }
    }

    class LaserObject extends GridObject {
        constructor(pos, dir, color) {
            super(pos);
            this.dir = dir;
            this.color = color;
            this.child = null;
            this.hitting = null;
        }

        emit() {
            if (this.child && !this.child.destroyed) return;

            const next = this.pos.plus(this.dir);
            if (inBounds(next)) {
                const obj = getData(scene.grid, next);
                if (obj === this) return;

                if (obj === null) {
                    this.child = new Laser(next, this.dir, this.color);
                    PS.audioPlay(laserSound, { volume: 0.1 });
                    setData(scene.grid, next, this.child);
                } else {
                    obj.onHit(this);
                    this.hitting = obj;
                }
            }
        }

        onDestroy() {
            this.onMove();
        }

        onMove() {
            if (this.child) this.child.destroy();
            this.child = null;
            if (this.hitting) this.hitting.onHitEnd(this);
            this.hitting = null;
        }
    }

    class Laser extends LaserObject {
        constructor(pos, dir, color) {
            super(pos, dir, color);
            this.creationTime = time;
            this.hasGravity = false;
        }

        draw() {
            let x = this.pos.x;
            let y = this.pos.y;

            PS.borderAlpha(x, y, 255);
            if (this.dir.x !== 0) {
                PS.border(x, y, { left : 0, right: 0, top: 40, bottom: 40 });
            } else {
                PS.border(x, y, { left : 40, right: 40, top: 0, bottom: 0 });
            }

            PS.borderColor(x, y, PS.COLOR_BLACK);

            PS.color(x, y, colors[this.color]);
            PS.alpha(x, y, 255);
        }

        tick() {
            if (time - this.creationTime > laserTime) {
                this.emit();
            }
        }

        swappable() { return false; }
    }

    class Emitter extends LaserObject {
        constructor(pos, dir, color) {
            super(pos, dir, color);
        }

        draw() {
            let x = this.pos.x;
            let y = this.pos.y;

            PS.borderAlpha(x, y, 255);
            if (this.dir.x !== 0) {
                PS.border(x, y, { left : 10, right: 10, top: 25, bottom: 25 });
            } else {
                PS.border(x, y, { left : 25, right: 25, top: 10, bottom: 10 });
            }

            PS.borderColor(x, y, PS.COLOR_BLACK);

            PS.color(x, y, colors[this.color]);
            PS.alpha(x, y, 255);
            PS.glyph(x, y, emitterArrows[toDir(this.dir)]);
            PS.glyphColor(x, y, PS.COLOR_WHITE);
        }

        tick() {
            if (time > laserTime) {
                this.emit();
            }
        }
    }

    class Mirror extends LaserObject {
        constructor(pos, dir, color) {
            super(pos, dir, color);
            this.hitTime = -1;
        }

        draw() {
            let x = this.pos.x;
            let y = this.pos.y;

            PS.borderAlpha(x, y, 255);
            PS.border(x, y, 5);
            PS.scale(x, y, 90);
            PS.borderColor(x, y, colors[this.color]);
            PS.glyph(x, y, mirrorArrows[toDir(this.dir)]);
            if (this.hitTime < 0) {
                PS.glyphColor(x, y, PS.COLOR_WHITE);
            } else {
                PS.glyphColor(x, y, colors[this.color]);
            }
        }

        tick() {
            if (this.hitTime > 0 && time - this.hitTime > laserTime) {
                this.emit();
            }
        }

        onHit(by) {
            if (this.hitTime < 0) {
                PS.audioPlay(mirrorSound);
                this.hitTime = time;
            }
        }

        onHitEnd(by) {
            this.onMove();
        }

        onMove() {
            super.onMove();
            this.hitTime = -1;
        }
    }

    class Block extends GridObject {
        constructor(pos, color) {
            super(pos);
            this.color = color;
            this.fadeStart = -1;
        }

        swappable() {
            return this.fadeStart < 0;
        }

        draw() {
            let x = this.pos.x;
            let y = this.pos.y;

            if (this.fadeStart < 0) {
                PS.alpha(x, y, 255);
                PS.scale(x, y, 90);
                PS.color(x, y, colors[this.color]);
                PS.radius(x, y, 15);

                // Set border so that selection will appear.
                PS.border(x, y, 5);
                PS.borderAlpha(x, y, 255);
                PS.borderColor(x, y, colors[this.color]);
            } else {
                PS.alpha(x, y, 255 * 2 * (1 - (time - this.fadeStart) / fadeTime));
                PS.scale(x, y, 90);
                PS.color(x, y, PS.COLOR_WHITE);
            }
        }

        tick() {
            super.tick();
            if (this.fadeStart > 0 && time - this.fadeStart > fadeTime) {
                this.destroy();
            }
        }

        onHit(by) {
            if (by.color === this.color && this.fadeStart < 0) {
                this.fadeStart = time;
                this.hasGravity = false;
                PS.audioPlay(impactSound, { path: audioPath });
            }
        }

        onDestroy() {
            super.onDestroy();
            scene.blockCount--;
            if (scene.blockCount <= 0) {
                winTime = time;
                PS.audioPlay(winSound);
                dbEvent("win");
            }
        }
    }

    function toDir(vec) {
        for (let i = 0; i < dirs.length; i++) {
            if (dirs[i].equals(vec)) {
                return i;
            }
        }
        return -1;
    }

    function getData(layout, pos) {
        return layout[pos.y][pos.x];
    }

    function setData(layout, pos, value) {
        layout[pos.y][pos.x] = value;
    }

    function inBounds(pos) {
        return pos.x >= 0 && pos.x < scene.size.x && pos.y >= 0 && pos.y < scene.size.y;
    }

    function isClear(pos) {
        return getData(scene.grid, pos) === null;
    }

    function dbEvent(type) {
        PS.dbEvent(db, "type", type, "level", scene.level, "moves", moves, "ticksSinceLoad", timeSinceLoad);
    }

    function loadObject(layout, pos) {
        const index = getData(layout, pos);

        if (index === CLR) {
            return null;
        } else if (index <= BBL) {
            scene.blockCount++;
            return new Block(pos, index - RBL);
        } else if (index <= BMD) {
            const i = index - RER;
            const dir = i % 4;
            const color = Math.floor((i % 12) / 4);
            if (index <= BED) {
                return new Emitter(pos, dirs[dir], color);
            } else {
                return new Mirror(pos, dirs[dir], color);
            }
        } else {
            return null; // Other object types implemented later.
        }
    }

    function loadLevel(level) {
        let lvl = levels[level];

        scene.level = level;
        scene.size = lvl.size;
        scene.grid = [];
        scene.blockCount = 0;
        timeSinceLoad = 0;
        timeSinceMove = 0;
        winTime = -1;
        moves = 0;

        PS.statusText(lvl.statusText);

        for (let y = 0; y < scene.size.y; y++) {
            scene.grid.push([]);
            let row = scene.grid[y];

            for (let x = 0; x < scene.size.x; x++) {
                row.push(loadObject(lvl.data, new Vector(x, y)));
            }
        }

        draw();
    }

    function clearLevel() {
        for (let x = 0; x < scene.size.x; x++) {
            for (let y = 0; y < scene.size.y; y++) {
                setData(scene.grid, new Vector(x, y), null);
            }
        }
    }

    function loadSounds() {
        PS.audioLoad(impactSound, { path: audioPath });
        PS.audioLoad(clickSound);
        PS.audioLoad(laserSound);
        PS.audioLoad(mirrorSound);
        PS.audioLoad(winSound);
    }

    function clear() {
        PS.gridSize(scene.size.x, scene.size.y + 1);

        PS.bgAlpha(PS.ALL, PS.ALL, 255);
        PS.bgColor(PS.ALL, PS.ALL, PS.COLOR_BLACK);
        PS.alpha(PS.ALL, PS.ALL, 0);
        PS.border(PS.ALL, PS.ALL, 0);
    }

    function draw() {
        clear();
        for (let x = 0; x < scene.size.x; x++) {
            for (let y = 0; y < scene.size.y; y++) {
                let obj = getData(scene.grid, new Vector(x, y));
                if (obj !== null) {
                    obj.draw();
                }
            }
        }

        if (selected) {
            PS.borderColor(selected.x, selected.y, selectionColor);
        }

        drawHud();
    }

    function drawHud() {
        const y = scene.size.y;
        PS.bgColor(PS.ALL, y, PS.COLOR_WHITE);
        PS.bgAlpha(PS.ALL, y, 255);
        PS.color(PS.ALL, y, PS.COLOR_WHITE);
        PS.alpha(PS.ALL, y, 255);

        buttons = {};
        if (scene.level > 0) {
            drawButton(scene.size.x - 3, '⇤', function () {
                dbEvent("back");
                loadLevel(scene.level - 1);
            });
        }

        if (scene.level < levels.length - 1) {
            drawButton(scene.size.x - 2, '⇥', function () {
                dbEvent("skip");
                loadLevel(scene.level + 1);
            });
        }

        drawButton(scene.size.x - 1, '↺', function () {
            dbEvent("reset");
            loadLevel(scene.level);
        });
    }

    function drawButton(x, glyph, callback) {
        const y = scene.size.y;

        PS.color(x, y, 0xCCCCCC);
        PS.scale(x, y, 90);
        PS.alpha(x, y, 255);
        PS.border(x, y, 2);
        PS.borderColor(x, y, PS.COLOR_BLACK);
        PS.borderAlpha(x, y, 255);
        PS.glyph(x, y, glyph);
        PS.glyphColor(x, y, PS.COLOR_BLUE);

        buttons[x] = callback;
    }

    function tick() {
        if (selected != null) {
            const sel = getData(scene.grid, selected);
            if (sel == null || !sel.swappable()) {
                selected = null;
            }
        }

        for (let x = 0; x < scene.size.x; x++) {
            for (let y = 0; y < scene.size.y; y++) {
                let obj = getData(scene.grid, new Vector(x, y));
                if (obj !== null) {
                    obj.tick();
                }
            }
        }

        if (timeSinceMove > 0 && timeSinceMove % laserTime === 0) {
            for (let x = 0; x < scene.size.x; x++) {
                for (let y = scene.size.y - 1; y >= 0; y--) {
                    let obj = getData(scene.grid, new Vector(x, y));
                    if (obj !== null && obj.hasGravity) {
                        obj.doGravity();
                    }
                }
            }
        }

        draw();

        time++;
        timeSinceLoad++;
        timeSinceMove++;

        if (winTime > 0 && time - winTime > levelAdvanceTime) {
            if (scene.level < levels.length - 1) {
                loadLevel(scene.level + 1);
            } else {
                clearLevel();
                PS.statusText("Congrats! You beat all the levels.");
            }
        }
    }

    function swap(pos1, pos2) {
        let d1 = getData(scene.grid, pos1);
        let d2 = getData(scene.grid, pos2);

        if (d1 && d2 && d1.swappable() && d2.swappable()) {
            d1.move(pos2);
            d2.move(pos1);
            timeSinceMove = 0;
            moves++;
        }
    }

    function hudTouch(x) {
        let btn = buttons[x];
        if (btn) btn();
    }

    function onLogin(id, name) {
        draw();
        PS.timerStart(1, tick);
    }

    return {
        init: function () {
            loadLevel(startLevel);
            clear();
            loadSounds();
            PS.dbInit(db, { login : onLogin });
        },

        touch: function (x, y) {
            if (y >= scene.size.y) {
                hudTouch(x);
            } else {
                const vec = new Vector(x, y);
                const obj = getData(scene.grid, vec);
                if (obj && obj.swappable()) {
                    PS.audioPlay(clickSound);
                    if (selected == null) {
                        selected = vec;
                    } else if (vec.equals(selected)) {
                        selected = null;
                    } else {
                        const off = selected.minus(vec);
                        if (Math.abs(off.x) + Math.abs(off.y) === 1) {
                            swap(selected, vec);
                            selected = null;
                        }
                    }

                    draw();
                }
            }
        },

        shutdown: function (options) {
            PS.dbSend(db, "vcmiller");
            PS.dbErase(db);
        }
    };
}()); // end of IIFE

PS.init = G.init;
PS.touch = G.touch;
PS.shutdown = G.shutdown;
