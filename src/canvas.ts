import PinBall from './pinball.ts';

class CanvasImage {
    image:HTMLImageElement
    constructor(label:string) {
        this.image = new Image()
        this.image.src = 'assets/' + label + '.png';
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
        let pw = particleImage.width;
        let ph = particleImage.height;
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

                if (canvasImage) {
                    let img:HTMLImageElement = canvasImage.image
                    let w:number = img.width;
                    let h:number = img.height;

                    if (part.label == 'ball') {
                        c.drawImage(img, part.position.x-w/2, part.position.y-h/2)
                    }
                    else if (part.label == 'battery' && !drewBattery) {
                        c.drawImage(img, part.position.x-w/2, part.position.y-h/2)


                        let p =  game.batteryLevel.value/game.batteryMax;
                        let h2 = 30 - 30 * p;

                        let r = Math.min(250, (250 * ((100 - (p * 100)) / 80)));
                        let g = Math.min(220, (240 * ((p * 100) / 40)));
                        let rgb = "RGB(" + r.toString() + "," + g.toString() + ",0)";

                         c.fillStyle = rgb// 'green'//rgb; // Set the fill color
                        c.fillRect(part.position.x-12, part.position.y-15+h2, 24, 30-h2); // x, y, width, height


                        drewBattery = true;
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
                        if (game.springDown && game.ballOn(game.spring) != null) {
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
                else if (part.label == 'battery') {

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
                            //c.fillStyle = part.render.fillStyle;
                            c.fillStyle = '#00FF00'
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