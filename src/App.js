
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
	};
	
	//Iages and tiles used in game
	this.images = {
		tiles: $('img-tiles'),
		
	};

	//YOU CAN KEEP LINKS TO SOUND HERE
	this.sounds = {
		//name: $('id-of-audio'),
	};
	

	this.loadLevel(0);

	this.addListeners();

	this.drawBackground();

	this.diff = 0;

	this.generateTiles();

	this.acc = 0.5;

	this.updateColsTiles([0,1,2,3,4,5,6,7]);

	this.animate();
}

Game.prototype = {

	colors: {
		plateA: '#58758c',
		//plateB: '#a3bbe0',
		plateB: '#373b5b'
	},

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

	//Add columnto update list
	//Used when some tile explode and we need add new tiles
	//and make fall animation of existing
	updateColsTiles: function(columns)
	{
		for (var i = 0; i < columns.length; i++)
		{
			this.colsToUpdate.push(columns[i]);
		}
	},

	loadLevel: function(levelNum)
	{	
		
	},

	animate: function()
	{
		if (this.update())
		{
			this.draw();
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


	update: function()
	{

		var needRedraw = false;

		//If we have columns that need to be updated
		if (this.colsToUpdate.length)
		{
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
				if( ! firstFallFound) {
					newColumn[7].falling = true;
					this.fallingTiles.push({
						x:x,
						y:7
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


				console.log(newColumn)

				this.tiles[x] = newColumn;
			}

			this.colsToUpdate = [];
		}


		var newFallingTiles = [];
		if (this.fallingTiles.length)
		{	
			for (var i = 0; i < this.fallingTiles.length; i++) {
				var pos = this.fallingTiles[i];
				var tile = this.tiles[pos.x][pos.y];
				


				//Check if Y difference is more than defined value
				//next tile start falling too
				if( ! tile.foundUpper && tile.speedY >= this.acc * 5 ) {
					var upperTile = this.tiles[pos.x][pos.y-1];
					if (typeof upperTile !== 'undefined')
					{
						tile.foundUpper = true;
						upperTile.falling = true;
						newFallingTiles.push({
							x: upperTile.gridX,
							y: upperTile.gridY,
						});
					}
				}

				tile.speedY += this.acc;
				tile.y += tile.speedY;
				if (tile.y >= tile.gridY * 75 + 30)
				{
					tile.y = tile.gridY * 75 + 30;
					tile.falling = false;
					tile.speedY = 0;
					tile.foundUpper = false;
				} else {
					newFallingTiles.push(pos);
				}

				needRedraw = true;
			}
		}

		this.fallingTiles = newFallingTiles;



		return needRedraw;

//		if (this.MOUSE_HOLDED)
//		{
//			return true;
//		}
	},


	click: function()
	{
		if(this.activeTile) {
			this.tiles[this.activeTile.x][this.activeTile.y].empty = true;
			this.updateColsTiles([this.activeTile.x]);
		}
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
		return new Tile(rand(0,5),x,y);
	},

	generateEmptyTile: function(x,y)
	{
		var t = new Tile(0,x,y);
		t.empty = true;
		return t;
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