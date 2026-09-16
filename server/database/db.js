const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DB_PATH = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'lexbridge.sqlite'
);

function query(sql, params = []) {
  const finalSql = applyParams(sql, params);

  const output = execFileSync(
    'sqlite3',
    ['-json', DB_PATH, finalSql],
    { encoding: 'utf8' }
  ).trim();

  return output ? JSON.parse(output) : [];
}

function run(sql, params = []) {
  const finalSql = applyParams(sql, params);

  const statement = finalSql.trim().replace(/;*$/, '') + ';';
  const output = execFileSync(
    'sqlite3',
    [DB_PATH, statement + '\nSELECT changes();'],
    { encoding: 'utf8' }
  ).trim();

  const lines = output.split(/\r?\n/).filter(Boolean);
  const changes = Number(lines.at(-1)) || 0;

  return { changes };
}

function applyParams(sql, params) {
  let index = 0;

  return String(sql).replace(/\?/g, () => {
    if (index >= params.length) {
      throw new Error('DB_PARAMETER_MISSING');
    }

    const value = params[index++];

    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    return "'" + String(value).replace(/'/g, "''") + "'";
  });
}

function getDb() {
  return {
    query,
    run
  };
}

async function close() {
  return true;
}

module.exports = {
  DB_PATH,
  getDb,
  query,
  run,
  close
};
