const { test, expect } = require('@playwright/test');

for (const alreadyRegistered of [false, true]) {
    test(alreadyRegistered
        ? 'startup hooks preserve an existing global function without reassigning it'
        : 'all startup hooks and a second router module assign the global function only once', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('status')).toHaveText('Ready');
        const result = await page.evaluate(async alreadyRegistered => {
            const initializer = await import('/Microsoft.AspNetCore.Components.WebAssembly.Common.lib.module.js');
            const router = await import('/scripts/js/EventRouter.js');
            const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'patchEventTarget');
            const existing = () => { throw new Error('Existing function must not be invoked during registration'); };
            let value = alreadyRegistered ? existing : undefined;
            let assignments = 0;
            Object.defineProperty(globalThis, 'patchEventTarget', {
                configurable: true,
                get: () => value,
                set: registered => {
                    assignments++;
                    value = registered;
                }
            });
            try {
                for (let repeat = 0; repeat < 2; repeat++) {
                    for (const hook of ['afterStarted', 'afterWebStarted', 'afterServerStarted', 'afterWebAssemblyStarted']) {
                        initializer[hook](globalThis.Blazor);
                    }
                }
                const secondRouter = await import('/scripts/js/EventRouter.js?registration-test');
                secondRouter.registerEventTargetPatching();
                return {
                    assignments,
                    preserved: value === (alreadyRegistered ? existing : router.patchEventTarget)
                };
            } finally {
                Object.defineProperty(globalThis, 'patchEventTarget', descriptor);
            }
        }, alreadyRegistered);
        expect(result).toEqual({ assignments: alreadyRegistered ? 0 : 1, preserved: true });
    });
}
