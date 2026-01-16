# Raw keyboard test - captures all keystrokes
# Run with: powershell -ExecutionPolicy Bypass -File scripts/rawkey-test.ps1

Write-Host "=== Raw Keyboard Capture Test ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press buttons on the SOOMFON device."
Write-Host "Any keypresses will be shown below."
Write-Host "Press Ctrl+C to exit."
Write-Host ""

$code = @"
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class KeyboardHook {
    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;

    private static IntPtr hookId = IntPtr.Zero;
    private static LowLevelKeyboardProc proc = HookCallback;

    public static void Start() {
        hookId = SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(null), 0);
        Console.WriteLine("Hook installed. Listening for keypresses...");
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int vkCode = Marshal.ReadInt32(lParam);
            int scanCode = Marshal.ReadInt32(lParam, 4);
            string state = (wParam == (IntPtr)WM_KEYDOWN) ? "DOWN" : "UP  ";
            Keys key = (Keys)vkCode;
            Console.WriteLine("[{0}] vKey: {1,-5} scanCode: {2,-5} Key: {3}", state, vkCode, scanCode, key);
        }
        return CallNextHookEx(hookId, nCode, wParam, lParam);
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Windows.Forms
[KeyboardHook]::Start()

# Keep the script running
Write-Host "Waiting for keypresses... (Ctrl+C to exit)" -ForegroundColor Yellow
while ($true) {
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.Application]::DoEvents()
}
