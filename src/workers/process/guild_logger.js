const fs = require('fs')
const { data, send, axios, tokens } = require('../../index.js')
const { queueToDB, db } = require('./db')
const { EmbedBuilder } = require('discord.js')

const ranks = ['recruit', 'recruiter', 'captain', 'strategist', 'chief', 'owner']

let ctoken = 0

module.exports = (async () => {
    call()
    // setInterval(() => {
    //     call()
    // }, 1000 * 60 * 5) //1000*60*10
})()

async function sleep(ms) {
    console.log('waiting', ms, 'seconmds')
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(true)
        }, ms);
    })
}

async function callGetDelay(guildName) {
    return axios.get(encodeURI(data.urls.wyn + `guild/${guildName}`), { headers: { Authorization: `Bearer ${tokens.tokens_Trackers[ctoken]}` } }).then(ent => {
        return ent
    }).catch(async e => {
        if (e.status == 429) {
            ctoken++
            if (ctoken == tokens.tokens_Trackers.length) {
                await sleep(e.response.headers["ratelimit-reset"] * 1000)
                ctoken = 0
            }
        }
        return e
    })
}

async function call() {
    const info = {
        start: new Date(),
        requests: 0,
        errors: {},
        playersMapped: 0
    }
    const { data: guildsList } = (JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/guilds.json")))

    for (const guildName of guildsList.map(ent => ent[0].split(' - ')[0])) {
        info.requests++
        const res = await callGetDelay(guildName)
        let members = []
        if (res.status == 200) {
            for (const rank of ['recruit', 'recruiter', 'captain', 'strategist', 'chief', 'owner']) members.push(...Object.entries(res.data.members[rank]).map(ent => {
                info.playersMapped++
                return [
                    rank, ent[1].uuid, ent[0], (new Date(ent[1].joined) / 1000).toFixed()
                ]
            }))
            const comp = await compare(res.data.prefix, members, res.data)
            if (comp.proceed) proceed(res.data, comp)
            queueToDB(`INSERT OR REPLACE INTO Guilds (time, prefix, members, level, srRanks, name, wars, online) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(new Date() / 1000).toFixed(), res.data.prefix, JSON.stringify(members), res.data.level, JSON.stringify(res.data.seasonRanks), res.data.name, res.data.wars??0, res.data.online])
        } else {
            if (!info.errors[res.status]) info.errors[res.status] = 0
            info.errors[res.status]++
        }
    }

    console.log(`FINISHED MAPPING ALL`)
    console.log(info)
    console.log(`took ${(new Date()-info.start)/1000} seconds`)
    call()
}

async function proceed(guild, comp) {
    const { data: colors } = JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/colors.json"))
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))

    for (const trackers of Object.values(server)) {
        const t_ = trackers.filter(ent => ent.guild == guild.prefix || ent.guild == '<global>')
        if (!t_.length) continue
        const color_ = colors.find(ent => ent[0] === guild.name.trim())
        console.log(color_)
        const color = color_ ? color_[0] : '#777777'
        if (comp.gname.length) await send(t_[0].channel,
            {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${guild.name.slice(0, 25)} [${guild.prefix}]`)
                        .setDescription(`**Guild Name Change:**\n🗒️ **${comp.gname[0].old}** -> **${comp.gname[0].new}**`)
                        .setTimestamp()
                        .setColor(color)
                ]
            }
        )
        if (comp.level.length) await send(t_[0].channel,
            {
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${guild.name.slice(0, 25)} [${guild.prefix}]`)
                        .setDescription(`**Guild Level Up!**\n🏅 **${guild.name}** has leveled up to \`${comp.level[0].new}\``)
                        .setTimestamp()
                        .setColor(color)
                ]
            }
        )
        if (comp.members.length) {
            const joined = comp.members.filter(ent => ent.type == 'joined')
            const left = comp.members.filter(ent => ent.type == "left")
            await send(t_[0].channel,
                {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${guild.name.slice(0, 25)} [${guild.prefix}]`)
                            .setDescription(`${left.length ? `\n🔴 Member Left (${left.length})\n> ${left.map(ent => `\`[${ent.rank.toUpperCase()}] ${ent.name}\``).join('\n> ')}` : ``}${joined.length ? `\n🟢 Member Joined (${joined.length})\n> ${joined.map(ent => `\`${ent.name}\``).join('\n> ')}` : ``}`)
                            .setTimestamp()
                            .setColor(color)
                    ]
                }
            )
        }
        if (comp.rank.length) {
            const rankArray = comp.rank.map(ent => `> **${ent.name}** was \`${ranks.indexOf(ent.old) < ranks.indexOf(ent.new) ? `Promoted` : `Demoted`}\` from \`${ent.old.toUpperCase()}\` to \`${ent.new.toUpperCase()}\``)
            await send(t_[0].channel,
                {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${guild.name.slice(0, 25)} [${guild.prefix}]`)
                            .setDescription(`🎖️ **Rank Update:** (${rankArray.length})\n${rankArray.join('\n')}`)
                            .setTimestamp()
                            .setColor(color)
                    ]
                }
            )
        }
    }
}

async function compare(guild, members, data) {
    const changes = { members: [], rank: [], level: [], gname: [] }
    const dbDATA = await db.all(`SELECT * FROM Guilds WHERE prefix = ?`, [guild])
    if (!dbDATA.length) return { proceed: false, }
    const membersOLD = JSON.parse(dbDATA[0].members)

    members.forEach(e => {
        const oldUser_ = membersOLD.filter(ent => ent[1] == e[1])
        const oldUser = oldUser_[0] ?? []
        if (oldUser.length && oldUser[3] !== e[3]) {
            console.log(oldUser)
            changes.members.push({ type: 'member', uuid: oldUser[1], name: oldUser[2], type: 'left', time: e[3], rank: oldUser[0] })
            changes.members.push({ uuid: e[1], name: e[2], type: `joined`, time: e[3] })
            if (e[0] !== 'recruit') changes.rank.push({ uuid: e[1], name: e[2], old: 'recruit', new: e[0] })
        }
        if (!oldUser.length) {
            changes.members.push({ uuid: e[1], name: e[2], type: `joined`, time: e[3] })
            if (e[0] !== 'recruit') changes.rank.push({ uuid: e[1], name: e[2], old: 'recruit', new: e[0] })
        } else {
            if (oldUser && oldUser[0] !== e[0]) changes.rank.push({ uuid: e[1], name: e[2], old: oldUser[0], new: e[0] })
        }
    })

    membersOLD.forEach(e => {
        const newUser_ = members.filter(ent => ent[1] == e[1])
        if (!newUser_.length) console.log(e, newUser_)
        if (!newUser_.length) changes.members.push({ uuid: e[1], name: e[2], type: 'left', time: e[3], rank: e[0] })
    })

    if (dbDATA[0].level !== data.level) changes.level.push({ old: dbDATA[0].level, new: data.level })
    if (dbDATA[0].name !== data.name) changes.gname.push({ old: dbDATA[0].name, new: data.name })


        if (!!Object.values(changes).flat(1).length) console.log(membersOLD, data.members)

    return { proceed: !!Object.values(changes).flat(1).length, ...changes }
}