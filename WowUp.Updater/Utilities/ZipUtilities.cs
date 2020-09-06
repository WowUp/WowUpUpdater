using System;
using System.IO;
using System.IO.Compression;

namespace WowUp.Updater.Utilities
{
    public static class ZipUtilities
    {
        public static string UnzipFile(string inputFilePath)
        {
            var zipFileDirectory = Path.GetDirectoryName(inputFilePath);
            var tempZipDirectory = Path.Combine(zipFileDirectory, Guid.NewGuid().ToString());

            Directory.CreateDirectory(tempZipDirectory);

            ZipFile.ExtractToDirectory(inputFilePath, tempZipDirectory);

            if (!Directory.Exists(tempZipDirectory))
            {
                throw new FileNotFoundException("Unzipped folder not found");
            }

            return tempZipDirectory;
        }
    }
}
