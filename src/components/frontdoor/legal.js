// The words of the Privacy and Terms pages. They describe what the app really
// does — what the front door keeps, who helps run it, how paying works — so a
// change to any of those is a change here too. Each takes the platform's name
// and contact email, which the console sets.

export const UPDATED = '15 September 2026'

export const privacy = ({ name, email }) => ({
  title: 'Privacy',
  intro: `How ${name} looks after the information it holds, on this site and inside every church’s app.`,
  sections: [
    {
      heading: 'Who we are',
      body: [
        `${name} is a church app, run for many churches from one place. Where this page says “we”, it means the people who run ${name}. You can write to us at ${email}.`,
      ],
    },
    {
      heading: 'Two kinds of information',
      body: [
        'Some information is ours to look after: what visitors and churches tell us on this site. The rest belongs to a church: the records it keeps in its own app. The church decides what goes in and who sees it, and we keep it for them.',
      ],
    },
    {
      heading: 'What this site keeps',
      list: [
        'A count of visits and of presses on “Get started”, a number per day, and only if you say yes. It does not say who you are and nothing follows you to other sites.',
        'If you say hello: your church’s name, your name, and the email or phone number you give, so we can reach out.',
        'If you chat with us: your messages, and your name and email if you give them.',
        'If you ask for a church: your Google account’s name and email, and the details you enter about the church.',
        'On your own device: your answer to the counting question, that you have seen the welcome, your light or dark choice, and your church’s name if you gave it, so the previews here show your church. The plan you are building is forgotten when you close the tab.',
      ],
    },
    {
      heading: 'Records inside a church',
      body: [
        'A church keeps its people’s names, contact details and birthdays, attendance counts, schedules, minutes, prayer concerns, finances and photos. Each church’s records are kept apart from every other church’s, and only the people its administrators let in can open them.',
        'We use them only to run that church’s app. We never sell them, and we look at them only when the church asks us to help or when the law requires it. A member who wants to see, correct or remove what their church holds should ask the church’s administrators first; we will help them do it.',
      ],
    },
    {
      heading: 'Who helps us run it',
      list: [
        'Google Firebase and Google Cloud: signing in, and storing the records.',
        'Vercel: serving the app.',
        'PayMongo: card payments. Card numbers go straight to PayMongo; we never see or keep them.',
        'Anthropic: EKRIS and AI minutes. What you ask EKRIS, or the notes you write up, is sent to be answered and is not used to train its models.',
        'Google’s Gmail: the emails we send.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        'What you tell us on this site is kept while it helps us reach you or answer you, and deleted when you ask. A church’s records are kept for as long as the church uses the app. Write to us to have anything deleted.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        `Under the Philippines’ Data Privacy Act of 2012, you can ask what we hold about you, have it corrected or deleted, and object to how it is used. Write to ${email} and we will answer.`,
      ],
    },
    {
      heading: 'Changes',
      body: ['If this changes, the new version is posted here with its date. A change that matters to churches is also told to them in the app.'],
    },
  ],
})

export const terms = ({ name, email }) => ({
  title: 'Terms',
  intro: `The agreement between ${name} and a church that uses it.`,
  sections: [
    {
      heading: 'The service',
      body: [
        `${name} gives each church its own app, at its own link, with the apps it chooses. By asking for a church or using one, you agree to these terms on your church’s behalf.`,
      ],
    },
    {
      heading: 'Your church’s account',
      body: [
        'The person who asks for a church becomes its first administrator. Administrators decide who is let in and what each person can do, and are responsible for keeping that list right. Keep your sign-in to yourself.',
      ],
    },
    {
      heading: 'Your records are yours',
      body: [
        'What your church puts in stays your church’s. You let us store and process it only so we can run your app. You are responsible for having your people’s permission to keep their information.',
      ],
    },
    {
      heading: 'Fair use',
      list: [
        'Nothing unlawful, hateful, or that you have no right to share.',
        'No trying to reach another church’s records, or to break or overload the app.',
        `No reselling ${name} without our agreement.`,
      ],
    },
    {
      heading: 'The free month, and paying',
      list: [
        'A new church starts with a free trial, one month unless we say otherwise when it opens.',
        'Each app has a monthly price, shown on the Pricing page. You pay for the apps your church has turned on.',
        'You can pay monthly, or yearly for the price of ten months. Card payments are handled by PayMongo and renew on their own until you stop them in Settings.',
        'Stopping ends the next renewal; the time already paid for stays yours. Paid periods are not refunded part way, unless the law says otherwise.',
        'If prices change, we tell churches before their next renewal at the new price.',
      ],
    },
    {
      heading: 'EKRIS and AI minutes',
      body: ['They are helpful, and sometimes wrong. Read what they write before you rely on it or send it on.'],
    },
    {
      heading: 'Keeping it running',
      body: [
        'We work to keep the app running and your records safe, but we cannot promise it will never be down or never make a mistake. It is provided as it is.',
      ],
    },
    {
      heading: 'Ending',
      body: [
        'You can stop using it at any time. We may suspend a church that breaks these terms or leaves its plan unpaid, and we will tell its administrators first.',
      ],
    },
    {
      heading: 'Limits',
      body: [
        `As far as the law allows, ${name} is not liable for indirect losses, and what it owes a church is no more than the church paid in the twelve months before.`,
      ],
    },
    {
      heading: 'Law, changes and contact',
      body: [
        `These terms are governed by the laws of the Philippines. If they change, the new version is posted here with its date. Questions: ${email}.`,
      ],
    },
  ],
})
