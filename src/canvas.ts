import PinBall from './pinball.ts';

class CanvasImage {
    image:HTMLImageElement
    constructor(label:string) {
        this.image = new Image()
        this.image.src = '/assets/' + label + '.png';
    }
}

class Canvas {
    $canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
    fill:boolean = true;
    images:any = {
        'ball':new CanvasImage('ball'),
        'spring':new CanvasImage('spring'),
        'flipper-left':new CanvasImage('flipper-left'),
        'flipper-right':new CanvasImage('flipper-right'),
    }

    constructor(canvas: HTMLCanvasElement) {
        this.$canvas = canvas;
        this.context = canvas.getContext("2d");
    }

    render(game: PinBall) {
        let body = null;
        let part = null;
        if (this.context == null)
            return;

        let c:CanvasRenderingContext2D | null = this.context;
        c.reset();
        for (var i = 0; i < game.engine.world.bodies.length; i++) {
            body = game.engine.world.bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (let k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
                part = body.parts[k];

                if (!part.render.visible)
                    continue;

                let canvasImage:CanvasImage = this.images[part.label]

                if (canvasImage) {
                    let img:HTMLImageElement = canvasImage.image
                    let w:number = img.width;
                    let h:number = img.height;

                    if (part.label == 'ball') {
                        c.drawImage(img, part.position.x-w/2, part.position.y-h/2)
                    }
                    else if (part.label == 'spring') {
                        if (game.mouseDown && game.onSpring != null) {
                            var p = Math.min((new Date().getTime()- game.downTime.getTime()) / 10000, .1) * 8;
                            c.drawImage(img, part.position.x-w/2, part.position.y-h/2 + 90 * p, 30, 90 - (90 * p))
                        }
                        else {
                            c.drawImage(img, part.position.x-w/2, part.position.y-h/2 )
                        }
                    }
                    else if (part.label == 'flipper-left' || part.label == 'flipper-right') {
                        c.setTransform(1, 0, 0, 1, part.position.x, part.position.y); 
                        c.rotate(part.angle)
                        c.drawImage(img, -w/2, -h/2)
                        c.setTransform(1,0,0,1,0,0); 
                    } 
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