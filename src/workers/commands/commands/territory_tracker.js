const { updateVariable, getLang, data, send, client } = require('../../../index.js')
const { EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js')
const fs = require('fs')

const intData = {}

async function Add(int) {
    await int.deferReply()
    const st_time = new Date()
    const guild = int.options.getString('guild')
    const terr = int.options.getString('territory')
    const terrData = JSON.parse(fs.readFileSync(data.storage + "/process/terr_track.json"))
    const [{data: terrList}, {data:guildList}] = [JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/territories.json")), JSON.parse(fs.readFileSync(data.storage + "/process/autocomplete/guilds.json"))]
    const guildSelect = guild=='<global>'? '<global>': guildList.filter(ent=>ent[0].split(' - ')[0].trim()==guild.trim()).map(ent=>{return{name: ent[0].split(' - ')[0],tag: ent[0].split(' - ')[1], uuid: ent[1]}})[0]
    if (!guildSelect) return {content: 'Invalid guild, Please select a correct option'}
    const uuidOrGlobal = guildSelect.uuid??guildSelect
    if (!terrList.includes(terr)&&terr!=='<global>') return {content: 'Invalid territory name, Please select a correct option'}
    if (int.guildId) {
        if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return {content: "Sorry! You must have `ManageServer` permission to use this command"}
        if (terrData.server[int.guildId]?.length>10) return {content: "Sorry! This server has reached its maximum amount of trackers, Please delete unused ones first"}
        if (!terrData.server[int.guildId]) terrData.server[int.guildId] = []
        if (terrData.server[int.guildId].filter(ent=>ent.terr==terr&&ent.guild==uuidOrGlobal).length) return {content: `Sorry! A tracker for Guild: \`${guildSelect.name??guildSelect}\` Territory: \`${terr}\` already exists, Remove it using \`/territory_remove\` first`}
        const msg = await send(int.channelId, {content: `Territory tracker for Guild: \`${guildSelect.name??guildSelect}\`, Territory: \`${terr}\` added to this channel by <@${int.user.id}>`})
        if (!msg.id) return {content: `Missing permissions to send messages to this channel, Please make sure i have \`SendMessages\`, \`EmbedMessages\` permission`}
        terrData.server[int.guildId].push({
            terr, channel: int.channelId, guild: uuidOrGlobal, name: guildSelect.name??guildSelect
        })
        updateVariable(data.storage + "/process/terr_track.json", 'server', terrData.server)
        return {embeds: [
            new EmbedBuilder()
            .setTitle(`Territory Tracker added`)
            .setDescription(`Guild: \`${guildSelect.name? `${guildSelect.name} (${guildSelect.tag})`: `${guildSelect}`}\`\nTerritory: \`${terr}\`\n\nAny changes will be logged to this channel`)
            .setColor(0x7DDA58)
            .setFooter({text: `Request took: ${new Date()-st_time}ms`})
        ]}
    } else {
        if (terrData.user[int.user.id]?.length>10) return {content: "Sorry! You have reached the maximum amount of trackers, Please delete unused ones first"}
        if (!terrData.user[int.user.id]) terrData.user[int.user.id] = []
        if (terrData.user[int.user.id].filter(ent=>ent.terr==terr&&ent.guild==(guildSelect.uuid??guildSelect)).length) return {content: `Sorry! A tracker for Guild: \`${guildSelect.name??guildSelect}\` Territory: \`${terr}\` already exists, Remove it using \`/territory_remove\` first`}
        const user = await client.users.fetch(int.user.id)
        const msg = await user.send({content: `Territory tracker for Guild: \`${guildSelect.name??guildSelect}\`, Territory: \`${terr}\` added to this DM`})
        if (!msg.id) return {content: `Failed to setup tracker, this may be due to your discord settings or you have blocked me :(`}
        terrData.user[int.user.id].push({
            terr, guild: uuidOrGlobal, name: guildSelect.name??guildSelect
        })
        updateVariable(data.storage + "/process/terr_track.json", 'user', terrData.user)
        return {embeds: [
            new EmbedBuilder()
            .setTitle(`Territory Tracker added`)
            .setDescription(`Guild: \`${guildSelect.name? `${guildSelect.name} (${guildSelect.tag})`: `${guildSelect}`}\`\nTerritory: \`${terr}\`\n\nAny changes will be logged to this DM`)
            .setColor(0x7DDA58)
            .setFooter({text: `Request took: ${new Date()-st_time}ms`})
        ]}
    }
}

async function Remove(int) {
    const msg = await int.deferReply({
        withResponse: true
    })
    const track = JSON.parse(fs.readFileSync(data.storage+"/process/terr_track.json"))
    if (int.guildId) {
        if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return "Sorry! You must have `ManageServer` permission to use this command"
        if (!track.server[int.guildId]) return `This server has no active territory trackers, Add one using \`/territory_add\``
        return removalString(Object.values(track.server[int.guildId]).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${(ent.terr).slice(0, 25)} - ${ent.name}`).setValue(`${ent.guild};${ent.terr}`)))
    } else {
        if (!track.user[int.user.id]) return `You have no personal territory trackers active, Add one using \`/territory_add\``
        return removalString(Object.values(track.user[int.user.id]).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${(ent.terr).slice(0, 25)} - ${ent.name}`).setValue(`${ent.guild};${ent.terr}`)))
    }
    function removalString(data) {
        intData[msg.resource.message.id] = true
        const stringmenu = new StringSelectMenuBuilder()
            .setCustomId('war_tracker_remove_MENU')
			.setPlaceholder('Select a tracker to remove')
			.addOptions(data)
        setTimeout(() => {
            delete intData[msg.resource.message.id]
            int.editReply({components: []})
        }, 300000);
        return {embeds: [
            new EmbedBuilder()
            .setTitle('Remove a tracker')
            .setDescription('Please select the tracker you want to remove')
        ], components: [
            new ActionRowBuilder().addComponents(stringmenu)
        ]}
    }
}

async function menu(int) {  
    await int.deferReply({flags: 64})
    if (!intData[int.message.id]) {
        await int.message.delete()
        await int.editReply({content: "Interaction Expired, Please re-use the command"})
        return
    }
    const track = JSON.parse(fs.readFileSync(data.storage+"/process/terr_track.json"))
    const [ guuid, terr ] = int.values[0].split(';')
    if (int.guildId) {
        if (!int.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            await int.editReply("Sorry! You must have `ManageServer` permission to use this command")
            return
        }
        if (!track.server[int.guildId].filter(ent=>ent.guild==guuid&&ent.terr==terr)) {
            await int.message.edit({components: [genStringMenu(Object.values(track.server[int.guildId]).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${(ent.terr).slice(0, 25)} - ${ent.name}`).setValue(`${ent.guild};${ent.terr}`)))]})
            await int.editReply('This tracker does not exist or was already removed')
            return
        }
        const restTrackers = track.server[int.guildId].filter(ent=>!(ent.guild===guuid&&ent.terr===terr))
        track.server[int.guildId] = restTrackers
        if (!restTrackers.length) {
            delete track.server[int.guildId]
            delete intData[int.message.id]
        }
        await int.message.edit({components: track.server[int.guildId]? [genStringMenu(Object.values(track.server[int.guildId]).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${(ent.terr).slice(0, 25)} - ${ent.name}`).setValue(`${ent.guild};${ent.terr}`)))]: []})
        await int.editReply(`Successfully removed the tracker \`${guuid}\` - ${terr}`)
        updateVariable(data.storage+"/process/terr_track.json", 'server', track.server)
    } else {
        if (!track.user[int.user.id].filter(ent=>ent.guild==guuid&&ent.terr==terr)) {
            await int.message.edit({components: [genStringMenu(Object.values(track.user[int.user.id]).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${(ent.terr).slice(0, 25)} - ${ent.name}`).setValue(`${ent.guild};${ent.terr}`)))]})
            await int.editReply('This tracker does not exist or was already removed')
            return
        }
        const restTrackers = track.user[int.user.id].filter(ent=>!(ent.guild===guuid&&ent.terr===terr))
        track.user[int.user.id] = restTrackers
        if (!restTrackers.length) {
            delete track.user[int.user.id]
            delete intData[int.message.id]
        }
        await int.message.edit({components: track.user[int.user.id]? [genStringMenu(Object.values(track.user[int.user.id]).map(ent=>new StringSelectMenuOptionBuilder().setLabel(`${(ent.terr).slice(0, 25)} - ${ent.name}`).setValue(`${ent.guild};${ent.terr}`)))]: []})
        await int.editReply(`Successfully removed the tracker \`${guuid}\` - ${terr}`)
        updateVariable(data.storage+"/process/terr_track.json", 'user', track.user)
    }
    function genStringMenu(data) {
        return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
            .setCustomId('war_tracker_remove_MENU')
			.setPlaceholder('Select a tracker to remove')
			.addOptions(data))
    }
} 

module.exports = {Add, Remove, menu}