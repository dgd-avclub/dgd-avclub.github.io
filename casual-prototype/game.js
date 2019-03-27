// game.js for Perlenspiel 3.3.x
// The following comment lines are for JSHint. Don't remove them!

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */


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

    const laserTime = 30;

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
            data: [
                [ CLR, CLR, BBL, RBL, CLR, CLR ],

                [ CLR, CLR, CLR, CLR, CLR, CLR ],

                [ CLR, CLR, CLR, CLR, CLR, CLR ],

                [ CLR, CLR, CLR, CLR, CLR, CLR ],

                [ CLR, CLR, CLR, CLR, CLR, CLR ],

                [ GER, CLR, RMU, BMU, CLR, GEL ]
            ]
        }
    ];

    let time = 0;
    let timeSinceLoad = 0;
    let timeSinceMove = 0;
    let selected = null;
    const scene = {
        size: null,
        level: -1,
        grid: [],
        lasers: []
    };

    class GridObject {
        constructor(pos) {
            this.pos = pos;
            this.hasGravity = true;
            this.destroyed = false;
        }

        draw() { }
        tick() { }
        onHit(by) { }
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
        }

        emit() {
            if (this.child && !this.child.destroyed) return;

            const next = this.pos.plus(this.dir);
            if (inBounds(next)) {
                const obj = getData(scene.grid, next);

                if (obj === null) {
                    this.child = new Laser(next, this.dir, this.color);
                    setData(scene.grid, next, this.child);
                } else {
                    obj.onHit(this);
                }
            }
        }

        onDestroy() {
            if (this.child) this.child.destroy();
            this.child = null;
        }

        onMove() {
            if (this.child) this.child.destroy();
            this.child = null;
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
                PS.border(x, y, { left : 10, right: 10, top: 30, bottom: 30 });
            } else {
                PS.border(x, y, { left : 30, right: 30, top: 10, bottom: 10 });
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
                this.hitTime = time;
            }
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
        }

        draw() {
            let x = this.pos.x;
            let y = this.pos.y;

            PS.alpha(x, y, 255);
            PS.scale(x, y, 90);
            PS.color(x, y, colors[this.color]);
            PS.radius(x, y, 15);

            // Set border so that selection will appear.
            PS.border(x, y, 5);
            PS.borderAlpha(x, y, 255);
            PS.borderColor(x, y, colors[this.color]);
        }

        onHit(by) {
            if (by.color === this.color) {
                this.destroy();
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

    function loadObject(layout, pos) {
        const index = getData(layout, pos);

        if (index === CLR) {
            return null;
        } else if (index <= BBL) {
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

    function load(level) {
        let lvl = levels[level];

        scene.level = level;
        scene.size = lvl.size;
        scene.grid = [];
        timeSinceLoad = 0;
        timeSinceMove = 0;

        for (let y = 0; y < scene.size.y; y++) {
            scene.grid.push([]);
            let row = scene.grid[y];

            for (let x = 0; x < scene.size.x; x++) {
                row.push(loadObject(lvl.data, new Vector(x, y)));
            }
        }
    }

    function clear() {
        PS.gridSize(scene.size.x, scene.size.y);

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
    }

    function tick() {
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
    }

    function swap(pos1, pos2) {
        let d1 = getData(scene.grid, pos1);
        let d2 = getData(scene.grid, pos2);

        if (d1 && d2 && d1.swappable() && d2.swappable()) {
            d1.move(pos2);
            d2.move(pos1);
            timeSinceMove = 0;
        }
    }

    return {
        init: function () {
            load(0);

            draw();
            PS.timerStart(1, tick);
        },

        touch: function (x, y) {
            const vec = new Vector(x, y);
            const obj = getData(scene.grid, vec);
            if (obj && obj.swappable()) {
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
        },

        shutdown: function (options) {

        }
    };
}()); // end of IIFE

PS.init = G.init;
PS.touch = G.touch;
PS.shutdown = G.shutdown;
