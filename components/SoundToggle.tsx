"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sound";

/** Sound is off by default (browsers block autoplay); one click turns on score + engine + foley. */
export default function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => sound.onChange(setOn), []);
  return (
    <button
      className={`sound${on ? " on" : ""}`}
      onClick={() => sound.toggle()}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
    >
      <span className="sound__bars" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound__label mono">{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
