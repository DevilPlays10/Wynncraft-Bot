const fs = require('fs')
const { WynGET } = require('./wyn_api')
const { data, send } = require('../../index.js')
const { queueToDB, db } = require('./db')
const { EmbedBuilder } = require('discord.js')

const ranks = ['recruit', 'recruiter', 'captain', 'strategist', 'chief', 'owner']
const seasonRankings = [
    [1, "Contender"],
    [200, "+2048 Emeralds"],
    [800, "+2 Public Bank Slot"],
    [2000, "🥉 Season Badge - Bronze"],
    [7000, "+2 Public Bank Slot"],
    [10000, "🥈 Season Badge - Silver"],
    [15000, "+2 Public Bank Slot"],
    [20000, "+1 Guild Tome"],
    [30000, "+6144 Emeralds"],
    [45000, "+1 Private Bank Slot"],
    [70000, "+2 Guild Tome"],
    [100000, "🥈 Season Badge - Gold"],
    [140000, "+10240 Emeralds"],
    [200000, "+2 Public Bank Slot"],
    [260000, "+3 Guild Tome"],
    [330000, "+2 Private Bank Slot"],
    [430000, "+20480 Emeralds"],
    [540000, "+2 Public Bank Slot"],
    [650000, "+5 Guild Tome"],
    [760000, "🥇 Season Badge - Platinum"],
    [880000, "+40960 Emeralds"],
    [1000000, "+10 Guild Tome"],
    [1200000, "+2 Public Bank Slot"],
    [1500000, "+61440 Emeralds"],
    [2000000, "+2 Private Bank Slot"],
    [2500000, "+15 Guild Tome"],
    [3000000, "+2 Public Bank Slot"],
    [3500000, "+2 Private Bank Slot"],
    [4000000, "+102400 Emeralds"],
    [5000000, "🥇 Season Badge - Diamond"]
]


module.exports = (async () => {
    call()
    setInterval(() => {
        call()
    }, 1000 * 60 * 5) //1000*60*10
})()

async function call() {
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))
    const guildArray = []
    for (val of Object.values(server)) val.forEach(ent => {
        if (!guildArray.includes(ent.guild)) guildArray.push(ent.guild)
    })
    for (const guild of guildArray) {
        await WynGET(`guild/prefix/${guild}`).then(async res => {
            let members = []
            for (const rank of ['recruit', 'recruiter', 'captain', 'strategist', 'chief', 'owner']) members.push(...Object.entries(res.data.members[rank]).map(ent => {
                return [
                    rank, ent[1].uuid, ent[0], (new Date(ent[1].joined) / 1000).toFixed()
                ]
            }))
            const comp = await compare(guild, members, res.data)
            queueToDB(`INSERT OR REPLACE INTO Guilds (time, prefix, members, level, srRanks, name, wars, online) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(new Date() / 1000).toFixed(), guild, JSON.stringify(members), res.data.level, JSON.stringify(res.data.seasonRanks), res.data.name, res.data.wars, res.data.online])
            if (comp.proceed) proceed(res.data, comp)
        }).catch(e => {
            console.log(e)
        })
    }
}

function isValidHex(hex) {
    const regex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    return regex.test(hex);
}

async function proceed(guild, comp) {
    console.log(guild, comp)
    const { data: colors } = JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/colors.json"))
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))

    for (const trackers of Object.values(server)) {
        const t_ = trackers.filter(ent => ent.guild == guild.prefix)
        if (!t_.length) continue
        const color_ = colors.find(ent => ent[0] === guild.name.trim())
        const color = color_ ? isValidHex(color_[1]) ? color_[1] : '#777777' : '#777777'
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
        if (comp.sr.length) {
            const season = comp.sr[0].season
            const SrArray = comp.sr.map(ent => `Reached \`${ent.sr}\` Rating\n> ${ent.reward}`)
            await send(t_[0].channel,
                {
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${guild.name.slice(0, 25)} [${guild.prefix}]`)
                            .setDescription(`**☁️ Season ${season}**\n${SrArray.join('\n')}`)
                            .setTimestamp()
                            .setColor(color)
                    ]
                }
            )
        }
    }
}

async function compare(guild, members, data) {
    const changes = { members: [], rank: [], level: [], gname: [], sr: [] }
    const dbDATA = await db.all(`SELECT * FROM Guilds WHERE prefix = ?`, [guild])
    if (!dbDATA.length) return { proceed: false, }
    const membersOLD = JSON.parse(dbDATA[0].members)
    const srData = JSON.parse(dbDATA[0].srRanks)

    members.forEach(e => {
        const oldUser_ = membersOLD.filter(ent => ent[1] == e[1])
        const oldUser = oldUser_[0] ?? []
        if (oldUser.length && oldUser[3] !== e[3]) {
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
        if (!newUser_.length) changes.members.push({ uuid: e[1], name: e[2], type: 'left', time: e[3], rank: e[0] })
    })

    if (dbDATA[0].level !== data.level) changes.level.push({ old: dbDATA[0].level, new: data.level })
    if (dbDATA[0].name !== data.name) changes.gname.push({ old: dbDATA[0].name, new: data.name })
    const [ prevSR, newSR ] = [ Object.entries(srData).at(-1), Object.entries(data.seasonRanks).at(-1) ]
    if (prevSR[0]==newSR[0]) for ([sr, reward] of seasonRankings.reverse()) {
        if (prevSR[1].rating<=sr&&newSR[1].rating>=sr) {
            changes.sr.push({season: newSR[0], sr, reward})
        }
    }
    return { proceed: !!Object.values(changes).flat(1).length, ...changes }
}