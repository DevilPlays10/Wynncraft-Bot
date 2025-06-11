const axios = require('axios')
const { data: config, updateVariable, send } = require('../../index.js')
const fs = require('fs')
const { EmbedBuilder } = require('discord.js')
const sqlite3 = require('sqlite3').verbose()

let obj = {}

module.exports = (async ()=>{
    call()
    setInterval(() => {
        call()
    }, 15000);
})()

async function call(){
    await axios.get(`${config.urls.wyn}guild/list/territory`).then(res=>{
        if (res.status != 200) return
        if (Object.values(obj).length) {
            const valuesARR = Object.values(res.data).map(ent=>ent.guild)
            const pushtoDB = []
            for (ent of Object.entries(res.data)) {
                if (ent[1].guild.uuid != obj[ent[0]].guild.uuid) {
                    pushtoDB.push({
                        terr: ent[0],
                        capturer: ent[1].guild,
                        capturer_total: valuesARR.filter(guild=>guild.uuid==ent[1].guild.uuid).length,
                        prev_holder: obj[ent[0]].guild, 
                        prev_holder_total: valuesARR.filter(guild=>guild.uuid==obj[ent[0]].guild.uuid).length,
                        timeHeld: Number(((new Date()-new Date(obj[ent[0]].acquired))/1000).toFixed())
                    })
                }
            }
            DBUpdate(pushtoDB)
            obj=res.data
        } else obj = res.data
    }).catch(e=>{
        console.log(e)
    })
}

let updateList = []
/**
 * Adds an array to territory DB
 * @param {*} data array of data to add into territory DB
 */
function DBUpdate(data) {
    updateList.push(...data);
    if (!updateList?.length) return;

    try {
        const db = new sqlite3.Database(`${config.storage}/process/territory.db`, (err) => {
            if (err) {
                console.error('Database connection error:', err);
                return;
            }
            for (const d of data) {
                db.run(
                    `INSERT INTO Territories 
                    (Held_For, Time, Territory, GuildUUID, GuildName, GuildPrefix, GuildTotal, PreviousGuildUUID, PreviousGuildName, PreviousGuildPrefix, PreviousGuildTotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        d.timeHeld,
                        Math.floor(new Date().getTime() / 1000),
                        d.terr,
                        d.capturer.uuid.replace(/-/g, ''),
                        d.capturer.name,
                        d.capturer.prefix,
                        d.capturer_total,
                        d.prev_holder.uuid.replace(/-/g, ''),
                        d.prev_holder.name,
                        d.prev_holder.prefix,
                        d.prev_holder_total
                    ],
                    (err) => {
                        if (err) console.error('Insert error:', err);
                    }
                );
            }
            db.close((err) => {
                if (err) console.error('Error closing DB:', err);
            });
        });

        updateList = [];
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

async function logdisc(arg) {
    const {terr:track} = JSON.parse(fs.readFileSync(config.storage+"/process/tracker_data.json"))
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