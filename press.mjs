import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
let died = 0, myDeaths = [];
let myId = null;
p.on("websocket", s => s.on("framereceived", f => {
  const t = String(f.payload); let m; try { m = JSON.parse(t); } catch { return; }
  if (m.type === "welcome") myId = m.playerId;
  for (const e of [].concat(m.events??[], m.event?[m.event]:[])) {
    if (e?.type === "playerDied") { died++; if (e.playerId === myId) myDeaths.push(e.killerId ?? "boundary"); }
  }
}));
await p.goto("https://wormifi.com/", { waitUntil: "load" });
await p.locator('button[data-analytics-choice="denied"]').click().catch(()=>{});
await p.getByTestId("live-lab-button").click();
await p.waitForTimeout(6000);
// a beginner's movement: slow, small corrections, no evasion
for (let i=0;i<75;i++){
  await p.mouse.move(640 + Math.sin(i/9)*90, 400 + Math.cos(i/11)*70);
  await p.waitForTimeout(800);
}
console.log("my playerId        :", myId);
console.log("total deaths in room:", died);
console.log("times I died       :", myDeaths.length, myDeaths.length?`(killers: ${myDeaths.join(", ")})`:"");
await b.close();
