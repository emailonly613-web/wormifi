import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const spriteDirectory = path.join(
  projectRoot,
  "public",
  "assets",
  "sprites",
  "pirate-atlas",
);
const treasureNames = [
  "treasure-doubloons",
  "treasure-ruby-cluster",
  "treasure-sapphire-anchor",
  "treasure-emerald-spyglass",
  "treasure-pearl-shell",
  "treasure-ornate-key",
  "treasure-chart-scroll",
];
const rotationCount = 17;
const rotationMinimum = -8;
const atlasColumns = 10;
const plateColors = [
  "rgba(255, 211, 82, 0.96)",
  "rgba(255, 92, 112, 0.96)",
  "rgba(89, 180, 255, 0.96)",
  "rgba(75, 241, 171, 0.96)",
  "rgba(255, 244, 222, 0.96)",
  "rgba(255, 178, 60, 0.96)",
  "rgba(255, 221, 145, 0.96)",
];

const sprites = await Promise.all(treasureNames.map(async (name) => ({
  name,
  dataUrl: `data:image/png;base64,${(
    await readFile(path.join(spriteDirectory, `${name}.png`))
  ).toString("base64")}`,
})));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const atlases = await page.evaluate(async ({
    atlasColumns,
    plateColors,
    rotationCount,
    rotationMinimum,
    sprites,
  }) => {
    const images = await Promise.all(sprites.map(async ({ name, dataUrl }) => {
      const image = new Image();
      image.decoding = "async";
      image.src = dataUrl;
      await image.decode();
      return { name, image };
    }));
    const cellCount = images.length * rotationCount;
    const atlasRows = Math.ceil(cellCount / atlasColumns);
    const outputs = [];

    for (const sourceScale of [1, 2]) {
      const spriteExtent = 48 * sourceScale;
      const cellExtent = Math.ceil(spriteExtent * Math.SQRT2);
      const canvas = document.createElement("canvas");
      canvas.width = atlasColumns * cellExtent;
      canvas.height = atlasRows * cellExtent;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D canvas is unavailable");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      images.forEach(({ image }, treasureIndex) => {
        for (let rotationIndex = 0; rotationIndex < rotationCount; rotationIndex += 1) {
          const flatIndex = treasureIndex * rotationCount + rotationIndex;
          const column = flatIndex % atlasColumns;
          const row = Math.floor(flatIndex / atlasColumns);
          context.save();
          context.translate(
            column * cellExtent + cellExtent / 2,
            row * cellExtent + cellExtent / 2,
          );
          const plateRadius = spriteExtent * 0.58;
          context.globalAlpha = 0.92;
          context.fillStyle = "rgba(3, 9, 31, 0.82)";
          context.strokeStyle = plateColors[treasureIndex % plateColors.length];
          context.lineWidth = Math.max(1.5 * sourceScale, spriteExtent * 0.045);
          context.beginPath();
          context.moveTo(0, -plateRadius);
          context.lineTo(plateRadius, 0);
          context.lineTo(0, plateRadius);
          context.lineTo(-plateRadius, 0);
          context.closePath();
          context.fill();
          context.stroke();
          context.globalAlpha = 1;
          context.rotate((rotationMinimum + rotationIndex) * 0.035);
          context.drawImage(
            image,
            -spriteExtent / 2,
            -spriteExtent / 2,
            spriteExtent,
            spriteExtent,
          );
          context.restore();
        }
      });

      outputs.push({
        sourceScale,
        width: canvas.width,
        height: canvas.height,
        dataUrl: canvas.toDataURL("image/png"),
      });
    }
    return outputs;
  }, { atlasColumns, plateColors, rotationCount, rotationMinimum, sprites });

  await mkdir(spriteDirectory, { recursive: true });
  for (const atlas of atlases) {
    const expectedCellExtent = Math.ceil(48 * atlas.sourceScale * Math.SQRT2);
    const expectedWidth = atlasColumns * expectedCellExtent;
    const expectedHeight = Math.ceil(
      treasureNames.length * rotationCount / atlasColumns,
    ) * expectedCellExtent;
    if (atlas.width !== expectedWidth || atlas.height !== expectedHeight) {
      throw new Error(
        `Unexpected ${atlas.sourceScale}x atlas dimensions ${atlas.width}x${atlas.height}`,
      );
    }
    const png = Buffer.from(atlas.dataUrl.split(",", 2)[1], "base64");
    const outputPath = path.join(
      spriteDirectory,
      `ground-treasure-v2-rotations-${atlas.sourceScale}x.png`,
    );
    await writeFile(outputPath, png);
    console.log(
      `WROTE ${path.relative(projectRoot, outputPath)} ${atlas.width}x${atlas.height} ${png.length} bytes`,
    );
  }
} finally {
  await browser.close();
}
