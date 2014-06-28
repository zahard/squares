function Circle(cxt,x,y,r, strokeColor, fillColor ){
	this.cxt = cxt;
	this.x = x;
	this.y = y;
	this.radius = r;
	this.strokeColor = strokeColor || null;	
	this.fillColor = fillColor || null;	

	return this;
}

Circle.prototype.draw = function() {
	var cxt = this.cxt;
	cxt.save();
	cxt.beginPath();
	
	cxt.arc(this.x, this.y, this.radius,  rad(0) , rad(360), false );

	if( this.strokeColor ) {
		cxt.strokeStyle = this.strokeColor;
		cxt.lineWidth = 2;
		cxt.stroke();
	}
	if ( this.fillColor ) {			
		cxt.fillStyle = this.fillColor;
		cxt.fill();
	} 
	
	cxt.closePath();
	cxt.restore();
}

Circle.prototype.move = function(position) {
	this.x = position.x;
	this.y = position.y;
}