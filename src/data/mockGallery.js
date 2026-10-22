// TEMPORARY: made-up albums and photos for one church's Gallery, so it and
// the home's Latest photos panel have something in them to look at. To
// remove: delete this file and the lines marked `MOCK` in
// src/api/galleryService.js.
//
// Only while developing (`npm run dev`, never a deployed build) and only in
// MOCK_CHURCH, so nobody in the church ever sees them. Never written to
// Firestore or the file store: the pictures are the Pixabay photos already
// kept with the app (src/assets/mock-photos/home/, credited in its
// credits.json, free to use under Pixabay's licence), bundled rather than
// linked, since Pixabay asks that its images not be hotlinked. Changing one
// (a cover, a caption, deleting it) will fail, since there is nothing stored
// to change.
import { getChurchId } from '../api/church'
import bibleStudy from '../assets/mock-photos/home/bible-study.webp'
import choir from '../assets/mock-photos/home/choir.webp'
import leadersMeeting from '../assets/mock-photos/home/leaders-meeting.webp'
import outreach from '../assets/mock-photos/home/outreach.webp'
import prayerMeeting from '../assets/mock-photos/home/prayer-meeting.webp'
import sundayService from '../assets/mock-photos/home/sunday-service.webp'
import youthNight from '../assets/mock-photos/home/youth-night.webp'

const MOCK_CHURCH = 'uec-c2'

export const mockGalleryOn = () => import.meta.env.DEV && getChurchId() === MOCK_CHURCH

const DAY = 86400000
const dayKey = (daysAgo) => {
  const d = new Date(Date.now() - daysAgo * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Each album, how many days ago it was, and its pictures, newest last.
const ALBUMS = [
  {
    id: 'mock-sunday',
    title: 'Sunday worship',
    category: 'Worship',
    daysAgo: 1,
    location: 'Main sanctuary',
    photos: [
      { url: sundayService, description: 'The congregation singing together' },
      { url: choir, description: 'The choir leading the second song' },
    ],
  },
  {
    id: 'mock-youth',
    title: 'Youth night',
    category: 'Youth',
    daysAgo: 5,
    location: 'Fellowship hall',
    photos: [
      { url: youthNight, description: 'Games before the talk' },
      { url: outreach, description: 'Outreach in the neighbourhood on Saturday' },
    ],
  },
  {
    id: 'mock-prayer',
    title: 'Prayer and Bible study',
    category: 'Discipleship',
    daysAgo: 9,
    location: 'Room 2',
    photos: [
      { url: prayerMeeting, description: 'Wednesday prayer meeting' },
      { url: bibleStudy, description: 'Studying Romans together' },
    ],
  },
  {
    id: 'mock-leaders',
    title: 'Leaders’ planning day',
    category: 'Ministry',
    daysAgo: 30,
    location: 'Church office',
    photos: [{ url: leadersMeeting, description: 'Planning the next quarter' }],
  },
]

/** The albums, in the shape galleryService's normalizeAlbum gives. */
export const mockAlbums = () =>
  ALBUMS.map((album) => {
    const at = new Date(Date.now() - album.daysAgo * DAY)
    return {
      id: album.id,
      firestoreId: album.id,
      mock: true,
      title: album.title,
      description: '',
      category: album.category,
      date: dayKey(album.daysAgo),
      location: album.location,
      coverUrl: album.photos[0].url,
      calendarEventId: null,
      createdAt: at,
      updatedAt: at,
    }
  })

/** Every picture, in the shape the photo subscriptions give, with its album. */
export const mockPhotos = () =>
  ALBUMS.flatMap((album) =>
    album.photos.map((photo, i) => ({
      id: `${album.id}-${i + 1}`,
      albumId: album.id,
      mock: true,
      url: photo.url,
      description: photo.description,
      // An hour apart within the album, the first put up last.
      uploadedAt: new Date(Date.now() - album.daysAgo * DAY + (album.photos.length - i) * 3600000),
    }))
  )
