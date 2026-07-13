class Vector{
	constructor(x,y){this.x = x; this.y = y;}
	set(x,y){this.x=x;this.y=y;}
	setLen(n){
		var vN = this.norm();
		return new Vector(vN.x*n,vN.y*n);}
	add(v){return new Vector(this.x+v.x,this.y+v.y);}
	sub(v){return new Vector(this.x-v.x,this.y-v.y);}
	mult(n){return new Vector(this.x*n,this.y*n);}
	div(n){return new Vector(this.x/n,this.y/n);}
	len(){return Math.sqrt((this.x*this.x)+(this.y*this.y));}
	norm(){return this.div(this.len());}
	toAngle(a){
		var x = this.len()*Math.cos(a);
		var y = this.len()*Math.sin(a);
		return new Vector(x,y);
	}
	findAngle(){
		return Math.atan2(this.y,this.x);
	}
	setDir(v){
		this.toAngle(v.findAngle);
	}
}