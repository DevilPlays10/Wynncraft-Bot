const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js')
const { data, axios } = require('../../../index.js')
const { WynGET } = require('../../process/wyn_api.js')

const ints = {}

async function buttons(interaction) {
    if (!ints[interaction.message.id]) {
        interaction.update({components: []})
        return
    }
    if (interaction.customId == 'player_cmd_button1') {
        if (ints[interaction.message.id].current == 0) {
            ints[interaction.message.id].current = ints[interaction.message.id].pages.length-1
        } else {
            ints[interaction.message.id].current--
        }
        interaction.update({embeds: [ints[interaction.message.id].pages[ints[interaction.message.id].current].setTimestamp().setFooter({text: `Page ${ints[interaction.message.id].current+1}/${ints[interaction.message.id].pages.length}`})]})
    } else if (interaction.customId == 'player_cmd_button2') {
        if (ints[interaction.message.id].current == ints[interaction.message.id].pages.length-1) {
            ints[interaction.message.id].current = 0
        } else {
            ints[interaction.message.id].current++
        }
        interaction.update({embeds: [ints[interaction.message.id].pages[ints[interaction.message.id].current].setTimestamp().setFooter({text: `Page ${ints[interaction.message.id].current+1}/${ints[interaction.message.id].pages.length}`})]})
    }
}


async function player(interaction) {
    const msg = await interaction.deferReply({
        withResponse: true
    })
    const st_time = new Date().getTime()
    const name = interaction.options.getString('name').trim()
    if (name.match(/[^a-zA-Z_0-9-]/g)) return {
        content: 'Invalid username, Please make sure username is valid'
    }
    return WynGET(`player/${name}?fullResult`).then(async res=>{
        const dat = res.data
        const restrictions = dat.restrictions
        const history = await axios.get(data.urls.ashcon+`user/${dat.username}`, {timeout: 1000}).catch(e=>e)
        const lastUsernames = history.status==200? history.data.username_history?? []: []
        const classBasedTotals = restrictions.characterDataAccess? null: (()=> {
            const rnd_cls_data = {playtime: 0,deaths: 0,discoveries: 0,logins: 0,level: 0,totalLevel: 0, wars: 0}
            if (!dat.characters) return rnd_cls_data
            for (clas of Object.values(dat.characters)) {
                for (rnd of Object.getOwnPropertyNames(rnd_cls_data)) {
                    if (clas[rnd]===undefined) {
                        rnd_cls_data[rnd] = '-RESTRICTED-'
                    } else rnd_cls_data[rnd]+=clas[rnd]
                }
            }
            return rnd_cls_data
        })()
        const page1 = {
            1: [
                restrictions.onlineStatus? `Status Restricted`: dat.online? `Online on ${dat.server}`: `Offline (Last seen on ${dat.server?? "N/A"} ${timer(new Date(dat.lastJoin))} ago)`,
                '',
                `Name: ${dat.username}`,
                `UUID: "${dat.uuid}"`,
                `Rank: ${dat.shortenedRank? `[${dat.shortenedRank?.toUpperCase()}] `: ``}${dat.supportRank?.toUpperCase()??'Rankless'}`,
                `Guild: ${dat.guild? `${dat.guild.name} [${dat.guild.prefix}] (${dat.guild.rank})`: `Guildless`}`,
                `Playtime: ${restrictions.mainAccess? '-RESTRICTED-': `${dat.playtime} (${(dat.playtime/24).toFixed(2)} Days)`}`,
                `First_Join: ${restrictions.mainAccess  ? '-RESTRICTED-': (() => {
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                    const date = new Date(dat.firstJoin)
                    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`
                })()}`,
                `Age: ${restrictions.mainAccess? '-RESTRICTED-': `${timer(new Date(dat.firstJoin))}`}`,
                
            ],
            2: [
                ...restrictions.mainAccess? ['Restricted MainAccess']: [
                    `Total Level: ${dat.globalData.totalLevel}`,
                    `PVP: ${dat.globalData.pvp.kills} / ${dat.globalData.pvp.deaths} (${ratio(dat.globalData.pvp.kills, dat.globalData.pvp.deaths)})`,
                    `Wars: ${dat.globalData.wars}`,
                    ``,
                    `Content: ${dat.globalData.contentCompletion}`,
                    `Quests: ${dat.globalData.completedQuests}`,
                    `Raids: ${dat.globalData.raids.total}`,
                    `Dungeons: ${dat.globalData.dungeons.total}`,
                    `WorldEvents: ${dat.globalData.worldEvents}`,
                    `Lootruns: ${dat.globalData.lootruns}`,
                    `Caves: ${dat.globalData.caves}`,
                    `MobsKilled: ${dat.globalData.mobsKilled}`,
                    `ChestsOpened: ${dat.globalData.chestsFound}`
                ]
            ],
            3: [
                ...restrictions.mainAccess? ['Restricted MainAccess']: dat.featuredStats? Object.entries(dat.featuredStats).map(ent=>`${ent[0]}: ${ent[1]}`): ['No featured stats']
            ],
            4: [
                ...lastUsernames.filter(ent=>ent.username!==dat.username).map(ent=>ent.username)
            ]
        }
        const page2 = {
            1: restrictions.characterDataAccess? ['Restricted CharacterDataAccess']: [
                `Playtime: ${classBasedTotals.playtime}`,
                `Logins: ${classBasedTotals.logins}`,
                `TotalLevel: ${classBasedTotals.totalLevel}`,
                `CombatLevel: ${classBasedTotals.level}`,
                `Discoveries: ${classBasedTotals.discoveries}`,
                `Wars: ${classBasedTotals.wars}`
            ],
            2: restrictions.characterDataAccess? [{name: 'Character Data:', value: `\`\`\`ml\nRestricted CharaterDataAccess\`\`\``}]: (()=> {
                let resultarr = []
                let counter = 0
                function isUndefinedRemoveElse(data, full) {
                    if (data==undefined) return ''
                    return full
                }
                if (!dat.characters) return [{name: 'Classes:', value: "```\nNo Class data :(```"}]
                for (const [uuid, clas] of Object.entries(dat.characters).slice(0, 20).sort((a, b)=>b[1].totalLevel-a[1].totalLevel)) {
                    counter++
                    resultarr.push({name: `${clas.type}${clas.nickname? ` (${clas.nickname})`: ""}`, value: `\`\`\`${dat.activeCharacter==uuid&&dat.online? `ex\n- - ACTIVE ${dat.server? `(${dat.server}) `: ''}- - \n\n`: 'ml\n'}Level: ${clas.totalLevel} (${findperc(clas.totalLevel, classBasedTotals.totalLevel)}%)\nC.Level: ${clas.level} (${findperc(clas.level, classBasedTotals.level)}%)${isUndefinedRemoveElse(clas.playtime, `\nPlaytime: ${clas.playtime} (${findperc(clas.playtime, classBasedTotals.playtime)}%)`)}${isUndefinedRemoveElse(clas.logins, `\nLogins: ${clas.logins} (${findperc(clas.logins, classBasedTotals.logins)}%)`)}\n\nGamemode: ${gamemodes(clas.gamemode)}${isUndefinedRemoveElse(clas.quests, `\nQuests: ${clas.quests?.length} (${findperc(clas.quests?.length??0, classBasedTotals)}%)`)}${isUndefinedRemoveElse(clas.discoveries, `\nDiscoveries: ${clas.discoveries} (${findperc(clas.discoveries, classBasedTotals.discoveries)}%)`)}${isUndefinedRemoveElse(clas.raids, `\nRaids: ${clas.raids?.total} (${findperc(clas.raids?.total, classBasedTotals.raids)}%)`)}${isUndefinedRemoveElse(clas.wars, `\nWars: ${clas.wars} (${findperc(clas.wars, classBasedTotals.wars)}%)`)}\`\`\``, inline: true})
                    if (counter % 2 === 0) resultarr.push({ name: '\u200B', value: '\u200B', inline: true });
                }
                return resultarr
            })()
        }
        const page3 = {
            1: restrictions.mainAccess? [`Restricted MainAccess`]: [
                `- - - TOTAL: ${dat.globalData.raids.total} - - -`,
                `NOTG: ${dat.globalData.raids.list['Nest of the Grootslangs']??0}`,
                `NOL: ${dat.globalData.raids.list["Orphion's Nexus of Light"]??0}`,
                `TCC: ${dat.globalData.raids.list["The Canyon Colossus"]??0}`,
                `TNA: ${dat.globalData.raids.list["The Nameless Anomaly"]??0}`
            ],
            2: restrictions.mainAccess? [`Restricted MainAccess`]: [
                `- - - TOTAL: ${dat.globalData.dungeons.total} - - -`,
                ...Object.entries(dat.globalData.dungeons.list).map(ent=>`${ent[0]}: ${ent[1]}`)
            ]
        }
        const page4 = {
            1: Object.keys(dat.ranking).length? Object.entries(dat.ranking).sort((a, b)=> a[1]-b[1]).map(ent=>`${ent[0]}: ${ent[1]}`): ['Restricted LeaderboardAccess']
        }
        const [butt1, butt2] = [
            new ButtonBuilder()
            .setCustomId("player_cmd_button1")
            .setLabel(`Previous Page`)
            .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
            .setCustomId("player_cmd_button2")
            .setLabel(`Next Page`)
            .setStyle(ButtonStyle.Primary)
        ]

        ints[msg.resource.message.id] = {
            current: 0,
            pages: [
                new EmbedBuilder()
                .setTitle(`${res.data.username.replace(/_/g, "\\_")}'${res.data.username.endsWith('s')? ``:`s`} Stats:`)
                .setThumbnail(`https://mc-heads.net/head/${res.data.uuid}`)
                .setColor(dat.online? 0x7DDA58: 0xE4080A)
                .setDescription(`\`\`\`ex\n${page1["1"].join('\n')}\`\`\``)
                .addFields(page1["4"].length? [
                    {name: "Stats:", value: `\`\`\`ml\n${page1["2"].join('\n')}\`\`\``},
                    {name: 'Featured:', value: `\`\`\`ex\n${page1["3"].join('\n')}\`\`\``},
                    {name: 'Username History:', value: `\`\`\`yaml\n${page1["4"].join('\n')}\`\`\``}
                ]: [
                    {name: "Stats:", value: `\`\`\`ml\n${page1["2"].join('\n')}\`\`\``},
                    {name: 'Featured:', value: `\`\`\`ex\n${page1["3"].join('\n')}\`\`\``},
                ])
                .setTimestamp()
                .setFooter({text: `Page 1 / 4`}),
                new EmbedBuilder()
                .setTitle(`${res.data.username.replace(/_/g, "\\_")}'s Classes:`)
                .setColor(res.data.online? 0x7DDA58: 0xE4080A)
                .setDescription(`**Class Based Total:**\`\`\`ex\n${page2["1"].join('\n')}\`\`\``)
                .addFields(page2["2"]),
                new EmbedBuilder()
                .setTitle((`${res.data.username.replace(/_/g, "\\_")}'s Stats:`))
                .setColor(res.data.online? 0x7DDA58: 0xE4080A)
                .setDescription(`**Raids:**\n\`\`\`ex\n${page3["1"].join('\n')}\`\`\`\n**Dungeons:**\n\`\`\`ml\n${page3["2"].join('\n')}\`\`\``),
                new EmbedBuilder()
                .setTitle(`${res.data.username.replace(/_/g, "\\_")}'s Rankings:`)
                .setDescription(`**Rankings:**\n\`\`\`ex\n${page4["1"].join('\n')}\`\`\``)
            ]
        }
        setTimeout(() => {
            const row = new ActionRowBuilder().addComponents(butt1.setDisabled(true), butt2.setDisabled(true))
            delete ints[interaction.webhook.id]
            interaction.editReply({components: [row]}).catch(e=>console.log(e))
        }, 600000);
        return { embeds: [ints[msg.resource.message.id].pages[0]], components: [
            new ActionRowBuilder().addComponents(butt1, butt2)
        ] }
    }).catch(e=>{
        console.log(e)
        if (e.status == 300) {
            console.log(e.response)
            const repl_usr = Object.entries(e.response?.data?.objects).map(ent=>`\`\`\`ex\nUsername: ${ent[1]?.username}\nUUID: "${ent[0]}"\n${ent[1]?.supportRank? `Rank: ${ent[1]?.supportRank.toUpperCase()}`: ""}\`\`\``)
            return { embeds: [new EmbedBuilder()
                .setTitle(`An error occured`)
                .setDescription(`Multiple Users exist\nPlease use UUID instead\n\n${repl_usr.slice(0, 10).join("\n")}`)
                .setTimestamp()
                .setFooter({text: `Request took ${new Date().getTime()-st_time}ms`})
            ]}
        } else if (e.status == 404) {
            return { embeds: [new EmbedBuilder()
                .setTitle(`404 Not found`)
                .setDescription(`User \`${name}\` was not found, Did you spell it correctly?`)
                .setTimestamp()
                .setFooter({text: `Request took ${new Date().getTime()-st_time}ms`})
            ]}
        } else {
            return { content: `An Error occured, Please contact dev if you think this was a mistake\n\`\`\`ex\n${e.stack.split("\n")[0]}\`\`\`` }
        }
    })
}

module.exports = { player, buttons }

function timer(val) {
    const elapsedTime = new Date() - val;
    const [days, hours, minutes, seconds] = [Math.floor(elapsedTime/(1000*60*60*24)), Math.floor((elapsedTime/(1000*60*60))%24), Math.floor((elapsedTime/(1000*60))%60), Math.floor((elapsedTime/1000)%60)]
    return (`${(`${days? `${days}d`: ""}${hours? ` ${hours}h`: ""}${minutes? ` ${minutes}m`: ""}`)?? ` ${seconds}s`}`).trim()
}

/**
 * % of a in b
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
function findperc(a, b) {
    const per = ((a/b)*100).toFixed(2)
    if (per == 'NaN') return 0
    return per
}

function gamemodes(gamemodes) {
    if (gamemodes.length == 0) return 'None'
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