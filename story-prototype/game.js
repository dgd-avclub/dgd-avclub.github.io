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

        times(f) {
            return new Vector(this.x * f, this.y * f);
        }
    }

    class Color {
        constructor(r, g, b) {
            this.r = Math.min(Math.max(r, 0), 1);
            this.g = Math.min(Math.max(g, 0), 1);
            this.b = Math.min(Math.max(b, 0), 1);
        }

        static fromRGB(rgb) {
            let c = new Color(0, 0, 0);
            PS.unmakeRGB(rgb, c);

            c.r /= 255;
            c.g /= 255;
            c.b /= 255;

            return c;
        }

        static random() {
            return new Color(Math.random(), Math.random(), Math.random());
        }

        toRGB() {
            return PS.makeRGB(this.r * 255, this.g * 255, this.b * 255);
        }

        plus(other){
            return new Color(this.r + other.r, this.g + other.g, this.b + other.b);
        }

        times(other) {
            if (typeof this === typeof other) {
                return new Color(this.r * other.r, this.g * other.g, this.b * other.b);
            } else {
                return new Color(this.r * other, this.g * other, this.b * other);
            }
        }

        static lerp(a, b, f) {
            const nf = 1 - f;
            return new Color(a.r * nf + b.r * f, a.g * nf + b.g * f, a.b * nf + b.b * f);
        }
    }

    const RIGHT = new Vector(1, 0);
    const UP = new Vector(0, -1);
    const LEFT = new Vector(-1, 0);
    const DOWN = new Vector(0, 1);

    const dirs = [ RIGHT, UP, LEFT, DOWN ];

    const db = "moon";
    const useDB = false;

    const screenSize = new Vector(32, 32);
    const scrollSpeed = 15;

    const groundColor = new Color(0, 0.1, 0);
    const groundVariance = 0.02;

    const waterColor = new Color(0, 0, 0.1);
    const waterVariance = 0.02;
    const waterPeriod = 20;
    const waterPeriodVariance = 10;
    const waterVarianceColor = waterColor.plus(new Color(waterVariance, waterVariance, waterVariance))
    const waterFlowSpeed = 5;

    const moonColor = PS.COLOR_WHITE;

    const playerImageFile = "images/player.png";
    const playerMoveDelay = 1;

    const flowerImageFile = "images/flower.png";
    let flowerImage = null;
    const flowerRate = 90;
    const flowerSpeed = 2;
    const flowerCount = 5;
    const flowerDelayPer = 10;
    const flowerDelayStart = 20;

    let keysHeld = {};

    let id = 0;

    // END MAP DATA

    let playerImage = null;

    let time = 0;
    let timeSinceLoad = 0;

    const scene = {
        objects: [],
        view: new Vector(0, 0),
    };

    class Level {
        constructor(imageFile){
            this.imageFile = imageFile;
            this.image = null;
            this.waterMap = null;
        }

        load(image){
            scene.view.y = image.height - screenSize.y;
            this.image = image;
            this.waterMap = [];

            for (let x = 0; x < image.width; x++) {
                let col = [];

                for (let y = 0; y < image.height; y++) {
                    let c = image.data[y * image.width + x];
                    if (c === PS.COLOR_GREEN) {
                        c = groundColor.plus(Color.random().times(groundVariance)).toRGB();
                        this.image.data[y * image.width + x] = c;
                    }

                    col.push({
                        phase: Math.random() * 3.1415,
                        period: Math.random() * waterPeriodVariance + waterPeriod,
                        alpha: 0
                    });
                }

                this.waterMap.push(col);
            }
        }

        isWater(pos) {
            if (pos.x < 0 || pos.y < 0 || pos.x >= this.image.width || pos.y >= this.image.height) {
                return false;
            }
            return this.image.data[pos.y * this.image.width + pos.x] === PS.COLOR_BLUE;
        }

        tick() {
            if (this.waterMap) {
                for (let x = 0; x < this.image.width; x++) {
                    for (let y = 0; y < this.image.height; y++) {
                        let w = this.waterMap[x][y];
                        if (w) {
                            w.alpha = Math.sin(time / w.period + w.phase) * 0.5 + 0.5;
                        }
                    }
                }
            }

            if (time % scrollSpeed === 0) {
                scene.view.y--;
            }
        }

        draw() {
            if (this.image) {
                PS.imageBlit(this.image, -scene.view.x, -scene.view.y);
                for (let x = 0; x < this.image.width; x++) {
                    for (let y = 0; y < this.image.height; y++) {
                        let sx = x - scene.view.x;
                        let sy = y - scene.view.y;
                        if (inBounds(new Vector(sx, sy)) && this.isWater(new Vector(x, y))) {
                            let fy = y + Math.floor(time / waterFlowSpeed);
                            fy = ((fy % this.image.height) + this.image.height) % this.image.height;
                            let w = this.waterMap[x][fy];
                            let c = Color.lerp(waterColor, waterVarianceColor, w.alpha);
                            PS.color(sx, sy, c.toRGB());
                        }
                    }
                }
            }
        }
    }

    const levels = [
        new Level("images/levels/level1.bmp")
    ];

    class SceneObject {
        constructor(pos, size) {
            this.pos = pos;
            this.size = size;
            this.destroyed = false;
            this.solid = false;
            this.collides = false;
            this.canExit = false;
            this.type = "SceneObject";
        }

        overlaps(other) {
            let xo = (this.pos.x >= other.pos.x && this.pos.x < other.pos.x + other.size.x) ||
                (other.pos.x >= this.pos.x && other.pos.x < this.pos.x + this.size.x);

            let yo = (this.pos.y >= other.pos.y && this.pos.y < other.pos.y + other.size.y) ||
                (other.pos.y >= this.pos.y && other.pos.y < this.pos.y + this.size.y);

            return xo && yo;
        }

        draw() { }
        tick() { }
        onHit(by) { }
        onDestroy() { }
        onMove() { }
        onExit() { }

        destroy() {
            if (!this.destroyed) {
                this.destroyed = true;
                this.onDestroy();
            }
        }

        checkCollisions() {
            let solidHit = false;
            for (let i = 0; i < scene.objects.length; i++) {
                let other = scene.objects[i];
                if (other.destroyed || other === this || (!this.collides && !other.collides)) continue;
                if (this.overlaps(other)) {
                    this.onHit(other);
                    other.onHit(this);
                    if (other.solid && this.solid) {
                        solidHit = true;
                    }
                }
            }

            return solidHit;
        }

        move(to) {
            let exit = !inBounds(to) || !inBounds(to.plus(this.size).minus(new Vector(1, 1)));
            if (exit) {
                this.onExit();
                if (!this.canExit) {
                    return;
                }
            }

            let oldPos = this.pos;
            this.pos = to;
            if (this.checkCollisions()) {
                this.pos = oldPos;
            } else {
                this.onMove();
            }
        }
    }

    class Moon extends SceneObject {
        constructor(pos) {
            super(pos, 0);
            this.size = 1;
            this.type = "Moon";
        }

        draw() {
            PS.gridPlane(1);

            let o = this.size / 2;
            for (let x = 0; x < this.size + 1; x++) {
                for (let y = 0; y < this.size + 1; y++) {
                    let off = new Vector(x - o, y - o);
                    let pos = this.pos.plus(off);

                    let f = Math.sqrt(off.x * off.x + off.y * off.y) - this.size / 2 + 0.3;

                    let wpos = new Vector(Math.floor(pos.x + scene.view.x), Math.floor(pos.y + scene.view.y));

                    if (inBounds(pos) && levels[0].isWater(wpos)) {
                        PS.color(pos.x, pos.y, moonColor);

                        let w = levels[0].waterMap[wpos.x][wpos.y].alpha;
                        PS.alpha(pos.x, pos.y, Math.min(1, 1 - f) * Math.min(1, w * 0.25 + 0.25) * 255);
                    }
                }
            }
        }

        advance() {
            this.size += 1;
            this.pos.y -= 1;
        }
    }

    class SpriteObject extends SceneObject {
        constructor(pos, image) {
            super(pos, new Vector(image.width, image.height));
            this.sprite = PS.spriteImage(image);
            this.visible = true;
            this.type = "SpriteObject";
        }

        draw() {
            PS.spriteShow(this.sprite, false);
            PS.spriteShow(this.sprite, this.visible);
            PS.spritePlane(this.sprite, this.pos.y + 2);
            PS.spriteMove(this.sprite, this.pos.x, this.pos.y);
        }

        onDestroy() {
            PS.spriteDelete(this.sprite);
        }
    }

    class Player extends SpriteObject {
        constructor(pos) {
            super(pos, playerImage);
            this.collides = true;
            this.solid = true;
            this.canExit = false;
            this.lastMove = -playerMoveDelay;
            this.type = "Player";
        }

        tick() {
            if (time - this.lastMove > playerMoveDelay) {
                let move = new Vector(0, 0);
                if (keysHeld[PS.KEY_ARROW_LEFT]) {
                    move = move.plus(LEFT);
                }
                if (keysHeld[PS.KEY_ARROW_RIGHT]) {
                    move = move.plus(RIGHT);
                }
                if (keysHeld[PS.KEY_ARROW_UP]) {
                    move = move.plus(UP);
                }
                if (keysHeld[PS.KEY_ARROW_DOWN]) {
                    move = move.plus(DOWN);
                }

                if (move.x !== 0 || move.y !== 0) {
                    this.lastMove = time;
                    this.move(this.pos.plus(move));
                }
            }
        }
    }

    class Flower extends SpriteObject {
        constructor(pos, delay) {
            super(pos, flowerImage);
            this.collides = true;
            this.solid = false;
            this.canExit = true;
            this.type = "Flower";
            this.startTime = time + delay;
        }

        tick() {
            if (time > this.startTime) {
                this.move(this.pos.plus(DOWN.times(flowerSpeed)));
            }
        }

        onHit(by) {
            if (by.type === 'Player') {
                find('Moon').advance();
                this.destroy();
            }
        }

        onExit() {
            this.destroy();
        }
    }

    function find(type) {
        for (let i = 0; i < scene.objects.length; i++) {
            let obj = scene.objects[i];
            if (!obj.destroyed && obj.type === type) {
                return obj;
            }
        }

        return null;
    }

    function toDir(vec) {
        for (let i = 0; i < dirs.length; i++) {
            if (dirs[i].equals(vec)) {
                return i;
            }
        }
        return -1;
    }

    function inBounds(pos) {
        return pos.x >= 0 && pos.x < screenSize.x && pos.y >= 0 && pos.y < screenSize.y;
    }

    function dbEvent(type) {
        if (useDB) {

        }
    }

    function createPlayer() {
        scene.objects.push(new Player(new Vector(screenSize.x / 2, screenSize.y - playerImage.height)));
        scene.objects.push(new Moon(new Vector(screenSize.x / 2, screenSize.y * 0.8)));
    }

    function loadSounds() {

    }

    function loadImages() {
        PS.imageLoad(playerImageFile, function (img) {
            playerImage = img;
            createPlayer();
        });

        PS.imageLoad(flowerImageFile, function (img) {
            flowerImage = img;
        });

        for (let i = 0; i < levels.length; i++) {
            const iCpy = i;
            PS.imageLoad(levels[iCpy].imageFile, function (img) {
                levels[iCpy].load(img);
            }, 1);
        }
    }
    function clear() {
        PS.gridSize(screenSize.x, screenSize.y);

        PS.bgAlpha(PS.ALL, PS.ALL, 255);
        PS.bgColor(PS.ALL, PS.ALL, PS.COLOR_BLACK);
        PS.alpha(PS.ALL, PS.ALL, 0);
        PS.border(PS.ALL, PS.ALL, 0);
        
        PS.gridColor(PS.COLOR_BLACK);
        PS.statusColor(PS.COLOR_BLACK);
    }

    function basicFlowerPattern() {
        let spacing = screenSize.x / flowerCount;
        for (let i = 0; i < flowerCount; i++) {
            let x = Math.floor(i * spacing);
            scene.objects.push(new Flower(new Vector(x, flowerImage.height), i * flowerDelayPer + flowerDelayStart));
        }
    }

    function draw() {
        clear();
        levels[0].draw();

        for (let i = 0; i < scene.objects.length; i++) {
            scene.objects[i].draw();
        }
    }

    function tick() {
        for (let i = 0; i < scene.objects.length; i++) {
            if (!scene.objects[i].destroyed) {
                scene.objects[i].tick();
            }
        }

        if (flowerImage && time % flowerRate === 0) {
            basicFlowerPattern();
        }

        levels[0].tick();


        scene.objects = scene.objects.filter(function(val) { return !val.destroyed });

        draw();

        time++;
        timeSinceLoad++;
    }

    function onLogin(id, name) {
        draw();
        PS.timerStart(1, tick);
    }

    return {
        keyDown: function(key, shift, ctrl, options) {
            keysHeld[key] = true;
        },
        keyUp: function (key, shift, ctrl, options) {
            keysHeld[key] = false;
        },
        init: function () {
            clear();
            loadSounds();
            loadImages();
            if (useDB){
                PS.dbInit(db, { login : onLogin });
            } else {
                onLogin();
            }
        },
        shutdown: function (options) {
            if (useDB) {
                PS.dbSend(db, "vcmiller");
                PS.dbSend(db, "alsensiba");
                PS.dbErase(db);
            }
        }
    };
}()); // end of IIFE

PS.keyDown = G.keyDown;
PS.keyUp = G.keyUp;
PS.init = G.init;
PS.shutdown = G.shutdown;
