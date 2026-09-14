const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DB_PATH } = require('./db');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

execFileSync(
    'sqlite3',
    [DB_PATH],
    {
        input: schema,
        encoding: 'utf8'
    }
);

console.log('DATABASE_READY');
console.log(DB_PATH);
