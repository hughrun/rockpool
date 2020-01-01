// dev
const debug = require('debug'), name = 'Rockpool' // debug for development

// settings
const settings = require('../settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// local modules
const queries = require('./queries.js') // local database queries module
const blogs = require('./blogs.js') // local database blogs module

// Mongo
const { MongoClient, ObjectId} = require('mongodb')
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

// Twit
// Mastodon

function sendToot() {

}

function sendTweet() {

}

function checkAnnouncementsQueue() {
  // get one document from rp_announcements sorted by scheduled date (oldest to newest)
  // and remove it from the announcements list
  return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);
      const queue = function(db, callback) {
        const collection = db.collection('rp_announcements')
        collection.findOneAndDelete({}, {sort: {scheduled: 1}}) // sort by scheduled, acending
        .then( doc => {
          if (doc.type === 'tweet') {
            return // sendTweet(doc.message)
          } else if (doc.type === 'toot') {
            return //sendToot(doc.message)
          }
        })
        .catch(err => {
          return err
        })
      }
      queue(db, function() {
        client.close()
      })
  })
}

function queueArticleAnnouncement(blog, item) {
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

function queueBlogAnnouncement(args) {
  // TODO: args.users[0] has all the user details
  // what we actually need is the BLOG details
  return queries.getBlogs({
    query: {_id: ObjectId(args.blog)}
  })
  .then( res => {
    let announcements = []
    let now = new Date()
    let category = res.blogs[0].category ? `It's about ${res.blogs[0].category}!` : ''
    let url = res.blogs[0].url
    let twitter = args.users[0].twitter
    let mastodon = args.users[0].mastodon
    let message
    if (settings[env].use_twitter) {
      if (twitter) {
        message = `${url} by ${twitter} has been added to ${settings.app_name}! ${category}`
      } else {
        message = `${url} has been added to ${settings.app_name}! ${category}`
      }
      announcements.push({
        scheduled: now,
        type: 'tweet',
        message: message
      })
    }
    if (settings[env].use_mastodon) {
      if (mastodon) {
        message = `${url} by ${mastodon} has been added to ${settings.app_name}! ${category}`
      } else {
        message = `${url} has been added to ${settings.app_name}! ${category}`
      }
      announcements.push({
        scheduled: now,
        type: 'toot',
        message: message
      })
    }
    return announcements
  })
  .then(announcements => {
    return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const queue = function(db, callback) {
          const collection = db.collection('rp_announcements')
          collection.insertMany(announcements)
          .then( res => {
            callback()
          })
          .catch(err => {
            throw err
          })
        }
        queue(db, function() {
          client.close()
          return 'queued'
        })
    })
  })
}

module.exports = {
  queueArticleAnnouncement: queueArticleAnnouncement,
  queueBlogAnnouncement: queueBlogAnnouncement,
  checkAnnouncementsQueue: checkAnnouncementsQueue
}