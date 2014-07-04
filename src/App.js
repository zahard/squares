
window.onload = function()
{
	window.game = new Game(800,640,{
		acc: 0.3,
		swapSpeed: 4,
		fastSwapSpeed: 6,
		adviceTimeout: 10000,
		levels:[
			{
				colors: [0,1,2,3,4,5],  // tiles variations 
				winScore: 1500, //Score for winning
				tileScore: 5, //
				sizeX: 8, // Horizontal cells number
				sizeY: 8, // Vertical cells number
				time: 200 // Time for win
			},
			{
				colors: [6,7,8,9],
				tileScore: 5,
				winScore: 2000,
				sizeX: 6,
				sizeY: 6,
				time: 90
			}
		]
	});

	//Fix android browsers bug
	setTimeout(function(){
		game.onResize();
	},100)
}

function Game(width, height,options)
{	

	/**
	* Save link of game instance in Tile class to calculate tile sizes
	*/
	Tile.app = this;

	this.width = width;
	this.height = height;

	for(var opt in options)
	{
		this[opt] = options[opt];
	}

	//game wrapper
	this.wrapper = $('wrapper');
	
	this.offsetTop = this.wrapper.offsetTop;
	this.offsetLeft = this.wrapper.offsetLeft;


	//Canvas layers
	this.layers = {
		back:   new Layer( $('back'), width, height, 1),
		squares:  new Layer( $('squares'), width, height, 2),
		cursor:  new Layer( $('cursor'), width, height, 3)
	};
	
	//Iages and tiles used in game
	this.images = {
		tiles: $('img-tiles')
		
	};

	//YOU CAN KEEP LINKS TO SOUND HERE
	this.sounds = {
		//name: $('id-of-audio'),
	};
	
	//Attach listeners
	this.addListeners();

	//Start game
	this.loadLevel(0);

	//Start game loop
	this.animate();

	this.trigger('gameStart');
}

Game.prototype = {

	/* Current Level */
	level: null,

	/* List of available levels */
	levels: [],

	/* Tile falling accelaration*/
	acc: 0.3,

	/* Swap tiles speed*/
	swapSpeed: 4,

	/**
	* Swap tiles speed when tiles return to previous position 
	* if no combination found
	*/
	fastSwapSpeed: 6,

	/**
	* Seconds of no activity after advice will show
	*/
	adviceTimeout: 10000,



	/**
	* Cells grid width
	*/
	gridWidth: 600,

	/**
	* game cavnas padding
	*/
	padding: 20,

	/**
	* Cell border
	*/
	cellBorder: 1,



	/**
	* Current combo lenght
	*/
	comboSize: 0,

	/**
	* Max combo lenght
	*/
	maxCombo: 0,

	/**
	* Current Scores
	*/
	scores: 0,

	/**
	* User Moves
	*/
	moves: 0,

	/**
	* Cell that hovered now
	*/
	activePoint: {
		x:0, y:0
	},

	/**
	* Active tile
	* Tile become active after first click, 
	* and then we wait for second click to check combinations
	*/
	activeTile: {
		x:-999,
		y:-999
	},

	//backgound colors
	colors: {
		plateA: '#58758c',
		plateB: '#373b5b',
		activeTile: '#fff',
		selectedTile: '#fc0',
		adviceTile: '#5f5'
	},

	/**
	* Columns that will be recalculated in next tick
	*/
	colsToUpdate: [],

	/**
	* Tiles that falling, we need update they speed and position
	*/
	fallingTiles: [],

	/**
	* Tiles that swapping at current moment (or empty if no swap now)
	*/
	swappingTiles: [],

	/**
	* ID of timer to reser it
	*/
	timerTimeout: null,
	
	/**
	* Seconds to finish level
	*/
	timer:0,


	/**
	* This flag used after changing level - to draw 
	* unique tiles, that not affect combo after first appearance
	*/
	startLevelUpdate: false,

	/**
	* Last click time, used for detecting inactive time for showing advice
	*/
	lastAction: new Date().getTime(),

	/**
	* Not random generated tiles for populating level after starting
	*/
	startTiles: [],

	/**
	* List of tiles that we need check for combo
	*/
	checkComboQueue: [],

	/**
	* If combo is running now
	*/
	comboIsRunning: false,

	/**
	* Used for mouse position
	*/
	MOUSE_HOLDED: false,


	events: {
		swapSuccess: function() {
			//Add +1 to user moves after success swap
			this.increaseMoves();

		},

		swapFail: function()
		{

		},

		swapFinish: function()
		{

		},
		
		tilesExplode: function() {

		},

		comboExplode: function() {
			this.comboSize++;
		},

		multiComboEnd: function(comboSize)
		{
			if(comboSize > this.maxCombo)
			{
				this.maxCombo = comboSize;
				this.drawMaxCombo();
			}
		},

		gameStart: function(){

		},

		levelStart: function(){

		},

		scoresAdded: function(){

		},

		timeFinish: function(){

		},

		win: function(){

		}		
	},

	trigger: function()
	{
		var args = Array.prototype.slice.call(arguments);
		var event = args[0];
		if (! event) return;

		if( typeof this.events[event] !== 'undefined')
		{
			this.events[event].call(this, args.slice(1));
		}
	},

	//Add columnto update list
	//Used when some tile explode and we need add new tiles
	//and make fall animation of existing
	updateColsTiles: function(columns)
	{
		var u = {}, uniqueCols = [];
		for (var i = 0, l = columns.length; i < l; ++i){
			if(u.hasOwnProperty(columns[i])) {
				continue;
			}
			uniqueCols.push(columns[i]);
			u[columns[i]] = 1;
		}

		for (var i = 0; i < uniqueCols.length; i++)
		{
			this.colsToUpdate.push(uniqueCols[i]);
		}
	},

	/**
	* Load level 
	*/
	loadLevel: function(levelNum)
	{	
		if (typeof this.levels[levelNum] !== 'undefined')
		{
			this.level = this.levels[levelNum];	
		}
		else
		{
			this.level = this.levels[0];		
		}

		
		this.cellSize = Math.floor(this.gridWidth / this.level.sizeX);
		this.tilePadding = 10;
		this.tileSize = this.cellSize - 2 * this.tilePadding;

		this.colsToUpdate = [];
		this.fallingTiles = [];
		this.swappingTiles = [];
		this.checkComboQueue = [];
		
		this.scores = 0;
		this.moves = 0;
		this.maxCombo = 0;
		this.resetTimer();

		this.drawBackground();
		this.drawScores();
		this.drawMaxCombo();
		this.drawTimer();
		this.drawMoves();
		this.clearTiles();
		this.generateTiles();
		

		this.draw();

		var cols = [];
		for(var i = 0; i < this.level.sizeY;i++)
		{
			cols.push(i);
		}

		this.updateColsTiles(cols);

		this.startLevelUpdate = true;

		this.trigger('levelStart');
	},

	resetTimer: function()
	{
		clearTimeout(this.timerTimeout);
		this.timer = this.level.time;
		this.updateTimer();
	},

	/**
	* Update time for level end
	*/
	updateTimer: function()
	{
		this.timer--;
		if(this.timer < 0)
		{
			this.timer = 0;
			this.trigger('timeFinish');
			return;
		}

		this.drawTimer();

		this.timerTimeout = setTimeout(function(){
			this.updateTimer();
		}.bind(this),1000);
	},

	increaseMoves: function()
	{
		this.moves++;
		this.drawMoves();
	},

	/**
	* Add start tile, and sure that color will not cause combo
	*/
	addStartTile: function(tile)
	{	
		if (typeof this.startTiles[tile.gridX] === 'undefined')
		{
			this.startTiles[tile.gridX] = [];
		}

		var excludedColors = this.getUnsafeColors(tile);
		if( excludedColors.length )
		{
			tile.color = this.generateSafeColor(excludedColors)
		}

		this.startTiles[tile.gridX][tile.gridY] = tile;
	},

	/**
	* Get colors that should not be used for tile to avoid combo
	*/
	getUnsafeColors: function(tile)
	{
		var excluded = [];
		var sx = tile.gridX;
		var sy = tile.gridY;
		var color;
		var leveOne;
		var leveTwo;

		for (var i = 0; i < this.level.colors.length; i++)
		{
			color = this.level.colors[i];
			//go throught 4 directions
			for(var dx = -1; dx <= 1; dx++)
			{
				for(var dy = -1; dy <= 1; dy++)
				{
					if( Math.abs(dy + dx) != 1) continue;

					//Check near tile
					levelOne = this.getStartTile(sx + dx, sy + dy);

					//if itle exists check for color
					if (levelOne && levelOne.color == color){
						//if first ile has same color check 2nd tile
						// maybe it will also the same
						levelTwo = this.getStartTile(sx + dx*2, sy + dy*2);
						if (levelTwo && levelTwo.color == color){
							excluded.push(color);
						}
					}
					
				}
			}
		}

		return excluded;
	},

	/**
	* Get safe color (just diff)
	*/
	generateSafeColor: function(excluded)
	{
		var safeColors = array_diff(this.level.colors,excluded);
		var colorIdx = rand(0,safeColors.length-1);
		return safeColors[colorIdx];
	},

	/**
	* Get start tile (null if not exists yet)
	*/
	getStartTile: function(x,y)
	{	
		if (typeof this.startTiles[x]    !== 'undefined' && 
			typeof this.startTiles[x][y] !== 'undefined')
		{
			return this.startTiles[x][y];
		}

		return null;
	},


	/**
	* Generate tiles for start level without combos
	*/
	generateTiles: function()
	{
		var w = this.level.sizeX;
		var h = this.level.sizeY;
		var x;
		var y;

		if (w % 2 != 0) w++;
		if (h % 2 != 0) h++;

		var base = [
			[w/2-1,h/2-1],
			[w/2-1,h/2],
			[w/2,h/2-1],
			[w/2,h/2]
		];

		//Create base of random tile in map center
		for (var i = 0; i < base.length; i++)
		{
			this.addStartTile(this.generateTile(base[i][0],base[i][1]));
		}

		var max_level = w/2;
		//max_level = 2;
		for (var level = 1; level < max_level; level++)
		{
			
			//Top
			y = h/2-(level+1);
			for(x = w/2-(level); x < w/2 + (level); x++)
			{
				this.addStartTile(this.generateTile(x,y));
			}

			//bottom
			y = h/2+(level);
			for(x = w/2-(level); x < w/2 + (level); x++)
			{
				this.addStartTile(this.generateTile(x,y));
			}

			//left
			x = w/2-(level+1);
			for(y = h/2 - level; y < h/2 + level; y++)
			{
				this.addStartTile(this.generateTile(x,y));
			}

			//right
			x = w/2+(level);
			for(y = h/2 - level; y < h/2 + level; y++)
			{
				this.addStartTile(this.generateTile(x,y));
			}

			//Corners
			y = h/2-(level+1);
			x = w/2-(level+1);
			this.addStartTile(this.generateTile(x,y));

			y = h/2+(level);
			x = w/2+(level);
			this.addStartTile(this.generateTile(x,y));


			y = h/2-(level+1);
			x = w/2+(level);
			this.addStartTile(this.generateTile(x,y));

			y = h/2+(level);
			x = w/2-(level+1);
			this.addStartTile(this.generateTile(x,y));
		}
	},

	/**
	* Make all tiles empty, it will clear level visually
	*/
	clearTiles: function()
	{
		this.tiles = [];
		for (var x = 0; x < this.level.sizeX; x++)
		{
			this.tiles[x] = [];
			for (var y = 0; y < this.level.sizeY; y++)
			{
				this.tiles[x][y] = this.generateEmptyTile(x,y);
			}
		}

	},

	/**
	* Return a tile with random color
	*/
	generateTile: function(x,y)
	{
		var colorIdx = rand(0,this.level.colors.length-1);
		var color = this.level.colors[colorIdx];
		return new Tile(color,x,y);
	},


	/**
	* Return an empty tile
	*/
	generateEmptyTile: function(x,y)
	{
		var t = new Tile(0,x,y);
		t.empty = true;
		return t;
	},


	/**
	* Main game loop function
	*/
	animate: function()
	{
		//Redraw tiles only if update needed
		if (this.update())
		{
			this.draw();
		}

		//If sccores changed from last update - redraw it
		if( this.updateScores)
		{
			this.updateScores = false;
			this.drawScores();
		}

		//Show advice when user not active
		var now = new Date().getTime();
		if( this.lastAction &&  now - this.lastAction > this.adviceTimeout) {
			this.advice();
		}

		setTimeout(function() {
			this.animate();
		}.bind(this),1000/60);
	},


	/**
	* Find how many tiles was exploded in column
	* and needs to be added
	*/
	checkTilesInColumn: function(column, startY, offset)
	{
		var missedTiles = 0;
		for (var y = startY; y >= 0; y--)
		{
			if (column[startY].empty)
			{
				missedTiles++;
				if (typeof column[startY+1] !== 'undefined')
				{
					column[startY+1].gridY += offset + 1;
					missedTiles += this.checkTilesInColumn(column, startY+1, offset+1);
				}
			}
		}
		return missedTiles;
	},


	/**
	* Swap tiles
	*/
	swapTiles: function(tileA, tileB, reverse) {
		if (! tileA || ! tileB) 
		{
			return;
		}

		var y_diff = tileA.gridY - tileB.gridY;
		var x_diff = tileA.gridX - tileB.gridX;

		if (Math.abs(y_diff) + Math.abs(x_diff) == 1)
		{
			var speed = reverse ? this.fastSwapSpeed : this.swapSpeed;
			var tmpX = tileA.gridX;
			var tmpY = tileA.gridY;


			tileA.targetX = tileB.x;
			tileA.targetY = tileB.y;
			tileA.gridX = tileB.gridX;
			tileA.gridY = tileB.gridY;
			tileA.speedX = -x_diff * speed;
			tileA.speedY = -y_diff * speed;


			tileB.targetX = tileA.x;
			tileB.targetY = tileA.y;
			tileB.gridX = tmpX;
			tileB.gridY = tmpY;
			tileB.speedX = x_diff * speed;
			tileB.speedY = y_diff * speed;

			this.swappingTiles = [tileA,tileB];
			this.reverseSwap = reverse ? true : false;

			return true;
		}

		return false;
	},

	/**
	* Check available combo for tile
	*/
	checkForCombo: function(tile, forAdvice)
	{
		var dirs = [
			{x:0,y:1},
			{x:1,y:0}
		];
		var color = tile.adviceColor ? tile.adviceColor : tile.color;
		var d,t,t_color;

		var foundCombos = []

		//Check combos in 4 directions
		for(var i =0; i < dirs.length;i++)
		{
			var comboStep = 1;
			d = dirs[i];

			//Add current tile to tiles used in combo
			var comboTiles = [{
				x:tile.gridX,
				y:tile.gridY
			}];

			while( t = this.getTile(tile.gridX + comboStep*d.x, tile.gridY + comboStep * d.y) )
			{
				t_color = t.adviceColor ? t.adviceColor : t.color;
				if (!t || t.falling || t_color != color)
				{
					break;
				}
				
				comboTiles.push({
					x: tile.gridX + comboStep*d.x,
					y: tile.gridY + comboStep*d.y
				});
				comboStep++;
			}

			//Check in reverse direction
			
			var reverseStep = 1;
			while( t = this.getTile(tile.gridX - reverseStep*d.x, tile.gridY - reverseStep * d.y) )
			{
				t_color = t.adviceColor ? t.adviceColor : t.color;
				if (!t || t.falling || t_color != color)
				{
					break;
				}
				comboTiles.push({
					x: tile.gridX - reverseStep*d.x,
					y: tile.gridY - reverseStep*d.y
				});
				reverseStep++;
			}

			//console.log('We found ' + comboTiles.length + 'similar tile by ' + ((i==0 )? 'vertical': 'horizontal') );

			if( comboTiles.length > 2 ) {
				foundCombos.push(comboTiles)
			}
		}

		if( forAdvice )
		{
			return foundCombos;
		}

		if (foundCombos.length )
		{
			var updateCols = [];

			for(var i = 0; i < foundCombos.length; i++)
			{
				var combo = foundCombos[i];
				var gx,gy;

				for(var c = 0; c < combo.length; c++)
				{
					//Update scores
					this.getTile(combo[c].x, combo[c].y).empty = true;
					this.addScoreForCombo(combo.length);
					updateCols.push(combo[c].x);
				}

				this.trigger('tilesExplode', combo);
			}

			this.trigger('comboExplode', combo);

			this.runCombo();
			this.updateColsTiles(updateCols);

		}

		return foundCombos.length > 0;
		
	},

	
	//Run combo
	runCombo: function()
	{
		this.DISABLE_MOUSE = true;
		this.comboIsRunning = true;
	},

	//Stop combo
	endCombo: function()
	{
		this.comboIsRunning = false;
		this.DISABLE_MOUSE = false;

		//AFter and of comboe we recheck column for new combos
		for(var i=0; i < this.colsToCheck.length; i++)
		{
			this.checkColumnForCombo(this.colsToCheck[i]);
		}

		if( ! this.comboIsRunning) {
			this.trigger('multiComboEnd',this.comboSize);
			this.comboSize = 0;
		}
	},

	/**
	* Check column for new combos
	*/
	checkColumnForCombo: function(x)
	{
		for (var y = this.level.sizeY - 1; y >= 0; y--)
		{
			if( this.checkForCombo(this.getTile(x,y)) )
			{
				break;
			}
		}
	},


	/**
	* Add scores for combo
	* @var comboLength How many tiles was exploded
	*/
	addScoreForCombo: function(comboLength)
	{
		var scoreForTile = this.level.tileScore;
		if (comboLength > 3)
		{
			scoreForTile = Math.round(scoreForTile * comboLength/2);
		}

		this.trigger('scoresAdded');
		this.scores += scoreForTile;

		if (this.scores >= this.level.winScore) {
			this.trigger('win');
		}

		this.updateScores = true;
	},


	/**
	* Calculate and show adviced tile for user
	*/
	advice: function()
	{
		this.hideAdvice();
		for(var x = 0; x < this.level.sizeX; x++)
		{
			for(var y = this.level.sizeY - 1; y >= 0; y--)
			{
				if( this.checkPossibleCombo(x,y) )
				{
					this.showAdvice(x,y);
					return;
				}
			}
		}
	},

	/** Hide advice */
	hideAdvice: function()
	{
		this.drawAdvice = false;
		this.drawActiveTile();
	},

	/** Show advice */
	showAdvice: function(x,y)
	{
		this.drawAdvice = {x:x,y:y};		
		this.drawActiveTile();
	},


	/**
	* Check possible combos for tile
	*/
	checkPossibleCombo: function(x,y)
	{
		var tile = this.getTile(x,y);
		var originColor = tile.color;
		var dx, dy, t;
		var comboA,comboB;

		for(var dx = -1; dx < 1; dx +=1)
		{
			for(var dy = -1; dy <= 1; dy +=1)
			{
				if( Math.abs(dy + dx) != 1)
				{
					continue;
				}

				t = this.getTile(x+dx, y+dy);
				if (t)
				{
					tile.color = t.color;
					t.color = originColor;

					comboA = this.checkForCombo(tile,true);
					comboB = this.checkForCombo(t,true);
					
					t.color = tile.color;
					tile.color = originColor;

					if( comboA.length || comboB.length)
					{
						return true;
					}
				}		
			}	
		}

	},

	onTileFall: function(tile)
	{
		
	},


	/**
	* Get tile by grid position
	*/
	getTile: function(x,y)
	{
		if(typeof this.tiles[x] !== 'undefined' && typeof this.tiles[x][y] !== 'undefined')
		{
			return this.tiles[x][y];
		}
		return null;
	},


	/**
	* Function update current values and check if if need redraw something
	*/
	update: function()
	{

		var needRedraw = false;

		//If we have columns that need to be updated
		if (this.colsToUpdate.length)
		{
			this.colsToUpdate = this.colsToUpdate.sort(function(a,b) {return a - b});
			var x,column;
			for (var j = 0; j < this.colsToUpdate.length; j++)
			{
				//Column where we need update tiles
				x = this.colsToUpdate[j];
				column = this.tiles[x];

				var missedTiles = 0;
				var newColumn = [];
				var firstFallFound = false;
				for (var y = (this.level.sizeY - 1); y >= 0; y--)
				{
					if (column[y].empty)
					{
						missedTiles++;

						if (! firstFallFound) {

							for (var sy = y ; sy >= 0; sy--)
							{
								if ( ! column[sy].empty)
								{
									firstFallFound = true;
									column[sy].falling = true;
									column[sy].speedY = 0;
									break;
								}		
							}
						}

					} else {
						newColumn.push(column[y]);
					}

				}

				var dy = - this.cellSize;
				var newTile;
				for(var y = this.level.sizeY - 1; y >= this.level.sizeY - missedTiles; y--)
				{
					if (!this.startLevelUpdate)
					{
						newTile = this.generateTile(x,y);
					}
					else
					{
						//For init unique tiles
						newTile = this.getStartTile(x,y);
					}

					newTile.y = dy;
					newColumn.push(newTile);
					dy -= this.tileSize; //CHANGE TO VISUAL EFFECT
				}

				newColumn = newColumn.reverse();

				for(var i=0; i < newColumn.length; i++)
				{
					newColumn[i].gridY = i;
				}

				//If whole column is empty make last tile falling
				if( ! firstFallFound && missedTiles) {
					newColumn[missedTiles-1].falling = true;
					newColumn[missedTiles-1].speedY = 0;
					this.fallingTiles.push({
						x:x,
						y:missedTiles-1
					});
				} else {
					for(var sy = 0; sy < this.level.sizeY; sy++){
						if(newColumn[sy].falling){
							this.fallingTiles.push({
								x:x,
								y:sy
							});
						}
					}
				}

				this.tiles[x] = newColumn;
			}

			this.colsToCheck = this.colsToUpdate;
			this.colsToUpdate = [];

			if (this.startLevelUpdate)
			{
				this.startLevelUpdate = false;
			}
		}

		//Check combos
		if (this.checkComboQueue.length )
		{
			for(var i = 0; i < this.checkComboQueue.length; i++)
			{
				this.checkForCombo( this.checkComboQueue[i]);
			}

			this.checkComboQueue = [];
		}

		//Process falling tiles
		if (this.fallingTiles.length)
		{	
			var newFallingTiles = [];
			for (var i = 0; i < this.fallingTiles.length; i++) {

				var pos = this.fallingTiles[i];
				var tile = this.tiles[pos.x][pos.y];
				
				var limitSpeed = this.acc * 5; //CHANGE TO VISUAL EFFECT

				//Check if Y difference is more than defined value
				//next tile start falling too
				if( tile.gridY != 0 && ! tile.foundUpper && tile.speedY >=  limitSpeed) { 
					var upperTile = this.tiles[pos.x][pos.y-1];
					if (typeof upperTile !== 'undefined')
					{
						tile.foundUpper = true;
						upperTile.falling = true;
						upperTile.speedY = 0;
						newFallingTiles.push({
							x: upperTile.gridX,
							y: upperTile.gridY
						});
					}
				}

				tile.speedY += this.acc;

				//Max speed
				if (tile.speedY > 20) {
					tile.speedY = 20;
				}


				tile.y += tile.speedY;
				if (tile.y >= tile.getY())
				{
					tile.y = tile.getY();
					tile.falling = false;
					tile.speedY = 0;
					tile.foundUpper = false;
					//Tile fall
					this.onTileFall(tile);

				} else {
					newFallingTiles.push(pos);
				}

				needRedraw = true;
			}

			this.fallingTiles = newFallingTiles;

			if (newFallingTiles.length == 0)
			{
				this.endCombo();
			}
		}

		//Swapping tiles update
		if (this.swappingTiles.length)
		{	
			var finish = false;
			for(var i = 0; i < 2; i++)
			{
				var tile = this.swappingTiles[i];
				if( tile.speedX != 0 )
				{
					
					tile.x += tile.speedX;
					if (tile.speedX < 0 && tile.x <= tile.targetX ||
						tile.speedX > 0 && tile.x >= tile.targetX )
					{

						tile.x = tile.targetX;
						tile.speedX = 0;
						tile.targetX = 0;
						tile.targetY = 0;
						finish = true;
					}
				}
				else
				{
					tile.y += tile.speedY;
					if (tile.speedY > 0 && tile.y >= tile.targetY  || 
						tile.speedY < 0 && tile.y <= tile.targetY )
					{
						tile.y = tile.targetY;
						tile.speedY = 0;
						tile.targetX = 0;
						tile.targetY = 0;
						finish = true;
					}
				}
			}
			
			if (finish)
			{
				this.trigger('swapFinish');

				var tileA = this.swappingTiles[0];
				var tileB = this.swappingTiles[1];

				this.tiles[tileA.gridX][tileA.gridY] = tileA;
				this.tiles[tileB.gridX][tileB.gridY] = tileB;

				this.swappingTiles = [];
				if( ! this.reverseSwap ) {
					//check for combo here
					//if no combo reverse
					var comboA = this.checkForCombo(tileA);
					var comboB = this.checkForCombo(tileB);
					if(comboA || comboB) {
						this.trigger('swapSuccess');
						if( this.drawAdvice ) {
							this.hideAdvice();
						}

					} else {
						this.trigger('swapFail');
						game.swapTiles(tileB, tileA, true);	
					}
					
					
				}
			}

			needRedraw = true;

		}

		return needRedraw;
	},


	click: function()
	{
		//Disable mouse when falling 
		if (this.DISABLE_MOUSE)
		{
			return;
		}

		if (this.activeTile)
		{

			if (this.selectedTile)
			{
				this.lastAction = new Date().getTime();

				this.swapTiles(
					this.getTile(this.selectedTile.x,this.selectedTile.y),
					this.getTile(this.activeTile.x,this.activeTile.y)
				);

				this.selectedTile = null;
			}
			else
			{
				this.selectedTile = {
					x: this.activeTile.x,
					y: this.activeTile.y
				};
			}

			this.drawActiveTile();
		}
	},

	/**
	* Draw game background
	*/
	drawBackground: function()
	{
		this.layers.back.setProperties({ fillStyle: '#777' });
		this.layers.back.fillRect(
			0,0,this.width,this.height
		);

		//Draw grid background
		this.layers.back.setProperties({ fillStyle: this.colors.plateA });
		this.layers.back.fillRect(
			this.padding, this.padding,
			this.gridWidth, this.gridWidth
		);

		
		//Draw cells
		this.layers.back.setProperties({ fillStyle: this.colors.plateB });
		for(var x = 0; x < this.level.sizeX; x++)
		{
			for(var y = 0; y < this.level.sizeY; y++)
			{
				this.layers.back.fillRect(
					this.padding + x * this.cellSize + this.cellBorder, 
					this.padding + y * this.cellSize + this.cellBorder,
					this.cellSize - this.cellBorder * 2,
					this.cellSize - this.cellBorder * 2
				);
			}
		}

	},


	/**
	* Draw tile
	*/
	drawTile: function(x,y)
	{
		var tile = this.tiles[x][y];
		if (tile.empty)
		{
			return;
		}

		/**
		* For drawing tile you shoud add 
		* 100x100 image in availbale tiles image
		* and it position will be COLOR
		*/
		this.layers.squares.drawImage(
			this.images.tiles,
			100 * tile.color, 0,
			100, 100,
			tile.x, tile.y,
			this.tileSize, this.tileSize
		);

	},

	/**
	* Draw tiles on grid
	*/
	draw: function()
	{
		var tile;
		this.layers.squares.empty();
		for(var x =0; x < this.level.sizeX; x++)
		{
			for(var y = 0; y < this.level.sizeY; y++)
			{
				this.drawTile(x,y);
			}
		}
	},


	/**
	* Draw active tile, selected tile and advice tile
	*/
	drawActiveTile: function() {
		
		this.layers.cursor.empty();

		if( this.drawAdvice ) {
			this.layers.cursor.setProperties({ fillStyle: this.colors.adviceTile });
			this.layers.cursor.fillRect(
				this.padding + this.drawAdvice.x * this.cellSize,
				this.padding + this.drawAdvice.y * this.cellSize,
				this.cellSize,this.cellSize
			);

			this.layers.cursor.clearRect(
				this.padding + this.drawAdvice.x * this.cellSize + 5,
				this.padding + this.drawAdvice.y * this.cellSize + 5,
				this.cellSize - 10,this.cellSize - 10
			);
		}

		if( this.selectedTile ) {
			this.layers.cursor.setProperties({ fillStyle: this.colors.selectedTile });
			this.layers.cursor.fillRect(
				this.padding + this.selectedTile.x * this.cellSize,
				this.padding + this.selectedTile.y * this.cellSize,
				this.cellSize,this.cellSize
			);

			this.layers.cursor.clearRect(
				this.padding + this.selectedTile.x * this.cellSize + 5,
				this.padding + this.selectedTile.y * this.cellSize + 5,
				this.cellSize - 10,this.cellSize - 10
			);
		}

		if( this.activeTile ) {
			this.layers.cursor.setProperties({ fillStyle: this.colors.activeTile });
			this.layers.cursor.fillRect(
				this.padding + this.activeTile.x * this.cellSize,
				this.padding + this.activeTile.y * this.cellSize,
				this.cellSize,this.cellSize
			);

			this.layers.cursor.clearRect(
				this.padding + this.activeTile.x * this.cellSize + 5,
				this.padding + this.activeTile.y * this.cellSize + 5,
				this.cellSize - 10,this.cellSize - 10
			);
		}
	},

	/**
	* Update scores in HMTL
	*/
	drawScores: function()
	{
		$('scores-value').innerHTML = this.scores
	},

	/**
	* Update timer in HMTL
	*/
	drawTimer: function()
	{

		$('timer-value').innerHTML = this.formatTime(this.timer);
	},

	/**
	* Update moves in HMTL
	*/
	drawMoves: function()
	{

		$('moves-value').innerHTML = this.moves;
	},

	/**
	* Update combo in HMTL
	*/
	drawMaxCombo: function()
	{

		$('combo-value').innerHTML = this.moves;
	},

	/**
	* Format seconds to readable format
	*/
	formatTime: function(time)
	{
		var t = Math.floor(time/60) + ':';
		var min = (time%60);
		if (min < 10)
		{
			min = '0' + min
		}
		return t + min;
	},

	/**
	* Add listeners for game engine
	*/
	addListeners: function()
	{	
		
		this.wrapper.addEventListener('mousedown',function(e) {
			this.updateActivePoint(e);
			this.MOUSE_HOLDED = true;

			this.click();
			
		}.bind(this));

		this.wrapper.addEventListener('mousemove',function(e){
			this.updateActivePoint(e);
		}.bind(this));

		this.wrapper.addEventListener('mouseup',function(e){
			this.MOUSE_HOLDED = false;
		}.bind(this));

		//Touch events
		this.wrapper.addEventListener('touchstart',function(e) {
			this.updateActivePoint(e.touches[0]);
			this.MOUSE_HOLDED = true;
			
		}.bind(this));

		this.wrapper.addEventListener('touchmove',function(e){
			e.preventDefault();
			this.updateActivePoint(e.touches[0]);
		}.bind(this));

		this.wrapper.addEventListener('touchend',function(e){
			this.MOUSE_HOLDED = false;
		}.bind(this));

		this.wrapper.addEventListener('touchcancel',function(e){
			this.MOUSE_HOLDED = false;
		}.bind(this));


		window.addEventListener('resize', function(){
			this.onResize();
		}.bind(this), false);

		window.addEventListener('orientationchange', function(){
			this.onResize();
		}.bind(this), false);

		//Fullscren button click
		this.wrapper.addEventListener('click',function(e){
			
		}.bind(this));

	},

	/**
	* Update active point after cursor position change
	*/
	updateActivePoint: function(e)
	{
		//Calculate ratio to allow resize canvas and keep track right mouse position related canvas
		var ratioX = this.wrapper.clientWidth / this.width;
		var ratioY = this.wrapper.clientHeight / this.height;
		this.activePoint.x =  Math.floor( (e.pageX - this.offsetLeft) / ratioX);
		this.activePoint.y =  Math.floor( (e.pageY - this.offsetTop)  / ratioY);

		
		var	x =  Math.floor( (this.activePoint.x - this.padding ) / this.cellSize );
		var y =  Math.floor( (this.activePoint.y - this.padding ) / this.cellSize );


		var newActiveTile;
		if( x > this.level.sizeX - 1 || y > this.level.sizeY - 1 || x < 0 || y < 0) {
			newActiveTile  = {
				x: -999,
				y: -999
			};
		} else {
			newActiveTile  = {
				x: x,
				y: y
			};
		}

		if (this.activeTile.x != newActiveTile.x || this.activeTile.y != newActiveTile.y)
		{
			this.activeTile = newActiveTile;
			this.drawActiveTile();
		}

	},

	/**
	* onResize callback
	*/
	onResize: function()
	{

		var widthToHeight = 5/4;
		var newWidth = window.innerWidth;
		var newHeight = window.innerHeight;

		var newWidthToHeight = newWidth / newHeight;

		if (newWidthToHeight > widthToHeight) {
			newWidth = newHeight * widthToHeight;
			this.wrapper.style.height = newHeight + 'px';
			this.wrapper.style.width = newWidth + 'px';
		} else {
			newHeight = newWidth / widthToHeight;
			this.wrapper.style.width = newWidth + 'px';
			this.wrapper.style.height = newHeight + 'px';
		}

		this.wrapper.style.marginTop = (-newHeight / 2) + 'px';
		this.wrapper.style.marginLeft = (-newWidth / 2) + 'px';


		$('el-timer').style.fontSize  = (newWidth * 0.04) + 'px';
		$('el-scores').style.fontSize = (newWidth * 0.04) + 'px';
		$('el-moves').style.fontSize  = (newWidth * 0.04) + 'px';
		$('el-combo').style.fontSize  = (newWidth * 0.04) + 'px';

		this.offsetTop = this.wrapper.offsetTop;
		this.offsetLeft = this.wrapper.offsetLeft;

	}

};