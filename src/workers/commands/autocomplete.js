const { data } = require('../../index.js')
const fs = require('fs')

const extraOptions = {
    'territory_add-guild': [
        {
            name: '<GLOBAL>',
            value: '<global>'
        },
    ],
    'territory_add-territory': [
        {
            name: '<GLOBAL>',
            value: '<global>'
        }
    ]
}

async function Guilds(int) {
    const opt = int.options.getFocused(true)
    const {data:guilds} = JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/guilds.json"))
    const finalArr = guilds.filter(ent=>ent[0].toLowerCase().startsWith(opt.value.toLowerCase())||ent[0].toLowerCase().endsWith(opt.value.toLowerCase())).slice(0, 25).map(ent=>{
        return {
        name: ent[0],
        value: ent[0].split(' - ')[0]
    }})
    if (extraOptions[`${int.commandName}-${opt.name}`]) {
        int.respond([...extraOptions[`${int.commandName}-${opt.name}`], ...finalArr].slice(0, 25))
    } else int.respond(finalArr)
}

async function Territories(int) {
    const opt = int.options.getFocused(true)
    const {data:terrs} = JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/territories.json"))
    const finalArr = terrs.filter(ent=>ent.toLowerCase().startsWith(opt.value.toLowerCase())||ent.toLowerCase().endsWith(opt.value.toLowerCase())).map(ent=>{
        return {
            name: ent,
            value: ent
        }
    })
    if (extraOptions[`${int.commandName}-${opt.name}`]) {
        int.respond([...extraOptions[`${int.commandName}-${opt.name}`], ...finalArr].slice(0, 25))
    } else int.respond(finalArr)
}

module.exports = { Guilds, Territories }