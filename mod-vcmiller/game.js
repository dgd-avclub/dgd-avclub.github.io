// Vincent Miller
// Team ...
// Mod 1: Added a monster that chases you at half your movement speed when moving, and eats you
// Mod 2: Rearranged the locations of walls to add more loops
// Mod 3: Rearranged and added more gold pieces
// Mod 4: Added a border width animation to gold pieces
// Mod 5: Added arrow keys as an alternate input scheme
// Mod 6: Changed the gold to ducks by changing the pickup sound and color
// Mod 7: Changed the grid color to blue or red when you win or lose
// Mod 8: Added background music
// Mod 9: Added spacebar to restart game
// Mod 10: After restaring the game, the gold pickup sound changes to something more annoying

// game.js for Perlenspiel 3.3.x
// The following comment lines are for JSHint. Don't remove them!

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

// This immediately-invoked function expression (IIFE) encapsulates all game functionality.
// It is called as this file is loaded, and initializes the G variable.
// The object established in G by the IIFE will contain all public constants, variables and functions.

var G = ( function () {
	"use strict";

	// All internal variable and function names begin with an underscore.
	// Constants are in all upper-case.

	var _WIDTH = 21; // grid width
	var _HEIGHT = 21; // grid height

	var _PLANE_FLOOR = 0; // z-plane of floor
	var _PLANE_ACTOR = 1; // z-plane of actor

	var _COLOR_BG = 0x303030; // background color (Perlenspiel gray)
	var _COLOR_WALL = PS.COLOR_BLACK; // wall color
	var _COLOR_FLOOR = PS.COLOR_GRAY; // floor color
	var _COLOR_ACTOR = PS.COLOR_GREEN; // actor color
	var _COLOR_GOLD = [50, 200, 100]; // gold color
	var _COLOR_EXIT = PS.COLOR_BLUE; // exit color
    var _COLOR_MONSTER = PS.COLOR_RED;

	var _SFX_FLOOR = "fx_click"; // touch floor sound
	var _SFX_WALL = "fx_hoot"; // touch wall sound
	var _SFX_GOLD = "fx_squawk"; // take coin sound
	var _SFX_OPEN = "fx_powerup8"; // open exit sound
	var _SFX_WIN = "fx_tada"; // win sound
	var _SFX_ERROR = "fx_uhoh"; // error sound
    var _SFX_DEATH = "fx_wilhelm"; // death sound
    var _SFX_ANNOYING = "fx_powerup6";
    var _MUSIC = "music";
    var _AUDIO_PATH = "audio/";

	var _WALL = 0; // wall
	var _FLOOR = 1; // floor
	var _GOLD = 2; // floor + gold

	// Variables

	var _id_sprite; // actor sprite id
	var _id_path; // pathmap id for pathfinder
    var _id_timer;

	var _gold_count; // initial number of gold pieces in map
	var _gold_found; // gold pieces collected
	var _won = false; // true on win
    var _musicPlaying = false;

	// This handmade imageMap is used for map drawing and pathfinder logic
	// All properties MUST be present!
	// The map.data array controls the layout of the maze,
	// the location of the gold pieces and exit
	// 0 = wall, 1 = floor, 2 = floor + gold
	// To remove a gold piece, replace a 2 with a 1
	// To add a gold piece, replace a 1 with a 2

	var _map = {
		width: 0, // set by G.init()
		height: 0, // ditto
		pixelSize: 1, // must be present and = 1!
		initial_data: [
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 1, 1, 1, 1, 1, 2, 1, 0, 0, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 0,
			0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0,
			0, 1, 1, 1, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 2, 1, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
			0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
			0, 1, 0, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
			0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 2, 0,
			0, 1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 2, 1, 1, 2, 0, 0, 1, 0, 0, 1, 0,
			0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
			0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 0, 0, 2, 1, 1, 1, 0, 0, 1, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		],
        data: null
	};

	// These two variables control the initial location of the actor
	// This location MUST correspond to a floor location (1) in the maza.data array
	// or a startup error will occur!

	var _actor_x = 1; // initial x-pos of actor sprite
	var _actor_y = 1; // initial y-pos of actor sprite

	var monsterX = 10; // initial x-pos of monster
	var monsterY = 1; // initial y-pos of monster

	// These two variables control the location of the exit
	// This location MUST correspond to a floor location (1) in the maza.data array
	// or a startup error will occur!

	var _exit_x = 19; // x-pos of exit
	var _exit_y = 19; // y-pos of exit
	var _exit_ready = false; // true when exit is opened

	// Timer function, called every 1/10th sec
	// This moves the actor along paths

	var _path; // path to follow, null if none
	var _step; // current step on path
    var _time; // number of ticks since init
    var _playerMoves; // number of moves the player has made

    var updateMonster = function() {
        // Mosnter is drawn on upper grid plane
        PS.gridPlane(1);
        PS.alpha(monsterX, monsterY, PS.ALPHA_TRANSPARENT);

        // Monster gets to move every other step
        if (_playerMoves % 2 === 0) {
            // Player moves every step, so we need to always recalculate the path.
            var monsterPath = PS.pathFind( _id_path, monsterX, monsterY, _actor_x, _actor_y );
            if (monsterPath && monsterPath.length > 0) {
                var mp = monsterPath[0];
                var mx = mp[0];
                var my = mp[1];

                monsterX = mx;
                monsterY = my;

            }
        }

        // Hide old monster position, and draw new one.
        PS.alpha(monsterX, monsterY, PS.ALPHA_OPAQUE);
        PS.color(monsterX, monsterY, _COLOR_MONSTER);
        PS.gridPlane(0);
    };

    var checkMonsterCollision = function () {
        // Check if the monster collided with the player, and if so, lose the game.
        if (monsterX === _actor_x && monsterY === _actor_y) {
            PS.timerStop( _id_timer ); // stop movement timer
            PS.audioPlay(_SFX_DEATH);
            PS.statusText("YOU DIED (press space)");
            _won = true;
            PS.gridColor(150, 0, 0);
        }
    };

    var updateGold = function() {
        _time++;
        // Apply border width animation to gold.
        for (var x = 0; x < _WIDTH; x++) {
            for (var y = 0; y < _HEIGHT; y++) {
                var val = _map.data[ ( y * _HEIGHT ) + x ]; // get data
                if (val === _GOLD && (x !== monsterX || y !== monsterY)) {
                    PS.scale(x, y, Math.abs(_time * 10 % 80 - 40) + 50);
                    PS.alpha(x, y, 255);
                    PS.bgColor(x, y, _COLOR_FLOOR);
                    PS.bgAlpha(x, y, 255);
                } else {
                    PS.scale(x, y, 100);
                }
            }
        }
    };
    
    var movePlayer = function (nx, ny) {
        // Don't allow moving into walls or outside the map.
        if (nx < 0 || nx > _WIDTH || ny < 0 || ny > _WIDTH) return;
        var val = _map.data[ ( ny * _HEIGHT ) + nx ]; // get data
        if (val === _WALL) return;

        // Monster has chance to move every time player moves.
        updateMonster();

        checkMonsterCollision();

        _actor_x = nx; // update actor's xpos
        _actor_y = ny; // and ypos
        _playerMoves++;

        checkMonsterCollision();

        if (_won) return;

        // Move sprite to next position
        PS.spriteMove( _id_sprite, nx, ny );

        // If actor has reached a gold piece, take it

        var ptr = ( _actor_y * _HEIGHT ) + _actor_x; // pointer to map data under actor
        val = _map.data[ ptr ]; // get map data
        if ( val === _GOLD ) {
            _map.data[ ptr ] = _FLOOR; // change gold to floor in map.data
            PS.gridPlane( _PLANE_FLOOR ); // switch to floor plane
            PS.color( _actor_x, _actor_y, _COLOR_FLOOR ); // change visible floor color

            // If last gold has been collected, activate the exit

            _gold_found += 1; // update gold count
            if ( _gold_found >= _gold_count ) {
                _exit_ready = true;
                PS.color( _exit_x, _exit_y, _COLOR_EXIT ); // show the exit
                PS.glyphColor( _exit_x, _exit_y, PS.COLOR_WHITE ); // mark with white X
                PS.glyph( _exit_x, _exit_y, "X" );
                PS.statusText( "Found " + _gold_found + " gold! Exit open!" );
                PS.audioPlay( _SFX_OPEN );
            }

            // Otherwise just update score

            else {
                PS.statusText( "Found " + _gold_found + " gold!" );
                PS.audioPlay( _SFX_GOLD );
            }
        }

        // If exit is ready and actor has reached it, end game

        else if ( _exit_ready && ( _actor_x === _exit_x ) && ( _actor_y === _exit_y ) ) {
            PS.timerStop( _id_timer ); // stop movement timer
            PS.statusText( "You escaped with " + _gold_found + " gold!" );
            PS.audioPlay( _SFX_WIN );
            _won = true;
            PS.gridColor(0, 0, 150)
        }
    };

	var _tick = function () {
		var p, nx, ny;

		updateGold();

		if ( !_path || _won ) { // path invalid (null)?
			return; // just exit
		}

		// Get next point on path

		p = _path[ _step ];
		nx = p[ 0 ]; // next x-pos
		ny = p[ 1 ]; // next y-pos

		// If actor already at next pos,
		// path is exhausted, so nuke it

		if ( ( _actor_x === nx ) && ( _actor_y === ny ) ) {
			_path = null;
			return;
		}

		movePlayer(nx, ny);

		_step += 1; // point to next step

		// If no more steps, nuke path

		if ( _step >= _path.length ) {
			_path = null;
		}
	};

	// Public functions are exposed in the global G object, which is defined here
	// and returned as the value of the IIFE.
	// Only two functions need to be exposed; all other constants, variables and code are encapsulated.
	// So safe. So elegant.

	return {
		// Initialize the game
		// Called once at startup

		init : function () {
			var x, y, val, color;

            _actor_x = 1; // initial x-pos of actor sprite
            _actor_y = 1; // initial y-pos of actor sprite

            monsterX = 10; // initial x-pos of monster
            monsterY = 1; // initial y-pos of monster

			// Establish grid/map dimensions
			// This should always be done FIRST, before any other initialization!

			_map.width = _WIDTH;
			_map.height = _HEIGHT;

			_map.data = _map.initial_data.slice();

			_won = false;

			PS.gridSize( _WIDTH, _HEIGHT );

			// Check for illegal actor/exit locations

			val = _map.data[ ( _actor_y * _HEIGHT ) + _actor_x ]; // get map data under actor
			if ( val !== _FLOOR ) {
				PS.debug( "ERROR: Actor not on empty floor!" );
				PS.audioPlay( _SFX_ERROR );
				return;
			}

			val = _map.data[ ( _exit_y * _HEIGHT ) + _exit_x ]; // get map data at exit position
			if ( val !== _FLOOR ) {
				PS.debug( "ERROR: Exit not on empty floor!" );
				PS.audioPlay( _SFX_ERROR );
				return;
			}

			PS.gridColor( _COLOR_BG ); // grid background color
			PS.border( PS.ALL, PS.ALL, 0 ); // no bead borders
			PS.statusColor( PS.COLOR_WHITE );
			PS.statusText( "Click/touch to move" );

			if (!_musicPlaying) {
                PS.audioPlay(_MUSIC, { path: _AUDIO_PATH, volume: 0.15, loop: true });
                _musicPlaying = true;
            }

			// Use the map.data array to draw the maze
			// This also counts the number of gold pieces that have been placed

			_gold_count = _gold_found = 0;
			for ( y = 0; y < _HEIGHT; y += 1 ) {
				for ( x = 0; x < _WIDTH; x += 1 ) {
					val = _map.data[ ( y * _HEIGHT ) + x ]; // get data
					if ( val === _WALL ) {
						color = _COLOR_WALL;
					}
					else if ( val === _FLOOR ) {
						color = _COLOR_FLOOR;
					}
					else if ( val === _GOLD ) {
						color = _COLOR_GOLD;
						_gold_count += 1; // add to count
					}
					PS.color( x, y, color );
				}
			}

			// Create 1x1 solid sprite for actor
			// Place on actor plane in initial actor position

			_id_sprite = PS.spriteSolid( 1, 1 );
			PS.spriteSolidColor( _id_sprite, _COLOR_ACTOR );
			PS.spritePlane( _id_sprite, _PLANE_ACTOR );
			PS.spriteMove( _id_sprite, _actor_x, _actor_y );

			// Create pathmap from our imageMap
			// for use by pathfinder

			_id_path = PS.pathMap( _map );

			// Start the timer function that moves the actor
			// Run at 10 frames/sec (every 6 ticks)

			_path = null; // start with no path
			_step = 0;
			_id_timer = PS.timerStart( 6, _tick );
			_time = 0;
			_playerMoves = 0;
		},

		// move( x, y )
		// Set up new path for the actor to follow

		move : function ( x, y ) {
			var line;

			// Do nothing if game over

			if ( _won ) {
				return;
			}

			// Use pathfinder to calculate a line from current actor position
			// to touched position

			line = PS.pathFind( _id_path, _actor_x, _actor_y, x, y );

			// If line is not empty, it's valid,
			// so make it the new path
			// Otherwise hoot at the player

			if ( line.length > 0 ) {
				_path = line;
				_step = 0; // start at beginning
				PS.audioPlay( _SFX_FLOOR );
			}
			else {
				PS.audioPlay( _SFX_WALL );
			}
		},

		keyDown : function (key, shift, ctrl, options) {
		    if (key === 32) {
		        if (!_won) {
                    PS.timerStop( _id_timer ); // stop movement timer
                }
                _SFX_GOLD = _SFX_ANNOYING;
		        G.init();
		        return;
            }

		    if (_won) return;

            if (key === PS.KEY_ARROW_LEFT) {
                _path = null;
                movePlayer(_actor_x - 1, _actor_y);
            } else if (key === PS.KEY_ARROW_RIGHT) {
                _path = null;
                movePlayer(_actor_x + 1, _actor_y);
            } else if (key === PS.KEY_ARROW_UP) {
                _path = null;
                movePlayer(_actor_x, _actor_y - 1);
            } else if (key === PS.KEY_ARROW_DOWN) {
                _path = null;
                movePlayer(_actor_x, _actor_y + 1);
            }
        }
	};
} () ); // end of IIFE

// G's two methods are assigned directly to Perlenspiel's event handlers.
// Note that there are no parentheses used in these assignments.
// Including them would CALL the functions and assign their return values to the event handlers.
// That's not what we want! We want the functions THEMSELVES to be assigned to the event handlers.

PS.init = G.init;
PS.touch = G.move;
PS.keyDown = G.keyDown;
