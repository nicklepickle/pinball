import Cookie from './cookie.ts'
import PinBall from './pinball.ts';

window.addEventListener('load', () => {
    const game = new PinBall();

    const $score: HTMLElement = document.getElementById('score') as HTMLElement;
    const $balls: HTMLElement = document.getElementById('balls') as HTMLElement;
    const $restart: HTMLElement = document.getElementById('restart') as HTMLElement;

    let c = Cookie.getCookie('_ps_pb')
    if (c) {
        game.high.value = JSON.parse(c).high;
    }

    game.balls.addEventListener('change',() => {
        $balls.innerHTML='BALLS<br />' + game.balls.value;
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
        $restart.style.display = (game.over.value) ? 'block' : 'none';
    })

    document.querySelector('#restart a')?.addEventListener('click', () => {
        game.restart();
    })
    game.run();
})

