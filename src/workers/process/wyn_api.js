const { axios, data, tokens } = require('../../index.js')

/**
 * Call a wynncraft endpoint using WYnn bearer token, GET only
 * do not include wyn base url
 * @param {string} endpoint 
 * @param {string} diffToken a token if u dont want to use default
 * @returns 
 */
function WynGET(endpoint, diffToken) {
    return new Promise((resolve, reject)=>{
      axios.get(encodeURI(data.urls.wyn+endpoint), {headers: {Authorization: diffToken??`Bearer ${tokens.wyn_api}`}}).then(ent=>{
        resolve(ent)
      }).catch(e=>{
        reject(e)
      })
  })
}

module.exports = { WynGET }