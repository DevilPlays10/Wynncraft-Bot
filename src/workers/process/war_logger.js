const { data: config, send, client } = require('../../index.js')
const fs = require('fs')
const { EmbedBuilder } = require('discord.js')
const { query: { all, run } } = require('../process/db.js')
const { WynGET } = require('./wyn_api.js')
const { Time: { relative } } = require('../utility')

let obj = {}
const defenceIDS = [ // do not change this is used to get id when inserting into db
    "VERY_LOW",
    "LOW",
    "MEDIUM",
    "HIGH",
    "VERY_HIGH"
]

module.exports = (async () => {
    call()
    setInterval(() => {
        call()
    }, 15000);
})()

async function call() {
    await WynGET(`guild/list/territory`).then(async res => {
        if (res.status != 200) return
        if (Object.values(obj).length) {
            const valuesARR = Object.values(res.data).map(ent => ent.guild)
            let pushtoDB = []
            for (ent of Object.entries(res.data)) {
                const [newGuild, oldGuild] = [ent[1].guild, obj[ent[0]].guild]
                if (!oldGuild.uuid || !newGuild.uuid) continue;
                if (newGuild.uuid != oldGuild.uuid) {

                    const guilds = all(`INSERT INTO Guild_IDS_T (name, prefix, uuid) VALUES (?, ?, ?), (?, ?, ?)
                        ON CONFLICT(uuid) DO UPDATE SET name = excluded.name 
                        RETURNING *;`, [
                            newGuild.name, newGuild.prefix, newGuild.uuid,
                            oldGuild.name, oldGuild.prefix, oldGuild.uuid
                        ])

                    const old_territory = obj[ent[0]]    // ent[0] is new territory but not used so not defined
                    const out = {
                        terr: ent[0],
                        db: guilds,
                        capturer: newGuild,
                        capturer_total: valuesARR.filter(guild => guild.uuid == newGuild.uuid).length,
                        prev_holder: oldGuild,
                        prev_holder_total: valuesARR.filter(guild => guild.uuid == oldGuild.uuid).length,
                        timeHeld: Number(((new Date() - new Date(old_territory.acquired)) / 1000).toFixed()),
                        prev_terr_details: {
                            hq: old_territory.hq,
                            treasury: old_territory.treasury,
                            defence: old_territory.defences,
                            resources: old_territory.resources
                        }
                    }
                    pushtoDB.push(out)
                    logdisc(out)
                }
            }
            pushtoDB = pushtoDB.map(d => [
                d.timeHeld,
                Math.floor(new Date().getTime() / 1000),
                d.terr,
                d.db[0].id,
                d.capturer_total,
                d.db[1].id,
                d.prev_holder_total,
                d.prev_terr_details.hq? 1: 0,
                defenceIDS.indexOf(d.prev_terr_details.defence)
            ])

            if (pushtoDB.length) {
                // console.log(`inserting ${pushtoDB.length} entries`)
                const questionMarks = pushtoDB.map(ent=>`(?, ?, ?, ?, ?, ?, ?, ?, ?)`).join(", ")
                run(
                    `INSERT INTO Territory_Changes_T (held_time, time, territory, guildID, guildTotal, previousGuildID, previousGuildTotal, hq, defence) VALUES ${questionMarks}`,
                    pushtoDB.flat(1)
                )
            }

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
    const track = JSON.parse(fs.readFileSync(config.storage + "/process/terr_track.json"))
    for (const guild of Object.values(track.server)) for (const tracker of guild) {
        if (tracker.guild == '<global>' && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await send(tracker.channel, {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`:golf: Territory Captured${arg.prev_terr_details.hq ? ` (HQ)` : ``}`)
                        .setDescription(
                            `**${arg.terr}**\n${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value: `Defence: \`${arg.prev_terr_details.defence}\`\nTreasury: \`${arg.prev_terr_details.treasury}\`${arg.prev_terr_details.hq ? `\n**Resources:**\`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
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
                            `**${arg.terr}**\n${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value: `Defence: \`${arg.prev_terr_details.defence}\`\nTreasury: \`${arg.prev_terr_details.treasury}\`${arg.prev_terr_details.hq ? `\n**Resources:**\`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
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
                            `**${arg.terr}**\n**${arg.prev_holder.name} [${arg.prev_holder.prefix}]** (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> ${arg.capturer.name} [${arg.capturer.prefix}] (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value: `Defence: \`${arg.prev_terr_details.defence}\`\nTreasury: \`${arg.prev_terr_details.treasury}\`${arg.prev_terr_details.hq ? `\n**Resources:**\`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
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
                        .setTitle(`:golf: Territory Captured${arg.prev_terr_details.hq ? ` (HQ)` : ``}`)
                        .setDescription(
                            `**${arg.terr}**\n${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value: `Defence: \`${arg.prev_terr_details.defence}\`\nTreasury: \`${arg.prev_terr_details.treasury}\`${arg.prev_terr_details.hq ? `\n**Resources:**\`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
                        })
                        .setColor(0x2596be)
                        .setTimestamp()
                ]
            })
        } else if (tracker.guild == arg.capturer.uuid && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await UserData[user[0]].send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`:green_circle: Territory Captured${arg.prev_terr_details.hq ? ` (HQ)` : ''}`)
                        .setDescription(
                            `**${arg.terr}**\n${arg.prev_holder.name} [${arg.prev_holder.prefix}] (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> **${arg.capturer.name} [${arg.capturer.prefix}]** (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value: `Defence: \`${arg.prev_terr_details.defence}\`\nTreasury: \`${arg.prev_terr_details.treasury}\`${arg.prev_terr_details.hq ? `\n**Resources:**\`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
                        })
                        .setColor(0x7DDA58)
                        .setTimestamp()
                ]
            })
        } else if (tracker.guild == arg.prev_holder.uuid && (tracker.terr == arg.terr || tracker.terr == '<global>')) {
            await UserData[user[0]].send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`:red_circle: Territory Lost${arg.prev_terr_details.hq ? ` (HQ)` : ''}`)
                        .setDescription(
                            `**${arg.terr}**\n**${arg.prev_holder.name} [${arg.prev_holder.prefix}]** (${arg.prev_holder_total + 1} > ${arg.prev_holder_total}) --> ${arg.capturer.name} [${arg.capturer.prefix}] (${arg.capturer_total - 1} > ${arg.capturer_total})\nHeld: \`${relative(arg.timeHeld * 1000, 'dhms', 1, 3)}\``
                        )
                        .setFields({
                            name: "Territory Details", value: `Defence: \`${arg.prev_terr_details.defence}\`\nTreasury: \`${arg.prev_terr_details.treasury}\`${arg.prev_terr_details.hq ? `\n**Resources:**\`\`\`ml\n${arg.prev_terr_details.resources.map(ent => `+${ent.stored} ${ent.type}`).join("\n")}\`\`\`` : ``}`
                        })
                        .setColor(0xE4080A)
                        .setTimestamp()
                ]
            })
        }
    }
}