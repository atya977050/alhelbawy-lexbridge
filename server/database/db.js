const path = require('path');
const { execFileSync } = require('child_process');

const DB_PATH = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'lexbridge.sqlite'
);

function run(sql) {
    return execFileSync(
        'sqlite3',
        [DB_PATH, sql],
        { encoding: 'utf8' }
    ).trim();
}

function query(sql) {
    const output = execFileSync(
        'sqlite3',
        ['-json', DB_PATH, sql],
        { encoding: 'utf8' }
    ).trim();

    return output ? JSON.parse(output) : [];
}

module.exports = {
    DB_PATH,
    run,
    query
};
