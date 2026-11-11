/// <reference types="blazor__javascript-interop" />
export class EventTargetPatching {
    static get Instance() {
        var _a;
        (_a = EventTargetPatching.instance) !== null && _a !== void 0 ? _a : (EventTargetPatching.instance = new EventTargetPatching());
        return EventTargetPatching.instance;
    }
    // the constructor is private to enforce the singleton pattern.
    // it ensures that only one instance of the EventTargetPatching
    // class can be created.The instance is accessed through the 
    // static instance property, which creates a new instance if 
    // one does not already exist. 
    constructor() {
        // the patchedEventTargets WeakMap is used to store 
        // the mapping between the original EventTarget and
        // the corresponding PatchedEventTarget. this allows
        // the patchEventTarget method to check if an EventTarget 
        // has already been patched and return the existing 
        // PatchedEventTarget if it has.
        this.patchedEventTargets = new WeakMap();
        // the listeners WeakMap is used to store the mapping
        // between the original event listener and the corresponding
        // wrapper function. this allows the addEventListener
        // and removeEventListener methods to ensure that the
        // correct wrapper is added or removed when the original
        // listener is added or removed. the wrapper function is
        // responsible for invoking the original listener and the
        // blazor event receiver when the event is triggered.
        this.listeners = new WeakMap();
    }
    // The patchEventTarget method is responsible for patching the addEventListener
    // and removeEventListener methods of the specified EventTarget.  It creates a
    // new PatchedEventTarget object that wraps the original EventTarget and provides
    // additional functionality for handling events in Blazor.
    //
    // The method first checks if the EventTarget has already been patched, and if so,
    // returns the existing PatchedEventTarget. if not, it captures the native methods
    // of the EventTarget before replacing them to avoid recursive calls.It then creates
    // a new PatchedEventTarget object with a unique identity, an event receiver, and 
    // methods for describing events, adding event listeners, removing event listeners,
    // and dispatching events. finally, it replaces the original methods of the EventTarget
    // with the patched methods and stores the PatchedEventTarget in a WeakMap for future
    // reference. 
    patchEventTarget(eventTarget, eventReceiver) {
        const existing = this.patchedEventTargets.get(eventTarget);
        if (existing) {
            return existing;
        }
        // capture native methods before replacing them to avoid 
        // recursive calls.
        const add = eventTarget.addEventListener.bind(eventTarget);
        const remove = eventTarget.removeEventListener.bind(eventTarget);
        const dispatch = eventTarget.dispatchEvent.bind(eventTarget);
        // create a new PatchedEventTarget object that wraps the original
        // EventTarget and provides additional functionality for handling
        // events in blazor.
        const patched = {
            // the identity is a unique identifier for the patched event
            // target. it is generated using the crypto.randomUUID() method,
            // which creates a random UUID (universally unique identifier)
            // that can be used to distinguish between different patched
            // event targets.this is useful for tracking and managing patched
            // event targets, especially when multiple event targets are
            // being patched in the same application.
            identity: crypto.randomUUID(),
            // the eventReceiver is a DotNetObject that will receive events
            // from the browser.  it is passed to the patchEventTarget method
            // and stored in the PatchedEventTarget object for later use.
            // this allows blazor to receive events from the browser and 
            // process them in C# code.
            eventReceiver,
            // the describeEvent method is responsible for creating a
            // BrowserEvent object that describes the specified event.
            // it extracts relevant properties from the event and its target,
            // such as type, timestamp, bubbles, cancelable, defaultPrevented,
            // value, checked, key, code, button,clientX, clientY, and detail.
            // this allows blazor to receive events from the browser and process
            // them in C# code.
            describeEvent: (event) => {
                const target = event.target;
                return {
                    type: event.type,
                    timeStamp: event.timeStamp,
                    bubbles: event.bubbles,
                    cancelable: event.cancelable,
                    defaultPrevented: event.defaultPrevented,
                    value: target instanceof HTMLInputElement ||
                        target instanceof HTMLSelectElement ||
                        target instanceof HTMLTextAreaElement
                        ? target.value : null,
                    checked: target instanceof HTMLInputElement ?
                        target.checked : null,
                    key: event instanceof KeyboardEvent ?
                        event.key : null,
                    code: event instanceof KeyboardEvent ?
                        event.code : null,
                    button: event instanceof MouseEvent ?
                        event.button : null,
                    clientX: event instanceof MouseEvent ?
                        event.clientX : null,
                    clientY: event instanceof MouseEvent ?
                        event.clientY : null,
                    // custom event detail must be 
                    // json- serializable, like all blazor
                    // interop arguments.
                    detail: event instanceof CustomEvent ?
                        event.detail : null
                };
            },
            // the addEventListener method is patched to wrap
            // the original listener in a new function that 
            // handles the event and invokes the Blazor event
            // receiver.  this allows blazor to receive events
            // from the browser and process them in C# code.
            addEventListener: (type, listener, options) => {
                var _a;
                console.log(`adding event listener for ${type} on ${patched.identity}`);
                if (listener === null) {
                    add(type, null, options);
                    return;
                }
                const capture = typeof options === "boolean" ?
                    options : (_a = options === null || options === void 0 ? void 0 : options.capture) !== null && _a !== void 0 ? _a : false;
                const key = JSON.stringify([type, capture]);
                let registrations = this.listeners.get(listener);
                if (!registrations) {
                    console.log(`creating new registration map for listener on ${patched.identity}`);
                    registrations = new Map();
                    this.listeners.set(listener, registrations);
                }
                let wrapper = registrations.get(type);
                if (!wrapper) {
                    console.log(`creating new wrapper for listener on ${patched.identity}`);
                    wrapper = (event) => {
                        try {
                            console.log(`invoking listener for ${type} on ${patched.identity}`);
                            if (typeof listener === "function") {
                                listener.call(eventTarget, event);
                            }
                            else {
                                listener.handleEvent(event);
                            }
                            console.log(`listener for ${type} on ${patched.identity} completed successfully`);
                        }
                        finally {
                            console.log(`invoking blazor event receiver for ${type} on ${patched.identity}`);
                            void patched.eventReceiver
                                .invokeMethodAsync("OnEvent", patched.identity, patched.describeEvent(event))
                                .catch((error) => console.error('blazor event delivery failed', error));
                            console.log(`blazor event receiver for ${type} on ${patched.identity} completed`);
                        }
                    };
                    console.log(`storing wrapper for listener on ${patched.identity}`);
                    registrations.set(type, wrapper);
                }
                console.log(`adding event listener for ${type} on ${patched.identity}`);
                add(type, wrapper, options);
            },
            // the removeEventListener method is patched to 
            // ensure that the correct wrapper is removed 
            // when the original listener is removed.  this
            // is necessary because the original listener 
            // is wrapped in a new function that handles the
            // event and invokes the Blazor event receiver.
            removeEventListener: (type, listener, options) => {
                var _a;
                const capture = typeof options === "boolean" ? options : (_a = options === null || options === void 0 ? void 0 : options.capture) !== null && _a !== void 0 ? _a : false;
                const key = JSON.stringify([type, capture]);
                const registrations = listener === null ? undefined :
                    this.listeners.get(listener);
                const wrapper = registrations === null || registrations === void 0 ? void 0 : registrations.get(key);
                console.log(`removing event listener for ${type} on ${patched.identity}`);
                remove(type, wrapper !== null && wrapper !== void 0 ? wrapper : listener, options);
                console.log(`removing wrapper for listener on ${patched.identity}`);
                registrations === null || registrations === void 0 ? void 0 : registrations.delete(key);
            },
            // the dispatchEvent method is patched to ensure that
            // the correct wrapper is invoked when the event is
            // dispatched.  this is necessary because the original
            // listener is wrapped in a new function that handles
            // the event and invokes the blazor event receiver.
            dispatchEvent: dispatch
        };
        // replace the original methods of the EventTarget with the patched methods
        // this allows blazor to receive events from the browser and process them
        // in C# code. the addEventListener method is patched to wrap
        eventTarget.addEventListener = patched.addEventListener;
        // the removeEventListener method is patched to
        // ensure that the correct wrapper is removed when
        // the original listener is removed.
        eventTarget.removeEventListener = patched.removeEventListener;
        // the dispatchEvent method is patched to ensure that
        // the correct wrapper is invoked when the event is
        // dispatched.  this is necessary because the original
        // listener is wrapped in a new function that handles
        // the event and invokes the blazor event receiver.
        eventTarget.dispatchEvent = patched.dispatchEvent;
        console.log(`patched event target ${patched.identity} created and stored`);
        this.patchedEventTargets.set(eventTarget, patched);
        return patched;
    }
}
export function patchEventTarget(eventTarget, eventReceiver) {
    return EventTargetPatching.Instance.patchEventTarget(eventTarget, eventReceiver);
}
export function registerEventTargetPatching() {
    if (typeof globalThis.patchEventTarget === "undefined") {
        globalThis.patchEventTarget = patchEventTarget;
    }
}
//# sourceMappingURL=EventTargetPatching.js.map