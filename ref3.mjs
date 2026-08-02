import { chromium } from "@playwright/test";
const OUT="C:/Users/email/AppData/Local/Temp/claude/C--Windows-System32/cce9e6cc-f33d-41c2-bf62-688000c054bc/scratchpad/shots";
const b = await chromium.launch({ args:["--disable-blink-features=AutomationControlled"] });
const ctx = await b.newContext({ viewport:{width:1280,height:800}, userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" });
const p = await ctx.newPage();
await p.addInitScript(()=>{ Object.defineProperty(navigator,"webdriver",{get:()=>undefined}); });
await p.goto("https://wormate.io/", { waitUntil:"domcontentloaded", timeout:60000 });
await p.waitForTimeout(7000);
await p.locator("text=Play as guest").first().click({ timeout: 12000 }).catch(()=>{});
for (let s=0; s<8; s++) {
  await p.waitForTimeout(2500);
  await p.mouse.move(640+Math.cos(s)*200, 400+Math.sin(s)*150);
  const warn = await p.locator("text=Warning").count();
  if (!warn) { await p.screenshot({ path: `${OUT}/54-wormate-live-${s}.png` }); }
  else { await p.locator("text=Retry").first().click().catch(()=>{}); }
}
console.log("done");
await b.close();
