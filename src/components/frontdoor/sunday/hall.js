// The hall's back wall as both pictures of the church need it: the cross and
// the recess it hangs in (ChurchInside), and how the hall is seen through the
// doorway from the path (SundayStory's camera, and the glow ChurchOutside
// draws in the doorway). The cross glimpsed through the open doors is the
// hall's own cross, drawn where the hall is seen, so it does not move as the
// glow gives way to the room. In the hall's units, on its 1600 × 1000 canvas.

// The cross, about a quarter of the way down its upright for the crossbeam,
// as a cross is made; the recess it hangs in and the rim round it; and the
// darker faces of its timbers, turned from the light.
export const RECESS = 'M724 400V168A76 76 0 0 1 876 168V400Z'
export const RIM = 'M714 404V168A86 86 0 0 1 886 168V404Z'
export const CROSS = 'M789 118H811V176H860V198H811V372H789V198H740V176H789Z'
export const CROSS_SIDES = 'M806 118H811V176H806ZM806 198H811V372H806ZM740 194H860V198H740Z'

// Seen through the doorway, the hall's point `room` sits on the doorway's
// middle, `door` in the cover's pixels, and the hall is drawn `scale` times
// the cover's size: about one and a half doorways tall, so it grows more
// slowly than the church round it as the camera comes in - it is further
// away.
export const THROUGH = { door: [800, 776], room: [800, 520], scale: 150 / 800 }

/** The hall's units turned into the cover's, as seen through the doorway. */
export const throughDoorway = `translate(${THROUGH.door[0]} ${THROUGH.door[1]}) scale(${THROUGH.scale}) translate(${-THROUGH.room[0]} ${-THROUGH.room[1]})`
