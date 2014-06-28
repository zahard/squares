/**
 * Application Canvas Layer
 */

function Layer(canvas, width, height, z_index, name) {
 	canvas.width = width;
 	canvas.height = height;
 	this.width = width;
 	this.height = height;

 	this.cnv  = canvas;
 	if (typeof z_index !== 'undefined')
 	{
 		canvas.style.zIndex = z_index;
 	}
 
 	this.cxt = canvas.getContext('2d');
	this.layerName = name;
 }


Layer.prototype.setZIndex = function(z_index) {
	this.cnv.style.zIndex = z_index;
}

Layer.prototype.empty = function() {
	
	this.cxt.clearRect(0,0,this.width, this.height);
}

Layer.prototype.hide = function() {
	this.cnv.style.display = 'none';
}


/**
* Required for using in chaining
*/
Layer.prototype.setProperties = function( properties ) {
	for(var prop in properties ) {
		this.cxt[prop] = properties[prop];
	}
	return this;
}

/**
* Define setter and getter for all properties of original context
*/
Layer.extendContextProperties = function ( properties ) {
	for(var i in properties) {
		(function( property ) {
			Layer.prototype.__defineGetter__(property, function()  { 
				return this.cxt[property]; 
			});
			Layer.prototype.__defineSetter__(property, function(x)  { 
				return this.cxt[property] = x;
			});
		})(properties[i]);
	}
}

/**
* Delegate all methods to original context and return THIS for chaining
*/
Layer.extendContextMethods = function( methods ) {
	for(var i in methods) {
		(function( method ) {
			Layer.prototype[method] = function() {
				this.cxt[method].apply(this.cxt, arguments);
				return this;
			}
		})(methods[i]);
	}

	Layer.prototype.measureText = function() {
		return this.cxt.measureText.apply(this.cxt, arguments);
	}
}


/**
* Create default canvas element, and basic on their context build Layer prototype
*/
Layer.extendContext = function() {
	var canvasProperties = [];
	var canvasMethods = [];
	defaultCxt = document.createElement('canvas').getContext('2d');
	for( var prop in defaultCxt ) {
		if ( typeof defaultCxt[prop] == 'function' ) 
			canvasMethods.push(prop);
		else if( defaultCxt.hasOwnProperty(prop) )
			canvasProperties.push(prop);
	}

	Layer.extendContextProperties(canvasProperties);
	Layer.extendContextMethods(canvasMethods);
}

//Extend original context
Layer.extendContext();

