const { updateVariable, getLang, data, axios, send } = require('../../../index.js')
const { EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js')
const fs = require('fs')

const intData = {}

async function Add(int) {
    const st_time = new Date()
    await int.deferReply()
    if (!int.guildId) return {content: "Sorry! You cannot use this command in a DM"}
    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return {content: "Sorry! You must have `ManageServer` permission to use this command"}
    const guild = int.options.getString('guild')
    const {terr: track} = JSON.parse(fs.readFileSync(data.storage+"/process/tracker_data.json"))
    if (!track[int.guildId]) track[int.guildId] = {
        lang: int.guildLocale,
        data: {}
    }
    if (Object.values(track[int.guildId].data).length==5) return {content: 'Sorry! You can only have a maximum of 5 territory trackers in this server'}
    if (guild.toLowerCase() == "<global>") {
        if (track[int.guildId].data["<global>"]) return {content: "This server already has a global territory tracker"}
        const msg = await send(int.channelId, {content: `Global Territory tracker added to this channel by <@${int.user.id}>`})
        if (!msg.id) return {content: "An Error occured when sending a message to this channel\nThis is likely due to missing permissions, Please make sure I have `SendMessages`, `SendEmbeds` permissions"}
        track[int.guildId].data["<global>"] = int.channelId
        updateVariable(data.storage+"/process/tracker_data.json", 'terr', track)
        return { embeds: [
            new EmbedBuilder()
            .setTitle(`Global Territory tracker added`)
            .setDescription(`Any territory changes will be logged to this channel`)
            .setColor(0x7DDA58)
            .setFooter({text: `Request took: ${new Date()-st_time}ms`})
        ]}
    } else {
        return await axios.get(data.urls.wyn+`guild/${encodeURI(guild)}`).then(async (res)=>{
            if (track[int.guildId].data[res.data.uuid]) throw new Error("This server already has a territory tracker for this guild\nPlease delete the previous one first")
            const msg = await send(int.channelId, {content: `Territory tracker for \`${res.data.name}\` added to this channel by <@${int.user.id}>`})
            if (!msg.id) return {content: "An Error occured when sending a message to this channel\nThis is likely due to missing permissions, Please make sure I have `SendMessages`, `SendEmbeds` permissions "}
            track[int.guildId].data[res.data.uuid] = int.channelId
            updateVariable(data.storage+"/process/tracker_data.json", 'terr', track)
            return {embeds: [
                new EmbedBuilder()
                .setTitle(`Tracker added for ${res.data.name}`)
                .setDescription(`\nName: \`${res.data.name}\`\nPrefix: \`${res.data.prefix}\`\nUUID: \`${res.data.uuid}\`\n\nAny territory changes will be logged to this channel`)
                .setColor(0x7DDA58)
                .setFooter({text: `Request took: ${new Date()-st_time}ms`})
            ]}
        }).catch(e=>{
            return {embeds: [
                new EmbedBuilder()
                .setTitle(`Error occured`)
                .setDescription(`An error occured :(\n\`\`\`\n${e.message}\`\`\``)
                .setColor(0xE4080A)
                .setFooter({text: `Request took: ${new Date()-st_time}ms`})
            ]}
        })
    }
}

async function Remove(int) {
    const msg = await int.deferReply({
        withResponse: true
    })
    if (!int.guildId) return {content: "Sorry! You cannot use this command in a DM"}
    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return {content: "Sorry! You must have `ManageServer` permission to use this command"}
    const {terr: track} = JSON.parse(fs.readFileSync(data.storage+"/process/tracker_data.json"))
    if (!track[int.guildId]) return {content: "This server has no active trackers"}
    intData[msg.resource.message.id] = true
    const stringmenu = new StringSelectMenuBuilder()
            .setCustomId('war_tracker_remove_MENU')
			.setPlaceholder('Select a tracker')
			.addOptions(Object.entries(track[int.guildId].data).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${ent[0]} - ${ent[1]}`).setValue(ent[0])))
            setTimeout(async () => {
                delete intData[msg.resource.message.id]
                await int.editReply({components: []})
            }, 300000);
    return {embeds: [
        new EmbedBuilder()
        .setTitle('Remove a tracker')
        .setDescription('Please select the tracker you want to remove')
        .setThumbnail()
    ], components: [
        new ActionRowBuilder().addComponents(stringmenu)
    ]}
}

async function menu(int) {  
    await int.deferReply({flags: 64})
    if (!intData[int.message.id]) {
        await int.message.delete()
        await int.deferReply({content: "Unknown Interaction"})
        return
    }
    if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        await int.editReply({content: "Sorry! You must have `ManageServer` permission to use this command"})
        return
    }
    const {terr: track} = JSON.parse(fs.readFileSync(data.storage+"/process/tracker_data.json"))
    if (!track[int.guildId]?.data[int.values[0]]) {
        await int.editReply({content: "This tracker doesnt exist or has already been deleted"})
        return
    }
    delete track[int.guildId].data[int.values[0]]
    if (!Object.values(track[int.guildId].data).length) delete track[int.guildId]
    updateVariable(data.storage+"/process/tracker_data.json", 'terr', track)
    await int.editReply({content: `Successfully deleted tracker for \`${int.values[0]}\``})
} 

module.exports = {Add, Remove, menu}