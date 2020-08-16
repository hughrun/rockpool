// require modules
const feedparser = require('feedparser-promised')
const axios = require('axios') // for making calls to Pocket API

// dev
const debug = require('debug'), name = 'Rockpool' // debug for development

// settings
const settings = require('../settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const { MongoClient } = require('mongodb')
const assert = require('assert');
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db

const conn = MongoClient.connect(url, { useNewUrlParser: true } )

// local modules
const queries = require('./queries.js') // local database queries module
const blogs = require('./blogs.js') // local database blogs module
const announcements = require('./announcements.js') // local database blogs module
const { unsubscribeFromPocket  } = require('./users.js') // local database updates module
const { sendEmail } = require('./utilities')
// *********
// FUNCTIONS
// *********

function excluded(tag) {
  let t = tag.toLocaleLowerCase(settings.locale)
  let excluded = settings.excluded_tags.map( x => x.toLocaleLowerCase(settings.locale))
  return excluded.includes(t)
}

function included(tag) {
  let t = tag.toLocaleLowerCase(settings.locale)
  let included = settings.included_tags.map( x => x.toLocaleLowerCase(settings.locale))
  return included.includes(t)
}

function addArticle(blog, item) {
  return new Promise(function (resolve, reject) {

    const tags = item.categories.map( tag => {
      return tag.toLowerCase()
    })

    return conn.then( client => client.db(dbName)
    .collection('rp_articles').insertOne(
      {
        title: item.title,
        link: item.link,
        date: item.pubdate,
        author: item.author,
        guid: item.guid,
        tags: tags,
        blog_id: blog._id,
        blogLink: blog.url,
        blogTitle: item.meta.title
      })
      .then( res => {
        resolve(res.ops[0])
      })
      .catch(err => {
        reject(err)
      })
    )
  })
}

function sendArticleToPocket(user, url) {
  return axios.post('https://getpocket.com/v3/add', {
    consumer_key: settings.pocket_consumer_key,
    access_token: user.pocket.token,
    url: url,
    tags: settings.app_name
  })
  .then( () => {
    resolve()
  })
  .catch(err => {
    // catch errors and report them
    // this is likely to be either something wrong with the pocket server
    // or maybe a token has been removed but not deleted in the app
    console.error(`error when processing pocket account for ${user.email}`)
    if (err.response) {
      // error response, most likely a 401
      console.log(err.response.status + ' - ' + err.response.headers['x-error'])
      if (err.response.status === 401) {
        // 401 is 'unauthorised' meaning the pocket access token
        // isn't recognised (we can assume it's been revoked)
        // so here we remove the user's pocket credentials
        // then email them to let them know
        return unsubscribeFromPocket(user.email)
        .then( () => {
          let message = {
            to: user.email,
            subject: `Your pocket account has been removed from ${settings.app_name}`,
            text: `Your pocket account has been removed from ${settings.app_name} because the access token is no longer recognised. If you did not mean to revoke access, you can log in again at ${settings.app_url} to reconnect ${settings.app_name} to your Pocket account.`
          }
          return sendEmail(message)
        })
      }
    } else if (err.request) {
      // The request was made but no response was received
      console.log('No response')
      console.log(err.request)
      return
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', err.message)
      return
    }
  })
}

const pushToPockets = function(data) {
  return new Promise(function (resolve, reject) {
    if (data) {
      // get users where pocket exists
      return queries.getUsers({
        query: {
          'pocket' : {$exists: true}
        }
      })
      .then( res => {
        console.log("About to send " + data.url + " to " + res.users.length + " users") // TESTING
        if (res.users.length > 0) {
          // for each user
          for (let user of res.users) {
            // check for pocket exclusions
            let pocketExcluded = user.pocket.excluded ? user.pocket.excluded.some( x => x.equals(data.id)) : false
            // send to pocket if not excluded for this user
            if (!pocketExcluded) {
              // TODO: this should be something better like:
              // return new Promise(setTimeout(resolve),2000)
              // .then( () => sendArticleToPocket(user, data.url))
              // .catch( err => err )
              // TESTING do not send to pocket
              return
              //setTimeout(sendArticleToPocket(user, data.url), 2000) // delay each API call by 2 seconds
            }
          }
        } else {
          resolve()
        }
      })
      .then( () => {
        resolve()
      })
      .catch(err => {
        reject(err)
      })
    } else {
      resolve()
    }
  })
}

const checkFeeds = function() {
  return new Promise(function (resolve, reject) {
    return queries.getBlogs({
      query: {
        approved: true, // blogs must be approved
        suspended: {$ne: true} // blogs must not be suspended
      }
    }) // get all feeds that are approved and aren't suspended
    .then( res => {
      console.log("Blogs returned from DB")
      let parsed = res.blogs.map( blog => {
        return feedparser.parse( { uri: blog.feed, timeout: 10000 } )
        .then( items => {
          if ( items && items.length > 0 ) {
            blogs.setFailing({
                url: blog.url,
                failing: false
              })
            return { blog: blog, items: items }
          }
        })
        .catch( err => {
          console.error(blog.url, " PARSE ERROR: ", err.code)
          blogs.setFailing({
            url: blog.url,
            failing: true
          })
          return
        })
      })

      return Promise.all(parsed).then( parsedBlogs => {
        return parsedBlogs.filter( x => x != null ).map( obj => {
            let processed = obj.items.filter( x => x != null ).map( item => {
              let downcased = item.categories.map( tag => tag.toLowerCase())
              let disallowed = downcased.some(excluded) || (obj.blog.suspensionEndDate && obj.blog.suspensionEndDate > item.pubdate) || ( settings.included_tags.length > 0 && !downcased.some(included) )

              if (item && !disallowed) {
                queries.checkArticleExists({
                  item: item,
                  query: {
                    $or: [ 
                      {link: item.link},
                      {guid: item.guid}
                    ]
                  }
                })
                .then( item => {
                  if (item) { // any existing items are returned as null
                    console.log("About to add ", item.title)
                    addArticle(obj.blog, item) // ingest into DB
                    .then( res => {
                      // check it is within the cutoff period for recency
                      let now = new Date()
                      let cutoff = new Date(now - 1.728e+8) // 48 hours ago
                      if (res.date > cutoff) {
                        // queue announcement if more recent than 48 hours
                        return announcements.queueArticleAnnouncement(obj.blog, res)
                        .then(pushToPockets)
                      } else {
                        return
                      }
                    }).catch(err => {
                      console.log('addArticle error', err)
                    })
                  } else {
                    return
                  }
                })
              }
            })
            return Promise.all(processed).then(resolve, reject)
        })
      })
    })
  })
}

module.exports = {
  checkFeeds: checkFeeds
}

if (env == 'test') {
  module.exports.pushToPockets = pushToPockets
}