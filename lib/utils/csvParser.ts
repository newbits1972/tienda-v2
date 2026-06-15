/**
 * Parses Tab-Separated Values (Excel Paste) or CSV text into Raw Data structure
 */
export interface RawBulkData {
    headers: string[];
    rows: string[][];
    separator: string;
}

export function parseBulkText(text: string): RawBulkData {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 1) return { headers: [], rows: [], separator: '\t' };

    // Detect separator (Tab or Semicolon/Comma)
    const firstLine = lines[0];
    let separator = '\t';

    // Simple heuristic: count occurrences
    const tabs = (firstLine.match(/\t/g) || []).length;
    const semis = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;

    if (semis > tabs && semis > commas) separator = ';';
    else if (commas > tabs && commas > semis) separator = ',';

    // Parse Headers
    // Handles quoted values roughly (not full RFC 4180 compliance but good enough for copy-paste)
    const parseLine = (line: string, sep: string) => line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));

    const headers = parseLine(lines[0], separator);
    const rows = lines.slice(1).map(line => parseLine(line, separator));

    // Fill missing columns if row is shorter than header
    const normalizedRows = rows.map(row => {
        if (row.length < headers.length) {
            return [...row, ...Array(headers.length - row.length).fill('')];
        }
        return row;
    });

    return {
        headers,
        rows: normalizedRows,
        separator
    };
}
