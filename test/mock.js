// Minimal in-memory stand-in for the claude.ai runtime (db, user, assets, downloads).
window.__mockInit = function (seed) {
  const store = new Map(Object.entries(seed));
  const subs = new Set();
  const clone = v => JSON.parse(JSON.stringify(v));
  const snapDoc = (path) => { const data = store.get(path); return { id: path.split('/').pop(), exists: data !== undefined, data: () => (data === undefined ? undefined : Object.freeze(clone(data))), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const deliver = s => setTimeout(() => {
    if (!subs.has(s)) return;
    if (s.kind === 'coll') {
      const docs = [...store.keys()].filter(p => { const a = p.split('/'); return a.length === 2 && a[0] === s.path; }).sort().map(snapDoc);
      s.next({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} });
    } else s.next(snapDoc(s.path));
  }, 10);
  const notify = () => subs.forEach(deliver);
  const check = path => { if (path.split('/').length % 2) throw new TypeError('bad doc path ' + path); };
  const doc = path => { check(path); return {
    id: path.split('/').pop(), path,
    get: async () => snapDoc(path),
    set: async data => { window.__writes.push(['set', path]); store.set(path, clone(data)); notify(); },
    update: async data => { window.__writes.push(['update', path]); if (!store.has(path)) throw { code: 'invalid_argument', message: 'no doc' }; store.set(path, { ...store.get(path), ...clone(data) }); notify(); },
    delete: async () => { window.__writes.push(['delete', path]); store.delete(path); notify(); },
    onSnapshot: (next) => { const s = { kind: 'doc', path, next }; subs.add(s); deliver(s); return () => subs.delete(s); },
  }; };
  const collection = path => ({ path, doc: id => doc(path + '/' + (id || Math.random().toString(36).slice(2))),
    onSnapshot: (next) => { const s = { kind: 'coll', path, next }; subs.add(s); deliver(s); return () => subs.delete(s); } });
  window.__store = store; window.__writes = [];
  const caps = {
    db: Object.freeze({ doc, collection }),
    user: Object.freeze({ can: async () => true, isOwner: async () => true, canEdit: async () => true, id: async () => 'u_test' }),
    assets: Object.freeze({ upload: async (blob, o) => { const id = 'a' + Math.random().toString(36).slice(2, 12).padEnd(31, '0'); window.__uploads = (window.__uploads || 0) + 1; return { id, url: '/_blob/' + id, sizeBytes: blob.size, contentType: o && o.type }; }, delete: async () => ({ deleted: true }), list: async () => ({ assets: [], usage: {} }) }),
    downloads: Object.freeze({ save: async ({ filename, data }) => { window.__saved = { filename, size: data.size || data.byteLength }; window.__savedBlob = data; return { status: 'saved' }; } }),
  };
  window.claude = { use: name => new Promise(r => setTimeout(() => r(caps[name] || null), 30)) };
};
