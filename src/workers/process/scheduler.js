const schedule = require('node-schedule')
const { data, updateVariable, log_str, axios } = require('../../index.js')
const { WynGET } = require('./wyn_api.js')

getWYNDATA()
schedule.scheduleJob('0 0 * * *', () => {
    getWYNDATA()
});

async function getWYNDATA() {
    const guilds = await WynGET(`guild/list/guild`).catch(e=>e)
    const territories = await WynGET(`guild/list/territory`).catch(e=>e)
    const colors = await axios.get(`${data.urls.wyntills}guildList`)
    if (guilds.status==200) {
        log_str(`[DRESET] ${Object.values(guilds.data).length} Guilds mapped`)
        updateVariable(data.storage + "/process/autocomplete/guilds.json", 'data', Object.entries(guilds.data).map(ent=>[`${ent[0]} - ${ent[1].prefix}`, ent[1].uuid]))
    }
    if (territories.status==200) {
        log_str(`[DRESET] ${Object.values(territories.data).length} Territories mapped`)
        updateVariable(data.storage + "/process/autocomplete/territories.json", 'data', Object.getOwnPropertyNames(territories.data))
    }
    if (colors.status==200) {
        const verData = colors.data.filter(ent=>ent._id&&ent.color).map(ent=>{return [ent._id.trim(), ent.color]})
        log_str(`[DRESET] ${verData.length} Guild colors mapped`)
        updateVariable(data.storage + "/process/autocomplete/colors.json", 'data', verData)
    }
}

// JSON.parse(fs.readFileSync(data.storage + "/languages.json"))