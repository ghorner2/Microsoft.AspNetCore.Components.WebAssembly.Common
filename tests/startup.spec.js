const { test, expect } = require('@playwright/test');

test('Blazor automatically discovers the initializer and registers the global API', async ({ page }) => {
    const initializerRequests = [];
    page.on('request', request => {
        if (/\/Microsoft\.AspNetCore\.Components\.WebAssembly\.Common(?:\.[a-z0-9]+)?\.lib\.module\.js$/.test(new URL(request.url()).pathname)) {
            initializerRequests.push(request.url());
        }
    });
    await page.goto('/');
    await expect(page.getByTestId('status')).toHaveText('Ready');
    expect(initializerRequests).toHaveLength(1);
    expect(await page.evaluate(() => typeof globalThis.patchEventTarget)).toBe('function');
    await page.getByRole('button', { name: 'Click target', exact: true }).click();
    await expect(page.getByTestId('button-click-count')).toHaveText('1');
});

for (const hook of ['afterStarted', 'afterWebStarted', 'afterServerStarted', 'afterWebAssemblyStarted']) {
    test(`${hook} registers the singleton API idempotently`, async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('status')).toHaveText('Ready');
        const result = await page.evaluate(async hook => {
            const initializer = await import('/Microsoft.AspNetCore.Components.WebAssembly.Common.lib.module.js');
            const router = await import('/scripts/js/EventRouter.js');
            const factory = router.EventTargetPatching.Instance;
            delete globalThis.patchEventTarget;
            initializer[hook](globalThis.Blazor);
            const registered = globalThis.patchEventTarget;
            initializer[hook](globalThis.Blazor);
            const target = new EventTarget();
            const receiver = { invokeMethodAsync: () => Promise.resolve() };
            return registered === router.patchEventTarget
                && globalThis.patchEventTarget === registered
                && registered(target, receiver) === factory.patchEventTarget(target, receiver)
                && router.EventTargetPatching.Instance === factory;
        }, hook);
        expect(result).toBe(true);
    });
}
