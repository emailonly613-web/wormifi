import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArenaCanvas } from "./components/ArenaCanvas";
import { LiveArenaCanvas } from "./components/LiveArenaCanvas";
import { PwaStatus } from "./components/PwaStatus";
import { SkinStudio } from "./components/SkinStudio";
import { BoardPicker } from "./components/BoardPicker";
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
  readRoomId,
  roomIdentityLabel,
  writeRoomIdToLocation,
} from "./game/roomIdentity";
import {
  boardIdForJoin,
  buildBoardAwareInviteUrl,
  buildBoardPreferenceUrl,
  readBoardPreference,
  resolveRoomBoardPreference,
  type GameBoardId,
} from "./game/boardPreference";
import {
  PhotoSkinImageCache,
  createPhotoSkinRenderPlan,
  readPhotoSkinState,
  type PhotoSkinState,
} from "./game/photoSkin";
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

export function App() {
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
  const [requestedBoardId, setRequestedBoardId] = useState<GameBoardId>(() => readBoardPreference(window.location.search));
  const [authoritativeBoardId, setAuthoritativeBoardId] = useState<GameBoardId | undefined>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [skinStudioOpen, setSkinStudioOpen] = useState(false);
  const [photoSkinState, setPhotoSkinState] = useState<PhotoSkinState>(() => readPhotoSkinState().state);
  const [decodedPhotoImages, setDecodedPhotoImages] = useState<ReadonlyMap<string, CanvasImageSource>>(() => new Map());
  const [copyStatus, setCopyStatus] = useState("");
  const [adActive, setAdActive] = useState(false);
  const [adRequestPending, setAdRequestPending] = useState(false);
  const [adStatus, setAdStatus] = useState("");
  const [doubloons] = useState(readDoubloons);
  const [rewardedSkinEquipped, setRewardedSkinEquipped] = useState(isRewardedCorsairSkinEquipped);
  const [currencyStoreOpen, setCurrencyStoreOpen] = useState(false);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const photoSkinImageCacheRef = useRef(new PhotoSkinImageCache());
  const wasPlayingRef = useRef(false);
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
    if (!isCrazyGamesDistribution) return;
    const lifecycle = playing ? gamePlatform.gameplayStart() : gamePlatform.gameplayStop();
    void lifecycle.catch((error) => reportPlatformError(
      playing ? "gameplay-start" : "gameplay-stop",
      error,
    ));
  }, [playing, session]);

  const prepareRoom = (requestedRoom = roomDraft) => {
    const nextRoom = normalizeRoomId(requestedRoom);
    if (nextRoom !== roomId) setAuthoritativeBoardId(undefined);
    setRoomId(nextRoom);
    setRoomDraft(nextRoom);
    writeRoomIdToLocation(nextRoom);
    return nextRoom;
  };

  const chooseBoard = (boardId: GameBoardId) => {
    setRequestedBoardId(boardId);
    const nextUrl = buildBoardPreferenceUrl(window.location.href, boardId);
    window.history.replaceState(null, "", nextUrl);
  };

  const start = (nextMode: LaunchMode = mode) => {
    if (nextMode === "live") prepareRoom();
    setCurrencyStoreOpen(false);
    setMode(nextMode);
    setSession((value) => value + 1);
    runStartedAtRef.current = performance.now();
    setPlaying(true);
  };

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
    prepareRoom();
    setCopyStatus("");
    setInviteOpen(true);
  };

  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const inviteUrl = buildBoardAwareInviteUrl(
    buildRoomInviteUrl(roomId),
    requestedBoardId,
    authoritativeBoardId,
  );
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus(`${roomIdentityLabel(roomId)} LINK COPIED`);
    } catch {
      setCopyStatus("SELECT THE CREW LINK ABOVE TO COPY IT");
    }
  };
  const shareInvite = async () => {
    try {
      await navigator.share({
        title: `Join my Wormifi ${roomIdentityLabel(roomId)}`,
        text: `Meet me in ${roomIdentityLabel(roomId)} on Wormifi.`,
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

  return (
    <main className="app-shell" aria-busy={adRequestPending || adActive}>
      {playing && mode === "live" ? (
        <LiveArenaCanvas
          playerName={name || "Guest"}
          running={playing}
          session={session}
          roomId={roomId}
          boardId={boardIdForJoin(boardSelection)}
          themeId={photoSkinRenderPlan.multiplayerAppearance.themeId}
          photoSkin={localPhotoSkinAppearance}
          controlScheme={controlScheme}
          onBoardResolved={setAuthoritativeBoardId}
          onExit={() => {
            setPlaying(false);
            setMode("rush");
          }}
        />
      ) : (
        <ArenaCanvas
          playerName={name || "Guest"}
          mode={mode === "live" ? "rush" : mode}
          challenge={challenge}
          running={playing}
          paused={adRequestPending || adActive}
          session={session}
          boardId={boardSelection.boardId}
          photoSkin={localPhotoSkinAppearance}
          controlScheme={controlScheme}
          onExit={() => setPlaying(false)}
          onRestart={() => start(mode === "live" ? "rush" : mode)}
          onRunEnded={requestPostRunAd}
        />
      )}

      {playing && (
        <RoomIdentity
          scope={roomScope}
          roomId={roomId}
          onInvite={roomScope === "live" ? openInvite : undefined}
        />
      )}

      {!playing && (
        skinStudioOpen && !isCrazyGamesDistribution ? (
          <SkinStudio
            initialState={photoSkinState}
            onStateChange={setPhotoSkinState}
            onClose={() => setSkinStudioOpen(false)}
          />
        ) : currencyStoreOpen && currencyStoreMenuEnabled ? (
          <CurrencyStoreLayout
            open
            authorized={monetizationConfig.iapAuthorized}
            onClose={() => setCurrencyStoreOpen(false)}
          />
        ) : (
        <section className="launch-panel" aria-labelledby="wormifi-title">
          <div className="brand-lockup" aria-label="Wormifi">
            <span className="brand-orbit brand-orbit-a" />
            <span className="brand-orbit brand-orbit-b" />
            <h1 id="wormifi-title">WORMIFI</h1>
            <p>TREASURE CREW ARENA</p>
          </div>

          <div className="promise-card" id="game-promise">
            <strong>Hunt rare treasure.</strong>
            <span>Grow your pirate crew. Cut rival captains. Rule the tide.</span>
          </div>

          {challenge && (
            <div className="incoming-challenge" data-testid="incoming-challenge">
              <small>{rivalLabel(challenge)} SENT A RIVALRY RUN</small>
              <strong>Beat {challenge.target.value.toLocaleString()} points</strong>
              <span>Same arena seed. One clean attempt.</span>
            </div>
          )}

          <label className="nickname-field">
            <span>YOUR ARENA NAME</span>
            <input
              value={name}
              maxLength={18}
              onChange={(event) => setName(event.target.value.replace(/[^a-z0-9 _-]/gi, ""))}
              aria-label="Your arena name"
            />
          </label>

          {!isCrazyGamesDistribution && <button
              type="button"
              className="live-lab-button skin-studio-launch"
              data-testid="skin-studio-launch"
              onClick={() => setSkinStudioOpen(true)}
            >
              <b>CUSTOMIZE SKIN</b>
              <small>PRIVATE PHOTO SKINS · YOUR PHOTOS STAY ON THIS DEVICE</small>
            </button>}

          {!isCrazyGamesDistribution && (
            <BoardPicker
              value={requestedBoardId}
              existingRoomBoardId={authoritativeBoardId}
              onChange={chooseBoard}
            />
          )}

          {!isCrazyGamesDistribution && <section className="friend-room-card" data-testid="friend-room-card" aria-labelledby="friend-room-title">
            <div className="friend-room-heading">
              <span id="friend-room-title">FRIEND ROOM</span>
              <strong data-testid="lobby-room-identity">{roomIdentityLabel(roomDraft)}</strong>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setChallenge(null);
                start("live");
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
              <button type="button" data-testid="lobby-invite" onClick={openInvite}>INVITE</button>
            </form>
            <small>Same room code = same live arena. Send the link, then both press Play Live.</small>
          </section>}

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

          <button
            ref={playButtonRef}
            className="play-button"
            data-testid="live-lab-button"
            onClick={() => {
              if (isCrazyGamesDistribution) start(mode === "live" ? "rush" : mode);
              else if (challenge) start(mode);
              else start("live");
            }}
          >
            <span>{isCrazyGamesDistribution ? "PLAY NOW" : challenge ? "ACCEPT CHALLENGE" : "PLAY LIVE"}</span>
            <small>
              {isCrazyGamesDistribution
                ? `${mode === "endless" ? "Endless solo" : "90-second solo"} · one click to the arena`
                : challenge
                ? "Same seed · beat the target"
                : `${roomIdentityLabel(roomDraft)} · humans + clearly labeled AI backfill`}
            </small>
          </button>

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

          {!isCrazyGamesDistribution && <button
            className="live-lab-button"
            data-testid="solo-run-button"
            onClick={() => start(mode)}
          >
            <b>{mode === "endless" ? "PLAY ENDLESS SOLO" : "PLAY 90S SOLO"}</b>
            <small>Immediate local run · exact six-second replay on finish</small>
          </button>}

          {rewardedSkinMenuEnabled && (
            <section
              className="monetization-menu-card rewarded-ad-card"
              aria-label="Optional rewarded skin unlock"
              data-testid="rewarded-skin-menu"
            >
              <div>
                <b>{REWARDED_CORSAIR_SKIN_LABEL}: {rewardedSkinEquipped ? "EQUIPPED" : "LOCKED"}</b>
                <small>Optional video · unlocks one gold cosmetic skin after the video completes</small>
              </div>
              <div>
                <button
                  type="button"
                  disabled={rewardedSkinEquipped}
                  onClick={requestRewardedOffer}
                >
                  {rewardedSkinEquipped ? "SKIN EQUIPPED" : "WATCH VIDEO · UNLOCK SKIN"}
                </button>
                <button type="button" onClick={() => setAdStatus("Optional reward skipped.")}>NOT NOW</button>
              </div>
            </section>
          )}

          {currencyStoreMenuEnabled && (
            <section
              className="monetization-menu-card currency-store-card"
              aria-label="Cosmetic currency store"
              data-testid="currency-store-menu"
            >
              <div>
                <b>SHIP'S PURSE: {doubloons.toLocaleString()} DOUBLOONS</b>
                <small>Cosmetic packs only · the treasury opens between runs and never covers active gameplay</small>
              </div>
              <button type="button" onClick={() => setCurrencyStoreOpen(true)}>
                OPEN CAPTAIN'S TREASURY
              </button>
            </section>
          )}

          {isCrazyGamesDistribution && adStatus && <p className="platform-ad-status" role="status">{adStatus}</p>}

          <button className="practice-button" onClick={() => {
            setChallenge(null);
            start("practice");
          }}>
            PRACTICE WITH LABELED BOTS
          </button>

          <div className="trust-row" aria-label="Game promises">
            <span>NO SIGN-UP</span>
            <span>NO AD BEFORE PLAY</span>
            <span>NO PAY-TO-WIN</span>
          </div>
        </section>
      ))}

      {!playing && !isCrazyGamesDistribution && (
        <nav className="site-guide-links" aria-label="Wormifi guides and policies">
          <a href="/how-to-play.html">How to play</a>
          <a href="/multiplayer.html">Multiplayer</a>
          <a href="/pirate-treasure.html">Treasure guide</a>
          <a href="/install.html" className="install-link">Install the app</a>
          <a href="/privacy.html">Privacy choices</a>
        </nav>
      )}
      <footer className="build-mark">
        {isCrazyGamesDistribution ? "WORMIFI · CRAZYGAMES HTML5 BUILD" : "WORMIFI.COM · ORIGINAL PREVIEW BUILD"}
      </footer>
      {!isCrazyGamesDistribution && <PwaStatus />}
      {!isCrazyGamesDistribution && <RoomInviteDialog
        open={inviteOpen}
        roomId={roomId}
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
    </main>
  );
}
