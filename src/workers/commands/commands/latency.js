const { EmbedBuilder } = require('discord.js')
const { data, getLang } = require('../../../index.js')

module.exports = async (interaction) => {
    const ulang = getLang(interaction)
    const cmd_time = new Date().getTime()
    await interaction.deferReply()
    return {
        embeds: [
            new EmbedBuilder()
            .setTitle("Pong!")
            .setThumbnail(data.user.displayAvatarURL({ size: 1024 }))
            .setDescription(`${ulang.req_took} \`${new Date().getTime()-cmd_time}ms\`\n${ulang.uptime}: \`${timer(data.started)}\``)
            .setTimestamp()
        ]
    }
}

function timer(val) {
    const elapsedTime = new Date() - val;
    const [days, hours, minutes, seconds] = [Math.floor(elapsedTime/(1000*60*60*24)), Math.floor((elapsedTime/(1000*60*60))%24), Math.floor((elapsedTime/(1000*60))%60), Math.floor((elapsedTime/1000)%60)]
    return (`${days? `${days}d`: ""}${hours? ` ${hours}h`: ""}${minutes? ` ${minutes}m`: ""}${seconds? ` ${seconds}s`: ""}`).trim()
}
