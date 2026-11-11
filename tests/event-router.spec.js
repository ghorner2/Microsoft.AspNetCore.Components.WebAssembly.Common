const { test, expect } = require('@playwright/test');

const cases = [
    ['idempotent patch and independent target identities', 'identity'],
    ['duplicate registrations deliver only once', 'duplicate'],
    ['remove matches listener, event type, and capture', 'remove'],
    ['listener objects retain their handleEvent context', 'object'],
    ['once listeners can be registered again', 'once'],
    ['aborted subscriptions do not deliver', 'signal'],
    ['null listeners do not register callbacks', 'null'],
    ['dispatch returns cancellation and preserves native listeners', 'cancel'],
    ['receiver failures are reported to the console', 'failure']
];

for (const [name, scenario] of cases) {
    test(name, async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('status')).toHaveText('Ready');
        const result = await page.evaluate(async scenario => {
            const { EventTargetPatching } = await import('/scripts/js/EventRouter.js');
            const calls = [];
            const receiver = {
                invokeMethodAsync(method, identity, event) {
                    calls.push({ method, identity, event });
                    return Promise.resolve();
                }
            };
            const target = new EventTarget();
            let nativeCalls = 0;
            let contextCorrect = true;
            const listener = function () {
                nativeCalls++;
                contextCorrect = contextCorrect && this === target;
            };
            if (scenario === 'cancel') target.addEventListener('ping', () => nativeCalls++);
            const patch = EventTargetPatching.Instance.patchEventTarget(target, receiver);
            const emit = type => target.dispatchEvent(new Event(type ?? 'ping', { cancelable: true }));
            let valid = true;
            switch (scenario) {
                case 'identity':
                    valid = patch === EventTargetPatching.Instance.patchEventTarget(target, receiver)
                        && patch.identity !== EventTargetPatching.Instance.patchEventTarget(new EventTarget(), receiver).identity;
                    target.addEventListener('ping', listener);
                    emit();
                    break;
                case 'duplicate':
                    target.addEventListener('ping', listener);
                    patch.addEventListener('ping', listener, { capture: false });
                    emit();
                    break;
                case 'remove':
                    target.addEventListener('ping', listener, false);
                    target.addEventListener('ping', listener, true);
                    target.addEventListener('pong', listener);
                    target.removeEventListener('ping', listener, { capture: true });
                    emit();
                    target.removeEventListener('ping', listener);
                    emit();
                    emit('pong');
                    target.removeEventListener('pong', listener);
                    emit('pong');
                    valid = nativeCalls === 2 && calls.length === 2;
                    break;
                case 'object': {
                    const object = { handleEvent() { nativeCalls++; contextCorrect = this === object; } };
                    target.addEventListener('ping', object);
                    emit();
                    target.removeEventListener('ping', object);
                    emit();
                    break;
                }
                case 'once':
                    target.addEventListener('ping', listener, { once: true });
                    emit();
                    emit();
                    target.addEventListener('ping', listener, { once: true });
                    emit();
                    emit();
                    valid = nativeCalls === 2 && calls.length === 2;
                    break;
                case 'signal': {
                    const controller = new AbortController();
                    target.addEventListener('ping', listener, { signal: controller.signal });
                    controller.abort();
                    emit();
                    target.addEventListener('ping', listener, { signal: controller.signal });
                    emit();
                    valid = nativeCalls === 0 && calls.length === 0;
                    break;
                }
                case 'null':
                    target.addEventListener('ping', null);
                    emit();
                    target.removeEventListener('ping', null);
                    valid = calls.length === 0;
                    break;
                case 'cancel':
                    patch.addEventListener('ping', event => event.preventDefault());
                    valid = patch.dispatchEvent(new Event('ping', { cancelable: true })) === false
                        && calls[0].event.defaultPrevented === true;
                    break;
                case 'failure': {
                    const errors = [];
                    const originalError = console.error;
                    console.error = (...args) => errors.push(args);
                    try {
                        patch.eventReceiver = { invokeMethodAsync: () => Promise.reject(new Error('test rejection')) };
                        target.addEventListener('ping', listener);
                        emit();
                        await Promise.resolve();
                        valid = errors.length === 1 && errors[0][0] === 'Blazor event delivery failed'
                            && errors[0][1].message === 'test rejection';
                    } finally {
                        console.error = originalError;
                    }
                    break;
                }
            }
            if (['identity', 'duplicate', 'object', 'cancel'].includes(scenario)) {
                valid = valid && nativeCalls === 1 && calls.length === 1;
            }
            valid = valid && contextCorrect && calls.every(call => call.method === 'OnEvent'
                && call.identity === patch.identity && call.event.type.length > 0);
            return { valid, nativeCalls, deliveries: calls.length };
        }, scenario);
        expect(result.valid, JSON.stringify(result)).toBe(true);
    });
}
