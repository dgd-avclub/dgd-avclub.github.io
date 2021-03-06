// game.js for Perlenspiel 3.3.x
// The following comment lines are for JSHint. Don't remove them!

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

/*

Sound credits:
Whisper - https://freesound.org/people/geoneo0/sounds/193808/
Music - Lost In The Dark, Mega Game Music Collection (Unreal Marketplace)
Hit - https://freesound.org/people/Puniho/sounds/113782/
Splash - https://freesound.org/people/Phil25/sounds/207371/

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
    const useDB = false;

    const screenSize = new Vector(32, 32);
    const scrollSpeed = 8;
    let scrolling = true;

    const groundColor = new Color(0, 0.1, 0);
    const groundVariance = 0.02;

    const waterColor = new Color(0, 0, 0.1);
    const waterVariance = 0.02;
    const waterPeriod = 20;
    const waterPeriodVariance = 10;
    const waterVarianceColor = waterColor.plus(new Color(waterVariance, waterVariance, waterVariance));
    const voidColor = new Color(0, 0, 0);
    const voidVarianceColor = voidColor.plus(new Color(waterVariance, waterVariance, waterVariance));
    const waterFlowSpeed = 4;
    const waterRecedeSpeed = 0.01;

    const moonColor = Color.fromRGB(PS.COLOR_WHITE);
    const bigMoonColor = Color.fromRGB(PS.COLOR_RED);
    const faintMoonColor = new Color(0.2, 0, 0);

    const playerImageFile = "images/player.png";
    const playerMoveDelay = 1;

    const flowerImageFile = "images/flower.png";
    let flowerImage = null;
    const flowerColor = 0xFF00E1;
    const flowerAlpha = 100;

    const platformImageFile = "images/platform.png";
    let platformImage = null;
    const monsterImageFile = "images/monster.png";
    let monsterImage = null;
    const houseImageFile = "images/house.png";
    let houseImage = null;
    const skullImageFile = "images/rip skull.png";
    let skullImage = null;

    const audioPath = "audio/";
    const whisperSound = "whisper";
    const musicSound = "music";
    const hitSound = "hit";
    const splashSound = "splash";

    let whisperChannel = null;
    let musicChannel = null;

    const flowerThresholds = [
        {
            count: 5,
            text: "The lotus-faces whisper to you."
        },
        {
            count: 10,
            text: "The hateful moon shines."
        },
        {
            count: 15,
            text: "ilyaa n'ghft"
        },
        {
            count: 16,
            text: "Your flesh begins to tremble."
        },
        {
            count: 20,
            text: "FOOLISH MORTAL."
        },
        {
            count: 25,
            text: "DO NOT DEAL WITH POWERS"
        },
        {
            count: 30,
            text: "BE̶͜Y̸͟O̴͟N͞͡͝D̢̢ ҉̴Y͜Ờ͞U͘R̸̛͝ ́̀҉C͠O͢͞N̸T̷̛RO̧̡͜L͢"
        }
    ];

    let keysHeld = {};

    // END MAP DATA

    let playerImage = null;

    let time = 0;
    let timeSinceLoad = 0;

    // flower counter to trigger ending
    let flowersHit = 0;
    let homeEnding = false;
    let deathEnding = false;
    let curFlowerThreshold = 0;
    const homeEndingTime = 68 * 60;
    let waterRecedeAmount = 0;
    let fadeOut = false;
    let fadeOutAmount = 0;
    let playerFadeOut = false;
    let playerFadeOutAmount = 0;

    class Scene {
        constructor() {
            this.waterMap = null;
            this.objects = [];
            this.streamSize = 4;
        }

        load() {
            this.waterMap = [];

            for (let y = 0; y < screenSize.y; y++) {
                let row = [];
                for (let x = 0; x < screenSize.x; x++) {
                    row.push({
                        phase: Math.random() * 3.1415,
                        period: Math.random() * waterPeriodVariance + waterPeriod,
                        alpha: 0,
                        isWater: x > (screenSize.x - this.streamSize) / 2 && x < (screenSize.x + this.streamSize) / 2,
                        step: 0,
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
            if (fadeOut) {
                fadeOutAmount += 0.01;
            }
            if (this.waterMap) {
                for (let x = 0; x < screenSize.x; x++) {
                    for (let y = 0; y < screenSize.y; y++) {
                        let w = this.waterMap[y][x];
                        if (w) {
                            if (w.step > 0) {
                                w.step--;
                            }
                            w.alpha = Math.sin(time / w.period + w.phase) * 0.5 + 0.5;
                        }
                    }
                }

                if (time % scrollSpeed === 0 && scrolling) {
                    if (homeEnding && this.streamSize > 0) {
                        this.streamSize -= 1;

                        if (this.streamSize <= 0) {
                            scene.objects.push(new House(new Vector(8, -16)));
                        }
                    }

                    this.advance();
                }

                if (deathEnding && waterRecedeAmount < 1) {
                    waterRecedeAmount += waterRecedeSpeed;
                    if (waterRecedeAmount >= 1) {
                        scene.objects.push(new Monster(new Vector(0, 0)));
                        PS.audioPlay(hitSound, { path: audioPath, volume: 1 });
                    }
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

            const s = Math.floor((screenSize.x - this.streamSize) / 2);
            for (let x = 0; x < screenSize.x; x++) {
                this.waterMap[0][x].isWater = x >= s && x < s + this.streamSize;
            }
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


                        if (!w.isWater) {
                            PS.color(x, y, w.grassColor);
                        } else if (deathEnding) {
                            let vc = Color.lerp(voidColor, voidVarianceColor, this.waterMap[y][x].alpha);
                            let wc = Color.lerp(waterColor, waterVarianceColor, this.waterMap[y][x].alpha);
                            let c = Color.lerp(wc, vc, waterRecedeAmount);
                            PS.color(x, y, c.toRGB());
                        } else {
                            let c = Color.lerp(waterColor, waterVarianceColor, this.waterMap[fy][x].alpha);
                            if (this.waterMap[fy][x].step > 0) {
                                c = Color.lerp(c, new Color(1, 1, 1).times(0.5 + 0.2 * this.waterMap[fy][x].phase), this.waterMap[fy][x].step / 15);
                            }
                            PS.color(x, y, c.toRGB());
                        }
                    }
                }

                for (const obj of this.objects) {
                    obj.draw();
                }
            }

            if (fadeOut) {
                PS.gridPlane(70);
                PS.color(PS.ALL, PS.ALL, PS.COLOR_BLACK);
                PS.alpha(PS.ALL, PS.ALL, fadeOutAmount * 255);
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

    class Pattern_Line_ZigZag extends Pattern_Line {
        constructor(start, delay, repeats, count, pos, dir, vel, delayStart, delayPer, bendTime, bendTimePer, bendDir, bends) {
            super(start, delay, repeats, count, pos, dir, vel, delayStart, delayPer);
            this.bendTime = bendTime;
            this.bendTimePer = bendTimePer;
            this.bendDir = bendDir;
            this.bends = bends;
        }

        fire() {
            for (let i = 0; i < this.count; i++) {
                scene.objects.push(new Flower_ZigZag(
                    this.pos.plus(this.dir.times(i)), this.vel, i * this.delayPer + this.delayStart,
                    this.bendTime + this.bendTimePer * i, this.bendDir, this.bends));
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

    class Pattern_Homing extends Pattern {
        constructor(start, delay, repeats, pos, vel) {
            super(start, delay, repeats);
            this.pos = pos;
            this.vel = vel;
        }

        fire() {
            scene.objects.push(new Flower_Homing(this.pos, this.vel, 30, 0, 10));
        }
    }

    const scene = new Scene();

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
            this.push = false; // whether to push other objects out of the way on collision, instead of being blocked
        }

        overlaps(other) {
            if (this.destroyed || other.destroyed) return false;

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

        checkCollisions(delta) {
            let solidHit = false;
            for (let i = 0; i < scene.objects.length; i++) {
                let other = scene.objects[i];
                if (other.destroyed || other === this || (!this.collides && !other.collides)) continue;
                if (this.overlaps(other)) {
                    this.onHit(other);
                    other.onHit(this);
                    if (other.solid && this.solid) {
                        if (this.push) {
                            other.move(delta);
                        } else {
                            solidHit = true;
                        }
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
            if (this.checkCollisions(to.minus(oldPos))) {
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

                new Pattern_Homing(60 * 48, 0, 1, new Vector(2, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 50, 0, 1, new Vector(28, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 52, 0, 1, new Vector(28, 28), new Vector(0, -0.5)),
                new Pattern_Homing(60 * 54, 0, 1, new Vector(2, 28), new Vector(0, -0.5)),

                new Pattern_Homing(60 * 56, 0, 1, new Vector(2, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 56.5, 0, 1, new Vector(11, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 57, 0, 1, new Vector(20, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 57.5, 0, 1, new Vector(29, 2), new Vector(0, 0.5)),

                new Pattern_Homing(60 * 59, 0, 1, new Vector(2, 28), new Vector(0, -0.5)),
                new Pattern_Homing(60 * 59.5, 0, 1, new Vector(11, 28), new Vector(0, -0.5)),
                new Pattern_Homing(60 * 60, 0, 1, new Vector(20, 28), new Vector(0, -0.5)),
                new Pattern_Homing(60 * 60.5, 0, 1, new Vector(29, 28), new Vector(0, -0.5)),

                new Pattern_Square(60 * 62, 0, 1, 15, 0.5, 6, -1),
                new Pattern_Homing(60 * 63, 0, 1, new Vector(2, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 63.5, 0, 1, new Vector(11, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 64, 0, 1, new Vector(20, 2), new Vector(0, 0.5)),
                new Pattern_Homing(60 * 64.5, 0, 1, new Vector(29, 2), new Vector(0, 0.5)),
            ];

            //time = 60 * 55;
        }

        tick() {
            for (const pattern of this.patterns) {
                pattern.update();
            }

            if (time === homeEndingTime && !deathEnding) {
                homeEnding = true;
                PS.statusText("The darkness calls to you...");
                dbEvent("home");
                sendDB();
                if (musicChannel) PS.audioFade(musicChannel, PS.CURRENT, 0, 1000);
                if (whisperChannel) PS.audioFade(whisperChannel, PS.CURRENT, 0, 2000);
            }

            if (homeEnding || deathEnding) {
                this.destroy();
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
                        if (deathEnding) {
                            PS.color(pos.x, pos.y, Color.lerp(bigMoonColor, faintMoonColor, waterRecedeAmount).toRGB());
                        } else {
                            let c = flowersHit / flowerThresholds[flowerThresholds.length - 1].count;
                            PS.color(pos.x, pos.y, Color.lerp(moonColor, bigMoonColor, c).toRGB());
                        }

                        let fy = wpos.y + Math.floor(time / waterFlowSpeed);
                        fy %= screenSize.y;

                        let w = scene.waterMap[deathEnding ? wpos.y : fy][wpos.x].alpha;
                        PS.alpha(pos.x, pos.y, Math.min(1, 1 - f) * Math.min(1, w * 0.25 + 0.25) * 255);
                    }
                }
            }
        }

        advance() {
            this.size.x += 1;
            this.pos.y -= 1;
            scene.streamSize++;
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

    class AnimSpriteObject extends SceneObject {
        constructor(pos, image, frames, frameTime) {
            super(pos, new Vector(image.width / frames, image.height));
            this.sprites = [];
            this.visible = true;
            this.type = "AnimSpriteObject";
            this.frameTime = frameTime;
            this.start = time;
            this.frames = frames;
            this.animate = true;
            this.loop = true;
            this.spritePlaneOffset = 2;

            for (let i = 0; i < frames; i++) {
                let rect = {
                    left: i * this.size.x,
                    top: 0,
                    width: this.size.x,
                    height: this.size.y
                };
                this.sprites.push(PS.spriteImage(image, rect));
            }
        }

        draw() {
            if (!this.animate) {
                this.start = time;
            }

            let i = Math.floor((time - this.start) / this.frameTime);
            if (this.loop) {
                i %= this.frames
            } else {
                i = Math.min(i, this.frames - 1);
            }

            PS.spriteShow(this.sprites[i], false);
            PS.spriteShow(this.sprites[i], this.visible);
            PS.spritePlane(this.sprites[i], this.pos.y + this.spritePlaneOffset);
            PS.spriteMove(this.sprites[i], this.pos.x, this.pos.y);
        }

        onDestroy() {
            for (let s of this.sprites) {
                PS.spriteDelete(s);
            }
        }
    }

    class Player extends SceneObject {
        constructor(pos) {
            super(pos, new Vector(1, 3));
            this.collides = true;
            this.solid = true;
            this.canExit = false;
            this.type = "Player";
            this.lastFootstep = -100;
        }

        tick() {

            // can control movements outside of cutscene
            if (!deathEnding && !homeEnding) {
                let move = new Vector(0, 0);
                if (keysHeld[PS.KEY_ARROW_LEFT] || keysHeld[97]) {
                    move = move.plus(LEFT);
                }
                if (keysHeld[PS.KEY_ARROW_RIGHT] || keysHeld[100]) {
                    move = move.plus(RIGHT);
                }
                if (keysHeld[PS.KEY_ARROW_UP] || keysHeld[119]) {
                    move = move.plus(UP);
                }
                if (keysHeld[PS.KEY_ARROW_DOWN] || keysHeld[115]) {
                    move = move.plus(DOWN);
                }

                if (move.x !== 0 || move.y !== 0) {
                    this.move(move);
                }
            }

            if (playerFadeOut && playerFadeOutAmount < 1) {
                playerFadeOutAmount += 0.01;
                if (playerFadeOutAmount >= 1) {
                    scene.objects.push(new Skull(new Vector(0, 0)));
                }
            }
        }

        onMove() {
            let feet = this.pos.plus(new Vector(0, this.size.y - 1));
            if (scene.isWater(feet)) {
                let fy = feet.y + Math.floor(time / waterFlowSpeed);
                fy %= screenSize.y;
                scene.waterMap[fy][feet.x].step = 15;
                if (time - this.lastFootstep > 10) {
                    PS.audioPlay(splashSound, { path: audioPath, volume: 0.5 });
                    this.lastFootstep = time;
                }
            }
        }

        draw() {
            PS.gridPlane(this.pos.y + 2);
            for (let x = 0; x < this.size.x; x++) {
                let wx = this.pos.x + x;
                for (let y = 0; y < this.size.y; y++) {
                    let wy = this.pos.y + y;
                    PS.alpha(wx, wy, 255 * (1 - playerFadeOutAmount));
                    PS.color(wx, wy, PS.COLOR_WHITE);
                }
            }
        }
    }

    class Flower extends AnimSpriteObject {
        constructor(pos, vel, delay) {
            super(find("Moon").pos, flowerImage, 2, 10);
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

            if (homeEnding || deathEnding) {
                this.destroy();
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
                PS.gridPlane(60);
                PS.color(p.x, p.y, flowerColor);
                PS.alpha(p.x, p.y, flowerAlpha);
            }
        }

        onHit(by) {
            if (time >= this.startTime && by instanceof Player) {
                flowersHit += 1;
                find('Moon').advance();
                dbEvent("hit");
                PS.audioPlay(hitSound, { path: audioPath, volume: 0.2 });

                if (curFlowerThreshold < flowerThresholds.length && flowersHit === flowerThresholds[curFlowerThreshold].count) {
                    PS.statusText(flowerThresholds[curFlowerThreshold].text);
                    curFlowerThreshold++;
                }

                if (curFlowerThreshold < flowerThresholds.length) {
                    if (whisperChannel) PS.audioFade(whisperChannel, 1, flowersHit / 60, 2000);
                } else {
                    if (whisperChannel) PS.audioFade(whisperChannel, PS.CURRENT, 1, 1000);
                    if (musicChannel) PS.audioFade(musicChannel, 1, 0, 1000);
                    deathEnding = true;

                    scrolling = false;
                    //scene.objects.push(new Platform(by.pos.plus(new Vector(-4, -1))));

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

    class Flower_Homing extends Flower {
        constructor(pos, vel, delay, changeDelay, bendCount) {
            super(pos, vel, delay);
            this.changeDelay = changeDelay;
            this.bendCount = bendCount;
            this.player = find("Player");

            // Calculate speed, this works because vel should always be in a cardinal direction (only one coordinate has a value).
            this.speed = Math.abs(vel.x) + Math.abs(vel.y);
        }

        moveFired() {
            super.moveFired();
            this.solid = true;
            const t = time - this.startTime;
            if (this.bendCount > 0) {
                if (this.vel.x !== 0 && Math.abs(this.pos.x - this.player.pos.x) < 2) {
                    this.vel = new Vector(0, Math.sign(this.player.pos.y - this.pos.y) * this.speed);
                    this.bendCount--;
                } else if (this.vel.y !== 0 && Math.abs(this.pos.y - this.player.pos.y) < 2) {
                    this.vel = new Vector(Math.sign(this.player.pos.x - this.pos.x) * this.speed, 0);
                    this.bendCount--;
                }
            }
        }
    }

    class Platform extends SpriteObject {
        constructor(pos) {
            super(pos, platformImage);
        }
    }

    class Monster extends AnimSpriteObject {
        constructor(pos) {
            super(pos, monsterImage, 8, 5);
        }

        tick() {
            if (time - this.start > 30) {
                playerFadeOut = true;
            }
        }
    }

    class Skull extends AnimSpriteObject {
        constructor(pos) {
            super(pos, skullImage, 4, 5);
            this.loop = false;
            this.spritePlaneOffset = 50;
        }

        tick() {
            if (time - this.start > 30) {
                fadeOut = true;
            }
        }
    }

    class House extends SpriteObject {
        constructor(pos) {
            super(pos, houseImage);
            this.push = true;
            this.solid = true;

            PS.statusText("...But you refuse to answer");
        }

        tick() {
            if (time % scrollSpeed === 0 && this.pos.y < 8) {
                this.move(new Vector(0, 1));

                if (this.pos.y === 8) {
                    scrolling = false;
                    fadeOut = true;
                }
            }
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
            PS.dbEvent(db, "type", type, "hits", flowersHit, "ticks", time, "ending", (homeEnding || deathEnding));
        }
    }

    function createPlayer() {
        scene.objects.push(new Player(new Vector(screenSize.x / 2, screenSize.y - playerImage.height)));
        scene.objects.push(new Moon(new Vector(screenSize.x / 2, screenSize.y * 0.8)));
    }

    function loadSounds() {
        PS.audioLoad(whisperSound, { path: audioPath });
        PS.audioLoad(musicSound, { path: audioPath });
        PS.audioLoad(hitSound, { path: audioPath });
        PS.audioLoad(splashSound, { path: audioPath });
    }

    function loadImages() {
        PS.imageLoad(playerImageFile, function (img) {
            playerImage = img;
            createPlayer();
        });

        PS.imageLoad(flowerImageFile, function (img) {
            flowerImage = img;
        });

        PS.imageLoad(platformImageFile, function(img) {
            platformImage = img;
        });

        PS.imageLoad(monsterImageFile, function(img){
            monsterImage = img;
        });

        PS.imageLoad(houseImageFile, function(img) {
            houseImage = img;
        });

        PS.imageLoad(skullImageFile, function (img) {
            skullImage = img;
        });
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

        time++;
        timeSinceLoad++;
    }

    function onLogin(id, name) {
        PS.statusText("WASD/arrows to move");
        PS.timerStart(1, tick);

        PS.audioPlay(whisperSound, { path: audioPath, loop: true, volume: 0, onLoad: function(data) {
                whisperChannel = data.channel;
            }
        });

        PS.audioPlay(musicSound, { path: audioPath, loop: true, volume: 1, onLoad: function (data) {
                musicChannel = data.channel;
            }
        });
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
            scene.load();
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
