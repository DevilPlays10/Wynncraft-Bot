const { getLang, data: config, Utility, tokens } = require('../../../index.js')
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js')
const { db } = require('../../process/db.js')
const { WynGET } = require('../../process/wyn_api.js')
const { CalcMemberSlots } = require('../../utility')
const fs = require('fs')


const raidColors = {
    "Nest of the Grootslangs": "#3daf65",
    "Orphion's Nexus of Light": "#c1d2d0",
    "The Canyon Colossus": "#584c4d",
    "The Nameless Anomaly": "#15110e",
    404: "#999999"
}
const raidNicks = {
    "Nest of the Grootslangs": "NOTG",
    "Orphion's Nexus of Light": "NOL",
    "The Canyon Colossus": "TCC",
    "The Nameless Anomaly": "TNA",
    404: "error missing"
}

const ints = {}

function isValidHex(hex) {
    const regex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    return regex.test(hex);
}

const allowGUILDIDBFS = '962855308932317204'
const allowROLEIDBFS = '1168775281117499485'

function BFSToken(guildID, member) {
    if (guildID !== allowGUILDIDBFS) return false
    return member._roles.includes(allowROLEIDBFS)
}

async function guild(interaction) {
    const st_time = new Date().getTime()
    const msg = await interaction.deferReply({
        withResponse: true
    })
    const ulang = getLang(interaction)
    let guild = interaction.options.getString('name').trim()
    const regx = guild.match(/[^A-Za-z ]/g)

    if (regx) return { embeds: [new EmbedBuilder().setTitle(`${ulang.err}`).setDescription(`${ulang.g_cause}\n[${regx.join(", ")}]`).setFooter({ text: `${ulang.req_took} ${new Date().getTime() - st_time}ms` }).setTimestamp()] }

    let prefix = false
    if (guild.length <= 4 && !guild.includes(" ")) prefix = true
    //name reoslver
    const list = prefix ? await WynGET(`guild/list/guild`).catch(e => { return e }) : { status: 0 }
    const similar_guilds = list.status == 200 ? Object.entries(list.data).filter(ent => ent[1].prefix.toLowerCase() == guild.toLowerCase()) : []
    if (similar_guilds.length == 1) guild = similar_guilds[0][1].prefix
    //end
    return await WynGET(prefix ? `guild/prefix/${guild}` : `guild/${guild}`, BFSToken(interaction.guildId, interaction.member) ? `Bearer ${tokens.wyn_api_GUILD}` : null).then(async (res) => {
        const dat = res.data
        console.log(dat)
        const { data: colors } = JSON.parse(fs.readFileSync(config.storage + "/process/autocomplete/colors.json"))
        const color_ = colors.find(ent => ent[0] === dat.name.trim())
        const color = color_ ? isValidHex(color_[1]) ? color_[1] : '#777777' : '#777777'

        const jc = (() => {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
            const date = new Date(dat.created)
            return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`
        })()
        const mlist = []
        for (const rank of ["owner", "chief", "strategist", "captain", "recruiter", "recruit"]) {
            for (const mem of Object.entries(dat.members[rank])) {
                mlist.push({
                    online: mem[1].online,
                    server: mem[1].server,
                    xp: mem[1].contributed,
                    rank: mem[1].contributionRank,
                    name: mem[0],
                    uuid: mem[1].uuid,
                    rank: rank,
                    joined: new Date(mem[1].joined),
                    guildRaids: mem[1].guildRaids
                })
            }
        }
        const terrlist = await WynGET(`guild/list/territory`).catch(e => e)
        const made_date = new Date(dat.created)
        //page 1
        const on_list = mlist.filter(ent => ent.online).map(ent => `[${ent.rank.toUpperCase()}] ${ent.name} (${ent.server})`)
        const embed1 = new EmbedBuilder()
            .setTitle(`${dat.name}`)
            .setFooter({ text: `Page 1 / 6 - Request took ${new Date()-st_time}ms` })
            .setDescription(`UUID: \`${dat.uuid}\`\n\`\`\`ml\nName: ${dat.name} (${dat.prefix})\nOwner: ${Object.getOwnPropertyNames(dat.members.owner).join("")}\nMembers: ${dat.members.total} / ${CalcMemberSlots(dat.level)}\nLevel: ${dat.level} (${dat.xpPercent}%)\nCreated: ${jc}\nAge: ${Utility.Date.relative(made_date, 'ydhms', 0, 3)}\nWar Count: ${dat.wars ?? 0}\nTerritories: ${dat.territories}\`\`\`\n**Online Members: (${dat.online})**\n\`\`\`ml\n${dat.online ? `${on_list.slice(0, 50).join("\n")}${dat.online == on_list.length ? `` : `\n(+${dat.online - on_list.length} in Streamer)`}` : `No members online :(`}\`\`\``)
            .setColor(color)
        //page 2
        const [owner] = mlist.filter(ent => ent.rank == "owner")
        const embed2 = new EmbedBuilder()
            .setTitle(`${dat.prefix} Members:`)
            .setDescription(`**Total Members:** \`${dat.members.total}\`\n**Owner:**\n\`\`\`yaml\n${(owner.name).padEnd(16, ' ')} | ${Utility.Num.Small(owner.xp)} XP ${(new Date() - owner.joined) < 604800000 ? `[${Utility.Date.relative(ent.joined, 'dhms', 0, 1)}] ` : ""}${owner.online ? `- (${owner.server})` : ""}\`\`\``)
            .setColor(color)
        for (r of ["chief", "strategist", "captain", "recruiter", "recruit"]) {
            const list = mlist.filter(ent => ent.rank == r).map(ent => `${(ent.name).padEnd(16, ' ')} | ${Utility.Num.Small(ent.xp)} XP ${(new Date().getTime() - new Date(ent.joined).getTime()) < 604800000 ? `[${Utility.Date.relative(ent.joined, 'dhms', 0, 1)}] ` : ""}${ent.online ? `- (${ent.server})` : ""}`)
            if (!list.length) {
                embed2.addFields({
                    name: `${r.toUpperCase()}: (0)`,
                    value: `\`\`\`yaml\nNo ${r}s found\`\`\``
                });
            }
            for (let i = 0; i < list.length; i += 25) {
                embed2.addFields({
                    name: i == 0 ? `${r.toUpperCase()}: (${list.length})` : `\u200B`,
                    value: `\`\`\`yaml\n${list.slice(i, i + 25).join("\n")}\`\`\``
                });
            }
        }
        console.log(mlist)
        // page guild raids 

        let total = 0
        const topRaiders = (mlist.map(ent => ([ent.name, ent.guildRaids.total])).sort((a, b) => b[1] - a[1]))
        const graidSeperates = {}

        mlist.map(ent => ent.guildRaids).forEach(ent => { // divide the numbers by 4 coz takes 4 members for a graid ykykyk
            total += ent.total / 4
            for (const [raid, count] of Object.entries(ent.list)) {
                if (!graidSeperates[raid]) graidSeperates[raid] = 0
                graidSeperates[raid] += count / 4
            }
        })

        const entries = Object.entries(graidSeperates).map(ent => {
            return { raid: raidNicks[ent[0]], count: ent[1], color: raidColors[ent[0]] ?? raidColors[404] }
        }).sort((a, b) => b.count - a.count)

        const graphConfig = {
            type: 'pie',
            data: {
                labels: entries.map(ent => ent.raid),
                datasets: [{
                    label: `GRaids ${dat.prefix}`,
                    data: entries.map(ent => Math.floor(ent.count)),
                    backgroundColor: entries.map(ent => ent.color)
                }]
            },
            options: {
                plugins: {
                    datalabels: {
                        color: '#6faef7',
                        font: {
                            weight: 'bold',
                            size: 14
                        }
                    }
                }
            }
        }

        const embedGRaids = new EmbedBuilder()
            .setTitle(`${dat.prefix} Guild Raids`)
            .setColor(color)
            .addFields([
                { name: `Guild Raids: (${Math.floor(total)})`, value: `\`\`\`ex\n${entries.map(ent => `${ent.raid}: ${ent.count} [${findperc(ent.count, total)}%]`).join("\n")}\`\`\`` },
                { name: `**Top Raiders:**`, value: `\`\`\`ex\n${topRaiders.slice(0, 5).map(ent => `${ent[0]}: ${ent[1]}`).join("\n")}\`\`\`` }
            ])
            .setImage(`https://quickchart.io/chart?w=700&h=700&c=${encodeURIComponent(JSON.stringify(graphConfig))}`)
        // page end
        //page terrs
        const embed3 = new EmbedBuilder()
            .setTitle(`${dat.prefix} Territories:`)
            .setColor(color)
        if (terrlist.status != 200) embed3.setDescription(`An Error occured\n\`\`\`js\n${terrlist.message.split("\n")[0]}\n\`\`\``)
        if (terrlist.status == 200) {
            const ters = Object.entries(terrlist.data).filter(ent => ent[1].guild.uuid == dat.uuid).sort((a, b) => new Date(a[1].acquired).getTime() - new Date(b[1].acquired).getTime())
            if (ters.length) {
                const t2 = ters.map(ent => `${ent[0]}: [${Utility.Date.relative(ent[1].acquired, 'dhms', 0, 2)}]`)
                for (let i = 0; i < t2.length; i += 20) {
                    embed3.addFields({
                        name: i == 0 ? `Territories: (${t2.length})` : `\u200B`,
                        value: `\`\`\`bf\n${t2.slice(0, 120).slice(i, i + 20).join("\n")}\`\`\``
                    });
                }
            } else {
                embed3.addFields({ name: `Territories: (0)`, value: "\`\`\`js\nGuild owns 0 Territories\`\`\`" })
            }
        }
        //pahe terr history
        const uuid = res.data.uuid.replace(/-/g, '');
        const terr_data = await db.all(`SELECT * FROM Territories WHERE GuildUUID = ? OR PreviousGuildUUID = ? ORDER BY Time DESC LIMIT 20`, [uuid, uuid])
        const g_ter = terr_data.map(ent => `${ent.GuildUUID == dat.uuid.replace(/-/g, '') ?
            `+ (${ent.GuildTotal - 1} > ${ent.GuildTotal}) ${ent.Territory}\n+ From [${ent.PreviousGuildPrefix}] (${ent.PreviousGuildTotal + 1} > ${ent.PreviousGuildTotal})\n+ Held ${Utility.Date.relative(ent.Held_For * 1000, 'dhms', 1, 1)} - ${Utility.Date.relative(ent.Time * 1000, 'dhms', 0, 2)} ago` :
            `- (${ent.PreviousGuildTotal + 1} > ${ent.PreviousGuildTotal}) ${ent.Territory}\n- To [${ent.GuildPrefix}] (${ent.GuildTotal - 1} > ${ent.GuildTotal})\n- Held ${Utility.Date.relative(ent.Held_For * 1000, 'dhms', 1, 1)} - ${Utility.Date.relative(ent.Time * 1000, 'dhms', 0, 2)} ago`
            }`)
        const embed4 = new EmbedBuilder()
            .setTitle(`${dat.prefix} War logs:`)
            .setColor(color)
        if (!g_ter.length) embed4.setDescription('\`\`\`ml\nNo History\`\`\`')
        if (g_ter.length) {
            const fields = [{ name: "War Logs:", value: `\`\`\`diff\n${g_ter.slice(0, 10).join("\n\n")}\`\`\``, inline: true }]
            if (g_ter.length > 10) fields.push({ name: "War Logs:", value: `\`\`\`diff\n${g_ter.slice(10, 20).join("\n\n")}\`\`\``, inline: true })
            embed4.addFields(fields)
        }
        //page SR rating
        const embed5 = new EmbedBuilder()
            .setTitle(`${dat.prefix} Rankings:`)
            .setDescription(`Season: Rating: Territories\`\`\`ml\n${Object.values(dat.seasonRanks).length ? `${Object.entries(dat.seasonRanks).map(ent => `${(`Season ${ent[0]}`).padEnd(10, ' ')}${(`|  ${ent[1].rating}`).padEnd(12, ' ')} | ${ent[1].finalTerritories} Terrs`).join("\n")}` : `No History`}\`\`\``)
            .setColor(color)
        //pages end

        const button1 = new ButtonBuilder()
            .setCustomId("guild_cmd_button1")
            .setLabel(`Previous Page`)
            .setStyle(ButtonStyle.Primary)
        const button2 = new ButtonBuilder()
            .setCustomId("guild_cmd_button2")
            .setLabel(`Next Page`)
            .setStyle(ButtonStyle.Primary)
        const row = new ActionRowBuilder().addComponents(button1, button2)

        ints[msg.resource.message.id] = {
            current: 0,
            pages: [embed1, embed2, embedGRaids, embed3, embed4, embed5]
        }

        setTimeout(() => {
            const row = new ActionRowBuilder().addComponents(button1.setDisabled(true), button2.setDisabled(true))
            delete ints[interaction.webhook.id]
            interaction.editReply({ components: [row] }).catch(e => console.log(e))
        }, 600000);
        return { embeds: [embed1], components: [row] }

    }).catch(async (e) => {

        console.log(e)
        const embed = new EmbedBuilder()
            .setTitle(`${ulang.err}`)
            .setDescription(`\`\`\`js\n${e.stack.split('\n')[0]}\`\`\``)
            .setFooter({ text: `${ulang.req_took} ${new Date().getTime() - st_time}ms` })
            .setTimestamp()
        if (e.status == 404) {
            embed.setTitle(`${ulang["404_err"]}`).setDescription(`${ulang.invalid_gn}`)
            if (similar_guilds.length) embed.setDescription(`${ulang.invalid_gn}\n**${ulang.sm_guild}:**`).addFields(similar_guilds.map(ent => { return { name: ent[0], value: `\`\`\`yaml\nUUID: ${ent[1].uuid}\nPrefix: ${ent[1].prefix}\`\`\`` } }))
        }
        return { embeds: [embed] }

    })
}

async function buttons(interaction) {
    if (!ints[interaction.message.id]) {
        interaction.update({ components: [] })
        return
    }
    if (interaction.customId == 'guild_cmd_button1') {
        if (ints[interaction.message.id].current == 0) {
            ints[interaction.message.id].current = ints[interaction.message.id].pages.length - 1
        } else {
            ints[interaction.message.id].current--
        }
    } else if (interaction.customId == 'guild_cmd_button2') {
        if (ints[interaction.message.id].current == ints[interaction.message.id].pages.length - 1) {
            ints[interaction.message.id].current = 0
        } else {
            ints[interaction.message.id].current++
        }
    }
    interaction.update({ embeds: [(ints[interaction.message.id].pages[ints[interaction.message.id].current]).setFooter({ text: `Page ${ints[interaction.message.id].current + 1} / ${ints[interaction.message.id].pages.length}` })] })
}

module.exports = { guild, buttons }

function findperc(a, b) {
    const per = ((a / b) * 100).toFixed(2)
    if (per == 'NaN') return 0
    return per
}