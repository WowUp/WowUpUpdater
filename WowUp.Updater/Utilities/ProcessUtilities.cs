using System;
using System.Diagnostics;

namespace WowUp.Updater.Utilities
{
    public static class ProcessUtilities
    {
        public static void WaitForProcessExit(string processName, bool kill = false)
        {
            var processes = Process.GetProcessesByName(processName);
            foreach (var process in processes)
            {
                try
                {
                    if(!process.HasExited && kill)
                    {
                        process.Kill();
                    }

                    var exited = process.WaitForExit(5000);
                    if (!exited)
                    {
                        throw new Exception("WowUp did not exit");
                    }
                }
                finally
                {
                    process.Dispose();
                }
            }
        }
    }
}
