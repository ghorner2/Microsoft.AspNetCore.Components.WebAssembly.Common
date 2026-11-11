const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.\\tests',
    fullyParallel: true,
    timeout: 30000,
    expect: { timeout: 10000 },
    use: {
        baseURL: 'http://127.0.0.1:5198',
        browserName: 'chromium',
        trace: 'retain-on-failure'
    },
    webServer: {
        command: 'dotnet run --project Microsoft.AspNetCore.Components.WebAssembly.Common\\Microsoft.AspNetCore.Components.WebAssembly.Common.csproj --no-launch-profile --urls http://127.0.0.1:5198',
        url: 'http://127.0.0.1:5198',
        reuseExistingServer: false,
        timeout: 180000
    }
});
