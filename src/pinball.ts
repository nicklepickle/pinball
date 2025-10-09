
import Bindable from './bindable.ts';
import decomp from 'poly-decomp';
import { Engine, World, Render, Runner, Bodies, Composite, Common, Body, Events, Collision, Vector} from 'matter-js';
import Canvas from './canvas.ts'

const LEFT: number = 0;
const RIGHT: number = 2;

type ControlStyle = "mouse-1" | "mouse-2" | "keyboard" | "touch";

class Force {
    constructor(f:Matter.Vector, b:Body) {
        this.force = f;
        this.body = b;
    }
    force: Matter.Vector
    body: Body
}

class PinBall {
    controls: ControlStyle = "mouse-1";
    engine: Engine = Engine.create();
    runner: Runner = Runner.create();
    $canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement; 
    canvas: Canvas = new Canvas(this.$canvas);
    useCanvas:boolean = true;
    springDown:boolean = false;

    // game values
    balls = new Bindable(3);
    score = new Bindable(0);
    high = new Bindable(0);    
    over = new Bindable(false);
    bonus = new Bindable(10000) // score for extra ball
    batteryLevel = new Bindable(0);
    batteryMax: number = 400;

    downTime: Date = new Date();
    forces: Force[] = []; // forces that need to be applied
    ballInit: Matter.Vector = {x: 572, y: 720}
    
    // objects
    activeBalls: Body[] = [];
    targetsHit: Body[] = [];
    leftFlipper: Body = Bodies.fromVertices(207, 834, [[{x:0,y:0},{x:80, y:20},{x:80,y:40},{x:0,y:40}]],{isStatic:true,label:'flipper-left'})
    rightFlipper: Body = Bodies.fromVertices(351, 835, [[{x:0,y:0},{x:-80, y:20},{x:-80,y:40},{x:0,y:40}]],{isStatic:true,label:'flipper-right'})
    drain: Body = Bodies.rectangle(300,930,2000,100, { isStatic: true, isSensor:true })
    spring: Body  = Bodies.rectangle(574, 833, 30, 145, { isStatic: true, label:'spring'});

    constructor() {
        Common.setDecomp(decomp) // use poly-decomp for concave bodies
        this.engine.gravity = {x:0,y:.00038,scale:1}

        this.registerEvents()
        let bodies = this.create();

        bodies.push(this.leftFlipper,this.rightFlipper,this.drain,this.spring)
        //console.log('Added ' + bodies.length + ' bodies')
        
        Composite.add(this.engine.world,bodies)
        this.putBall(this.ballInit.x, this.ballInit.y)

    }

    ballOn(body: Body): Body | null {
        for(const b of this.activeBalls) {
            if (Collision.collides(body, b)) {
                return b;
            }       
        }
        return null;
    }

    putBall(x:number, y:number):Body {
        let b = Bodies.circle(x, y, 14, {restitution:.3, label:'ball'})
        
        Composite.add(this.engine.world,b)
        this.activeBalls.push(b);
        return b;
    }

    flipBall(side: number) {
        //console.log('side=' + side)
        if (side == LEFT) {
            let lp = this.leftFlipper.position;
            Body.setPosition(this.leftFlipper,{x:lp.x,y:820});
            Body.rotate(this.leftFlipper, Math.PI * -.15);
            for(const b of this.activeBalls) {
                if (Collision.collides(this.leftFlipper, b)) {
                    let p = b.position;
                    Body.setPosition(b,{ x:p.x, y:p.y-20})
                    this.launchBall(b,this.leftFlipper.position,.05)
                }
            }
        }
        if (side == RIGHT) {
            let rp = this.rightFlipper.position;
            Body.setPosition(this.rightFlipper,{x:rp.x,y:820});
            Body.rotate(this.rightFlipper, Math.PI * .15);
            for(const b of this.activeBalls) {
                if (Collision.collides(this.rightFlipper, b)) {
                    let p = b.position;
                    Body.setPosition(b,{ x:p.x, y:p.y-20})
                    this.launchBall(b,this.rightFlipper.position,.05)
                }
            }
        }
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

    shootBall(ball:Body) {
        var x = Math.random() * .01 - .005;
        var y = -Math.min((new Date().getTime()- this.downTime.getTime()) / 10000, .1);
        var force: Matter.Vector = {x:x, y:y};
        Body.applyForce(ball,ball.position,force)
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
                t.render.fillStyle = '#000';
            }

            let flash = (times:number) => {
                setTimeout(() => {
                    for(var t of this.targetsHit) {
                        t.render.fillStyle = '#EEC';
                    }
                }, 200)

                setTimeout(() => {
                    for(var t of this.targetsHit) {
                        t.render.fillStyle = '#000';
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
        document.addEventListener('mousedown', (e) => {
            this.springDown = true;
            if (this.ballOn(this.spring)) {
                this.downTime = new Date();
            }
            else {
                if (this.controls == "mouse-1") {
                    this.flipBall(LEFT);
                    this.flipBall(RIGHT);
                }
                else if (this.controls == "mouse-2") {
                    this.flipBall(e.button)
                }
            }

            if (e.button == RIGHT) {
                e.preventDefault();
                return false;
            }
        })

        document.addEventListener('mouseup', (e) => {
            this.springDown = false;
            let ball = this.ballOn(this.spring);
            if (ball != null) {
                this.shootBall(ball);
            }
          
            if (e.button == LEFT || this.controls != "mouse-2") {
                let lp = this.leftFlipper.position;
                Body.setPosition(this.leftFlipper,{x:lp.x,y:835});
                Body.setAngle(this.leftFlipper, 0)
            }
            if (e.button == RIGHT || this.controls != "mouse-2") {
                let rp = this.rightFlipper.position;
                Body.setPosition(this.rightFlipper,{x:rp.x,y:835});
                Body.setAngle(this.rightFlipper, 0)
            }
        })


        Events.on(this.engine, 'beforeUpdate', () => {
            for (var i = 0; i<this.forces.length; i++){
                Body.applyForce(this.forces[i].body, this.forces[i].body.position, this.forces[i].force);
            }
            this.forces=[]; // clear the array

            if (this.useCanvas) {
                this.canvas.render(this)
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

                // prevents stale down time if mouse clicked before collision
                else if (bodyB.label == 'ball' && bodyA.label == 'spring') {
                    this.downTime = new Date();
                }
                else if (bodyA.label == 'ball'  && bodyB.label== 'spring') {
                    this.downTime = new Date();
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
                let xOffset:number = (Math.random() * 40)  -20
                this.putBall(300 + xOffset,40);
                this.batteryLevel.value = 0
            }
        });

    }

    registerKeyboard() {
        let LeftDown: boolean = false;
        let RightDown: boolean = false;

        document.addEventListener('keydown', (e) => {
            //console.log(e.key)
            if (this.controls == 'keyboard') {
                if (e.key == 'ArrowDown' && !this.springDown) {     
                    this.springDown = true;
                    if (this.ballOn(this.spring)) {
                        this.downTime = new Date();              
                    }        
                }
                else if (e.key == 'ArrowLeft' && !LeftDown) {
                    LeftDown = true;
                    this.flipBall(LEFT);
                }
                else if (e.key == 'ArrowRight' && !RightDown) {
                    RightDown = true;
                    this.flipBall(RIGHT);
                }
            }
        })

        document.addEventListener('keyup', (e) => {
            if (this.controls == 'keyboard') {
                if (e.key == "ArrowDown") {       
                    this.springDown = false;
                    let ball = this.ballOn(this.spring);
                    if (ball != null) {
                        this.shootBall(ball);
                    }      
                }         
                else if (e.key == 'ArrowLeft') {
                    LeftDown = false;
                    let lp = this.leftFlipper.position;
                    Body.setPosition(this.leftFlipper,{x:lp.x,y:835});
                    Body.setAngle(this.leftFlipper, 0)
                }
                else if (e.key == 'ArrowRight') {
                    RightDown = false;
                    let rp = this.rightFlipper.position;
                    Body.setPosition(this.rightFlipper,{x:rp.x,y:835});
                    Body.setAngle(this.rightFlipper, 0)
                }
            }
        })
    }

    registerTouch() {
        document.addEventListener("touchstart", (e) => {
            e.preventDefault();
            this.springDown = true;
            if (this.ballOn(this.spring)) {
                this.downTime = new Date();
            }
            else {
                this.flipBall(LEFT);
                this.flipBall(RIGHT);
            }
        });


        document.addEventListener("touchend", () => {
            this.springDown = false;
            let ball = this.ballOn(this.spring);
            if (ball != null) {
                this.shootBall(ball);
            }
          

            let lp = this.leftFlipper.position;
            Body.setPosition(this.leftFlipper,{x:lp.x,y:835});
            Body.setAngle(this.leftFlipper, 0)

            let rp = this.rightFlipper.position;
            Body.setPosition(this.rightFlipper,{x:rp.x,y:835});
            Body.setAngle(this.rightFlipper, 0)

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

            //left lane,
            Bodies.fromVertices(92,690,[[{x:0,y:10},{x:0,y:140},{x:110,y:168},{x:6,y:8}]], {isStatic: true}),
            //right lane
            Bodies.fromVertices(452,690,[[{x:0,y:10},{x:0,y:140},{x:-100,y:168},{x:-6,y:8}]], {isStatic: true}),

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
            Bodies.rectangle(280, 550, 30, 30, {isStatic: true, label:'battery'}), // center segment must be 1st
            Bodies.circle(280, 535, 15, {isStatic: true, label:'battery'}),
            Bodies.circle(280, 565, 15, {isStatic: true, label:'battery'}),

            // upper bumpers
            Bodies.rectangle(36,420, 20, 50, { isStatic: true, label:'bumper', angle: -Math.PI}),
            Bodies.rectangle(502,420, 20, 50, { isStatic: true, label:'bumper', angle: 0 }),

            // lower bumpers
            Bodies.rectangle(85, 642, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .815}),
            Bodies.rectangle(131, 710, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .815}),

            Bodies.rectangle(456, 642, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .175}),
            Bodies.rectangle(414, 710, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .175}),
                
            // targets (left to right)
            Bodies.circle(100, 200, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
            Bodies.circle(135, 150, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
            
            Bodies.circle(190, 110, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
            Bodies.circle(255, 90, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),

            Bodies.circle(325, 90, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
            Bodies.circle(390, 110, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
            
            Bodies.circle(445, 150, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
            Bodies.circle(480, 200, 10, {isStatic: true, isSensor:true, label:'target', render: {fillStyle: '#000'}}),
        ]

        return bodies;
    }

    run() {
        Runner.run(this.runner, this.engine);
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
            t.render.fillStyle = '#000'
        }
        this.targetsHit = [];
    }

}

export default PinBall;
export type {ControlStyle};