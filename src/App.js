
window.onload = function()
{
	window.game = new Game(800,640);

	//Fix android browsers bug
	setTimeout(function(){
		//game.onResize();	
	},100)
}

function Game(width, height)
{
	this.width = width;
	this.height = height;

	this.wrapper = $('wrapper');
	
	this.offsetTop = this.wrapper.offsetTop;
	this.offsetLeft = this.wrapper.offsetLeft;

	this.layers = {
		back:   new Layer( $('back'), width, height, 1),
		squares:  new Layer( $('squares'), width, height, 2),
		cursor:  new Layer( $('cursor'), width, height, 3),
		scores:  new Layer( $('scores'), width, height, 2),
		timer:  new Layer( $('timer'), width, height, 2)
	};
	
	//Iages and tiles used in game
	this.images = {
		tiles: $('img-tiles'),
		
	};

	//YOU CAN KEEP LINKS TO SOUND HERE
	this.sounds = {
		//name: $('id-of-audio'),
	};
	

	this.drawBackground();

	this.addListeners();


	this.loadLevel(0);

	

	this.animate();
}

Game.prototype = {

	colors: {
		plateA: '#58758c',
		//plateB: '#a3bbe0',
		plateB: '#373b5b'
	},

	level: null,

	levels: [
		{
			colors: [0,1,2,3,4,5],
			tileScore: 5,
			size: 8,
			time:200
		},
		{
			colors: [4,5,6,7,8,9],
			tileScore: 5,
			size: 8,
			time:90
		}
	],

	acc: 0.3,

	swapSpeed: 4,

	fastSwapSpeed: 6,

	scores: 0,

	activePoint: {
		x:0, y:0
	},

	activeTile: {
		x:-999,
		y:-999
	},

	lastFalled: null,

	allFalls: false,

	MOUSE_HOLDED: false,

	colsToUpdate: [],

	fallingTiles: [],

	swappingTiles: [],

	timerTimeout: null,
	
	timer:0,

	lastAction: new Date().getTime(),

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

		this.resetTimer();

		this.drawScores();
		this.drawTimer();
		this.generateTiles();
		this.updateColsTiles([0,1,2,3,4,5,6,7]);
	},

	resetTimer: function()
	{
		this.timer = this.level.time;
		this.updateTimer();
	},

	updateTimer: function()
	{
		this.timer--;
		if(this.timer < 0)
		{
			this.timer = 0;
			//Trigger fiish time
		}

		this.drawTimer();

		this.timerTimeout = setTimeout(function(){
			this.updateTimer();
		}.bind(this),1000);
	},

	generateTiles: function()
	{
		this.tiles = [];
		for (var x=0;x<8;x++)
		{
			this.tiles[x] = [];
			for (var y=0;y<8;y++)
			{
				this.tiles[x][y] = this.generateEmptyTile(x,y);
			}
		}

	},

	generateTile: function(x,y)
	{
		var colorIdx = rand(0,this.level.colors.length-1);
		var color = this.level.colors[colorIdx];
		return new Tile(color,x,y);
	},

	generateEmptyTile: function(x,y)
	{
		var t = new Tile(0,x,y);
		t.empty = true;
		return t;
	},


	animate: function()
	{
		if (this.update())
		{
			this.draw();
		}

		if( this.updateScores)
		{
			this.updateScores = false;
			this.drawScores();
		}

		var now = new Date().getTime();
		//10 sec timeout for advice
		if( this.lastAction &&  now - this.lastAction > 10000) {
			this.advice();
		}

		setTimeout(function() {
			this.animate();
		}.bind(this),1000/60);
	},

	checkTilesInColumn: function(column, startY, offset)
	{
		var missedTiles = 0;
		for (var y=startY;y>=0;y--)
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


	swapTiles: function(tileA, tileB, reverse) {
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


	checkComboQueue: [],

	checkForCombo: function(tile, forAdvice)
	{
		// if( this.comboIsRunning ) {
		// 	this.checkComboQueue.push(tile);
		// 	return;
		// }

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
				y:tile.gridY,
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
			}

			this.runCombo();
			this.updateColsTiles(updateCols);

		}

		return foundCombos.length > 0;
		
	},

	comboIsRunning: false,

	runCombo: function()
	{
		console.log('RUN COMBO')
		this.DISABLE_MOUSE = true;
		this.comboIsRunning = true;
	},

	endCombo: function()
	{
		console.log('END COMBO')
		for(var i=0; i<this.colsToCheck.length;i++)
		{
			this.checkColumnForCombo(this.colsToCheck[i]);
		}

		this.DISABLE_MOUSE = false;
		this.comboIsRunning = false;
	},

	checkColumnForCombo: function(x)
	{
		for (var y = 7; y >= 0; y--)
		{
			if( this.checkForCombo(this.getTile(x,y)) )
			{
				break;
			}
		}
	},

	addScoreForCombo: function(comboLength)
	{
		var scoreForTile = this.level.tileScore;
		if (comboLength > 3)
		{
			scoreForTile = Math.round(scoreForTile * comboLength/2);
		}

		this.scores += scoreForTile;
		this.updateScores = true;
	},

	advice: function()
	{
		this.hideAdvice();
		for(var x = 0; x < 8; x++)
		{
			for(var y = 7; y >= 0; y--)
			{
				if( this.checkPossibleCombo(x,y) )
				{
					//console.log('Advice is ' + x +' '+y)
					this.showAdvice(x,y);
					return;
				}
			}
		}
	},

	hideAdvice: function()
	{
		this.drawAdvice = false;
		this.drawActiveTile();
	},

	showAdvice: function(x,y)
	{
		this.drawAdvice = {x:x,y:y};		
		this.drawActiveTile();
	},

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
				if(t) {
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
		//console.log(tile)
		
		//this.checkComboQueue.push(tile)
		
		//this.checkForCombo(tile);
	},

	getTile: function(x,y)
	{
		if(typeof this.tiles[x] !== 'undefined' && typeof this.tiles[x][y] !== 'undefined')
		{
			return this.tiles[x][y];
		}
		return null;
	},

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
				for (var y = 7 ; y >= 0; y--)
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

				//var missedTiles = this.checkTilesInColumn(column,7,0);
				var dy = - 75;
				var newTile;
				for(var y = 7; y >= 8 - missedTiles; y--)
				{
					newTile = this.generateTile(x,y);
					newTile.y = dy;
					newColumn.push(newTile);
					dy -= 55;
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
					for(var sy = 0; sy < 8; sy++){
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
		}


		if (this.checkComboQueue.length )
		{
			for(var i = 0; i < this.checkComboQueue.length; i++)
			{
				console.log('Check combo for queue ' + this.checkComboQueue[i].gridX + ' ' + this.checkComboQueue[i].gridY);
				this.checkForCombo( this.checkComboQueue[i]);
			}

			this.checkComboQueue = [];
		}

		if (this.fallingTiles.length)
		{	
			var newFallingTiles = [];
			for (var i = 0; i < this.fallingTiles.length; i++) {

				var pos = this.fallingTiles[i];
				var tile = this.tiles[pos.x][pos.y];
				
				//console.log()

				//Check if Y difference is more than defined value
				//next tile start falling too
				if( tile.gridY != 0 && ! tile.foundUpper && tile.speedY >= this.acc * 5 ) {
					var upperTile = this.tiles[pos.x][pos.y-1];
					if (typeof upperTile !== 'undefined')
					{
						tile.foundUpper = true;
						upperTile.falling = true;
						upperTile.speedY = 0;
						newFallingTiles.push({
							x: upperTile.gridX,
							y: upperTile.gridY,
						});
					}
				}

				tile.speedY += this.acc;

				//Max spped
				if (tile.speedY > 20) {
					tile.speedY = 20;
				}


				tile.y += tile.speedY;
				if (tile.y >= tile.gridY * 75 + 30)
				{
					tile.y = tile.gridY * 75 + 30;
					tile.falling = false;
					tile.speedY = 0;
					tile.foundUpper = false;

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
						if( this.drawAdvice ) {
							this.hideAdvice();
						}

					} else {
						game.swapTiles(tileB, tileA, true);	
					}
					
					
				}
			}

			needRedraw = true;

		}

		

		return needRedraw;

//		if (this.MOUSE_HOLDED)
//		{
//			return true;
//		}
	},


	click: function()
	{
		//Disable mouse when falling 
		if (this.DISABLE_MOUSE)
		{
			return;
		}

		if(this.activeTile) {

			if( this.selectedTile ) {
				
				this.lastAction = new Date().getTime();

				this.swapTiles(
					this.getTile(this.selectedTile.x,this.selectedTile.y),
					this.getTile(this.activeTile.x,this.activeTile.y)
				);

				this.selectedTile = null;

				console.log('swap check for combo and reverse if no')

			} else {
				this.selectedTile = {
					x: this.activeTile.x,
					y: this.activeTile.y
				}
			}

			this.drawActiveTile();

			//this.tiles[this.activeTile.x][this.activeTile.y].empty = true;	
			//this.updateColsTiles([this.activeTile.x]);
		}
	},

	
	drawBackground: function()
	{
		//Draw levelx
		this.layers.back.setProperties({ fillStyle: '#777' });
		this.layers.back.fillRect(
			0,0,this.width,this.height
		);

		this.layers.back.setProperties({ fillStyle: this.colors.plateA });
		this.layers.back.fillRect(
			20,20,600,600
		);

		this.layers.back.setProperties({ fillStyle: this.colors.plateB });
		for(var x = 0; x < 8; x++)
		{
			for(var y = 0; y < 8; y++)
			{
				
				this.layers.back.fillRect(
					21 + x * 75, 21 + y * 75,
					73,73
				);
				
			}
		}

	},

	drawTile: function(x,y)
	{
		var tile = this.tiles[x][y];
		if (tile.empty)
		{
			return;
		}

		this.layers.squares.drawImage(
			this.images.tiles,
			100 * tile.color, 0,
			100, 100,
			tile.x, tile.y,
			55, 55
		);

	},

	draw: function()
	{
		var tile;
		this.layers.squares.empty();
		for(var x =0; x < 8; x++)
		{
			for(var y = 0; y < 8; y++)
			{
				this.drawTile(x,y);
			}
		}
	},

	drawActiveTile: function() {
		
		this.layers.cursor.empty();

		if( this.drawAdvice ) {
			this.layers.cursor.setProperties({ fillStyle: '#5F5' });
			this.layers.cursor.fillRect(
				20+75*this.drawAdvice.x, 20 + 75*this.drawAdvice.y,75,75
			);

			this.layers.cursor.clearRect(
				25+75*this.drawAdvice.x, 25 + 75*this.drawAdvice.y,65,65
			);
		}

		if( this.selectedTile ) {
			this.layers.cursor.setProperties({ fillStyle: '#fc0' });
			this.layers.cursor.fillRect(
				20+75*this.selectedTile.x, 20 + 75*this.selectedTile.y,75,75
			);

			this.layers.cursor.clearRect(
				25+75*this.selectedTile.x, 25 + 75*this.selectedTile.y,65,65
			);
		}


		


		if( this.activeTile ) {
			this.layers.cursor.setProperties({ fillStyle: '#fff' });
			this.layers.cursor.fillRect(
				20+75*this.activeTile.x, 20 + 75*this.activeTile.y,75,75
			);

			this.layers.cursor.clearRect(
				25+75*this.activeTile.x, 25 + 75*this.activeTile.y,65,65
			);
		}
	},


	drawScores: function()
	{
		this.layers.scores.empty();
		
		this.layers.scores.setProperties({
			font: 'bold 30px Arial',
			fillStyle: 'yellow'
		});

		this.layers.scores.fillText('Scores',650,150);

		this.layers.scores.setProperties({
			font: 'bold 40px Arial',
			fillStyle: '#fff'
		});

		this.layers.scores.fillText(this.scores,650,200);
	},

	drawTimer: function()
	{
		this.layers.timer.empty();
		this.layers.timer.setProperties({
			font: 'bold 30px Arial',
			fillStyle: 'yellow'
		});

		this.layers.timer.fillText('Time',650,70);

		this.layers.timer.setProperties({
			font: 'bold 40px Arial',
			fillStyle: '#fff'
		});

		this.layers.timer.fillText(this.formatTime(this.timer),650,110);
	},

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

	updateActivePoint: function(e)
	{
		//Calculate ratio to allow resize canvas and keep track right mouse position related canvas
		var ratioX = this.wrapper.clientWidth / this.width;
		var ratioY = this.wrapper.clientHeight / this.height;
		this.activePoint.x =  Math.floor( (e.pageX - this.offsetLeft) / ratioX);
		this.activePoint.y =  Math.floor( (e.pageY - this.offsetTop)  / ratioY);

		
		var	x =  Math.floor( (this.activePoint.x - 20 ) / 75 );
		var y =  Math.floor( (this.activePoint.y - 20 ) / 75 );


		var newActiveTile;
		if( x > 7 || y > 7 || x < 0 || y < 0) {
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

	onResize: function()
	{

		this.offsetTop = this.wrapper.offsetTop;
		this.offsetLeft = this.wrapper.offsetLeft;

	},

	win: function()
	{
		
	}

};