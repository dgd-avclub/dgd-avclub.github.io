// game.js for Perlenspiel 3.3.x
// The following comment lines are for JSHint. Don't remove them!

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

// The G variable encapsulates all app constants, variables and functions, public and private.
// It is initialized on file load with an immediately-invoked function expression (IIFE).

var G = ( function () {
	"use strict";

	// Private constants are all upper-case, with underscore prefix

	var _PLANE_FLOOR = 0; // z-plane of floor
	var _PLANE_ACTOR = 1; // z-plane of actor

	var _COLOR_BG = PS.COLOR_GRAY_DARK; // background color
	var _COLOR_WALL = PS.COLOR_BLACK; // wall color
	var _COLOR_FLOOR = PS.COLOR_GRAY; // floor color
	var _COLOR_GOLD = PS.COLOR_YELLOW; // gold color
	var _COLOR_ACTOR = PS.COLOR_GREEN; // actor color
	var _COLOR_EXIT = PS.COLOR_BLUE; // exit color

	var _SOUND_FLOOR = "fx_click"; // touch floor sound
	var _SOUND_WALL = "fx_hoot"; // touch wall sound
	var _SOUND_GOLD = "fx_coin1"; // take coin sound
	var _SOUND_OPEN = "fx_powerup8"; // open exit sound
	var _SOUND_WIN = "fx_tada"; // win sound
	var _SOUND_ERROR = "fx_uhoh"; // error sound

	var _MAP_WALL = 0; // wall
	var _MAP_FLOOR = 1; // floor
	var _MAP_GOLD = 2; // floor + gold
	var _MAP_ACTOR = 3; // floor + actor
	var _MAP_EXIT = 4; // floor + exit

	var _GOLD_MAX = 10; // maximum gold

	// This imageMap is used for map drawing and pathfinder logic
	// All properties MUST be present!
	// The map.data array controls the layout of the maze,
	// the location of the gold pieces, the actor and the exit
	// 0 = wall, 1 = floor, 2 = floor + gold, 3 = floor + actor, 4 = floor + exit
	// To move a gold piece, swap a 2 with a 1
	// To move the actor's initial position, swap the 3 and a 1
	// To move the exit's position, swap the 4 and a 1
	// You cannot have more than one actor/exit, or more than _GOLD_MAX (10) gold pieces!

	var _MAP = {
		width : 23, height : 23, pixelSize : 1,
		data : [
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 3, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 0, 1, 1, 1, 1, 1, 1, 1, 0,
			0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0,
			0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0,
			0, 1, 1, 1, 1, 1, 0, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0,
			0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0,
			0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 0,
			0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0,
			0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0,
			0, 1, 1, 1, 0, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 1, 0,
			0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 1, 2, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0,
			0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0,
			0, 1, 0, 1, 0, 1, 1, 2, 0, 1, 1, 1, 1, 2, 0, 1, 1, 1, 0, 1, 1, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
			0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 2, 1, 1, 0,
			0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0,
			0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0,
			0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0,
			0, 1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 4, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		]
	};

	// Private constants are all lower-case, with underscore prefix
	// Many JS programmers prefer camelCase for variables, but I think underscores are more readable
	// The compiler doesn't care. Use whatever works for you ... or what your employer demands.

	var _id_sprite; // actor sprite id
	var _id_path; // pathmap id for pathfinder
	var _id_timer; // timer id

	var _gold_count = 0; // initial number of gold pieces in map
	var _gold_found = 0; // gold pieces collected
	var _won = false; // true on win

	// These two variables control the initial location of the actor

	var _actor_x; // initial x-pos of actor sprite
	var _actor_y; // initial y-pos of actor sprite

	// These two variables control the location of the exit

	var _exit_x; // x-pos of exit
	var _exit_y; // y-pos of exit

	var _exit_ready = false; // true when exit is opened

	// Timer function, called every 1/10th sec
	// This moves the actor along paths

	var _path; // path to follow, null if none
	var _step; // current step on path

    var _moves;
    var _stop_time;

    var _map_rotation;

    var _rotation_matrices = [
        [1, 0, // Zero degrees (identity matrix)
         0, 1],

        [0, -1, // 90 degrees
         1,  0],

        [-1,  0, // 180 degrees
          0, -1],

        [ 0, 1, // 270 degrees
         -1, 0]
    ];

    var _do_rotate = function (x, y, rot) {
        x -= Math.floor(_MAP.width / 2);
        y -= Math.floor(_MAP.height / 2);

        var mat = _rotation_matrices[rot];

        var nx = x * mat[0] + y * mat[1] + Math.floor(_MAP.width / 2);
        var ny = x * mat[2] + y * mat[3] + Math.floor(_MAP.height / 2);
        return { x: nx, y: ny };
    };

    // Rotate a point using the current matrix.
    var _rotate = function(x, y) {
        return _do_rotate(x, y, _map_rotation);
    };

    var _unrotate = function(x, y) {
        if (_map_rotation % 2 === 0) {
            return _do_rotate(x, y, _map_rotation);
        } else {
            return _do_rotate(x, y, (_map_rotation + 2) % 4);
        }
    };

    var redraw = function () {
        for (var x = 0; x < _MAP.width; x++) {
            for (var y = 0; y < _MAP.height; y++) {
                var rot = _rotate(x, y);
                var val = _MAP.data[ ( y * _MAP.height ) + x ]; // get map data

                if (_exit_ready && x === _exit_x && y === _exit_y) {
                    PS.color( rot.x, rot.y, _COLOR_EXIT ); // show the exit
                    PS.glyphColor( rot.x, rot.y, PS.COLOR_WHITE ); // mark with white X
                    PS.glyph( rot.x, rot.y, "X" );
                } else {
                    PS.glyph (rot.x, rot.y, PS.DEFAULT);
                    if (val === _MAP_WALL) {
                        PS.color(rot.x, rot.y, _COLOR_WALL);
                    } else if (val === _MAP_FLOOR) {
                        PS.color(rot.x, rot.y, _COLOR_FLOOR);
                    } else if (val === _MAP_GOLD) {
                        PS.color(rot.x, rot.y, _COLOR_GOLD);
                    }
                }
            }
        }
    };

	// This timer function moves the actor

	var _tick = function () {
		var p, nx, ny, ptr, val;

		if ( !_path ) { // path invalid (null)?
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
			_stop_time = new Date().getTime();
			return;
		}

		// Move sprite to next position

        if (_step % 5 === 0) {
            _map_rotation = (_map_rotation + 1) % 4;
            redraw();
        }

        var rot = _rotate(nx, ny);
		PS.spriteMove( _id_sprite, rot.x, rot.y );
		_actor_x = nx; // update actor's xpos
		_actor_y = ny; // and ypos
        _moves++;

		// If actor has reached a gold piece, take it

		ptr = ( _actor_y * _MAP.height ) + _actor_x; // pointer to map data under actor
		val = _MAP.data[ ptr ]; // get map data
		if ( val === _MAP_GOLD ) {
			_MAP.data[ ptr ] = _MAP_FLOOR; // change gold to floor in map.data
			PS.gridPlane( _PLANE_FLOOR ); // switch to floor plane
			PS.color( rot.x, rot.y, _COLOR_FLOOR ); // change visible floor color

			// If last gold has been collected, activate the exit

			_gold_found += 1; // update gold count
			if ( _gold_found >= _gold_count ) {
				_exit_ready = true;
				rot = _rotate(_exit_x, _exit_y);
				PS.color( rot.x, rot.y, _COLOR_EXIT ); // show the exit
				PS.glyphColor( rot.x, rot.y, PS.COLOR_WHITE ); // mark with white X
				PS.glyph( rot.x, rot.y, "X" );
				PS.statusText( "Found " + _gold_found + " gold! Exit open!" );
				PS.audioPlay( _SOUND_OPEN );
			}

			// Otherwise just update score

			else {
				PS.statusText( "Found " + _gold_found + " gold!" );
				PS.audioPlay( _SOUND_GOLD );
			}
		}

		// If exit is ready and actor has reached it, end game

		else if ( _exit_ready && ( _actor_x === _exit_x ) && ( _actor_y === _exit_y ) ) {
			PS.timerStop( _id_timer ); // stop movement timer
			PS.statusText( "You escaped with " + _gold_found + " gold!" );
			PS.audioPlay( _SOUND_WIN );
			_won = true;

            G.shutdown();
			return;
		}

		_step += 1; // point to next step

		// If no more steps, nuke path

		if ( _step >= _path.length ) {
			_path = null;
            _stop_time = new Date().getTime();
		}
	};

	// Public functions are exposed in the global G object, which is returned here.
	// Only two functions need to be exposed; everything else is encapsulated!
	// So safe. So elegant.

	return {
		// Initialize the game
		// Called once at startup

		init : function () {
            PS.dbInit("test");

			var x, y, val;

			// Establish grid size
			// This should always be done FIRST, before any other initialization!

			PS.gridSize( _MAP.width, _MAP.height );
			PS.gridColor( _COLOR_BG ); // grid background color
			PS.border( PS.ALL, PS.ALL, 0 ); // no bead borders

			// Locate positions of actor and exit, count gold pieces, draw map

			_gold_count = 0;
			_actor_x = _exit_x = -1; // mark as not found
            _map_rotation = 0;
			for ( y = 0; y < _MAP.height; y += 1 ) {
				for ( x = 0; x < _MAP.width; x += 1 ) {
					val = _MAP.data[ ( y * _MAP.height ) + x ]; // get map data
					if ( val === _MAP_WALL ) {
						PS.color( x, y, _COLOR_WALL );
					}
					else if ( val === _MAP_FLOOR ) {
						PS.color( x, y, _COLOR_FLOOR );
					}
					else if ( val === _MAP_GOLD ) {
						_gold_count += 1;
						if ( _gold_count > _GOLD_MAX ) {
							PS.debug( "WARNING: More than " + _GOLD_MAX + " gold!\n" );
							PS.audioPlay( _SOUND_ERROR );
							return;
						}
						PS.color( x, y, _COLOR_GOLD );
					}
					else if ( val === _MAP_ACTOR ) {
						if ( _actor_x >= 0 ) {
							PS.debug( "WARNING: More than one actor!\n" );
							PS.audioPlay( _SOUND_ERROR );
							return;
						}
						_actor_x = x;
						_actor_y = y;
						_MAP.data[ ( y * _MAP.height ) + x ] = _MAP_FLOOR; // change actor to floor
						PS.color( x, y, _COLOR_FLOOR );
					}
					else if ( val === _MAP_EXIT ) {
						if ( _exit_x >= 0 ) {
							PS.debug( "WARNING: More than one exit!\n" );
							PS.audioPlay( _SOUND_ERROR );
							return;
						}
						_exit_x = x;
						_exit_y = y;
						_MAP.data[ ( y * _MAP.height ) + x ] = _MAP_FLOOR; // change exit to floor
						PS.color( x, y, _COLOR_FLOOR );
					}
				}
			}

			PS.statusColor( PS.COLOR_WHITE );
			PS.statusText( "Click/touch to move" );

			// Create 1x1 solid sprite for actor
			// Place on actor plane in initial actor position

			_id_sprite = PS.spriteSolid( 1, 1 );
			PS.spriteSolidColor( _id_sprite, _COLOR_ACTOR );
			PS.spritePlane( _id_sprite, _PLANE_ACTOR );
			PS.spriteMove( _id_sprite, _actor_x, _actor_y );

			// Create pathmap from our imageMap
			// for use by pathfinder

			_id_path = PS.pathMap( _MAP );

			// Start the timer function that moves the actor
			// Run at 10 frames/sec (every 6 ticks)

			_path = null; // start with no path
			_step = 0;
			_id_timer = PS.timerStart( 6, _tick );
			_moves = 0;
			_stop_time = new Date().getTime();
		},

		// move( x, y )
		// Set up new path for the actor to follow

		move : function ( x, y ) {
			var line;

			// Do nothing if game over

			if ( _won ) {
				return;
			}

			var t = 0;
			if (!_path) {
			    t = new Date().getTime() - _stop_time;
            }

			// Use pathfinder to calculate a line from current actor position
			// to touched position

            var rot = _unrotate(x, y);
			line = PS.pathFind( _id_path, _actor_x, _actor_y, rot.x, rot.y );

			// If line is not empty, it's valid,
			// so make it the new path
			// Otherwise hoot at the player

			if ( line.length > 0 ) {
				_path = line;
				_step = 0; // start at beginning
				PS.audioPlay( _SOUND_FLOOR );
				PS.dbEvent("test", "click_time", t);
			}
			else {
				PS.audioPlay( _SOUND_WALL );
			}
		},

        shutdown: function (options) {
		    if (PS.dbValid("test")) {
                PS.dbEvent("test", "steps", _moves);
                PS.dbEvent("test", "shutdown", true);
                PS.dbSend("test", "vcmiller");
                PS.dbErase("test");
            }
        }
	};
} () ); // end of IIFE

// The G event handlers take the same parameters as Perlenspiel's event handlers,
// so they can be assigned to those handlers directly.
// Note the LACK of parentheses after G.init and G.move!
// We want to assign the functions themselves, NOT the values returned by calling them!

PS.init = G.init;
PS.touch = G.move;
PS.shutdown = G.shutdown;
