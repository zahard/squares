
window.onload = function()
{
	window.game = new Game(960,640);

	//Fix android browsers bug
	setTimeout(function(){
		game.onResize();	
	},100)
}

function Game(width, height)
{
	this.width = width;
	this.height = height;

	this.wrapper = $('wrapper');

	this.layers = {
		back:   new Layer( $('back'), width, height, 1),
		scale:  new Layer( $('scale'), width, height, 2),
		cloud: new Layer( $('cloud'), width, height, 3),
		carrot: new Layer( $('carrot'), width, height, 4),
		rabbit: new Layer( $('rabbit'), width, height, 5),
		score: new Layer( $('score'), width, height, 3),
		button: new Layer( $('button'), width, height, 3),
	};
	
	this.tiles = {
		back: $('img-back'),
		cloud: $('img-cloud'),
		rabbitWin: $('img-rabbit-win'),
		rabbitLose: $('img-rabbit-lose'),
		numbers: $('img-numbers'),
		carrot: $('img-carrot'),
		carrotActive: $('img-carrot-act')
	};

	this.sounds = {
		win: $('audio-win'),
		lose: $('audio-lose')
	}

	this.loadLevel(0);

	this.addListeners();

	if( ! this.isFullScreenSupported() )
	{
		this.layers.button.hide();
	}

	this.drawBackground();

	this.animate();

	this.onResize();
}

Game.prototype = {

	carrotStartPoint: {
		x: 450,
		y: 100
	},

	/**
	 * @var range
	 * Array of scale numbers displayed
	 */
	range: [],


	answer: null,

	question: null,

	/**
	 * @var scaleLength
	 * Bottom scale length
	 */
	scaleLength: 860,

	/**
	 * @var scaleWidth
	 * Bottom scale width
	 */
	scaleWidth: 16,

	numberHeight: 40,

	numberWidth: 32,

	numberMargin: 10,

	/**
	 * Current carrot position
 	 */
	carrot : {
		x: 0,
		y: 0
	},

	/**
	 * Allowed answer accuracy in %
	 */
	tolerance: 5,

	/**
	 * @var activePoint
	 * Touch (mousehold) point
	 */
	activePoint: {
		x: 0,
		y: 0
	},

	/**
	 * Level questions
	 */
	levels: [
		{
			range: [0,1,2],
			answer: 4/3,
			question: '4/3'
		},
		{
			range: [1,2,3,4],
			answer: 5/2,
			question: '5/2'
		},
		{
			range: [0,1,2,3,4],
			answer: 3/2,
			question: '3/2'
		}
	],

	currentLevel: 0,

	scores: 0,

	scoresPerLevel: 10,

	MOUSE_HOLDED: false,

	fullScreenEnabled: false,

	loadLevel: function(levelNum)
	{	
		if( typeof levelNum != 'undefined' )
		{
			this.currentLevel = levelNum;	
		}
		else
		{
			this.currentLevel++;
			if (this.currentLevel >= this.levels.length)
			{
				this.currentLevel = 0;
			}	
		}

		var level = this.levels[this.currentLevel];
		this.range = level.range;
		this.question = level.question;
		this.answer = level.answer;

		this.resetCarrotPosition();

		this.drawScale();

		this.drawCloud();

		this.drawCarrot();

		this.drawScore();
	},

	animate: function()
	{
		if (this.update())
		{
			this.drawCarrot();
		}

		setTimeout(function(){
			this.animate();
		}.bind(this),1000/60);
	},

	update: function()
	{
		if (this.MOUSE_HOLDED)
		{
			this.carrot.x = this.activePoint.x - 20;
			this.carrot.y = this.activePoint.y - 60;
			return true;
		}
	},

	drawBackground: function()
	{
		//Draw level
		this.layers.back.empty();
		this.layers.back.drawImage(this.tiles.back,
			0,0,
			this.tiles.back.width,this.tiles.back.height,
			0,0,
			this.width, this.height);

		this.drawButton();
	},

	drawScale: function()
	{
		this.layers.scale.empty();
		this.layers.scale.setProperties({
			fillStyle: '#fde006',
			lineWidth: 4,
			strokeStyle: '#f6911b'
		});

		//Scale position
		var scaleX = (this.width - this.scaleLength) / 2;
		var scaleY = this.height - 50;

		//Draw horizontal scale line
		this.layers.scale.fillRect(
			scaleX, scaleY,
			this.scaleLength, this.scaleWidth);
		
		var numberLineHeight = 30;
		var itemWidth = (this.scaleLength - this.scaleWidth) / ( this.range.length - 1 );

		this.scaleInfo = {
			start: scaleX + this.scaleWidth/2,
			end: scaleX + this.scaleLength - this.scaleWidth / 2,
			step: itemWidth
		};

		//For each range item draw vertical line and number
		for (var i = 0; i < this.range.length; i++)
		{
			this.layers.scale.fillRect(
				scaleX + itemWidth * i, scaleY - numberLineHeight,
				this.scaleWidth, numberLineHeight);

			// Array if 0 - 9 numbers of scale value
			var numbers = this.range[i].toString().split('');
			var x,y;
			for (var n = 0; n < numbers.length; n++)
			{
				//Calculate each number position
				x = scaleX + itemWidth * i + this.scaleWidth / 2 - this.numberWidth * numbers.length / 2 + this.numberWidth * n;
				y = scaleY - numberLineHeight - this.numberHeight - this.numberMargin;

				this.drawNumber(numbers[n], x, y);
			}
		}

	},

	drawButton: function()
	{
		this.layers.button.empty();

		this.layers.button.setProperties({
			fillStyle: 'orange',
			strokeStyle: '#fff',
			font: 'bold 20px Arial',
		});

		this.layers.button.fillRect(380,10,180,40);
		this.layers.button.strokeRect(380,10,180,40);

		this.layers.button.setProperties({
			fillStyle: '#777',
		});

		var text = 'Fullscreen Mode';
		
		this.layers.button.fillText(text, 392, 35);

	},

	/**
	 * Draw question cloud
	 */
	drawCloud: function(question)
	{
		this.layers.cloud.empty();
		this.layers.cloud.drawImage(this.tiles.cloud,
			0,0,
			this.tiles.cloud.width,this.tiles.cloud.height,
			0,0,
			250, 250);

		this.layers.cloud.setProperties({
			fillStyle: '#333333',
			font: 'bold 40px Arial',
		});

		this.layers.cloud.fillText('Q: ' + this.question, 60, 120)
	},

	/**
	 * Draw question cloud
	 */
	drawScore: function(question)
	{
		this.layers.score.empty();
		this.layers.score.setProperties({
			fillStyle: '#fff',
			font: 'bold 60px Arial',
		});

		var textX = 900 - this.layers.score.measureText(this.scores+'').width;
		var textY = 80;

		this.layers.score.fillText(this.scores,   textX, textY);
		this.layers.score.strokeText(this.scores, textX, textY);
	},

	drawNumber: function(number,x,y)
	{
		var tileX,tileY;
		if (number > 0 && number < 6)
		{
			tileX = 256 * (number - 1);
			tileY = 32;
		}
		else
		{
			tileY = 416;
			if (number == 0)
			{
				tileX = 256 * 4;
			}
			else
			{
				tileX = 256 * (number - 6);
			}
		}

		this.layers.scale.drawImage(this.tiles.numbers,
			tileX, tileY,
			256, 320,
			x,y,
			this.numberWidth, this.numberHeight);
	},

	drawCarrot: function()
	{
		var tile = this.carrot.y < 450 ? this.tiles.carrot : this.tiles.carrotActive;

		this.layers.carrot.empty();
		this.layers.carrot.drawImage(tile,
			0,0,
			tile.width, tile.height,
			this.carrot.x, this.carrot.y,
			40,120);

	},

	onCarrotMoved: function() {
		//If carrot is on scale - check for win or lose
		if(  this.carrot.y > 450 )
		{
			//Here check for numbres matching
			var point = this.carrot.x + 20;
			var percent =  (point - this.scaleInfo.start) / (this.scaleInfo.end - this.scaleInfo.start);
			var rangeDiff = this.range[this.range.length-1] - this.range[0];
			var seletedValue = this.range[0] + rangeDiff * percent;
			
			var p = (this.answer - this.range[0] ) / rangeDiff;
			var answerPoint = (this.scaleInfo.end - this.scaleInfo.start) * p + this.scaleInfo.start;
			this.answerPoint = answerPoint;


			if( Math.abs(seletedValue - this.answer) / rangeDiff * 100 < this.tolerance)
			{
				this.win();
			} else {
				this.lose();
			}

			
		}

	},

	fetchCarrot: function(x, y)
	{
		if (Math.abs(this.carrot.x + 20 - x) < 20 && Math.abs(this.carrot.y + 60 - y) < 60 )
		{
			return true;
		}
	},

	addListeners: function()
	{	
		
		this.wrapper.addEventListener('mousedown',function(e) {
			this.updateActivePoint(e);
			if ( this.fetchCarrot(this.activePoint.x, this.activePoint.y) )
			{
				this.MOUSE_HOLDED = true;
			}

			//Fullscren button click
			if (this.isFullscreenPressed())
			{
				this.toggleFullscreen();
			}
		}.bind(this));

		this.wrapper.addEventListener('mousemove',function(e){
			this.updateActivePoint(e);
		}.bind(this));

		this.wrapper.addEventListener('mouseup',function(e){
			this.MOUSE_HOLDED = false;
			this.onCarrotMoved();
		}.bind(this));

		//Touch events
		this.wrapper.addEventListener('touchstart',function(e) {

			this.updateActivePoint(e.touches[0]);
			if ( this.fetchCarrot(this.activePoint.x, this.activePoint.y) )
			{
				this.MOUSE_HOLDED = true;
			}
		}.bind(this));

		this.wrapper.addEventListener('touchmove',function(e){
			e.preventDefault();
			this.updateActivePoint(e.touches[0]);
		}.bind(this));

		this.wrapper.addEventListener('touchend',function(e){
			this.MOUSE_HOLDED = false;
			this.onCarrotMoved();
		}.bind(this));

		this.wrapper.addEventListener('touchcancel',function(e){
			this.MOUSE_HOLDED = false;
			this.onCarrotMoved();
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

	isFullscreenPressed: function()
	{
		var x = this.activePoint.x;
		var y = this.activePoint.y;
		return ( x >= 380 && x <= 560 && y >= 10 && y <= 50);
	},

	toggleFullscreen: function()
	{
		if(this.fullScreenEnabled)
		{
			this.fullScreenCancel();
			this.fullScreenEnabled = false;
		}
		else
		{
			this.fullScreen(this.wrapper);
			this.fullScreenEnabled = true;
		}

		this.drawButton();
	},

	fullScreen: function (el) 
	{ 
		if (el.webkitRequestFullScreen)
		{
			el.webkitRequestFullScreen();
		}
		else
		{
			el.mozRequestFullScreen();
  		}
  		this.onResize();
	},

	fullScreenCancel: 	function() 
	{ 
		if (document.webkitCancelFullScreen())
		{ 
			document.webkitCancelFullScreen()(); 
		} 
		else if (document.mozCancelFullscreen ) 
		{ 
			document.mozCancelFullscreen(); 
		}
		this.onResize();
	},

	isFullScreenSupported: function()
	{
		var el  = this.wrapper;
		if( el.webkitRequestFullScreen || el.mozRequestFullScreen)
		{
			return true;
		}
		return false;
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

		console.log('OnREsize')

		var widthToHeight = 3/2;
		var newWidth = window.innerWidth;
		var newHeight = window.innerHeight;

		console.log( newHeight );
		console.log( newWidth );

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

		this.offsetTop = this.wrapper.offsetTop;
		this.offsetLeft = this.wrapper.offsetLeft;

	},

	win: function()
	{
		this.resetCarrotPosition();
		this.drawCarrot();
		this.rabbitWinAnimation();
		this.sounds.lose.pause();
		this.sounds.win.currentTime = 0;
		this.sounds.win.play();
		this.scores += this.scoresPerLevel;
	},

	rabbitWinAnimation: function()
	{
		var offset = 0;
		var iterations = 10;
		var maxOffset = 31;
		var minOffset = 0;
		var diff = 2;
		//Wich tile to draw, depend on what height rabbit is jumping now

		var interval = setInterval(function() {
			var tileX = Math.floor( offset / 8);
			
			this.layers.rabbit.empty();
			this.layers.rabbit.drawImage(this.tiles.rabbitWin,
				tileX * 300, 20,
				300, 440,
				this.answerPoint - 75, 375 - offset,
				150,220);

			offset += diff;
			if (offset > maxOffset)
			{
				diff = -2;
				offset = maxOffset;
				iterations--;
			}
			if (offset < minOffset)
			{
				diff = 2;
				offset = minOffset;
				iterations--;
			}
			if (iterations == 0)
			{
				clearInterval(interval);
				this.layers.rabbit.empty();

				this.loadLevel();
			}

		}.bind(this),1000/60);
	},

	lose: function()
	{
		this.resetCarrotPosition();
		this.drawCarrot();
		this.sounds.win.pause();
		this.sounds.lose.currentTime = 0;;
		this.sounds.lose.play();
		this.rabbitLoseAnimation();
	},

	rabbitLoseAnimation: function()
	{
		var offset = 0;
		var iterations = 10;
		var maxOffset = 10;
		var minOffset = -10;
		var diff = 2;

		var interval = setInterval(function() {
			this.layers.rabbit.empty();
			this.layers.rabbit.drawImage(this.tiles.rabbitLose,
				0,0,
				300, 440,
				this.answerPoint - 75 + offset, 380,
				150,220);

			offset += diff;
			if (offset > maxOffset)
			{
				diff = -2;
				iterations--;
			}
			if (offset < minOffset)
			{
				diff = 2;
				iterations--;
			}
			if (iterations == 0)
			{
				clearInterval(interval);
				this.layers.rabbit.empty();
			}

		}.bind(this),1000/60);
		
	},

	resetCarrotPosition: function()
	{
		this.carrot.x = this.carrotStartPoint.x;
		this.carrot.y = this.carrotStartPoint.y;
	},

	loadRange: function(range)
	{
		this.range = range;
	}

};