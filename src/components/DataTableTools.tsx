import React, { useMemo, useState } from 'react';
import type { DatabasePayload, GenericRow } from '../types/siakad';
import { CRUD_CONFIGS, exportTableToExcel, resolveCrudDisplayValue } from '../utils/siakadEngine';

export interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  filterable?: boolean;
  sortable?: boolean;
  render?: (row: GenericRow, idx: number) => React.ReactNode;
  textValue?: (row: GenericRow, idx: number) => string;
}

export function EnhancedDataTable({
  columns,
  rows,
  emptyText = 'Belum ada data',
  exportSheetName = 'Data',
  exportFileName,
  enableTools = true,
  minRowsForTools = 5,
  onRowClick,
  rowClassName,
  renderActions,
  headClassName = 'bg-slate-800 text-white',
}: {
  columns: ColumnDef[];
  rows: GenericRow[];
  emptyText?: string;
  exportSheetName?: string;
  exportFileName?: string;
  enableTools?: boolean;
  minRowsForTools?: number;
  onRowClick?: (row: GenericRow) => void;
  rowClassName?: (row: GenericRow) => string;
  renderActions?: (row: GenericRow) => React.ReactNode;
  headClassName?: string;
}) {
  const [search, setSearch] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const showTools = enableTools && rows.length >= minRowsForTools;

  const getCellText = (col: ColumnDef, r: GenericRow, i: number) => {
    if (col.textValue) return col.textValue(r, i);
    const val = r[col.key];
    return val === undefined || val === null ? '' : String(val);
  };

  const filterColumns = useMemo(() => {
    if (!showTools) return [];
    return columns.filter(col => {
      const isAutoFilter =
        col.filterable ||
        /^(kelas|status|kategori|jabatan|peran|role|mapel|mata pelajaran|hari|tingkat|predikat)/i.test(col.label);
      if (!isAutoFilter) return false;
      const vals = Array.from(new Set(rows.map((r, i) => getCellText(col, r, i).trim()).filter(Boolean)));
      return vals.length >= 2 && vals.length <= 30;
    });
  }, [columns, rows, showTools]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.map((row, idx) => ({ row, idx }));

    if (showTools) {
      list = list.filter(({ row, idx }) => {
        if (q) {
          const fullText = columns.map(c => getCellText(c, row, idx)).join(' ').toLowerCase();
          if (!fullText.includes(q)) return false;
        }
        for (const fc of filterColumns) {
          const activeVal = colFilters[fc.key];
          if (activeVal && getCellText(fc, row, idx).trim() !== activeVal) {
            return false;
          }
        }
        return true;
      });
    }

    if (sortCol) {
      const col = columns.find(c => c.key === sortCol);
      if (col) {
        list.sort((a, b) => {
          const x = getCellText(col, a.row, a.idx).trim();
          const y = getCellText(col, b.row, b.idx).trim();
          const nx = parseFloat(x);
          const ny = parseFloat(y);
          const cmp = !isNaN(nx) && !isNaN(ny) && String(nx) === x && String(ny) === y ? nx - ny : x.localeCompare(y, 'id');
          return cmp * (sortAsc ? 1 : -1);
        });
      }
    }

    return list;
  }, [rows, search, colFilters, sortCol, sortAsc, showTools, columns, filterColumns]);

  const handleSort = (col: ColumnDef) => {
    if (col.sortable === false || /^(no|aksi)$/i.test(col.label)) return;
    if (sortCol === col.key) setSortAsc(a => !a);
    else {
      setSortCol(col.key);
      setSortAsc(true);
    }
  };

  const handleExport = () => {
    const headerRow = columns.map(c => c.label);
    const dataRows = filteredRows.map(({ row, idx }) =>
      columns.map(c => getCellText(c, row, idx).trim().replace(/\s+/g, ' '))
    );
    exportTableToExcel(
      [headerRow, ...dataRows],
      exportSheetName,
      exportFileName || `Data-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-2">
      {showTools && (
        <div className="flex flex-wrap gap-2 items-center text-xs no-print">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari data..."
            className="px-3 py-2 rounded-xl border border-slate-300 w-48 bg-white"
          />
          <span className="text-slate-500 tabular-nums">
            {filteredRows.length} / {rows.length} data
          </span>
          {filterColumns.map(fc => {
            const vals = Array.from(new Set(rows.map((r, i) => getCellText(fc, r, i).trim()).filter(Boolean))).sort();
            return (
              <select
                key={fc.key}
                value={colFilters[fc.key] || ''}
                onChange={e => setColFilters(p => ({ ...p, [fc.key]: e.target.value }))}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">Semua {fc.label}</option>
                {vals.map(v => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            );
          })}
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold"
          >
            Download Excel
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full text-xs text-left border-collapse">
          <thead className={headClassName}>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  title={col.sortable !== false && !/^(no|aksi)$/i.test(col.label) ? 'Klik untuk mengurutkan' : undefined}
                  className={`p-3 whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.sortable !== false && !/^(no|aksi)$/i.test(col.label) ? 'cursor-pointer select-none' : ''}`}
                >
                  {col.label}
                  {sortCol === col.key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {renderActions && <th className="p-3 text-right whitespace-nowrap">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="p-6 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              filteredRows.map(({ row, idx }) => (
                <tr
                  key={row.id || idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50 ${rowClassName ? rowClassName(row) : ''}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`p-3 ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row, idx) : getCellText(col, row, idx)}
                    </td>
                  ))}
                  {renderActions && <td className="p-3 text-right whitespace-nowrap">{renderActions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CrudTableCard({
  sheet,
  title,
  db,
  onOpenCrud,
  onDelete,
}: {
  sheet: string;
  title?: string;
  db: DatabasePayload;
  onOpenCrud: (sheet: string, id: string) => void;
  onDelete: (sheet: string, id: string, msg?: string) => void;
}) {
  const cfg = CRUD_CONFIGS[sheet];
  if (!cfg) return null;

  const cols = cfg.cols || cfg.f.map(x => x[0]);
  const types: Record<string, any> = {};
  cfg.f.forEach(x => {
    types[x[0]] = x[2];
  });
  const labelOf = (k: string) => (cfg.f.find(x => x[0] === k) || [k, k])[1];
  const rawRows = ((db[sheet] as GenericRow[]) || []).slice().sort((a, b) =>
    String(b[cols[0]] || '').localeCompare(String(a[cols[0]] || ''))
  );

  const columns: ColumnDef[] = cols.map(c => ({
    key: c,
    label: labelOf(c),
    textValue: r => resolveCrudDisplayValue(db, types[c], r[c]),
  }));

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h3 className="font-extrabold text-sm text-slate-900">{title || cfg.t}</h3>
        <button
          type="button"
          onClick={() => onOpenCrud(sheet, '')}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
        >
          + Tambah
        </button>
      </div>
      <EnhancedDataTable
        columns={columns}
        rows={rawRows}
        exportSheetName={cfg.t}
        headClassName="bg-slate-800 text-white"
        renderActions={r => (
          <div className="space-x-2">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onOpenCrud(sheet, String(r.id));
              }}
              className="text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete(sheet, String(r.id));
              }}
              className="text-rose-600 font-bold hover:underline"
            >
              Hapus
            </button>
          </div>
        )}
      />
    </div>
  );
}
