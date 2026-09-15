const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'lexbridge.sqlite'
);

let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;

  SQL = await initSqlJs({
    locateFile: file =>
      path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        'sql.js',
        'dist',
        file
      )
  });

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  return db;
}

async function query(sql, params = []) {
  const database = await getDb();
  const stmt = database.prepare(sql);

  try {
    stmt.bind(params);

    const rows = [];

    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }

    return rows;
  } finally {
    stmt.free();
  }
}

async function run(sql, params = []) {
  const database = await getDb();
  const stmt = database.prepare(sql);

  try {
    stmt.run(params);
  } finally {
    stmt.free();
  }

  const data = database.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  return {
    changes: database.getRowsModified()
  };
}

async function close() {
  if (!db) return;

  const data = db.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  db.close();
  db = null;
}

module.exports = {
  DB_PATH,
  getDb,
  query,
  run,
  close
};
