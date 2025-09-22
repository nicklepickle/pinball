import decomp from 'poly-decomp';
import { Engine, Render, Runner, Bodies, Composite, Common, Body, Events, Collision, Vector} from 'matter-js';
import Bindable from '/src/bindable.ts';





let forces: Matter.Vector[] = []; // forces that need to be applied
function launchBall(ball: Body, from: Vector, velocity: number, angle:number=-999) {
    if (angle == -999) {
        var deltaX = from.x - ball.position.x;
        var deltaY = from.y - ball.position.y;
        angle= Math.atan2(deltaY, deltaX);
    }


    var x = velocity * -Math.cos(angle);
    var y = velocity * -Math.sin(angle);
    forces.push( {x:x, y:y}); // can't apply force in an event handler (dumb)
}

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


Common.setDecomp(decomp) // use poly-decomp for concave bodies

window.addEventListener('load', () => {

const $canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement; 
const $score: HTMLElement = document.getElementById('score') as HTMLElement;
const $balls: HTMLElement = document.getElementById('balls') as HTMLElement;
const $restart: HTMLElement = document.getElementById('restart') as HTMLElement;



var engine: Engine = Engine.create();
engine.gravity = {x:0,y:.00038,scale:1}
var render: Render = Render.create({
    canvas: $canvas,
    engine: engine,
});

// set the canvas size AFTER createding Render
$canvas.width = 600;
$canvas.height = 900;

/*---------------- move to scene function -------------- */

var leftBlock = Bodies.trapezoid(24,420,140,30,Math.PI/5, { isStatic: true, angle: Math.PI/2 });
var rightBlock = Bodies.trapezoid(520,420,140,30,Math.PI/5, { isStatic: true, angle: -Math.PI/2 });

var leftLane = Bodies.fromVertices(82,700,[[{x:0,y:0},{x:0,y:110},{x:90,y:136}]], {isStatic: true})
var rightLane = Bodies.fromVertices(458,700,[[{x:0,y:0},{x:0,y:110},{x:-90,y:136}]], {isStatic: true})

var leftEdge: Body  = Bodies.rectangle(-10, 550, 40, 700, { isStatic: true });
var rightEdge: Body  = Bodies.rectangle(610, 550, 40, 700, { isStatic: true });

var laneBoundry: Body  = Bodies.rectangle(543, 600, 20, 600, { isStatic: true });
var laneCap:  Body  = Bodies.circle(543, 300, 10, { isStatic: true });

var spring: Body  = Bodies.rectangle(572, 860, 30, 30, { isStatic: true });

var leftRamp: Body  = Bodies.rectangle(90, 800, 170, 20, { isStatic: true,  angle: Math.PI * .08});
var rightRamp: Body  = Bodies.rectangle(465, 800, 170, 20, { isStatic: true,  angle: Math.PI * -.08 });

var leftCorner = Bodies.fromVertices(14,770,[[{x:0,y:0},{x:0,y:20},{x:15,y:20}]], {isStatic: true})
var rightCorner = Bodies.fromVertices(528,772,[[{x:0,y:0},{x:0,y:20},{x:-15,y:20}]], {isStatic: true})

var arch = Bodies.fromVertices(320,100,getArchVerts(290,360), { isStatic: true });
var oob = Bodies.rectangle(300,910,600,10, { isStatic: true, isSensor:true })


var leftFlipper: Body = Bodies.fromVertices(204, 827, [[{x:0,y:0},{x:80, y:20},{x:80,y:24},{x:0,y:24}]],{isStatic:true})
var rightFlipper: Body = Bodies.fromVertices(351, 827, [[{x:0,y:0},{x:-80, y:20},{x:-80,y:24},{x:0,y:24}]],{isStatic:true,})

var bouncer1: Matter.Body = Bodies.circle(300, 330, 40, {isStatic: true, label:'bouncer'  })
var bouncer2: Matter.Body = Bodies.circle(220, 200, 40, {isStatic: true, label:'bouncer'  })
var bouncer3: Matter.Body = Bodies.circle(380, 200, 40, {isStatic: true, label:'bouncer'  })

var bumper1: Body  = Bodies.rectangle(80, 670, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .81});
var bumper2: Body  = Bodies.rectangle(110, 715, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .81});

var bumper3: Body  = Bodies.rectangle(460, 670, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .19});
var bumper4: Body  = Bodies.rectangle(430, 715, 20, 50, { isStatic: true, label:'bumper', angle: Math.PI * .19});

var bumper5: Body  = Bodies.rectangle(36,420, 20, 50, { isStatic: true, label:'bumper', angle: -Math.PI});
var bumper6: Body  = Bodies.rectangle(508,420, 20, 50, { isStatic: true, label:'bumper', angle: 0 });


var ball: Matter.Body = Bodies.circle(572, 700, 14, {restitution:.3  })


// add all of the bodies to the world
Composite.add(engine.world, [spring, leftRamp, rightRamp, arch, leftFlipper, rightFlipper,
    leftBlock,rightBlock,leftLane,rightLane, leftCorner, rightCorner, bumper1, bumper2,bumper3,bumper4,bumper5,bumper6,
  leftEdge, rightEdge, laneBoundry, laneCap, oob, bouncer1, bouncer2, bouncer3, ball]);

/* ----------------------------------------------------- */


var downTime: Date;
var onSpring = false;

const balls = new Bindable(3);
const score = new Bindable(0);
const high = new Bindable(0);

balls.addEventListener('change',() => {
    $balls.innerHTML='BALLS<br />' + balls.value;
})

score.addEventListener('change',() => {
    $score.innerHTML=score.value + '<br />' + high.value;
})

high.addEventListener('change',() => {
    $score.innerHTML=score.value + '<br />' + high.value;
})

$canvas.addEventListener('mousedown', () => {
    if (onSpring) {
        downTime = new Date();
    }
    else {
        if (ball.position.x < 550) {
            Body.rotate(leftFlipper, Math.PI * -.15);
            Body.rotate(rightFlipper, Math.PI * .15);
        }
        if (Collision.collides(leftFlipper, ball)) {
           launchBall(ball,leftFlipper.position,.06)
        }
        else if (Collision.collides(rightFlipper, ball)) {
           launchBall(ball,rightFlipper.position,.06)
        }
    }
})

$canvas.addEventListener('mouseup', () => {
    if (onSpring) {
        var x = Math.random() * .01 - .005;
        var y = -Math.min((new Date().getTime()- downTime.getTime()) / 5000, .1);
        var force: Matter.Vector = {x:x, y:y};
        Body.applyForce(ball,ball.position,force)
        onSpring = false;
    }

    Body.setAngle(leftFlipper, 0)
    Body.setAngle(rightFlipper, 0)

})

document.addEventListener('click', (e) => {
    if (e.shiftKey) {
        Body.setVelocity(ball, {x:0, y:0})
        Body.setPosition(ball, {x:e.clientX, y:e.clientY})
    }
})



Events.on(engine, 'beforeUpdate', function() {
    for (var i = 0; i<forces.length; i++){
        Body.applyForce(ball, ball.position, forces[i]);
    }
    forces=[]; // clear the array
});


Events.on(engine, 'collisionStart', function(event) {
    for (var i = 0; i < event.pairs.length; i++) {
        let bodyA = event.pairs[i].bodyA;
        let bodyB = event.pairs[i].bodyB;
        var resetBall = ((bodyB == ball && bodyA == oob) || (bodyA == ball && bodyB == oob));

        if (resetBall) {
          if (balls.value == 0) {
            if (high.value < score.value) {
                high.value = score.value;
            }
            $restart.style.display = 'block'
          }
          else {
            balls.value--;
            setTimeout(() => {
                Body.setVelocity(ball, {x:0, y:0})
                Body.setPosition(ball, {x:572, y:700})
            }, 2000)
          }
        } 
        
        if (bodyB == ball && bodyA.label == 'bouncer') {
            launchBall(ball, bodyA.position, .03)
            score.value+=100;
        }
        else if (bodyA == ball && bodyB.label== 'bouncer') {
            launchBall(ball, bodyB.position, .03)
            score.value+=100;
        }

        if (bodyB == ball && bodyA.label == 'bumper') {
            launchBall(ball, bodyA.position, .03, bodyA.angle)
            score.value+=10;
        }
        else if (bodyA == ball && bodyB.label== 'bumper') {
            launchBall(ball, bodyB.position, .03, bodyA.angle)
            score.value+=10;
        }
    
    }
});

Events.on(engine, 'collisionActive', function(event) {
    for (var i = 0; i < event.pairs.length; i++) {
        let bodyA = event.pairs[i].bodyA;
        let bodyB = event.pairs[i].bodyB;
        if ((bodyB == ball && bodyA == spring) || (bodyA == ball && bodyB == spring)) {
          onSpring = true;
        }
        
    }
});

document.querySelector('#restart a')?.addEventListener('click', () => {
    score.value = 0;
    balls.value = 3;
    $restart.style.display = 'none';
    Body.setVelocity(ball, {x:0, y:0})
    Body.setPosition(ball, {x:572, y:700})
})

// run the renderer
Render.run(render);

// create runner
var runner: Runner = Runner.create();
Runner.run(runner, engine);
})
