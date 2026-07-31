import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArenaCanvas } from "./components/ArenaCanvas";
import { LiveArenaCanvas } from "./components/LiveArenaCanvas";
import { PwaStatus } from "./components/PwaStatus";
import { SkinStudio } from "./components/SkinStudio";
import { LegendVoyage } from "./components/LegendVoyage";
import { BoardPicker } from "./components/BoardPicker";
import { PacePicker } from "./components/PacePicker";
import { buildVersionLabel, readBuildRevision } from "./buildRevision";
import { CurrencyStoreLayout } from "./components/CurrencyStoreLayout";
import {
  RoomIdentity,
  RoomInviteDialog,
  type RoomIdentityScope,
} from "./components/RoomIdentity";
import {
  parseChallengePayload,
  type ChallengePayload,
} from "./game/replay";
import {
  CONTROL_SCHEME_OPTIONS,
  readControlScheme,
  writeControlScheme,
  type ControlScheme,
} from "./game/controlScheme";
import {
  buildRoomInviteUrl,
  createCrewRoomId,
  normalizeRoomId,
  readPublicMatchmaking,
  readRoomId,
  roomIdentityLabel,
  writeRoomIdToLocation,
  writePublicMatchmakingToLocation,
} from "./game/roomIdentity";
import {
  BOARD_OPTIONS,
  boardIdForJoin,
  buildBoardAwareInviteUrl,
  buildBoardPreferenceUrl,
  readBoardPreference,
  resolveRoomBoardPreference,
  type GameBoardId,
} from "./game/boardPreference";
import {
  DEFAULT_GAME_PACE_ID,
  buildGamePacePreferenceUrl,
  buildPaceAwareInviteUrl,
  LEGACY_GAME_PACE_ID,
  paceIdForJoin,
  readGamePacePreference,
  resolveRoomPacePreference,
  type GamePaceId,
} from "./game/gamePace";
import {
  PhotoSkinImageCache,
  createPhotoSkinRenderPlan,
  readPhotoSkinState,
  selectPhotoSkinFace,
  selectPhotoSkinTheme,
  type PhotoSkinState,
} from "./game/photoSkin";
import { DEFAULT_COSMETIC_THEME_ID, isPremiumCosmeticThemeId } from "./game/cosmeticThemes";
import {
  isFounderPackUnlocked,
} from "./game/premiumSkins";
import { captainPortraitSource } from "./game/cinematicHeads";
import {
  awardCaptainRun,
  captainLevelProgress,
  readCaptainProgression,
  type CaptainRunSummary,
} from "./game/captainProgression";
import type { PhotoSkinCanvasAppearance } from "./game/photoSkinCanvas";
import {
  readDoubloons,
} from "./game/doubloons";
import {
  grantRewardedCorsairSkin,
  isRewardedCorsairSkinEquipped,
  REWARDED_CORSAIR_SKIN_LABEL,
} from "./game/rewardedSkin";
import { monetizationConfig } from "./platform/monetizationConfig";
import {
  gamePlatform,
  isCrazyGamesDistribution,
  reportPlatformError,
} from "./platform/runtime";

export type GameMode = "rush" | "endless" | "practice";
type LaunchMode = GameMode | "live";
type ImmersiveState = "active" | "available" | "denied" | "unsupported";

type WebkitFullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const guestNames = ["Skipper", "Coral", "Cutlass", "Galleon", "Pearl", "Riptide", "Anchor", "Mariner"];

function makeGuestName() {
  const name = guestNames[Math.floor(Math.random() * guestNames.length)];
  return `${name}${Math.floor(100 + Math.random() * 900)}`;
}

function readChallenge(): ChallengePayload | null {
  const token = new URLSearchParams(window.location.search).get("c");
  if (!token) return null;
  const parsed = parseChallengePayload(token);
  return parsed.ok ? parsed.value : null;
}

function modeForChallenge(challenge: ChallengePayload | null): GameMode {
  if (challenge?.mode === "rush") return "rush";
  if (challenge?.mode === "practice") return "practice";
  return challenge ? "endless" : "rush";
}

function rivalLabel(challenge: ChallengePayload) {
  return (challenge.target.playerId ?? "A RIVAL")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .toUpperCase();
}

function isPortraitTouchViewport(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const touchCapable = navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches === true;
  return touchCapable && window.innerHeight > window.innerWidth;
}

async function requestLandscapeOrientation(): Promise<void> {
  if (typeof screen === "undefined" || !screen.orientation) return;
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: "landscape") => Promise<void>;
  };
  if (typeof orientation.lock !== "function") return;
  try {
    await orientation.lock("landscape");
  } catch {
    // Browser tabs and embedded game portals often deny orientation locking.
    // The visible rotate gate remains the deterministic fallback.
  }
}

const MOBILE_BROWSER_GAME_CLASS = "mobile-browser-game";

function requestMobileBrowserChromeCollapse(): void {
  const touchCapable = navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches === true;
  const installed = window.matchMedia?.("(display-mode: fullscreen)").matches === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true;
  if (!touchCapable || installed) return;

  const root = document.documentElement;
  root.classList.add(MOBILE_BROWSER_GAME_CLASS);
  document.body.classList.add(MOBILE_BROWSER_GAME_CLASS);
  root.dataset.mobileBrowserCollapse = "true";

  const collapse = () => {
    if (!root.classList.contains(MOBILE_BROWSER_GAME_CLASS)) return;
    // A small real page scroll lets Chrome/Safari retract collapsible browser
    // chrome while the fixed arena remains visually stable.
    window.scrollTo(0, 96);
  };
  window.requestAnimationFrame(collapse);
  window.setTimeout(collapse, 180);
  window.setTimeout(collapse, 650);
}

function releaseMobileBrowserChromeCollapse(): void {
  document.documentElement.classList.remove(MOBILE_BROWSER_GAME_CLASS);
  document.body.classList.remove(MOBILE_BROWSER_GAME_CLASS);
  delete document.documentElement.dataset.mobileBrowserCollapse;
  window.scrollTo(0, 0);
}

function fullscreenElement(): Element | null {
  return document.fullscreenElement ??
    (document as WebkitFullscreenDocument).webkitFullscreenElement ??
    null;
}

function browserImmersiveState(gameOwnsFullscreen = false): ImmersiveState {
  if (gameOwnsFullscreen && fullscreenElement() === document.documentElement) return "active";
  const root = document.documentElement as WebkitFullscreenElement;
  return typeof root.requestFullscreen === "function" ||
    typeof root.webkitRequestFullscreen === "function"
    ? "available"
    : "unsupported";
}

export function App() {
  const buildRevision = useMemo(readBuildRevision, []);
  const initialName = useMemo(makeGuestName, []);
  const initialChallenge = useMemo(readChallenge, []);
  const [name, setName] = useState(initialName);
  const [mode, setMode] = useState<LaunchMode>(() => modeForChallenge(initialChallenge));
  const [challenge, setChallenge] = useState<ChallengePayload | null>(initialChallenge);
  const [playing, setPlaying] = useState(false);
  const [session, setSession] = useState(1);
  const [controlScheme, setControlScheme] = useState<ControlScheme>(readControlScheme);
  const [roomId, setRoomId] = useState(readRoomId);
  const [roomDraft, setRoomDraft] = useState(readRoomId);
  const [resolvedLiveRoomId, setResolvedLiveRoomId] = useState(readRoomId);
  const [requestedBoardId, setRequestedBoardId] = useState<GameBoardId>(() => readBoardPreference(window.location.search));
  const [authoritativeBoardId, setAuthoritativeBoardId] = useState<GameBoardId | undefined>();
  const [requestedPaceId, setRequestedPaceId] = useState<GamePaceId>(() =>
    initialChallenge
      ? initialChallenge.paceId ?? LEGACY_GAME_PACE_ID
      : readGamePacePreference(window.location.search)
  );
  const [authoritativePaceId, setAuthoritativePaceId] = useState<GamePaceId | undefined>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [skinStudioOpen, setSkinStudioOpen] = useState(false);
  const [legendVoyageOpen, setLegendVoyageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [captainProgression, setCaptainProgression] = useState(readCaptainProgression);
  const [photoSkinState, setPhotoSkinState] = useState<PhotoSkinState>(() => readPhotoSkinState().state);
  const [decodedPhotoImages, setDecodedPhotoImages] = useState<ReadonlyMap<string, CanvasImageSource>>(() => new Map());
  const [copyStatus, setCopyStatus] = useState("");
  const [adActive, setAdActive] = useState(false);
  const [adRequestPending, setAdRequestPending] = useState(false);
  const [adStatus, setAdStatus] = useState("");
  const [doubloons] = useState(readDoubloons);
  const [rewardedSkinEquipped, setRewardedSkinEquipped] = useState(isRewardedCorsairSkinEquipped);
  const [currencyStoreOpen, setCurrencyStoreOpen] = useState(false);
  const [portraitTouchViewport, setPortraitTouchViewport] = useState(isPortraitTouchViewport);
  const [pendingLandscapeLaunch, setPendingLandscapeLaunch] = useState<{
    mode: LaunchMode;
    publicMatchmaking: boolean;
  } | null>(null);
  const [publicMatchmaking, setPublicMatchmaking] = useState(readPublicMatchmaking);
  const [immersiveState, setImmersiveState] = useState<ImmersiveState>(browserImmersiveState);
  const [immersiveNoticeOpen, setImmersiveNoticeOpen] = useState(false);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const skinStudioReturnToSettingsRef = useRef(true);
  const photoSkinImageCacheRef = useRef(new PhotoSkinImageCache());
  const wasPlayingRef = useRef(false);
  const gameOwnsFullscreenRef = useRef(false);
  const runStartedAtRef = useRef(0);
  const eligibleGameplaySecondsRef = useRef(0);

  const rewardedSkinMenuEnabled = isCrazyGamesDistribution
    && monetizationConfig.menuMode === "rewarded-skin";
  const currencyStoreMenuEnabled = isCrazyGamesDistribution
    && monetizationConfig.menuMode === "currency-store";
  const boardSelection = useMemo(
    () => resolveRoomBoardPreference(requestedBoardId, authoritativeBoardId),
    [authoritativeBoardId, requestedBoardId],
  );
  const selectedBoardOption = useMemo(
    () => BOARD_OPTIONS.find((option) => option.id === boardSelection.boardId) ?? BOARD_OPTIONS[0],
    [boardSelection.boardId],
  );
  const paceSelection = useMemo(
    () => resolveRoomPacePreference(requestedPaceId, authoritativePaceId),
    [authoritativePaceId, requestedPaceId],
  );
  const captainLevel = useMemo(
    () => captainLevelProgress(captainProgression.xp),
    [captainProgression.xp],
  );
  const photoSkinRenderPlan = useMemo(
    () => createPhotoSkinRenderPlan(photoSkinState),
    [photoSkinState],
  );
  const localPhotoSkinAppearance = useMemo<PhotoSkinCanvasAppearance | undefined>(
    () => isCrazyGamesDistribution
      ? undefined
      : { renderPlan: photoSkinRenderPlan, decodedImages: decodedPhotoImages },
    [decodedPhotoImages, photoSkinRenderPlan],
  );

  useEffect(() => {
    if (wasPlayingRef.current && !playing) {
      window.requestAnimationFrame(() => playButtonRef.current?.focus());
    }
    wasPlayingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    writeControlScheme(controlScheme);
  }, [controlScheme]);

  useEffect(() => {
    const synchronizeOrientation = () => {
      setPortraitTouchViewport(isPortraitTouchViewport());
    };
    synchronizeOrientation();
    window.addEventListener("resize", synchronizeOrientation);
    screen.orientation?.addEventListener("change", synchronizeOrientation);
    return () => {
      window.removeEventListener("resize", synchronizeOrientation);
      screen.orientation?.removeEventListener("change", synchronizeOrientation);
    };
  }, []);

  useEffect(() => {
    const synchronizeFullscreen = () => {
      const activeElement = fullscreenElement();
      if (!activeElement) gameOwnsFullscreenRef.current = false;
      setImmersiveState(browserImmersiveState(gameOwnsFullscreenRef.current));
    };
    document.addEventListener("fullscreenchange", synchronizeFullscreen);
    document.addEventListener("webkitfullscreenchange", synchronizeFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", synchronizeFullscreen);
      document.removeEventListener("webkitfullscreenchange", synchronizeFullscreen);
    };
  }, []);

  useEffect(() => releaseMobileBrowserChromeCollapse, []);

  useEffect(() => {
    if (!immersiveNoticeOpen) return;
    const timeout = window.setTimeout(() => setImmersiveNoticeOpen(false), 6_000);
    return () => window.clearTimeout(timeout);
  }, [immersiveNoticeOpen]);

  useEffect(() => {
    let active = true;
    const cache = photoSkinImageCacheRef.current;
    if (!photoSkinRenderPlan.localPhotosEnabled) {
      cache.clear();
      setDecodedPhotoImages(new Map());
      return () => {
        active = false;
      };
    }

    void Promise.all(photoSkinRenderPlan.localPhotos.map(async (photo) => {
      try {
        return [photo.id, await cache.get(photo)] as const;
      } catch {
        return undefined;
      }
    })).then((entries) => {
      if (!active) return;
      setDecodedPhotoImages(new Map(
        entries.filter((entry): entry is readonly [string, HTMLImageElement] => entry !== undefined),
      ));
    });

    return () => {
      active = false;
    };
  }, [photoSkinRenderPlan]);

  useEffect(() => {
    // A premium theme id without an unlock on this device (cleared storage,
    // copied URL, another browser) falls back to the free default.
    if (isPremiumCosmeticThemeId(photoSkinState.themeId) && !isFounderPackUnlocked()) {
      setPhotoSkinState((current) => selectPhotoSkinTheme(current, DEFAULT_COSMETIC_THEME_ID));
    }
    if (isPremiumCosmeticThemeId(photoSkinState.faceThemeId) && !isFounderPackUnlocked()) {
      setPhotoSkinState((current) => selectPhotoSkinFace(current, DEFAULT_COSMETIC_THEME_ID));
    }
  }, [photoSkinState.faceThemeId, photoSkinState.themeId]);

  useEffect(() => {
    if (!isCrazyGamesDistribution) return;
    const lifecycle = playing ? gamePlatform.gameplayStart() : gamePlatform.gameplayStop();
    void lifecycle.catch((error) => reportPlatformError(
      playing ? "gameplay-start" : "gameplay-stop",
      error,
    ));
  }, [playing, session]);

  const prepareRoom = useCallback((requestedRoom?: string) => {
    const nextRoom = normalizeRoomId(requestedRoom ?? roomDraft);
    if (nextRoom !== roomId) {
      setAuthoritativeBoardId(undefined);
      setAuthoritativePaceId(undefined);
    }
    setRoomId(nextRoom);
    setRoomDraft(nextRoom);
    setResolvedLiveRoomId(nextRoom);
    setPublicMatchmaking(false);
    writeRoomIdToLocation(nextRoom);
    return nextRoom;
  }, [roomDraft, roomId]);

  const chooseBoard = (boardId: GameBoardId) => {
    setRequestedBoardId(boardId);
    const nextUrl = buildBoardPreferenceUrl(window.location.href, boardId);
    window.history.replaceState(null, "", nextUrl);
  };

  const choosePace = (paceId: GamePaceId) => {
    setRequestedPaceId(paceId);
    const nextUrl = buildGamePacePreferenceUrl(window.location.href, paceId);
    window.history.replaceState(null, "", nextUrl);
  };

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    window.requestAnimationFrame(() => settingsButtonRef.current?.focus());
  }, []);

  const beginStart = useCallback((nextMode: LaunchMode, usePublicMatchmaking = false) => {
    if (nextMode === "live") {
      setResolvedLiveRoomId(roomId);
      if (usePublicMatchmaking) {
        setPublicMatchmaking(true);
        writePublicMatchmakingToLocation(roomId);
      } else {
        prepareRoom();
      }
    }
    setCurrencyStoreOpen(false);
    setLegendVoyageOpen(false);
    setSettingsOpen(false);
    setMode(nextMode);
    setSession((value) => value + 1);
    runStartedAtRef.current = performance.now();
    setPlaying(true);
  }, [prepareRoom, roomId]);

  const handleLiveRoomResolved = useCallback((resolvedRoomId: string) => {
    setResolvedLiveRoomId(resolvedRoomId);
    setRoomDraft(resolvedRoomId);
    if (publicMatchmaking) writePublicMatchmakingToLocation(resolvedRoomId);
  }, [publicMatchmaking]);

  const requestImmersiveGameplay = useCallback((explainFailure = false) => {
    // Portals own their container and fullscreen contract. The owned Wormifi
    // site can use the initiating Play tap to remove browser chrome safely.
    if (isCrazyGamesDistribution) {
      void requestLandscapeOrientation();
      return;
    }
    requestMobileBrowserChromeCollapse();
    const root = document.documentElement as WebkitFullscreenElement;
    if (
      gameOwnsFullscreenRef.current &&
      fullscreenElement() === document.documentElement
    ) {
      setImmersiveState("active");
      void requestLandscapeOrientation();
      return;
    }
    const request = typeof root.requestFullscreen === "function"
      ? () => root.requestFullscreen({ navigationUI: "hide" })
      : typeof root.webkitRequestFullscreen === "function"
        ? () => root.webkitRequestFullscreen?.()
        : null;
    if (!request) {
      setImmersiveState("unsupported");
      if (explainFailure) setImmersiveNoticeOpen(true);
      void requestLandscapeOrientation();
      return;
    }
    let result: Promise<void> | void;
    try {
      result = request();
    } catch {
      setImmersiveState("denied");
      if (explainFailure) setImmersiveNoticeOpen(true);
      void requestLandscapeOrientation();
      return;
    }
    void Promise.resolve(result)
      .then(() => {
        gameOwnsFullscreenRef.current = fullscreenElement() === root;
        setImmersiveState(browserImmersiveState(gameOwnsFullscreenRef.current));
      })
      .catch(() => {
        setImmersiveState("denied");
        if (explainFailure) setImmersiveNoticeOpen(true);
      })
      .finally(() => {
        void requestLandscapeOrientation();
      });
  }, []);

  const releaseGameFullscreen = useCallback(() => {
    releaseMobileBrowserChromeCollapse();
    if (!gameOwnsFullscreenRef.current) return;
    gameOwnsFullscreenRef.current = false;
    const fullscreenDocument = document as WebkitFullscreenDocument;
    if (
      fullscreenElement() === document.documentElement &&
      typeof document.exitFullscreen === "function"
    ) {
      void document.exitFullscreen().catch(() => {
        // The user or browser may have already ended fullscreen.
      });
    } else if (
      fullscreenElement() === document.documentElement &&
      typeof fullscreenDocument.webkitExitFullscreen === "function"
    ) {
      void Promise.resolve(fullscreenDocument.webkitExitFullscreen()).catch(() => {
        // The user or browser may have already ended fullscreen.
      });
    }
  }, []);

  const recordCaptainRun = useCallback((summary: CaptainRunSummary) => {
    setCaptainProgression((current) => awardCaptainRun(summary, current));
  }, []);

  const start = useCallback((nextMode: LaunchMode = mode, usePublicMatchmaking = false) => {
    if (isPortraitTouchViewport()) {
      // Do not trap a portrait phone in a fullscreen window that cannot resize
      // into the landscape gate. Landscape/desktop launches still use the Play
      // gesture for fullscreen; portrait users rotate before gameplay begins.
      void requestLandscapeOrientation();
      setPortraitTouchViewport(true);
      setPendingLandscapeLaunch({ mode: nextMode, publicMatchmaking: usePublicMatchmaking });
      return;
    }
    requestImmersiveGameplay();
    setPendingLandscapeLaunch(null);
    beginStart(nextMode, usePublicMatchmaking);
  }, [beginStart, mode, requestImmersiveGameplay]);

  useEffect(() => {
    if (!pendingLandscapeLaunch || portraitTouchViewport) return;
    const nextMode = pendingLandscapeLaunch.mode;
    const usePublicMatchmaking = pendingLandscapeLaunch.publicMatchmaking;
    setPendingLandscapeLaunch(null);
    beginStart(nextMode, usePublicMatchmaking);
  }, [beginStart, pendingLandscapeLaunch, portraitTouchViewport]);

  const platformAdHooks = (grantReward?: () => void) => ({
    pauseGameplay: () => setAdActive(true),
    muteAudio: () => setAdActive(true),
    resumeGameplay: () => {
      setAdActive(false);
      setAdRequestPending(false);
    },
    unmuteAudio: () => setAdActive(false),
    grantReward,
  });

  const requestPostRunAd = () => {
    if (!isCrazyGamesDistribution) return;
    const elapsedSeconds = Math.max(0, (performance.now() - runStartedAtRef.current) / 1_000);
    eligibleGameplaySecondsRef.current += elapsedSeconds;
    void gamePlatform.gameplayStop().catch((error) => reportPlatformError("gameplay-stop", error));

    // Never place an ad before the player has experienced a reasonable amount
    // of play. CrazyGames additionally owns its cross-game frequency cap.
    if (eligibleGameplaySecondsRef.current < 60 || adRequestPending || adActive) return;
    eligibleGameplaySecondsRef.current = 0;
    setAdRequestPending(true);
    setAdStatus("Checking for a between-run ad…");
    void gamePlatform.requestMidgameAd(platformAdHooks())
      .then((result) => {
        setAdStatus(result.status === "finished" ? "Ad complete." : "No ad available—keep playing.");
      })
      .catch((error) => {
        reportPlatformError("midgame-ad", error);
        setAdStatus("No ad available—keep playing.");
      })
      .finally(() => {
        setAdActive(false);
        setAdRequestPending(false);
      });
  };

  const requestRewardedOffer = () => {
    if (!rewardedSkinMenuEnabled || adRequestPending || adActive) return;
    setAdRequestPending(true);
    setAdStatus("Checking for an optional rewarded video…");
    void gamePlatform.requestRewardedAd(platformAdHooks(() => {
      const equipped = grantRewardedCorsairSkin();
      setRewardedSkinEquipped(equipped);
      setAdStatus(equipped
        ? `${REWARDED_CORSAIR_SKIN_LABEL} unlocked and equipped.`
        : "The completed reward could not be saved on this device.");
    }))
      .then((result) => {
        if (result.status !== "finished") setAdStatus("No video available. No reward was charged or granted.");
      })
      .catch((error) => {
        reportPlatformError("rewarded-ad", error);
        setAdStatus("No video available. No reward was charged or granted.");
      })
      .finally(() => {
        setAdActive(false);
        setAdRequestPending(false);
      });
  };

  const openInvite = () => {
    if (!playing) prepareRoom();
    setCopyStatus("");
    setInviteOpen(true);
  };

  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const effectiveLiveRoomId = playing && mode === "live" ? resolvedLiveRoomId : roomId;
  const inviteUrl = buildPaceAwareInviteUrl(
    buildBoardAwareInviteUrl(
      buildRoomInviteUrl(effectiveLiveRoomId),
      requestedBoardId,
      authoritativeBoardId,
    ),
    requestedPaceId,
    authoritativePaceId,
  );
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus(`${roomIdentityLabel(effectiveLiveRoomId)} LINK COPIED`);
    } catch {
      setCopyStatus("SELECT THE CREW LINK ABOVE TO COPY IT");
    }
  };
  const shareInvite = async () => {
    try {
      await navigator.share({
        title: `Join my Wormifi ${roomIdentityLabel(effectiveLiveRoomId)}`,
        text: `Meet me in ${roomIdentityLabel(effectiveLiveRoomId)} on Wormifi.`,
        url: inviteUrl,
      });
      setCopyStatus("CREW INVITE OPENED");
    } catch {
      // Closing the platform share sheet is intentional and does not need an error.
    }
  };

  const roomScope: RoomIdentityScope = mode === "live"
    ? "live"
    : mode === "practice"
      ? "practice"
      : challenge
        ? "challenge"
        : "solo";
  const landscapeBlocked = portraitTouchViewport &&
    (playing || pendingLandscapeLaunch !== null);

  return (
    <main
      className="app-shell"
      aria-busy={adRequestPending || adActive}
      data-landscape-blocked={landscapeBlocked ? "true" : "false"}
      data-playing={playing ? "true" : "false"}
      data-immersive-state={immersiveState}
    >
      {playing && mode === "live" ? (
        landscapeBlocked ? null : <LiveArenaCanvas
          playerName={name || "Guest"}
          running={playing}
          session={session}
          roomId={roomId}
          publicMatchmaking={publicMatchmaking}
          boardId={boardIdForJoin(boardSelection)}
          paceId={paceIdForJoin(paceSelection)}
          themeId={photoSkinRenderPlan.multiplayerAppearance.themeId}
          photoSkin={localPhotoSkinAppearance}
          controlScheme={controlScheme}
          onBoardResolved={setAuthoritativeBoardId}
          onPaceResolved={setAuthoritativePaceId}
          onRoomResolved={handleLiveRoomResolved}
          onLifeEnded={recordCaptainRun}
          onExit={() => {
            setPlaying(false);
            setMode("rush");
            releaseGameFullscreen();
          }}
        />
      ) : (
        <ArenaCanvas
          playerName={name || "Guest"}
          mode={mode === "live" ? "rush" : mode}
          challenge={challenge}
          running={playing}
          paused={adRequestPending || adActive || landscapeBlocked}
          session={session}
          boardId={boardSelection.boardId}
          paceId={paceSelection.paceId}
          photoSkin={localPhotoSkinAppearance}
          controlScheme={controlScheme}
          onExit={() => {
            setPlaying(false);
            releaseGameFullscreen();
          }}
          onRestart={() => start(mode === "live" ? "rush" : mode)}
          onRunEnded={(summary) => {
            recordCaptainRun(summary);
            requestPostRunAd();
          }}
        />
      )}

      {playing && (
        <RoomIdentity
          scope={roomScope}
          roomId={effectiveLiveRoomId}
          onInvite={roomScope === "live" ? openInvite : undefined}
        />
      )}

      {playing && !landscapeBlocked && !isCrazyGamesDistribution && immersiveState !== "active" && (
        <button
          type="button"
          className="immersive-button"
          data-testid="immersive-button"
          data-state={immersiveState}
          aria-label={immersiveState === "unsupported"
            ? "Fullscreen unavailable in this browser"
            : "Enter true fullscreen"}
          title={immersiveState === "unsupported"
            ? "This browser keeps its own tabs"
            : "Enter true fullscreen"}
          onClick={() => requestImmersiveGameplay(true)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
            {immersiveState === "unsupported" && <path d="M5 5l14 14" />}
          </svg>
        </button>
      )}

      {playing && !landscapeBlocked && immersiveNoticeOpen && (
        <aside className="immersive-notice" data-testid="immersive-notice" role="status">
          <div>
            <b>{immersiveState === "unsupported"
              ? "THIS BROWSER BLOCKS TRUE FULLSCREEN"
              : "FULLSCREEN WAS BLOCKED"}</b>
            <span>{immersiveState === "unsupported"
              ? "Desktop: press F11. Phone: install Wormifi, then launch it from its icon."
              : "Tap the fullscreen control again and allow fullscreen."}</span>
          </div>
          <button type="button" aria-label="Dismiss fullscreen message" onClick={() => setImmersiveNoticeOpen(false)}>×</button>
        </aside>
      )}

      {!playing && (
        legendVoyageOpen && !isCrazyGamesDistribution ? (
          <LegendVoyage
            progression={captainProgression}
            onClose={() => {
              setLegendVoyageOpen(false);
              setSettingsOpen(true);
            }}
            onOpenSkinStudio={() => {
              skinStudioReturnToSettingsRef.current = true;
              setLegendVoyageOpen(false);
              setSkinStudioOpen(true);
            }}
          />
        ) : skinStudioOpen && !isCrazyGamesDistribution ? (
          <SkinStudio
            initialState={photoSkinState}
            onStateChange={setPhotoSkinState}
            onClose={() => {
              setSkinStudioOpen(false);
              setSettingsOpen(skinStudioReturnToSettingsRef.current);
            }}
            onOpenLegendVoyage={() => {
              setSkinStudioOpen(false);
              setLegendVoyageOpen(true);
            }}
          />
        ) : currencyStoreOpen && currencyStoreMenuEnabled ? (
          <CurrencyStoreLayout
            open
            authorized={monetizationConfig.iapAuthorized}
            onClose={() => setCurrencyStoreOpen(false)}
          />
        ) : settingsOpen ? (
          <section className="settings-panel" data-testid="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <header className="settings-header">
              <div>
                <small>CAPTAIN'S QUARTERS</small>
                <h2 id="settings-title">SETTINGS</h2>
                <p>Change the details here. The main screen stays focused on playing.</p>
              </div>
              <button
                type="button"
                className="settings-close"
                data-testid="settings-close"
                aria-label="Close settings"
                autoFocus
                onClick={closeSettings}
              >×</button>
            </header>

            <div className="settings-grid">
              <section className="settings-group settings-captain-group" aria-labelledby="captain-settings-title">
                <header>
                  <small>LOOK & CONTROLS</small>
                  <h3 id="captain-settings-title">YOUR CAPTAIN</h3>
                </header>

                {!isCrazyGamesDistribution && <button
                  type="button"
                  className="live-lab-button skin-studio-launch"
                  data-testid="skin-studio-launch"
                  onClick={() => {
                    skinStudioReturnToSettingsRef.current = true;
                    setSettingsOpen(false);
                    setSkinStudioOpen(true);
                  }}
                >
                  <b>CUSTOMIZE FACE &amp; SKIN</b>
                  <small>BODY ONLY · FACE ONLY · COMPLETE STYLES</small>
                </button>}

                {!isCrazyGamesDistribution && <button
                  type="button"
                  className="captain-progress-launch"
                  data-testid="legend-voyage-launch"
                  onClick={() => {
                    setSettingsOpen(false);
                    setLegendVoyageOpen(true);
                  }}
                  aria-label={`Captain Level ${captainLevel.level}. Open Legend Voyage research preview.`}
                >
                  <span className="captain-progress-launch__level">
                    <small>CAPTAIN LEVEL</small>
                    <strong>{captainLevel.level}</strong>
                  </span>
                  <span className="captain-progress-launch__copy">
                    <b>LEGEND VOYAGE · TRY ALL 3</b>
                    <small>PERMANENT COSMETIC ROUTE · NOT FOR SALE YET</small>
                    <i><span style={{ width: `${captainLevel.percent}%` }} /></i>
                  </span>
                  {captainProgression.lastAwardXp > 0 && (
                    <em>LAST RUN +{captainProgression.lastAwardXp} XP</em>
                  )}
                </button>}

                <div className="control-picker" role="group" aria-label="Mobile helm position">
                  <small>MOBILE HELM</small>
                  <div>
                    {CONTROL_SCHEME_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={controlScheme === option.id ? "active" : ""}
                        aria-pressed={controlScheme === option.id}
                        data-testid={`control-${option.id}`}
                        onClick={() => setControlScheme(option.id)}
                      >
                        <b>{option.label}</b>
                        <span>{option.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="settings-group settings-game-group" aria-labelledby="game-settings-title">
                <header>
                  <small>ROOM RULES</small>
                  <h3 id="game-settings-title">GAME SETUP</h3>
                </header>

                <div className="mode-tabs" role="group" aria-label="Solo mode">
                  <button
                    aria-pressed={mode === "rush"}
                    className={mode === "rush" ? "active" : ""}
                    onClick={() => {
                      setMode("rush");
                      setChallenge(null);
                    }}
                  >
                    <b>90s RUSH</b><small>Fast score chase</small>
                  </button>
                  <button
                    aria-pressed={mode === "endless"}
                    className={mode === "endless" ? "active" : ""}
                    onClick={() => {
                      setMode("endless");
                      setChallenge(null);
                    }}
                  >
                    <b>ENDLESS</b><small>Grow without limits</small>
                  </button>
                </div>

                {!isCrazyGamesDistribution && (
                  <details className="settings-board-shortcut" data-testid="board-shortcut">
                    <summary data-testid="board-shortcut-toggle">
                      <span>BOARD</span>
                      <strong>{selectedBoardOption.name}</strong>
                      <small>{boardSelection.locked ? "ROOM LOCKED" : "CHANGE"}</small>
                    </summary>
                    <BoardPicker
                      value={requestedBoardId}
                      existingRoomBoardId={authoritativeBoardId}
                      onChange={chooseBoard}
                    />
                  </details>
                )}

                <PacePicker
                  value={requestedPaceId}
                  existingRoomPaceId={authoritativePaceId}
                  onChange={choosePace}
                />
              </section>

              {!isCrazyGamesDistribution && <section className="settings-group settings-room-group" aria-labelledby="friend-room-title">
                <header>
                  <small>PLAY TOGETHER</small>
                  <h3 id="friend-room-title">FRIEND ROOM</h3>
                </header>
                <div className="friend-room-card friend-room-card--settings" data-testid="friend-room-card">
                  <div className="friend-room-heading">
                    <span>YOUR LIVE ROOM</span>
                    <strong data-testid="lobby-room-identity">{roomIdentityLabel(roomDraft)}</strong>
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      setChallenge(null);
                      start("live", false);
                    }}
                  >
                    <label>
                      <span className="sr-only">Room number or code</span>
                      <input
                        value={roomDraft}
                        maxLength={32}
                        aria-label="Room number or code"
                        onChange={(event) => setRoomDraft(
                          event.target.value.toLowerCase().replace(/[^a-z0-9-]/gu, "").slice(0, 32),
                        )}
                        onBlur={() => prepareRoom()}
                      />
                    </label>
                    <button type="submit" className="room-join-button">JOIN ROOM</button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRoom = createCrewRoomId();
                        setChallenge(null);
                        prepareRoom(nextRoom);
                        setCopyStatus("");
                      }}
                    >
                      NEW ROOM
                    </button>
                  </form>
                  <button
                    type="button"
                    className="friend-challenge-button"
                    data-testid="lobby-invite"
                    onClick={openInvite}
                  >
                    <b>⚔ CHALLENGE A FRIEND</b>
                    <span>SHARE THIS LIVE ROOM LINK</span>
                  </button>
                </div>
              </section>}

              {(rewardedSkinMenuEnabled || currencyStoreMenuEnabled) && (
                <section className="settings-group settings-extras-group" aria-label="Optional cosmetic extras">
                  {rewardedSkinMenuEnabled && (
                    <section className="monetization-menu-card rewarded-ad-card" aria-label="Optional rewarded skin unlock" data-testid="rewarded-skin-menu">
                      <div>
                        <b>{REWARDED_CORSAIR_SKIN_LABEL}: {rewardedSkinEquipped ? "EQUIPPED" : "LOCKED"}</b>
                        <small>Optional video · unlocks one gold cosmetic skin</small>
                      </div>
                      <div>
                        <button type="button" disabled={rewardedSkinEquipped} onClick={requestRewardedOffer}>
                          {rewardedSkinEquipped ? "SKIN EQUIPPED" : "WATCH VIDEO · UNLOCK SKIN"}
                        </button>
                        <button type="button" onClick={() => setAdStatus("Optional reward skipped.")}>NOT NOW</button>
                      </div>
                    </section>
                  )}
                  {currencyStoreMenuEnabled && (
                    <section className="monetization-menu-card currency-store-card" aria-label="Cosmetic currency store" data-testid="currency-store-menu">
                      <div>
                        <b>SHIP'S PURSE: {doubloons.toLocaleString()} DOUBLOONS</b>
                        <small>Cosmetic packs only · never active-game advantage</small>
                      </div>
                      <button type="button" onClick={() => setCurrencyStoreOpen(true)}>OPEN CAPTAIN'S TREASURY</button>
                    </section>
                  )}
                </section>
              )}
            </div>

            <button type="button" className="settings-done" onClick={closeSettings}>DONE</button>
            {isCrazyGamesDistribution && adStatus && <p className="platform-ad-status" role="status">{adStatus}</p>}
          </section>
        ) : (
        <section className="launch-panel launch-panel--simple" aria-labelledby="wormifi-title">
          <div className="launch-header launch-header--simple">
            <div className="brand-lockup" aria-label="Wormifi">
              <span className="brand-orbit brand-orbit-a" />
              <span className="brand-orbit brand-orbit-b" />
              <h1 id="wormifi-title">WORMIFI</h1>
              <p>TREASURE CREW ARENA</p>
            </div>
            <button
              ref={settingsButtonRef}
              type="button"
              className="launcher-settings-button"
              data-testid="settings-button"
              onClick={() => setSettingsOpen(true)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
              </svg>
              <span>SETTINGS</span>
            </button>
          </div>

          <div className="launch-five-second-promise" id="game-promise">
            <strong>HUNT TREASURE. GROW. CUT RIVALS.</strong>
            <span>Rule the tide before they circle you.</span>
          </div>

          <div className="quick-start">
            <div
              className="captain-launch-profile"
              data-testid="launcher-captain-profile"
              data-theme-id={photoSkinRenderPlan.theme.id}
            >
              <div className="captain-launch-profile__portrait-control">
                <div className="captain-launch-profile__portrait">
                  <img
                    src={captainPortraitSource(photoSkinRenderPlan.theme.pattern)}
                    alt={`${photoSkinRenderPlan.theme.label} captain portrait`}
                    width="320"
                    height="320"
                    decoding="async"
                  />
                </div>
                {!isCrazyGamesDistribution && <button
                  type="button"
                  className="captain-launch-profile__choose"
                  data-testid="launcher-choose-look"
                  aria-label={`Choose your captain look. Current look: ${photoSkinRenderPlan.theme.label}`}
                  onClick={() => {
                    skinStudioReturnToSettingsRef.current = false;
                    setSkinStudioOpen(true);
                  }}
                >
                  CHOOSE LOOK
                </button>}
              </div>

              <div className="captain-launch-profile__identity">
                <div className="captain-launch-profile__identity-head">
                  <span className="captain-launch-profile__selected">
                    <small>YOUR CAPTAIN</small>
                    <strong data-testid="launcher-selected-look">{photoSkinRenderPlan.theme.label}</strong>
                  </span>
                  {captainProgression.completedRuns > 0 && (
                    <button
                      type="button"
                      className="launcher-voyage-badge"
                      data-testid="legend-voyage-launch"
                      aria-label={`Captain Level ${captainLevel.level}. Open Legend Voyage research preview.`}
                      onClick={() => setLegendVoyageOpen(true)}
                    >
                      <span>LV {captainLevel.level}</span>
                      <b>LEGEND VOYAGE</b>
                      <small>TRY ALL 3 · $4.99 RESEARCH</small>
                    </button>
                  )}
                </div>
                <label className="nickname-field nickname-field--quick">
                  <span>YOUR ARENA NAME</span>
                  <input
                    value={name}
                    maxLength={18}
                    onChange={(event) => setName(event.target.value.replace(/[^a-z0-9 _-]/gi, ""))}
                    aria-label="Your arena name"
                  />
                </label>
              </div>
            </div>

            {challenge && (
              <div className="incoming-challenge" data-testid="incoming-challenge">
                <small>{rivalLabel(challenge)} SENT A RIVALRY RUN</small>
                <strong>Beat {challenge.target.value.toLocaleString()} points</strong>
                <span>Same arena seed. One clean attempt.</span>
              </div>
            )}

            <button
              ref={playButtonRef}
              className="play-button play-button--primary"
              data-testid="live-lab-button"
              onClick={() => {
                if (isCrazyGamesDistribution) start(mode === "live" ? "rush" : mode);
                else if (challenge) start(mode);
                else start("live", publicMatchmaking);
              }}
            >
              <span>{isCrazyGamesDistribution ? "PLAY NOW" : challenge ? "ACCEPT CHALLENGE" : "PLAY LIVE"}</span>
              <small>
                {isCrazyGamesDistribution
                  ? `${mode === "endless" ? "Endless solo" : "90-second solo"} · one click to the arena`
                  : challenge
                  ? "Same seed · beat the target"
                  : `${roomIdentityLabel(roomDraft)} · humans + labeled AI backfill`}
              </small>
            </button>

            <div className="quick-play-row">
              {!isCrazyGamesDistribution && <button
                className="quick-play-button"
                data-testid="solo-run-button"
                onClick={() => start(mode === "endless" ? "endless" : "rush")}
              >
                <b>{mode === "endless" ? "ENDLESS SOLO" : "90s SOLO"}</b>
                <small>PLAY ALONE</small>
              </button>}
              <button className="quick-play-button" aria-label="Practice with labeled bots" onClick={() => {
                setChallenge(null);
                start("practice");
              }}>
                <b>PRACTICE</b>
                <small>LABELED BOTS</small>
              </button>
            </div>

            {!isCrazyGamesDistribution && <section className="friend-room-card friend-room-card--quick" data-testid="friend-room-card" aria-label="Challenge a friend">
              <button
                type="button"
                className="friend-challenge-button"
                data-testid="lobby-invite"
                onClick={openInvite}
              >
                <b>⚔ CHALLENGE A FRIEND</b>
                <span>SHARE <strong data-testid="lobby-room-identity">{roomIdentityLabel(roomDraft)}</strong></span>
              </button>
            </section>}

            <div className="trust-row" aria-label="Game promises">
              <span>NO SIGN-UP</span>
              <span>NO AD BEFORE PLAY</span>
              <span>NO PAY-TO-WIN</span>
            </div>
          </div>
        </section>
      ))}

      {!playing && !settingsOpen && !legendVoyageOpen && !skinStudioOpen && !currencyStoreOpen && !isCrazyGamesDistribution && (
        <nav className="site-guide-links" aria-label="Wormifi guides and policies">
          <a href="/how-to-play.html">How to play</a>
          <a href="/guides.html">Guides</a>
          <a href="/multiplayer.html">Multiplayer</a>
          <a href="/pirate-treasure.html">Treasure guide</a>
          <a href="/install.html" className="install-link">Install the app</a>
          <a href="/privacy.html">Privacy choices</a>
        </nav>
      )}
      <footer
        className="build-mark"
        data-testid="build-version"
        title={`Build revision ${buildRevision}`}
      >
        {isCrazyGamesDistribution
          ? "WORMIFI · CRAZYGAMES HTML5 BUILD"
          : `WORMIFI.COM · ${buildVersionLabel(buildRevision)} · AUTO-UPDATES`}
      </footer>
      {!isCrazyGamesDistribution && <PwaStatus activeMatch={playing} />}
      {!isCrazyGamesDistribution && <RoomInviteDialog
        open={inviteOpen}
        roomId={effectiveLiveRoomId}
        inviteUrl={inviteUrl}
        copyStatus={copyStatus}
        onCopy={() => void copyInvite()}
        onNativeShare={() => void shareInvite()}
        onClose={closeInvite}
      />}
      {isCrazyGamesDistribution && (adRequestPending || adActive) && (
        <div className="platform-ad-lock" role="status" aria-live="assertive">
          <b>{adActive ? "AD BREAK" : "CHECKING FOR AD"}</b>
          <span>Gameplay and audio are paused safely.</span>
        </div>
      )}
      {landscapeBlocked && (
        <section
          className="landscape-gate"
          data-testid="landscape-gate"
          data-state={playing ? "interrupted" : "prelaunch"}
          role="dialog"
          aria-modal="true"
          aria-labelledby="landscape-gate-title"
          aria-describedby="landscape-gate-copy"
        >
          <div className="landscape-gate__card">
            <small>WORMIFI WIDE-SEA STANDARD</small>
            <div className="landscape-gate__device" aria-hidden="true">
              <span />
              <b>↻</b>
            </div>
            <h2 id="landscape-gate-title">
              {playing ? "ROTATE TO CONTINUE" : "ROTATE TO PLAY"}
            </h2>
            <p id="landscape-gate-copy">
              Wormifi gameplay is landscape only. Turn your phone sideways for the full arena, safer turns, and readable rival space.
            </p>
            <strong>YOUR RUN {playing ? "IS PAUSED OR RECONNECTING" : "WILL START AUTOMATICALLY"} WHEN THE SCREEN IS WIDE</strong>
            <button
              type="button"
              onClick={() => {
                setPendingLandscapeLaunch(null);
                if (playing) {
                  setPlaying(false);
                  setMode("rush");
                }
                releaseGameFullscreen();
              }}
            >
              {playing ? "EXIT TO HARBOR" : "BACK TO HARBOR"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
