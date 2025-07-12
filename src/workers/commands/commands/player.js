const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js')
const { data, getLang, axios} = require('../../index.js')

const ints = {}

async function buttons(interaction) {
    if (!ints[interaction.message.id]) {
        interaction.update({components: []})
        return
    }
    if (interaction.customId == 'player_cmd_button1') {
        if (ints[interaction.message.id].current == 0) {
            ints[interaction.message.id].current = 3
        } else {
            ints[interaction.message.id].current--
        }
        interaction.update({embeds: [ints[interaction.message.id].pages[ints[interaction.message.id].current]]})
    } else if (interaction.customId == 'player_cmd_button2') {
        if (ints[interaction.message.id].current == 3) {
            ints[interaction.message.id].current = 0
        } else {
            ints[interaction.message.id].current++
        }
        interaction.update({embeds: [ints[interaction.message.id].pages[ints[interaction.message.id].current]]})
    }
}

async function player(interaction) {
    const msg = await interaction.deferReply({
        withResponse: true
    })
    const ulang = getLang(interaction)
    const st_time = new Date().getTime()
    const name = interaction.options.getString('name').trim()
    if (name.match(/[^a-zA-Z_0-9-]/g)) return {
        content: ulang.invalid_ign
    }
    return axios.get(`${data.urls.wyn}player/${name}?fullResult`).then(res=>{
        const rnd_cls_data = {discoveries: 0, deaths: 0, logins: 0, level: 0, chestsFound: 0, quests: 0}
        for (clas of Object.values(res.data.characters)) {
            clas.quests = clas.quests.length
            for (rnd of Object.getOwnPropertyNames(rnd_cls_data)) {
                rnd_cls_data[rnd]+=clas[rnd]
            }
        }
        const fj = (() => {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
            const date = new Date(res.data.firstJoin)
            return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`
        })()
        //embed 1
        const embed = new EmbedBuilder()
        .setTitle(`${res.data.username.replace(/_/g, "\\_")}'s Stats:`)
        .setThumbnail(`https://mc-heads.net/head/${res.data.uuid}`)
        .setColor(res.data.online? 0x7DDA58: 0xE4080A)
        .setDescription(`\`\`\`ex\n${res.data.online? `Online on ${res.data.server}`: `Offline (Last seen on ${res.data.server?? "N/A"} ${timer(new Date(res.data.lastJoin))} ago)`}\n\nName: ${res.data.username}\nUUID: "${res.data.uuid}"\nRank: ${res.data.supportRank? res.data.supportRank.toUpperCase(): `Rankless`}\nGuild: ${res.data.guild? `${res.data.guild.name} [${res.data.guild.prefix}] (${res.data.guild.rank})`: `Guildless`}\nPlaytime: ${res.data.playtime} (${(res.data.playtime/24).toFixed(2)} Days)\nFirst_Join: ${fj}\nAge: ${timer(new Date(res.data.firstJoin))}\`\`\``)
        .addFields([
            {name: "Stats:", value: `\`\`\`ml\nLogins: ${rnd_cls_data.logins}\nTotal Level: ${res.data.globalData.totalLevel}\nTotal Combat: ${rnd_cls_data.level}\nPVE: ${res.data.globalData.killedMobs} / ${rnd_cls_data.deaths} (${ratio(res.data.globalData.killedMobs, rnd_cls_data.deaths)})\nPVP: ${res.data.globalData.pvp.kills} / ${res.data.globalData.pvp.deaths} (${ratio(res.data.globalData.pvp.kills, res.data.globalData.pvp.deaths)})\n\nWars: ${res.data.globalData.wars}\nRaids: ${res.data.globalData.raids.total} (${res.data.globalData.raids.list["Nest of the Grootslangs"]?? 0}:${res.data.globalData.raids.list["Orphion's Nexus of Light"]?? 0}:${res.data.globalData.raids.list["The Canyon Colossus"]?? 0}:${res.data.globalData.raids.list["The Nameless Anomaly"]?? 0})\nDungeons: ${res.data.globalData.dungeons.total}\nQuests: ${rnd_cls_data.quests}\nDiscoveries: ${rnd_cls_data.discoveries}\nChests Opened: ${rnd_cls_data.chestsFound}\`\`\``}
        ])
        .setTimestamp()
        .setFooter({text: `${ulang.page} 1 / 4 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        //embed 2
        const embed_classes = new EmbedBuilder()
        .setTitle((`${res.data.username.replace(/_/g, "\\_")}'s Classes:`))
        .setColor(res.data.online? 0x7DDA58: 0xE4080A)
        .setFooter({text: `${ulang.page} 2 / 4 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        .setTimestamp()
        let counter = 0
        for (clas of Object.values(res.data.characters)) {
            counter++
            embed_classes.addFields({name: `${clas.type} ${clas.nickname? `(${clas.nickname})`: ""}`, value: `\`\`\`ml\nCombat Level: ${clas.level}\nTotal Level: ${clas.totalLevel} (${findperc(clas.totalLevel, res.data.globalData.totalLevel)}%)\nPlaytime: ${clas.playtime} (${findperc(clas.playtime, res.data.playtime)}%)\nLogins: ${clas.logins} (${findperc(clas.logins, rnd_cls_data.logins)}%)\nGamemodes: ${gamemodes(clas.gamemode)}\nPVE: ${clas.mobsKilled} / ${clas.deaths} (${ratio(clas.mobsKilled, clas.deaths)})\nPVP: ${clas.pvp.kills} / ${clas.pvp.deaths} (${ratio(clas.pvp.kills, clas.pvp.deaths)})\n\nQuests: ${clas.quests} (${findperc(clas.quests, rnd_cls_data.quests)}%)\nDiscoveries: ${clas.discoveries} (${findperc(clas.discoveries, rnd_cls_data.discoveries)}%)\nRaids: ${clas.raids.total} (${findperc(clas.raids, res.data.globalData.raids.total)}%)\nWars: ${clas.wars} (${findperc(clas.wars, res.data.globalData.wars)}%)\`\`\``, inline: true})
            if (counter % 2 === 0) embed_classes.addFields({ name: '\u200B', value: '\u200B', inline: true });
        }
        //embed 3
        const embed_dungeons = new EmbedBuilder()
        .setTitle(`${res.data.username.replace(/_/g, "\\_")}'s Dungeons & Raids:`)
        .setColor(res.data.online? 0x7DDA58: 0xE4080A)
        .setFooter({text: `${ulang.page} 3 / 4 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        .addFields([
            {name: `Raids:`, value: `Total: \`${res.data.globalData.raids.total}\`\n\`\`\`ml\nNest of The Grootslangs: ${res.data.globalData.raids.list["Nest of the Grootslangs"]?? 0}\nOrphion's Nexus of Light: ${res.data.globalData.raids.list["Orphion's Nexus of Light"]?? 0}\nThe Canyon Colossus: ${res.data.globalData.raids.list["The Canyon Colossus"]?? 0}\nThe Nameless Anomaly: ${res.data.globalData.raids.list["The Nameless Anomaly"]?? 0}\`\`\``},
            {name: `Dungeons:`, value: `Total: \`${res.data.globalData.dungeons.total}\`\n\`\`\`ml\n${Object.entries(res.data.globalData.dungeons.list).sort((a, b) =>  b[1] - a[1]).map(ent=>`${ent[0]}: ${ent[1]}`).join('\n')}\`\`\``}
        ])
        //embed 4
        const embed_rankings = new EmbedBuilder()
        .setTitle(`${res.data.username.replace(/_/g, "\\_")}'s Rankings:`)
        .setColor(res.data.online? 0x7DDA58: 0xE4080A)
        .setFooter({text: `${ulang.page} 4 / 4 - ${ulang.req_took} ${new Date().getTime()-st_time}ms`})
        .setDescription(`Rankings:\n\`\`\`ex\n${Object.entries(res.data.ranking).sort((a, b) =>  a[1] - b[1]).map(ent=>`${ent[0]}: ${ent[1]}`).join("\n")}\`\`\``)
        //
        const button1 = new ButtonBuilder()
        .setCustomId("player_cmd_button1")
        .setLabel(`${ulang["page<"]}`)
        .setStyle(ButtonStyle.Primary)
        const button2 = new ButtonBuilder()
        .setCustomId("player_cmd_button2")
        .setLabel(`${ulang["page>"]}`)
        .setStyle(ButtonStyle.Primary)
        const row = new ActionRowBuilder().addComponents(button1, button2)
        ints[msg.resource.message.id] = {
            current: 0,
            pages: [embed, embed_classes, embed_dungeons, embed_rankings]
        }
        setTimeout(() => {
            const row = new ActionRowBuilder().addComponents(button1.setDisabled(true), button2.setDisabled(true))
            delete ints[interaction.webhook.id]
            interaction.editReply({components: [row]}).catch(e=>console.log(e))
        }, 600000);
        return { embeds: [embed], components: [row] }
    }).catch(e=>{
        if (e.status == 300) {
            const repl_usr = Object.getOwnPropertyNames(e.response.data).map(ent=>{
                const usr = e.response.data[ent]
                return `\`\`\`ex\nUsername: ${usr.storedName}\nUUID: "${ent}"\n${usr.supportRank? `Rank: ${usr.supportRank.toUpperCase()}`: ""}\`\`\``
            })
            return { embeds: [new EmbedBuilder()
                .setTitle(`${ulang.err}`)
                .setDescription(`${ulang.multiple_ign}\n${repl_usr.join("\n")}`)
                .setTimestamp()
                .setFooter({text: `${ulang.req_took} ${new Date().getTime()-st_time}ms`})
            ]}
        } else if (e.status == 404) {
            return { embeds: [new EmbedBuilder()
                .setTitle(`${ulang["404_err"]}`)
                .setDescription(`${ulang.user_404.replace(/\[(.*?)\]/, name)}`)
                .setTimestamp()
                .setFooter({text: `${ulang.req_took} ${new Date().getTime()-st_time}ms`})
            ]}
        } else {
            return { content: `${ulang.err}\n\`\`\`ex\n${e.stack.split("\n")[0]}\`\`\`` }
        }
    })
}

module.exports = { player, buttons }

function timer(val) {
    const elapsedTime = new Date() - val;
    const [days, hours, minutes, seconds] = [Math.floor(elapsedTime/(1000*60*60*24)), Math.floor((elapsedTime/(1000*60*60))%24), Math.floor((elapsedTime/(1000*60))%60), Math.floor((elapsedTime/1000)%60)]
    return (`${(`${days? `${days}d`: ""}${hours? ` ${hours}h`: ""}${minutes? ` ${minutes}m`: ""}`)?? ` ${seconds}s`}`).trim()
}

function findperc(a, b) {
    const per = ((a/b)*100).toFixed(2)
    if (per == 'NaN') return 0
    return per
}

function gamemodes(gamemodes) {
    if (gamemodes.length == 0) return 'No Gamemode'
    const gm = ["ultimate_ironman", "ironman", "craftsman", "hardcore", "hunted"]
    const gm_ = ['UI', 'I', 'C', 'HC', 'HU']
    return gamemodes.map(ent=>gm_[gm.indexOf(ent)]).join('-')
}

function ratio(a, b) {
    const r = (a/b).toFixed(2)
    if (r == "NaN") return 0
    if (r == "Infinity") return "∞"
    return r
}