
import Bindable from './bindable.ts';
import decomp from 'poly-decomp';
import { Engine, World, Render, Runner, Bodies, Composite, Common, Body, Events, Collision, Vector} from 'matter-js';
import Canvas from './canvas.ts'

class Force {
    constructor(f:Matter.Vector, b:Body) {
        this.force = f;
        this.body = b;
    }
    force: Matter.Vector
    body: Body
}
/*
class Ball {
    init: Matter.Vector = {x: 572, y: 700}
    body: Body = Bodies.circle(this.init.x, this.init.y, 14, {restitution:.3, label:'ball'})

    reset() {
        this.setPosition(this.init.x,this.init.y);
    }
    setPosition(x:number,y:number) {
        Body.setVelocity(this.body, {x:0, y:0});
        Body.setPosition(this.body, {x:x, y:y});
    }

}
*/

class PinBall {
    engine: Engine = Engine.create();
    $canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement; 
    //context:any=null;
    canvas: Canvas = new Canvas(this.$canvas);
    useCanvas:boolean = true;

    // game values
    balls = new Bindable(3);
    score = new Bindable(0);
    high = new Bindable(0);    
    over = new Bindable(false);
    bonus = new Bindable(10000) // score for extra ball
    batteryLevel = new Bindable(0);
    batteryMax: number = 400;

    downTime: Date = new Date();
    get onSpring(): Body | null {
        for(const b of this.activeBalls) {
            if (Collision.collides(this.spring, b)) {
                return b;
            }       
        }
        return null;
    } 

    forces: Force[] = []; // forces that need to be applied
    ballInit: Matter.Vector = {x: 572, y: 700}
    

    // objects
    activeBalls: Body[] = [];
    leftFlipper: Body = Bodies.fromVertices(205, 835, [[{x:0,y:0},{x:80, y:20},{x:80,y:40},{x:0,y:40}]],{isStatic:true,label:'flipper-left'})
    rightFlipper: Body = Bodies.fromVertices(351, 835, [[{x:0,y:0},{x:-80, y:20},{x:-80,y:40},{x:0,y:40}]],{isStatic:true,label:'flipper-right'})
    drain: Body = Bodies.rectangle(300,930,2000,100, { isStatic: true, isSensor:true })
    spring: Body  = Bodies.rectangle(574, 863, 30, 30, { isStatic: true });
    targetsHit: Body[] = [];

    constructor() {
        Common.setDecomp(decomp) // use poly-decomp for concave bodies
        this.engine.gravity = {x:0,y:.00038,scale:1}

        this.registerEvents()
        let bodies = this.create();

        //Body.setCentre(this.leftFlipper,{x:2,y:2},true)
        //Body.setCentre(this.rightFlipper,{x:2,y:2},true)


        bodies.push(this.leftFlipper,this.rightFlipper,this.drain,this.spring)
        //console.log('Added ' + bodies.length + ' bodies')
        
        Composite.add(this.engine.world,bodies)
        this.putBall(this.ballInit.x, this.ballInit.y)

    }
    putBall(x:number, y:number):Body {
        let b = Bodies.circle(x, y, 14, {restitution:.3, label:'ball'})
        
        Composite.add(this.engine.world,b)
        this.activeBalls.push(b);

        //console.log('activeBalls',this.activeBalls.length)
        return b;
    }

    launchBall(body:Body, from: Vector, velocity: number, angle:number=-999) {
        // if an angle wasn't passed use the angle to the "from" loacation
        if (angle == -999) {
            let deltaX = from.x - body.position.x;
            let deltaY = from.y - body.position.y;
            angle= Math.atan2(deltaY, deltaX);
        }

        let x = velocity * -Math.cos(angle);
        let y = velocity * -Math.sin(angle);
        this.forces.push(new Force({x:x, y:y},body)); // can't apply force in an event handler      
    }

    drainBall(ball:Body) {
        //console.log('activeBalls', this.activeBalls.length)
        if (this.activeBalls.length > 1) {
            // if bonus ball
            let i:number = this.activeBalls.indexOf(ball);

            //console.log('remove', i)
            this.activeBalls.splice(i,1);
            World.remove(this.engine.world, ball);
        }
        else {
            if (this.balls.value == 0) {
                if (this.high.value < this.score.value) {
                    this.high.value = this.score.value;
                }

                this.over.value = true;
            }
            else {
                this.balls.value--;
                setTimeout(() => {
                    Body.setVelocity(ball, {x:0, y:0});
                    Body.setPosition(ball, {x:this.ballInit.x, y:this.ballInit.y});
                }, 2000)
            }
        }

    }

    hitTarget(body:Body) {
        body.render.fillStyle = '#EEC';
        this.targetsHit.push(body);


        if (this.targetsHit.length == 8) {
            for(var t of this.targetsHit) {
                t.render.fillStyle = '#111';
            }


            let flash = (times:number) => {
                setTimeout(() => {
                    for(var t of this.targetsHit) {
                        t.render.fillStyle = '#EEC';
                    }
                }, 200)

                setTimeout(() => {
                    for(var t of this.targetsHit) {
                        t.render.fillStyle = '#111';
                    }
                    if (times < 4) {
                        times++;
                        flash(times);
                    }
                    else {
                        this.targetsHit = [];
                        this.score.value += 1000;
                    }
                }, 400)
            }
            flash(0);

        }
    }

    registerEvents() {

        document.addEventListener('mousedown', () => {
            if (this.onSpring) {
                this.downTime = new Date();
            }
            else {


                let lp = this.leftFlipper.position;
                let rp = this.rightFlipper.position;
                Body.setPosition(this.leftFlipper,{x:lp.x,y:820});
                Body.rotate(this.leftFlipper, Math.PI * -.15);
                Body.setPosition(this.rightFlipper,{x:rp.x,y:820});
                Body.rotate(this.rightFlipper, Math.PI * .15);

                for(const b of this.activeBalls) {
                    if (Collision.collides(this.leftFlipper, b)) {
                        let p = b.position;
                        Body.setPosition(b,{ x:p.x, y:p.y-20})
                        this.launchBall(b,this.leftFlipper.position,.05)
                    }
                    else if (Collision.collides(this.rightFlipper, b)) {
                        let p = b.position;
                        Body.setPosition(b,{ x:p.x, y:p.y-20})
                        this.launchBall(b,this.rightFlipper.position,.05)
                    }
                }

            }
        })

        document.addEventListener('mouseup', () => {
            let ball = this.onSpring;
            if (ball != null) {
                //let force = -Math.min((new Date().getTime()- this.downTime.getTime()) / 5000, .1);
                //this.ball.launch(this.spring.position,force,Math.PI/2)
                
                var x = Math.random() * .01 - .005;
                var y = -Math.min((new Date().getTime()- this.downTime.getTime()) / 5000, .1);
                var force: Matter.Vector = {x:x, y:y};
                Body.applyForce(ball,ball.position,force)

            }
            let lp = this.leftFlipper.position;
            let rp = this.rightFlipper.position;
            Body.setPosition(this.leftFlipper,{x:lp.x,y:835});
            Body.setPosition(this.rightFlipper,{x:rp.x,y:835});
            Body.setAngle(this.leftFlipper, 0)
            Body.setAngle(this.rightFlipper, 0)

        })


        Events.on(this.engine, 'beforeUpdate', () => {
            for (var i = 0; i<this.forces.length; i++){
                Body.applyForce(this.forces[i].body, this.forces[i].body.position, this.forces[i].force);
            }
            this.forces=[]; // clear the array

            if (this.useCanvas) {
                this.canvas.render(this.engine.world.bodies)
            }
        });

        Events.on(this.engine, 'collisionStart', (event) => {
            for (var i = 0; i < event.pairs.length; i++) {
                let bodyA = event.pairs[i].bodyA;
                let bodyB = event.pairs[i].bodyB;


                if (bodyB.label == 'ball' && bodyA == this.drain) {
                    this.drainBall(bodyB)
                }
                else if (bodyA.label == 'ball'  && bodyB == this.drain) {
                    this.drainBall(bodyA)
                }
                
                else if (bodyB.label == 'ball' && bodyA.label == 'bouncer') {
                    this.launchBall(bodyB, bodyA.position, .02);
                    this.score.value+=100;
                }
                else if (bodyA.label == 'ball'  && bodyB.label== 'bouncer') {
                    this.launchBall(bodyA, bodyB.position, .02);
                    this.score.value+=100;
                }

                else if (bodyB.label == 'ball'  && bodyA.label == 'bumper') {
                    this.launchBall(bodyB, bodyA.position, .02, bodyA.angle);
                    this.score.value+=20;
                }
                else if (bodyA.label == 'ball'  && bodyB.label== 'bumper') {
                    this.launchBall(bodyA, bodyB.position, .02, bodyB.angle);
                    this.score.value+=20;
                }

                else if (bodyB.label == 'ball' && bodyA.label == 'target') {
                   if (this.targetsHit.find((b) => b == bodyA) == undefined) {
                        this.hitTarget(bodyA)

                   }
                }
                else if (bodyA.label == 'ball'  && bodyB.label== 'target') {
                   if (this.targetsHit.find((b) => b == bodyB) == undefined) {
                        this.hitTarget(bodyB)
                   }
                }

                else if (bodyB.label == 'ball'  && bodyA.label == 'corner') {
                    this.launchBall(bodyB, bodyA.position, .004);
                }
                else if (bodyA.label == 'ball'  && bodyB.label== 'corner') {
                    this.launchBall(bodyA, bodyB.position, .004);
                }

                else if (bodyB.label == 'ball'  && bodyA.label == 'battery') {
                    this.launchBall(bodyB, bodyA.position, .02);
                    if (this.batteryLevel.value < this.batteryMax) {
                        this.batteryLevel.value += 10;
                    }        

                    this.score.value += this.batteryLevel.value;
                }
                else if (bodyA.label == 'ball'  && bodyB.label== 'battery') {
                    this.launchBall(bodyA, bodyB.position, .02);
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

        this.batteryLevel.addEventListener('change', ()=> {
            if (this.batteryLevel.value == this.batteryMax) {
                this.batteryLevel.value = 0
                this.putBall(300,40)
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

        Body.setVelocity(this.activeBalls[0], {x:0, y:0});
        Body.setPosition(this.activeBalls[0], {x:this.ballInit.x, y:this.ballInit.y});

        this.over.value = false;
        for(var t of this.targetsHit) {
            t.render.fillStyle = '#111'
        }
        this.targetsHit = [];
    }

}

export default PinBall;