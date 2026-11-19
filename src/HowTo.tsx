import { EFFECTS, PEDAL_OPTIONS, type EffectName } from '@/audio/engine'
import type { Side } from '@/stage/Stage'

/** What moving up does on each pedal, and what twisting adds. Left to right is always the amount. */
const CONTROLS: Record<EffectName, { up: string; twist: string }> = {
  Filter: { up: 'Opens the filter', twist: 'Wobble speed' },
  Echo: { up: 'Faster repeats, from 1/2 up to 1/32', twist: 'How long the repeats ring' },
  Reverb: { up: 'Brighter', twist: 'Nothing' },
  Drive: { up: 'Pushes it harder', twist: 'Nothing' },
  Crush: { up: 'Breaks it further', twist: 'Nothing' },
  Pitch: { up: 'Shifts the whole song up, an octave at the top; down goes lower', twist: 'Nothing' },
}


interface HowToProps {
  /** The hand that writes, or null when both hands play pedals. */
  writingHand: Side | null
}

/** The guide: what each hand does, the pedals, the mouse, and the robots. */
export function HowTo({ writingHand }: HowToProps) {
  const writing = writingHand === 'right' ? 'Right' : 'Left'
  const pedal = writingHand === null ? 'Both hands play' : writingHand === 'right' ? 'Left hand plays' : 'Right hand plays'
  return (
    <div className="howto grid gap-5 text-[15px] leading-relaxed">
      {writingHand && (
        <section className="grid gap-2">
          <h3>{writing} hand writes the music</h3>
          <ul>
            <li>Pinch thumb and index and drag: a melody line. Higher is a higher note.</li>
            <li>Pinch and hold still: a drum. The longer you hold, the louder it hits.</li>
            <li>Make a fist to change the sound. Its name shows on your palm, and lines take its colour.</li>
            <li>Point your index finger at a line to change that line to the next sound.</li>
            <li>Pinch thumb and middle finger and drag to erase whatever you pass over.</li>
          </ul>
          <p>The white bar sweeps left to right and plays whatever it touches.</p>
        </section>
      )}

      <section className="grid gap-2">
        <h3>{pedal} the pedals</h3>
        <ul>
          <li>The pedal your hand is holding is named on your palm. Make a fist to move on to the next one.</li>
          <li>Pinch a finger to your thumb and hold it: the pedal plays. The finger picks its variant.</li>
          <li>
            While you hold it, your hand is an XY pad. Left to right is how much you hear. Up and down is the
            pedal's main move. Twisting your hand adds one extra. The ring under your hand shows what it is doing.
          </li>
          <li>Let go of the pinch and the pedal stops, unless Hold pedals on is set in the pedal panel.</li>
          <li>
            To layer pedals, set Pedal hands to Both at the top of the pedal panel. Each hand then holds its own
            pedal, and a fist on either hand moves that hand on.
          </li>
        </ul>
        <table>
          <thead>
            <tr>
              <th>Pedal</th>
              <th>Up</th>
              <th>Index, middle, ring, little</th>
              <th>Twist</th>
            </tr>
          </thead>
          <tbody>
            {EFFECTS.map((name) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{CONTROLS[name].up}</td>
                <td>{PEDAL_OPTIONS[name].join(', ')}</td>
                <td>{CONTROLS[name].twist}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-2">
        <h3>With a mouse</h3>
        <ul>
          <li>Draw: drag for a melody, press and hold for a drum. Alt-click a line to change its sound.</li>
          <li>Erase: drag over anything to remove it.</li>
          <li>Effects: drag to play the pedal chosen under Mouse plays, as an XY pad.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h3>Timing, chords and robots</h3>
        <ul>
          <li>
            Quantize, in the top bar, snaps drums to 1/16, 1/8 or 1/4; faint columns on the stage show where they land.
            Drums free leaves them where you put them.
          </li>
          <li>Chords and arp stacks every note into a chord, and the arpeggiator plays it one note at a time.</li>
          <li>
            With the camera on, wink your left eye to turn the arpeggiator on or off, and your right eye for chords.
            The orbs in the top bar light as each eye closes, so you can see what the camera reads. If the winks come
            out the wrong way round, use Swap winks in Chords and arp.
          </li>
          <li>
            Open your mouth wide to drop a robot where your face is. Tilt your head left or right to choose which
            robot.
          </li>
          <li>
            Robots walk the grid by themselves, each with its own body and way of moving. The Singer, a swaying head,
            swoops up and down gliding a held note. The Swapper, the full walker, darts about changing sounds. The
            Eater, a claw, crawls slowly eating notes. The Dropper, crouched low, sweeps wide arcs leaving notes
            behind. The Bumper, a hopping leg, zigzags and shouts when you hit it.
          </li>
        </ul>
        <p>
          Swat an open hand fast across the screen to wipe the board; Undo brings it back. Space starts and stops. Cmd or
          Ctrl and Z undoes.
        </p>
        <p>Record 30s films the stage with its sound and saves the clip to your downloads.</p>
      </section>
    </div>
  )
}
