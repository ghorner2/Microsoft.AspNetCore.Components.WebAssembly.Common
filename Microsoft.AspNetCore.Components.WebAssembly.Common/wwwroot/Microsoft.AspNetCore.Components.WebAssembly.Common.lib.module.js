export function afterStarted(blazor) {
}
export function afterWebStarted(blazor) {
}
export function afterServerStarted(blazor) {
}
export function afterWebAssemblyStarted(blazor) {
    registerEventTargetEventBinding();
}
function registerEventTargetEventBinding() {
    console.log("registering EventTarget event binding...");
    try {
        console.log("registered EventTarget event binding, successfully.");
    }
    catch (e) {
        console.log("registering EventTarget event binding, failed with error {0}", e);
    }
}
//# sourceMappingURL=Microsoft.AspNetCore.Components.WebAssembly.Common.lib.module.js.map