import { parse, type CsvError } from "csv-parse/sync";

export type FeedRejectReason =
  | "column_count"
  | "missing_key"
  | "missing_price"
  | "invalid_ean";

export type FeedReject = {
  line: number;
  reason: FeedRejectReason;
  detail: string;
};

export type ParsedFeed = {
  header: string[];
  rows: { line: number; cells: string[] }[];
  rejects: FeedReject[];
};

type InfoRecord = {
  record: string[];
  info: { lines: number };
};

/** Guillemet résiduel laissé par relax_quotes autour d'un champ déjà quoté. */
function unwrapResidualQuotes(cell: string): string {
  if (cell.length >= 2 && cell.startsWith('"') && cell.endsWith('"')) {
    return cell.slice(1, -1);
  }
  return cell;
}

/**
 * Lit un flux selon le délimiteur du profil. Les guillemets sont toujours
 * honorés : un séparateur à l'intérieur d'un champ quoté ne découpe pas la ligne.
 * Un guillemet interne non échappé (55", "snow") est toléré. Une ligne dont le
 * nombre de colonnes diffère de l'en-tête est rejetée, le reste du fichier continue.
 */
export function parseFeedCsv(
  text: string,
  profile: { delimiter: string },
): ParsedFeed {
  const rejects: FeedReject[] = [];
  const parsed = parse(text, {
    bom: true,
    delimiter: profile.delimiter,
    skip_empty_lines: true,
    skip_records_with_error: true,
    relax_column_count: false,
    relax_quotes: true,
    info: true,
    on_skip(error: CsvError | undefined) {
      const line = typeof error?.lines === "number" ? error.lines : 0;
      rejects.push({
        line,
        reason: "column_count",
        detail: error?.message ?? "Nombre de colonnes invalide",
      });
    },
  }) as unknown as InfoRecord[];

  const headerRecord = parsed[0];
  if (!headerRecord) {
    return { header: [], rows: [], rejects };
  }

  return {
    header: headerRecord.record.map((cell) => cell.trim()),
    rows: parsed.slice(1).map((entry) => ({
      line: entry.info.lines,
      cells: entry.record.map(unwrapResidualQuotes),
    })),
    rejects,
  };
}
