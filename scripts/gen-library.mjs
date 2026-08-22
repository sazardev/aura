/**
 * Generates src/data/library.json (an index) and src/data/library/<id>.json
 * (one file per full book) from public-domain texts in scripts/books/.
 *
 * Sources are Project Gutenberg plain-text files (public domain). Run:
 *
 *   npm run gen:library
 *
 * The output is committed; the raw texts in scripts/books/ are gitignored.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BOOKS_DIR = join(ROOT, 'scripts', 'books')
const OUT_FILE = join(ROOT, 'src', 'data', 'library.json')
const OUT_DIR = join(ROOT, 'src', 'data', 'library')

/** Number of paragraphs grouped into one reading section. */
const SECTION_SIZE = 5

/** Two headings this close (in raw lines) belong to a table of contents, not the book. */
const TOC_GAP = 12

const NUMBER_WORD =
  '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)'
const NUM_TOKEN = `(?:\\d+|[ivxl]+|${NUMBER_WORD}(?:-${NUMBER_WORD})?)`

const CHAPTER_SEPARATOR = `[.:\\]]|[\\u2014\\u2013]`

function chapterPatternSource(heads) {
  return `^${heads}\\s+(${NUM_TOKEN}|the\\s+last)(?:\\s*(${CHAPTER_SEPARATOR})\\s*(.*)|\\s+(.*))?$`
}

const CHAPTER_RE = new RegExp(chapterPatternSource('chapter'), 'i')
const NUMERAL_RE = /^[ivxl]{1,8}\.?\s*$/i
const STAVE_RE = /^stave\s+([ivxl\d]+)\s*:?\s*(.*)$/i
const SEPARATOR_RE = new RegExp(
  `^(?:part|book|volume)\\s+(?:${NUMBER_WORD}|[ivxl\\d]+)(?:\\s*--.*)?$`,
  'i',
)
const END_LINE = /^(\*\s*){2,}$|^THE END\.?$/i
const START_LINE = /^\*\*\*\s*START OF/i
const END_MARKER_LINE = /^\*\*\*\s*END OF/i

/** Metadata per raw file name (everything the header does not guarantee). */
const METADATA = {
  'alice.txt': {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: 1865,
    genre: 'Fantasy',
    difficulty: 3,
    tags: ['Children', 'Fantasy', 'Classic'],
    gutenbergId: 11,
    firstLine:
      'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.',
    description:
      'Alice falls down a rabbit hole into a world of talking animals, riddles and nonsense — a playful tour of real, vivid English.',
    quotes: [
      '"Curiouser and curiouser!" cried Alice.',
      '"Who in the world am I? Ah, that\'s the great puzzle!"',
    ],
  },
  'oz.txt': {
    id: 'wonderful-wizard-of-oz',
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    year: 1900,
    genre: 'Fantasy',
    difficulty: 3,
    tags: ['Children', 'Fantasy', 'Classic'],
    gutenbergId: 55,
    firstLine:
      "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.",
    description:
      'Dorothy is swept away to a magical land and must travel the yellow brick road. Warm, clear prose that learners can really sink into.',
    quotes: [
      '"There is no place like home."',
      '"You have plenty of courage, I am sure. All you need is confidence in yourself."',
    ],
  },
  'peter-pan.txt': {
    id: 'peter-pan',
    title: 'Peter Pan',
    author: 'J. M. Barrie',
    year: 1911,
    genre: 'Fantasy',
    difficulty: 3,
    tags: ['Children', 'Fantasy', 'Adventure'],
    gutenbergId: 16,
    firstLine: 'All children, except one, grow up.',
    description:
      'The boy who never grows up takes Wendy and her brothers to Neverland, where they fight pirates and fly with fairies. Playful, quotable English.',
    quotes: [
      'To die will be an awfully big adventure.',
      'All the world is made of faith, and trust, and pixie dust.',
    ],
  },
  'wind-in-the-willows.txt': {
    id: 'wind-in-the-willows',
    title: 'The Wind in the Willows',
    author: 'Kenneth Grahame',
    year: 1908,
    genre: 'Fantasy',
    difficulty: 3,
    tags: ['Children', 'Fantasy', 'Nature'],
    gutenbergId: 289,
    firstLine:
      'The Mole had been working very hard all the morning, spring-cleaning his little home.',
    description:
      'Mole, Rat, Badger and Mr. Toad by the river — gentle adventures full of friendship and lovely descriptions of the English countryside.',
    quotes: [
      '"Believe me, my young friend, there is nothing — absolutely nothing — half so much worth doing as simply messing about in boats."',
    ],
  },
  'black-beauty.txt': {
    id: 'black-beauty',
    title: 'Black Beauty',
    author: 'Anna Sewell',
    year: 1877,
    genre: 'Classic',
    difficulty: 2,
    tags: ['Children', 'Animals', 'Classic'],
    gutenbergId: 271,
    firstLine:
      'The first place that I can well remember was a large pleasant meadow with a pond of clear water in it.',
    description:
      'A gentle horse tells the story of his life with many different owners. Short chapters, simple sentences and a strong message about kindness.',
    quotes: [
      'We call them dumb animals, and so they are, for they cannot tell us how they feel, but they do not suffer less because they have no words.',
    ],
  },
  'pinocchio.txt': {
    id: 'pinocchio',
    title: 'The Adventures of Pinocchio',
    author: 'Carlo Collodi',
    year: 1883,
    genre: 'Fantasy',
    difficulty: 2,
    tags: ['Children', 'Fantasy', 'Classic'],
    gutenbergId: 500,
    firstLine:
      'How it happened that Mastro Cherry, carpenter, found a piece of wood that wept and laughed like a child.',
    description:
      'A wooden puppet who wants to be a real boy keeps getting into trouble. Clear, lively storytelling that is ideal for early readers.',
    quotes: ['"I want to be a boy — a real boy."'],
  },
  'jungle-book.txt': {
    id: 'jungle-book',
    title: 'The Jungle Book',
    author: 'Rudyard Kipling',
    year: 1894,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Children', 'Adventure', 'Animals'],
    gutenbergId: 236,
    firstLine:
      "It was seven o'clock of a very warm evening in the Seeonee hills when Father Wolf woke up from his day's rest.",
    description:
      'Mowgli is raised by wolves in the Indian jungle, learning the Law of the Jungle from Baloo the bear and Bagheera the panther. Seven classic stories.',
    quotes: ['Now Rann the Kite brings home the night, That Mang the Bat sets free.'],
  },
  'secret-garden.txt': {
    id: 'secret-garden',
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    year: 1911,
    genre: 'Classic',
    difficulty: 3,
    tags: ['Children', 'Classic', 'Coming of age'],
    gutenbergId: 17396,
    firstLine:
      'When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen.',
    description:
      'A lonely girl discovers a hidden, walled garden and, as it blooms, so does she. A warm story about nature, friendship and growing up.',
    quotes: [
      'Where you tend a rose, my lad, a thistle cannot grow.',
      'Is the spring coming? What is it like?... It is the sun shining on the rain and the rain falling on the sunshine.',
    ],
  },
  'anne-of-green-gables.txt': {
    id: 'anne-of-green-gables',
    title: 'Anne of Green Gables',
    author: 'L. M. Montgomery',
    year: 1908,
    genre: 'Classic',
    difficulty: 3,
    tags: ['Children', 'Coming of age', 'Friendship'],
    gutenbergId: 45,
    firstLine:
      "Mrs. Rachel Lynde lived just where the Avonlea main road dipped down into a little hollow, fringed with alders and ladies' eardrops.",
    description:
      'An imaginative orphan girl with red hair and a big vocabulary transforms a quiet farm in Prince Edward Island. Charming and full of vivid speech.',
    quotes: [
      '"Tomorrow is always fresh, with no mistakes in it yet."',
      'Kindred spirits are not so scarce as I used to think.',
    ],
  },
  'christmas-carol.txt': {
    id: 'christmas-carol',
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    year: 1843,
    genre: 'Fantasy',
    difficulty: 3,
    tags: ['Christmas', 'Ghost story', 'Redemption'],
    gutenbergId: 46,
    firstLine: 'Marley was dead: to begin with. There is no doubt whatever about that.',
    description:
      'On Christmas Eve, the miser Ebenezer Scrooge is visited by three spirits who show him his past, present and future. A short, unforgettable classic.',
    quotes: [
      'Bah! Humbug!',
      '"I will honour Christmas in my heart, and try to keep it all the year."',
    ],
  },
  'call-of-the-wild.txt': {
    id: 'call-of-the-wild',
    title: 'The Call of the Wild',
    author: 'Jack London',
    year: 1903,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Animals', 'Survival', 'Adventure'],
    gutenbergId: 215,
    firstLine:
      'Buck did not read the newspapers, or he would have known that trouble was brewing, not alone for himself, but for every tide-water dog.',
    description:
      'A strong pet dog is stolen and sold as a sled dog in the frozen Yukon. He must grow wild to survive — a gripping tale of instinct and endurance.',
    quotes: ['The dominant primordial beast was strong in Buck.'],
  },
  'treasure-island.txt': {
    id: 'treasure-island',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    year: 1883,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Pirates', 'Adventure', 'Classic'],
    gutenbergId: 120,
    firstLine:
      'Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island.',
    description:
      'Young Jim Hawkins finds a treasure map and sails to a distant island full of pirates, including the famous Long John Silver. Action-packed and easy to follow.',
    quotes: ['"Fifteen men on the dead man\'s chest — Yo-ho-ho, and a bottle of rum!"'],
  },
  'tom-sawyer.txt': {
    id: 'tom-sawyer',
    title: 'The Adventures of Tom Sawyer',
    author: 'Mark Twain',
    year: 1876,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Coming of age', 'Humor', 'Adventure'],
    gutenbergId: 74,
    firstLine: 'Tom! No answer. Tom! No answer.',
    description:
      'Tom Sawyer tricks his friends, plays truant, and hunts for treasure on the Mississippi. Funny, warm and packed with everyday American English.',
    quotes: [
      'He had discovered a great law of human action, without knowing it — namely, that in order to make a man or a boy covet a thing, it is only necessary to make the thing difficult to attain.',
    ],
  },
  'around-world-80-days.txt': {
    id: 'around-the-world-in-eighty-days',
    title: 'Around the World in Eighty Days',
    author: 'Jules Verne',
    year: 1873,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Travel', 'Adventure', 'Humor'],
    gutenbergId: 103,
    firstLine: 'Mr. Phileas Fogg lived, in 1872, at No. 7, Saville Row, Burlington Gardens.',
    description:
      'Phileas Fogg bets he can circle the globe in eighty days and races against the clock with his loyal servant Passepartout. A fast, fun plot in clear prose.',
    quotes: ['"The unforeseen does not exist."'],
  },
  'time-machine.txt': {
    id: 'time-machine',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    genre: 'Science Fiction',
    difficulty: 3,
    tags: ['Time travel', 'Science fiction', 'Classic'],
    gutenbergId: 35,
    firstLine:
      'The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us.',
    description:
      'An inventor travels to the year 802701 and finds humanity split into two strange races. Short, vivid and thought-provoking — an early classic of science fiction.',
    quotes: [
      '"There is no difference between Time and any of the three dimensions of Space except that our consciousness moves along it."',
    ],
  },
  'war-of-the-worlds.txt': {
    id: 'war-of-the-worlds',
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    year: 1898,
    genre: 'Science Fiction',
    difficulty: 4,
    tags: ['Alien invasion', 'Science fiction', 'Classic'],
    gutenbergId: 36,
    firstLine:
      "No one would have believed in the last years of the nineteenth century that this world was being watched keenly and closely by intelligences greater than man's.",
    description:
      'Martians invade Victorian England with terrible war machines. Tense, suspenseful prose with striking descriptions and a famous twist at the end.',
    quotes: [
      '"We have been prepared for such a night as this, and the creatures are indeed at our very door."',
    ],
  },
  'robinson-crusoe.txt': {
    id: 'robinson-crusoe',
    title: 'Robinson Crusoe',
    author: 'Daniel Defoe',
    year: 1719,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Survival', 'Adventure', 'Classic'],
    gutenbergId: 521,
    firstLine:
      'I was born in the year 1632, in the city of York, of a good family, though not of that country, my father being a foreigner of Bremen.',
    description:
      'A sailor shipwrecked alone on a tropical island must build a life from almost nothing. The original survival story, told with plain, practical detail.',
    quotes: [
      'It is never too late to be wise.',
      'Thus we never see the true state of our condition till it is illustrated to us by its contraries.',
    ],
  },
  'pride-and-prejudice.txt': {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Romance', 'Society', 'Classic'],
    gutenbergId: 1342,
    firstLine:
      'It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.',
    description:
      'Elizabeth Bennet meets the proud Mr. Darcy and both must learn to see past first impressions. Sharp, witty dialogue and one of the best-loved novels in English.',
    quotes: [
      '"You must allow me to tell you how ardently I admire and love you."',
      '"I declare after all there is no enjoyment like reading!"',
    ],
  },
  'jane-eyre.txt': {
    id: 'jane-eyre',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    year: 1847,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Romance', 'Gothic', 'Coming of age'],
    gutenbergId: 1260,
    firstLine: 'There was no possibility of taking a walk that day.',
    description:
      'An orphan girl grows up poor, becomes a governess, and falls in love with her mysterious employer. A first-person story rich in feeling and atmosphere.',
    quotes: [
      '"I am no bird; and no net ensnares me: I am a free human being with an independent will."',
      'I am not an angel, and I will not be one till I die: I will be myself.',
    ],
  },
  'wuthering-heights.txt': {
    id: 'wuthering-heights',
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    year: 1847,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Gothic', 'Romance', 'Revenge'],
    gutenbergId: 768,
    firstLine:
      '1801.—I have just returned from a visit to my landlord — the solitary neighbour that I shall be troubled with.',
    description:
      'On the wild Yorkshire moors, the fierce love between Heathcliff and Catherine shapes two families for generations. Dark, stormy and unforgettable.',
    quotes: [
      '"Be with me always — take any form — drive me mad! only do not leave me in this abyss, where I cannot find you!"',
    ],
  },
  'little-women.txt': {
    id: 'little-women',
    title: 'Little Women',
    author: 'Louisa May Alcott',
    year: 1868,
    genre: 'Classic',
    difficulty: 3,
    tags: ['Family', 'Coming of age', 'Classic'],
    gutenbergId: 514,
    firstLine:
      '"Christmas won\'t be Christmas without any presents," grumbled Jo, lying on the rug.',
    description:
      'The four March sisters grow up in Civil War America, dreaming, quarrelling and loving each other. A warm story about family and becoming yourself.',
    quotes: [
      '"I am not afraid of storms, for I am learning how to sail my ship."',
      '"I like good strong words that mean something."',
    ],
  },
  'frankenstein.txt': {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: 1818,
    genre: 'Gothic',
    difficulty: 4,
    tags: ['Gothic', 'Horror', 'Science fiction'],
    gutenbergId: 84,
    firstLine:
      'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.',
    description:
      'A scientist creates a living creature and then abandons it, with tragic results. Written when the author was eighteen, it asks what it means to be human.',
    quotes: [
      '"Beware; for I am fearless, and therefore powerful."',
      'Nothing is so painful to the human mind as a great and sudden change.',
    ],
  },
  'dracula.txt': {
    id: 'dracula',
    title: 'Dracula',
    author: 'Bram Stoker',
    year: 1897,
    genre: 'Gothic',
    difficulty: 4,
    tags: ['Gothic', 'Horror', 'Classic'],
    gutenbergId: 345,
    firstLine:
      '3 May. Bistritz.—Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning.',
    description:
      'The vampire Count Dracula comes to England, and a small group must hunt him down. Told through letters and diaries — suspenseful and deeply atmospheric.',
    quotes: [
      '"I am longing to be with you, and by the sea, where we can talk together freely."',
      'We learn from failure, not from success!',
    ],
  },
  'dorian-gray.txt': {
    id: 'picture-of-dorian-gray',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    year: 1890,
    genre: 'Gothic',
    difficulty: 4,
    tags: ['Gothic', 'Philosophy', 'Classic'],
    gutenbergId: 174,
    firstLine:
      'The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac.',
    description:
      "A beautiful young man stays forever young while a hidden portrait ages in his place. Wilde's only novel is full of sharp epigrams about beauty and vice.",
    quotes: [
      '"There is only one thing in the world worse than being talked about, and that is not being talked about."',
      'The only way to get rid of a temptation is to yield to it.',
    ],
  },
  'huckleberry-finn.txt': {
    id: 'huckleberry-finn',
    title: 'Adventures of Huckleberry Finn',
    author: 'Mark Twain',
    year: 1884,
    genre: 'Adventure',
    difficulty: 4,
    tags: ['Adventure', 'Coming of age', 'Humor'],
    gutenbergId: 76,
    firstLine:
      "You don't know about me without you have read a book by the name of The Adventures of Tom Sawyer; but that ain't no matter.",
    description:
      'Huck Finn escapes his violent father and floats down the Mississippi on a raft with Jim, an escaped slave. Funny and moving, with unforgettable American voices.',
    quotes: [
      '"All right, then, I\'ll go to hell."',
      'The first thing to see about a man is his conscience.',
    ],
  },
  'emma.txt': {
    id: 'emma',
    title: 'Emma',
    author: 'Jane Austen',
    year: 1815,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Romance', 'Society', 'Classic'],
    gutenbergId: 158,
    firstLine:
      'Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence.',
    description:
      "Emma is sure she is an excellent matchmaker — until her plans backfire in delightful ways. Witty, warm and full of Austen's sharpest social comedy.",
    quotes: ['"If I loved you less, I might be able to talk about it more."'],
  },
  'great-expectations.txt': {
    id: 'great-expectations',
    title: 'Great Expectations',
    author: 'Charles Dickens',
    year: 1861,
    genre: 'Classic',
    difficulty: 4,
    tags: ['Coming of age', 'Society', 'Classic'],
    gutenbergId: 1400,
    firstLine:
      "My father's family name being Pirrip, and my Christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip.",
    description:
      'An orphan boy called Pip is suddenly raised from his humble life by a mysterious fortune. A sweeping story of money, class and self-discovery.',
    quotes: [
      '"I must be taken as I have been made. The success is not mine, the failure is not mine."',
    ],
  },
  'gullivers-travels.txt': {
    id: 'gullivers-travels',
    title: "Gulliver's Travels",
    author: 'Jonathan Swift',
    year: 1726,
    genre: 'Adventure',
    difficulty: 4,
    tags: ['Satire', 'Adventure', 'Classic'],
    gutenbergId: 829,
    firstLine: 'My father had a small estate in Nottinghamshire: I was the third of five sons.',
    description:
      'Shipwrecked Gulliver visits lands of tiny people, giant people and talking horses. A famous adventure that is secretly a sharp satire on human nature.',
    quotes: [
      'And he gave it for his opinion, that whoever could make two ears of corn, or two blades of grass, to grow upon a spot of ground where only one grew before, would deserve better of mankind.',
    ],
  },
  'heidi.txt': {
    id: 'heidi',
    title: 'Heidi',
    author: 'Johanna Spyri',
    year: 1880,
    genre: 'Classic',
    difficulty: 2,
    tags: ['Children', 'Nature', 'Classic'],
    gutenbergId: 1448,
    firstLine:
      'From the old and pleasantly situated village of Mayenfeld, a footpath winds through green and shady meadows to the foot of the mountains.',
    description:
      'A sunny-natured orphan girl is sent to live with her gruff grandfather high in the Swiss Alps. Simple, joyful prose perfect for early learners.',
    quotes: ['"We must go back to the grandfather. There is room for us all."'],
  },
  'moby-dick.txt': {
    id: 'moby-dick',
    title: 'Moby-Dick; or, The Whale',
    author: 'Herman Melville',
    year: 1851,
    genre: 'Adventure',
    difficulty: 5,
    tags: ['Adventure', 'Sea', 'Classic'],
    gutenbergId: 2701,
    firstLine: 'Call me Ishmael.',
    description:
      'Ishmael signs onto a whaling ship and meets the obsessed Captain Ahab, who hunts one great white whale. Huge, strange and magnificent — the great American novel.',
    quotes: [
      'Call me Ishmael.',
      '"Towards thee I roll, thou all-destroying but unconquering whale."',
    ],
  },
  'oliver-twist.txt': {
    id: 'oliver-twist',
    title: 'Oliver Twist',
    author: 'Charles Dickens',
    year: 1838,
    genre: 'Classic',
    difficulty: 4,
    tags: ['Society', 'Adventure', 'Classic'],
    gutenbergId: 730,
    firstLine:
      'Among other public buildings in a certain town, which for many reasons it will be prudent to refrain from mentioning, there is one anciently common to most towns.',
    description:
      "A poor orphan asks for more porridge and is thrown into a world of thieves and villains. Dickens's most famous attack on cruelty — and a great adventure.",
    quotes: ['"Please, sir, I want some more."'],
  },
  'scarlet-letter.txt': {
    id: 'scarlet-letter',
    title: 'The Scarlet Letter',
    author: 'Nathaniel Hawthorne',
    year: 1850,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Society', 'Romance', 'Classic'],
    gutenbergId: 33,
    firstLine:
      'A throng of bearded men, in sad-colored garments, and gray, steeple-crowned hats, intermingled with women, some wearing hoods, and others bareheaded, was assembled in front of a wooden edifice.',
    description:
      'In Puritan New England, Hester Prynne must wear a scarlet letter for the rest of her life. A powerful novel about guilt, secrecy and courage.',
    quotes: ['"She had not known the weight until she felt the freedom!"'],
  },
  'tale-of-two-cities.txt': {
    id: 'tale-of-two-cities',
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    year: 1859,
    genre: 'Historical',
    difficulty: 4,
    tags: ['Historical', 'Society', 'Classic'],
    gutenbergId: 98,
    firstLine: 'It was the best of times, it was the worst of times.',
    description:
      'A doctor, a lawyer and a wine-shop keeper are caught up in the French Revolution. Epic, suspenseful and home to the most famous ending in English fiction.',
    quotes: [
      'It was the best of times, it was the worst of times.',
      '"It is a far, far better thing that I do, than I have ever done."',
    ],
  },
  'twenty-thousand-leagues.txt': {
    id: 'twenty-thousand-leagues',
    title: 'Twenty Thousand Leagues Under the Seas',
    author: 'Jules Verne',
    year: 1870,
    genre: 'Science Fiction',
    difficulty: 4,
    tags: ['Sea', 'Science fiction', 'Adventure'],
    gutenbergId: 164,
    firstLine:
      'The year 1866 was signalised by a remarkable incident, a mysterious and inexplicable appearance, which puzzled and excited the popular mind to a great degree.',
    description:
      'A mysterious sea monster turns out to be the submarine Nautilus, commanded by the enigmatic Captain Nemo. A grand voyage full of marine marvels.',
    quotes: ['"The sea is everything."'],
  },
  'sherlock-holmes.txt': {
    id: 'sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1892,
    genre: 'Mystery',
    difficulty: 4,
    tags: ['Mystery', 'Short stories', 'Detective'],
    gutenbergId: 1661,
    firstLine: 'To Sherlock Holmes she is always the woman.',
    description:
      "Twelve classic short stories about the world's greatest detective and his friend Dr. Watson, from A Scandal in Bohemia to The Copper Beeches.",
    quotes: [
      '"Elementary, my dear Watson."',
      '"When you have eliminated the impossible, whatever remains, however improbable, must be the truth."',
    ],
  },
  'through-the-looking-glass.txt': {
    id: 'through-the-looking-glass',
    title: 'Through the Looking-Glass',
    author: 'Lewis Carroll',
    year: 1871,
    genre: 'Fantasy',
    difficulty: 3,
    tags: ['Children', 'Fantasy', 'Classic'],
    gutenbergId: 12,
    firstLine: 'One thing was certain, that the white kitten had had nothing to do with it.',
    description:
      'Alice steps through the mirror into a backward world of chess pieces, nonsense poems and the Jabberwock. The playful sequel to Wonderland.',
    quotes: [
      '"Why, sometimes I\'ve believed as many as six impossible things before breakfast."',
      '"The sun was shining on the sea, Shining with all his might."',
    ],
  },
  'white-fang.txt': {
    id: 'white-fang',
    title: 'White Fang',
    author: 'Jack London',
    year: 1906,
    genre: 'Adventure',
    difficulty: 4,
    tags: ['Animals', 'Survival', 'Adventure'],
    gutenbergId: 910,
    firstLine: 'Dark spruce forest frowned on either side the frozen waterway.',
    description:
      'The story of a wild wolf-dog in the frozen North who must learn to trust humans. The fierce companion to The Call of the Wild.',
    quotes: ['Love, genuine passionate love, was his for the first time.'],
  },
  'prince-and-pauper.txt': {
    id: 'prince-and-pauper',
    title: 'The Prince and the Pauper',
    author: 'Mark Twain',
    year: 1881,
    genre: 'Adventure',
    difficulty: 3,
    tags: ['Children', 'Adventure', 'Classic'],
    gutenbergId: 1837,
    firstLine:
      'In the ancient city of London, on a certain autumn day in the second quarter of the sixteenth century, a boy was born to a poor family of the name of Canty, who did not want him.',
    description:
      "A poor boy and a prince who look exactly alike swap clothes — and lives. A fast, funny story about justice, kindness and seeing the world through another's eyes.",
    quotes: ['"I am the Prince of Wales, and I shall be fed."'],
  },
  'jekyll-and-hyde.txt': {
    id: 'jekyll-and-hyde',
    title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
    author: 'Robert Louis Stevenson',
    year: 1886,
    genre: 'Gothic',
    difficulty: 4,
    tags: ['Gothic', 'Horror', 'Classic'],
    gutenbergId: 43,
    firstLine:
      'Mr. Utterson the lawyer was a man of a rugged countenance that was never lighted by a smile.',
    description:
      'A respected doctor invents a potion that lets him become his evil double. A short, terrifying study of the good and evil inside every person.',
    quotes: [
      'I was no more myself when I laid aside restraint and plunged in shame.',
      'It was the curse of mankind that these two incongruous faggots were thus bound together.',
    ],
  },
  'metamorphosis.txt': {
    id: 'metamorphosis',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    year: 1915,
    genre: 'Classic',
    difficulty: 4,
    tags: ['Classic', 'Philosophy', 'Fiction'],
    gutenbergId: 5200,
    firstLine:
      'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.',
    description:
      'Gregor Samsa wakes up one morning as a giant insect. Surreal, dark and strangely funny — the most famous short story of the twentieth century.',
    quotes: ['"Was he an animal, that music could move him so?"'],
  },
  'yellow-wallpaper.txt': {
    id: 'yellow-wallpaper',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    year: 1892,
    genre: 'Gothic',
    difficulty: 4,
    tags: ['Horror', 'Short story', 'Classic'],
    gutenbergId: 1952,
    firstLine:
      'It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer.',
    description:
      'A woman is told to rest and never to think, and slowly the pattern of the yellow wallpaper starts to move. A chilling short story in the form of a diary.',
    quotes: ['"I\'ve got out at last," said I, "in spite of you and Jane."'],
  },
  'just-so-stories.txt': {
    id: 'just-so-stories',
    title: 'Just So Stories',
    author: 'Rudyard Kipling',
    year: 1902,
    genre: 'Fantasy',
    difficulty: 2,
    tags: ['Children', 'Fantasy', 'Short stories'],
    gutenbergId: 2781,
    firstLine:
      'In the High and Far-Off Times the Elephant, O Best Beloved, was a Wild Elephant, with a blackish, bulgy nose.',
    description:
      'Twelve funny origin stories: how the leopard got his spots, the camel his hump, and the elephant his trunk. Playful, rhythmic English that begs to be read aloud.',
    quotes: ['"I keep six honest serving-men (They taught me all I knew)."'],
  },
  'grimm-fairy-tales.txt': {
    id: 'grimm-fairy-tales',
    title: "Grimms' Fairy Tales",
    author: 'Jacob and Wilhelm Grimm',
    year: 1812,
    genre: 'Fantasy',
    difficulty: 2,
    tags: ['Children', 'Fairy tales', 'Short stories'],
    gutenbergId: 5314,
    firstLine:
      'In old times when wishing still helped one, there lived a king whose daughters were all beautiful, but the youngest was so beautiful that the sun itself was astonished whenever it shone in her face.',
    description:
      'Two hundred tales of kings, dwarfs, wolves and magic — from Rapunzel and Cinderella to Hansel and Gretel. The classic source of the stories everyone knows.',
    quotes: ['"Mirror, mirror on the wall, Who is the fairest one of all?"'],
  },
  'aesop-fables.txt': {
    id: 'aesop-fables',
    title: "Aesop's Fables",
    author: 'Aesop',
    year: -600,
    genre: 'Classic',
    difficulty: 2,
    tags: ['Fables', 'Short stories', 'Classic'],
    gutenbergId: 21,
    firstLine:
      "A Wolf, meeting with a Lamb astray from the fold, resolved not to lay violent hands on him, but to find some plea to justify to the Lamb the Wolf's right to eat him.",
    description:
      'Three hundred very short animal stories, each ending in a moral: the tortoise and the hare, the boy who cried wolf, the fox and the grapes. Perfect bite-sized reading.',
    quotes: [
      'Slow and steady wins the race.',
      'The grapes are sour, and unattainable.',
      'Little friends may prove great friends.',
    ],
  },
  'hound-of-baskervilles.txt': {
    id: 'hound-of-baskervilles',
    title: 'The Hound of the Baskervilles',
    author: 'Arthur Conan Doyle',
    year: 1902,
    genre: 'Mystery',
    difficulty: 4,
    tags: ['Mystery', 'Detective', 'Classic'],
    gutenbergId: 2852,
    firstLine:
      'Mr. Sherlock Holmes, who was usually very late in the mornings, save upon those not infrequent occasions when he was up all night, was seated at the breakfast table.',
    description:
      'A ghostly hound haunts the moors around Baskerville Hall, and Holmes must uncover the truth behind a family curse. The most famous of the Sherlock Holmes novels.',
    quotes: ['"There is nothing more deceptive than an obvious fact."'],
  },
  'study-in-scarlet.txt': {
    id: 'study-in-scarlet',
    title: 'A Study in Scarlet',
    author: 'Arthur Conan Doyle',
    year: 1887,
    genre: 'Mystery',
    difficulty: 4,
    tags: ['Mystery', 'Detective', 'Classic'],
    gutenbergId: 244,
    firstLine:
      'In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army.',
    description:
      'The very first Sherlock Holmes story: a mysterious murder in an empty house and the meeting of Holmes and Dr. Watson. Where the legend began.',
    quotes: ['"It is a capital mistake to theorize before one has data."'],
  },
  'return-of-sherlock-holmes.txt': {
    id: 'return-of-sherlock-holmes',
    title: 'The Return of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1905,
    genre: 'Mystery',
    difficulty: 4,
    tags: ['Mystery', 'Short stories', 'Detective'],
    gutenbergId: 108,
    firstLine:
      'It was in the spring of the year 1894 that all London was interested, and the fashionable world dismayed, by the murder of the Honourable Ronald Adair under the most unusual and inexplicable circumstances.',
    description:
      'Holmes returns from the dead in thirteen brilliant short cases, from The Empty House to The Second Stain. Vintage detective work at its peak.',
    quotes: ['"There is nothing more stimulating than a case where everything goes against you."'],
  },
  'memoirs-of-sherlock-holmes.txt': {
    id: 'memoirs-of-sherlock-holmes',
    title: 'The Memoirs of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1894,
    genre: 'Mystery',
    difficulty: 4,
    tags: ['Mystery', 'Short stories', 'Detective'],
    gutenbergId: 834,
    firstLine:
      'I am afraid, Watson, that I shall have to go, said Holmes, as I sat down to our breakfast one morning.',
    description:
      'Eleven short adventures including Silver Blaze, The Musgrave Ritual and the final confrontation at Reichenbach Falls. Holmes at his sharpest.',
    quotes: ['"Eliminate all other factors, and the one which remains must be the truth."'],
  },
  'invisible-man.txt': {
    id: 'invisible-man',
    title: 'The Invisible Man',
    author: 'H. G. Wells',
    year: 1897,
    genre: 'Science Fiction',
    difficulty: 4,
    tags: ['Science fiction', 'Horror', 'Classic'],
    gutenbergId: 5230,
    firstLine:
      'The stranger came early in February, one wintry day, through a biting wind and a driving snow, the last snowfall of the year, over the down.',
    description:
      'A scientist discovers how to make himself invisible — and uses his power to terrify a quiet English village. Suspenseful, funny and unsettling.',
    quotes: [
      '"Great and strange ideas transcending experience often have less effect upon men and women than smaller, more tangible considerations."',
    ],
  },
  'journey-to-center-earth.txt': {
    id: 'journey-to-center-earth',
    title: 'A Journey to the Centre of the Earth',
    author: 'Jules Verne',
    year: 1864,
    genre: 'Science Fiction',
    difficulty: 4,
    tags: ['Adventure', 'Science fiction', 'Classic'],
    gutenbergId: 18857,
    firstLine:
      'Looking back to all that has occurred to me, I cannot refrain from asking myself whether the whole is not a dream.',
    description:
      'A professor decodes a cryptic message and descends into a volcano with his nephew, into a lost world of prehistoric marvels. Verne at his most adventurous.',
    quotes: [
      '"Science, my boy, is made up of mistakes, but they are mistakes which it is useful to make."',
    ],
  },
  'connecticut-yankee.txt': {
    id: 'connecticut-yankee',
    title: "A Connecticut Yankee in King Arthur's Court",
    author: 'Mark Twain',
    year: 1889,
    genre: 'Adventure',
    difficulty: 4,
    tags: ['Satire', 'Adventure', 'Classic'],
    gutenbergId: 86,
    firstLine:
      'It was in Warwick Castle that I came across the curious stranger whom I am going to talk about.',
    description:
      "A modern American engineer is knocked on the head and wakes up in Camelot, where he tries to bring 19th-century technology to King Arthur's court. Hilarious and sharp.",
    quotes: [
      '"Training is everything. The peach was once a bitter almond; cauliflower is nothing but cabbage with a college education."',
    ],
  },
  'david-copperfield.txt': {
    id: 'david-copperfield',
    title: 'David Copperfield',
    author: 'Charles Dickens',
    year: 1850,
    genre: 'Classic',
    difficulty: 4,
    tags: ['Coming of age', 'Society', 'Classic'],
    gutenbergId: 766,
    firstLine:
      'Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.',
    description:
      "From a lonely childhood to fame as a writer, David Copperfield is Dickens's most personal novel — full of unforgettable characters like Mr. Micawber and Uriah Heep.",
    quotes: ['"My advice is, never do tomorrow what you can do today."'],
  },
  'hard-times.txt': {
    id: 'hard-times',
    title: 'Hard Times',
    author: 'Charles Dickens',
    year: 1854,
    genre: 'Classic',
    difficulty: 4,
    tags: ['Society', 'Classic', 'Satire'],
    gutenbergId: 786,
    firstLine: 'Now, what I want is, Facts.',
    description:
      'In the bleak industrial city of Coketown, a schoolmaster who believes only in facts learns what really matters. Short, fierce and deeply funny.',
    quotes: ['"Now, what I want is, Facts. Teach these boys and girls nothing but Facts."'],
  },
  'vanity-fair.txt': {
    id: 'vanity-fair',
    title: 'Vanity Fair',
    author: 'William Makepeace Thackeray',
    year: 1848,
    genre: 'Classic',
    difficulty: 5,
    tags: ['Society', 'Satire', 'Classic'],
    gutenbergId: 599,
    firstLine:
      "While the present century was in its teens, and on one sunshiny morning in June, there drove up to the great iron gate of Miss Pinkerton's academy for young ladies, on Chiswick Mall, a large family coach.",
    description:
      'Becky Sharp climbs the slippery ladder of English society with wit and no conscience. A huge, satirical novel about ambition, money and pretending.',
    quotes: ['"Vanity Fair is a very vain, wicked, foolish place."'],
  },
  'persuasion.txt': {
    id: 'persuasion',
    title: 'Persuasion',
    author: 'Jane Austen',
    year: 1817,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Romance', 'Society', 'Classic'],
    gutenbergId: 105,
    firstLine:
      'Sir Walter Elliot, of Kellynch Hall, in Somersetshire, was a man who, for his own amusement, never took up any book but the Baronetage.',
    description:
      "Years after Anne Elliot was persuaded to refuse the man she loved, he returns — rich and still unmarried. Austen's most tender and mature novel.",
    quotes: ['"Time will explain."'],
  },
  'northanger-abbey.txt': {
    id: 'northanger-abbey',
    title: 'Northanger Abbey',
    author: 'Jane Austen',
    year: 1817,
    genre: 'Romance',
    difficulty: 3,
    tags: ['Romance', 'Humor', 'Classic'],
    gutenbergId: 121,
    firstLine:
      'No one who had ever seen Catherine Morland in her infancy would have supposed her born to be an heroine.',
    description:
      'A young woman who reads too many Gothic novels visits a mysterious abbey and lets her imagination run wild. A sparkling parody and a sweet romance.',
    quotes: [
      '"A woman especially, if she have the misfortune of knowing anything, should conceal it as well as she can."',
    ],
  },
  'mansfield-park.txt': {
    id: 'mansfield-park',
    title: 'Mansfield Park',
    author: 'Jane Austen',
    year: 1814,
    genre: 'Romance',
    difficulty: 4,
    tags: ['Romance', 'Society', 'Classic'],
    gutenbergId: 141,
    firstLine:
      'About thirty years ago Miss Maria Ward, of Huntingdon, had the good luck to captivate Sir Thomas Bertram.',
    description:
      "Quiet Fanny Price is taken in by her wealthy relatives at Mansfield Park and must find her place among them. Austen's deepest study of character and conscience.",
    quotes: ['"Let other pens dwell on guilt and misery."'],
  },
  'three-musketeers.txt': {
    id: 'three-musketeers',
    title: 'The Three Musketeers',
    author: 'Alexandre Dumas',
    year: 1844,
    genre: 'Adventure',
    difficulty: 4,
    tags: ['Adventure', 'Historical', 'Classic'],
    gutenbergId: 1257,
    firstLine:
      'On the first Monday of the month of April, 1625, the market town of Meung, in which the author of ROMANCE OF THE ROSE was born, appeared to be in as perfect a state of revolution as if the Huguenots had just made a second La Rochelle of it.',
    description:
      "Young d'Artagnan joins Athos, Porthos and Aramis — the king's musketeers — for duels, conspiracies and the famous diamond affair. The great adventure novel.",
    quotes: ['"All for one and one for all!"'],
  },
  'les-miserables.txt': {
    id: 'les-miserables',
    title: 'Les Misérables',
    author: 'Victor Hugo',
    year: 1862,
    genre: 'Classic',
    difficulty: 5,
    tags: ['Society', 'Historical', 'Classic'],
    gutenbergId: 135,
    firstLine: 'In 1815, M. Charles-François-Bienvenu Myriel was Bishop of D——.',
    description:
      'Jean Valjean steals a loaf of bread and spends his life running from the law, seeking redemption in a world of poverty and revolution. One of the greatest novels ever written.',
    quotes: ['"To love or have loved, that is enough. Ask nothing further."'],
  },
}

const BOOK_HEADINGS = {
  'christmas-carol.txt': { type: 'stave' },
  'wind-in-the-willows.txt': { type: 'numeral' },
  'black-beauty.txt': { type: 'regex', pattern: '^(\\d{2})\\s+(.+)$', prefix: '^\\d{2}\\s+' },
  'scarlet-letter.txt': {
    type: 'titles',
    titles: [
      'THE PRISON DOOR',
      'THE MARKET-PLACE',
      'THE RECOGNITION',
      'THE INTERVIEW',
      'HESTER AT HER NEEDLE',
      'PEARL',
      'THE GOVERNOR’S HALL',
      'THE ELF-CHILD AND THE MINISTER',
      'THE LEECH',
      'THE LEECH AND HIS PATIENT',
      'THE INTERIOR OF A HEART',
      'THE MINISTER’S VIGIL',
      'ANOTHER VIEW OF HESTER',
      'HESTER AND THE PHYSICIAN',
      'HESTER AND PEARL',
      'A FOREST WALK',
      'THE PASTOR AND HIS PARISHIONER',
      'A FLOOD OF SUNSHINE',
      'THE CHILD AT THE BROOKSIDE',
      'THE MINISTER IN A MAZE',
      'THE NEW ENGLAND HOLIDAY',
      'THE PROCESSION',
      'THE REVELATION OF THE SCARLET LETTER',
      'CONCLUSION',
    ],
  },
  'sherlock-holmes.txt': {
    type: 'regex',
    pattern: '^([ivxl\\d]+)\\.\\s+(.+)$',
    prefix: '^[ivxl\\d]+\\.\\s+',
  },
  'memoirs-of-sherlock-holmes.txt': {
    type: 'regex',
    pattern: '^([ivxl\\d]+)\\.\\s+(.+)$',
    prefix: '^[ivxl\\d]+\\.\\s+',
  },
  'return-of-sherlock-holmes.txt': {
    type: 'titles',
    titles: [
      'THE ADVENTURE OF THE EMPTY HOUSE',
      'THE ADVENTURE OF THE NORWOOD BUILDER',
      'THE ADVENTURE OF THE DANCING MEN',
      'THE ADVENTURE OF THE SOLITARY CYCLIST',
      'THE ADVENTURE OF THE PRIORY SCHOOL',
      'THE ADVENTURE OF BLACK PETER',
      'THE ADVENTURE OF CHARLES AUGUSTUS MILVERTON',
      'THE ADVENTURE OF THE SIX NAPOLEONS',
      'THE ADVENTURE OF THE THREE STUDENTS',
      'THE ADVENTURE OF THE GOLDEN PINCE-NEZ',
      'THE ADVENTURE OF THE MISSING THREE-QUARTER',
      'THE ADVENTURE OF THE ABBEY GRANGE',
      'THE ADVENTURE OF THE SECOND STAIN',
    ],
  },
  'grimm-fairy-tales.txt': { type: 'numbered', pattern: '^(\\d+)\\s+(.+)$' },
  'aesop-fables.txt': { type: 'titlecase', toc: false },
  'yellow-wallpaper.txt': { type: 'single' },
  'jungle-book.txt': {
    type: 'titles',
    titles: [
      'Mowgli’s Brothers',
      'Kaa’s Hunting',
      '“Tiger! Tiger!”',
      'The White Seal',
      '“Rikki-Tikki-Tavi”',
      'Toomai of the Elephants',
      'Her Majesty’s Servants',
    ],
  },
  'jekyll-and-hyde.txt': {
    type: 'titles',
    titles: [
      'STORY OF THE DOOR',
      'SEARCH FOR MR. HYDE',
      'DR. JEKYLL WAS QUITE AT EASE',
      'THE CAREW MURDER CASE',
      'INCIDENT OF THE LETTER',
      'INCIDENT OF DR. LANYON',
      'INCIDENT AT THE WINDOW',
      'THE LAST NIGHT',
      'DR. LANYON’S NARRATIVE',
      'HENRY JEKYLL’S FULL STATEMENT OF THE CASE',
    ],
  },
  'just-so-stories.txt': {
    type: 'titles',
    titles: [
      'HOW THE WHALE GOT HIS THROAT',
      'HOW THE CAMEL GOT HIS HUMP',
      'HOW THE RHINOCEROS GOT HIS SKIN',
      'HOW THE LEOPARD GOT HIS SPOTS',
      'THE ELEPHANT’S CHILD',
      'THE SING-SONG OF OLD MAN KANGAROO',
      'THE BEGINNING OF THE ARMADILLOS',
      'HOW THE FIRST LETTER WAS WRITTEN',
      'HOW THE ALPHABET WAS MADE',
      'THE CRAB THAT PLAYED WITH THE SEA',
      'THE CAT THAT WALKED BY HIMSELF',
      'THE BUTTERFLY THAT STAMPED',
    ],
  },
  'frankenstein.txt': { type: 'chapter', include: 'letter' },
}

function bodyLines(raw) {
  const lines = raw.split(/\r?\n/)
  let started = false
  const out = []
  for (const line of lines) {
    if (!started) {
      if (START_LINE.test(line)) started = true
      continue
    }
    if (END_MARKER_LINE.test(line)) break
    out.push(line)
  }
  return out
}

function normalizeHeading(line) {
  return line
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2013]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeTitle(line) {
  const t = line.trim()
  if (t.length === 0) return false
  if (/^\d+$/.test(t)) return false
  if (/[A-Z]/.test(t) && t === t.toUpperCase()) return t.length <= 90
  if (t.length > 50) return false
  if (/[.!?]['"”]?$/.test(t)) return false
  if (!/^[“"'A-Z]/.test(t)) return false
  return true
}

/**
 * Collects the chapter title that follows a heading (skipping blank lines and
 * joining wrapped all-caps titles). Returns null when prose follows directly.
 */
function gatherTitle(lines, fromIndex) {
  const parts = []
  let end = fromIndex - 1
  for (let i = fromIndex; i < lines.length; i += 1) {
    const t = lines[i].trim()
    if (t === '') continue
    if (!looksLikeTitle(t)) break
    parts.push(t.replace(/[.!?]+$/, ''))
    end = i
    if (parts.length >= 3) break
  }
  return {
    title: parts.length > 0 ? parts.join(' ').trim() : null,
    end,
  }
}

const ROMAN_DIGITS = { i: 1, v: 5, x: 10, l: 50, c: 100 }
const NUMBER_WORD_VALUE = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
}

function ordinalValue(token) {
  const t = String(token ?? '').toLowerCase()
  if (/^\d+$/.test(t)) return Number(t)
  if (/^[ivxlcdm]+$/.test(t)) {
    let total = 0
    for (let i = 0; i < t.length; i += 1) {
      const cur = ROMAN_DIGITS[t[i]] ?? 0
      const next = ROMAN_DIGITS[t[i + 1]] ?? 0
      total += cur < next ? -cur : cur
    }
    return total
  }
  return NUMBER_WORD_VALUE[t] ?? NaN
}

/** True when the numeric part of core `b` directly follows the numeric part of core `a`. */
function corePrecedes(a, b) {
  const av = ordinalValue(a.split(/\s+/).at(-1))
  const bv = ordinalValue(b.split(/\s+/).at(-1))
  return Number.isInteger(av) && Number.isInteger(bv) && av + 1 === bv
}

function makeMatcher(headingConfig) {
  const type = headingConfig.type ?? 'auto'
  const trim = (line) => line.trim()

  if (type === 'titles') {
    const titles = (headingConfig.titles ?? []).map(normalizeHeading)
    return {
      isHeading(rawLine) {
        if (rawLine.charAt(0) === ' ') return false
        const t = trim(rawLine)
        if (/[.!?]['"”]?$/.test(t)) return false
        return titles.includes(normalizeHeading(t))
      },
      core(rawLine) {
        return `title ${normalizeHeading(trim(rawLine))}`
      },
      sameLineTitle(rawLine) {
        return trim(rawLine)
      },
      defaultTitle(rawLine) {
        return trim(rawLine)
      },
    }
  }

  if (type === 'regex' || type === 'numbered') {
    const re = new RegExp(headingConfig.pattern, 'i')
    const numbered = type === 'numbered'
    return {
      isHeading(rawLine) {
        if (numbered && rawLine.charAt(0) === ' ') return false
        return re.test(trim(rawLine))
      },
      core(rawLine) {
        const m = trim(rawLine).match(re)
        return `${numbered ? 'num' : 'regex'} ${m?.[1]?.toLowerCase() ?? ''}`
      },
      sameLineTitle(rawLine) {
        const line = trim(rawLine)
        if (headingConfig.prefix !== undefined) {
          return line.replace(new RegExp(headingConfig.prefix, 'i'), '')
        }
        return (line.match(re)?.[2] ?? '').trim()
      },
      defaultTitle(rawLine) {
        const m = trim(rawLine).match(re)
        return numbered ? `Tale ${m?.[1] ?? ''}` : trim(rawLine)
      },
      toc: headingConfig.toc !== false,
    }
  }

  if (type === 'single') {
    return {
      isHeading() {
        return false
      },
      core() {
        return 'single'
      },
      sameLineTitle() {
        return null
      },
      defaultTitle() {
        return null
      },
      single: true,
    }
  }

  if (type === 'titlecase') {
    return {
      isHeading(rawLine, index, lines) {
        if (rawLine.charAt(0) === ' ') return false
        const t = trim(rawLine)
        if (t.length < 10 || t.length > 55) return false
        if (/[.!?]$/.test(t)) return false
        if (!/^[A-Z]/.test(t)) return false
        if (t === t.toUpperCase()) return false
        if (t.split(/\s+/).filter(Boolean).length < 2) return false
        const prev = index > 0 ? trim(lines[index - 1]) : ''
        return prev === ''
      },
      core(rawLine) {
        return `titlecase ${normalizeHeading(trim(rawLine))}`
      },
      sameLineTitle(rawLine) {
        return trim(rawLine)
      },
      defaultTitle(rawLine) {
        return trim(rawLine)
      },
      toc: headingConfig.toc !== false,
    }
  }

  const chapterPattern =
    type === 'stave'
      ? STAVE_RE
      : type === 'numeral'
        ? NUMERAL_RE
        : new RegExp(
            chapterPatternSource(`chapter${headingConfig.include === 'letter' ? '|letter' : ''}`),
            'i',
          )

  const isHeading =
    type === 'stave'
      ? (rawLine) => STAVE_RE.test(trim(rawLine))
      : type === 'numeral'
        ? (rawLine) => NUMERAL_RE.test(trim(rawLine))
        : (rawLine) => chapterPattern.test(trim(rawLine))

  return {
    isHeading,
    core(rawLine) {
      const line = trim(rawLine)
      if (type === 'stave') {
        const m = line.match(STAVE_RE)
        return `stave ${m?.[1]?.toLowerCase() ?? ''}`
      }
      if (type === 'numeral') {
        return `numeral ${line.replace(/[.\s]/g, '').toLowerCase()}`
      }
      const m = line.match(chapterPattern)
      const head =
        headingConfig.include === 'letter' && /^letter/i.test(line) ? 'letter' : 'chapter'
      return `${head} ${m?.[1]?.toLowerCase() ?? ''}`
    },
    sameLineTitle(rawLine) {
      const line = trim(rawLine)
      if (type === 'stave') {
        const m = line.match(STAVE_RE)
        const t = m?.[2]?.trim()
        return t && t.length > 0 ? t : null
      }
      if (type === 'numeral') return null
      const m = line.match(chapterPattern)
      const t = (m?.[3] ?? m?.[4])?.trim().replace(/[\].]+$/u, '')
      return t && t.length > 0 ? t : null
    },
    defaultTitle(rawLine) {
      const line = trim(rawLine)
      if (type === 'numeral') {
        const num = line.replace(/[.\s]/g, '')
        return `Chapter ${num.toUpperCase()}`
      }
      if (type === 'stave') {
        const m = line.match(STAVE_RE)
        return `Stave ${m?.[1] ?? ''}`
      }
      const m = line.match(chapterPattern)
      const num = m?.[1] ?? ''
      if (/^the\s+last$/i.test(num)) return 'The Last Chapter'
      const head =
        headingConfig.include === 'letter' && /^letter/i.test(line) ? 'Letter' : 'Chapter'
      return `${head} ${num}`
    },
  }
}

function detectHeadingConfig(lines, bookKey) {
  const forced = BOOK_HEADINGS[bookKey]
  if (forced !== undefined) return forced

  const count = (re) => lines.filter((line) => re.test(line.trim())).length
  if (count(CHAPTER_RE) >= 3) return { type: 'chapter' }
  if (count(NUMERAL_RE) >= 3) return { type: 'numeral' }
  if (count(STAVE_RE) >= 2) return { type: 'stave' }
  throw new Error(`[gen:library] Cannot detect chapter headings in "${bookKey}"`)
}

/**
 * Splits a book into chapters, skipping a leading table of contents.
 *
 * A TOC is a run of tightly packed headings at the very start of the body. Its
 * final entry is still a TOC entry when the same chapter number shows up again
 * later in the book (the real chapter repeats the heading). Chapters whose
 * numbering restarts mid-book are never mistaken for a TOC because their first
 * heading is not packed. Books with many very short sections (fables) disable
 * this via `toc: false`.
 */
function splitChapters(lines, matcher) {
  const indices = []
  for (let i = 0; i < lines.length; i += 1) {
    if (matcher.isHeading(lines[i], i, lines)) indices.push(i)
  }

  const skip = new Set()

  if (matcher.single === true) {
    return [{ title: '', lines }]
  }

  if (matcher.toc !== false && indices.length > 0) {
    const cores = indices.map((i) => matcher.core(lines[i]))
    let runEnd = 0
    while (runEnd + 1 < indices.length && indices[runEnd + 1] - indices[runEnd] < TOC_GAP) {
      runEnd += 1
    }
    if (runEnd > 0) {
      for (let k = 0; k <= runEnd; k += 1) {
        const next = indices[k + 1]
        const packed = next !== undefined && next - indices[k] < TOC_GAP
        const lastEntry =
          k === runEnd &&
          cores.slice(runEnd + 1).includes(cores[k]) &&
          !corePrecedes(cores[k], cores[runEnd + 1] ?? '')
        if (packed || lastEntry) skip.add(indices[k])
      }
    }
  }

  const chapters = []
  let current = null

  const flush = () => {
    if (current !== null && current.lines.length > 0) chapters.push(current)
    current = null
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (skip.has(i)) continue
    const line = lines[i]
    if (matcher.isHeading(line, i, lines)) {
      flush()
      const sameLine = matcher.sameLineTitle(line)
      let title = sameLine
      let end = i
      if (title === null) {
        const gathered = gatherTitle(lines, i + 1)
        title = gathered.title
        end = gathered.end
      }
      current = {
        title: title ?? matcher.defaultTitle(line),
        lines: [],
      }
      i = end
      continue
    }
    if (current !== null) {
      current.lines.push(lines[i])
    }
  }
  flush()
  return chapters
}

function collectParagraphs(lines) {
  const paragraphs = []
  let current = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (line.length === 0 || END_LINE.test(line) || SEPARATOR_RE.test(line)) {
      if (current.length > 0) {
        paragraphs.push(joinParagraph(current))
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) paragraphs.push(joinParagraph(current))
  return paragraphs
}

function joinParagraph(lines) {
  return (
    lines
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/ ([,.;:!?'”])/g, '$1')
      .replace(/([“‘(])\s/g, '$1')
      // Strip Project Gutenberg _emphasis_ markers; some span paragraphs,
      // so drop any leftover lone underscores afterwards.
      .replace(/_([^_]*)_/g, '$1')
      .replace(/_/g, '')
      .trim()
  )
}

function groupSections(chapters) {
  let chapterIndex = 0
  let sectionIndex = 0
  return chapters.map((chapter) => {
    chapterIndex += 1
    sectionIndex = 0
    const paragraphs = collectParagraphs(chapter.lines)
    const sections = []
    for (let i = 0; i < paragraphs.length; i += SECTION_SIZE) {
      sectionIndex += 1
      sections.push({
        id: `s${chapterIndex}-${sectionIndex}`,
        paragraphs: paragraphs.slice(i, i + SECTION_SIZE),
      })
    }
    return {
      id: `c${chapterIndex}`,
      title: chapter.title,
      sections,
    }
  })
}

function wordsOf(text) {
  return text.match(/[a-z']+/gi)?.length ?? 0
}

function buildBook(file) {
  const meta = METADATA[file]
  if (meta === undefined) {
    console.warn(`[gen:library] Skipping "${file}" (no metadata entry)`)
    return undefined
  }
  const raw = readFileSync(join(BOOKS_DIR, file), 'utf8')
  const lines = bodyLines(raw)
  const headingConfig = detectHeadingConfig(lines, file)
  const matcher = makeMatcher(headingConfig)
  const split = splitChapters(lines, matcher)
  if (headingConfig.type === 'single' && split.length > 0) {
    split[0].title = meta.title
  }
  const chapters = groupSections(split)
  if (chapters.length === 0) {
    throw new Error(`[gen:library] No chapters found in "${file}"`)
  }

  const allText = chapters
    .flatMap((chapter) => chapter.sections)
    .flatMap((section) => section.paragraphs)
    .join(' ')

  const book = {
    id: meta.id,
    title: meta.title,
    author: meta.author,
    year: meta.year,
    genre: meta.genre,
    difficulty: meta.difficulty,
    description: meta.description,
    tags: meta.tags,
    source: 'Project Gutenberg',
    words: wordsOf(allText),
    ...(meta.gutenbergId !== undefined && { gutenbergId: meta.gutenbergId }),
    ...(meta.firstLine !== undefined && { firstLine: meta.firstLine }),
    ...(meta.quotes !== undefined && { quotes: meta.quotes }),
    chapters,
  }

  return {
    book,
    index: {
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      genre: book.genre,
      difficulty: book.difficulty,
      description: book.description,
      tags: book.tags,
      source: book.source,
      words: book.words,
      chapters: book.chapters.length,
      sections: book.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      ...(book.gutenbergId !== undefined && { gutenbergId: book.gutenbergId }),
    },
  }
}

const files = readdirSync(BOOKS_DIR).filter((file) => file.endsWith('.txt'))
if (files.length === 0) {
  throw new Error('[gen:library] No .txt books found in scripts/books/ (see README)')
}

const built = files.map(buildBook).filter((entry) => entry !== undefined)

mkdirSync(OUT_DIR, { recursive: true })
for (const { book } of built) {
  writeFileSync(join(OUT_DIR, `${book.id}.json`), `${JSON.stringify(book, null, 2)}\n`)
}
writeFileSync(
  OUT_FILE,
  `${JSON.stringify(
    built.map((entry) => entry.index),
    null,
    2,
  )}\n`,
)

const totalWords = built.reduce((sum, entry) => sum + (entry.book.words ?? 0), 0)
console.log(
  `[gen:library] Wrote ${built.length} books / ${totalWords.toLocaleString('en-US')} words (index + per-book files)`,
)
