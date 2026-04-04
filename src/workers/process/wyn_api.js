const { axios, data, tokens } = require('../../index.js')

let cache = {}
const CACHE_TIME_MILISECONDS = 60*1000

setInterval(() => {
  Object.entries(cache).forEach(([endpoint, data]) => {
    if ((data.time+CACHE_TIME_MILISECONDS) >= new Date()) {
      delete cache[endpoint]
      console.log(`deleted cache record for ${endpoint}`)
    }
  })
}, 1000*15);

/**
 * Call a wynncraft endpoint using WYnn bearer token, GET only
 * do not include wyn base url
 * @param {string} endpoint 
 * @param {string} diffToken a token if u dont want to use default
 * @param {boolean} skipCache make the request regardless of cache status
 * @returns 
 */
function WynGET(endpoint, diffToken, skipCache) {
    return new Promise((resolve, reject)=>{
      if (!skipCache && cache[endpoint] && !diffToken) resolve(cache[endpoint].response)
      axios.get(encodeURI(data.urls.wyn+endpoint), {headers: {Authorization: diffToken??`Bearer ${tokens.wyn_api}`}}).then(ent=>{
        cache[endpoint] = { time: new Date(), response: ent, }
        resolve(ent)
      }).catch(e=>{
        reject(e)
      })
  })
}

module.exports = { WynGET }