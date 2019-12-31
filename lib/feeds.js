// require modules
const feedparser = require('feedparser-promised')

// dev
const debug = require('debug'), name = 'Rockpool' // debug for development

// settings
const settings = require('../settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const { MongoClient, ObjectId} = require('mongodb')
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

// local modules
const queries = require('./queries.js') // local database queries module
const blogs = require('./blogs.js') // local database blogs module

// *********
// FUNCTIONS
// *********

function excluded(tag) {
  return settings.excluded_tags.includes(tag)
}

function queueAnnouncement(blog, item) {
  return new Promise(function (resolve, reject) {
    let now = new Date()
    let announcements = []

    queries.getUsers({
      query: {
        blogs: blog._id
      }
    }) // first we check whether there is an owner for this blog
    .then( args => {
      if (settings[env].use_twitter) {
        // the author is the blog owner's twitter account, the legacy twHandle, or the article author, in order of preference
        let author = args.users.length > 0 ? args.users[0].twitter : blog.twHandle ? blog.twHandle : item.author
        let separator = item.tweeted ? items.tweeted % 2 == 0 ? ' / ' : ' - ' : ' - '
        let title = (item.title.length > 150) ? item.title.substring(0, 150) + "..." : item.title
        let message = `${title} ${separator} ${author} ${separator} ${item.link}`
        announcements.push({
          scheduled: now,
          type: 'tweet',
          message: message
        }) // push tweet
      }
      if (settings[env].use_mastodon) {
        let author = args.users.length > 0 ? args.users[0].mastodon : item.author
        let separator = item.tooted ? items.tooted % 2 == 0 ? ' / ' : ' - ' : ' - '
        let title = (item.title.length > 300) ? item.title.substring(0, 300) + "..." : item.title
        let message = `${title} ${separator} ${author} ${separator} ${item.link}`
        announcements.push({
          scheduled: now,
          type: 'toot',
          message: message
        })
      }
      // debug.log(announcements)
      return announcements
    })
    .then( announcements => {
      if (announcements.length > 0) {
        return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const queue = function(db, callback) {
              const collection = db.collection('rp_announcements')
              collection.insertMany(announcements)
              .then( res => {
                resolve(item)
              })
              .catch(err => {
                reject(err)
              })
            }
            queue(db, function() {
              client.close()
            })
        })
      } else {
        return
      }
    })
    .catch(err => {
      reject(err)
    })
  })
}

function addArticle(blog, item) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const addDocuments = function(db, callback) {
          const articles = db.collection('rp_articles')
          articles.insertOne({
            title: item.title,
            link: item.link,
            date: item.pubdate,
            author: item.author,
            guid: item.guid,
            tags: item.categories,
            blog_id: blog._id,
            blogLink: blog.url,
            blogTitle: item.meta.title
          })
          .then( () => {
            resolve(item)
          })
          .catch(err => {
            reject(err)
          })
        }
        addDocuments(db, function() {
          client.close()
        })
    })
  })
}

const checkFeeds = function() {
  return new Promise(function (resolve, reject) {
    queries.getBlogs({
      query: {
        approved: true, // blogs must be approved
        suspended: {$ne: true} // blogs must not be suspended
      }
    }) // get all feeds that are approved and aren't suspended
    .then( res => {
      for (let blog of res.blogs) {
        feedparser
        .parse({uri: blog.feed, timeout: 10000}) // include a timeout, otherwise it can hang forever
        .then( items => {
          blogs.setFailing({
            url: blog.url,
            failing: false
          }) // set failing to false in case it was previously set to true
          .then( () => {
            if (items) {
              items.forEach( function (item) {
                // check for exclude tags
                if (item.categories.some(excluded)) {
                  resolve(true) // if any exclude tag exists, skip adding the article
                } else if (blog.suspensionEndDate && blog.suspensionEndDate > item.pubdate) {
                  resolve(true) // if suspensionEndDate is more recent than the article, skip adding the article
                } else {
                // check whether is in the DB already - if it isn't, notInDB is false, else is true
                //  if EITHER the guid or post URL match, notInDB is false
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
                  if (item) {
                    addArticle(blog, item) // ingest into DB
                    .then( item => {
                      // check it is within the cutoff period for recency
                      let now = new Date()
                      let cutoff = new Date(now - 1.728e+8) // 48 hours ago
                      if (item.pubdate > cutoff) {
                        queueAnnouncement(blog, item) // queue announcement if more recent than 48 hours
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
        .catch(e => {
          blogs.setFailing({
            url: blog.url,
            failing: true
          })
          resolve(true)
        })
      }
    })
  })
}

module.exports = {
  checkFeeds: checkFeeds
}