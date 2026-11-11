import { registerEventTargetPatching } from './EventTargetPatching';
export function afterStarted(blazor) {
    registerEventTargetPatching();
}
export function afterWebStarted(blazor) {
    registerEventTargetPatching();
}
export function afterServerStarted(blazor) {
    registerEventTargetPatching();
}
export function afterWebAssemblyStarted(blazor) {
    registerEventTargetPatching();
}
//# sourceMappingURL=BlazorApp1.js.map