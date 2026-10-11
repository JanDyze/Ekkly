import baptism from '../../../../assets/mock-photos/baptism.svg'
import bibleStudy from '../../../../assets/mock-photos/bible-study.svg'
import choir from '../../../../assets/mock-photos/choir.svg'
import christmas from '../../../../assets/mock-photos/christmas.svg'
import fellowshipMeal from '../../../../assets/mock-photos/fellowship-meal.svg'
import kidsChurch from '../../../../assets/mock-photos/kids-church.svg'
import outreach from '../../../../assets/mock-photos/outreach.svg'
import smallGroup from '../../../../assets/mock-photos/small-group.svg'
import sundayService from '../../../../assets/mock-photos/sunday-service.svg'
import youthCamp from '../../../../assets/mock-photos/youth-camp.svg'

// The pictures the Gallery story shows: drawings made to stand in for a
// church's photos (assets/mock-photos), never anyone's real ones, since a
// story is shown to whoever holds the app.

export const PHOTOS = {
  baptism,
  bibleStudy,
  choir,
  christmas,
  fellowshipMeal,
  kidsChurch,
  outreach,
  smallGroup,
  sundayService,
  youthCamp,
}

// A Sunday's worth of photos, in the order they go up.
export const SUNDAY = [
  sundayService,
  choir,
  kidsChurch,
  fellowshipMeal,
  baptism,
  bibleStudy,
  smallGroup,
  outreach,
  youthCamp,
]

// The albums the story's church has, newest first, their dates written the
// ways the app writes them: short on a cover, long under an album's name.
export const ALBUMS = [
  { id: 'sunday', title: 'Sunday service', date: 'Sun 11 Oct', long: 'Sunday, October 11, 2026', place: 'Main hall', cover: sundayService },
  { id: 'baptism', title: 'Baptism at the beach', date: 'Sat 10 Oct', long: 'Saturday, October 10, 2026', place: 'Anilao', cover: baptism },
  { id: 'youth', title: 'Youth camp', date: 'Sat 3 Oct', long: 'Saturday, October 3, 2026', place: 'Tagaytay', cover: youthCamp },
  { id: 'outreach', title: 'Feeding program', date: 'Thu 1 Oct', long: 'Thursday, October 1, 2026', place: 'Brgy. San Roque', cover: outreach },
]
