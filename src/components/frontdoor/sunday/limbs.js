import { lerp } from './timeline'

// Arms and hands for the people of the front door's Sunday, drawn to the
// family on the cover (FamilyFigure), the standard everyone else is held to:
// an arm is an upper arm and a forearm, each a little fuller in its middle
// than at its ends, meeting at a rounded elbow with a fold in it, the sleeve
// ending in a cuff; and a hand is shaped as a hand - fingers held together, a
// thumb where a thumb would be, a line or two to say so - never a ball on a
// stick. A figure works out where its shoulder, elbow and wrist are for what
// it is doing, and this draws the arm through them, so the same arm can hang
// at the side, hold a microphone or be raised in worship.
//
// In the units of StoryFigure and SeatedBack, whose heads are about 18 across.

const round = (v) => Math.round(v * 100) / 100
const at = (x, y) => `${round(x)} ${round(y)}`

/** The unit vector from `b` to `a`. */
export const unit = ([ax, ay], [bx, by]) => {
  const length = Math.hypot(ax - bx, ay - by) || 1
  return [(ax - bx) / length, (ay - by) / length]
}

// Half the arm's width at the shoulder, round the fullest part of the upper
// arm, at the elbow, round the forearm, and at the wrist.
const HALF = { shoulder: 3.4, upper: 3.6, elbow: 3, fore: 3.05, wrist: 2.7 }

/**
 * One part of an arm, from `a` to `b`: round at both ends and bowed out to
 * half-width `mid` at its middle, so it is never a straight tube. An arm's
 * two parts are filled in one colour and overlap at the elbow, which makes
 * the elbow round on the outside of the bend and folded on the inside.
 */
const part = ([ax, ay], [bx, by], ra, rb, mid) => {
  const length = Math.hypot(bx - ax, by - ay) || 0.01
  const nx = -(by - ay) / length
  const ny = (bx - ax) / length
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  // A quadratic curve passes halfway to its control point at its middle.
  const c = 2 * mid - (ra + rb) / 2
  return (
    `M${at(ax + nx * ra, ay + ny * ra)}Q${at(mx + nx * c, my + ny * c)} ${at(bx + nx * rb, by + ny * rb)}` +
    `A${round(rb)} ${round(rb)} 0 0 0 ${at(bx - nx * rb, by - ny * rb)}` +
    `Q${at(mx - nx * c, my - ny * c)} ${at(ax - nx * ra, ay - ny * ra)}` +
    `A${round(ra)} ${round(ra)} 0 0 0 ${at(ax + nx * ra, ay + ny * ra)}Z`
  )
}

/**
 * An arm through its shoulder, elbow and wrist. `sleeve` is its shape, to be
 * filled in the sleeve's colour; `lines` are the fold at the elbow, from the
 * outside of the bend across most of the arm as the family's is, and the
 * cuff, to be drawn over it faintly. `side` (-1 left of the picture, 1 right)
 * says which way is out, for an arm too straight to have an outside.
 */
export function arm(shoulder, elbow, wrist, { side = 1, k = 1 } = {}) {
  const sleeve =
    part(shoulder, elbow, HALF.shoulder * k, HALF.elbow * k, HALF.upper * k) +
    part(elbow, wrist, HALF.elbow * k, HALF.wrist * k, HALF.fore * k)
  const down = unit(elbow, shoulder)
  const on = unit(wrist, elbow)
  const e = HALF.elbow * k
  let [ox, oy] = [down[0] - on[0], down[1] - on[1]]
  const bent = Math.hypot(ox, oy)
  if (bent > 0.2) {
    ox /= bent
    oy /= bent
  } else {
    ;[ox, oy] = -on[1] * side > 0 ? [-on[1], on[0]] : [on[1], -on[0]]
  }
  const along = unit([down[0] + on[0], down[1] + on[1]], [0, 0])
  const [ex, ey] = elbow
  const fold =
    `M${at(ex + ox * e * 0.9, ey + oy * e * 0.9)}` +
    `Q${at(ex + ox * e * 0.2 + along[0] * e * 0.55, ey + oy * e * 0.2 + along[1] * e * 0.55)} ` +
    `${at(ex - ox * e * 0.35, ey - oy * e * 0.35)}`
  // The cuff, across the sleeve just short of the wrist, bowed toward the hand.
  const w = HALF.wrist * k * 0.95
  const cx = wrist[0] - on[0] * 1.6 * k
  const cy = wrist[1] - on[1] * 1.6 * k
  const cuff =
    `M${at(cx - on[1] * w, cy + on[0] * w)}` +
    `Q${at(cx + on[0] * 0.8 * k, cy + on[1] * 0.8 * k)} ${at(cx + on[1] * w, cy - on[0] * w)}`
  return { sleeve, lines: fold + cuff }
}

// Hands, each drawn once pointing up from the wrist at (0, 0) with its thumb
// to the left, and turned by `hand` to point on from the forearm with the
// thumb toward the body. `reach` is how far the middle of the hand is from
// the wrist, for a figure that says where a hand is rather than its wrist.
export const HANDS = {
  // Open, the palm turned out: raised in worship, or held out to the people.
  open: {
    d: 'M-2.7 0.6C-3 -1.2 -3.2 -2.6 -3.4 -3.6C-4.4 -4.6 -5.3 -5.8 -5.9 -7C-6.4 -8 -5.8 -8.7 -5 -8.2C-4.4 -7.8 -3.9 -7 -3.5 -6.4C-3.6 -8.2 -3.4 -10.2 -2.9 -11.4C-2.4 -12.5 -1 -12.8 -0.1 -12.4C1 -12.8 2.2 -12.3 2.7 -11.2C3.2 -10 3.3 -8.3 3.2 -6.6C3.1 -4.4 2.9 -1.8 2.7 0.6Z',
    lines: 'M-1.5 -12.3Q-1.4 -10.9 -1.5 -9.7M0.5 -12.5Q0.6 -11.1 0.5 -9.9M2 -11.9Q2.1 -10.7 2 -9.7M-3.5 -6.4Q-3 -5.1 -2.1 -4.5',
    reach: 5.6,
  },
  // At rest by the side, the fingers together and a little curled: the
  // family's own hand, the same shape at this size.
  rest: {
    d: 'M2.9 0.2C3.4 -3.2 2.8 -6.8 1 -7.7C-0.8 -8.3 -2.4 -6.8 -2.6 -4.4C-2.8 -2.6 -2.8 -1.1 -2.9 -0.2Z',
    lines: 'M-2.3 -2.6Q-3.1 -4.1 -2.5 -5.6',
    reach: 3.8,
  },
  // Closed round something: a microphone, a phone, the drumsticks, the neck
  // of a guitar. The knuckles across the top, the thumb over the side.
  grip: {
    d: 'M-2.9 0.3C-3.2 -1.2 -3.4 -2.4 -3.6 -3.2C-4.6 -3.4 -4.9 -5 -3.8 -5.7C-3.6 -7.3 -2.4 -8 0 -8C2.5 -8 3.5 -7.3 3.5 -5.8C3.6 -4.2 3.3 -1.8 2.9 0.3Z',
    lines: 'M-2.4 -6.3Q0.2 -5.5 2.9 -6.2M-2.6 -4.3Q0 -3.7 2.8 -4.2M-3.8 -5.7Q-3.1 -4.7 -3.5 -3.4',
    reach: 4,
  },
}

/**
 * How a hand is placed: on the wrist, pointing on from the elbow, with its
 * thumb toward `centre`, the x of the body's middle. `short` draws it shorter
 * when it points toward or away from the reader.
 */
export function hand(elbow, wrist, centre, { k = 1, short = 1 } = {}) {
  const turn = Math.atan2(wrist[0] - elbow[0], elbow[1] - wrist[1])
  // Unturned the thumb points left; turned, its x is this.
  const thumb = -Math.cos(turn)
  const flip = thumb * (centre - wrist[0]) < 0 ? -1 : 1
  return `translate(${at(wrist[0], wrist[1])}) rotate(${round((turn * 180) / Math.PI)}) scale(${round(flip * k)} ${round(k * short)})`
}

/**
 * An arm raised in worship, `r` from 0, hanging at the side, to 1, straight
 * up with the hand open over the head. It comes up in front of the body, as a
 * hand raised in worship does, so it is seen end-on as it turns: the upper arm
 * swings up from hanging to overhead while the elbow bends, the forearm
 * coming up first, and straightens again at the top. From in front the hand
 * comes up before the face; from behind it rises into sight past the
 * shoulder. `side` is -1 on the left of the picture and 1 on the right;
 * `upper` and `fore` are the upper arm's length and the forearm's to the
 * wrist; `out` is how far the elbow stands out from the shoulder, and `away`
 * how far the wrist stands out from the elbow, hanging and raised.
 */
export function raise(shoulder, r, side, { upper, fore, out = [3, 5], away = [-1.4, 1] }) {
  const swing = ((171 - 159 * r) * Math.PI) / 180
  const bend = ((8 + 92 * Math.sin(Math.PI * Math.min(1, r / 0.9))) * Math.PI) / 180
  const lean = swing - bend
  const elbow = [shoulder[0] + side * lerp(out[0], out[1], r), shoulder[1] - upper * Math.cos(swing)]
  const wrist = [elbow[0] + side * lerp(away[0], away[1], r), elbow[1] - fore * Math.cos(lean)]
  return { elbow, wrist, short: Math.max(0.55, Math.abs(Math.cos(lean))) }
}
