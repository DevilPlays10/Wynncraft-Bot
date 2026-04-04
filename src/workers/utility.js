const { data } = require('../index.js')
const fs = require('fs')

const LEVEL_UP_REWARDS = JSON.parse(fs.readFileSync(`${data.storage}/process/enums/GuildLevelRewards.json`))

/**
 * Returns the total amount of XP needed for a level for a guild
 * @param {Integer} level 
 * @returns 
 */
function CalcXPForGuildLevel(level) {
    if (level >= 130) return 10367116453807
    return Math.floor(20000 * ((Math.pow(1.15, level) - 1) / (1.15 - 1)));
}

/**
 * Returns which rewards the guild will unlock for specific level
 * @param {Integer} level level
 * @returns {String} reward
 */
function getRewardForGuildLevel(level) {
    const rewardsObject = Object.fromEntries(LEVEL_UP_REWARDS)
    return rewardsObject[level] ?? null
}

/**
 * returns which rewards will be unlocked fro a range of levels
 * @param {*} previousLevel 
 * @param {*} newLevel 
 * @returns {String[]}
 */
function getRewardsForGuildLevelRange(previousLevel, newLevel) {
    let rewards = []
    for (const [level, reward] of LEVEL_UP_REWARDS.filter(ent=>ent[0]>previousLevel&&ent[0]<=newLevel)) {
        rewards.push(reward)
    }
    return rewards
}

/**
 * Calculate the max amount of members a guild can have for the given level
 * @param {Integer} level 
 * @returns {Integer}
 */
function CalcMemberSlots(level) {
    let memberSlots = 4 // guild starts with 5 member slots  including owner
    for (const [lvl, reward] of LEVEL_UP_REWARDS.filter(ent => ent[1].endsWith("Member Slots"))) {

        if (level < lvl) break;
        memberSlots += Number(reward.match(/\d+/g))

    }
    return memberSlots
}

/**
 * Calculate XP gained per graid
 * @param {Integer} level 
 * @returns {Number}
 */
function CalcXPperGraid(level) {
    const xp = CalcXPForGuildLevel(level)
    return Math.floor(xp * 0.099944962)
}

/**
 * Turn a number into a prefixed number like 10000 into 10K
 * @param {Number} num 
 * @returns {String}
 */
function formatNumberShort(num) {
    if (num < 10000) return Number(num)
    if (num > 10000 && num < 1000000) return Number((num / 1000).toFixed(1)) + "K"
    if (num > 1000000 && num < 1000000000) return Number((num / 1000000).toFixed(1)) + "M"
    if (num > 1000000000 && num < 1000000000000) return Number((num / 1000000000).toFixed(1)) + "B"
    return Number((num / 1000000000000).toFixed(1)) + "T"
}

module.exports = { CalcXPForGuildLevel, getRewardForGuildLevel, CalcMemberSlots, CalcXPperGraid, formatNumberShort, getRewardsForGuildLevelRange }