const { data: config, send, client } = require('../../index.js')
const fs = require('fs')
const { EmbedBuilder } = require('discord.js')
const { queueToDB } = require('../process/db.js')
const { WynGET } = require('./wyn_api.js')
const { Time: { relative } } = require('../utility')

let obj = {}

module.exports = (async () => {
    call()
    setInterval(() => {
        call()
    }, 15000);
})()

async function call() {
    await WynGET(`guild/list/territory`).then(res => {
        if (res.status != 200) return
        if (Object.values(obj).length) {
            const valuesARR = Object.values(res.data).map(ent => ent.guild)
            const pushtoDB = []
            for (ent of Object.entries(res.data)) {
                if (!obj[ent[0]].guild.uuid || !ent[1].guild.uuid) continue;
                if (ent[1].guild.uuid != obj[ent[0]].guild.uuid) {
                    const out = {
                        terr: ent[0],
                        capturer: ent[1].guild,
                        capturer_total: valuesARR.filter(guild => guild.uuid == ent[1].guild.uuid).length,
                        prev_holder: obj[ent[0]].guild,
                        prev_holder_total: valuesARR.filter(guild => guild.uuid == obj[ent[0]].guild.uuid).length,
                        timeHeld: Number(((new Date() - new Date(obj[ent[0]].acquired)) / 1000).toFixed()),
                        prev_terr_details: {
                            hq: obj[ent[0]].hq,
                            treasury: obj[ent[0]].treasury,
                            defence: obj[ent[0]].defences,
                            resources: obj[ent[0]].resources
                        }
                    }
                    pushtoDB.push(out)
                    logdisc(out)
                }
            }
            if (pushtoDB.length) pushtoDB.map(d => [
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
            ]).forEach(element => {
                queueToDB(`INSERT INTO Territories (Held_For, Time, Territory, GuildUUID, GuildName, GuildPrefix, GuildTotal, PreviousGuildUUID, PreviousGuildName, PreviousGuildPrefix, PreviousGuildTotal)    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, element)
            });
            obj = res.data
        } else obj = res.data
    }).catch(e => {
        if (e instanceof TypeError) {
            console.log("Reseting war_logger-object") // wynncraft anti api fuckup prevention
            obj = {}
        }
        console.log(e)
    })
}

let UserData = {}
async function AddUsers(users) {
    for (const id of users) {
        if (UserData[id]) return
        UserData[id] = await client.users.fetch(id)
    }
    for (const id of Object.getOwnPropertyNames(UserData)) {
        if (!users.includes(id)) delete UserData[id]
    }
}

async function logdisc(arg) {
    console.log(arg)
    const track = JSON.parse(fs.readFileSync(config.storage + "/process/terr_track.json"))
    for (const guild of Object.values(track.server)) for (const tracker of guild) {
        if (tracker.guild == '<global>' && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await send(tracker.channel, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`:golf: Territory Captured${arg.prev_terr_details.hq ? ` (HQ)` : ``}`)
                        .setDescription(
                            `**${arg.terr}**
                            ${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})
                            Held: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value:
                            `Defence: \`${arg.prev_terr_details.defence}\`
                            Treasury: \`${arg.prev_terr_details.treasury}\`\
                            ${arg.prev_terr_details.hq ? `\n**Resources:**    \`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
                        })
                        .setColor(0x2596be)
                        .setTimestamp()
                ]
            })
        } else if (tracker.guild == arg.capturer.uuid && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await send(tracker.channel, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`:green_circle: Territory Captured${arg.prev_terr_details.hq ? ` (HQ)` : ''}`)
                        .setDescription(
                            `**${arg.terr}**
                            ${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})
                            Held: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value:
                            `Defence: \`${arg.prev_terr_details.defence}\`
                            Treasury: \`${arg.prev_terr_details.treasury}\`\
                            ${arg.prev_terr_details.hq ? `\n**Resources:**    \`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
                        })
                        .setColor(0x7DDA58)
                        .setTimestamp()
                ]
            })
        } else if (tracker.guild == arg.prev_holder.uuid && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await send(tracker.channel, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`:red_circle: Territory Lost${arg.prev_terr_details.hq ? ` (HQ)` : ''}`)
                        .setDescription(
                            `**${arg.terr}**
                            **${arg.prev_holder.name} [${arg.prev_holder.prefix}]** (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> ${arg.capturer.name} [${arg.capturer.prefix}] (${arg.capturer_total - 1} > ${arg.capturer_total})
                            Held: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value:
                            `Defence: \`${arg.prev_terr_details.defence}\`
                            Treasury: \`${arg.prev_terr_details.treasury}\`\
                            ${arg.prev_terr_details.hq ? `\n**Resources:**    \`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
                        })
                        .setColor(0xE4080A)
                        .setTimestamp()
                ]
            })
        }
    }
    await AddUsers(Object.getOwnPropertyNames(track.user))
    for (const user of Object.entries(track.user)) for (const tracker of user[1]) {
        console.log(arg)
        if (tracker.guild == '<global>' && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await UserData[user[0]].send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(':golf: Territory Captured')
                        .setDescription(`**${arg.terr}**\n${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``)
                        .setColor(0x2596be)
                        .setTimestamp()
                ]
            })
        } else if (tracker.guild == arg.capturer.uuid && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await UserData[user[0]].send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(':green_circle: Territory Captured')
                        .setDescription(`**${arg.terr}**\n${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``)
                        .setColor(0x7DDA58)
                        .setTimestamp()
                ]
            })
        } else if (tracker.guild == arg.prev_holder.uuid && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await UserData[user[0]].send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(':red_circle: Territory Lost')
                        .setDescription(`**${arg.terr}**\n**${arg.prev_holder.name} [${arg.prev_holder.prefix}]** (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> ${arg.capturer.name} [${arg.capturer.prefix}] (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``)
                        .setColor(0xE4080A)
                        .setTimestamp()
                ]
            })
        }
    }
}