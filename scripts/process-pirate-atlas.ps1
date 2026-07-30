param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,

  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$processor = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class WormifiChromaAtlas
{
    private static byte ClampByte(double value)
    {
        return (byte)Math.Max(0.0, Math.Min(255.0, value));
    }

    public static void Process(string sourcePath, string outputDirectory)
    {
        using (var source = new Bitmap(sourcePath))
        using (var keyed = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(keyed))
            {
                graphics.DrawImageUnscaled(source, 0, 0);
            }

            var bounds = new Rectangle(0, 0, keyed.Width, keyed.Height);
            var data = keyed.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            var byteCount = Math.Abs(data.Stride) * keyed.Height;
            var pixels = new byte[byteCount];
            Marshal.Copy(data.Scan0, pixels, 0, byteCount);

            for (var y = 0; y < keyed.Height; y++)
            {
                var row = y * data.Stride;
                for (var x = 0; x < keyed.Width; x++)
                {
                    var offset = row + x * 4;
                    var blue = (double)pixels[offset];
                    var green = (double)pixels[offset + 1];
                    var red = (double)pixels[offset + 2];

                    // Image generation keeps the requested magenta key but can
                    // add a few points of texture/noise. Remove the whole
                    // magenta hue family rather than only exact #ff00ff.
                    var chromaDominant =
                        red > 175.0 &&
                        blue > 175.0 &&
                        green < 125.0 &&
                        Math.Abs(red - blue) < 85.0 &&
                        Math.Min(red, blue) > green * 1.55;
                    if (chromaDominant)
                    {
                        pixels[offset] = 0;
                        pixels[offset + 1] = 0;
                        pixels[offset + 2] = 0;
                        pixels[offset + 3] = 0;
                        continue;
                    }

                    // Unblend any remaining antialiased edge pixels to prevent
                    // a pink fringe while preserving the original sprite art.
                    var foreground = Math.Max(Math.Max(255.0 - red, green), 255.0 - blue);
                    var alpha = Math.Min(1.0, foreground / 255.0);
                    if (alpha < 0.985)
                    {
                        pixels[offset + 2] = ClampByte((red - (1.0 - alpha) * 255.0) / alpha);
                        pixels[offset + 1] = ClampByte(green / alpha);
                        pixels[offset] = ClampByte((blue - (1.0 - alpha) * 255.0) / alpha);
                        pixels[offset + 3] = ClampByte(alpha * 255.0);
                    }
                }
            }

            Marshal.Copy(pixels, 0, data.Scan0, byteCount);
            keyed.UnlockBits(data);

            keyed.Save(
                System.IO.Path.Combine(outputDirectory, "wormifi-pirate-atlas-transparent.png"),
                ImageFormat.Png
            );

            var names = new[]
            {
                "serpent-head",
                "serpent-body-porthole",
                "serpent-body-sash",
                "serpent-tail",
                "doubloon-stack",
                "ruby-skull",
                "sapphire-anchor",
                "emerald-spyglass",
                "pearl-shell",
                "ornate-key",
                "treasure-map",
                "treasure-chest",
                "loot-compass",
                "vortex-astrolabe",
                "pepper-cutlass",
                "shipwheel-shield"
            };

            var cellWidth = keyed.Width / 4;
            var cellHeight = keyed.Height / 4;
            for (var index = 0; index < names.Length; index++)
            {
                var crop = new Rectangle(
                    (index % 4) * cellWidth,
                    (index / 4) * cellHeight,
                    cellWidth,
                    cellHeight
                );
                using (var sprite = keyed.Clone(crop, PixelFormat.Format32bppArgb))
                {
                    sprite.Save(
                        System.IO.Path.Combine(outputDirectory, names[index] + ".png"),
                        ImageFormat.Png
                    );
                }
            }
        }
    }
}
'@

Add-Type -TypeDefinition $processor -ReferencedAssemblies System.Drawing

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
[WormifiChromaAtlas]::Process(
  (Resolve-Path -LiteralPath $SourcePath).Path,
  (Resolve-Path -LiteralPath $OutputDirectory).Path
)

Get-ChildItem -LiteralPath $OutputDirectory -Filter "*.png" |
  Sort-Object Name |
  Select-Object Name, Length
