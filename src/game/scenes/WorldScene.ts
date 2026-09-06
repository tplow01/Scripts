import * as Phaser from "phaser";
import { getRoom, startRoomId, canStep, invalidateBlocked } from "@/game/world/rooms";
import { anyClaims, claims, type TileClaim } from "@/game/world/occupancy";
import { resolveTextureKey, SHADOW_KEY } from "@/game/art/registry";
import { isMuralTile } from "@/game/art/walls";
import { isRugTile } from "@/game/art/floors";
import { footprint, propActive } from "@/game/world/types";
import type { Interaction, Decoration, Room } from "@/game/world/types";
import { HEATH_INTRO_PATH, HEATH_HOME, heathPathAlongCounter } from "@/game/world/mainRoom";
import { gameSession } from "@/lib/gameSession";
import { NpcActor } from "@/game/actors/NpcActor";
import { WalkCycle, TILE_STEP_MS, TURN_MS, STRIDE_HOLD } from "@/game/art/walkCycle";
import { characterFrame, isCharacterFrame, parseCharacterFrame } from "@/game/art/characters";
import type { CharacterId, Facing } from "@/game/art/characters";

const FADE_MS = 260;
/** Scripted walks (Heath's intro / counter slides) move faster than a patrol. */
const SCRIPTED_STEP_MS = 130;
/** If the welcome dialogue never closes (React hiccup), unstick the intro. */
const INTRO_FALLBACK_MS = 15000;
/** Tiles of flat black void drawn around the main room, and how far the
 * camera bounds expand to reveal it. */
const EXTERIOR_APRON = 4;
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
  /** Scribbs' in-flight destination, claimed for the length of the step. */
  private pending: { x: number; y: number } | null = null;
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
  /** Static (non-patrol) character props — face the player on talk. */
  private staticNpcImgs = new Map<string, { img: Phaser.GameObjects.Image; artKey: string; tileX: number; tileY: number }>();
  /** After a stairs transition, step one tile into the room once the fade finishes. */
  private pendingStairsExit: { x: number; y: number } | null = null;
  private facing: Facing = "down";
  /** The player's walk-cycle state (see art/walkCycle.ts). */
  private cycle = new WalkCycle();
  /**
   * FireRed turn-in-place: set when a new direction is pressed from a
   * standstill; no step happens until this timestamp passes.
   */
  private turnUntil = 0;
  /**
   * True from the moment a step lands until the player comes to rest. While
   * true, a direction change costs no turn delay — so corners stay fluid
   * mid-walk and only a fresh press from standing turns in place.
   */
  private walking = false;
  private lastInteractionId: string | null = null;
  /** Patrolling NPCs in the current room (see actors/NpcActor.ts). */
  private npcs: NpcActor[] = [];
  /** The NPC currently mid-conversation, so its patrol can resume on close. */
  private talkingTo: NpcActor | null = null;

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
    this.scribbs = this.add
      .image(0, 0, characterFrame("scribbs", "down", "both"))
      .setOrigin(0.5, 1)
      .setDepth(10);
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
      else {
        // A patrolling NPC we were talking to picks its route back up.
        this.talkingTo?.resume(this.time.now);
        this.talkingTo = null;
        // Static NPCs return to their authored facing after the chat.
        this.restoreStaticNpcFacing();
        if (this.pendingDialogClose) {
          const done = this.pendingDialogClose;
          this.pendingDialogClose = null;
          done();
        }
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
      this.pending = null;
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
  update(time: number) {
    const code = this.held[this.held.length - 1];
    if (code) this.stepToward(code);
    else if (!this.moving && this.walking) {
      // Input released — come to rest on the neutral frame. (Mid-walk the
      // stride frame is held for the whole tile; see art/walkCycle.ts.)
      this.walking = false;
      this.setFrame(this.cycle.rest());
    }
    this.updateNpcs(time);
  }

  /** Face + step in a direction if the scene allows movement right now. */
  private stepToward(code: string) {
    if (this.moving || this.transitioning || this.dialogOpen || this.overlayOpen) return;
    const dir = this.dirFor(code);
    if (!dir) return;

    // FireRed turn-in-place: a fresh press in a new direction from a standstill
    // turns first and only walks if the press is sustained. Changing direction
    // mid-walk (this.walking) is free, so corners don't feel sticky.
    if (dir.facing !== this.facing && !this.walking) {
      this.facing = dir.facing;
      this.setFrame(this.cycle.rest());
      this.turnUntil = this.time.now + TURN_MS;
      return;
    }
    if (this.time.now < this.turnUntil) return;

    this.facing = dir.facing;
    this.tryMove(dir.dx, dir.dy);
  }

  /** Advance every patrolling NPC, unless a scripted sequence owns the room. */
  private updateNpcs(time: number) {
    if (this.transitioning) return;
    for (const npc of this.npcs) {
      npc.update(time, (x, y) => this.npcCanEnter(npc, x, y));
    }
  }

  /** Scribbs as a tile claim — where he is, and where he is walking to. */
  private get playerClaim(): TileClaim {
    return { tileX: this.tileX, tileY: this.tileY, pending: this.pending };
  }

  /** Everyone who can hold a tile: Scribbs and every patrolling NPC. */
  private get actors(): TileClaim[] {
    return [this.playerClaim, ...this.npcs];
  }

  /**
   * A tile an NPC may step onto: walkable, and unclaimed by anyone else.
   * "Claimed" includes a tile someone is mid-step *onto* — see world/occupancy.
   */
  private npcCanEnter(self: NpcActor, x: number, y: number): boolean {
    if (!canStep(this.room, self.tileX, self.tileY, x, y)) return false;
    return !anyClaims(this.actors, x, y, self);
  }

  /**
   * The patrolling NPC on a tile for interaction purposes — standing on it, or
   * mid-stride onto or off it.
   *
   * Matching only the logical tile made talking feel unreliable: an NPC walking
   * toward you is visually in front of you for most of a step while still
   * reporting the tile behind, so pressing A did nothing for up to ~380ms. The
   * player is aiming at what they can see, so match what they can see.
   */
  private npcAt(x: number, y: number): NpcActor | undefined {
    return this.npcs.find((n) => claims(n, x, y));
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

    // ── Exterior treatment: flat void beyond the walls, a shade off the LCD
    // bezel black so the shop/basement read as blocks on the overworld.
    this.cameras.main.setBackgroundColor("#16161A");
    for (let y = -EXTERIOR_APRON; y < this.room.height + EXTERIOR_APRON; y++) {
      for (let x = -EXTERIOR_APRON; x < this.room.width + EXTERIOR_APRON; x++) {
        const inside = x >= 0 && x < this.room.width && y >= 0 && y < this.room.height;
        if (inside) continue;
        this.placeTile(resolveTextureKey("ext-void"), x, y, -0.5);
      }
    }

    // Floor + walls (walls pick a cap/side/base variant for FireRed depth).
    // The Basement lays down its own darker floor; everywhere else uses the
    // shop floor. Both are hand-drawn tiles (see art/floors.ts).
    const floorKey = roomId === "basement" ? "basement-floor" : "shop-floor";
    // No room has wall FACES: every wall tile renders as the same flat exterior
    // black the apron uses, so the floor reads as running straight up to the
    // outside on all sides — no vertical side faces, no bottom faces. The only
    // walls that are *drawn* are the hand-drawn horizontal murals hung as
    // decorations (see mainRoom.ts).
    for (let y = 0; y < this.room.height; y++) {
      for (let x = 0; x < this.room.width; x++) {
        const isWall = this.room.tiles[y][x] === "wall";
        this.placeTile(resolveTextureKey(isWall ? "ext-void" : floorKey), x, y, 0);
      }
    }

    // Decorations: flat floor art sits low, wall art mounts on the wall, solid
    // obstacles stand with a contact shadow.
    const flatFloor = new Set(["emblem"]);
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
      else if (flatFloor.has(deco.artKey) || isRugTile(deco.artKey)) this.placeProp(deco, 0.6, false);
      else if (onWall.has(deco.artKey) || isMuralTile(deco.artKey)) this.placeProp(deco, 1, false);
      else this.placeProp(deco, 2, !!deco.solid);
    }

    // Interactions: stairs lie on the floor, posters mount on the wall, the rest
    // are standing fixtures with a shadow. Flag-gated ones (hidden stairs) are
    // skipped until revealed.
    this.cashierImg = undefined;
    this.staticNpcImgs.clear();
    this.npcs = [];
    this.talkingTo = null;
    for (const it of this.room.interactions) {
      if (!propActive(it, gameSession.revealed)) continue;
      // During the intro, Heath (the cashier) is a walking actor, not a prop —
      // playHeathIntro draws the static cashier once he's back behind the counter.
      if (this.introPending && it.id === "cashier") continue;
      // Patrolling NPCs own their own sprite and position (see NpcActor) —
      // the world entry is only their starting point, so no static prop.
      if (it.patrol) {
        this.spawnNpc(it);
        continue;
      }
      // A prop with no artKey is collision + interaction only; its art comes
      // from decorations (the checkout counter, the clothing rails).
      if (!it.artKey) continue;
      if (it.type === "stairs") this.placeProp(it, 0.5, false);
      else if (it.type === "poster") this.placeProp(it, 1, false);
      else {
        const img = this.placeProp(it, 2, true);
        if (it.id === "cashier") this.cashierImg = img;
        if (it.type === "npc" && it.artKey) {
          this.staticNpcImgs.set(it.id, {
            img,
            artKey: it.artKey,
            tileX: it.tileX,
            tileY: it.tileY,
          });
        }
      }
    }

    // Optional ambient darkening overlay (Basement): darkens the room's floor
    // and props only. Characters are shaded separately via `characterTint` so
    // Scribbs and NPCs match consistently instead of being double-darkened by
    // the overlay. Characters sit at depth 3+, so 2.5 keeps the overlay below
    // all of them.
    if (this.room.ambient) {
      const ts = this.room.tileSize;
      const overlay = this.add
        .rectangle(0, 0, this.room.width * ts, this.room.height * ts, this.room.ambient.color, this.room.ambient.alpha)
        .setOrigin(0, 0)
        .setDepth(2.5);
      this.roomObjects.push(overlay);
    }

    this.addAtmosphere(roomId);

    // Place Scribbs at the spawn (override wins, else the room default).
    const spawn = spawnOverride ?? this.room.spawn;
    this.tileX = spawn.tileX;
    this.tileY = spawn.tileY;
    this.pending = null;
    this.syncScribbs();

    // Landing on stairs must not immediately bounce us back through the link.
    const landedStairs = this.room.interactions.find(
      (i) =>
        i.type === "stairs" &&
        propActive(i, gameSession.revealed) &&
        footprint(i).some((t) => t.x === spawn.tileX && t.y === spawn.tileY),
    );
    this.lastInteractionId = landedStairs?.id ?? null;
    this.pendingStairsExit = null;
    if (landedStairs) {
      // Step one tile into the room off the stairs (basement opens right; shop down).
      this.facing = roomId === "basement" ? "right" : "down";
      this.setFrame("both");
      this.pendingStairsExit =
        roomId === "basement"
          ? { x: this.tileX + 1, y: this.tileY }
          : { x: this.tileX, y: this.tileY + 1 };
    }

    const ts = this.room.tileSize;
    // Both rooms sit on the black apron, so both pan over it.
    const a = EXTERIOR_APRON * ts;
    this.cameras.main.setBounds(-a, -a, this.room.width * ts + 2 * a, this.room.height * ts + 2 * a);
    // Classic overworld composition: keep the player in the lower third so more
    // of the room is visible ahead. The Basement is short, so it needs less.
    this.cameras.main.setFollowOffset(0, roomId === "main" ? ts * 2.35 : ts * 0.45);
    this.updateZoom();
    // Room lighting: the player carries across rooms, so his tint is set on
    // every load rather than once at creation.
    if (this.room.characterTint !== undefined) this.scribbs.setTint(this.room.characterTint);
    else this.scribbs.clearTint();
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

  /** Bring a patrolling NPC to life from its world-data entry. */
  private spawnNpc(it: Interaction) {
    const frame = it.artKey ? parseCharacterFrame(it.artKey) : null;
    if (!frame || !it.patrol) {
      throw new Error(`NPC "${it.id}" needs a character artKey and a patrol.`);
    }
    const npc = new NpcActor(this, {
      id: it.id,
      character: frame.id,
      patrol: it.patrol,
      tileSize: this.room.tileSize,
      heightTiles: CHARACTER_HEIGHT_TILES,
      depth: 3,
      shadowKey: SHADOW_KEY,
      tint: this.room.characterTint,
    });
    this.npcs.push(npc);
    this.roomObjects.push(...npc.objects);
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
    if (!p.artKey) throw new Error("placeProp called on a prop with no artKey.");
    const isCharacter = isCharacterFrame(p.artKey);
    const img = this.add.image(
      cx,
      isCharacter ? p.tileY * ts + h * ts : cy,
      resolveTextureKey(p.artKey),
    );
    if (isCharacter) img.setOrigin(0.5, 1).setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES);
    else img.setDisplaySize(w * ts, h * ts);
    if (isCharacter && this.room.characterTint !== undefined) img.setTint(this.room.characterTint);
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
      glow(2, 13.0, 0xffb9dc, 3.6, 0.055); // till
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

    // Slide + fade the covers, then destroy them when they vanish.
    const ts = this.room.tileSize;
    const covers = this.coverObjects;
    this.coverObjects = [];
    covers.forEach((c) => {
      const deco = (this.room.decorations ?? []).find(
        (d) => d.concealing === flag && d.slideTo,
      );
      if (deco?.slideTo) {
        const w = deco.wTiles ?? 1;
        const h = deco.hTiles ?? 1;
        this.tweens.add({
          targets: c,
          x: deco.slideTo.tileX * ts + (w * ts) / 2,
          y: deco.slideTo.tileY * ts + (h * ts) / 2,
          alpha: deco.vanishAfterSlide ? 0 : 1,
          duration: 420,
          ease: "Cubic.easeOut",
          onComplete: deco.vanishAfterSlide ? () => c.destroy() : undefined,
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
        // A prop with no artKey is collision + interaction only; its art comes
      // from decorations (the checkout counter).
      if (!it.artKey) continue;
      if (it.type === "stairs") this.placeProp(it, 0.5, false);
        else this.placeProp(it, 2, true);
      }
    }
  }

  /** Cover the viewport with the room; smaller screens zoom out slightly. */
  private updateZoom = () => {
    const ts = this.room.tileSize;
    const worldW = this.room.width * ts;
    const worldH = this.room.height * ts;
    const { width, height } = this.scale.gameSize;
    const base = Math.max(2, Math.ceil(Math.max(width / worldW, height / worldH)));
    this.cameras.main.setZoom(base * this.responsiveZoomOut());
  };

  /**
   * Tablet ~5% more zoomed out, phone ~10%. Desktop stays at the base zoom.
   * Uses the same handheld breakpoint as the Game Boy shell.
   */
  private responsiveZoomOut(): number {
    if (typeof window === "undefined") return 1;
    const handheld = window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
    if (!handheld) return 1;
    return window.innerWidth < 768 ? 0.9 : 0.95;
  }

  /**
   * Glide a character image tile-to-tile along a hand-authored path, animating
   * it on the same FireRed rules as the player: one stride held per tile, feet
   * alternating, neutral on arrival.
   *
   * Scripted walks deliberately IGNORE collision — paths are authored against
   * the room layout (see HEATH_INTRO_PATH next to the main-room data).
   */
  private walkActor(
    img: Phaser.GameObjects.Image,
    path: Array<{ x: number; y: number }>,
    character: CharacterId,
    from: { x: number; y: number },
    restFacing: Facing,
    stepMs = SCRIPTED_STEP_MS,
  ): Promise<void> {
    const ts = this.room.tileSize;
    const cycle = new WalkCycle();
    return new Promise((resolve) => {
      let i = 0;
      let at = from;
      const step = () => {
        if (i >= path.length || !img.active) {
          if (img.active) img.setTexture(characterFrame(character, restFacing, cycle.rest()));
          resolve();
          return;
        }
        const t = path[i++];
        const dx = t.x - at.x;
        const dy = t.y - at.y;
        const travel: Facing | null =
          dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : dy < 0 ? "up" : null;
        if (travel) {
          img.setTexture(characterFrame(character, travel, cycle.step()));
          // Settle onto neutral partway through the tile, same beat as the player.
          this.time.delayedCall(stepMs * STRIDE_HOLD, () => {
            if (img.active) img.setTexture(characterFrame(character, travel, cycle.rest()));
          });
        }
        at = t;
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
   * First-entry intro: Scribbs steps in from the door (up one tile) while Heath
   * fades in beside the counter, walks over, delivers the welcome (React
   * dialogue), then walks back and takes his place behind the counter as the
   * cashier NPC.
   */
  private async playHeathIntro() {
    this.transitioning = true;
    this.facing = "up";
    this.setFrame("both");

    const ts = this.room.tileSize;
    const start = HEATH_INTRO_PATH[0];
    const heath = this.add
      .image(start.x * ts + ts / 2, (start.y + 1) * ts, characterFrame("heath", "down", "both"))
      .setOrigin(0.5, 1)
      .setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES)
      .setDepth(10)
      .setAlpha(0);
    this.roomObjects.push(heath);

    // Emerge from behind the counter…
    await new Promise<void>((r) =>
      this.tweens.add({ targets: heath, alpha: 1, duration: 220, onComplete: () => r() }),
    );
    // Scribbs steps up from the door (o8→n8) while Heath walks over and stops
    // one tile above him (m8), turning down for a face-to-face welcome.
    await Promise.all([
      this.walkActor(heath, HEATH_INTRO_PATH.slice(1), "heath", start, "down"),
      this.walkScribbsIntroStep(),
    ]);

    // Hand the mic to React (the welcome pages) and wait for the dialogue to
    // close — with a fallback so a lost event can never strand the intro.
    // While the dialogue is genuinely open the player is just reading, so the
    // fallback re-arms instead of yanking Heath away mid-sentence.
    this.game.events.emit("welcome");
    await this.waitForDialogClose();

    // Walk back and slip behind the counter, ending facing the customer side.
    const back = [...HEATH_INTRO_PATH].reverse();
    await this.walkActor(heath, back.slice(1), "heath", back[0], "right");
    await new Promise<void>((r) =>
      this.tweens.add({ targets: heath, alpha: 0, duration: 220, onComplete: () => r() }),
    );
    heath.destroy();

    // Only now draw the static cashier prop (loadRoom skipped it).
    this.introPending = false;
    const cashier = this.room.interactions.find((i) => i.id === "cashier");
    if (cashier?.artKey) {
      this.cashierImg = this.placeProp(cashier, 2, true);
      this.staticNpcImgs.set(cashier.id, {
        img: this.cashierImg,
        artKey: cashier.artKey,
        tileX: cashier.tileX,
        tileY: cashier.tileY,
      });
    }

    this.transitioning = false;
    this.saveSession();
  }

  /** Intro only: Scribbs walks one tile up from the door spawn, shadow included. */
  private walkScribbsIntroStep(): Promise<void> {
    return this.walkScribbsTo(this.tileX, this.tileY - 1, "up");
  }

  /** Scripted one-tile Scribbs walk (intro / stairs exit), shadow included. */
  private walkScribbsTo(nx: number, ny: number, facing: Facing): Promise<void> {
    const ts = this.room.tileSize;
    const cycle = new WalkCycle();
    // NPCs patrol through the intro, so a scripted step claims its destination
    // exactly as a player-driven one does.
    this.pending = { x: nx, y: ny };
    this.facing = facing;
    this.scribbs.setTexture(characterFrame("scribbs", facing, cycle.step()));
    this.time.delayedCall(SCRIPTED_STEP_MS * STRIDE_HOLD, () => {
      if (this.scribbs.active) {
        this.scribbs.setTexture(characterFrame("scribbs", facing, cycle.rest()));
      }
    });
    this.tweens.add({
      targets: this.scribbsShadow,
      x: nx * ts + ts / 2,
      y: (ny + 1) * ts - ts * 0.08,
      duration: SCRIPTED_STEP_MS,
      ease: "Linear",
    });
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.scribbs,
        x: nx * ts + ts / 2,
        y: (ny + 1) * ts,
        duration: SCRIPTED_STEP_MS,
        ease: "Linear",
        onComplete: () => {
          this.tileX = nx;
          this.tileY = ny;
          this.pending = null;
          this.facing = facing;
          this.setFrame(cycle.rest());
          this.syncScribbs();
          this.saveSession();
          resolve();
        },
      });
    });
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
      // Faces right, toward the customer side, for the whole exchange.
      .image(HEATH_HOME.x * ts + ts / 2, (HEATH_HOME.y + 1) * ts, characterFrame("heath", "right", "both"))
      .setOrigin(0.5, 1)
      .setDisplaySize(ts, ts * CHARACTER_HEIGHT_TILES)
      .setDepth(10);
    this.roomObjects.push(heath);

    // No locked facing: he walks facing the way he travels (down or up the
    // counter), and `restFacing` turns him back to the customer on arrival.
    // Locking him to "right" made him shuffle sideways along the counter.
    const path = heathPathAlongCounter(fy);
    await this.walkActor(heath, path, "heath", HEATH_HOME, "right");

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
    const outAt = path[path.length - 1] ?? HEATH_HOME;
    await this.walkActor(heath, inbound, "heath", outAt, "right");
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

    // Blocked by a wall, fixture, wrong-side seat — or someone standing there.
    if (
      !canStep(this.room, this.tileX, this.tileY, nx, ny) ||
      anyClaims(this.npcs, nx, ny)
    ) {
      this.walking = false;
      this.setFrame(this.cycle.rest());
      return;
    }

    this.moving = true;
    this.pending = { x: nx, y: ny };
    this.walking = true;
    // One tile, one full step: lead on the stride, settle onto neutral partway
    // through, alternating feet tile to tile.
    this.setFrame(this.cycle.step());
    this.time.delayedCall(TILE_STEP_MS * STRIDE_HOLD, () => {
      if (this.moving) this.setFrame(this.cycle.rest());
    });

    const ts = this.room.tileSize;
    this.tweens.add({
      targets: this.scribbsShadow,
      x: nx * ts + ts / 2,
      y: (ny + 1) * ts - ts * 0.08,
      duration: TILE_STEP_MS,
      ease: "Linear",
    });
    this.tweens.add({
      targets: this.scribbs,
      x: nx * ts + ts / 2,
      y: (ny + 1) * ts,
      duration: TILE_STEP_MS,
      ease: "Linear",
      onComplete: () => {
        this.tileX = nx;
        this.tileY = ny;
        this.pending = null;
        this.moving = false;
        // Deliberately NOT resting here: if a direction is still held, update()
        // chains straight into the next stride and the walk stays continuous.
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
    this.scribbs.setTexture(characterFrame("scribbs", this.facing, foot));
  }

  /** Step onto an interaction tile: transition (stairs) or fire a stub event. */
  private checkInteraction() {
    const hit = this.room.interactions.find((i) =>
      // A patrolling NPC's authored tile is only a spawn point — the player can
      // stand on it while the NPC is elsewhere, and must not trip its dialogue.
      !i.patrol &&
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

    // A patrolling NPC standing right there takes priority — they're on a live
    // tile, not the authored one, so they're matched by actor, not footprint.
    const walker = this.npcAt(fx, fy);
    if (walker) {
      this.talkToNpc(walker);
      return;
    }

    const at = (x: number, y: number) =>
      this.room.interactions.find((i) =>
        !i.patrol &&
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
        i.type === "npc" && !i.patrol &&
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
    if (hit && !hit.target) {
      if (hit.type === "npc") this.faceStaticNpc(hit);
      this.fireInteraction(hit);
    }
  }

  /** Start a conversation with a patrolling NPC: they stop and turn to face us. */
  private talkToNpc(npc: NpcActor) {
    npc.suspend();
    npc.faceTile(this.tileX, this.tileY);
    this.talkingTo = npc;
    const entry = this.room.interactions.find((i) => i.id === npc.id);
    if (entry) this.fireInteraction(entry);
  }

  /** Turn a static character prop to face Scribbs. */
  private faceStaticNpc(hit: Interaction) {
    const entry = this.staticNpcImgs.get(hit.id);
    if (!entry?.img.active) return;
    const frame = parseCharacterFrame(entry.artKey);
    if (!frame) return;
    const dx = this.tileX - entry.tileX;
    const dy = this.tileY - entry.tileY;
    if (dx === 0 && dy === 0) return;
    const facing: Facing =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    entry.img.setTexture(characterFrame(frame.id, facing, "both"));
  }

  /** Reset static NPCs to the facing encoded in their artKey. */
  private restoreStaticNpcFacing() {
    for (const entry of this.staticNpcImgs.values()) {
      if (entry.img.active) entry.img.setTexture(resolveTextureKey(entry.artKey));
    }
  }

  /** Move to another room, fading the camera (or instantly). */
  private startTransition(hit: Interaction) {
    const target = hit.target!;
    const go = () => this.loadRoom(target.roomId, target.spawn);

    if (hit.transition === "instant") {
      go();
      void this.finishStairsExit().then(() => {
        this.transitioning = false;
      });
      return;
    }
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      go();
      cam.fadeIn(FADE_MS);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        void this.finishStairsExit().then(() => {
          this.transitioning = false;
        });
      });
    });
  }

  /** After landing on stairs, walk one tile into the room so we aren't stuck on the link. */
  private async finishStairsExit() {
    const step = this.pendingStairsExit;
    if (!step) return;
    this.pendingStairsExit = null;
    await this.walkScribbsTo(step.x, step.y, this.facing);
  }

  /** Hand an interaction to React (prompts, cart, dialogue routing). */
  private fireInteraction(hit: Interaction) {
    this.game.events.emit("interaction", hit);
  }
}
