import * as Phaser from "phaser";
import { getRoom, startRoomId, canStep, invalidateBlocked } from "@/game/world/rooms";
import { resolveTextureKey, SHADOW_KEY } from "@/game/art/registry";
import { wallVariant } from "@/game/art/wallVariant";
import { footprint, propActive } from "@/game/world/types";
import type { Interaction, Decoration, Room } from "@/game/world/types";
import { HEATH_INTRO_PATH, HEATH_HOME, heathPathAlongCounter } from "@/game/world/mainRoom";
import { gameSession } from "@/lib/gameSession";

type Facing = "down" | "up" | "left" | "right";

const FADE_MS = 260;
const STEP_MS = 130;
// Slow enough that each stride frame reads (FireRed walks ~250ms/tile).
const PLAYER_STEP_MS = 210;
/** If the welcome dialogue never closes (React hiccup), unstick the intro. */
const INTRO_FALLBACK_MS = 15000;
/** Tiles of flat black void drawn around the main room, and how far the
 * camera bounds expand to reveal it. */
const EXTERIOR_APRON = 4;
const CHARACTER_KEYS = new Set(["scribbs", "npc", "npcRail", "npcSitter", "npcGazer", "npcShopper", "cashier"]);
const CHARACTER_HEIGHT_TILES = 1.25;

/**
 * Renders the current room from world data + baked pixel-art textures, drives
 * Scribbs around a tile grid with the camera following, and handles room-to-room
 * transitions (the Shop ↔ Basement staircase) via a camera fade.
 *
 * The current room is an instance field, not a module import, so the same scene
 * renders any room in the registry. Movement is grid-locked but held keys chain
 * steps continuously for a classic Pokémon-overworld feel; pixel data lives
 * entirely in the art registry.
 */
export class WorldScene extends Phaser.Scene {
  private room!: Room;
  private scribbs!: Phaser.GameObjects.Image;
  private scribbsShadow!: Phaser.GameObjects.Image;
  private tileX = 0;
  private tileY = 0;
  private moving = false;
  private transitioning = false;
  private dialogOpen = false;
  private overlayOpen = false;
  private introPlayed = false;
  /** True while the Heath intro owns the room (suppresses the static cashier). */
  private introPending = false;
  /** One-shot hook a Heath scripted sequence uses to wait for its dialogue to close. */
  private pendingDialogClose: (() => void) | null = null;
  /** True while the React cart drawer is open (the till is in use). */
  private cartOpen = false;
  /** One-shot hook a Heath sequence uses to wait for the cart drawer to close. */
  private pendingCartClose: (() => void) | null = null;
  /** The static cashier prop — hidden while Heath is out walking a scripted sequence. */
  private cashierImg?: Phaser.GameObjects.Image;
  private facing: Facing = "down";
  /** Alternates which foot leads each step: false → right foot, true → left. */
  private stepParity = false;
  private lastInteractionId: string | null = null;

  /**
   * Direction codes currently held (keyboard keys or on-screen D-pad), most
   * recent last. update() polls this so held input chains tile steps.
   */
  private held: string[] = [];

  /** Everything drawn for the current room; destroyed on each room load. */
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  /** Concealing covers (e.g. crates over the secret stairs) for slide-away reveal. */
  private coverObjects: Phaser.GameObjects.Image[] = [];

  constructor() {
    super("world");
  }

  create(data?: { roomId?: string }) {
    // Belt-and-braces: never inherit stale input gates across scene restarts.
    this.moving = false;
    this.transitioning = false;
    this.dialogOpen = false;
    this.overlayOpen = false;
    this.held = [];

    // Scribbs + shadow persist across rooms (so camera-follow stays valid).
    this.scribbsShadow = this.add.image(0, 0, SHADOW_KEY).setDepth(9);
    this.scribbs = this.add.image(0, 0, "scribbs-down-both").setOrigin(0.5, 1).setDepth(10);
    this.cameras.main.roundPixels = true;
    this.cameras.main.startFollow(this.scribbs, true, 0.18, 0.18);
    this.scale.on("resize", this.updateZoom, this);

    const kb = this.input.keyboard!;
    kb.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "W", "A", "S", "D", "Z", "SPACE", "ENTER"]);
    kb.on("keydown", (event: KeyboardEvent) => this.onKey(event));
    kb.on("keyup", (event: KeyboardEvent) => this.releaseHeld(event.code));
    // A missed keyup (tab away mid-hold) must not leave Scribbs auto-walking.
    this.game.events.on(Phaser.Core.Events.BLUR, this.clearHeld, this);

    // On-screen Game Boy controls (mobile) emit "vbutton" with a KeyboardEvent
    // `code` + press/release flag, flowing through the same input path as keys.
    const onVButton = (code: string, down: boolean = true) => {
      if (down) this.onKey({ code } as KeyboardEvent);
      else this.releaseHeld(code);
    };
    this.game.events.on("vbutton", onVButton);

    // React-side dialogue freezes movement while it's open. Clearing held keys
    // on open stops a hold from resuming the instant the dialogue closes.
    const onDialog = (open: boolean) => {
      this.dialogOpen = open;
      if (open) this.held = [];
      else if (this.pendingDialogClose) {
        const done = this.pendingDialogClose;
        this.pendingDialogClose = null;
        done();
      }
    };
    this.game.events.on("dialog", onDialog);

    // The Game Boy utility overlay (System menu) freezes movement while it's
    // open too, but must never touch pendingDialogClose — that's reserved for
    // the real in-world dialogue box (Heath's scripted intro/checkout waits).
    const onOverlay = (open: boolean) => {
      this.overlayOpen = open;
      if (open) this.held = [];
    };
    this.game.events.on("overlay", onOverlay);

    // Cart drawer open/closed — Heath's till sequence waits on this.
    const onCart = (open: boolean) => {
      this.cartOpen = open;
      if (!open && this.pendingCartClose) {
        const done = this.pendingCartClose;
        this.pendingCartClose = null;
        done();
      }
    };
    this.game.events.on("cart", onCart);

    // Reveal a flag-gated secret (e.g. the hidden basement entrance).
    const onReveal = (flag: string) => this.revealSecret(flag);
    this.game.events.on("reveal", onReveal);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("vbutton", onVButton);
      this.game.events.off("dialog", onDialog);
      this.game.events.off("overlay", onOverlay);
      this.game.events.off("cart", onCart);
      this.game.events.off("reveal", onReveal);
      this.game.events.off(Phaser.Core.Events.BLUR, this.clearHeld, this);
      this.scale.off("resize", this.updateZoom, this);
    });

    // Resume from a saved session (returning from inventory/basement) drops us
    // back into the exact room + tile we left; otherwise start fresh.
    const resume = gameSession.pos;
    const roomId = resume?.roomId ?? data?.roomId ?? startRoomId;

    // First entry into the shop: Heath walks over from the counter to greet us.
    // (Resuming skips the intro — it would feel like a fresh boot.)
    const playIntro = roomId === startRoomId && !this.introPlayed && !resume;
    this.introPending = playIntro;

    this.loadRoom(roomId);

    if (resume) {
      this.tileX = resume.tileX;
      this.tileY = resume.tileY;
      this.facing = resume.facing;
      this.setFrame("both");
      this.syncScribbs();
      this.cameras.main.centerOn(this.scribbs.x, this.scribbs.y);
    }

    if (playIntro) {
      this.introPlayed = true;
      this.playHeathIntro();
    }
    this.saveSession();
  }

  /** Poll held directions: a finished step chains into the next while held. */
  update() {
    const code = this.held[this.held.length - 1];
    if (code) this.stepToward(code);
  }

  /** Face + step in a direction if the scene allows movement right now. */
  private stepToward(code: string) {
    if (this.moving || this.transitioning || this.dialogOpen || this.overlayOpen) return;
    const dir = this.dirFor(code);
    if (!dir) return;
    this.facing = dir.facing;
    this.tryMove(dir.dx, dir.dy);
  }

  private clearHeld() {
    this.held = [];
  }

  private releaseHeld(code: string) {
    this.held = this.held.filter((c) => c !== code);
  }

  /** Swap to a room: clear the old art, redraw, reposition Scribbs + camera. */
  private loadRoom(roomId: string, spawnOverride?: { tileX: number; tileY: number }) {
    this.room = getRoom(roomId);
    this.roomObjects.forEach((o) => o.destroy());
    this.roomObjects = [];
    this.coverObjects = [];

    // ── Exterior treatment (main room only): the void beyond the walls is a
    // flat SCR!PTS-black fill, Pokémon-style — the shop reads as a solid
    // building block sitting on the overworld, not a street scene.
    if (roomId === "main") {
      this.cameras.main.setBackgroundColor("#0D0D0D");
      for (let y = -EXTERIOR_APRON; y < this.room.height + EXTERIOR_APRON; y++) {
        for (let x = -EXTERIOR_APRON; x < this.room.width + EXTERIOR_APRON; x++) {
          const inside = x >= 0 && x < this.room.width && y >= 0 && y < this.room.height;
          if (inside) continue;
          this.placeTile(resolveTextureKey("ext-void"), x, y, -0.5);
        }
      }
    } else {
      this.cameras.main.setBackgroundColor("#1C1A22"); // basement: untouched void
    }

    // Floor + walls (walls pick a cap/side/base variant for FireRed depth).
    // The Basement lays down its own darker floor; everywhere else uses "floor".
    const floorKey = roomId === "basement" ? "floor-basement" : "floor";
    // The main room's southern border sits against the exterior void, not an
    // interior wall — render it flat black (no cap/trim line) so the floor
    // reads as running straight up to the outside, FireRed-threshold style.
    const isOuterSouthEdge = (x: number, y: number) =>
      roomId === "main" && y === this.room.height - 1;
    for (let y = 0; y < this.room.height; y++) {
      for (let x = 0; x < this.room.width; x++) {
        const isWall = this.room.tiles[y][x] === "wall";
        const key = isOuterSouthEdge(x, y)
          ? "wall-fill"
          : isWall
            ? wallVariant(this.room, x, y)
            : floorKey;
        this.placeTile(resolveTextureKey(key), x, y, 0);
      }
    }

    // Decorations: flat floor art sits low, wall art mounts on the wall, solid
    // obstacles stand with a contact shadow.
    const flatFloor = new Set(["emblem", "rug", "mat"]);
    const onWall = new Set(["poster", "window"]);
    for (const deco of this.room.decorations ?? []) {
      if (!propActive(deco, gameSession.revealed)) continue;
      // Concealing covers (crates over the secret stairs) sit above floor props
      // and are tracked so the reveal can slide them away.
      if (deco.concealing) {
        const slid = deco.slideTo && gameSession.revealed.has(deco.concealing);
        const at = slid ? { ...deco, ...deco.slideTo } : deco;
        const img = this.placeProp(at, 2.2, false);
        if (!slid) this.coverObjects.push(img);
        continue;
      }
      if (deco.artKey === "emblem") this.placeProp(deco, 0.4, false);
      else if (flatFloor.has(deco.artKey)) this.placeProp(deco, 0.6, false);
      else if (onWall.has(deco.artKey)) this.placeProp(deco, 1, false);
      else this.placeProp(deco, 2, !!deco.solid);
    }

    // Interactions: stairs lie on the floor, posters mount on the wall, the rest
    // are standing fixtures with a shadow. Flag-gated ones (hidden stairs) are
    // skipped until revealed.
    this.cashierImg = undefined;
    for (const it of this.room.interactions) {
      if (!propActive(it, gameSession.revealed)) continue;
      // During the intro, Heath (the cashier) is a walking actor, not a prop —
      // playHeathIntro draws the static cashier once he's back behind the counter.
      if (this.introPending && it.id === "cashier") continue;
      if (it.type === "stairs") this.placeProp(it, 0.5, false);
      else if (it.type === "poster") this.placeProp(it, 1, false);
      else {
        const img = this.placeProp(it, 2, true);
        if (it.id === "cashier") this.cashierImg = img;
      }
    }

    // Optional ambient darkening overlay (Basement) — above props, below Scribbs.
    if (this.room.ambient) {
      const ts = this.room.tileSize;
      const overlay = this.add
        .rectangle(0, 0, this.room.width * ts, this.room.height * ts, this.room.ambient.color, this.room.ambient.alpha)
        .setOrigin(0, 0)
        .setDepth(5);
      this.roomObjects.push(overlay);
    }

    this.addAtmosphere(roomId);

    // Place Scribbs at the spawn (override wins, else the room default).
    const spawn = spawnOverride ?? this.room.spawn;
    this.tileX = spawn.tileX;
    this.tileY = spawn.tileY;
    this.syncScribbs();

    const ts = this.room.tileSize;
    if (roomId === "main") {
      const a = EXTERIOR_APRON * ts;
      this.cameras.main.setBounds(-a, -a, this.room.width * ts + 2 * a, this.room.height * ts + 2 * a);
      // Classic overworld composition: keep the player in the lower third so
      // more of the shop (including the complete floor logo) is visible ahead.
      this.cameras.main.setFollowOffset(0, ts * 2.35);
    } else {
      this.cameras.main.setBounds(0, 0, this.room.width * ts, this.room.height * ts);
      this.cameras.main.setFollowOffset(0, ts * 0.45);
    }
    this.updateZoom();
    this.lastInteractionId = null;
    this.saveSession();
  }

  /** Snap Scribbs + shadow to the current tile. */
  private syncScribbs() {
    const ts = this.room.tileSize;
    this.scribbs
      .setPosition(this.tileX * ts + ts / 2, (this.tileY + 1) * ts)
      .setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES);
    this.scribbsShadow
      .setPosition(this.tileX * ts + ts / 2, (this.tileY + 1) * ts - ts * 0.08)
      .setDisplaySize(ts * 0.72, ts * 0.24);
  }

  /** Place a 16px texture at a tile centre, scaled to the tile size. */
  private placeTile(textureKey: string, tileX: number, tileY: number, depth: number) {
    const ts = this.room.tileSize;
    const img = this.add
      .image(tileX * ts + ts / 2, tileY * ts + ts / 2, textureKey)
      .setDisplaySize(ts, ts)
      .setDepth(depth);
    this.roomObjects.push(img);
  }

  /** Place a prop honouring its footprint; solid props get a contact shadow. */
  private placeProp(p: Interaction | Decoration, depth: number, withShadow: boolean): Phaser.GameObjects.Image {
    const ts = this.room.tileSize;
    const w = p.wTiles ?? 1;
    const h = p.hTiles ?? 1;
    const cx = p.tileX * ts + (w * ts) / 2;
    const cy = p.tileY * ts + (h * ts) / 2;
    if (withShadow) {
      const sh = this.add
        .image(cx, p.tileY * ts + h * ts - ts * 0.16, SHADOW_KEY)
        .setDisplaySize(w * ts * 0.82, ts * 0.32)
        .setDepth(1.5);
      this.roomObjects.push(sh);
    }
    const isCharacter = CHARACTER_KEYS.has(p.artKey);
    const img = this.add.image(
      cx,
      isCharacter ? p.tileY * ts + h * ts : cy,
      resolveTextureKey(p.artKey),
    );
    if (isCharacter) img.setOrigin(0.5, 1).setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES);
    else img.setDisplaySize(w * ts, h * ts);
    img.setFlipX(!!p.flip).setDepth(isCharacter ? Math.max(depth, 3) : depth);
    this.roomObjects.push(img);
    return img;
  }

  /**
   * Layered, pixel-clean light pools and dust motes give the boutique depth
   * without applying a blurry post-processing filter to the artwork.
   */
  private addAtmosphere(roomId: string) {
    const ts = this.room.tileSize;
    const glow = (x: number, y: number, color: number, width: number, alpha: number) => {
      const layers = [1, 0.72, 0.46];
      layers.forEach((scale, i) => {
        const light = this.add
          .ellipse(x * ts, y * ts, width * ts * scale, width * ts * 0.46 * scale, color, alpha * (0.35 + i * 0.28))
          .setDepth(4.6)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.roomObjects.push(light);
      });
    };

    if (roomId === "main") {
      glow(8.5, 15.4, 0xff8ac7, 5.4, 0.075); // entrance / logo
      glow(4, 3.0, 0xffd7a8, 4.6, 0.07); // vinyl lounge
      glow(2, 13.0, 0xffb9dc, 3.6, 0.055); // till
    } else {
      glow(9.5, 3.2, 0xff4fa3, 4.8, 0.09); // secret rack spotlight
      glow(2.0, 5.0, 0x6db1dc, 3.2, 0.045); // cold stair spill
    }

    const dustCount = roomId === "main" ? 14 : 8;
    for (let i = 0; i < dustCount; i++) {
      const dust = this.add
        .rectangle(((i * 47) % (this.room.width * 29)) + ts * 0.5, ((i * 83) % (this.room.height * 27)) + ts * 0.5, 1, 1, i % 3 ? 0xf7f7f5 : 0xff8ac7, roomId === "main" ? 0.24 : 0.16)
        .setDepth(6);
      this.roomObjects.push(dust);
      this.tweens.add({
        targets: dust,
        y: dust.y - ts * (0.35 + (i % 4) * 0.12),
        alpha: { from: dust.alpha, to: 0.04 },
        yoyo: true,
        repeat: -1,
        duration: 1800 + i * 137,
        ease: "Sine.easeInOut",
      });
    }
  }

  /** Reveal a flag-gated secret: slide concealing covers away + draw newly-active props. */
  private revealSecret(flag: string) {
    if (gameSession.revealed.has(flag)) return;
    gameSession.revealed.add(flag);
    invalidateBlocked(this.room.id);

    // Slide + fade the covers, then destroy them.
    const ts = this.room.tileSize;
    const covers = this.coverObjects;
    this.coverObjects = [];
    covers.forEach((c) => {
      const deco = (this.room.decorations ?? []).find(
        (d) => d.concealing === flag && d.slideTo,
      );
      if (deco?.slideTo) {
        // Park the cover at its slid tile — stays visible and solid.
        const w = deco.wTiles ?? 1;
        this.tweens.add({
          targets: c,
          x: deco.slideTo.tileX * ts + (w * ts) / 2,
          duration: 420,
          ease: "Cubic.easeOut",
        });
      } else {
        this.tweens.add({
          targets: c, x: c.x - ts * 1.5, alpha: 0, duration: 420,
          ease: "Cubic.easeIn", onComplete: () => c.destroy(),
        });
      }
    });

    // Draw any interactions this flag has just made active (the hidden stairs).
    for (const it of this.room.interactions) {
      if (it.revealedBy === flag && propActive(it, gameSession.revealed)) {
        if (it.type === "stairs") this.placeProp(it, 0.5, false);
        else this.placeProp(it, 2, true);
      }
    }
  }

  /** Cover the viewport with the room and keep pixels crisp (integer zoom). */
  private updateZoom = () => {
    const ts = this.room.tileSize;
    const worldW = this.room.width * ts;
    const worldH = this.room.height * ts;
    const { width, height } = this.scale.gameSize;
    const zoom = Math.max(2, Math.ceil(Math.max(width / worldW, height / worldH)));
    this.cameras.main.setZoom(zoom);
  };

  /** Glide an actor image tile-to-tile along a hand-authored path.
   * Scripted walks deliberately IGNORE collision — paths are authored against
   * the room layout (see HEATH_INTRO_PATH next to the main-room data). */
  private walkActor(
    img: Phaser.GameObjects.Image,
    path: Array<{ x: number; y: number }>,
    stepMs = STEP_MS,
  ): Promise<void> {
    const ts = this.room.tileSize;
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (i >= path.length || !img.active) {
          if (img.active && img.texture.key.startsWith("cashier-walk")) img.setTexture("cashier");
          resolve();
          return;
        }
        const t = path[i++];
        // Face the direction of travel on horizontal moves; a purely vertical
        // step (e.g. Heath sliding along the counter) keeps its current flip.
        const targetX = t.x * ts + ts / 2;
        if (targetX !== img.x) img.setFlipX(targetX < img.x);
        if (img.texture.key === "cashier" || img.texture.key.startsWith("cashier-walk")) {
          const phase = (["b", "c", "d"] as const)[(i - 1) % 3];
          img.setTexture(`cashier-walk-${phase}`);
        }
        this.tweens.add({
          targets: img,
          x: t.x * ts + ts / 2,
          y: (t.y + 1) * ts,
          duration: stepMs,
          ease: "Linear",
          onComplete: step,
        });
      };
      step();
    });
  }

  /**
   * First-entry intro: the player stays at the entrance while Heath fades in
   * beside the counter, walks over, delivers the welcome (React dialogue), then
   * walks back and takes his place behind the counter as the cashier NPC.
   */
  private async playHeathIntro() {
    this.transitioning = true;
    this.facing = "up";
    this.setFrame("both");

    const ts = this.room.tileSize;
    const start = HEATH_INTRO_PATH[0];
    const heath = this.add
      .image(start.x * ts + ts / 2, (start.y + 1) * ts, resolveTextureKey("cashier"))
      .setOrigin(0.5, 1)
      .setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES)
      .setDepth(10)
      .setAlpha(0);
    this.roomObjects.push(heath);

    // Emerge from behind the counter…
    await new Promise<void>((r) =>
      this.tweens.add({ targets: heath, alpha: 1, duration: 220, onComplete: () => r() }),
    );
    // …and walk up to the player at the door.
    await this.walkActor(heath, HEATH_INTRO_PATH.slice(1));

    // Hand the mic to React (the welcome pages) and wait for the dialogue to
    // close — with a fallback so a lost event can never strand the intro.
    // While the dialogue is genuinely open the player is just reading, so the
    // fallback re-arms instead of yanking Heath away mid-sentence.
    this.game.events.emit("welcome");
    await this.waitForDialogClose();

    // Walk back and slip behind the counter.
    await this.walkActor(heath, [...HEATH_INTRO_PATH].reverse().slice(1));
    await new Promise<void>((r) =>
      this.tweens.add({ targets: heath, alpha: 0, duration: 220, onComplete: () => r() }),
    );
    heath.destroy();

    // Only now draw the static cashier prop (loadRoom skipped it).
    this.introPending = false;
    const cashier = this.room.interactions.find((i) => i.id === "cashier");
    if (cashier) this.cashierImg = this.placeProp(cashier, 2, true);

    this.transitioning = false;
    this.saveSession();
  }

  /**
   * Checkout counter: Heath stays behind the register (column 1, like a real
   * checkout clerk) and slides up/down to line up with the row the player is
   * facing from, asks if they're ready to check out (React shows the Yes/No
   * prompt), then slides back once it's answered. Movement stays locked for
   * the whole exchange, same as the first-entry intro.
   */
  private async playHeathCheckout(fy: number) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.held = [];
    this.cashierImg?.setVisible(false);

    const ts = this.room.tileSize;
    const heath = this.add
      .image(HEATH_HOME.x * ts + ts / 2, (HEATH_HOME.y + 1) * ts, resolveTextureKey("cashier"))
      .setOrigin(0.5, 1)
      .setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES)
      .setFlipX(true) // faces right, toward the customer side
      .setDepth(10);
    this.roomObjects.push(heath);

    const path = heathPathAlongCounter(fy);
    await this.walkActor(heath, path);

    this.game.events.emit("interaction", { id: "checkout", type: "checkout" });
    await this.waitForDialogClose();

    // Grace beat: a "Yes" opens the drawer a moment after the dialogue closes
    // (React state → effect → event). Wait it out, then hold position while the
    // till (cart drawer) is open. A "No" sails straight through.
    await new Promise<void>((r) => this.time.delayedCall(300, () => r()));
    await this.waitForCartClose();

    // Slide back to his usual spot, then vanish behind the counter.
    const inbound = [...path.slice(0, -1)].reverse();
    inbound.push(HEATH_HOME);
    await this.walkActor(heath, inbound);
    heath.destroy();
    this.cashierImg?.setVisible(true);

    this.transitioning = false;
    this.saveSession();
  }

  /** Wait for the React "dialog" event to report closed, with a stuck-open fallback. */
  private waitForDialogClose(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pendingDialogClose = resolve;
      const fallback = () => {
        if (this.pendingDialogClose !== resolve) return; // already resolved normally
        if (this.dialogOpen) {
          this.time.delayedCall(INTRO_FALLBACK_MS, fallback);
          return;
        }
        this.pendingDialogClose = null;
        resolve();
      };
      this.time.delayedCall(INTRO_FALLBACK_MS, fallback);
    });
  }

  /** Wait for the cart drawer to close; resolves immediately if it isn't open. */
  private waitForCartClose(): Promise<void> {
    if (!this.cartOpen) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.pendingCartClose = resolve;
      const fallback = () => {
        if (this.pendingCartClose !== resolve) return; // already resolved
        if (this.cartOpen) {
          this.time.delayedCall(INTRO_FALLBACK_MS, fallback);
          return;
        }
        this.pendingCartClose = null;
        resolve();
      };
      this.time.delayedCall(INTRO_FALLBACK_MS, fallback);
    });
  }

  private onKey(event: KeyboardEvent) {
    if (this.transitioning || this.dialogOpen || this.overlayOpen) return;
    if (event.code === "KeyZ" || event.code === "Space" || event.code === "Enter") {
      this.interactAhead();
      return;
    }
    if (event.repeat) return; // held state is ours to track, not the OS's
    if (this.dirFor(event.code)) {
      // Push (or re-promote) this direction as the most recent held.
      this.held = this.held.filter((c) => c !== event.code);
      this.held.push(event.code);
      // Step immediately — a quick tap can release before the next update()
      // tick, and the tap must still count as one step.
      this.stepToward(event.code);
    }
  }

  /** Map a key code to a grid direction + facing (null for non-movement keys). */
  private dirFor(code: string): { dx: number; dy: number; facing: Facing } | null {
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        return { dx: -1, dy: 0, facing: "left" };
      case "ArrowRight":
      case "KeyD":
        return { dx: 1, dy: 0, facing: "right" };
      case "ArrowUp":
      case "KeyW":
        return { dx: 0, dy: -1, facing: "up" };
      case "ArrowDown":
      case "KeyS":
        return { dx: 0, dy: 1, facing: "down" };
      default:
        return null;
    }
  }

  private tryMove(dx: number, dy: number) {
    if (this.moving || this.transitioning) return;

    const nx = this.tileX + dx;
    const ny = this.tileY + dy;

    if (!canStep(this.room, this.tileX, this.tileY, nx, ny)) {
      this.setFrame("both"); // turn-in-place (wall, fixture, or wrong-side seat)
      return;
    }

    this.moving = true;
    this.setFrame(this.stepParity ? "left" : "right");
    this.stepParity = !this.stepParity;
    // Hold the stride frame for most of the step so it visibly lands, then
    // settle onto both feet just before the tile move completes.
    this.time.delayedCall(PLAYER_STEP_MS * 0.65, () => {
      if (this.moving) this.setFrame("both");
    });

    const ts = this.room.tileSize;
    this.tweens.add({
      targets: this.scribbsShadow,
      x: nx * ts + ts / 2,
      y: (ny + 1) * ts - ts * 0.08,
      duration: PLAYER_STEP_MS,
      ease: "Linear",
    });
    this.tweens.add({
      targets: this.scribbs,
      x: nx * ts + ts / 2,
      y: (ny + 1) * ts,
      duration: PLAYER_STEP_MS,
      ease: "Linear",
      onComplete: () => {
        this.tileX = nx;
        this.tileY = ny;
        this.moving = false;
        this.setFrame("both");
        this.saveSession();
        this.checkInteraction();
      },
    });
  }

  /** Persist Scribbs' room + tile so we can resume here after a web-page detour. */
  private saveSession() {
    gameSession.pos = {
      roomId: this.room.id,
      tileX: this.tileX,
      tileY: this.tileY,
      facing: this.facing,
    };
  }

  /** Pick the texture for the current facing + walk frame. */
  private setFrame(foot: "left" | "both" | "right") {
    this.scribbs.setTexture(`scribbs-${this.facing}-${foot}`);
  }

  /** Step onto an interaction tile: transition (stairs) or fire a stub event. */
  private checkInteraction() {
    const hit = this.room.interactions.find((i) =>
      propActive(i, gameSession.revealed) &&
      footprint(i).some((t) => t.x === this.tileX && t.y === this.tileY),
    );
    if (!hit) {
      this.lastInteractionId = null;
      return;
    }
    if (hit.id === this.lastInteractionId) return;
    this.lastInteractionId = hit.id;

    if (hit.target) {
      this.startTransition(hit);
      return;
    }
    this.fireInteraction(hit);
  }

  /** Z/Space/Enter: interact with the solid fixture Scribbs is facing. */
  private interactAhead() {
    if (this.moving) return;
    let dx = 0;
    let dy = 0;
    if (this.facing === "down") dy = 1;
    else if (this.facing === "up") dy = -1;
    else dx = this.facing === "left" ? -1 : 1;
    const fx = this.tileX + dx;
    const fy = this.tileY + dy;

    // A target standing inside a seat zone (the sofa sitter) can only be talked
    // to from within the same zone — no chatting through the couch back.
    const zone = (this.room.seats ?? []).find((z) => z.tiles.some((t) => t.x === fx && t.y === fy));
    if (zone && !zone.tiles.some((t) => t.x === this.tileX && t.y === this.tileY)) return;

    const at = (x: number, y: number) =>
      this.room.interactions.find((i) =>
        propActive(i, gameSession.revealed) &&
        footprint(i).some((t) => t.x === x && t.y === y),
      );

    let hit = at(fx, fy);
    // Counter etiquette (FireRed-style): facing the checkout with a clerk on
    // the tile directly beyond it talks to the clerk over the counter. (The
    // lookup targets npcs — the checkout's own L-footprint also covers the
    // clerk's hole tile and would shadow him otherwise.)
    if (hit?.type === "checkout") {
      const bx = fx + dx;
      const by = fy + dy;
      const clerk = this.room.interactions.find((i) =>
        i.type === "npc" &&
        propActive(i, gameSession.revealed) &&
        footprint(i).some((t) => t.x === bx && t.y === by),
      );
      if (clerk) hit = clerk;
      else {
        // No clerk beyond this tile — Heath slides along the counter to it.
        this.playHeathCheckout(fy);
        return;
      }
    }
    if (hit && !hit.target) this.fireInteraction(hit);
  }

  /** Move to another room, fading the camera (or instantly). */
  private startTransition(hit: Interaction) {
    const target = hit.target!;
    const go = () => this.loadRoom(target.roomId, target.spawn);

    if (hit.transition === "instant") {
      go();
      return;
    }
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      go();
      cam.fadeIn(FADE_MS);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false;
      });
    });
  }

  /** Hand an interaction to React (prompts, cart, dialogue routing). */
  private fireInteraction(hit: Interaction) {
    this.game.events.emit("interaction", hit);
  }
}
