// require modules
const feedparser = require('feedparser-promised')
const axios = require('axios') // for making calls to Pocket API

// dev
const debug = require('debug'), name = 'Rockpool' // debug for development

// settings
const settings = require('../settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const { MongoClient, equals} = require('mongodb')
const assert = require('assert');
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db

// local modules
const queries = require('./queries.js') // local database queries module
const blogs = require('./blogs.js') // local database blogs module
const announcements = require('./announcements.js') // local database blogs module
const { unsubscribeFromPocket  } = require('./users.js') // local database updates module
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
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const addDocuments = function(db, callback) {
          const articles = db.collection('rp_articles')
          const tags = item.categories.map( tag => {
            return tag.toLowerCase()
          })
          articles.insertOne({
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
            callback(res.ops[0])
          })
          .catch(err => {
            reject(err)
          })
        }
        addDocuments(db, function(res) {
          client.close().then( () => resolve(res) )
        })
    })
  })
}

const pushToPockets = function(data) {
  return new Promise(function (resolve, reject) {
    if (data) {
      // get users where pocket exists
      queries.getUsers({
        query: {
          'pocket' : {$exists: true}
        }
      })
      .then( res => {
        if (res.users.length > 0) {
          // for each user
          for (let user of res.users) {
            // check for pocket exclusions
            let pocketExcluded = user.pocket.excluded ? user.pocket.excluded.some( x => x.equals(data.id)) : false
            function sendArticleToPocket() {
              return axios.post('https://getpocket.com/v3/add', {
                consumer_key: settings.pocket_consumer_key,
                access_token: user.pocket.token,
                url: data.url,
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
                    // TODO: ideally we'd communicate this to the user - via email?
                    unsubscribeFromPocket(user.email)
                    .then( () => {
                      resolve()
                    })
                  }
                } else if (error.request) {
                  // The request was made but no response was received
                  console.log('No response')
                  console.log(error.request)
                  resolve()
                } else {
                  // Something happened in setting up the request that triggered an Error
                  console.log('Error', error.message)
                  resolve()
                }
              })
            }
            if (!pocketExcluded) {
              setTimeout(sendArticleToPocket, 2000) // delay each API call by 2 seconds
            }
          }
        } else {
          resolve()
        }
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
      for (let blog of res.blogs) {
        return feedparser
        .parse({uri: blog.feed, timeout: 10000}) // include a timeout to avoid hanging
        .then( items => {
          return blogs.setFailing({
            url: blog.url,
            failing: false
          }) // ensure failing set to false
          .then( () => {
            if (items) {
              return items.forEach( item => {
                let downcased = item.categories.map( tag => tag.toLowerCase())
                // check for exclude tags
                if (downcased.some(excluded)) {
                  resolve(true) // if any exclude tag is used, skip adding the article
                } else if (blog.suspensionEndDate && blog.suspensionEndDate > item.pubdate) {
                  resolve(true) // if suspensionEndDate is more recent than the article, skip adding the article
                } else if ( settings.included_tags.length > 0 && !downcased.some(included) ) {
                  resolve(true) // if included_tags is not empty but no include tags are used in the post, ignore it.
                } else {                  
                return queries.checkArticleExists({
                  item: item,
                  query: {
                    $or: [ 
                      {link: item.link},
                      {guid: item.guid}
                    ]
                  }
                })
                .then( item => {
                  if (item) {
                    return addArticle(blog, item) // ingest into DB
                    .then( res => {
                      // check it is within the cutoff period for recency
                      let now = new Date()
                      let cutoff = new Date(now - 1.728e+8) // 48 hours ago
                      if (res.date > cutoff) {
                        // queue announcement if more recent than 48 hours
                        return announcements.queueArticleAnnouncement(blog, res)
                        .then(pushToPockets)
                        .then( () => {
                          resolve(true)
                        })
                      }
                    })
                  } else {
                    resolve(true)
                  }
                })
                .catch(e => {
                  reject(e)
                })
                }
              })
            }
          })
        })
        .catch( e => {
          blogs.setFailing({
            url: blog.url,
            failing: true
          })
          resolve(true) // don't throw in production
        })
      }
    })
  })
}

module.exports = {
  checkFeeds: checkFeeds
}

if (env == 'test') {
  module.exports.pushToPockets = pushToPockets
}