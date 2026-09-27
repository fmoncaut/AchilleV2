import { parse, type CsvError } from "csv-parse/sync";

export type FeedRejectReason = "column_count" | "missing_key" | "missing_price";

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

/**
 * Lit un flux selon le délimiteur du profil. Les guillemets sont toujours
 * honorés : un séparateur à l'intérieur d'un champ quoté ne découpe pas la ligne.
 * Une ligne dont le nombre de colonnes diffère de l'en-tête est rejetée et
 * loguée, le reste du fichier continue.
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
      cells: entry.record,
    })),
    rejects,
  };
}
