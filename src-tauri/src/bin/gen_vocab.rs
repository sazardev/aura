//! Generates the giant vocabulary bank and the course expansion from the real
//! engines: the full WordNet database (custom reader, see `wordnet_db`) and the
//! SUBTLEX-US frequency corpus. Run via `npm run gen:vocab`.

use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use aura_lib::wordnet_db::WordNet;

fn vocab_top_n() -> usize {
    std::env::var("VOCAB_LIMIT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(5000)
}

/// Course expansion: scan a wide frequency window, collect words that carry a
/// usable WordNet example, then split them into units of lessons.
const UNIT_LESSONS: usize = 3;
const LESSON_SIZE: usize = 5;
const EXPANSION_UNITS: usize = 6;
const UNIT_ICONS: &[(&str, &str)] = &[
    ("core-1", "Sparkles"),
    ("core-2", "MessageSquare"),
    ("core-3", "Mic"),
    ("core-4", "Brain"),
    ("core-5", "Waves"),
    ("core-6", "Rocket"),
];

#[derive(Deserialize)]
struct SubtlexEntry {
    word: String,
}

#[derive(Serialize)]
struct VocabEntry {
    word: String,
    meaning: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    example: Option<String>,
    pos: String,
    synonyms: Vec<String>,
    rank: usize,
    tier: String,
}

#[derive(Serialize)]
struct ExpansionWord {
    word: String,
    meaning: String,
    sentence: String,
}

#[derive(Serialize)]
struct ExpansionLesson {
    id: String,
    title: String,
    #[serde(rename = "type")]
    kind: &'static str,
    words: Vec<ExpansionWord>,
}

#[derive(Serialize)]
struct ExpansionUnit {
    id: String,
    title: String,
    icon: String,
    color: String,
    lessons: Vec<ExpansionLesson>,
}

fn manifest() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn project_root() -> PathBuf {
    manifest().join("..")
}

fn tier_for(rank: usize) -> &'static str {
    if rank <= 1000 {
        "very-common"
    } else if rank <= 3000 {
        "common"
    } else if rank <= 8000 {
        "uncommon"
    } else if rank <= 25_000 {
        "rare"
    } else {
        "very-rare"
    }
}

/// Best sense for teaching: first sense with a non-empty definition.
fn best_sense(senses: &[aura_lib::wordnet_db::Sense]) -> Option<&aura_lib::wordnet_db::Sense> {
    senses
        .iter()
        .find(|sense| !sense.gloss.is_empty())
        .or_else(|| senses.first())
}

fn build_vocab(db: &WordNet, entries: &[SubtlexEntry], top_n: usize) -> Vec<VocabEntry> {
    let mut out = Vec::new();
    for (rank, entry) in entries.iter().take(top_n).enumerate() {
        if rank % 500 == 0 {
            eprintln!("  … word {rank}/{top_n}");
        }
        let rank = rank + 1;
        let word = entry.word.to_lowercase();
        if word.is_empty() || word.contains(char::is_whitespace) {
            continue;
        }
        let senses = db.senses(&word);
        let Some(sense) = best_sense(&senses) else {
            continue;
        };
        if sense.gloss.is_empty() {
            continue;
        }
        let mut synonyms = sense
            .synonyms
            .iter()
            .map(|s| s.to_lowercase())
            .filter(|s| s != &word)
            .collect::<Vec<_>>();
        synonyms.truncate(5);
        out.push(VocabEntry {
            word,
            meaning: sense.gloss.clone(),
            example: sense.examples.first().cloned(),
            pos: sense.part_of_speech.clone(),
            synonyms,
            rank,
            tier: tier_for(rank).to_string(),
        });
    }
    out
}

/// Words that should never appear in the course (profanity, insults, explicit
/// or otherwise inappropriate for an English-learning course).
const VULGAR_WORDS: &[&str] = &[
    "ass", "arse", "buns", "fanny", "butt", "shit", "crap", "damn", "hell", "bitch", "bastard",
    "dick", "cock", "pussy", "cunt", "fuck", "whore", "slut", "porn", "nude", "penis", "vagina",
    "anus", "boob", "tits", "stupid", "dumb", "idiot", "moron", "jerk", "douche", "boner", "fart",
    "wank", "orgasm",
];

/// Text fragments that disqualify a sense (gloss or example) as a teaching
/// sentence, even when the headword itself is innocuous.
const VULGAR_FRAGMENTS: &[&str] = &[
    "fuck",
    "shit",
    "cunt",
    "pussy",
    "penis",
    "vagina",
    "anus",
    "anal ",
    "porn",
    "masturbat",
    "whore",
    "slut",
    "bastard",
    "boner",
    "wank",
    "intercourse",
    "erection",
    "excrement",
    "feces",
    "prostitut",
    "buttock",
];

fn is_vulgar_word(word: &str) -> bool {
    VULGAR_WORDS.contains(&word)
}

fn is_vulgar_text(text: &str) -> bool {
    let lower = text.to_lowercase();
    VULGAR_FRAGMENTS
        .iter()
        .any(|fragment| lower.contains(fragment))
}

/// Alphanumeric lowercase key used to compare words, meanings and sentences.
fn normalize_key(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}

/// True when `sentence` mentions `word` or a common inflection of it.
fn mentions_word(sentence: &str, word: &str) -> bool {
    let norm = normalize_key(sentence);
    let base = normalize_key(word);
    if base.is_empty() {
        return false;
    }
    if norm.contains(&base) {
        return true;
    }
    ["s", "es", "d", "ed", "ing"]
        .iter()
        .any(|suffix| norm.contains(&format!("{base}{suffix}")))
}

/// Capitalizes and punctuates a raw WordNet example.
fn clean_sentence(raw: &str) -> String {
    let trimmed = raw
        .trim()
        .trim_matches(|c| c == '"' || c == '\'' || c == '\u{201c}' || c == '\u{201d}');
    let mut sentence = trimmed.trim().to_string();
    if let Some(first) = sentence.chars().next() {
        let upper = first.to_ascii_uppercase();
        sentence.replace_range(0..first.len_utf8(), &upper.to_string());
    }
    if !sentence.ends_with(['.', '!', '?']) {
        sentence.push('.');
    }
    sentence
}

/// Simple, always-correct scaffolding sentence that contains the word.
#[derive(Clone)]
struct ExpansionCandidate {
    word: String,
    meaning: String,
    sentence: String,
}

/// Picks the best teachable sense for `word`. Only senses backed by a real
/// WordNet example that actually mentions the word are used, so every lesson
/// sentence is a natural, self-explanatory sentence (and the tap exercise has
/// a blank to fill). Vulgar senses are never used.
fn pick_expansion_candidate(db: &WordNet, word: &str) -> Option<ExpansionCandidate> {
    let senses = db.senses(word);
    for sense in &senses {
        if sense.gloss.trim().is_empty() || is_vulgar_text(&sense.gloss) {
            continue;
        }
        if let Some(example) = sense
            .examples
            .iter()
            .find(|example| !is_vulgar_text(example) && mentions_word(example, word))
        {
            return Some(ExpansionCandidate {
                word: word.to_string(),
                meaning: sense.gloss.clone(),
                sentence: clean_sentence(example),
            });
        }
    }
    None
}

fn build_expansion(
    db: &WordNet,
    entries: &[SubtlexEntry],
    excluded: &HashSet<String>,
) -> Vec<ExpansionUnit> {
    let total_needed = EXPANSION_UNITS * UNIT_LESSONS * LESSON_SIZE;
    let mut usable: Vec<ExpansionCandidate> = Vec::new();
    let mut used_words: HashSet<String> = excluded.clone();
    let mut used_meanings: HashSet<String> = HashSet::new();

    for entry in entries.iter().skip(50) {
        if usable.len() >= total_needed {
            break;
        }
        let word = entry.word.to_lowercase();
        if used_words.contains(&word)
            || word.contains(char::is_whitespace)
            || word.chars().count() < 3
            || is_vulgar_word(&word)
        {
            continue;
        }
        let Some(candidate) = pick_expansion_candidate(db, &word) else {
            continue;
        };
        let meaning_key = normalize_key(&candidate.meaning);
        if used_meanings.contains(&meaning_key) {
            continue;
        }
        used_words.insert(word.clone());
        used_meanings.insert(meaning_key);
        usable.push(candidate);
    }

    eprintln!(
        "  collected {} usable expansion words (needed {total_needed})",
        usable.len()
    );

    let mut units = Vec::new();
    let mut cursor = 0;
    for unit_index in 0..EXPANSION_UNITS {
        let mut lessons = Vec::new();
        for lesson_index in 0..UNIT_LESSONS {
            let chunk = usable
                .iter()
                .skip(cursor)
                .take(LESSON_SIZE)
                .cloned()
                .collect::<Vec<_>>();
            if chunk.len() < LESSON_SIZE {
                cursor += LESSON_SIZE;
                break;
            }
            cursor += LESSON_SIZE;
            lessons.push(ExpansionLesson {
                id: format!("core-{}-{}", unit_index + 1, lesson_index + 1),
                title: format!("Lesson {}", lesson_index + 1),
                kind: if lesson_index % 2 == 0 {
                    "lesson"
                } else {
                    "quiz"
                },
                words: chunk
                    .into_iter()
                    .map(|candidate| ExpansionWord {
                        word: candidate.word,
                        meaning: candidate.meaning,
                        sentence: candidate.sentence,
                    })
                    .collect(),
            });
        }

        if lessons.len() != UNIT_LESSONS {
            break;
        }

        let icon = UNIT_ICONS
            .get(unit_index)
            .map(|e| e.1)
            .unwrap_or("Sparkles");
        units.push(ExpansionUnit {
            id: format!("core-{}", unit_index + 1),
            title: format!("Core Words {}", unit_index + 1),
            icon: icon.to_string(),
            color: "#1cb0f6".to_string(),
            lessons,
        });
    }
    units
}

fn main() {
    let root = project_root();
    let wn_dir = manifest().join("resources").join("wn");
    let subtlex_path = root
        .join("node_modules")
        .join("subtlex-word-frequencies")
        .join("index.json");
    let base_course_path = root.join("src").join("data").join("course.json");
    let vocab_out = root.join("src").join("data").join("vocabulary.json");
    let expansion_out = root.join("src").join("data").join("course-expansion.json");

    if !wn_dir.join("index.noun").exists() {
        panic!("WordNet data not found at {wn_dir:?}. Run `npm run copy:wn` first.");
    }
    if !subtlex_path.exists() {
        panic!("SUBTLEX data not found at {subtlex_path:?}. Run `npm install` first.");
    }

    println!("Opening WordNet from {:?}…", wn_dir);
    let db = WordNet::open(&wn_dir).expect("could not open WordNet");

    let subtlex: Vec<SubtlexEntry> =
        serde_json::from_slice(&fs::read(&subtlex_path).expect("read subtlex"))
            .expect("parse subtlex");
    println!("SUBTLEX entries: {}", subtlex.len());

    // Excluded words: already present in the hand-authored base course.
    let base: Value = serde_json::from_slice(&fs::read(&base_course_path).expect("read course"))
        .expect("parse base course");
    let mut excluded = HashSet::new();
    if let Some(units) = base.as_array() {
        for unit in units {
            if let Some(lessons) = unit.get("lessons").and_then(Value::as_array) {
                for lesson in lessons {
                    if let Some(words) = lesson.get("words").and_then(Value::as_array) {
                        for word in words {
                            if let Some(w) = word.get("word").and_then(Value::as_str) {
                                excluded.insert(w.to_lowercase());
                            }
                        }
                    }
                }
            }
        }
    }
    println!("Base course words to exclude: {}", excluded.len());

    let top_n = vocab_top_n();
    println!("Building vocabulary bank (top {top_n} words)…");
    let vocab = build_vocab(&db, &subtlex, top_n);
    fs::write(
        &vocab_out,
        serde_json::to_string_pretty(&vocab).expect("serialize vocab"),
    )
    .expect("write vocab");
    println!("  -> {} entries written to {:?}", vocab.len(), vocab_out);

    println!("Building course expansion…");
    let expansion = build_expansion(&db, &subtlex, &excluded);
    fs::write(
        &expansion_out,
        serde_json::to_string_pretty(&expansion).expect("serialize expansion"),
    )
    .expect("write expansion");
    let lesson_count: usize = expansion.iter().map(|u| u.lessons.len()).sum();
    println!(
        "  -> {} units, {} lessons written to {:?}",
        expansion.len(),
        lesson_count,
        expansion_out
    );

    println!(
        "Done. Total words in bank: {}, expansion words: {}",
        vocab.len(),
        lesson_count * LESSON_SIZE
    );
}
