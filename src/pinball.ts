
import Bindable from './bindable.ts';
import decomp from 'poly-decomp';
import { Engine, Render, Runner, Bodies, Composite, Common, Body, Events, Collision, Vector} from 'matter-js';
import Canvas from './canvas.ts'

class Ball {
    init: Matter.Vector = {x: 572, y: 700}
    body: Body = Bodies.circle(this.init.x, this.init.y, 14, {restitution:.3, label:'ball'})
    forces: Matter.Vector[] = []; // forces that need to be applied
    reset() {
        this.setPosition(this.init.x,this.init.y);
    }
    setPosition(x:number,y:number) {
        Body.setVelocity(this.body, {x:0, y:0});
        Body.setPosition(this.body, {x:x, y:y});
    }
    launch(from: Vector, velocity: number, angle:number=-999) {
        // if an angle wasn't passed use the angle to the "from" loacation
        if (angle == -999) {
            let deltaX = from.x - this.body.position.x;
            let deltaY = from.y - this.body.position.y;
            angle= Math.atan2(deltaY, deltaX);
        }

        let x = velocity * -Math.cos(angle);
        let y = velocity * -Math.sin(angle);
        this.forces.push( {x:x, y:y}); // can't apply force in an event handler      
    }
}


class PinBall {
    engine: Engine = Engine.create();
    $canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement; 
    context:any=null;
    canvas: Canvas = new Canvas(this.$canvas);
    useCanvas:boolean = true;

    // game values
    balls = new Bindable(3);
    score = new Bindable(0);
    high = new Bindable(0);    
    over = new Bindable(false);
    bonus = new Bindable(10000) // score for extra ball
    batteryLevel = new Bindable(0);
    downTime: Date = new Date();
    get onSpring(): boolean {
        var collision = Collision.collides(this.spring, this.ball.body);
        return collision == null ? false : collision.collided
    } 

    forces: Matter.Vector[] = []; // forces that need to be applied
    
    batteryMax: number = 500;

    // objects
    ball: Ball = new Ball();
    leftFlipper: Body = Bodies.fromVertices(205, 830, [[{x:0,y:0},{x:80, y:20},{x:80,y:30},{x:0,y:30}]],{isStatic:true,label:'flipper-left'})
    rightFlipper: Body = Bodies.fromVertices(351, 830, [[{x:0,y:0},{x:-80, y:20},{x:-80,y:30},{x:0,y:30}]],{isStatic:true,label:'flipper-right'})
    oob: Body = Bodies.rectangle(300,930,2000,100, { isStatic: true, isSensor:true })
    spring: Body  = Bodies.rectangle(574, 863, 30, 30, { isStatic: true });
    targetsHit: Body[] = [];

    constructor() {
        Common.setDecomp(decomp) // use poly-decomp for concave bodies
        this.engine.gravity = {x:0,y:.00038,scale:1}


        this.registerEvents()
        let bodies = this.create();

        //Body.setCentre(this.leftFlipper,{x:2,y:2},true)
        //Body.setCentre(this.rightFlipper,{x:2,y:2},true)

        console.log(this.ball.body.mass)

        bodies.push(this.ball.body,this.leftFlipper,this.rightFlipper,this.oob,this.spring)
        console.log('Added ' + bodies.length + ' bodies')
        Composite.add(this.engine.world,bodies)


    }

    hitTarget(body:Body) {
        body.render.fillStyle = '#EEC'
        this.targetsHit.push(body);
        if (this.targetsHit.length == 8) {
            for(var t of this.targetsHit) {
                t.render.fillStyle = '#111'
            }
            this.targetsHit = [];
            this.score.value += 1000;
        }
    }

    registerEvents() {

        document.addEventListener('mousedown', () => {

            if (this.onSpring) {
                this.downTime = new Date();
            }
            else {

                Body.rotate(this.leftFlipper, Math.PI * -.15);
                Body.rotate(this.rightFlipper, Math.PI * .15);

                if (Collision.collides(this.leftFlipper, this.ball.body)) {
                    this.ball.launch(this.leftFlipper.position,.05)
                }
                else if (Collision.collides(this.rightFlipper, this.ball.body)) {
                    this.ball.launch(this.rightFlipper.position,.05)
                }
            }
        })

        document.addEventListener('mouseup', () => {
            if (this.onSpring) {
                //let force = -Math.min((new Date().getTime()- this.downTime.getTime()) / 5000, .1);
                //this.ball.launch(this.spring.position,force,Math.PI/2)
                
                var x = Math.random() * .01 - .005;
                var y = -Math.min((new Date().getTime()- this.downTime.getTime()) / 5000, .1);
                var force: Matter.Vector = {x:x, y:y};
                Body.applyForce(this.ball.body,this.ball.body.position,force)

            }

            Body.setAngle(this.leftFlipper, 0)
            Body.setAngle(this.rightFlipper, 0)

        })


        Events.on(this.engine, 'beforeUpdate', () => {
            for (var i = 0; i<this.ball.forces.length; i++){
                Body.applyForce(this.ball.body, this.ball.body.position, this.ball.forces[i]);
            }
            this.ball.forces=[]; // clear the array

            if (this.useCanvas) {
                this.canvas.render(this.engine.world.bodies)
            }
        });

        Events.on(this.engine, 'collisionStart', (event) => {
            for (var i = 0; i < event.pairs.length; i++) {
                let bodyA = event.pairs[i].bodyA;
                let bodyB = event.pairs[i].bodyB;
                let out = ((bodyB == this.ball.body && bodyA == this.oob) || 
                            (bodyA == this.ball.body && bodyB == this.oob));

                if (out) {
                    if (this.balls.value == 0) {
                        if (this.high.value < this.score.value) {
                            this.high.value = this.score.value;
                        }

                        this.over.value = true;
                    }
                    else {
                        this.balls.value--;
                        setTimeout(() => {
                            this.ball.reset();
                        }, 2000)
                    }
                } 
                
                else if (bodyB == this.ball.body && bodyA.label == 'bouncer') {
                    this.ball.launch(bodyA.position, .02);
                    this.score.value+=100;
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'bouncer') {
                    this.ball.launch(bodyB.position, .02);
                    this.score.value+=100;
                }

                else if (bodyB == this.ball.body  && bodyA.label == 'bumper') {
                    this.ball.launch(bodyA.position, .02, bodyA.angle);
                    this.score.value+=20;
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'bumper') {
                    this.ball.launch(bodyB.position, .02, bodyB.angle);
                    this.score.value+=20;
                }

                else if (bodyB == this.ball.body  && bodyA.label == 'target') {
                   if (this.targetsHit.find((b) => b == bodyA) == undefined) {
                        this.hitTarget(bodyA)

                   }
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'target') {
                   if (this.targetsHit.find((b) => b == bodyB) == undefined) {
                        this.hitTarget(bodyB)
                   }
                }

                else if (bodyB == this.ball.body  && bodyA.label == 'corner') {
                    this.ball.launch(bodyA.position, .005);
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'corner') {
                    this.ball.launch(bodyB.position, .005);
                }

                else if (bodyB == this.ball.body  && bodyA.label == 'battery') {
                    this.ball.launch(bodyA.position, .02);
                    if (this.batteryLevel.value < this.batteryMax) {
                        this.batteryLevel.value += 10;
                    }        

                    this.score.value += this.batteryLevel.value;
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'battery') {
                    this.ball.launch(bodyB.position, .02);
                    if (this.batteryLevel.value < this.batteryMax) {
                        this.batteryLevel.value += 10;
                    }        

                    this.score.value += this.batteryLevel.value;
                }
            
            }
        });

        this.score.addEventListener('change', ()=> {
            if (this.score.value >= this.bonus.value) {
                this.bonus.value += 10000;
                this.balls.value++;
            }
        });

    }

    create(): Body[] {
        function getArchVerts(innerRadius: number, outerRadius: number, angle: number = 0): Matter.Vector[][]  {
            var archVerts = []
            for(var a=0+angle; a<Math.PI+angle; a+=.2) {
                var x = -Math.round(outerRadius*Math.cos(a))
                var y = -Math.round(outerRadius*Math.sin(a))
                archVerts.push({x:x,y:y})
            }

            for(var a=Math.PI+angle; a>0+angle; a-=.2) {
                var x = -Math.round(innerRadius*Math.cos(a))
                var y = -Math.round(innerRadius*Math.sin(a))
                archVerts.push({x:x,y:y})
            }

            return [archVerts];
        }


        let bodies: Body[] = [

            //left lane
            Bodies.fromVertices(92,690,[[{x:0,y:0},{x:0,y:140},{x:110,y:166}]], {isStatic: true}),
            //right lane
            Bodies.fromVertices(448,690,[[{x:0,y:0},{x:0,y:140},{x:-100,y:166}]], {isStatic: true}),
            //left edge
            Bodies.rectangle(-10, 550, 40, 700, { isStatic: true }),
            //right edge
            Bodies.rectangle(610, 550, 40, 700, { isStatic: true }),
            //lane boundry
            Bodies.rectangle(543, 600, 30, 600, { isStatic: true }),
            //lane cap
            Bodies.circle(543, 300, 15, { isStatic: true }),

            //left block
            Bodies.trapezoid(14,420,180,50,Math.PI/4, { isStatic: true, angle: Math.PI/2 }), 
            //right block
            Bodies.trapezoid(525,420,180,50,Math.PI/4, { isStatic: true, angle: -Math.PI/2 }),

            //left ramp
            Bodies.rectangle(88, 804, 170, 30, { isStatic: true,  angle: Math.PI * .08}),
            //right ramp
            Bodies.rectangle(468, 804, 170, 30, { isStatic: true,  angle: Math.PI * -.08 }),
            //left corner
            Bodies.fromVertices(16,766,[[{x:0,y:0},{x:0,y:30},{x:20,y:30}]], {isStatic: true, label:'corner'}),
            //right corner
            Bodies.fromVertices(522,770,[[{x:0,y:0},{x:0,y:30},{x:-20,y:30}]], {isStatic: true, label:'corner'}),
            //top arch
            Bodies.fromVertices(320,100,getArchVerts(290,360), { isStatic: true }),
            // bottom bouncer
            Bodies.circle(290, 340, 40, {isStatic: true, label:'bouncer'}),
            // left bouncer
            Bodies.circle(210, 210, 40, {isStatic: true, label:'bouncer'}),
            // right bouncer
            Bodies.circle(370, 210, 40, {isStatic: true, label:'bouncer'}),

            // battery
            Bodies.circle(280, 535, 15, {isStatic: true, label:'battery'}),
            Bodies.rectangle(280, 550, 30, 30, {isStatic: true, label:'battery'}),
            Bodies.circle(280, 565, 15, {isStatic: true, label:'battery'}),


            // upper bumpers
            Bodies.rectangle(38,420, 20, 50, { isStatic: true, label:'bumper', angle: -Math.PI}),
            Bodies.rectangle(500,420, 20, 50, { isStatic: true, label:'bumper', angle: 0 }),

            // lower bumpers
            Bodies.rectangle(110, 680, 20, 150, { isStatic: true, label:'bumper', angle: Math.PI * .815}),
            Bodies.rectangle(432, 680, 20, 150, { isStatic: true, label:'bumper', angle: Math.PI * .175}),
            
            // targets (left to right)
            Bodies.circle(100, 200, 10, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(135, 150, 10, {isStatic: true, isSensor:true, label:'target'}),
            
            Bodies.circle(190, 110, 10, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(255, 90, 10, {isStatic: true, isSensor:true, label:'target'}),

            Bodies.circle(325, 90, 10, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(390, 110, 10, {isStatic: true, isSensor:true, label:'target'}),
            
            Bodies.circle(445, 150, 10, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(480, 200, 10, {isStatic: true, isSensor:true, label:'target'}),
        ]

        return bodies;
    }

    run() {
        const runner: Runner = Runner.create();
        Runner.run(runner, this.engine);
        if (!this.useCanvas) {
            const render: Render = Render.create({
                canvas: this.$canvas,
                engine: this.engine
            });

            render.options = {showAngleIndicator:true };

            // set the canvas size AFTER createding Render
            this.$canvas.width = 600;
            this.$canvas.height = 900;
            this.context = render.context;
            Render.run(render);
        }
        else {
            this.$canvas.width = 600;
            this.$canvas.height = 900;           
        }



    }

    restart() {
        this.score.value = 0;
        this.balls.value = 3;
        this.batteryLevel.value = 0;
        this.ball.reset();
        this.over.value = false;
        for(var t of this.targetsHit) {
            t.render.fillStyle = '#111'
        }
        this.targetsHit = [];
    }

}

export default PinBall;