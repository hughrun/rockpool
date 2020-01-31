/*

    This file is only for functions relating to Pocket subscriptions.

*/

// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?

// local modules
const { updateUserPocket } = require('./users.js') // user updates
const queries = require('./queries.js') // local database queries

// modules
const debug = require('debug') // for debugging in dev
const axios = require('axios') // for making calls to Pocket API
const email = require('emailjs') // to send email from the server

// axios settings
axios.defaults.headers.post['Content-Type'] = 'application/json; charset=UTF8'
axios.defaults.headers.post['X-Accept'] = 'application/json' // get the response as JSON

// the original API call to Pocket
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

// the final API call to Pocket
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
    .then(updateUserPocket) // add the token and username to the user's account
    .then( () => {
      resolve()
    })
    .catch(err => {
      reject(err)
    })
  })
}

const makeOpml = function() {
  return new Promise(function (resolve, reject) {
    const head = 
    `<?xml version="1.0" encoding="ISO-8859-1"?>
    <opml version="1.1">
    <head>
    <title>Feeds from ${settings.app_name}</title>
    <dateCreated>${new Date().toDateString()}</dateCreated>
    <dateModified></dateModified>
    <ownerName>${settings.org_name}</ownerName>
    </head>
    <body>
    <outline text="${settings.app_description}">`

    return queries.getBlogs({
        query: {
          $or: [{suspended: false}, {suspended: {$exists: false}}]
        }
    })
    .then( res => {
      let body = ''
      for (let cat of settings.blog_categories) {
        let blogs = res.blogs.filter(blog => blog.category === cat)
        let outlines = ''
        for (let blog of blogs){
          let x = `<outline htmlUrl="${blog.url}" type="rss" xmlUrl="${blog.feed}" text="${blog.url}"/>\n`
          outlines += x;
        }
        let categoryOutline = `<outline text="${cat}">${outlines}</outline>\n`
        body += categoryOutline
      }
      let tail = `</outline>\n</body>\n</opml>`;
      let opmlFile = `${head}\n${body}${tail}`;
      resolve(opmlFile)
    })
  })
}

const sendEmail = function (message) {
  return new Promise(function (resolve, reject) {
    const server  = email.server.connect({
      user: settings[env].email.user,
      password: settings[env].email.password,
      host: settings[env].email.host,
      ssl: true
    })
    // message is always from the app 
    message.from = `${settings.app_name} <${settings[env].email.from}>`
    // if it's for admins we need to find who they are
    if (message.to === 'admins') {
      queries.getUsers({query: {'permission' : 'admin'}})
        .then( args => {
          const emails = args.users.map( user => {
            return user.email
          })
          return emails.toString() // we can just use a string of comma-separated addresses
        })
        .then( admins => {
          message.to = admins
          server.send(message,
            function(err, doc) {
              resolve(err)
            })
        })
    } else { // if it's not an admin email, just use whatever is in the 'message.to' value
      server.send(message,
        function(err, doc) {
          resolve(err)
        })
    }
  })
}

module.exports = {
  authorisePocket : authorisePocket,
  finalisePocketAuthentication : finalisePocketAuthentication,
  makeOpml : makeOpml,
  sendEmail : sendEmail
}