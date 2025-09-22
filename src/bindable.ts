class Bindable {
    _events: EventTarget = new EventTarget();
    _value: any;

    constructor(v: any) {
        this._value = v;
    }

    set value(v: any) {
        this._value = v;
        this._events.dispatchEvent(new Event('change'));
    }

    get value() {
        return this._value;
    }

    addEventListener(type: string, listener:EventListenerOrEventListenerObject, options:any=null) {
        this._events.addEventListener(type,listener,options)
    }
}

export default Bindable;