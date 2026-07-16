import type { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import * as importExportService from '../services/importExportService.js';
import { AppError } from '../utils/errors.js';
import { validatedBody } from '../middleware/validate.js';

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    const { mapping, rows, csv, headers } = validatedBody<{
      mapping: importExportService.FieldMapping;
      rows?: Record<string, string | null>[];
      csv?: string;
      headers?: string[];
    }>(req, res);

    let parsedRows = rows;
    if (!parsedRows && csv) {
      parsedRows = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string | null>[];
    }

    if (!parsedRows?.length) {
      throw new AppError(400, 'No CSV rows provided');
    }

    const result = await importExportService.previewImport(parsedRows, mapping);
    const suggested =
      headers?.length || Object.keys(parsedRows[0] ?? {}).length
        ? importExportService.suggestMapping(headers ?? Object.keys(parsedRows[0] ?? {}))
        : {};

    res.json({ ...result, suggestedMapping: suggested, headers: headers ?? Object.keys(parsedRows[0] ?? {}) });
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { mapping, rows } = validatedBody<{
      mapping: importExportService.FieldMapping;
      rows: Record<string, string | null>[];
    }>(req, res);
    const result = await importExportService.confirmImport(rows, mapping);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function parseCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, 'CSV file is required');

    const text = file.buffer.toString('utf-8');
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string | null>[];

    const headers = records[0] ? Object.keys(records[0]) : [];
    const suggestedMapping = importExportService.suggestMapping(headers);

    res.json({
      headers,
      rows: records,
      rowCount: records.length,
      suggestedMapping,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(_req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await importExportService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="groovcrm-prospects.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
