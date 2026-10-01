import "server-only";
import ExcelJS from "exceljs";
import type { Table } from "@/lib/domain/export";

// Charte Release Engine : en-têtes vert primaire, lignes crème alternées.
const PRIMARY = "FF1E8A5F";
const CREAM = "FFFBFAF6";
const BORDER = "FFEBE6DB";

// Colonnes de texte long (brief) : plus larges et renvoyées à la ligne.
const WIDE = new Set(["Accroche", "Concept", "Structure", "Son suggéré", "CTA"]);

/** Classeur Excel : un onglet par tableau, aux couleurs de l'app. */
export async function renderWorkbook(tables: Table[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Release Engine";

  for (const table of tables) {
    const ws = wb.addWorksheet(table.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = table.header.map((h) => ({
      header: h,
      width: WIDE.has(h) ? 48 : Math.max(12, h.length + 4),
    }));
    table.rows.forEach((r) => ws.addRow(r));

    const head = ws.getRow(1);
    head.height = 22;
    head.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY } };
      cell.alignment = { vertical: "middle" };
    });

    ws.eachRow((row, n) => {
      if (n === 1) return;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.alignment = {
          vertical: "top",
          wrapText: WIDE.has(table.header[col - 1]),
        };
        cell.border = { bottom: { style: "thin", color: { argb: BORDER } } };
        if (n % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
        }
      });
    });
    if (table.rows.length) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: table.header.length },
      };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
