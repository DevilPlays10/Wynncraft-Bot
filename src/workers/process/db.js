const sqlite3 = require('sqlite3')
const { data,updateVariable } = require('../../index.js')
const fs = require('fs')

let commands = []

let {queue} = JSON.parse(fs.readFileSync(data.storage+`/process/db_inject.json`))

/**
 * 
 * @param {String} cmd sqlite command to execute
 * @param {Array} data  data to use in that cmd
 */
function queueToDB(cmd, store) {
  queue.push([cmd, store])
  updateVariable(data.storage+`/process/db_inject.json`, 'queue', queue)
}

push()
setInterval(() => {
  push()
}, 1000*60*1);

function push() {
  if (!queue.length) return
  try {
      const sqdb = new sqlite3.Database(`${data.storage}/database.db`, (err) => {
      if (err) return
      // log_str(`[DB Insertion] Queued DB Insertion triggered with ${queue.length} entries`)
      // console.log(`db insertion happened, ${queue.length} entries`)
      for (cmd of queue) {
        sqdb.run(cmd[0], cmd[1])
      }
      sqdb.close();
      queue = []
      updateVariable(data.storage+`/process/db_inject.json`, 'queue', [])
    });
  } catch(e) {
    log_str(`[DB INSERT] Error occured during DB insertion entries: ${queue.length}`)
    warn(`[DB INSERT] Error occured during DB insertion ${queue}`)
    // console.log(e)
  }
}

const db = {
  run: (list=>{
    return new Promise((resolve, reject)=> {
        commands.push(...list)
        const db = new sqlite3.Database(`${data.storage}/database.db`, (err) => {
        if (err) reject(err)
        for (cmd of commands) {
          db.run(cmd[0], cmd[1])
        }
        db.close((err) => {
          if (err) reject(err)
          resolve()
        });
        commands = []
      });
    })
  }),
  run_each: ((command, args)=>{
    return new Promise((resolve, reject)=> {
      const db = new sqlite3.Database(`${data.storage}/database.db`, (err) => {
        if (err) reject(err)
        for (arg_ of args) {
          db.run(command, arg_)
        }
        db.close((err) => {
          if (err) reject(err)
          resolve()
        });
      });
    })
  }),
  all: ((com, args)=>{
      return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(`${data.storage}/database.db`, (err) => {
          if (err) return reject(err);
        });
        db.all(com, args, (err, rows) => {
            db.close();
            if (err) return reject(err);
            resolve(rows);
        });
    });
  })
}

module.exports = {db, queueToDB}