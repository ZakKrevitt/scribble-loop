import { EFFECTS, PEDAL_OPTIONS, type EffectName } from '@/audio/engine'
import { LEADS } from '@/model/score'
import type { Side } from '@/stage/Stage'

/** What moving up does on each pedal, and what twisting adds. Left to right is always the amount. */
const CONTROLS: Record<EffectName, { up: string; twist: string }> = {
  Filter: { up: 'Opens the filter', twist: 'Wobble speed' },
  Echo: { up: 'Faster repeats, from 1/2 up to 1/32', twist: 'How long the repeats ring' },
  Reverb: { up: 'Brighter', twist: 'Nothing' },
  Drive: { up: 'Pushes it harder', twist: 'Nothing' },
  Crush: { up: 'Breaks it further', twist: 'Nothing' },
}

const FINGERS = ['Index', 'Middle', 'Ring', 'Little'] as const

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
            <li>Pinch a finger to your thumb and drag: a melody line. Higher is a higher note.</li>
            <li>
              Each finger draws its own sound: {FINGERS.map((f, i) => `${f.toLowerCase()} ${LEADS[i]}`).join(', ')}.
              The colour of a line shows its sound, and each fingertip is labelled on screen.
            </li>
            <li>Pinch and hold still: a drum. The longer you hold, the louder it hits.</li>
            <li>Point your index finger at a line to change it to the next sound.</li>
            <li>Make a fist over anything to erase it.</li>
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
          <li>Let go of the pinch and the pedal stops, unless Hold pedals on is set in Pedals.</li>
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
          <li>Effects: drag to play the pedal chosen under Mouse plays in Pedals, as an XY pad.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h3>Timing, chords and robots</h3>
        <ul>
          <li>Quantize, in the bar, snaps drums to 1/16, 1/8 or 1/4, or turns snapping off.</li>
          <li>Chords and arp stacks every note into a chord, and the arpeggiator plays it one note at a time.</li>
          <li>
            With the camera on, wink your left eye to turn the arpeggiator on or off, and your right eye for chords.
            Open your mouth to spread them: wider chords, and arpeggios over more octaves. If the winks come out the
            wrong way round, use Swap winks in Chords and arp.
          </li>
          <li>
            Robots walk the grid by themselves. The Singer glides a held note, the Swapper changes sounds, the Eater
            eats notes, the Dropper leaves some behind, and the Bumper shouts when you hit it.
          </li>
        </ul>
        <p>Space starts and stops. Cmd or Ctrl and Z undoes.</p>
      </section>
    </div>
  )
}
