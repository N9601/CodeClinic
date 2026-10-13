using System;
using System.IO;
using System.ServiceProcess;
using System.Timers;

namespace LabTrack.InstrumentService
{
    // Windows Service: polls the Empower export share every 5 minutes and loads CSV results.
    public class InstrumentPoller : ServiceBase
    {
        private const string DropFolder = @"\\labfs01\instrument_drop\empower";
        private const string ProcessedFolder = @"\\labfs01\instrument_drop\processed";
        private readonly Timer _timer = new Timer(5 * 60 * 1000);

        protected override void OnStart(string[] args)
        {
            _timer.Elapsed += (s, e) => Poll();
            _timer.Start();
        }

        private void Poll()
        {
            foreach (var file in Directory.GetFiles(DropFolder, "*.csv"))
            {
                // No checksum or signature check: file contents are trusted as-is
                ResultCsvLoader.Load(file);
                File.Move(file, Path.Combine(ProcessedFolder, Path.GetFileName(file)));
            }
        }
    }
}
