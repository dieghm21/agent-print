<#
.SYNOPSIS
    Envía datos binarios RAW (ESC/POS) directamente al spooler de Windows para una impresora dada.
.DESCRIPTION
    Usa P/Invoke sobre winspool.drv (OpenPrinter/StartDocPrinter/WritePrinter/EndDocPrinter)
    para enviar bytes crudos sin que Windows los reinterprete o reformatee.
    Este es el mecanismo estándar de Microsoft para imprimir datos RAW en impresoras
    ya instaladas en el sistema (ver "How to send raw data to a printer" - MS Docs).
.PARAMETER PrinterName
    Nombre exacto de la impresora tal como aparece en Windows (Get-Printer).
.PARAMETER FilePath
    Ruta al archivo temporal que contiene los bytes a enviar.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$PrinterName,

    [Parameter(Mandatory = $true)]
    [string]$FilePath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $FilePath)) {
    Write-Error "Archivo no encontrado: $FilePath"
    exit 1
}

$signature = @'
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFOW
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPWStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOW di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string printerName, byte[] bytes)
    {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOW di = new DOCINFOW();
        bool success = false;

        di.pDocName = "AgentPrint RAW Job";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            throw new Exception("OpenPrinter falló. Código de error: " + Marshal.GetLastWin32Error());
        }

        try
        {
            if (!StartDocPrinter(hPrinter, 1, di))
            {
                throw new Exception("StartDocPrinter falló. Código de error: " + Marshal.GetLastWin32Error());
            }

            try
            {
                if (!StartPagePrinter(hPrinter))
                {
                    throw new Exception("StartPagePrinter falló. Código de error: " + Marshal.GetLastWin32Error());
                }

                IntPtr pUnmanagedBytes = Marshal.AllocHGlobal(bytes.Length);
                try
                {
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int written;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written);
                    if (!success)
                    {
                        throw new Exception("WritePrinter falló. Código de error: " + Marshal.GetLastWin32Error());
                    }
                    if (written != bytes.Length)
                    {
                        throw new Exception(string.Format("WritePrinter escribió {0} de {1} bytes", written, bytes.Length));
                    }
                }
                finally
                {
                    Marshal.FreeHGlobal(pUnmanagedBytes);
                }

                EndPagePrinter(hPrinter);
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }
        }
        finally
        {
            ClosePrinter(hPrinter);
        }

        return success;
    }
}
'@

Add-Type -TypeDefinition $signature -Language CSharp

$bytes = [System.IO.File]::ReadAllBytes($FilePath)

try {
    $result = [RawPrinterHelper]::SendBytesToPrinter($PrinterName, $bytes)
    if ($result) {
        Write-Output "OK: $($bytes.Length) bytes enviados a '$PrinterName'"
        exit 0
    } else {
        Write-Error "Fallo desconocido enviando datos a la impresora"
        exit 1
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
