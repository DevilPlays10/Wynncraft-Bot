const { axios, data } = require('../../../index.js')
const crypto = require('crypto');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');

// { name: 'Wynncraft', value: 1 },
// { name: 'BFS Special', value: 2},
// { name: 'Discord', value: 3 },
// { name: 'Furry/Cosplay', value: 4 },
// { name: 'Femboy/LGBT', value: 5 },
// { name: 'Self-Degradation', value: 6 },
// { name: 'Boykisser', value: 7 },
// { name: 'Animals', value: 8 },
// { name: 'Racist', value: 9 },
// { name: 'NSFW', value: 10 },
// { name: 'Misc', value: 11 }

const submit_allow_users = [ "787924220184625193", "340439996857188352" ]

module.exports = (async (int) => {
    await int.deferReply()
    const attachment = int.options.getString('attach')
    const type = int.options.getInteger('type')
    if (attachment) {
        if (!submit_allow_users.includes(int.user.id)) return `Sorry! Only selected users can submit speechbubbles :(`
        return await download(attachment, type)
        .then(ent=> {
            return { embeds: [
                new EmbedBuilder()
                .setTitle('Image Uploaded Successfully')
                .setDescription(`Gif Uploaded to DB\nBY: <@${int.user.id}>\nPath: \`${ent}\``)
                .setTimestamp()
                .setImage(attachment)
                .setColor(0x7DDA58)
            ]}
        })
        .catch(ent=>{
            console.log(ent)
            return { embeds: [
                new EmbedBuilder()
                .setTitle('An error occured')
                .setDescription(`Gif Could not be uploaded\nBY: <@${int.user.id}>\n**Error:** \n\`\`\`js\n${ent.message}\`\`\``)
                .setTimestamp()
                .setImage(attachment)
                .setColor(0xE4080A)
            ]}
        })
    }
    if ([10, 9].includes(type)&& !int.channel.nsfw) return `Sorry! this type can only be used in an NSFW Channel`
    const gifs = fs.readdirSync(`${data.storage}/bubbles/${type}`)
    if (!gifs.length) return `An Error occured! :( No gifs were found in this catagory`
    const randoPath = `${data.storage}/bubbles/${type}/` + gifs[Math.floor(Math.random() * gifs.length)]
    const attachmentbuilt = new AttachmentBuilder(randoPath, { name: 'roasted.gif' })
    return { embeds: [
        new EmbedBuilder()
        .setTitle('A random speechbubble!')
        .setDescription(`Path: \`${randoPath}\`\nTotal Entries: \`${gifs.length}\``)
        .setTimestamp()
        .setImage('attachment://roasted.gif')
    ], files: [
        attachmentbuilt
    ]}
})

async function download(link, type) {
  const folderPath = `${data.storage}/bubbles/${type}`;

  const response = await axios.get(link, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);
  const newHash = await hashBuffer(buffer);

  const existingFiles = fs.readdirSync(folderPath);

  for (const file of existingFiles) {
    const filePath = `${folderPath}/${file}`
    const existingBuffer = fs.readFileSync(filePath);
    const existingHash = await hashBuffer(existingBuffer);

    if (existingHash === newHash) throw new Error('Same hashData already exists');
  }
  const _name = `${folderPath}/${existingFiles.length}.gif`
  const finalName = existingFiles.includes(_name)? '_'+_name:_name

  fs.writeFileSync(finalName, buffer);

  return finalName;

    async function hashBuffer(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
}