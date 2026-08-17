use std::path::Path;
use std::process::{Child, Command};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{Manager, State};

pub mod wordnet_db;

use wordnet_db::WordNet;

/// The currently running TTS child process, if any. A generation counter
/// distinguishes the active process from a reaper still finishing a previous
/// one.
static TTS_CHILD: Mutex<Option<(u64, Child)>> = Mutex::new(None);
static TTS_GENERATION: AtomicU64 = AtomicU64::new(0);

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

/* ----------
Offline text-to-speech fallback
----------
WebKitGTK (the Tauri webview on Linux) does not implement the Web Speech API,
so `speechSynthesis` is missing there and the app is silent. This fallback
speaks through the OS speech engine instead: speech-dispatcher (`spd-say`) or
`espeak`/`espeak-ng` on Linux, `say` on macOS, and the Windows built-in
`System.Speech` via PowerShell. The frontend only calls it when
`speechSynthesis` is unavailable, so platforms with native Web Speech never
use it.
*/

/// Returns true if a system speech engine is available to the fallback.
#[tauri::command]
fn tts_available() -> bool {
    tts_command("probe", 1.0).is_some()
}

/// Speaks text through the system speech engine. Fire-and-forget: returns
/// immediately and the audio plays in a detached process that `stop_speech`
/// can cancel.
#[tauri::command]
fn speak_text(text: String, rate: f64) -> Result<(), String> {
    stop_speech_impl();

    let mut command = tts_command(&text, rate).ok_or_else(|| {
        "No speech engine found — install speech-dispatcher or espeak-ng".to_string()
    })?;
    let child = command
        .spawn()
        .map_err(|error| format!("Could not start the speech engine: {error}"))?;

    let generation = TTS_GENERATION.fetch_add(1, Ordering::SeqCst);
    *TTS_CHILD
        .lock()
        .map_err(|_| "TTS lock poisoned".to_string())? = Some((generation, child));

    std::thread::spawn(reap_speech);
    Ok(())
}

/// Cancels any speech currently being played by the fallback.
#[tauri::command]
fn stop_speech() -> Result<(), String> {
    stop_speech_impl();
    Ok(())
}

fn stop_speech_impl() {
    if let Ok(mut guard) = TTS_CHILD.lock() {
        if let Some((_, mut child)) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

/// Waits for the current speech process to finish, then clears it from the
/// slot so a finished process is not killed on the next speak.
fn reap_speech() {
    loop {
        let exit = {
            let Ok(mut guard) = TTS_CHILD.lock() else {
                return;
            };
            match guard.as_mut().and_then(|(generation, child)| {
                (*generation == TTS_GENERATION.load(Ordering::SeqCst)).then_some(child)
            }) {
                None => return,
                Some(child) => child.try_wait(),
            }
        };
        match exit {
            Ok(Some(_)) => {
                if let Ok(mut guard) = TTS_CHILD.lock() {
                    if let Some((generation, mut child)) = guard.take() {
                        if generation == TTS_GENERATION.load(Ordering::SeqCst) {
                            let _ = child.wait();
                        }
                    }
                }
                return;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(120)),
            Err(_) => return,
        }
    }
}

/// Builds the OS speech command for the platform, or None when no engine is
/// installed. `probe` is a throwaway argument; the command is only built, not
/// run, so this cheaply checks availability.
fn tts_command(text: &str, rate: f64) -> Option<Command> {
    let rate = rate.clamp(0.5, 2.0);

    #[cfg(target_os = "linux")]
    {
        if find_in_path("spd-say") {
            let mut command = Command::new("spd-say");
            command
                .arg(format!("-r{}", (rate * 100.0) as i32))
                .arg("-w")
                .arg(text);
            Some(command)
        } else {
            ["espeak-ng", "espeak"]
                .iter()
                .copied()
                .find(|name| find_in_path(name))
                .map(|binary| {
                    let mut command = Command::new(binary);
                    command
                        .arg(format!("-s{}", (rate * 175.0) as i32))
                        .arg(text);
                    command
                })
        }
    }

    #[cfg(target_os = "macos")]
    {
        if find_in_path("say") {
            let mut command = Command::new("say");
            command
                .arg(format!("-r{}", (rate * 175.0) as i32))
                .arg(text);
            Some(command)
        } else {
            None
        }
    }

    #[cfg(target_os = "windows")]
    {
        if find_in_path("powershell") {
            let mut command = Command::new("powershell");
            command.arg("-NoProfile").arg("-Command").arg(format!(
                "Add-Type -AssemblyName System.Speech; \
                 $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; \
                 $s.Rate = {}; \
                 $s.Speak('{}');",
                ((rate - 1.0) * 10.0).round() as i32,
                text.replace('\'', "''")
            ));
            Some(command)
        } else {
            None
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        None
    }
}

/// True when a binary with the given name exists on PATH.
fn find_in_path(name: &str) -> bool {
    std::env::var_os("PATH")
        .map(|paths| std::env::split_paths(&paths).any(|dir| dir.join(name).is_file()))
        .unwrap_or(false)
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
            read_document_text,
            speak_text,
            stop_speech,
            tts_available
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
