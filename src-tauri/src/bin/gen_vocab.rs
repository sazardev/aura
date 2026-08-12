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
const UNIT_EMOJIS: &[(&str, &str)] = &[
    ("core-1", "🔤"),
    ("core-2", "💬"),
    ("core-3", "🗣️"),
    ("core-4", "🧠"),
    ("core-5", "🌊"),
    ("core-6", "🚀"),
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
    emoji: String,
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

fn build_expansion(
    db: &WordNet,
    entries: &[SubtlexEntry],
    excluded: &HashSet<String>,
) -> Vec<ExpansionUnit> {
    let total_needed = EXPANSION_UNITS * UNIT_LESSONS * LESSON_SIZE;
    let mut usable: Vec<(usize, &SubtlexEntry, String, String)> = Vec::new();
    let mut used_words: HashSet<String> = excluded.clone();

    for (index, entry) in entries.iter().enumerate().skip(50) {
        if usable.len() >= total_needed {
            break;
        }
        let word = entry.word.to_lowercase();
        if used_words.contains(&word) || word.contains(char::is_whitespace) {
            continue;
        }
        let senses = db.senses(&word);
        let Some(sense) = best_sense(&senses) else {
            continue;
        };
        let Some(sentence) = sense.examples.first().cloned() else {
            continue;
        };
        if sense.gloss.is_empty() {
            continue;
        }
        used_words.insert(word.clone());
        usable.push((index + 1, entry, sense.gloss.clone(), sentence));
    }

    eprintln!(
        "  collected {} usable expansion words (needed {total_needed})",
        usable.len()
    );

    let mut units = Vec::new();
    for unit_index in 0..EXPANSION_UNITS {
        let unit_words = usable
            .iter()
            .skip(unit_index * UNIT_LESSONS * LESSON_SIZE)
            .take(UNIT_LESSONS * LESSON_SIZE)
            .cloned()
            .collect::<Vec<_>>();
        if unit_words.len() < LESSON_SIZE {
            break;
        }

        let mut lessons = Vec::new();
        for lesson_index in 0..UNIT_LESSONS {
            let chunk: Vec<_> = unit_words
                .iter()
                .skip(lesson_index * LESSON_SIZE)
                .take(LESSON_SIZE)
                .cloned()
                .collect();
            if chunk.is_empty() {
                break;
            }
            let words = chunk
                .iter()
                .map(|(_, entry, meaning, sentence)| ExpansionWord {
                    word: entry.word.to_lowercase(),
                    meaning: meaning.clone(),
                    sentence: sentence.clone(),
                })
                .collect::<Vec<_>>();
            lessons.push(ExpansionLesson {
                id: format!("core-{}-{}", unit_index + 1, lesson_index + 1),
                title: format!("Lesson {}", lesson_index + 1),
                kind: if lesson_index % 2 == 0 {
                    "lesson"
                } else {
                    "quiz"
                },
                words,
            });
        }

        if !lessons.is_empty() {
            let emoji = UNIT_EMOJIS.get(unit_index).map(|e| e.1).unwrap_or("📚");
            units.push(ExpansionUnit {
                id: format!("core-{}", unit_index + 1),
                title: format!("Core Words {}", unit_index + 1),
                emoji: emoji.to_string(),
                color: "#1cb0f6".to_string(),
                lessons,
            });
        }
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
    println!("  → {} entries written to {:?}", vocab.len(), vocab_out);

    println!("Building course expansion…");
    let expansion = build_expansion(&db, &subtlex, &excluded);
    fs::write(
        &expansion_out,
        serde_json::to_string_pretty(&expansion).expect("serialize expansion"),
    )
    .expect("write expansion");
    let lesson_count: usize = expansion.iter().map(|u| u.lessons.len()).sum();
    println!(
        "  → {} units, {} lessons written to {:?}",
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
