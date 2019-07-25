/*

    This file is only for functions relating to Pocket subscriptions.

*/

// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?

// local modules
const { updateUserPocket } = require('./users.js') 

// modules
const debug = require('debug') // for debugging in dev
const axios = require('axios') // for making calls to Pocket API
axios.defaults.headers.post['Content-Type'] = 'application/json; charset=UTF8'
axios.defaults.headers.post['X-Accept'] = 'application/json' // get the response as JSON

const authorisePocket = function (args) {
  return new Promise(function (resolve, reject) {
    axios.post('https://getpocket.com/v3/oauth/request', {
      consumer_key : settings[env].pocket_consumer_key,
      redirect_uri : `${settings[env].app_url}/user/pocket-redirect`
    })
    .then( response => {
      args.code = response.data.code
      resolve(args)
    })
    .catch( err => {
      reject(err)
    })
  })
}

const finalisePocketAuthentication = function (args) {
  return new Promise(function (resolve, reject) {
    axios.post('https://getpocket.com/v3/oauth/authorize', {
      consumer_key: args.key,
      code: args.code
    })
    .then( response => {
      args.token = response.data.access_token
      args.username = response.data.username
      return args
    })
    .then(updateUserPocket)
    .then( () => {
      resolve()
    })
    .catch(err => {
      reject(err)
    })
  })
}
module.exports = {
  authorisePocket : authorisePocket,
  finalisePocketAuthentication : finalisePocketAuthentication
}