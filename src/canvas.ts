import {Body} from 'matter-js';

class CanvasImage {
    image:HTMLImageElement
    constructor(src:string) {
        this.image = new Image()
        this.image.src = src;
    }
}

class Canvas {
    $canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D | null
    ballImage =  new CanvasImage('/assets/ball.png')
    flipperLeftImage =  new CanvasImage('/assets/flipper-left.png')
    flipperRightImage =  new CanvasImage('/assets/flipper-right.png')
    fill:boolean = true;
    

    constructor(canvas: HTMLCanvasElement) {
        this.$canvas = canvas;
        this.context = canvas.getContext("2d");
    }

    render(bodies: Body[]) {
        let body = null;
        let part = null;
        if (this.context == null)
            return;



        let c:CanvasRenderingContext2D | null = this.context;
        c.reset();
        for (var i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (let k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
                part = body.parts[k];

                if (!part.render.visible)
                    continue;


                if (part.label == 'ball') {
                    let w = this.ballImage.image.width;
                    let h = this.ballImage.image.height;
                    c.drawImage(this.ballImage.image, part.position.x-w/2, part.position.y-h/2)
                }
                else if (part.label == 'flipper-left') {
                    let w = this.flipperLeftImage.image.width;
                    let h = this.flipperLeftImage.image.height;
                    c.setTransform(1, 0, 0, 1, part.position.x, part.position.y); 
                    c.rotate(part.angle)
                    c.drawImage(this.flipperLeftImage.image, -w/2, -h/2)
                    c.setTransform(1,0,0,1,0,0); 

                } 
                else if (part.label == 'flipper-right') {
                    let w = this.flipperRightImage.image.width;
                    let h = this.flipperRightImage.image.height;
                    c.setTransform(1, 0, 0, 1, part.position.x, part.position.y); 
                    c.rotate(part.angle)
                    c.drawImage(this.flipperRightImage.image, -w/2, -h/2)
                    c.setTransform(1,0,0,1,0,0); 

                } 
                else {
                    // part polygon
                    if (part.circleRadius) {
                        c.beginPath();
                        c.arc(part.position.x, part.position.y, part.circleRadius, 0, 2 * Math.PI);
                    } else {
                        c.beginPath();
                        c.moveTo(part.vertices[0].x, part.vertices[0].y);



                        for (var j = 1; j < part.vertices.length; j++) {
                            c.lineTo(part.vertices[j].x, part.vertices[j].y);
                            /*
                            if (!part.vertices[j - 1].isInternal || showInternalEdges) {
                                c.lineTo(part.vertices[j].x, part.vertices[j].y);
                            } else {
                                c.moveTo(part.vertices[j].x, part.vertices[j].y);
                            }

                            if (part.vertices[j].isInternal && !showInternalEdges) {
                                c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
                            }
                            */
                        }

                        c.lineTo(part.vertices[0].x, part.vertices[0].y);
                        c.closePath();
                    }

                    if (this.fill) {
                        if (part.render.fillStyle) {
                            c.fillStyle = part.render.fillStyle;
                            //c.fillStyle = '#00FF00'
                        }
                        c.fill();
                    } else {
                        c.lineWidth = 1;
                        c.stroke();
                    }
                }
                c.globalAlpha = 1;
            }
        }
    };

}

export default Canvas