const { test, expect } = require('@playwright/test');

async function expectEvent(page, binding, expected, count = 1) {
    await expect(page.getByTestId(`${binding}-count`)).toHaveText(String(count));
    const payload = JSON.parse(await page.getByTestId(`${binding}-event`).textContent());
    expect(payload).toMatchObject(expected);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('status')).toHaveText('Ready');
});

test('global patchEventTarget called from C# preserves Blazor onclick', async ({ page }) => {
    await page.getByRole('button', { name: 'Click target', exact: true }).click();
    await expectEvent(page, 'button-click', { Type: 'click', Button: 0, Bubbles: true });
    await expect(page.getByTestId('native-clicks')).toHaveText('1');
});

test('module patchEventTarget called from C# preserves input and change values', async ({ page }) => {
    await page.getByLabel('Text', { exact: true }).fill('Blazor C#');
    await expectEvent(page, 'input-input', { Type: 'input', Value: 'Blazor C#' });
    await page.getByLabel('Text', { exact: true }).press('Tab');
    await expectEvent(page, 'input-change', { Type: 'change', Value: 'Blazor C#' });
});

test('focus and blur are bound even though they do not bubble', async ({ page }) => {
    await page.getByLabel('Text', { exact: true }).focus();
    await expectEvent(page, 'input-focus', { Type: 'focus', Bubbles: false });
    await page.getByLabel('Text', { exact: true }).press('Tab');
    await expectEvent(page, 'input-blur', { Type: 'blur', Bubbles: false });
});

test('checkbox reports checked and unchecked values', async ({ page }) => {
    await page.getByLabel('Enabled').check();
    await expectEvent(page, 'checkbox-change', { Checked: true });
    await page.getByLabel('Enabled').uncheck();
    await expectEvent(page, 'checkbox-change', { Checked: false }, 2);
});

test('select change reports selected option', async ({ page }) => {
    await page.getByLabel('Selection').selectOption('second');
    await expectEvent(page, 'select-change', { Type: 'change', Value: 'second' });
});

test('form submit prevents navigation and reaches C#', async ({ page }) => {
    await page.getByRole('button', { name: 'Submit target' }).click();
    await expectEvent(page, 'form-submit', { Type: 'submit', Cancelable: true, DefaultPrevented: true });
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('status')).toHaveText('Ready');
});

test('document keyboard event includes key and code', async ({ page }) => {
    await page.getByLabel('Text', { exact: true }).focus();
    await page.keyboard.press('Escape');
    await expectEvent(page, 'document-keydown', { Type: 'keydown', Key: 'Escape', Code: 'Escape' });
});

test('window resize reaches C#', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await expectEvent(page, 'window-resize', { Type: 'resize', Value: null });
});

test('custom EventTarget serializes structured detail', async ({ page }) => {
    await page.evaluate(async () => {
        const host = await import('/event-test-host.js');
        host.dispatchCustom({ message: 'hello C#', sequence: 42 });
    });
    await expectEvent(page, 'custom-ping', { Type: 'ping', Detail: { message: 'hello C#', sequence: 42 } });
});

test('AbortSignal emits abort only once', async ({ page }) => {
    await page.evaluate(async () => {
        const host = await import('/event-test-host.js');
        host.abort();
        host.abort();
    });
    await expectEvent(page, 'signal-abort', { Type: 'abort' });
});

test('unbinding stops C# delivery without breaking native Blazor handlers', async ({ page }) => {
    await page.getByRole('button', { name: 'Unbind events' }).click();
    await expect(page.getByTestId('status')).toHaveText('Unbound');
    await page.getByRole('button', { name: 'Click target', exact: true }).click();
    await expect(page.getByTestId('native-clicks')).toHaveText('1');
    await expect(page.getByTestId('button-click-count')).toHaveText('0');
});
