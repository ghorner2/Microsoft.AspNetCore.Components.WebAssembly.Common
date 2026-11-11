import { registerEventTargetPatching } from './EventTargetPatching';
export function afterStarted(blazor: any)
{
    registerEventTargetPatching();
}
export function afterWebStarted(blazor: any)
{
    registerEventTargetPatching();
}
export function afterServerStarted(blazor: any)
{
    registerEventTargetPatching();
}
export function afterWebAssemblyStarted(blazor: any)
{
    registerEventTargetPatching();
}