
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
		squares:  new Layer( $('squares'), width, height, 2)
	};
	
	//Iages and tiles used in game
	this.tiles = {
		//back: $('img-back'),
		
	};

	//YOU CAN KEEP LINKS TO SOUND HERE
	this.sounds = {
		//name: $('id-of-audio'),
	};
	

	this.loadLevel(0);

	//this.addListeners();

	this.drawBackground();

	this.diff = 0;

	this.tiles = [
		{
			i:0,
			falling:false,
			posX: 2,
			posY: 7,
			x: 105,
			y: 30+150,
			color:'#ff0',
			speed:0,
			acc:0.4
		},{
			i:1,
			falling:false,
			posX: 2,
			posY: 6,
			x: 105,
			y: 30+75,
			color:'#f0f',
			speed:0,
			acc:0.4
		},{
			i:2,
			falling:false,
			posX: 2,
			posY: 5,
			x: 105,
			y: 30,
			color:'#fff',
			speed:0,
			acc:0.4
		}
	];
	this.acc = 0.5;

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

	lastFalled: null,

	allFalls: false,

	MOUSE_HOLDED: false,

	loadLevel: function(levelNum)
	{	
		
	},

	animate: function()
	{
		if (this.update())
		{
			this.draw();
		}

		setTimeout(function(){
			this.animate();
		}.bind(this),1000/60);
	},

	update: function()
	{

		var needRedraw = false;

		if (!this.allFalls)
		{
			//Check maybe next tile should fall
			if (this.lastFalled !== null)
			{
				var tile = this.tiles[this.lastFalled+1];
				if (typeof tile !== 'undefined')
				{
					//Check if Y difference is more than defined value
					//next tile start falling too
					if( this.tiles[this.lastFalled].speed >= this.acc * 3) //
					{
						tile.falling = true;
						this.lastFalled = tile.i;
					}
				} else {
					this.allFalls = true;
				}
			} else {
				var tile = this.tiles[0];
				tile.falling = true;
				this.lastFalled = 0;
			}
		}

		this.tiles.forEach(function(tile){
			if(!tile.falling){
				return;
			}

			tile.speed += this.acc;
			tile.y += tile.speed;
			if (tile.y >= tile.posY * 75 + 30)
			{
				tile.y = tile.posY * 75 + 30;
				tile.falling = false;
			};
			needRedraw = true;
		}.bind(this));


		return needRedraw;

//		if (this.MOUSE_HOLDED)
//		{
//			return true;
//		}
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

	drawTile: function(x,y,color)
	{
		this.layers.squares.setProperties({ fillStyle: color });
		this.layers.squares.fillRect(
			//20 + x * 75 + 10, 20 + y * 75  + 10,
			x,y,
			55,55
		);
	},

	draw: function()
	{
		var tile;
		this.layers.squares.empty();
		for(var i =0; i < this.tiles.length; i++)
		{
			tile = this.tiles[i];
			this.drawTile(tile.x, tile.y, tile.color);
		}
	},


	addListeners: function()
	{	
		
		this.wrapper.addEventListener('mousedown',function(e) {
			this.updateActivePoint(e);
			
			this.MOUSE_HOLDED = true;
			
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
		var ratioX = this.wrapper.clientWidth / 960;
		var ratioY = this.wrapper.clientHeight / 640;
		this.activePoint.x =  Math.floor( (e.pageX - this.offsetLeft) / ratioX);
		this.activePoint.y =  Math.floor( (e.pageY - this.offsetTop)  / ratioY);

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