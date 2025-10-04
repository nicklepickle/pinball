import PinBall from './pinball.ts';

class CanvasImage {
    image:HTMLImageElement
    constructor(label:string) {
        this.image = new Image()
        this.image.src = '/assets/' + label + '.png';
    }
}

class CanvasParticle {
    x:number;
    y:number;
    alpha:number;
    constructor(x:number, y:number, alpha:number) {
        this.x=x;
        this.y=y;
        this.alpha=alpha;
    }
}

class Canvas {
    $canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
    fill:boolean = true;
    particles:CanvasParticle[] = [];
    images:any = {
        'ball':new CanvasImage('ball'),
        'spring':new CanvasImage('spring'),
        'spring-cap':new CanvasImage('spring-cap'),
        'bouncer':new CanvasImage('bouncer'),
        'bouncer-lit':new CanvasImage('bouncer-lit'),
        'bumper':new CanvasImage('bumper'),
        'flipper-left':new CanvasImage('flipper-left'),
        'flipper-right':new CanvasImage('flipper-right'),
        'particle':new CanvasImage('particle'),
        'table-background':new CanvasImage('table-background')
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

        c.drawImage(this.images['table-background'].image,0,0)

        let particleImage = this.images['particle'].image;
        let pw = particleImage.width;
        let ph = particleImage.height;
        for (var i = 0; i < this.particles.length; i++) {
            c.globalAlpha = this.particles[i].alpha;
            c.drawImage(particleImage, this.particles[i].x, this.particles[i].y)
            this.particles[i].alpha -= .2;
            
        }
        c.globalAlpha = 1;
        this.particles = this.particles.filter(p => p.alpha > 0);

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

                    if (part.label == 'ball' ) {
                        c.drawImage(img, part.position.x-w/2, part.position.y-h/2)
                    }
                    else if (part.label == 'bouncer') {
                        if (game.ballOn(body)) {
                            
                            this.particles.push(new CanvasParticle(part.position.x-pw/2, part.position.y-ph/2, .8))
                        }
                        c.drawImage(img, part.position.x-w/2, part.position.y-h/2)


                    }
                    else if (part.label == 'bumper') {
                        if (game.ballOn(body)) {
                            let px = 8 * -Math.cos(part.angle);
                            let py = 8 * -Math.sin(part.angle);
                            this.particles.push(new CanvasParticle(part.position.x-pw/2+px, part.position.y-ph/2+py, .4))
                        }

                        c.setTransform(1, 0, 0, 1, part.position.x, part.position.y); 
                        c.rotate(part.angle)
                        c.drawImage(img, -w/2, -h/2)
                        c.setTransform(1,0,0,1,0,0); 

                    }
                    else if (part.label == 'spring') {
                        let cap = this.images['spring-cap'].image;
                        if (game.mouseDown && game.ballOn(game.spring) != null) {
                            var p = Math.min((new Date().getTime()- game.downTime.getTime()) / 10000, .1) * 8;
                            c.drawImage(img, part.position.x-w/2, part.position.y-h/2 + 90 * p, 30, 90 - (90 * p))
                            c.drawImage(cap, part.position.x-w/2+2, part.position.y-h+cap.height/2+6 + (90 * p))
                        }
                        else {
                            c.drawImage(img, part.position.x-w/2, part.position.y-h/2 )
                            c.drawImage(cap, part.position.x-w/2+2, part.position.y-h+cap.height/2+6 )
                        }
                    }
                    else if (part.label == 'flipper-left' || part.label == 'flipper-right' ) {
                        c.setTransform(1, 0, 0, 1, part.position.x, part.position.y); 
                        c.rotate(part.angle)
                        c.drawImage(img, -w/2, -h/2)
                        c.setTransform(1,0,0,1,0,0); 
                    } 
                }
                else if (part.label == 'target' || part.label == 'battery') {

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

                    if (part.render.fillStyle == '#EEC') {
                        c.globalAlpha = .4;
                        c.drawImage(particleImage, part.position.x-30, part.position.y-30,60,60)
                        c.globalAlpha = 1;
                    }
                  
                }
                c.globalAlpha = 1;
            }
        }
    };

}

export default Canvas