import Cookie from './cookie.ts'
import PinBall from './pinball.ts';

window.addEventListener('load', () => {
    const game = new PinBall();
    const $score: HTMLElement = document.getElementById('score') as HTMLElement;
    const $balls: HTMLElement = document.getElementById('balls') as HTMLElement;
    const $restart: HTMLElement = document.getElementById('restart') as HTMLElement;
    const $battery: HTMLElement = document.getElementById('battery') as HTMLElement;

    game.balls.addEventListener('change',() => {
        $balls.innerHTML=game.balls.value + ' BALLS';
    })

    game.score.addEventListener('change',() => {
        $score.innerHTML=game.score.value + '<br />' + game.high.value;
    })

    game.high.addEventListener('change',() => {
        $score.innerHTML=game.score.value + '<br />' + game.high.value;

        let c = {high:game.high.value}
        Cookie.setCookie('_ps_pb',JSON.stringify(c));
    })

    game.over.addEventListener('change', () => {

        if (game.over.value) {
            $restart.style.display = 'block'
            $balls.innerHTML = "GAME OVER"
        }
        else {
            $restart.style.display = 'none'
            $balls.innerHTML = game.balls.value + ' BALLS';
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

    //debug
    /*
    game.$canvas.addEventListener('click', (e) => {
        if (e.shiftKey) {
            game.putBall(300,40);
        }
    })
     */

    let c = Cookie.getCookie('_ps_pb')
    if (c) {
        game.high.value = JSON.parse(c).high;
    }
    game.run();



/*
    const downloadButton = document.getElementById('downloadButton');

    downloadButton.addEventListener('click', function() {
        // Convert the canvas to a data URL (PNG by default)
        const dataURL = document.getElementById('canvas').toDataURL('image/png');

        // Create a temporary anchor element
        const link = document.createElement('a');

        // Set the download attribute with a desired filename
        link.download = 'my-canvas-image.png';

        // Set the href attribute to the data URL
        link.href = dataURL;

        
    });
*/
})

