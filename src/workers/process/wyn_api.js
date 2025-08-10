const { axios, data, tokens } = require('../../index.js')

/**
 * Call a wynncraft endpoint using WYnn bearer token, GET only
 * do not include wyn base url
 * @param {string} endpoint 
 * @returns 
 */
function WynGET(endpoint) {
    return new Promise((resolve, reject)=>{
      axios.get(encodeURI(data.urls.wyn+endpoint), {headers: {Authorization: `Bearer ${tokens.wyn_api}`}}).then(ent=>{
        resolve(ent)
      }).catch(e=>{
        reject(e)
      })
  })
}

module.exports = { WynGET }