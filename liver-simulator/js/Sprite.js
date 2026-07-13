class Sprite {
    constructor(x,y){
        this.pos = new Vector(x,y);
        this.size = new Vector(50,50);
        this.color = {r:255,g:255,b:255};
    }

    render(context){
        context.fillStyle = "rgb(".concat(this.color.r).concat(",").concat(this.color.g).concat(",").concat(this.color.b).concat(")");
        context.fillRect(this.pos.x,this.pos.y,this.size.x,this.size.y);
    }
}