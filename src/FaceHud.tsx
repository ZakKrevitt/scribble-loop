import { useEffect, useState } from "react";
import { WINK_SHUT as SHUT, type FaceState } from "@/tracking/face";

/**
 * The face readout: an orb per eye that lights as it shuts, and a bar for the mouth. It copies the
 * face state a few times a second on its own, so the rest of the app does not redraw with it.
 */
export function FaceHud({ face }: { face: FaceState }) {
  const [view, setView] = useState<FaceState>({ ...face });
  useEffect(() => {
    const id = window.setInterval(() => {
      setView((prev) => {
        const next = {
          found: face.found,
          left: face.left > SHUT ? 1 : 0,
          right: face.right > SHUT ? 1 : 0,
          mouth: Math.round(face.mouth * 10) / 10,
        };
        const same =
          prev.found === next.found &&
          prev.left === next.left &&
          prev.right === next.right &&
          prev.mouth === next.mouth;
        return same ? prev : next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [face]);

  return (
    <span
      className="facehud"
      title="What the camera reads off your face"
      aria-label={view.found ? "Face found" : "No face found"}
    >
      <span
        className="orb"
        data-on={view.left === 1 || undefined}
        aria-hidden="true"
      />
      <span
        className="orb"
        data-on={view.right === 1 || undefined}
        aria-hidden="true"
      />
      <span className="mouth" aria-hidden="true">
        <span style={{ width: `${Math.round(view.mouth * 100)}%` }} />
      </span>
      {!view.found && <span className="text-[15px] font-medium">No face</span>}
    </span>
  );
}
