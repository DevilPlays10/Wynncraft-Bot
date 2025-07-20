const { getLang, data, axios } = require('../../../index.js')
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js')
const { db } = require('../../process/db.js')

const ints = {}

async function guild(interaction) {
    const st_time = new Date().getTime()
    const msg = await interaction.deferReply({
        withResponse: true
    })
    const ulang = getLang(interaction)
    let guild = interaction.options.getString('name')
    const regx = guild.match(/[^A-Za-z ]/g)
    if (regx) return { embeds: [new EmbedBuilder().setTitle(`${ulang.err}`).setDescription(`${ulang.g_cause}\n[${regx.join(", ")}]`).setFooter({text: `${ulang.req_took} ${new Date().getTime()-st_time}ms`}).setTimestamp()]}
    let prefix = false
    if (guild.length<5 || !guild.includes(" ")) prefix = true
    //name reoslver
    const list = prefix? await axios.get(`${data.urls.wyn}guild/list/guild`).catch(e=>{return e}): {status: 0}
    const similar_guilds = list.status == 200? Object.entries(list.data).filter(ent=>ent[1].prefix.toLowerCase()==guild.toLowerCase()): []
    if (similar_guilds.length==1) guild = similar_guilds[0][1].prefix
    //end
    return await axios.get(encodeURI(prefix? `${data.urls.wyn}guild/prefix/${guild}`: `${data.urls.wyn}guild/${guild}`)).then(async (res)=>{
        const dat = res.data
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
                    joined: new Date(mem[1].joined)
                })
            }
        }
        const terrlist = await axios.get(`${data.urls.wyn}guild/list/territory`).catch(e=>e)
        const made_date = new Date(dat.created)
        //page 1
        const on_list = mlist.filter(ent=>ent.online).map(ent=>`[${ent.rank.toUpperCase()}] ${ent.name} (${ent.server})`)
        const embed1 = new EmbedBuilder() 
           .setTitle(`${dat.name}`)
           .setDescription(`\`\`\`ml\nName: ${dat.name} (${dat.prefix})\nOwner: ${Object.getOwnPropertyNames(dat.members.owner).join("")}\nOnline: ${dat.online} / ${dat.members.total} (${findperc(dat.online, dat.members.total)}%)\nLevel: ${dat.level} (${dat.xpPercent}%)\nCreated: ${jc}\nAge: ${timer(made_date)}\nWar Count: ${dat.wars??0}\nTerritories: ${dat.territories}\`\`\`\n**Online Members: (${dat.online})**\n\`\`\`ml\n${dat.online? `${on_list.slice(0, 50).join("\n")}${dat.online==on_list.length? ``: `\n(+${dat.online-on_list.length} in Streamer)`}`: `No members online :(`}\`\`\``)
           .setFooter({text: `${ulang.page} 1 / 5 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        //page 2
        const [owner] = mlist.filter(ent=>ent.rank=="owner")
        const embed2 = new EmbedBuilder()
           .setTitle(`${dat.prefix} Members:`)
           .setDescription(`**Total Members:** \`${dat.members.total}\`\n**Owner:**\n\`\`\`yaml\n${(owner.name).padEnd(16, ' ')} | ${owner.xp} XP ${(new Date()-owner.joined)<604800000? `[${timer(new Date(ent.joined).getTime()).split(" ")[0]}] `: ""}${owner.online? `- (${owner.server})`: ""}\`\`\``)
           .setFooter({text: `${ulang.page} 2 / 5 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        for (r of ["chief", "strategist", "captain", "recruiter", "recruit"]) {
            const list = mlist.filter(ent=>ent.rank==r).map(ent=>`${(ent.name).padEnd(16, ' ')} | ${ent.xp} XP ${(new Date().getTime()-new Date(ent.joined).getTime())<604800000? `[${timer( new Date(ent.joined).getTime() ).split(" ")[0]}] `: ""}${ent.online? `- (${ent.server})`: ""}`)
            if (!list.length) {
                embed2.addFields({
                    name: `${r.toUpperCase()}: (0)`,
                    value: `\`\`\`yaml\nNo ${r}s found\`\`\``
                });
            }
            for (let i = 0; i < list.length; i += 25) {
                embed2.addFields({
                    name: i == 0? `${r.toUpperCase()}: (${list.length})`: `\u200B`,
                    value: `\`\`\`yaml\n${list.slice(i, i + 25).join("\n")}\`\`\``
                });
            }
        }
        //page 3
        const embed3 = new EmbedBuilder()
           .setTitle(`${dat.prefix} Territories:`)
           .setFooter({text: `${ulang.page} 3 / 5 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        if (terrlist.status != 200) embed3.setDescription(`An Error occured\n\`\`\`js\n${terrlist.message.split("\n")[0]}\n\`\`\``)
        if (terrlist.status == 200) {
            const ters = Object.entries(terrlist.data).filter(ent=>ent[1].guild.uuid==dat.uuid).sort((a, b) => new Date(a[1].acquired).getTime()-new Date(b[1].acquired).getTime())
            if (ters.length) {
                const t2 = ters.map(ent=>`${ent[0]}: [${timer(new Date(ent[1].acquired).getTime(), false, true)}]`)
                for (let i = 0; i < t2.length; i += 20) {
                    embed3.addFields({
                        name: i == 0? `Territories: (${t2.length})`: `\u200B`,
                        value: `\`\`\`bf\n${t2.slice(0, 120).slice(i, i + 20).join("\n")}\`\`\``
                    });
                }
            } else {
                embed3.addFields({name: `Territories: (0)`, value: "\`\`\`js\nGuild owns 0 Territories\`\`\`"})
            }
        }
        //pahe 4 terr history
        const uuid = res.data.uuid.replace(/-/g, '');
        console.log(uuid)
        const terr_data = await db.all(`SELECT * FROM Territories WHERE GuildUUID = ? OR PreviousGuildUUID = ? ORDER BY Time DESC LIMIT 20`, [uuid, uuid])
        console.log(terr_data)
        const g_ter = terr_data.map(ent=>`${ent.GuildUUID==dat.uuid.replace(/-/g, '')? 
            `+ (${ent.GuildTotal-1} > ${ent.GuildTotal}) ${ent.Territory}\n+ From [${ent.PreviousGuildPrefix}] (${ent.PreviousGuildTotal+1} > ${ent.PreviousGuildTotal})\n+ Held ${timer(ent.Held_For*1000, true)} - ${timer(ent.Time*1000)} ago`: 
            `- (${ent.PreviousGuildTotal+1} > ${ent.PreviousGuildTotal}) ${ent.Territory}\n- To [${ent.GuildPrefix}] (${ent.GuildTotal-1} > ${ent.GuildTotal})\n- Held ${timer(ent.Held_For*1000, true)} - ${timer(ent.Time*1000)} ago`
        }`)
        const embed4 = new EmbedBuilder()
           .setTitle(`${dat.prefix} War logs:`)
           .setFooter({text: `${ulang.page} 4 / 5 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        if (!g_ter.length) embed4.setDescription('\`\`\`ml\nNo History\`\`\`')
        if (g_ter.length) {
            const fields = [{name: "War Logs:", value: `\`\`\`diff\n${g_ter.slice(0, 10).join("\n\n")}\`\`\``, inline: true}]
            if (g_ter.length>10) fields.push({name: "War Logs:", value: `\`\`\`diff\n${g_ter.slice(10, 20).join("\n\n")}\`\`\``, inline: true})
            embed4.addFields(fields)
        }
        //page 5
        const embed5 = new EmbedBuilder()
           .setTitle(`${dat.prefix} Rankings:`)
           .setDescription(`Season: Rating: Territories\`\`\`ml\n${Object.values(dat.seasonRanks).length? `${Object.entries(dat.seasonRanks).map(ent=>`${(`Season ${ent[0]}`).padEnd(10, ' ')}${(`|  ${ent[1].rating}`).padEnd(12, ' ')} | ${ent[1].finalTerritories} Terrs`).join("\n")}`: `No History`}\`\`\``)
           .setFooter({text: `${ulang.page} 5 / 5 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        //pages end
        const button1 = new ButtonBuilder()
        .setCustomId("guild_cmd_button1")
        .setLabel(`${ulang["page<"]}`)
        .setStyle(ButtonStyle.Primary)
        const button2 = new ButtonBuilder()
        .setCustomId("guild_cmd_button2")
        .setLabel(`${ulang["page>"]}`)
        .setStyle(ButtonStyle.Primary)
        const row = new ActionRowBuilder().addComponents(button1, button2)
        ints[msg.resource.message.id] = {
            current: 0,
            pages: [embed1, embed2, embed3, embed4, embed5]
        }
        setTimeout(() => {
            const row = new ActionRowBuilder().addComponents(button1.setDisabled(true), button2.setDisabled(true))
            delete ints[interaction.webhook.id]
            interaction.editReply({components: [row]}).catch(e=>console.log(e))
        }, 600000);
        return { embeds: [embed1], components: [row]}
    }).catch(async (e)=>{
        console.log(e)
        const embed = new EmbedBuilder()
        .setTitle(`${ulang.err}`)
        .setDescription(`\`\`\`js\n${e.stack.split('\n')[0]}\`\`\``)
        .setFooter({text: `${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        .setTimestamp()
        if (e.status == 404) {
            embed.setTitle(`${ulang["404_err"]}`).setDescription(`${ulang.invalid_gn}`)
            if (similar_guilds.length) embed.setDescription(`${ulang.invalid_gn}\n**${ulang.sm_guild}:**`).addFields(similar_guilds.map(ent=>{return{name: ent[0], value: `\`\`\`yaml\nUUID: ${ent[1].uuid}\nPrefix: ${ent[1].prefix}\`\`\``}}))
        }
        console.log(e)
        return {embeds: [embed]}
    })
}

async function buttons(interaction) {
    if (!ints[interaction.message.id]) {
        interaction.update({components: []})
        return
    }
    if (interaction.customId == 'guild_cmd_button1') {
        if (ints[interaction.message.id].current == 0) {
            ints[interaction.message.id].current = ints[interaction.message.id].pages.length-1
        } else {
            ints[interaction.message.id].current--
        }
        interaction.update({embeds: [ints[interaction.message.id].pages[ints[interaction.message.id].current]]})
    } else if (interaction.customId == 'guild_cmd_button2') {
        if (ints[interaction.message.id].current == ints[interaction.message.id].pages.length-1) {
            ints[interaction.message.id].current = 0
        } else {
            ints[interaction.message.id].current++
        }
        interaction.update({embeds: [ints[interaction.message.id].pages[ints[interaction.message.id].current]]})
    }
}

module.exports = { guild, buttons }

function timer(val, solo, secs) {
    const elapsedTime = solo? val: new Date() - val
    const [days, hours, minutes, seconds] = [Math.floor(elapsedTime/(1000*60*60*24)), Math.floor((elapsedTime/(1000*60*60))%24), Math.floor((elapsedTime/(1000*60))%60), Math.floor((elapsedTime/1000)%60)]
    const str = (`${days? `${days}d`: ""}${hours? ` ${hours}h`: ""}${minutes? ` ${minutes}m`: ""}${secs? `${seconds? ` ${seconds}s`: ""}`: ""}`).trim()
    return str
}

function findperc(a, b) {
    const per = ((a/b)*100).toFixed(2)
    if (per == 'NaN') return 0
    return per
}