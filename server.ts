import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  addEkskulMembers,
  authenticateUser,
  createSessionsFromProta,
  deleteRecord,
  exportDatabaseJson,
  getInitialBootstrapData,
  importDatabaseJson,
  importKehadiranGtk,
  importStudentsBulk,
  resetDatabaseForNewAcademicYear,
  saveAbsensiHarian,
  saveClassAssignments,
  saveJadwalCell,
  saveJamPelajaran,
  saveRecord,
  saveSchoolSettings,
  saveSessionAttendanceBatch,
} from './src/server/dbEngine.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.get('/api/bootstrap', (_req, res) => {
    try {
      res.json(getInitialBootstrapData());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gagal memuat database' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const result = await authenticateUser(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Gagal login' });
    }
  });

  app.post('/api/save', async (req, res) => {
    try {
      const { sheetName, recordObj, actor } = req.body;
      const result = await saveRecord(sheetName, recordObj, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan data' });
    }
  });

  app.post('/api/delete', async (req, res) => {
    try {
      const { sheetName, recordId, actor } = req.body;
      const result = await deleteRecord(sheetName, recordId, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menghapus data' });
    }
  });

  app.post('/api/attendance-batch', async (req, res) => {
    try {
      const { sessionId, recordsList, actor } = req.body;
      const result = await saveSessionAttendanceBatch(sessionId, recordsList, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan batch presensi & nilai' });
    }
  });

  app.post('/api/sessions-prota', async (req, res) => {
    try {
      const { payload, actor } = req.body;
      const result = await createSessionsFromProta(payload, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal generate sesi prota' });
    }
  });

  app.post('/api/class-assignments', async (req, res) => {
    try {
      const { classId, pairs, actor } = req.body;
      const result = await saveClassAssignments(classId, pairs, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan penugasan kelas' });
    }
  });

  app.post('/api/ekskul-members', async (req, res) => {
    try {
      const { ekskulId, studentIds, actor } = req.body;
      const result = await addEkskulMembers(ekskulId, studentIds, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menambahkan anggota ekskul' });
    }
  });

  app.post('/api/kehadiran-import', async (req, res) => {
    try {
      const { rows, actor } = req.body;
      const result = await importKehadiranGtk(rows, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal mengimpor kehadiran GTK' });
    }
  });

  app.post('/api/students-import', async (req, res) => {
    try {
      const { rows, actor } = req.body;
      const result = await importStudentsBulk(rows, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal mengimpor data siswa' });
    }
  });

  app.post('/api/school-settings', async (req, res) => {
    try {
      const { values, actor } = req.body;
      const result = await saveSchoolSettings(values, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan identitas sekolah' });
    }
  });

  app.post('/api/jam-pelajaran', async (req, res) => {
    try {
      const { slots, actor } = req.body;
      const result = await saveJamPelajaran(slots, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan jam pelajaran' });
    }
  });

  app.post('/api/jadwal-cell', async (req, res) => {
    try {
      const { day, slotNo, classId, subjectId, actor } = req.body;
      const result = await saveJadwalCell(day, slotNo, classId, subjectId, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan sel jadwal' });
    }
  });

  app.post('/api/absensi-harian', async (req, res) => {
    try {
      const { date, classId, records, actor } = req.body;
      const result = await saveAbsensiHarian(date, classId, records, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal menyimpan absensi harian' });
    }
  });

  app.get('/api/export-json', (_req, res) => {
    try {
      const jsonStr = exportDatabaseJson();
      res.setHeader('Content-Type', 'application/json');
      res.send(jsonStr);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gagal export JSON' });
    }
  });

  app.post('/api/import-json', async (req, res) => {
    try {
      const { jsonString, actor } = req.body;
      const result = await importDatabaseJson(jsonString, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal restore JSON' });
    }
  });

  app.post('/api/reset-academic-year', async (req, res) => {
    try {
      const { options, actor } = req.body;
      const result = await resetDatabaseForNewAcademicYear(options, actor);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err?.message || 'Gagal mereset database' });
    }
  });

  // Download fixed Google Apps Script files directly
  app.get('/api/gas-download/:filename', (req, res) => {
    const { filename } = req.params;
    const allowed: Record<string, string> = {
      'Code.gs': path.resolve(process.cwd(), 'public/gas-fixed/Code.gs'),
      'Index.html': path.resolve(process.cwd(), 'public/gas-fixed/Index.html'),
    };
    const filePath = allowed[filename];
    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File tidak ditemukan' });
      return;
    }
    res.download(filePath, filename);
  });

  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => {
        lastInsertedStyle = undefined;
      }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    decline() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const parsed = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (parsed.search ? '&' + parsed.search.slice(1) : '') + (parsed.hash || '');
}
export class ErrorOverlay extends (typeof HTMLElement !== 'undefined' ? HTMLElement : class {}) {}
if (typeof customElements !== 'undefined' && !customElements.get('vite-error-overlay')) {
  customElements.define('vite-error-overlay', ErrorOverlay);
}
`);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIAKAD SMP Kristen Waibakul running on http://localhost:${PORT}`);
  });
}

startServer();
