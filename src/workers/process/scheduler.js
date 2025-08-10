const schedule = require('node-schedule')
const { data, updateVariable, log_str } = require('../../index.js')
const { WynGET } = require('./wyn_api.js')

getWYNDATA()
schedule.scheduleJob('0 0 * * *', () => {
    getWYNDATA()
});

async function getWYNDATA() {
    const guilds = await WynGET(`guild/list/guild`).catch(e=>e)
    const territories = await WynGET(`guild/list/territory`).catch(e=>e)
    if (guilds.status==200) {
        log_str(`[DRESET] ${Object.values(guilds.data).length} Guilds mapped`)
        updateVariable(data.storage + "/process/autocomplete/guilds.json", 'data', Object.entries(guilds.data).map(ent=>[`${ent[0]} - ${ent[1].prefix}`, ent[1].uuid]))
    }
    if (territories.status==200) {
        log_str(`[DRESET] ${Object.values(territories.data).length} Territories mapped`)
        updateVariable(data.storage + "/process/autocomplete/territories.json", 'data', Object.getOwnPropertyNames(territories.data))
    }
}

// JSON.parse(fs.readFileSync(data.storage + "/languages.json"))