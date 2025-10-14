import PinBall from './pinball.ts';

class CanvasImage {
    image:HTMLImageElement
    constructor(label:string) {
        this.image = new Image()
        this.image.src = 'assets/' + label + '.png';
    }
    draw(context: CanvasRenderingContext2D, x:number, y:number, angle:number = 0) {
        context.setTransform(1, 0, 0, 1, x, y); 
        if (angle != 0)
            context.rotate(angle)
        context.drawImage(this.image, -this.image.width/2, -this.image.height/2)
        context.setTransform(1,0,0,1,0,0); 
    }
}

class CanvasParticle {
    x:number;
    y:number;
    alpha:number;
    offset:number=75;
    constructor(x:number, y:number, alpha:number) {
        this.x=x-this.offset;
        this.y=y-this.offset;
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
        'bumper':new CanvasImage('bumper'),
        'flipper-left':new CanvasImage('flipper-left'),
        'flipper-right':new CanvasImage('flipper-right'),
        'particle':new CanvasImage('particle'),
        'table-background':new CanvasImage('table-background'),
        'battery':new CanvasImage('battery')
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

        c.font = '16px title';
        c.fillStyle = '#CFC';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('Galaxy Mission', 300, 12);

        let particleImage = this.images['particle'].image;

        for (var i = 0; i < this.particles.length; i++) {
            c.globalAlpha = this.particles[i].alpha;
            c.drawImage(particleImage, this.particles[i].x, this.particles[i].y)
            this.particles[i].alpha -= .2;      
        }
        c.globalAlpha = 1;
        this.particles = this.particles.filter(p => p.alpha > 0);
        let drewBattery = false;

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
                // render bodies
                if (canvasImage) {
                    if (part.label == 'ball') {
                        canvasImage.draw(c,body.position.x,body.position.y)
                    }
                    else if (part.label == 'spring') {
                        let cap = this.images['spring-cap'];
                        let w:number = canvasImage.image.width;
                        let h:number = canvasImage.image.height;
                        if (game.springDown && game.ballOn(game.spring) != null) {
                            var p = Math.min((new Date().getTime()- game.downTime.getTime()) / 10000, .1) * 8;
                            c.drawImage(canvasImage.image, part.position.x-w/2, part.position.y-h/2 + 90 * p, 30, 90 - (90 * p))
                            cap.draw(c, part.position.x, part.position.y - 60  + (90 * p))
                        }
                        else {
                            canvasImage.draw(c, body.position.x,body.position.y)
                            cap.draw(c, part.position.x, part.position.y - 60 )
                        }
                    }
                    else if (part.label == 'battery') {
                        if (!drewBattery) {
                            canvasImage.draw(c,body.position.x,body.position.y)

                            let p =  game.batteryLevel.value/game.batteryMax;
                            let h2 = 30 - 30 * p;

                            let r = Math.min(250, (250 * ((100 - (p * 100)) / 40)));
                            let g = Math.min(220, (240 * ((p * 100) / 40)));
                            let rgb = "RGB(" + r.toString() + "," + g.toString() + ",0)";

                            c.fillStyle = rgb;
                            c.fillRect(part.position.x-12, part.position.y-15+h2, 24, 30-h2); // x, y, width, height

                            drewBattery = true;
                        }
                    }
                    else {
                        canvasImage.draw(c,body.position.x,body.position.y,body.angle)
                    }
                }


                // add particles
                if (part.label == 'bouncer') {
                    if (game.ballOn(body)) {
                        this.particles.push(new CanvasParticle(part.position.x, part.position.y, .8))
                    }
                }
                else if (part.label == 'bumper') {
                    if (game.ballOn(body)) {
                        let px = 16 * -Math.cos(part.angle);
                        let py = 16 * -Math.sin(part.angle);
                        this.particles.push(new CanvasParticle(part.position.x+px, part.position.y+py, .4))
                    }
                }
                else if (part.label == 'target' && part.circleRadius) {
                    c.beginPath();
                    c.arc(part.position.x, part.position.y, part.circleRadius, 0, 2 * Math.PI);
                    if (part.render.fillStyle == '#EEC') {
                        c.globalAlpha = .4;
                        c.drawImage(particleImage, part.position.x-30, part.position.y-30,60,60)
                        c.globalAlpha = 1;
                    }
                    if (part.render.fillStyle) {
                        c.fillStyle = part.render.fillStyle;
                    }
                    c.fill();
                    
                }

            }
        }
    };

}

export default Canvas