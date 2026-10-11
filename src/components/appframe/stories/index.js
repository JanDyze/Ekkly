// Each app's story: a short advert for it, played when its tile is held
// (AppPeek), one scene after another the way a phone's stories play. Each
// scene shows one thing the app does, happening on a screen drawn like the
// app's own (StoryScreen), with a line above it saying what that is.
//
// Every app's story lives in a folder of its own here — its scenes, its
// made-up people — with an index.js that exports `{ art, scenes }`, `art`
// being the app's artwork key (`art` in data/navigation.js). They are found by
// the glob below, so a new app's story is a new folder and nothing else.
// An app with no story still opens the plain preview: its name, what it is
// for and what is inside it.
//
// The scenes themselves are loaded only when a story is first held, so the
// home does not carry every app's advert; only these small lists are eager.
// A scene's `duration` is how long it plays, in ms: long enough for what it
// shows to finish and be read.

const modules = import.meta.glob('./*/index.js', { eager: true })

export const STORIES = Object.fromEntries(
  Object.values(modules)
    .map((module) => module.default)
    .filter((story) => story?.art && Array.isArray(story.scenes) && story.scenes.length)
    .map((story) => [story.art, story.scenes])
)

/** An app's story, or null when it has none yet. */
export const storyOf = (art) => STORIES[art] || null
