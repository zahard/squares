
function Tile(color,x,y) {
	this.color = color;
	this.gridX = x;
	this.gridY = y;
	this.x = this.getX();
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

	foundUpper: false,

	getY: function()
	{
		return this.gridY * Tile.app.cellSize + Tile.app.tilePadding + Tile.app.padding;
	},

	getX: function()
	{
		return this.gridX * Tile.app.cellSize + Tile.app.tilePadding + Tile.app.padding;
	}
}
