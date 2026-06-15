const { data } = require('../../index.js')

const sqlite3 = require("better-sqlite3")
const database = new sqlite3(`${data.storage}/database.db`, { timeout: 5000 }); // 5 seconds is so if db is locked the function will wait for it to be unlocked for 5 s before erroring

database.pragma("journal_mode = WAL"); // creates copy of db so faster read werite i think
database.pragma("foreign_keys = ON");

const query = {
  all: (sql, params = []) => database.prepare(sql).all(params),
  get: (sql, params = []) => database.prepare(sql).get(params),
  run: (sql, params = []) => {
    const result = database.prepare(sql).run(params);
    return { id: result.lastInsertRowid, changes: result.changes };
  },
  transaction: (fn) => database.transaction(fn)(),
};


module.exports = { query }