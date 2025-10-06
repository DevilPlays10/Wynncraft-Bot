const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const { data: config } = require('../../../index.js');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js')
const { WynGET } = require('../../process/wyn_api.js')


const CANVAS_WIDTH = 1009;
const CANVAS_HEIGHT = 1604;

const overlayAlpha = 0.4;            // your so transparent
const borderWidth = 0.6;             // boy he thick

const shrinkFactorX = 0.94;          // shrink
const shrinkFactorY = 0.98;          // vshrink
const offsetX = 20;                  // ofset
const offsetY = -10;                 // offsetr 
const noColorFOundcolor = '#777777'

async function drawMap(connectionData, data) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  const baseMap = await loadImage(`${config.storage}/process/wynnMap.png`);
  ctx.drawImage(baseMap, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const territories = Object.entries(data).map(([name, t]) => {
    const [x1, z1] = t.location.start;
    const [x2, z2] = t.location.end;

    const sx = Math.min(x1, x2);
    const ex = Math.max(x1, x2);
    const sz = Math.min(z1, z2);
    const ez = Math.max(z1, z2);

    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, ex);
    minZ = Math.min(minZ, sz);
    maxZ = Math.max(maxZ, ez);

    return {
      ...t,
      bounds: { sx, sz, ex, ez },
      name: name
    };
  });

  const normalizeX = x => ((x - minX) / (maxX - minX)) * CANVAS_WIDTH;
  const normalizeZ = z => ((z - minZ) / (maxZ - minZ)) * CANVAS_HEIGHT;
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const shrink = (val, center, factor) => center + (val - center) * factor;

  const centerMap = {};

  for (const t of territories) {
    const { sx, sz, ex, ez } = t.bounds;
    const x1 = shrink(normalizeX(sx), centerX, shrinkFactorX) + offsetX;
    const x2 = shrink(normalizeX(ex), centerX, shrinkFactorX) + offsetX;
    const y1 = shrink(normalizeZ(sz), centerY, shrinkFactorY) + offsetY;
    const y2 = shrink(normalizeZ(ez), centerY, shrinkFactorY) + offsetY;

    const midX = x1 + (x2 - x1) / 2;
    const midY = y1 + (y2 - y1) / 2;

    centerMap[t.name] = { x: midX, y: midY, meta: [x1, x2, y1, y2] };
  }

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;

  for (const [territoryName, info] of Object.entries(connectionData)) {
    const start = centerMap[territoryName];
    if (!start || !info["Trading Routes"]) continue;

    for (const destName of info["Trading Routes"]) {
      const end = centerMap[destName];
      if (!end) continue;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;

  const {data: colors} = JSON.parse(fs.readFileSync(config.storage + "/process/autocomplete/colors.json"))


  for (const t of territories) {
    const [ x1, x2, y1, y2] = centerMap[t.name].meta

    const width = x2 - x1;
    const height = y2 - y1;
    
    const color_ = colors.find(ent=>ent[0]===t.guild?.name?.trim())
    const color = color_? color_[1]: noColorFOundcolor 
    ctx.fillStyle = color;
    ctx.globalAlpha = overlayAlpha;
    ctx.fillRect(x1, y1, width, height);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = color
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x1, y1, width, height);

    const midX = x1 + width / 2;
    const midY = y1 + height / 2;
    const fontSize = Math.max(10, Math.min(10, Math.min(width, height) * 0.45));

    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = (new Date()-new Date(t.acquired))/1000>600? 'white': '#ff0000ff'
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.guild.prefix ?? '?', midX, midY);
  }

  return canvas.toBuffer('image/png')
}

module.exports = (async int => {
  const st_time = new Date()
  await int.deferReply()
  return WynGET(`guild/list/territories`).then(async ent=>{
    const buffer = await drawMap(
      JSON.parse(fs.readFileSync(`${config.storage}/process/enum_terr.json`, 'utf-8')),
      ent.data
    )
    const attachment = new AttachmentBuilder(buffer, { name: 'roasted.png' })

    return { embeds: [
        new EmbedBuilder()
        .setTitle('Wynncraft Territory Map')
        .setImage('attachment://roasted.png')
        .setFooter({text: `Request took ${new Date()-st_time}ms`})
      ], files: [attachment]
    }
  }).catch(e=>{
    console.log(e)
    return { embeds: [
      new EmbedBuilder()
      .setTitle('An Error occured :(')
      .setDescription(`\`\`\`js\n${e.stack.split('\n')[0]}\`\`\``)
      .setFooter({text: `Request took ${new Date()-st_time}ms`})
    ]}
  })
})