"use client";

import { useState, useTransition } from "react";
import type { Suggestion } from "@/server/name-election/service";
import { parseSuggestionsCsv, type ParsedSuggestion } from "./csv";
import { reorderSuggestions, replaceSuggestions } from "./actions";

type SuggestionsSetupProps = { initialSuggestions: Suggestion[] };

export function SuggestionsSetup({ initialSuggestions }: SuggestionsSetupProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [preview, setPreview] = useState<ParsedSuggestion[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function selectFile(file: File | undefined) {
    if (!file) return;
    try {
      const source = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      setPreview(parseSuggestionsCsv(source));
      setMessage(null);
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "Kunde inte läsa CSV-filen.");
    }
  }

  function confirmImport() {
    if (!preview) return;
    startTransition(async () => {
      try {
        setSuggestions(await replaceSuggestions(preview));
        setPreview(null);
        setMessage("Suggestions har sparats.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Kunde inte spara Suggestions.");
      }
    });
  }

  function moveSuggestion(position: number, direction: -1 | 1) {
    const nextPosition = position + direction;
    if (nextPosition < 0 || nextPosition >= suggestions.length) return;
    const ordered = [...suggestions];
    [ordered[position], ordered[nextPosition]] = [ordered[nextPosition]!, ordered[position]!];
    startTransition(async () => {
      try {
        setSuggestions(await reorderSuggestions(ordered.map(({ id }) => id)));
        setMessage("Ordningen har sparats.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Kunde inte ändra ordningen.");
      }
    });
  }

  return <section className="card" aria-labelledby="suggestions-heading">
    <h2 id="suggestions-heading">Suggestions</h2>
    <p>Importera den betrodda CSV-filen med 32 Suggestions. Filen sparas aldrig.</p>
    <label htmlFor="suggestions-csv">CSV-fil</label>
    <input id="suggestions-csv" name="suggestions-csv" type="file" accept=".csv,text/csv" disabled={pending} onChange={(event) => void selectFile(event.currentTarget.files?.[0])} />
    {message ? <p role="status">{message}</p> : null}
    {preview ? <div aria-labelledby="preview-heading">
      <h3 id="preview-heading">Bekräfta {suggestions.length ? "ersättning" : "import"}</h3>
      <p>Granska alla 32 Suggestions i källordning innan de sparas.</p>
      <SuggestionsList suggestions={preview} />
      <button type="button" disabled={pending} onClick={confirmImport}>Bekräfta import</button>
      <button type="button" disabled={pending} onClick={() => { setPreview(null); setMessage("Importen avbröts."); }}>Avbryt</button>
    </div> : null}
    {suggestions.length ? <div aria-labelledby="saved-heading">
      <h3 id="saved-heading">Utkastets Suggestions</h3>
      <p>Ordningen sparas direkt och kan ändras under Draft.</p>
      <ol className="suggestion-list">
        {suggestions.map((suggestion, position) => <li key={suggestion.id}>
          <strong>{suggestion.suggestion}</strong><br /><span>{suggestion.motivation}</span><br />
          <button type="button" disabled={pending || position === 0} onClick={() => moveSuggestion(position, -1)}>Flytta upp</button>
          <button type="button" disabled={pending || position === suggestions.length - 1} onClick={() => moveSuggestion(position, 1)}>Flytta ner</button>
        </li>)}
      </ol>
    </div> : <p>Inga Suggestions har importerats ännu.</p>}
  </section>;
}

function SuggestionsList({ suggestions }: { suggestions: ParsedSuggestion[] }) {
  return <ol className="suggestion-list">
    {suggestions.map(({ suggestion, motivation }, index) => <li key={`${index}-${suggestion}`}><strong>{suggestion}</strong><br /><span>{motivation}</span></li>)}
  </ol>;
}
