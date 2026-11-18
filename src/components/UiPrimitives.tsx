import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { DatabasePayload, GenericRow } from '../types/siakad';
import { CRUD_CONFIGS, type FieldType } from '../utils/siakadEngine';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const colors: Record<string, string> = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-800 text-white',
    warning: 'bg-amber-500 text-slate-900',
  };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm no-print">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${colors[t.type] || colors.info} px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2.5 transition-all duration-300`}
        >
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function GlobalLoader({ visible, text }: { visible: boolean; text: string }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center no-print">
      <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-xs w-full mx-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700 text-center">{text || 'Memuat data SIAKAD...'}</p>
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClass = 'max-w-3xl',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 no-print">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col overflow-hidden border border-slate-200`}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scroll flex-1">{children}</div>
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          {footer || (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeleteConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Konfirmasi Hapus"
      onClose={onCancel}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold"
          >
            Ya, Hapus
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700">Data yang dihapus tidak dapat dikembalikan. Yakin ingin menghapus?</p>
    </Modal>
  );
}

export function CrudModal({
  open,
  sheet,
  recordId,
  db,
  onClose,
  onSave,
}: {
  open: boolean;
  sheet: string;
  recordId: string;
  db: DatabasePayload;
  onClose: () => void;
  onSave: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
}) {
  const cfg = CRUD_CONFIGS[sheet];
  const [form, setForm] = useState<GenericRow>({});

  useEffect(() => {
    if (!open || !cfg) return;
    const rows = (db[sheet] as GenericRow[]) || (sheet === 'Users' ? db.UsersPublic : []) || [];
    const rec = recordId ? rows.find(r => String(r.id) === String(recordId)) || {} : {};
    const today = new Date().toISOString().slice(0, 10);
    const next: GenericRow = { ...rec };
    cfg.f.forEach(([k, , type]) => {
      if (k === 'password') {
        next[k] = '';
      } else if (next[k] === undefined || next[k] === null) {
        next[k] = type === 'd' && !recordId ? today : '';
      }
    });
    setForm(next);
  }, [open, sheet, recordId, cfg, db]);

  if (!open || !cfg) return null;

  const getOptions = (type: FieldType, cur: unknown, opts?: string[]): Array<[string, string]> => {
    let list: Array<[string, string]> = [];
    const users = db.UsersPublic || [];
    if (type === 's') list = (opts || []).map(o => [o, o]);
    if (type === 'u') list = users.filter(x => x.role === 'guru' || x.role === 'tendik').map(x => [x.id, x.full_name]);
    if (type === 'U') list = users.filter(x => x.role !== 'wali_murid').map(x => [x.id, x.full_name]);
    if (type === 'st') list = (db.Students || []).map(x => [x.id, x.full_name]);
    if (type === 'c') list = (db.Classes || []).map(x => [x.id, x.name]);
    if (type === 'sub') list = (db.Subjects || []).map(x => [x.id, x.name]);
    if (type === 'r') list = (db.InventarisRuang || []).map(x => [x.id, x.room_name]);
    if (type === 'g') list = users.filter(x => ['guru', 'tendik', 'kepala_sekolah'].includes(x.role)).map(x => [x.full_name, x.full_name]);
    const curS = String(cur == null ? '' : cur);
    if (curS && !list.some(o => String(o[0]) === curS)) list = [[curS, curS], ...list];
    return list;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const obj: GenericRow = { ...form };
    cfg.f.forEach(([k, , type]) => {
      if (type === 'n' && obj[k] !== '' && obj[k] !== undefined) {
        obj[k] = Number(obj[k]);
      }
    });
    if (recordId) obj.id = recordId;
    else delete obj.id;
    if (sheet === 'KehadiranGTK' && !obj.sumber) obj.sumber = 'Input manual';
    onClose();
    await onSave(sheet, obj, recordId ? 'Perubahan disimpan!' : 'Data ditambahkan!');
  };

  const INP = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white';

  return (
    <Modal open={open} title={(recordId ? 'Edit ' : 'Tambah ') + cfg.t} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {cfg.f.map(([k, label, type, opts]) => {
          const val = form[k] ?? '';
          return (
            <div key={k} className={type === 'a' ? 'sm:col-span-2' : ''}>
              <label className="block font-bold mb-1 text-slate-700">{label}</label>
              {type === 'n' ? (
                <input
                  type="number"
                  value={val}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className={INP}
                />
              ) : type === 'd' ? (
                <input
                  type="date"
                  value={val}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className={INP}
                />
              ) : type === 'a' ? (
                <textarea
                  rows={3}
                  value={val}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className={INP}
                />
              ) : type === 't' ? (
                <input
                  type={k === 'password' ? 'password' : 'text'}
                  value={val}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className={INP}
                />
              ) : (
                <select
                  value={String(val)}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className={INP}
                >
                  <option value="">— pilih —</option>
                  {getOptions(type, val, opts).map(([ov, ol]) => (
                    <option key={ov} value={ov}>
                      {ol}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        <button type="submit" className="sm:col-span-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
          Simpan
        </button>
      </form>
    </Modal>
  );
}
