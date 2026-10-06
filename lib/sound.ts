"use client";

import { BEATS, PALLETS, speedAt, truckPose } from "./journey";
import { progress } from "./progress";

/**
 * Scroll-driven sound design, fully procedural (Web Audio, no files, no music):
 *  - engine: cranks and fires up as the loaded truck pulls off the dock, revs while you
 *    scroll (scroll = driving), settles to idle when you stop, switches off at the destination
 *  - foley: pallets rolling in/out, door clunks, air-brake hiss, truck + forklift reverse beepers,
 *    forklift hydraulics, shutter rattle, delivery chime
 */

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Engine is off while loading; it starts as the truck creeps off the dock. */
const IGNITION = BEATS.creep[0] - 0.004;
/** How long a beeper keeps going after you stop scrolling through its moment (ms). */
const BEEP_HOLD = 1400;

class SoundEngine {
  ctx: AudioContext | null = null;
  enabled = false;
  private listeners = new Set<(on: boolean) => void>();

  private master!: GainNode;
  private sfxBus!: GainNode;
  private verbBus!: GainNode;
  private noise!: AudioBuffer;

  // engine
  private eOsc1!: OscillatorNode;
  private eOsc2!: OscillatorNode;
  private eSub!: OscillatorNode;
  private eLfo!: OscillatorNode;
  private eFilter!: BiquadFilterNode;
  private eGain!: GainNode;
  private road!: GainNode;
  private engineReadyAt = 0; // engine drone fades in after the start-up sound

  // beepers + rattle
  private beep!: GainNode;
  private forkBeep!: GainNode;
  private rattle!: GainNode;
  private truckBeepUntil = 0;
  private forkBeepUntil = 0;

  private prevP = -1;
  private lastMove = 0;
  private autoMuted = false;
  private idleTimer: ReturnType<typeof setInterval> | null = null;

  onChange(l: (on: boolean) => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  /** Must be called from a user gesture (click). */
  async toggle() {
    this.autoMuted = false;
    if (this.enabled) this.disable();
    else await this.enable();
  }

  async enable() {
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    await ctx.resume();
    this.enabled = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.4);
    this.listeners.forEach((l) => l(true));
  }

  disable() {
    if (!this.ctx) return;
    this.enabled = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    const ctx = this.ctx;
    setTimeout(() => {
      if (!this.enabled) ctx.suspend();
    }, 1200);
    this.listeners.forEach((l) => l(false));
  }

  /* ------------------------------------------------------------------ */

  private init() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    // small room reverb, used only for the delivery chime
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(2.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    verb.connect(wet).connect(this.master);
    this.verbBus = ctx.createGain();
    this.verbBus.connect(this.master);
    this.verbBus.connect(verb);

    this.noise = this.makeNoise(4);
    this.initContinuous();

    // engine starts in its correct state if sound is switched on mid-journey
    this.engineReadyAt = 0;
    progress.subscribe((p) => this.update(p));
    // re-evaluates idle / beeper hold even when scrolling has stopped
    this.idleTimer = setInterval(() => this.update(progress.get(), true), 150);

    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.enabled) this.ctx.resume();
    });
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private makeNoise(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // brown-ish noise: warmer, more "road" than white noise
      last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      d[i] = last * 3.2;
    }
    return buf;
  }

  private noiseSource(loop = true) {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    return src;
  }

  /* ---------------- continuous layers ---------------- */

  private initContinuous() {
    const ctx = this.ctx!;
    // warm diesel: triangle fundamental + sine 2nd harmonic + sine sub, gently low-passed
    this.eFilter = ctx.createBiquadFilter();
    this.eFilter.type = "lowpass";
    this.eFilter.frequency.value = 180;
    this.eFilter.Q.value = 0.7;
    this.eGain = ctx.createGain();
    this.eGain.gain.value = 0;

    this.eOsc1 = ctx.createOscillator();
    this.eOsc1.type = "triangle";
    this.eOsc1.frequency.value = 32;
    this.eOsc2 = ctx.createOscillator();
    this.eOsc2.type = "sine";
    this.eOsc2.frequency.value = 64;
    this.eSub = ctx.createOscillator();
    this.eSub.type = "sine";
    this.eSub.frequency.value = 16;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    const gs = ctx.createGain();
    gs.gain.value = 0.55;
    this.eOsc1.connect(this.eFilter);
    this.eOsc2.connect(g2).connect(this.eFilter);
    this.eSub.connect(gs).connect(this.eFilter);

    // soft diesel pulse at firing rate
    this.eLfo = ctx.createOscillator();
    this.eLfo.frequency.value = 9;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.18;
    const chug = ctx.createGain();
    chug.gain.value = 0.82;
    this.eLfo.connect(lfoDepth).connect(chug.gain);
    this.eFilter.connect(chug).connect(this.eGain).connect(this.sfxBus);

    const rumble = this.noiseSource();
    const rf = ctx.createBiquadFilter();
    rf.type = "lowpass";
    rf.frequency.value = 110;
    const rg = ctx.createGain();
    rg.gain.value = 0.22;
    rumble.connect(rf).connect(rg).connect(this.eGain);

    // tyre / wind noise
    const roadSrc = this.noiseSource();
    const bpRoad = ctx.createBiquadFilter();
    bpRoad.type = "bandpass";
    bpRoad.frequency.value = 600;
    bpRoad.Q.value = 0.5;
    this.road = ctx.createGain();
    this.road.gain.value = 0;
    roadSrc.connect(bpRoad).connect(this.road).connect(this.sfxBus);

    // reverse beepers — classic square-wave alarms, clearly audible over the engine
    const [truckBeep, tNodes] = this.beeper(1000, 1.5);
    const [forkBeep, fNodes] = this.beeper(1450, 2.4);
    this.beep = truckBeep;
    this.forkBeep = forkBeep;

    // roller-shutter rattle
    const rattleSrc = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400;
    bp.Q.value = 1.5;
    const trem = ctx.createGain();
    const tremLfo = ctx.createOscillator();
    tremLfo.frequency.value = 22;
    tremLfo.connect(trem.gain);
    this.rattle = ctx.createGain();
    this.rattle.gain.value = 0;
    rattleSrc.connect(bp).connect(trem).connect(this.rattle).connect(this.sfxBus);

    [this.eOsc1, this.eOsc2, this.eSub, this.eLfo, tremLfo].forEach((o) => o.start());
    [...tNodes, ...fNodes].forEach((n) => n.start());
    rumble.start();
    roadSrc.start();
    rattleSrc.start();
  }

  /** Gated square "beep … beep"; the returned gain node is its output level. */
  private beeper(freq: number, rate: number): [GainNode, (OscillatorNode | ConstantSourceNode)[]] {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200; // keeps it piercing but not harsh
    const gate = ctx.createGain();
    gate.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = rate;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    const bias = ctx.createConstantSource();
    bias.offset.value = 0.5;
    lfo.connect(depth).connect(gate.gain);
    bias.connect(gate.gain);
    const out = ctx.createGain();
    out.gain.value = 0;
    osc.connect(tone).connect(gate).connect(out).connect(this.sfxBus);
    return [out, [osc, lfo, bias]];
  }

  /* ---------------- one-shots ---------------- */

  /** Starter motor cranking, then the diesel catches with a rev and settles to idle. */
  private engineStart(t: number) {
    const ctx = this.ctx!;
    // starter: whirring, slightly uneven crank
    const crank = ctx.createOscillator();
    crank.type = "sawtooth";
    crank.frequency.setValueAtTime(130, t);
    crank.frequency.linearRampToValueAtTime(175, t + 0.75);
    const crankBp = ctx.createBiquadFilter();
    crankBp.type = "bandpass";
    crankBp.frequency.value = 420;
    crankBp.Q.value = 1.4;
    const crankAm = ctx.createGain();
    const crankLfo = ctx.createOscillator();
    crankLfo.frequency.value = 7.5; // compression strokes
    const crankDepth = ctx.createGain();
    crankDepth.gain.value = 0.45;
    crankLfo.connect(crankDepth).connect(crankAm.gain);
    const crankG = ctx.createGain();
    crankG.gain.setValueAtTime(0, t);
    crankG.gain.linearRampToValueAtTime(0.2, t + 0.05);
    crankG.gain.setValueAtTime(0.2, t + 0.72);
    crankG.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    crank.connect(crankBp).connect(crankAm).connect(crankG).connect(this.sfxBus);
    crank.start(t);
    crankLfo.start(t);
    crank.stop(t + 0.95);
    crankLfo.stop(t + 0.95);

    // catch: low rev up and back down to idle
    const c = t + 0.75;
    const fire = ctx.createOscillator();
    fire.type = "triangle";
    fire.frequency.setValueAtTime(26, c);
    fire.frequency.exponentialRampToValueAtTime(72, c + 0.35);
    fire.frequency.exponentialRampToValueAtTime(33, c + 1.3);
    const fire2 = ctx.createOscillator();
    fire2.type = "sine";
    fire2.frequency.setValueAtTime(52, c);
    fire2.frequency.exponentialRampToValueAtTime(144, c + 0.35);
    fire2.frequency.exponentialRampToValueAtTime(66, c + 1.3);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(220, c);
    lp.frequency.linearRampToValueAtTime(700, c + 0.35);
    lp.frequency.linearRampToValueAtTime(220, c + 1.3);
    const fireG = ctx.createGain();
    fireG.gain.setValueAtTime(0, c);
    fireG.gain.linearRampToValueAtTime(0.55, c + 0.08);
    fireG.gain.setValueAtTime(0.55, c + 0.45);
    fireG.gain.exponentialRampToValueAtTime(0.0001, c + 1.5);
    const f2g = ctx.createGain();
    f2g.gain.value = 0.4;
    fire.connect(lp);
    fire2.connect(f2g).connect(lp);
    lp.connect(fireG).connect(this.sfxBus);
    fire.start(c);
    fire2.start(c);
    fire.stop(c + 1.6);
    fire2.stop(c + 1.6);

    // exhaust puff as it catches
    const puff = this.noiseSource(false);
    const pl = ctx.createBiquadFilter();
    pl.type = "lowpass";
    pl.frequency.value = 380;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0, c);
    pg.gain.linearRampToValueAtTime(0.6, c + 0.03);
    pg.gain.exponentialRampToValueAtTime(0.0001, c + 0.7);
    puff.connect(pl).connect(pg).connect(this.sfxBus);
    puff.start(c);
    puff.stop(c + 0.75);
  }

  private clunk(t: number, vol = 0.5) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.35);
    const n = this.noiseSource(false);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(f).connect(ng).connect(this.sfxBus);
    n.start(t);
    n.stop(t + 0.1);
  }

  /** Pallet jack rolling a load across the dock plate. */
  private roll(t: number, dur = 0.9) {
    const ctx = this.ctx!;
    const n = this.noiseSource(false);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 420;
    f.Q.value = 1.1;
    const trem = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 14; // rollers clicking past
    const depth = ctx.createGain();
    depth.gain.value = 0.35;
    lfo.connect(depth).connect(trem.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.12);
    g.gain.setValueAtTime(0.28, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(trem).connect(g).connect(this.sfxBus);
    n.start(t);
    lfo.start(t);
    n.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  /** Soft wooden thud as a pallet settles. */
  private thud(t: number, vol = 0.32) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.25);
  }

  /** Forklift mast hydraulics. */
  private hydraulic(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(240, t);
    o.frequency.linearRampToValueAtTime(330, t + 0.7);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    o.connect(f).connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.9);
  }

  private hiss(t: number) {
    const ctx = this.ctx!;
    const n = this.noiseSource(false);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    n.connect(f).connect(g).connect(this.sfxBus);
    n.start(t);
    n.stop(t + 1.2);
  }

  private chime(t: number) {
    const ctx = this.ctx!;
    [72, 76, 79, 84].forEach((n, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = NOTE(n);
      const g = ctx.createGain();
      const s = t + i * 0.09;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.09, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 2.4);
      o.connect(g).connect(this.verbBus);
      o.start(s);
      o.stop(s + 2.5);
    });
  }

  /* ---------------- per-progress update ---------------- */

  /** 1 while the user is actively scrolling, decays to 0 shortly after. */
  private activity() {
    return Math.max(0, 1 - (performance.now() - this.lastMove) / 500);
  }

  private update(p: number, fromTimer = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const ms = performance.now();
    if (!fromTimer && p !== this.prevP) this.lastMove = ms;

    const pose = truckPose(p);
    const moving = this.activity();
    const sp = speedAt(p) * moving;
    const rev = pose.reversing * moving;

    // ignition: crossing it going forward plays the start-up; the drone fades in once it has caught
    const engineOn = p > IGNITION && p < BEATS.destShutter[1];
    if (!fromTimer && this.enabled && this.prevP >= 0 && this.prevP <= IGNITION && p > IGNITION) {
      this.engineStart(now);
      this.engineReadyAt = ms + 1300;
    }
    const engineLevel = engineOn && ms >= this.engineReadyAt ? 0.06 + 0.09 * sp + 0.03 * rev : 0;

    const f0 = 30 + 40 * sp + 10 * rev; // idle 30 Hz → ~70 Hz at cruise
    this.eOsc1.frequency.setTargetAtTime(f0, now, 0.5);
    this.eOsc2.frequency.setTargetAtTime(f0 * 2.01, now, 0.5);
    this.eSub.frequency.setTargetAtTime(f0 / 2, now, 0.5);
    this.eLfo.frequency.setTargetAtTime(f0 / 3.5, now, 0.5);
    this.eFilter.frequency.setTargetAtTime(170 + 360 * sp + 120 * rev, now, 0.5);
    this.eGain.gain.setTargetAtTime(engineLevel, now, engineOn ? 0.45 : 1.2);
    this.road.gain.setTargetAtTime(0.06 * sp, now, 0.5);

    // beepers: triggered while you scroll through the move, then held briefly so they're heard
    if (pose.reversing && moving > 0.5) this.truckBeepUntil = ms + BEEP_HOLD;
    const forkMoving =
      (p > BEATS.forkApproach[0] && p < BEATS.forkApproach[1]) || (p > BEATS.forkReverse[0] && p < BEATS.forkReverse[1]);
    if (forkMoving && moving > 0.5) this.forkBeepUntil = ms + BEEP_HOLD;
    this.beep.gain.setTargetAtTime(ms < this.truckBeepUntil ? 0.13 : 0, now, 0.04);
    this.forkBeep.gain.setTargetAtTime(ms < this.forkBeepUntil ? 0.12 : 0, now, 0.04);

    const shutting =
      (p > BEATS.destShutter[0] && p < BEATS.destShutter[1]) ||
      (p > BEATS.pickupShutter[0] && p < BEATS.pickupShutter[1]);
    this.rattle.gain.setTargetAtTime(shutting ? 0.08 * Math.max(moving, 0.3) : 0, now, 0.08);

    // one-shots when crossing story beats going forward
    if (!fromTimer && this.enabled && this.prevP >= 0 && p > this.prevP) {
      const crossed = (b: number) => this.prevP < b && p >= b;
      if (crossed(BEATS.doorsClose[1] - 0.006)) this.clunk(now, 0.85);
      if (crossed(BEATS.doorsClose[1])) this.clunk(now + 0.12, 1.0);
      if (crossed(BEATS.arrive - 0.002)) this.hiss(now);
      if (crossed(BEATS.doorsOpen[0] + 0.002)) this.clunk(now, 0.35);
      if (crossed(BEATS.reverse[1])) this.clunk(now, 0.6); // bumpers kiss the dock
      if (crossed(BEATS.forkLift[0])) this.hydraulic(now);
      if (crossed(BEATS.forkReverse[1] - 0.004)) this.chime(now);
      // cargo: each pallet rolls in at pickup and out at the destination, then settles
      PALLETS.forEach((pl) => {
        if (crossed(pl.load[0])) this.roll(now);
        if (crossed(pl.load[1] - 0.002)) this.thud(now);
        if (crossed(pl.unload[0])) this.roll(now, 1.1);
        if (!pl.toForklift && crossed(pl.unload[1] - 0.002)) this.thud(now, 0.26);
      });
    }

    // section 07 (contact): sound switches itself off; it comes back if you scroll back into the journey
    if (!fromTimer) {
      if (this.enabled && this.prevP < 0.965 && p >= 0.965) {
        this.autoMuted = true;
        this.disable();
      } else if (this.autoMuted && !this.enabled && p < 0.955) {
        this.autoMuted = false;
        this.enable();
      }
      this.prevP = p;
    }
  }

  dispose() {
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.ctx?.close();
  }
}

export const sound = new SoundEngine();
