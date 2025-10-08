const { WynGET } = require('../../process/wyn_api')
const { updateVariable, data, send } = require('../../..') //wtf i can do this?>??
const { EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js')
const fs = require('fs')


module.exports = { add, remove, menu }

const codes = {
    500: 'Wynncraft API Error, No guild found',
    404: 'Guild could not be found'
}

let intData = {}

async function add(int) {
    const guild = int.options.getString('guild')
    //
    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return { content: "Sorry! You must have `ManageServer` permission to use this command" }
    let prefix = false
    if (guild.length <= 4 && !guild.includes(" ")) prefix = true
    const st_time = new Date()
    await int.deferReply()
    //
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))
    if (server[int.guildId]?.length >= 5) return { content: "Sorry! You've reached the maximum amount of GuildTrackers for this server, use `/guild-remove` to remove unused ones" }
    return await WynGET(prefix ? `guild/prefix/${guild}` : `guild/${guild}`).then(async ent => {
        if (!server[int.guildId]) server[int.guildId] = []
        if (server[int.guildId].map(ent => ent.guild).includes(ent.data.prefix)) return { content: `A tracker for this guild already exists in https://discord.com/channels/${int.guildId}/${server[int.guildId].filter(wawa => wawa.guild == ent.data.prefix)[0].channel}, remove it using \`/guild-remove\`` }
        const msg = await send(int.channelId, `Guild Tracker for \`${ent.data.name}\` added to this channel by <@${int.user.id}>`)
        if (!msg.id) return { content: `An error occured when sending a message to this channel, Please make sure i have \`SendMessages\` permission` }
        server[int.guildId].push({
            time: (new Date() / 1000).toFixed(),
            guild: ent.data.prefix,
            guildName: ent.data.name,
            addedBY: int.user.id,
            channel: int.channelId
        })
        updateVariable(data.storage + "/process/guild_track.json", 'server', server)
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Successfully added guild tracker")
                    .setDescription(`Guild: \`${ent.data.name} [${ent.data.prefix}]\`\nAddedBy: <@${int.user.id}>\n\nAny guild changes will be logged to this channel`)
                    .setFooter({ text: `Request took ${new Date() - st_time}ms` })
            ]
        }
    }).catch(e => {
        console.log(e)
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle("An Error occured!")
                    .setDescription(`Error Message:\n\`\`\`${codes[e.status ?? e.code] ?? e.message ?? e.code ?? e.status}\`\`\`\nContact dev if you think this was a mistake`)
                    .setFooter({ text: `Request took ${new Date() - st_time}ms` })
            ]
        }
    })
}

async function remove(int) {
    const msg = await int.deferReply({
        withResponse: true
    })
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))
    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return "Sorry! You must have `ManageServer` permission to use this command"
    if (!server[int.guildId]) return `This server has no active guild trackers, Add one using \`/guild_add\``
    return removalString(Object.values(server[int.guildId]).map(ent => new StringSelectMenuOptionBuilder().setLabel(`${ent.guild} - ${ent.guildName}`).setValue(`${ent.guild}`)))

    function removalString(data) {
        intData[msg.resource.message.id] = true
        const stringmenu = new StringSelectMenuBuilder()
            .setCustomId('guild_tracker_remove_MENU')
            .setPlaceholder('Select a tracker to remove')
            .addOptions(data)
        setTimeout(() => {
            delete intData[msg.resource.message.id]
            int.editReply({ components: [] })
        }, 300000);
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle('Remove a tracker')
                    .setDescription('Please select the tracker you want to remove')
            ], components: [
                new ActionRowBuilder().addComponents(stringmenu)
            ]
        }
    }
}

async function menu(int) {
    await int.deferReply({ flags: 64 })
    if (!intData[int.message.id]) {
        await int.message.delete()
        await int.editReply({ content: "Interaction Expired, Please re-use the command" })
        return
    }
    const { server } = JSON.parse(fs.readFileSync(data.storage + "/process/guild_track.json"))

    const guild = int.values[0]

    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        await int.editReply("Sorry! You must have `ManageServer` permission to use this command")
        return
    }
    if (!server[int.guildId].filter(ent => ent.guild == guild)) {
        await int.message.edit({ components: [genStringMenu(Object.values(server[int.guildId]).map(ent => new StringSelectMenuOptionBuilder().setLabel(`${ent.guild} - ${ent.guildName}`).setValue(`${ent.guild}`)))] })
        await int.editReply('This tracker does not exist or was already removed')
        return
    }
    const restTrackers = server[int.guildId].filter(ent => ent.guild !== guild)
    server[int.guildId] = restTrackers
    if (!restTrackers.length) {
        delete server[int.guildId]
        delete intData[int.message.id]
    }
    await int.message.edit({ components: server[int.guildId] ? [genStringMenu(Object.values(server[int.guildId]).map(ent => new StringSelectMenuOptionBuilder().setLabel(`${ent.guild} - ${ent.guildName}`).setValue(`${ent.guild}`)))] : [] })
    await int.editReply(`Successfully removed the tracker for \`${guild}\``)
    updateVariable(data.storage + "/process/guild_track.json", 'server', server)

    function genStringMenu(data) {
        return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
            .setCustomId('guild_tracker_remove_MENU')
            .setPlaceholder('Select a tracker to remove')
            .addOptions(data))
    }
} 
