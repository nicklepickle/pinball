import Cookie from './cookie.ts'
import PinBall, {type ControlStyle} from './pinball.ts';

window.addEventListener('load', () => {
    const game = new PinBall();
    const $score: HTMLElement = document.getElementById('score') as HTMLElement;
    const $balls: HTMLElement = document.getElementById('balls') as HTMLElement;
    const $restart: HTMLElement = document.getElementById('restart') as HTMLElement;
    const $battery: HTMLElement = document.getElementById('battery') as HTMLElement;
    const $instructions: HTMLElement = document.getElementById('instructions') as HTMLElement;

    const preventContextMenu = (e2:Event) => {
        e2.preventDefault();
        return false;
    }

    const c = Cookie.getCookie('_ps_pb')
    
    if (c) {
        let state = JSON.parse(c)
        console.log(state);
        game.high.value = state.high;
        game.controls = state.controls;
        
        if (game.controls == "keyboard") {
            game.registerKeyboard()
        }
        else if (game.controls == "touch") {
            game.registerTouch()
        }
        else if (game.controls == "mouse-2") {
            document.addEventListener('contextmenu',preventContextMenu)
        }
    }

    game.balls.addEventListener('change',() => {
        $balls.innerHTML=game.balls.value + ' BALLS';
    })

    game.score.addEventListener('change',() => {
        $score.innerHTML=game.score.value + '<br />' + game.high.value;
    })

    game.high.addEventListener('change',() => {
        $score.innerHTML=game.score.value + '<br />' + game.high.value;

        let c = {high:game.high.value, controls:game.controls}
        Cookie.setCookie('_ps_pb',JSON.stringify(c));
    })

    game.over.addEventListener('change', () => {

        if (game.over.value) {
            $balls.innerHTML = "GAME OVER"
            $restart.style.display = 'block'
        }
        else {
            $balls.innerHTML = game.balls.value + ' BALLS';
            $restart.style.display = 'none'
        }
    })

    game.batteryLevel.addEventListener('change',() => {
        let p =  game.batteryLevel.value/game.batteryMax;
        $battery.style.borderTopWidth = (30 - (30 * p)).toString()+'px';
        $battery.style.height = (30 * p).toString()+'px';

        let r = Math.min(250, (250 * ((100 - (p * 100)) / 80)));
        let g = Math.min(220, (240 * ((p * 100) / 40)));
        let rgb = "RGB(" + r.toString() + "," + g.toString() + ",0)";

        //console.log(p,rgb)

        $battery.style.backgroundColor = rgb

    })

    document.querySelector('#restart a')?.addEventListener('click', () => {
        game.restart();
    })

    document.getElementById('open-instructions')?.addEventListener('click',() => {
        game.runner.enabled = false;
        $instructions.style.display = 'block';
    })

    document.getElementById('x')?.addEventListener('click',() => {
        game.runner.enabled = true;
        $instructions.style.display = 'none';
    })



    document.querySelectorAll('input[type="radio"]').forEach((radio) => {
        if (radio.value == game.controls) {
            console.log(radio.value )
            radio.checked = true;
        }
        radio.addEventListener('click', (e) => {
            let target = e.target as HTMLInputElement
            game.controls = target.value as ControlStyle;
 
            if (game.controls == "mouse-2") {
                document.addEventListener('contextmenu',preventContextMenu)
            }
            else {
                document.removeEventListener('contextmenu', preventContextMenu)
            }

            if (game.controls == "keyboard") {
                game.registerKeyboard()
            }
            else if (game.controls == "touch") {
                game.registerTouch()
            }

            let c = {high:game.high.value, controls:game.controls}
            Cookie.setCookie('_ps_pb',JSON.stringify(c));
        })
    })


    game.run();
    
})

