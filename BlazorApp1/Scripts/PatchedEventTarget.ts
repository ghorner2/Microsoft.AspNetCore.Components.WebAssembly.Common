import { BrowserEvent } from './BrowserEvent';
export interface PatchedEventTarget
{
    identity: string;
    describeEvent: (event: Event) => BrowserEvent;
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => void;
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => void;
    dispatchEvent: (event: Event) => boolean;
    eventReceiver: DotNet.DotNetObject;
}