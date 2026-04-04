const { WynGET } = require('../../process/wyn_api')
const { updateVariable, data, send } = require('../../..') //wtf i can do this?>??
const { EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js')
const fs = require('fs')
const { queueToDB } = require('../../process/db.js')

module.exports = { add, remove, menu }

const codes = {
    500: 'Wynncraft API Error, No guild found',
    404: 'Guild could not be found'
}

const changes = {
    "All": "Any guild changes will be logged to this channel",
    "GRaids": "Any Guild Raid completions will be logged to this channel"
}

let intData = {}

async function add(int) {
    const guild = int.options.getString('guild')
    const type = int.options.getString('type')
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

        const searchedTracker = (server[int.guildId].filter(track => (track.guild == ent.data.prefix) && (type == track.type)))

        if (searchedTracker.length) return { content: `A tracker for this guild for the type "${type}" already exists in https://discord.com/channels/${int.guildId}/${searchedTracker[0].channel}, remove it using \`/guild-remove\`` }

        const msg = await send(int.channelId, `Guild Tracker (${type}) for \`${ent.data.name}\` added to this channel by <@${int.user.id}>`)
        if (!msg.id) return { content: `An error occured when sending a message to this channel, Please make sure i have \`SendMessages\` permission` }
        server[int.guildId].push({
            time: (new Date() / 1000).toFixed(),
            guild: ent.data.prefix,
            guildName: ent.data.name,
            addedBY: int.user.id,
            channel: int.channelId,
            type,
        })
        updateVariable(data.storage + "/process/guild_track.json", 'server', server)
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle("Successfully added guild tracker")
                    .setDescription(`Guild: \`${ent.data.name} [${ent.data.prefix}]\`\nAddedBy: <@${int.user.id}>\nType: \`${type}\`\n\n${changes[type]}`)
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

    intData[msg.resource.message.id] = true
    setTimeout(() => {
        delete intData[msg.resource.message.id]
        int.editReply({ components: [] })
    }, 60*1000); // delete after 60 seconds

    return {
        embeds: [
            new EmbedBuilder()
                .setTitle('Remove a tracker')
                .setDescription('Please select the tracker you want to remove')
        ], components: [
            generateStringMenu(server[int.guildId])
        ]
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

    const [guild, type] = int.values[0].split("-")
    console.log(guild, type)

    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        await int.editReply("Sorry! You must have `ManageServer` permission to use this command")
        return
    }
    if (!server[int.guildId].filter(ent => (ent.guild == guild) && (ent.type == type))) {
        await int.message.edit({ components: [generateStringMenu(server[int.guildId])] })
        await int.editReply('This tracker does not exist or was already removed')
        return
    }

    // check if the server has more active trackers or not
    const restTrackers = server[int.guildId].filter(ent => (ent.guild !== guild) | (ent.type !== type))

    server[int.guildId] = restTrackers
    if (!restTrackers.length) { // if it doesnt remove the server entry and delete int data so command can exit
        delete server[int.guildId]
        delete intData[int.message.id]
    }

    // check if any other server has a tracker for this guild
    // console.log(Object.entries(server).map(ent=>ent[1]))


    const guildTrackers = Object.entries(server).map(ent => ent[1]).flat(1).filter(ent => ent.guild == guild)
    // map removes the server ids so its easier to parse, flat combines all server entries into 1
    console.log(guildTrackers.length ? `Not deleting database entry as other servers (${guildTrackers.length}) are tracking the guild ${guild}` : `deleting the db entry as no other guilds track ${guild}`)

    if (guildTrackers.length === 0) {
        queueToDB(`DELETE FROM Guilds WHERE prefix = "${guild}"`)
    }

    await int.message.edit({ components: server[int.guildId] ? [generateStringMenu(server[int.guildId])] : [] })
    await int.editReply(`Successfully removed the tracker for \`${guild}\``)
    updateVariable(data.storage + "/process/guild_track.json", 'server', server)

}

function generateStringMenu(selectedServer) {
    return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
        .setCustomId('guild_tracker_remove_MENU')
        .setPlaceholder('Select a tracker to remove')
        .addOptions(
            Object.values(selectedServer).map(data =>
                new StringSelectMenuOptionBuilder().setLabel(`${data.guild} - ${data.guildName} (${data.type})`).setValue(`${data.guild}-${data.type}`)
            )
        )
    )
}