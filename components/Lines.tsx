/**
 * Masked headline lines: .line (mask) > .li (scroll-driven) > .lj (intro).
 * Wrap words in *asterisks* to set them in the signal orange, e.g. "What *Matters.*"
 */
function accent(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <em className="accent" key={i}>
        {part.slice(1, -1)}
      </em>
    ) : (
      part
    ),
  );
}

export default function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l) => (
        <span className="line" key={l}>
          <span className="li">
            <span className="lj">{accent(l)}</span>
          </span>
        </span>
      ))}
    </>
  );
}
