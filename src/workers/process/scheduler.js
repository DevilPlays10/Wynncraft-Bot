const schedule = require('node-schedule')
const { data, axios, updateVariable, log_str } = require('../../index.js')

getWYNDATA()
schedule.scheduleJob('0 0 * * *', () => {
    getWYNDATA()
});

async function getWYNDATA() {
    const guilds = await axios.get(`${data.urls.wyn}guild/list/guild`).catch(e=>e)
    const territories = await axios.get(`${data.urls.wyn}guild/list/territory`).catch(e=>e)
    log_str(`[DRESET] ${Object.values(guilds.data).length} Guilds mapped`)
    log_str(`[DRESET] ${Object.values(territories.data).length} Territories mapped`)
    updateVariable(data.storage + "/process/autocomplete/guilds.json", 'data', Object.entries(guilds.data).map(ent=>[`${ent[0]} - ${ent[1].prefix}`, ent[1].uuid]))
    updateVariable(data.storage + "/process/autocomplete/territories.json", 'data', Object.getOwnPropertyNames(territories.data))
}

// JSON.parse(fs.readFileSync(data.storage + "/languages.json"))