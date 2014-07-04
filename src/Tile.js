
function Tile(color,x,y) {
	this.color = color;
	this.gridX = x;
	this.gridY = y;
	this.x = 20 + 10 + x * 75;
}

Tile.prototype = {
	empty: false,
	falling: false,

	//Level coordinates
	gridX: 0, 
	gridY: 0,

	//Canvas position
	x: 0,
	y: 0,

	//Speed
	speedY:0,
	speedX:0,
	
	color:0,

	foundUpper: false
}