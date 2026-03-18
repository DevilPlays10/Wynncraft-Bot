const fs = require('fs')
const { WynGET } = require('./wyn_api')
const { data, send } = require('../../index.js')
const { queueToDB, db } = require('./db')
const { EmbedBuilder } = require('discord.js')

const RAID_ICONS = {
    "Nest of the Grootslangs": "https://cdn.discordapp.com/attachments/1275592676233711646/1277693233530409031/100px-NestoftheGrootslangsIcon.png?ex=66ce180d&is=66ccc68d&hm=c57f7cdafeb3bb98d33efd1b35d45afc343698a0cd1f16b77772c15c80c7d4db&",
    "Orphion's Nexus of Light": "https://cdn.discordapp.com/attachments/1275592676233711646/1277693254812434442/100px-Orphion27sNexusofLightIcon.png?ex=66ce1812&is=66ccc692&hm=28f043eee4f3085caace0941b4fcd747107a6e55e87bf945dc085c6c79011591&",
    "The Canyon Colossus": "https://cdn.discordapp.com/attachments/1275592676233711646/1277693270490873937/100px-TheCanyonColossusIcon.png?ex=66ce1816&is=66ccc696&hm=6e575ce48445e7316e7fad0352ef01ea94b3fa8d3a88187d98a2405d51e10417&",
    "The Nameless Anomaly": "https://cdn.discordapp.com/attachments/1275592676233711646/1277693286668046458/100px-TheNamelessAnomalyIcon.png?ex=66ce1819&is=66ccc699&hm=7b0b2cfa2fe9dfe52d7de1c32f7d88f397edb759591e6590577391a73fa25b9e&"
}

const MAX_POSSIBLE_RAIDS_WITHIN_REQUESTS = 20

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
    }, 1000 * 60 * 3) //1000*60*10
})()

async function call() {

    function mapMembers(members) { // delete useless stuff to save space 
        return members.map(ent => {
            delete ent.server
            delete ent.contributed
            delete ent.contributionRank
            delete ent.online
            delete ent.server
            return ent
        })
    }

    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))
    const guildArray = []
    for (val of Object.values(server)) val.forEach(ent => {
        if (!guildArray.includes(ent.guild)) guildArray.push(ent.guild)
    })
    for (const guild of guildArray) {
        await WynGET(`guild/prefix/${guild}`).then(async res => {
            let members = []
            for (const rank of ['recruit', 'recruiter', 'captain', 'strategist', 'chief', 'owner']) members.push(...Object.entries(res.data.members[rank]).map(ent => {

                return {
                    rank,
                    name: ent[0],
                    ...ent[1]
                }

            }))

            const comp = await compare(guild, mapMembers(members), res.data)


            queueToDB(`INSERT OR REPLACE INTO Guilds (time, prefix, members, level, srRanks, name, wars, online) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    (new Date() / 1000).toFixed(),
                    guild,
                    JSON.stringify(mapMembers(members)),
                    res.data.level,
                    JSON.stringify(res.data.seasonRanks),
                    res.data.name,
                    res.data.wars,
                    res.data.online]
            )

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
    const { data: colors } = JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/colors.json"))
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))

    for (const trackers of Object.values(server)) {
        const t_ = trackers.filter(ent => ent.guild == guild.prefix)
        if (!t_.length) continue
        const color_ = colors.find(ent => ent[0] === guild.name.trim())
        const color = color_ ? isValidHex(color_[1]) ? color_[1] : '#777777' : '#777777'
        for (const inServerTracker of t_) {

            switch (inServerTracker.type) {
                case 'All':
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
                    break;

                case 'GRaids':
                    if (comp.graids.length) {
                        const raidEmbeds = comp.graids.map(raid => {

                            const embed = new EmbedBuilder()
                                .setTitle(raid.raid)
                                .setDescription(`**Members:**\n${raid.members.join(', ').replace('_', "\\_")}`)
                                .setTimestamp()
                                .setColor(color)
                            if (RAID_ICONS[raid.raid]) embed.setThumbnail(RAID_ICONS[raid.raid])
                            return embed
                        })

                        while (raidEmbeds.length) {

                            const embeds = raidEmbeds.splice(0, 8)

                            await send(t_[0].channel,
                                {
                                    embeds,
                                }
                            )

                        }
                    }
                    break;
            }
        }
    }
}

async function compare(guild, members, data) {
    // const membersUUIDS = {} // all members and their UUID {UUID: Name ... }
    let guildRaidsRaw = {};
    const changes = { members: [], rank: [], level: [], gname: [], sr: [], graids: [] }
    const dbDATA = await db.all(`SELECT * FROM Guilds WHERE prefix = ?`, [guild])
    if (!dbDATA.length) return { proceed: false, }

    const membersOLD = JSON.parse(dbDATA[0].members)
    const srData = JSON.parse(dbDATA[0].srRanks)

    members.forEach(newUser => {
        // membersUUIDS[newUser.uuid] = newUser.name

        const oldUser_ = membersOLD.filter(ent => ent.uuid == newUser.uuid)
        const oldUser = oldUser_[0] ?? null

        if (oldUser && oldUser.joined !== newUser.joined) {
            changes.members.push({ type: 'member', uuid: oldUser.uuid, name: oldUser.name, type: 'left', time: newUser.joined, rank: oldUser.rank })
            changes.members.push({ uuid: newUser.uuid, name: newUser.name, type: `joined`, time: newUser.joined })
            if (newUser.rank !== 'recruit') changes.rank.push({ uuid: newUser.uuid, name: newUser.name, old: 'recruit', new: newUser.rank })
        }

        if (!oldUser) {
            changes.members.push({ uuid: newUser.uuid, name: newUser.name, type: `joined`, time: newUser.joined })
            if (newUser.rank !== 'recruit') changes.rank.push({ uuid: newUser.uuid, name: newUser.name, old: 'recruit', new: newUser.rank })
        } else {
            if (oldUser && oldUser.rank !== newUser.rank) changes.rank.push({ uuid: newUser.uuid, name: newUser.name, old: oldUser.rank, new: newUser.rank })
        }
    })

    membersOLD.forEach(mem_old => {
        const newUser_ = members.filter(ent => ent.uuid == mem_old.uuid)

        if (!newUser_.length) { // handle user leaving the guild

            changes.members.push({ uuid: mem_old.uuid, name: mem_old.name, type: 'left', time: mem_old.joined, rank: mem_old.rank })

        } else if ((totalRaidsMembers(members) - totalRaidsMembers(membersOLD)) < MAX_POSSIBLE_RAIDS_WITHIN_REQUESTS) {  // check total raids done by all members, if greater than threshold, skip BECAUAE SWYNNC RAFT IS FUCKING RETARDED AND RANDOMLY SENDS MEMBERS GRAIDS AS 0?????
            // compare guild raid if user already existed in the guild

            const mem_new = newUser_[0] // the new data gathered for the user

            if (mem_old.guildRaids.total != mem_new.guildRaids.total) { // if the prev and new graid values dont match, that means they did graid

                for (const [raid, completions] of Object.entries(mem_old.guildRaids.list)) {
                    const newCompletions = mem_new.guildRaids.list[raid]

                    if (completions == newCompletions) continue;

                    if (!guildRaidsRaw[raid]) guildRaidsRaw[raid] = {}

                    console.log(mem_old.name, newCompletions - completions)

                    guildRaidsRaw[raid][mem_old.name] = newCompletions - completions
                }

            }

        }
    })
    changes.graids = groupGuildRaids(guildRaidsRaw)

    // console.log((totalRaidsMembers(members) - totalRaidsMembers(membersOLD)))
    console.log(guild, groupGuildRaids(guildRaidsRaw))


    if (dbDATA[0].level !== data.level) changes.level.push({ old: dbDATA[0].level, new: data.level })
    if (dbDATA[0].name !== data.name) changes.gname.push({ old: dbDATA[0].name, new: data.name })
    const [prevSR, newSR] = [Object.entries(srData).at(-1), Object.entries(data.seasonRanks).at(-1)]
    if (prevSR[0] == newSR[0]) for ([sr, reward] of seasonRankings.reverse()) {
        if (prevSR[1].rating <= sr && newSR[1].rating >= sr) {
            changes.sr.push({ season: newSR[0], sr, reward })
        }
    }

    return { proceed: !!Object.values(changes).flat(1).length, ...changes }
}

/**
 * return total raids done using a membersArray
 * @param {Array} members 
 * @returns 
 */
function totalRaidsMembers(members) {
    let total = 0
    members.forEach(ent => {
        total += ent.guildRaids.total
    })
    return total
}

/**
 * group guild raid completions into actual graids
 * @param {*} data { RaidName: {uuid1: num, uuid2: num ... } } 
 * @returns [ { name: raidname, members: [] } ... ]
 */
function groupGuildRaids(data) {

    let result = []

    for (const [raidName, uuids] of Object.entries(data)) {

        while (Object.values(uuids).length >= 4) {

            // pick 4 unique players, lower their count until 0 then delete
            const group = Object.entries(uuids).slice(0, 4).map(([uuid]) => {
                uuids[uuid]--
                if (uuids[uuid] == 0) delete uuids[uuid]
                return uuid
            });

            result.push({
                members: group,
                raid: raidName
            })
        }
    }

    return result
}