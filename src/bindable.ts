class Bindable {
    _events: EventTarget = new EventTarget();
    _value: any;

    constructor(v: any) {
        this._value = v;
    }

    set value(v: any) {
        this._value = v;
        this.dispatchEvent(new Event('change'));
    }

    get value() {
        return this._value;
    }

    addEventListener(type: string, listener:EventListenerOrEventListenerObject, options:any=null) {
        this._events.addEventListener(type,listener,options)
    }

    dispatchEvent(event: Event) {
        this._events.dispatchEvent(event);
    }

    removeEventListener(type: string, listener:EventListenerOrEventListenerObject, options:any=null) {
        this._events.removeEventListener(type, listener, options)
    }

}

export default Bindable;