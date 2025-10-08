const { data, getLang, axios } = require('../../../index.js')
const { EmbedBuilder, AttachmentBuilder } = require('discord.js')

module.exports = (async (interaction) => {
    const ulang = getLang(interaction)
    const ip = interaction.options.getString('ip')
    const port = interaction.options.getInteger('port')
    const type = interaction.options.getString('server')
    await interaction.deferReply()
    if (ip.includes(' ')) {
        return {
            content: ulang.ip_space,
            flags: 64,
          }
      }
    const start_time = new Date() //uysed to calculate time taken
    //api call
    return await axios.get(`${data.urls.mcpingurl+type}/${port? `${ip}:${port}`: ip}`).then(async (response) => {
        const dat = response.data
        let attachment = null
        const embed = new EmbedBuilder()
           .setColor(dat.online? 0x5D7C3C: 0x3B1717)
           .setTitle(`${type.toUpperCase()} - ${dat.host}${port? `:${port}`: ""}`)
           .setTimestamp()
           .addFields(
            { name: `${dat.online? "Online": "Offline"}`, value: `IP: \`${dat.ip_address}:${dat.port}\`${dat.srv_record? `\nSrv: \`${dat.srv_record.host}:${dat.srv_record.port}\``: ""}${dat.version? `\nVersion(${dat.version.protocol}): \`${dat.version.name? dat.version.name: dat.version.name_clean}\``: ``}${dat.players? `\nPlayers: \`${dat.players.online}/${dat.players.max}\``: ""}${dat.edition? `\nEdition: \`${dat.edition}\``: ""}${dat.gamemode? `\nGamemode: \`${dat.gamemode}\``: ""}` },
           )    
        if (dat.icon) {
            const buffer = Buffer.from(dat.icon.replace(/^data:image\/png;base64,/, ''), 'base64');
            attachment = new AttachmentBuilder(buffer, { name: 'image.png' });
            embed.setThumbnail('attachment://image.png')
        }
        if (dat.motd) embed.addFields({name: "Motd:", value: `\`\`\`${dat.motd.clean}\`\`\``})
        if (dat.players?.list? dat.players.list.length: null) {
            embed.addFields(
                { name: `Players(${dat.players.list.length}):`, value: `\`\`\`\n${dat.players.list.map(ent=>ent.name_clean).slice(0, 10)} ...\`\`\``}
            )
        }    
        embed.addFields(
            { name: "System:", value: `Blocked?: \`${dat.eula_blocked}\`${dat.software? `\nSoftware: \`${dat.software}\``: ""}${dat.server_id? `\nServer_ID: \`${dat.server_id}\``: ""}${dat.mods? `${dat.mods.length? `\n**Mods(${dat.mods.length}):**\n\`\`\`js\n${dat.mods.slice(0, 10).map(ent=>`(${ent.version})${ent.name}`).join("\n")}...\`\`\`` : ``}`: ''}${dat.plugins? `${dat.plugins.length? `\n**Plugins(${dat.plugins.length}):**\n\`\`\`js\n${dat.plugins.slice(0, 10).map(ent=>`(${ent.version})${ent.name}`).join("\n")}...\`\`\`` : ``}`: ''}`},
        )
        .setFooter({text: `${ulang.req_took} ${new Date().getTime()-start_time.getTime()}ms`})
        return {
            embeds: [embed],
            files: attachment? [attachment] : null
        }
    }).catch(e=>{
        if (e.code == "ERR_BAD_REQUEST") {
            return {
                content: ulang.ip_404
            }
        }
        return {
            content: `${ulang.err}\n\`\`\`js\n${e.stack.split("\n")[0]}\`\`\``
        }
    }) 
})