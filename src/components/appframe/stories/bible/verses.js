// The Scripture the Bible story shows, copied word for word from the
// translations the app itself ships (public/bible/KJV and public/bible/WEB),
// both in the public domain. Kept to those two on purpose: the Tagalog the app
// reads is not free to reprint in an advert, so it is named in the story but
// never quoted.

export const PSALM_23 = {
  KJV: [
    [1, 'The Lord is my shepherd; I shall not want.'],
    [2, 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.'],
    [3, 'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.'],
    [4, 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.'],
  ],
  WEB: [
    [1, 'Yahweh is my shepherd: I shall lack nothing.'],
    [2, 'He makes me lie down in green pastures. He leads me beside still waters.'],
    [3, 'He restores my soul. He guides me in the paths of righteousness for his name’s sake.'],
    [4, 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.'],
  ],
}

export const ROMANS_8 = [
  [1, 'There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.'],
  [2, 'For the law of the Spirit of life in Christ Jesus hath made me free from the law of sin and death.'],
  [3, 'For what the law could not do, in that it was weak through the flesh, God sending his own Son in the likeness of sinful flesh, and for sin, condemned sin in the flesh:'],
]

export const JOHN_3 = [
  [15, 'That whosoever believeth in him should not perish, but have eternal life.'],
  [16, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'],
  [17, 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.'],
]

// Every verse in the King James with "daily bread" in it, in the order the
// search reads the books.
export const DAILY_BREAD = [
  { ref: 'Matthew 6:11', text: 'Give us this day our daily bread.' },
  { ref: 'Luke 11:3', text: 'Give us day by day our daily bread.' },
]
