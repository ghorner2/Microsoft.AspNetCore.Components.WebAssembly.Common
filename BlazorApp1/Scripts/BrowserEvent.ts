export interface BrowserEvent
{
    type: string;
    timeStamp: number;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    value: string | null;
    checked: boolean | null;
    key: string | null;
    code: string | null;
    button: number | null;
    clientX: number | null;
    clientY: number | null;
    detail: unknown;
}