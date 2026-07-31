export type LearningWord = {
  word: string
  phonetic: string
  part: string
  meaning: string
  examples: string[]
  clozeSentence: string
  clozeTranslation: string
  imageTitle: string
  imageCaption: string
  tags: string[]
  synonyms: string[]
}

export const learningWords: LearningWord[] = [
  {
    word: 'ephemeral',
    phonetic: "/ɪˈfemərəl/",
    part: 'adj.',
    meaning: '短暂的；转瞬即逝的',
    examples: [
      'Fame is ephemeral, but art is lasting.',
      'The ephemeral beauty of cherry blossoms makes them even more precious.',
      'We often chase ephemeral pleasures while ignoring what truly lasts.',
    ],
    clozeSentence: 'The beauty of cherry blossoms is {{blank}}.',
    clozeTranslation: '樱花的美是短暂而珍贵的。',
    imageTitle: 'ephemeral',
    imageCaption: 'The short-lived beauty of cherry blossoms.',
    tags: ['brief', 'fleeting'],
    synonyms: ['temporary', 'transient', 'momentary'],
  },
  {
    word: 'serendipity',
    phonetic: "/ˌserənˈdɪpəti/",
    part: 'n.',
    meaning: '意外发现美好事物的幸运',
    examples: [
      'Meeting my closest friend was pure serendipity.',
      'The discovery came about through a happy moment of serendipity.',
      'Travel leaves room for curiosity and serendipity.',
    ],
    clozeSentence: 'Finding this quiet café was pure {{blank}}.',
    clozeTranslation: '偶然发现这家安静的咖啡馆是一场美好的意外。',
    imageTitle: 'serendipity',
    imageCaption: 'A fortunate discovery made by chance.',
    tags: ['chance', 'discovery'],
    synonyms: ['fortune', 'luck', 'happenstance'],
  },
  {
    word: 'resilient',
    phonetic: "/rɪˈzɪliənt/",
    part: 'adj.',
    meaning: '有韧性的；能迅速恢复的',
    examples: [
      'She stayed resilient during a difficult season.',
      'Resilient learners treat mistakes as useful feedback.',
      'The community proved remarkably resilient.',
    ],
    clozeSentence: 'A {{blank}} learner keeps going after mistakes.',
    clozeTranslation: '有韧性的学习者会在犯错后继续前进。',
    imageTitle: 'resilient',
    imageCaption: 'Able to recover and keep growing.',
    tags: ['strong', 'adaptive'],
    synonyms: ['tough', 'flexible', 'durable'],
  },
]

export type ChatMessage = {
  id: number
  sender: 'tutor' | 'learner'
  text: string
}

export type ChatContactId =
  | 'mia-daily'
  | 'alex-travel'
  | 'mia-pronunciation'
  | 'alex-weekend'

export type ChatContact = {
  id: ChatContactId
  name: string
  level: string
  time: string
  avatar: 'tutor' | 'alex'
}

export const chatContacts: ChatContact[] = [
  {
    id: 'mia-daily',
    name: 'Mia Tutor',
    level: 'Daily conversation',
    time: '10:38',
    avatar: 'tutor',
  },
  {
    id: 'alex-travel',
    name: 'Alex Practice',
    level: 'Travel English',
    time: 'Tue',
    avatar: 'alex',
  },
  {
    id: 'mia-pronunciation',
    name: 'Mia Tutor',
    level: 'Pronunciation review',
    time: 'Mon',
    avatar: 'tutor',
  },
  {
    id: 'alex-weekend',
    name: 'Alex Practice',
    level: 'Weekend plans',
    time: 'Sun',
    avatar: 'alex',
  },
]

export const initialChatThreads: Record<ChatContactId, ChatMessage[]> = {
  'mia-daily': [
    { id: 1, sender: 'tutor', text: 'Hi! How is it going today?' },
    { id: 2, sender: 'learner', text: "Pretty good! I’m meeting some friends later." },
    { id: 3, sender: 'tutor', text: 'Great! Let’s start with a simple conversation. How was your weekend?' },
    { id: 4, sender: 'learner', text: 'It was great! I went hiking with my friends.' },
    { id: 5, sender: 'tutor', text: 'That sounds fun! What was the most interesting thing you saw on the way?' },
    { id: 6, sender: 'learner', text: 'I saw a beautiful lake and took lots of photos.' },
  ],
  'alex-travel': [
    { id: 1, sender: 'tutor', text: 'Where would you like to travel next?' },
    { id: 2, sender: 'learner', text: 'I would love to visit London in the autumn.' },
    { id: 3, sender: 'tutor', text: 'Great choice. How would you ask for directions to your hotel?' },
  ],
  'mia-pronunciation': [
    { id: 1, sender: 'tutor', text: 'Let’s practise the ending sound in the word “friends”.' },
    { id: 2, sender: 'learner', text: 'Friends.' },
    { id: 3, sender: 'tutor', text: 'Good start. Keep the final consonant clear and gentle.' },
  ],
  'alex-weekend': [
    { id: 1, sender: 'tutor', text: 'What are you planning to do this weekend?' },
    { id: 2, sender: 'learner', text: 'I’m planning to visit an art museum.' },
    { id: 3, sender: 'tutor', text: 'Sounds interesting! Which kind of art do you enjoy most?' },
  ],
}

// Retained for compatibility with any consumers that need the default conversation.
export const initialChatMessages = initialChatThreads['mia-daily']

export const tutorReplies = [
  'That sounds lovely. Can you tell me one more detail?',
  'Nice answer! Try using an adjective to make it more vivid.',
  'Great job. Your sentence sounds natural and confident.',
]
