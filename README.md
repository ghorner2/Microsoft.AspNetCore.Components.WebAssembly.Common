# Browser event binding tests

This project is a runnable .NET 10 Blazor WebAssembly test host. Playwright drives a real Chromium browser and asserts the events received by the C# `[JSInvokable] OnEvent` method, not a mocked .NET receiver.

## Run

From the solution directory, with the .NET 10 SDK and Node.js installed:

```powershell
npm ci
npx playwright install chromium
npm test
```

`npm test` compiles TypeScript, starts the Blazor host on `http://127.0.0.1:5198`, runs the tests, and stops the host. That port must be available. To explore the host manually:

```powershell
npm run build:scripts
dotnet run --project Microsoft.AspNetCore.Components.WebAssembly.Common\Microsoft.AspNetCore.Components.WebAssembly.Common.csproj --no-launch-profile --urls http://127.0.0.1:5198
```

## Coverage

- Window resize and document keyboard events.
- Button click, including preservation of native Blazor `@onclick`.
- Text input/change, non-bubbling focus/blur, checkbox and select change.
- Form submission with synchronous prevention of navigation.
- Custom EventTarget events with structured detail and AbortSignal cancellation.
- Unbinding, duplicate registration, listener objects, capture, once, cancellation, and dispatch return values.

The router preserves JavaScript listeners and sends a stable target identity and a JSON event snapshot through `invokeMethodAsync`. C# receives event type, propagation/cancellation flags, input value/checked state, keyboard and mouse fields, and custom detail. DOM objects are not sent through JSON interop. Custom detail must be JSON-serializable. Interop failures are reported to the browser console.

Calling `EventTargetPatching.Instance.patchEventTarget` again returns the existing patch and receiver. Both the target's patched methods and the returned wrapper route registrations. Listeners registered before patching retain their native behavior. Remove listeners before disposing their `DotNetObjectReference`. The host's `event-test-host.js` is test fixture code, not a general-purpose binding API.

## Automatic Blazor startup registration

Blazor discovers `wwwroot/Microsoft.AspNetCore.Components.WebAssembly.Common.lib.module.js` during the build and automatically loads it. Its `afterStarted` hook registers `globalThis.patchEventTarget` for standalone WebAssembly, Server, and Hybrid apps. The `afterWebStarted`, `afterServerStarted`, and `afterWebAssemblyStarted` hooks perform the same idempotent registration for Blazor Web Apps. No script tag, manual initializer invocation, or component-level router import is required for the global API.

Registration assigns the global function only when it is undefined. Repeated startup hooks or separately loaded copies of the router preserve the first registered function without assigning it again.

The initializer filename must match the assembly name (or library/package ID when used in a Razor class library). Keep the initializer and router static assets together when distributing the library.

## Call patchEventTarget from Blazor C#

After Blazor startup, the global function is already registered. Both the global function and optional module export return the object from `EventTargetPatching.Instance.patchEventTarget`. Requesting `IJSObjectReference` tells .NET 10 Blazor to marshal that object by reference, rather than serialize the wrapper's functions; no explicit JavaScript `createJSObjectReference` call is needed.

```csharp
var receiver = DotNetObjectReference.Create(this);

// target is an ElementReference captured with @ref, used after rendering.
var patch = await JS.InvokeAsync<IJSObjectReference>(
    "patchEventTarget", target, receiver);

// Alternatively, call the same function through the imported module.
var router = await JS.InvokeAsync<IJSObjectReference>(
    "import", "./scripts/js/EventRouter.js");
var modulePatch = await router.InvokeAsync<IJSObjectReference>(
    "patchEventTarget", target, receiver);
```

The target can also be an `IJSObjectReference` to a browser EventTarget. The receiver must implement `[JSInvokable] OnEvent(string identity, BrowserEvent browserEvent)` with the event fields described above. Pass the returned patch reference to JavaScript when registering/removing listeners; native JavaScript listener functions cannot be supplied as JSON arguments from C#. Dispose the returned references and module after unbinding, then dispose the receiver.

`App.razor` exercises the global path for the button and the module path for the input. The fixture verifies that both return the same underlying objects as the singleton factory, and the browser tests verify delivery back to C#.
