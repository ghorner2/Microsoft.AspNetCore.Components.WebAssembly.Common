export function afterStarted(blazor: any)
{
}
export function afterWebStarted(blazor: any)
{
}
export function afterServerStarted(blazor: any)
{
}
export function afterWebAssemblyStarted(blazor: any)
{
   registerEventTargetEventBinding();
}
function registerEventTargetEventBinding() {
    console.log("registering EventTarget event binding...");
    try
    {

        console.log("registered EventTarget event binding, successfully.");
    }
    catch (e) {
        console.log(
            "registering EventTarget event binding, failed with error {0}", e);
    }
}