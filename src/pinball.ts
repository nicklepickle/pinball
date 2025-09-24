
import Bindable from './bindable.ts';
import decomp from 'poly-decomp';
import { Engine, Render, Runner, Bodies, Composite, Common, Body, Events, Collision, Vector} from 'matter-js';


class Ball {
    init: Matter.Vector = {x: 572, y: 700}
    body: Body = Bodies.circle(this.init.x, this.init.y, 14, {restitution:.3  })
    forces: Matter.Vector[] = []; // forces that need to be applied
    reset() {
        Body.setVelocity(this.body, {x:0, y:0});
        Body.setPosition(this.body, this.init);
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

    // game values
    balls = new Bindable(3);
    score = new Bindable(0);
    high = new Bindable(0);    
    over = new Bindable(false);
    downTime: Date = new Date();
    onSpring: boolean = false;
    forces: Matter.Vector[] = []; // forces that need to be applied

    // objects
    ball: Ball = new Ball();
    leftFlipper: Body = Bodies.fromVertices(204, 827, [[{x:0,y:0},{x:80, y:20},{x:80,y:24},{x:0,y:24}]],{isStatic:true})
    rightFlipper: Body = Bodies.fromVertices(351, 827, [[{x:0,y:0},{x:-80, y:20},{x:-80,y:24},{x:0,y:24}]],{isStatic:true,})
    oob: Body = Bodies.rectangle(300,930,2000,100, { isStatic: true, isSensor:true })
    spring: Body  = Bodies.rectangle(574, 860, 30, 30, { isStatic: true });

    constructor() {
        Common.setDecomp(decomp) // use poly-decomp for concave bodies
        this.engine.gravity = {x:0,y:.00038,scale:1}


        this.registerEvents()
        let bodies = this.create();

        //Body.setCentre(this.leftFlipper,{x:2,y:2},true)
        //Body.setCentre(this.rightFlipper,{x:2,y:2},true)

        bodies.push(this.ball.body,this.leftFlipper,this.rightFlipper,this.oob,this.spring)
        console.log('Added ' + bodies.length + ' bodies')
        Composite.add(this.engine.world,bodies)


    }

    registerEvents() {

        document.addEventListener('mousedown', () => {

            if (this.onSpring) {
                this.downTime = new Date();
            }
            else {
                if (this.ball.body.position.x < 550) {
                    Body.rotate(this.leftFlipper, Math.PI * -.15);
                    Body.rotate(this.rightFlipper, Math.PI * .15);
                }
                if (Collision.collides(this.leftFlipper, this.ball.body)) {
                    this.ball.launch(this.leftFlipper.position,.06)
                }
                else if (Collision.collides(this.rightFlipper, this.ball.body)) {
                    this.ball.launch(this.rightFlipper.position,.06)
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
          
                this.onSpring = false;
            }

            Body.setAngle(this.leftFlipper, 0)
            Body.setAngle(this.rightFlipper, 0)

        })

        Events.on(this.engine, 'beforeUpdate', () => {
            for (var i = 0; i<this.ball.forces.length; i++){
                Body.applyForce(this.ball.body, this.ball.body.position, this.ball.forces[i]);
            }
            this.ball.forces=[]; // clear the array
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
                
                if (bodyB == this.ball.body && bodyA.label == 'bouncer') {
                    this.ball.launch(bodyA.position, .03);
                    this.score.value+=100;
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'bouncer') {
                    this.ball.launch(bodyB.position, .03);
                    this.score.value+=100;
                }

                if (bodyB == this.ball.body  && bodyA.label == 'bumper') {
                    this.ball.launch(bodyA.position, .03, bodyA.angle);
                    this.score.value+=20;
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'bumper') {
                    this.ball.launch(bodyB.position, .03, bodyB.angle);
                    this.score.value+=20;
                }

                if (bodyB == this.ball.body  && bodyA.label == 'target') {
                   
                }
                else if (bodyA == this.ball.body  && bodyB.label== 'target') {

                }
            
            }
        });

        Events.on(this.engine, 'collisionActive', (event) => {
            for (var i = 0; i < event.pairs.length; i++) {
                let bodyA = event.pairs[i].bodyA;
                let bodyB = event.pairs[i].bodyB;
                if ((bodyB == this.ball.body && bodyA == this.spring) 
                    || (bodyA == this.ball.body && bodyB == this.spring)) {
                        this.onSpring = true;
                }
                
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
            //left block
            Bodies.trapezoid(24,420,140,30,Math.PI/5, { isStatic: true, angle: Math.PI/2 }), 
            //right block
            Bodies.trapezoid(515,420,140,30,Math.PI/5, { isStatic: true, angle: -Math.PI/2 }),
            //left lane
            Bodies.fromVertices(82,700,[[{x:0,y:0},{x:0,y:110},{x:90,y:136}]], {isStatic: true}),
            //right lane
            Bodies.fromVertices(458,700,[[{x:0,y:0},{x:0,y:110},{x:-90,y:136}]], {isStatic: true}),
            //left edge
            Bodies.rectangle(-10, 550, 40, 700, { isStatic: true }),
            //right edge
            Bodies.rectangle(610, 550, 40, 700, { isStatic: true }),
            //lane boundry
            Bodies.rectangle(543, 600, 30, 600, { isStatic: true }),
            //lane cap
            Bodies.circle(543, 300, 15, { isStatic: true }),
            //left ramp
            Bodies.rectangle(88, 804, 170, 30, { isStatic: true,  angle: Math.PI * .08}),
            //right ramp
            Bodies.rectangle(468, 804, 170, 30, { isStatic: true,  angle: Math.PI * -.08 }),
            //left corner
            Bodies.fromVertices(16,766,[[{x:0,y:0},{x:0,y:30},{x:20,y:30}]], {isStatic: true}),
            //right corner
            Bodies.fromVertices(522,770,[[{x:0,y:0},{x:0,y:30},{x:-20,y:30}]], {isStatic: true}),
            //top arch
            Bodies.fromVertices(320,100,getArchVerts(290,360), { isStatic: true }),
            // bottom bouncer
            Bodies.circle(300, 330, 40, {isStatic: true, label:'bouncer'}),
            // left bouncer
            Bodies.circle(220, 200, 40, {isStatic: true, label:'bouncer'}),
            // right bouncer
            Bodies.circle(380, 200, 40, {isStatic: true, label:'bouncer'}),
            // bumpers
            Bodies.rectangle(80, 670, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .81}),
            Bodies.rectangle(110, 715, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .81}),

            Bodies.rectangle(460, 670, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .19}),
            Bodies.rectangle(430, 715, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .19}),

            Bodies.rectangle(36,420, 20, 50, { isStatic: true, label:'bumper', angle: -Math.PI}),
            Bodies.rectangle(503,420, 20, 50, { isStatic: true, label:'bumper', angle: 0 }),
            
            // targets
            Bodies.circle(250, 500, 14, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(250, 550, 14, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(250, 600, 14, {isStatic: true, isSensor:true, label:'target'}),

            Bodies.circle(350, 500, 14, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(350, 550, 14, {isStatic: true, isSensor:true, label:'target'}),
            Bodies.circle(350, 600, 14, {isStatic: true, isSensor:true, label:'target'}),
        ]

        return bodies;
    }

    run() {
        const render: Render = Render.create({
            canvas: this.$canvas,
            engine: this.engine
        });

        render.options = {showAngleIndicator:true };

        // set the canvas size AFTER createding Render
        this.$canvas.width = 600;
        this.$canvas.height = 900;
        const runner: Runner = Runner.create();
        Runner.run(runner, this.engine);
        Render.run(render);
    }

    restart() {
        this.score.value = 0;
        this.balls.value = 3;
        this.ball.reset();
        this.over.value = false;
    }

}

export default PinBall;