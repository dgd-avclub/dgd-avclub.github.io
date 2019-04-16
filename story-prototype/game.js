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
            if (other instanceof Color) {
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
    const useDB = true;

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

    const moonColor = PS.COLOR_RED; //PS.COLOR_WHITE;

    const playerImageFile = "images/player.png";
    const playerMoveDelay = 1;

    const flowerImageFile = "images/flower.png";
    let flowerImage = null;
    const flowerColor = 0xFF00E1;
    const flowerAlpha = 100;
    let homeEnding = false;

    let keysHeld = {};

    let id = 0;

    // END MAP DATA

    let playerImage = null;

    let time = 0;
    let timeSinceLoad = 0;
    
    // flower counter to trigger ending
    let flowersHit = 0;

    // whether player is in control
    let inControl = true;

    class Scene {
        constructor(imageFile){
            this.imageFile = imageFile;
            this.waterMap = null;
            this.objects = [];
            this.streamSize = 4;
            this.addWater = 0;
        }

        load(image) {
            this.waterMap = [];

            for (let y = 0; y < screenSize.y; y++) {
                let row = [];
                for (let x = 0; x < screenSize.x; x++) {
                    row.push({
                        phase: Math.random() * 3.1415,
                        period: Math.random() * waterPeriodVariance + waterPeriod,
                        alpha: 0,
                        isWater: x > (screenSize.x - this.streamSize) / 2 && x < (screenSize.x + this.streamSize) / 2,
                        grassColor: new Color(
                            groundColor.r + Math.random() * groundVariance,
                            groundColor.g + Math.random() * groundVariance,
                            groundColor.b + Math.random() * groundVariance).toRGB()
                    });
                }

                this.waterMap.push(row);
            }

            this.objects.push(new Emitter());
        }

        isWater(pos) {
            if (!inBounds(pos)) return false;

            return this.waterMap[pos.y][pos.x].isWater;
        }

        tick() {
            if (this.waterMap) {
                for (let x = 0; x < screenSize.x; x++) {
                    for (let y = 0; y < screenSize.y; y++) {
                        let w = this.waterMap[y][x];
                        if (w && w.isWater) {
                            w.alpha = Math.sin(time / w.period + w.phase) * 0.5 + 0.5;
                        }
                    }
                }

                if (time % scrollSpeed === 0) {
                    this.advance();
                }

                for (const obj of this.objects) {
                    obj.tick();
                }

                this.objects = this.objects.filter(function(val) { return !val.destroyed });
            }

        }

        advance() {
            let r = this.waterMap[screenSize.y - 1];
            this.waterMap.splice(screenSize.y - 1, 1);
            this.waterMap.splice(0, 0, r);

            while (this.addWater > 0) {
                this.streamSize++;
                this.addWater--;
            }

            const s = Math.floor((screenSize.x - this.streamSize) / 2);
            for (let x = s; x < s + this.streamSize; x++) {
                if (x >= 0 && x < screenSize.x) {
                    this.waterMap[0][x].isWater = true;
                }
            }
        }

        addStreamSize() {
            this.addWater++;
        }

        draw() {
            if (this.waterMap) {
                PS.gridPlane(0);
                for (let x = 0; x < screenSize.x; x++) {
                    for (let y = 0; y < screenSize.y; y++) {
                        PS.alpha(x, y, 255);

                        let fy = y + Math.floor(time / waterFlowSpeed);
                        fy %= screenSize.y;

                        let w = this.waterMap[y][x];
                        if (w.isWater) {
                            let c = Color.lerp(waterColor, waterVarianceColor, this.waterMap[fy][x].alpha);
                            PS.color(x, y, c.toRGB());
                        } else {
                            PS.color(x, y, w.grassColor);
                        }
                    }
                }

                for (const obj of this.objects) {
                    obj.draw();
                }
            }

        }
    }

    class Pattern {
        constructor(start, delay, repeats) {
            this.start = start;
            this.delay = delay;
            this.repeats = repeats;
            this.lastUse = start - delay;
        }

        fire() { }

        update() {
            if (flowerImage && time - this.lastUse === this.delay && this.repeats > 0) {
                this.repeats--;
                this.lastUse = time;
                this.fire();
            }
        }
    }

    class Pattern_Line extends Pattern {
        constructor(start, delay, repeats, count, pos, dir, vel, delayStart, delayPer) {
            super(start, delay, repeats);
            this.count = count;
            this.pos = pos;
            this.dir = dir;
            this.vel = vel;
            this.delayStart = delayStart;
            this.delayPer = delayPer;
        }

        fire() {
            for (let i = 0; i < this.count; i++) {
                scene.objects.push(new Flower(this.pos.plus(this.dir.times(i)), this.vel, i * this.delayPer + this.delayStart));
            }
        }
    }

    class Pattern_Line_Bend extends Pattern_Line {
        constructor(start, delay, repeats, count, pos, dir, vel, delayStart, delayPer, bendTime, bendTimePer, bendDir) {
            super(start, delay, repeats, count, pos, dir, vel, delayStart, delayPer);
            this.bendTime = bendTime;
            this.bendTimePer = bendTimePer;
            this.bendDir = bendDir;
        }

        fire() {
            for (let i = 0; i < this.count; i++) {
                scene.objects.push(new Flower_Bend(
                    this.pos.plus(this.dir.times(i)), this.vel, i * this.delayPer + this.delayStart,
                    this.bendTime + this.bendTimePer * i, this.bendDir, 1));
            }
        }
    }

    class Pattern_Square extends Pattern {
        constructor(start, delay, repeats, radius, speed, bends, dir) {
            super(start, delay, repeats);
            this.radius = radius;
            this.speed = speed;
            this.bends = bends;
            this.dir = dir;
        }

        fire() {
            const x1 = 15 - this.radius;
            const x2 = 14 + this.radius;

            const bendDelay = Math.floor((this.radius * 2 - 1) / this.speed);

            if (this.dir === -1) {
                scene.objects.push(new Flower_Bend(new Vector(x1, x1), new Vector(this.speed, 0), 30, bendDelay, -1, this.bends));
                scene.objects.push(new Flower_Bend(new Vector(x2, x1), new Vector(0, this.speed), 30, bendDelay, -1, this.bends));
                scene.objects.push(new Flower_Bend(new Vector(x2, x2), new Vector(-this.speed, 0), 30, bendDelay, -1, this.bends));
                scene.objects.push(new Flower_Bend(new Vector(x1, x2), new Vector(0, -this.speed), 30, bendDelay, -1, this.bends));
            } else {
                scene.objects.push(new Flower_Bend(new Vector(x1, x1), new Vector(0, this.speed), 30, bendDelay, 1, this.bends));
                scene.objects.push(new Flower_Bend(new Vector(x2, x1), new Vector(-this.speed, 0), 30, bendDelay, 1, this.bends));
                scene.objects.push(new Flower_Bend(new Vector(x2, x2), new Vector(0, -this.speed), 30, bendDelay, 1, this.bends));
                scene.objects.push(new Flower_Bend(new Vector(x1, x2), new Vector(this.speed, 0), 30, bendDelay, 1, this.bends));
            }
        }
    }

    const scene = new Scene("images/levels/level1.bmp");

    class SceneObject {
        constructor(pos, size) {
            this.pos = pos;
            this.size = size;
            this.destroyed = false;
            this.solid = false;
            this.collides = false;
            this.canExit = false;
            this.type = "SceneObject";
            this.movement = new Vector(0, 0);
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

        move(amount) {
            this.movement = this.movement.plus(amount);
            amount = new Vector(Math.floor(this.movement.x), Math.floor(this.movement.y));
            this.movement = this.movement.minus(amount);

            if (amount.x === 0 && amount.y === 0) {
                return;
            }

            let to = this.pos.plus(amount);
            let wasOut = !inBounds(this.pos) || !inBounds(this.pos.plus(this.size).minus(new Vector(1, 1)));
            let out = !inBounds(to) || !inBounds(to.plus(this.size).minus(new Vector(1, 1)));
            if (out && !wasOut) {
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

    class Emitter extends SceneObject {
        constructor() {
            super(new Vector(0, 0), new Vector(0, 0));
            this.patterns = [
                new Pattern_Line(60 *  1, 0, 1, 4, new Vector(3, -3), new Vector(7, 0), new Vector(0, .5), 30, 30),
                new Pattern_Line(60 *  4, 0, 1, 4, new Vector(35, 3), new Vector(0, 7), new Vector(-.5, 0), 30, 30),
                new Pattern_Line(60 *  7, 0, 1, 4, new Vector(27, 35), new Vector(-7, 0), new Vector(0, -.5), 30, 30),
                new Pattern_Line(60 *  10, 0, 1, 4, new Vector(-3, 27), new Vector(0, -7), new Vector(.5, 0), 30, 30),

                new Pattern_Line(60 * 13, 90, 3, 6, new Vector(2, 2), new Vector(5, 0), new Vector(0, 1.5), 20, 20),

                new Pattern_Line(60 *  19, 90, 3, 6, new Vector(35, 1), new Vector(0, 7), new Vector(-.5, 0), 30, 30),
                new Pattern_Line(60 *  19, 90, 3, 6, new Vector(-3, 29), new Vector(0, -7), new Vector(.5, 0), 30, 30),

                new Pattern_Square(60 * 25, 0, 1, 15, 0.5, 6, -1),
                new Pattern_Square(60 * 26.5, 0, 1, 10, 0.5, 6, 1),
                new Pattern_Square(60 * 28, 0, 1, 5, 0.5, 6, -1),

                new Pattern_Square(60 * 32, 0, 1, 15, 0.5, 6, 1),
                new Pattern_Square(60 * 32, 0, 1, 10, 0.5, 7, 1),
                new Pattern_Square(60 * 32, 0, 1, 5, 0.5, 8, 1),

                new Pattern_Line_Bend(60 *  40, 0, 1, 2, new Vector(3, -3), new Vector(7, 0), new Vector(0, .5), 30, 30, 58, -24, 1),
                new Pattern_Line_Bend(60 *  42, 0, 1, 2, new Vector(17, -3), new Vector(7, 0), new Vector(0, .5), 30, 30, 34, -24, -1),

                new Pattern_Line_Bend(60 *  44, 0, 1, 2, new Vector(3, -3), new Vector(7, 0), new Vector(0, .5), 30, 30, 58, -24, 1),
                new Pattern_Line_Bend(60 *  45, 0, 1, 2, new Vector(17, -3), new Vector(7, 0), new Vector(0, .5), 30, 30, 34, -24, -1),

                new Pattern_Line_Bend(60 *  46, 0, 1, 4, new Vector(3, -3), new Vector(7, 0), new Vector(0, .5), 30, 30, 58, -12, 1),
            ];

            //time = 60 * 39;
        }

        tick() {
            for (const pattern of this.patterns) {
                pattern.update();
            }

            if (time === 60 * 55 && flowersHit < 55) {
                homeEnding = true;
                PS.statusText("You return home, ignorant");
                dbEvent("home");
                sendDB();
            }
        }
    }

    class Moon extends SceneObject {
        constructor(pos) {
            super(pos, new Vector(1, 1));
            this.type = "Moon";
        }

        draw() {
            PS.gridPlane(1);

            let o = this.size.x / 2;
            for (let x = 0; x < this.size.x + 1; x++) {
                for (let y = 0; y < this.size.x + 1; y++) {
                    let off = new Vector(x - o, y - o);
                    let pos = this.pos.plus(off);

                    let f = Math.sqrt(off.x * off.x + off.y * off.y) - this.size.x / 2 + 0.3;

                    let wpos = new Vector(Math.floor(pos.x), Math.floor(pos.y));

                    if (inBounds(pos) && scene.isWater(wpos)) {
                        PS.color(pos.x, pos.y, moonColor);

                        let fy = wpos.y + Math.floor(time / waterFlowSpeed);
                        fy %= screenSize.y;

                        let w = scene.waterMap[fy][wpos.x].alpha;
                        PS.alpha(pos.x, pos.y, Math.min(1, 1 - f) * Math.min(1, w * 0.25 + 0.25) * 255);
                    }
                }
            }
        }

        advance() {
            this.size.x += 1;
            this.pos.y -= 1;
            scene.addStreamSize();
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

            // can control movements outside of cutscene
            if (inControl) {
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
                        this.move(move);
                    }
                }
            }
            else { // cutscene

                // uncontrollable movement up
                let pmd = 20;
                if (time - this.lastMove > pmd) {
                    this.lastMove = time;
                    this.move(UP);
                }

            }
        }

    }

    class Flower extends SpriteObject {
        constructor(pos, vel, delay) {
            super(find("Moon").pos, flowerImage);
            this.startPos = pos;
            this.collides = true;
            this.solid = false;
            this.canExit = true;
            this.type = "Flower";
            this.startTime = time + delay;
            this.vel = vel;
        }

        tick() {
            if (time >= this.startTime) {
                this.moveFired();
                this.visible = true;
            } else {
                this.moveTowardsStart();
                this.visible = false;
            }
        }

        moveTowardsStart(){
            this.move(this.startPos.minus(this.pos).times(1.0 / (this.startTime - time)));
        }

        moveFired() {
            this.move(this.vel);
        }

        draw() {
            super.draw();
            let p = this.pos.plus(new Vector(1, 1));
            if (time < this.startTime && inBounds(p)) {
                PS.gridPlane(100);
                PS.color(p.x, p.y, flowerColor);
                PS.alpha(p.x, p.y, flowerAlpha);
            }
        }

        onHit(by) {
            if (time >= this.startTime && by instanceof Player) {
                flowersHit += 1;
                find('Moon').advance();
                dbEvent("hit");

                /// bad ending
                if (flowersHit >= 5)
                    PS.statusText("DO NOT TOUCH.");
                if (flowersHit >= 15)
                    PS.statusText("THAT IS NOT WISE.");
                if (flowersHit >= 25)
                    PS.statusText("I WARN YOU");
                if (flowersHit >= 35)
                    PS.statusText("FOOLISH MORTAL");
                if (flowersHit >= 45)
                    PS.statusText("DO NOT DEAL WITH POWERS");
                if (flowersHit >= 55) {
                    PS.statusText("BE̶͜Y̸͟O̴͟N͞͡͝D̢̢ ҉̴Y͜Ờ͞U͘R̸̛͝ ́̀҉C͠O͢͞N̸T̷̛RO̧̡͜L͢");
                    inControl = false;
                    dbEvent("chasm");
                    sendDB();
                }

                this.destroy();
            }
        }

        onExit() {
            if (time > this.startTime) {
                this.destroy();
            }
        }
    }

    class Flower_Bend extends Flower {
        constructor(pos, vel, delay, changeDelay, bendDir, bendCount) {
            super(pos, vel, delay);
            this.changeDelay = changeDelay;
            this.bendDir = bendDir;
            this.bendCount = bendCount;
        }

        bend() {
            this.bendCount--;

            const x = this.vel.x;
            const y = this.vel.y;

            this.vel = new Vector(y * this.bendDir, x * -this.bendDir);
        }

        tick() {
            const t = time - this.startTime;
            if (this.bendCount > 0 && t >= this.changeDelay && (t % this.changeDelay === 0)) {
                this.bend();
            }

            super.tick();
        }
    }

    class Flower_ZigZag extends  Flower_Bend {
        bend() {
            this.bendDir = -1;
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

    function inBounds(pos) {
        return pos.x >= 0 && pos.x < screenSize.x && pos.y >= 0 && pos.y < screenSize.y;
    }

    function dbEvent(type) {
        if (useDB && PS.dbValid(db)) {
            PS.dbEvent(db, "type", type, "hits", flowersHit, "ticks", time, "ending", (time >= 55 * 60 || flowersHit >= 55));
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

        PS.imageLoad(scene.imageFile, function (img) {
            scene.load(img);
        }, 1);
    }

    function clear() {
        PS.gridSize(screenSize.x, screenSize.y);

        PS.bgAlpha(PS.ALL, PS.ALL, 255);
        PS.bgColor(PS.ALL, PS.ALL, PS.COLOR_BLACK);
        PS.alpha(PS.ALL, PS.ALL, 0);
        PS.border(PS.ALL, PS.ALL, 0);
        
        PS.gridColor(PS.COLOR_BLACK);
        PS.statusColor(PS.COLOR_WHITE);
    }

    function tick() {
        scene.tick();
        clear();
        scene.draw();

        // draw chasm
        if (!inControl) {
            PS.gridPlane(100);
            for (let j = 0; j < 6; j++) {
                PS.alpha(PS.ALL, j, 255);
                PS.color(PS.ALL, j, PS.COLOR_BLACK);
            }
        }


        time++;
        timeSinceLoad++;
    }

    function onLogin(id, name) {
        PS.statusText("");
        PS.timerStart(1, tick);
    }

    function sendDB() {
        if (useDB && PS.dbValid(db)) {
            PS.dbSend(db, "vcmiller");
            PS.dbSend(db, "alsensiba");
            PS.dbErase(db);
        }
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
                dbEvent("quit");
                sendDB();
            }
        }
    };
}()); // end of IIFE

PS.keyDown = G.keyDown;
PS.keyUp = G.keyUp;
PS.init = G.init;
PS.shutdown = G.shutdown;
