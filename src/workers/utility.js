const { data } = require('../index.js')
const fs = require('fs')

const LEVEL_UP_REWARDS = JSON.parse(fs.readFileSync(`${data.storage}/process/enums/GuildLevelRewards.json`))

const Date = {
    /**
     * Current date in epochTime, Use new Date().getTime() for miliseconds
     * @returns {Integer} Epoch Time
     */
    now: () => (new Date() / 1000).toFixed(),
    /**
     * Relative time from given timestamp till now
     * @param {*} time time in EPOCH MILISECONDS
     * @param {String} include String of allowed usables, ydhms (year, day, hour, minute, second)
     * @param dura true to use miliseconds instead of epoch time
     * @param {Number} onlyFans  set to value if u want the output to be only biggest num, like 2y instead of 2y 29d etc
     * @returns 
     */
    relative: (time, include, dura, onlyFans) => {
        const elapsedTime = dura ? time : new Date() - new Date(time);
        let totalSeconds = Math.floor(elapsedTime / 1000);

        const units = {
            y: 31556952,
            d: 86457.6,
            h: 3602.4,
            m: 60.04,
            s: 1
        };

        const array = [];

        for (const [unit, value] of Object.entries(units)) {
            if (include.includes(unit)) {
                const amount = Math.floor(totalSeconds / value);
                if (amount > 0) array.push(`${amount}${unit}`);
                totalSeconds -= amount * value;
            }
        }

        if (onlyFans) return array.slice(0, onlyFans).join(' ') ?? '0s'
        return array.length ? array.join(' ') : '0s';
    }
}

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
    for (const [level, reward] of LEVEL_UP_REWARDS.filter(ent => ent[0] > previousLevel && ent[0] <= newLevel)) {
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

module.exports = { CalcXPForGuildLevel, getRewardForGuildLevel, CalcMemberSlots, CalcXPperGraid, formatNumberShort, getRewardsForGuildLevelRange, Date }