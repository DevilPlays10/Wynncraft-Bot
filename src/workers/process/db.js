const sqlite3 = require('sqlite3')
const { data } = require('../../index.js')

let commands = []
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

module.exports = {db}