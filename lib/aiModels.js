// Which Claude model each AI feature runs on — the platform's choice, not a
// church's, because the platform pays for every call.
//
// The offered models are the ones the three endpoints' requests actually work
// on. All three send adaptive thinking and an effort level, which Claude Haiku
// 4.5 rejects, so it is not offered; song lookup also uses the web search tool
// version that only the Opus and Sonnet families are documented to take, so
// Fable is offered for the other two only. A custom id is accepted for models
// that arrive later — the console says so plainly when one is in use.
//
// Shared by the browser (the console's picker) and the server (the endpoints).

export const AI_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', note: 'Best balance of quality and cost' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', note: 'Cheaper and faster' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', note: 'Most capable, about twice the cost of Opus' },
]

export const AI_FEATURES = [
  {
    key: 'minutes',
    label: 'Writing up minutes',
    description: 'Turns the notes typed in a meeting into filed minutes.',
    defaultModel: 'claude-opus-5',
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5-1'],
  },
  {
    key: 'songLookup',
    label: 'Looking up songs',
    description: 'Searches the web for a song’s writer, key and words.',
    defaultModel: 'claude-opus-5',
    models: ['claude-opus-5', 'claude-sonnet-5'],
  },
  {
    key: 'lyrics',
    label: 'Laying out lyrics',
    description: 'Splits pasted lyrics into verses, choruses and bridges.',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-opus-5', 'claude-sonnet-5', 'claude-fable-5-1'],
  },
]

export const isAiFeature = (key) => AI_FEATURES.some((f) => f.key === key)

const MODEL_ID = /^claude-[a-z0-9.-]{2,60}$/

export const isModelId = (value) => typeof value === 'string' && MODEL_ID.test(value.trim())

export const modelLabel = (id) => AI_MODELS.find((m) => m.id === id)?.label || id

/** `{ enabled, models: { minutes, songLookup, lyrics } }`, every gap filled. */
export const withAiDefaults = (stored) => {
  const models = {}
  AI_FEATURES.forEach((feature) => {
    const chosen = stored?.models?.[feature.key]
    models[feature.key] = isModelId(chosen) ? chosen.trim() : feature.defaultModel
  })
  return { enabled: stored?.enabled !== false, models }
}

export const aiForStorage = (input) => {
  const clean = withAiDefaults(input)
  return { enabled: clean.enabled, models: clean.models }
}
