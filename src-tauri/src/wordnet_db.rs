//! Self-contained WordNet 3.0 reader used by both the app backend and the
//! vocabulary generator. Loads the `index.*` files into a `HashMap` once
//! (O(1) lookups instead of the buggy binary search of the `wordnet` crate)
//! and reads synset records from the `data.*` files on demand.

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::Path;

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum Pos {
    Noun,
    Verb,
    Adjective,
    Adverb,
}

impl Pos {
    fn ext(self) -> &'static str {
        match self {
            Pos::Noun => "noun",
            Pos::Verb => "verb",
            Pos::Adjective => "adj",
            Pos::Adverb => "adv",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Pos::Noun => "noun",
            Pos::Verb => "verb",
            Pos::Adjective => "adjective",
            Pos::Adverb => "adverb",
        }
    }
}

#[derive(Debug, Default, serde::Serialize)]
pub struct Sense {
    pub part_of_speech: String,
    pub gloss: String,
    pub synonyms: Vec<String>,
    pub antonyms: Vec<String>,
    pub hypernyms: Vec<String>,
    pub hyponyms: Vec<String>,
    pub examples: Vec<String>,
}

pub struct WordNet {
    index: HashMap<String, Vec<(Pos, u64)>>,
    data: HashMap<Pos, File>,
}

/// Reads a single synset line at `offset` from a data file (fast: stops at
/// the first newline instead of reading the rest of the file).
fn read_line_at(file: &File, offset: u64) -> Option<String> {
    let mut reader = BufReader::new(file.try_clone().ok()?);
    reader.seek(SeekFrom::Start(offset)).ok()?;
    let mut bytes = Vec::with_capacity(256);
    let read = reader.read_until(b'\n', &mut bytes).ok()?;
    if read == 0 {
        return None;
    }
    while bytes.last() == Some(&b'\n') || bytes.last() == Some(&b'\r') {
        bytes.pop();
    }
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

impl WordNet {
    /// Opens a WordNet database directory containing `index.*`/`data.*` files.
    pub fn open(dir: &Path) -> std::io::Result<WordNet> {
        let mut index: HashMap<String, Vec<(Pos, u64)>> = HashMap::new();

        for pos in [Pos::Noun, Pos::Verb, Pos::Adjective, Pos::Adverb] {
            let path = dir.join(format!("index.{}", pos.ext()));
            let reader = BufReader::new(File::open(&path)?);
            for line in reader.lines() {
                let line = line?;
                if line.starts_with(' ') {
                    continue; // copyright header
                }
                let mut parts = line.split_whitespace();
                let Some(lemma) = parts.next() else { continue };
                parts.next(); // part of speech field
                let Some(synset_cnt) = parts.next().and_then(|v| v.parse::<usize>().ok()) else {
                    continue;
                };
                let Some(ptr_cnt) = parts.next().and_then(|v| v.parse::<usize>().ok()) else {
                    continue;
                };
                for _ in 0..ptr_cnt {
                    parts.next();
                }
                parts.next(); // sense_cnt
                parts.next(); // tagsense_cnt
                let mut offsets = Vec::new();
                for _ in 0..synset_cnt {
                    if let Some(raw) = parts.next() {
                        if let Ok(offset) = raw.parse::<u64>() {
                            offsets.push(offset);
                        }
                    }
                }
                if offsets.is_empty() {
                    continue;
                }
                let entry = index.entry(lemma.to_string()).or_default();
                for offset in offsets {
                    entry.push((pos, offset));
                }
            }
        }

        let mut data = HashMap::new();
        for pos in [Pos::Noun, Pos::Verb, Pos::Adjective, Pos::Adverb] {
            data.insert(pos, File::open(dir.join(format!("data.{}", pos.ext())))?);
        }

        Ok(WordNet { index, data })
    }

    /// Looks up every sense of a word (case-insensitive) across all POS.
    pub fn senses(&self, word: &str) -> Vec<Sense> {
        let lemma = word.to_lowercase();
        let mut out = Vec::new();
        if let Some(entries) = self.index.get(&lemma) {
            for (pos, offset) in entries {
                if let Some(sense) = self.read_sense(*pos, *offset) {
                    out.push(sense);
                }
            }
        }
        out
    }

    /// Reads the synset record at `offset` in the data file for `pos`.
    fn read_sense(&self, pos: Pos, offset: u64) -> Option<Sense> {
        let file = self.data.get(&pos)?;
        let line = read_line_at(file, offset)?;

        let mut parts = line.split_whitespace();
        parts.next(); // offset
        parts.next(); // lex_filenum
        let ss_type = parts.next(); // n / v / a / s
        let w_cnt = parts
            .next()
            .and_then(|v| usize::from_str_radix(v, 16).ok())?;

        let mut synonyms = Vec::new();
        for _ in 0..w_cnt {
            match parts.next() {
                Some(word) => {
                    parts.next(); // lex_id
                    synonyms.push(word.to_string());
                }
                None => break,
            }
        }

        let p_cnt = parts
            .next()
            .and_then(|v| usize::from_str_radix(v, 16).ok())?;
        let mut pointers = Vec::new();
        for _ in 0..p_cnt {
            let symbol = parts.next().unwrap_or("");
            let target_offset = parts.next().and_then(|v| v.parse::<u64>().ok());
            let target_pos = parts.next().unwrap_or("");
            parts.next(); // source/target
            pointers.push((symbol.to_string(), target_offset, target_pos.to_string()));
        }

        // Verb entries carry a sentence-frame section (f_cnt + f_cnt * 3 fields)
        // before the gloss.
        if ss_type == Some("v") {
            if let Some(f_cnt) = parts.next().and_then(|v| usize::from_str_radix(v, 16).ok()) {
                for _ in 0..f_cnt * 3 {
                    parts.next();
                }
            }
        }

        let mut gloss_tokens: Vec<&str> = parts.collect();
        if gloss_tokens.first() == Some(&"|") {
            gloss_tokens.remove(0);
        }
        let gloss_raw = gloss_tokens.join(" ");
        let (definition, examples) = parse_gloss(&gloss_raw);

        let mut antonyms = Vec::new();
        let mut hypernyms = Vec::new();
        let mut hyponyms = Vec::new();
        for (symbol, target_offset, target_pos) in pointers {
            if target_offset.is_none() {
                continue;
            }
            let target_pos = match target_pos.as_str() {
                "n" => Pos::Noun,
                "v" => Pos::Verb,
                "a" | "s" => Pos::Adjective,
                "r" => Pos::Adverb,
                _ => continue,
            };
            let words = self.synset_words(target_pos, target_offset.unwrap());
            match symbol.as_str() {
                "!" => push_unique(&mut antonyms, &words),
                "@" | "@i" => push_unique(&mut hypernyms, &words),
                "~" => push_unique(&mut hyponyms, &words),
                _ => {}
            }
        }

        Some(Sense {
            part_of_speech: pos.label().to_string(),
            gloss: definition,
            synonyms,
            antonyms,
            hypernyms,
            hyponyms,
            examples,
        })
    }

    /// Reads just the words of a target synset (for relation pointers).
    fn synset_words(&self, pos: Pos, offset: u64) -> Vec<String> {
        let Some(file) = self.data.get(&pos) else {
            return Vec::new();
        };
        let Some(line) = read_line_at(file, offset) else {
            return Vec::new();
        };
        let mut parts = line.split_whitespace();
        parts.next(); // offset
        parts.next(); // lex_filenum
        parts.next(); // ss_type
        let Some(w_cnt) = parts.next().and_then(|v| usize::from_str_radix(v, 16).ok()) else {
            return Vec::new();
        };
        let mut words = Vec::new();
        for _ in 0..w_cnt {
            match parts.next() {
                Some(word) => {
                    parts.next();
                    words.push(word.to_string());
                }
                None => break,
            }
        }
        words
    }
}

fn push_unique(target: &mut Vec<String>, source: &[String]) {
    for word in source {
        if !target.contains(word) {
            target.push(word.clone());
        }
    }
}

/// Splits a gloss into (definition, usable examples).
fn parse_gloss(raw: &str) -> (String, Vec<String>) {
    let definition = match raw.find('"') {
        Some(idx) => raw[..idx].trim(),
        None => raw.trim(),
    };
    let definition = definition
        .trim()
        .trim_end_matches([';', ',', ' '])
        .trim()
        .to_string();

    let mut rest = raw;
    let mut examples = Vec::new();
    while let Some(open) = rest.find('"') {
        let after = &rest[open + 1..];
        match after.find('"') {
            Some(close) => {
                let quote = after[..close].trim().to_string();
                if quote.len() >= 8
                    && quote.split_whitespace().count() >= 3
                    && (quote.ends_with('.') || quote.ends_with('!') || quote.ends_with('?'))
                {
                    examples.push(quote);
                }
                rest = &after[close + 1..];
            }
            None => break,
        }
    }

    (definition, examples)
}
