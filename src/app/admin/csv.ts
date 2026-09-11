export type ParsedSuggestion = { suggestion: string; motivation: string };

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  const finishField = () => { row.push(field); field = ""; closedQuote = false; };
  const finishRow = () => { finishField(); rows.push(row); row = []; };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') { field += '"'; index += 1; }
        else { quoted = false; closedQuote = true; }
      } else field += character;
      continue;
    }
    if (closedQuote && character !== "," && character !== "\n" && character !== "\r") throw new Error("Ett citerat fält måste följas av komma eller radbrytning.");
    if (character === '"') {
      if (field) throw new Error("Citattecken mitt i ett okapslat fält är inte giltigt CSV.");
      quoted = true;
    } else if (character === ",") finishField();
    else if (character === "\n") finishRow();
    else if (character === "\r") {
      if (source[index + 1] === "\n") index += 1;
      finishRow();
    } else field += character;
  }
  if (quoted) throw new Error("CSV-filen har ett oavslutat citerat fält.");
  if (field || row.length > 0 || closedQuote) finishRow();
  return rows;
}

export function parseSuggestionsCsv(source: string): ParsedSuggestion[] {
  const rows = parseCsv(source);
  const [header, ...data] = rows;
  if (!header || header.length !== 2 || header[0]?.replace(/^\uFEFF/, "") !== "suggestion" || header[1] !== "motivation") {
    throw new Error("CSV-filen måste ha exakt rubrikerna suggestion,motivation.");
  }
  if (data.length !== 32) throw new Error(`CSV-filen måste innehålla exakt 32 Suggestions, inte ${data.length}.`);
  return data.map((row, index) => {
    if (row.length !== 2) throw new Error(`Rad ${index + 2} måste innehålla exakt två fält.`);
    const [suggestion, motivation] = row;
    if (!suggestion?.trim() || !motivation?.trim()) throw new Error(`Rad ${index + 2} saknar Suggestion eller motivation.`);
    return { suggestion, motivation };
  });
}
