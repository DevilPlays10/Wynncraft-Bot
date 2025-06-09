const axios = require('axios')
const { data, updateVariable, send } = require('../../index.js')
const fs = require('fs')
const { EmbedBuilder } = require('discord.js')

let obj = {}

module.exports = (async ()=>{
    call()
    setInterval(() => {
        call()
    }, 30000);
})()

async function call(){
    await axios.get(`${data.urls.wyn}guild/list/territory`).then(res=>{
        if (res.status != 200) return
        if (Object.values(obj).length) {
            const valuesARR = Object.values(res.data).map(ent=>ent.guild)
            for (ent of Object.entries(res.data)) {
                if (ent[1].guild.uuid != obj[ent[0]].guild.uuid) {
                    addtojson({
                        terr: ent[0],
                        capturer: ent[1].guild,
                        capturer_total: valuesARR.filter(guild=>guild.uuid==ent[1].guild.uuid).length,
                        prev_holder: obj[ent[0]].guild, 
                        prev_holder_total: valuesARR.filter(guild=>guild.uuid==obj[ent[0]].guild.uuid).length,
                        timeHeld: new Date()-new Date(obj[ent[0]].acquired)
                    })
                }
            }
            obj=res.data
        } else obj = res.data
    }).catch(e=>{
        console.log(e)
    })
}

function addtojson(json) {
    logdisc(json)
    if (json.capturer.prefix.toLowerCase() == "none") return
    const { data: dat } = JSON.parse(fs.readFileSync(data.storage+"/process/terr.json"))
    if (!dat[json.capturer.uuid]) dat[json.capturer.uuid] = []
    dat[json.capturer.uuid].unshift({type: "took", territory: json.terr, o_guild: json.prev_holder, time: new Date().getTime(), heldfor: json.timeHeld})
    if (!dat[json.prev_holder.uuid]) dat[json.prev_holder.uuid] = []
    dat[json.prev_holder.uuid].unshift({type: "lost", territory: json.terr, o_guild: json.capturer, time: new Date().getTime(), heldfor: json.timeHeld})
    dat[json.capturer.uuid].slice(0, 50)
    dat[json.prev_holder.uuid].slice(0, 50)
    updateVariable(data.storage+"/process/terr.json", "data", dat)
}

async function logdisc(arg) {
    const {terr:track} = JSON.parse(fs.readFileSync(data.storage+"/process/tracker_data.json"))
    for (guild_data of Object.values(track)) {
        for (channel of Object.entries(guild_data.data)) {
            if (channel[0]=="<global>") {
                await send(channel[1], {embeds: [
                    new EmbedBuilder()
                    .setTitle(':golf: Territory Captured')
                    .setDescription(`**${arg.terr}**\n${arg.prev_holder.name} (${arg.prev_holder_total+1} > ${arg.prev_holder_total}) --> **${arg.capturer.name}** (${arg.capturer_total-1} > ${arg.capturer_total})`)
                    .setColor(0x2596be)
                    .setTimestamp()
                ]})
            } else if (channel[0]==arg.capturer.uuid) {
                await send(channel[1], {embeds: [
                    new EmbedBuilder()
                    .setTitle(':green_circle: Territory Captured')
                    .setDescription(`**${arg.terr}**\n${arg.prev_holder.name} (${arg.prev_holder_total+1} > ${arg.prev_holder_total}) --> **${arg.capturer.name}** (${arg.capturer_total-1} > ${arg.capturer_total})`)
                    .setColor(0x7DDA58)
                    .setTimestamp()
                ]})
            } else if (channel[0]==arg.prev_holder.uuid) {
                await send(channel[1], {embeds: [
                    new EmbedBuilder()
                    .setTitle(':red_circle: Territory Lost')
                    .setDescription(`**${arg.terr}**\n**${arg.prev_holder.name}** (${arg.prev_holder_total+1} > ${arg.prev_holder_total}) --> ${arg.capturer.name} (${arg.capturer_total-1} > ${arg.capturer_total})`)
                    .setColor(0xE4080A)
                    .setTimestamp()
                ]})
            }
        }
    }
}