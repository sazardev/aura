use std::sync::Mutex;

use tauri::{Manager, State};
use wordnet::{Database, Relationship};

struct AppState {
    wordnet: Mutex<Option<Database>>,
}

#[derive(serde::Serialize)]
struct SenseOut {
    part_of_speech: String,
    gloss: String,
    synonyms: Vec<String>,
    antonyms: Vec<String>,
    hypernyms: Vec<String>,
    hyponyms: Vec<String>,
    examples: Vec<String>,
}

#[derive(serde::Serialize)]
struct LookupOut {
    word: String,
    senses: Vec<SenseOut>,
}

fn push_words(target: &mut Vec<String>, source: &[wordnet::SenseRef]) {
    for entry in source {
        let word = entry.word.clone();
        if !target.contains(&word) {
            target.push(word);
        }
    }
}

fn limit(mut words: Vec<String>, max: usize) -> Vec<String> {
    words.truncate(max);
    words
}

/// Looks up a word in the full WordNet (index + data) shipped as an app
/// resource. Loads the database lazily on first use.
#[tauri::command]
fn lookup_word(
    word: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<LookupOut, String> {
    let mut guard = state
        .wordnet
        .lock()
        .map_err(|error| format!("Internal dictionary error: {error}"))?;

    if guard.is_none() {
        let resource_dir = app
            .path()
            .resolve("wn", tauri::path::BaseDirectory::Resource)
            .map_err(|error| format!("Could not locate the dictionary: {error}"))?;
        let database = Database::open(&resource_dir)
            .map_err(|error| format!("Could not open WordNet: {error}"))?;
        *guard = Some(database);
    }

    let database = guard
        .as_ref()
        .ok_or_else(|| "The dictionary is not available".to_string())?;

    let senses = database.senses(&word);

    let senses_out: Vec<SenseOut> = senses
        .iter()
        .map(|sense| {
            let mut synonyms = Vec::new();
            let mut antonyms = Vec::new();
            let mut hypernyms = Vec::new();
            let mut hyponyms = Vec::new();

            for entry in &sense.synonyms {
                synonyms.push(entry.word.clone());
            }

            for pointer in &sense.pointers {
                let related = pointer.read();
                match pointer.relationship {
                    Relationship::Antonym => push_words(&mut antonyms, &related.synonyms),
                    Relationship::Hypernym | Relationship::InstanceHypernym => {
                        push_words(&mut hypernyms, &related.synonyms)
                    }
                    Relationship::Hyponym => push_words(&mut hyponyms, &related.synonyms),
                    _ => {}
                }
            }

            let mut examples = Vec::new();
            for part in sense.gloss.split(';') {
                let part = part.trim();
                if part.starts_with('"') && part.ends_with('"') && part.len() > 2 {
                    examples.push(part[1..part.len() - 1].to_string());
                }
            }

            SenseOut {
                part_of_speech: sense.part_of_speech.short().to_string(),
                gloss: sense.gloss.clone(),
                synonyms: limit(synonyms, 8),
                antonyms: limit(antonyms, 8),
                hypernyms: limit(hypernyms, 8),
                hyponyms: limit(hyponyms, 8),
                examples: limit(examples, 3),
            }
        })
        .collect();

    Ok(LookupOut {
        word: word.to_lowercase(),
        senses: senses_out,
    })
}

/// Reads a text file selected by the user (via the dialog plugin).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|error| format!("Could not read the file: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            wordnet: Mutex::new(None),
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![lookup_word, read_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
