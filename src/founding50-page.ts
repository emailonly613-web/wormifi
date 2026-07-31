import "./seo-page";
import {
  buildFounding50GameUrl,
  buildFounding50ShareUrl,
} from "./growthCampaign";

const playLink = document.querySelector<HTMLAnchorElement>("#founding-50-play");
const hostLink = document.querySelector<HTMLAnchorElement>("#founding-50-host");
const shareButton = document.querySelector<HTMLButtonElement>("#founding-50-share");
const shareStatus = document.querySelector<HTMLElement>("#founding-50-share-status");

if (playLink) playLink.href = buildFounding50GameUrl("play", window.location.origin);
if (hostLink) hostLink.href = buildFounding50GameUrl("host", window.location.origin);

shareButton?.addEventListener("click", async () => {
  const url = buildFounding50ShareUrl(window.location.origin);
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Join the first 50 Wormifi playtesters",
        text: "Try one free Wormifi run with me, then host our own private arena.",
        url,
      });
      if (shareStatus) shareStatus.textContent = "SHARE SHEET OPENED";
      return;
    }
    await navigator.clipboard.writeText(url);
    if (shareStatus) shareStatus.textContent = "INVITE LINK COPIED";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (shareStatus) {
      shareStatus.textContent = "COPY THIS LINK: " + url;
    }
  }
});
