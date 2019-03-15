// game.js for Perlenspiel 3.3.x
// The following comment lines are for JSHint. Don't remove them!

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

// This immediately-invoked function expression (IIFE) encapsulates all game functionality.
// It is called as this file is loaded, and initializes the G variable.
// The object established in G by the IIFE will contain all public constants, variables and functions.


// Aidan Sensiba
// The AV Club
// Mod 1: Movement speed of player bead increased a lot.
// Mod 2: Fade trail added behind player when moving.
// Mod 3: Slightly changed layout of maze.
// Mod 4: Changed shape and color of collectible "orb" beads.
// Mod 5: Changed background and floor color.
// Mod 6: Changed clicking sound effects.
// Mod 7: A harpsichord plays each time you gather an orb, and the pitch gradually goes up the musical scale.
// Mod 8: Changed the messages that show up while collecting.
// Mod 9: At the exit, a chord of three notes now plays.
// Mod 10: Also, the exit now flashes in different colors.




var P = {
	scalePenta: [1, 3, 5, 8, 10],                                 // ***************CHANGED**************
}


var G = ( function () {
	"use strict";

	// All internal variable and function names begin with an underscore.
	// Constants are in all upper-case.


	var _WIDTH = 21; // grid width
	var _HEIGHT = 21; // grid height

	var _PLANE_FLOOR = 0; // z-plane of floor
	var _PLANE_ACTOR = 1; // z-plane of actor

	var _COLOR_BG = 0x163d22; // background color (Perlenspiel gray)
	var _COLOR_WALL = 0x1b601f; // wall color
	var _COLOR_FLOOR = 0x163d22; // floor color
	var _COLOR_ACTOR = PS.COLOR_WHITE; // actor color
	var _COLOR_GOLD = 0x3dbbff; // gold color
	var _COLOR_EXIT = PS.COLOR_YELLOW; // exit color

	var _SFX_FLOOR = "fx_bloop"; // touch floor sound
	var _SFX_WALL = "fx_squawk"; // touch wall sound
	var _SFX_GOLD = "fx_powerup5"; // take coin sound
	var _SFX_OPEN = "fx_powerup7"; // open exit sound
	var _SFX_WIN = "fx_tada"; // win sound
	var _SFX_ERROR = "fx_uhoh"; // error sound

	var _WALL = 0; // wall
	var _FLOOR = 1; // floor
	var _GOLD = 2; // floor + gold

	// Variables

	var _id_sprite; // actor sprite id
	var _id_path; // pathmap id for pathfinder
	var _id_timer; // timer id

	var _gold_count; // initial number of gold pieces in map
	var _gold_found; // gold pieces collected
	var _won = false; // true on win

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
		data: [
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			0, 1, 1, 1, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0,
			0, 1, 1, 1, 2, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 2, 1, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
			0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
			0, 1, 0, 0, 1, 2, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0,
			0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 2, 0,
			0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
			0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0,
			0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
			0, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0,
			0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
		]
	};

	// These two variables control the initial location of the actor
	// This location MUST correspond to a floor location (1) in the maza.data array
	// or a startup error will occur!

	var _actor_x = 1; // initial x-pos of actor sprite
	var _actor_y = 1; // initial y-pos of actor sprite

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


	var _flash = function () {

		if (PS.color(_exit_x, _exit_y) == _COLOR_EXIT)
			PS.color( _exit_x, _exit_y, _COLOR_ACTOR ); // show the exit                                 // ***************CHANGED**************
		else
			PS.color( _exit_x, _exit_y, _COLOR_EXIT ); // show the exit
		return;

	};

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
			return;
		}

		// Move sprite to next position

		PS.fade( nx, ny, 0 );                                   // ***************CHANGED**************

		PS.spriteMove( _id_sprite, nx, ny );
		_actor_x = nx; // update actor's xpos
		_actor_y = ny; // and ypos

		PS.fade( PS.ALL, PS.ALL, 3);                                    // ***************CHANGED**************


		// If actor has reached a gold piece, take it

		ptr = ( _actor_y * _HEIGHT ) + _actor_x; // pointer to map data under actor
		val = _map.data[ ptr ]; // get map data
		if ( val === _GOLD ) {
			_map.data[ ptr ] = _FLOOR; // change gold to floor in map.data
			PS.gridPlane( _PLANE_FLOOR ); // switch to floor plane
			PS.color( _actor_x, _actor_y, _COLOR_FLOOR ); // change visible floor color

			PS.radius( _actor_x, _actor_y, 0 );                                    // ***************CHANGED**************

			// If last gold has been collected, activate the exit

			_gold_found += 1; // update gold count
			if ( _gold_found >= _gold_count ) {

				if (!_exit_ready)
					var timerflash = PS.timerStart(30, _flash);                                // ***************CHANGED**************

				_exit_ready = true;


				PS.glyphColor( _exit_x, _exit_y, PS.COLOR_BLACK ); // mark with white X
				PS.glyph( _exit_x, _exit_y, "X" );
				PS.statusText( "All orbs collected. Proceed to the exit." );
				PS.audioPlay( PS.harpsichord( 12 * Math.floor((_gold_found/5)) + P.scalePenta[_gold_found%5] + 12 ) );                                    // ***************CHANGED**************
			}

			// Otherwise just update score

			else {
				if (_gold_found < _gold_count - 1) {
					var gg = _gold_count - _gold_found;
					PS.statusText("You must gather " + gg + " more orbs.");
				}
				else
					PS.statusText( "You must gather 1 more orb." );
				PS.audioPlay( PS.harpsichord( 12 * Math.floor((_gold_found/5)) + P.scalePenta[_gold_found%5] + 12 ) );                                    // ***************CHANGED**************
			}
		}

		// If exit is ready and actor has reached it, end game

		else if ( _exit_ready && ( _actor_x === _exit_x ) && ( _actor_y === _exit_y ) ) {
			PS.timerStop( _id_timer ); // stop movement timer
			PS.statusText( "Congrats! You got a bunch of useless orbs." );
			for (var i = _gold_count-3; i < _gold_count; i++) {
				PS.audioPlay(PS.harpsichord(12 * Math.floor((i / 5)) + P.scalePenta[i % 5] + 12));                                    // ***************CHANGED**************
			}
			_won = true;
			return;
		}

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

			// Establish grid/map dimensions
			// This should always be done FIRST, before any other initialization!

			_map.width = _WIDTH;
			_map.height = _HEIGHT;

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

						PS.radius( x, y, 50 );                                    // ***************CHANGED**************
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
			_id_timer = PS.timerStart( 1, _tick );  // now faster                   //************CHANGED**************
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
		}
	};
} () ); // end of IIFE

// G's two methods are assigned directly to Perlenspiel's event handlers.
// Note that there are no parentheses used in these assignments.
// Including them would CALL the functions and assign their return values to the event handlers.
// That's not what we want! We want the functions THEMSELVES to be assigned to the event handlers.

PS.init = G.init;
PS.touch = G.move;
