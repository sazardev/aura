use std::path::Path;
use std::sync::Mutex;

use tauri::{Manager, State};

pub mod wordnet_db;

use wordnet_db::WordNet;

struct AppState {
    wordnet: Mutex<Option<WordNet>>,
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
        let database = WordNet::open(&resource_dir)
            .map_err(|error| format!("Could not open WordNet: {error}"))?;
        *guard = Some(database);
    }

    let database = guard
        .as_ref()
        .ok_or_else(|| "The dictionary is not available".to_string())?;

    let senses_out: Vec<SenseOut> = database
        .senses(&word)
        .into_iter()
        .map(|sense| SenseOut {
            part_of_speech: sense.part_of_speech,
            gloss: sense.gloss,
            synonyms: sense.synonyms,
            antonyms: sense.antonyms,
            hypernyms: sense.hypernyms,
            hyponyms: sense.hyponyms,
            examples: sense.examples,
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

/// Reads a document selected by the user: extracts text from PDFs and reads
/// plain text files (txt, md, etc.).
#[tauri::command]
fn read_document_text(path: String) -> Result<String, String> {
    let extension = Path::new(&path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match extension.as_str() {
        "pdf" => pdf_extract::extract_text(&path)
            .map_err(|error| format!("Could not parse the PDF: {error}")),
        _ => std::fs::read_to_string(&path)
            .map_err(|error| format!("Could not read the file: {error}")),
    }
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
        .invoke_handler(tauri::generate_handler![
            lookup_word,
            read_text_file,
            read_document_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
