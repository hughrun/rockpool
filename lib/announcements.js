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
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db

// Twit
var Twit = require('twit')
 
var T = new Twit({
  consumer_key:         settings.twitter.consumer_key,
  consumer_secret:      settings.twitter.consumer_secret,
  access_token:         settings.twitter.access_token,
  access_token_secret:  settings.twitter.access_token_secret,
  timeout_ms:           60*1000,
  strictSSL:            true
})

// Mastodon
const Masto = require('mastodon')
 
const M = new Masto({
  access_token: settings.mastodon.access_token,
  timeout_ms: 60*1000, 
  api_url: `https://${settings.mastodon.domain_name}/api/v1/`
})

// ************************************************************************

function updateTweetsCount(article) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      let now = new Date()
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const increment = function(db, callback) {
          const collection = db.collection('rp_articles')
          collection.updateOne(
            {_id: article}, 
            {
              $inc: {"tweeted.times" : 1},
              $set: {"tweeted.date" : now}
            }
          )
          .then(doc => {
            callback(doc.result)
            
          })
          .catch(err => {
            reject(err)
          })
        }

        increment(db, function(result) {
          client.close().then( () => resolve(result) )
        })
    })
  })
}

function updateTootsCount(article){
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      let now = new Date()
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const increment = function(db, callback) {
          const collection = db.collection('rp_articles')
          collection.updateOne(
            {_id: article}, 
            {
              $inc: {"tooted.times" : 1},
              $set: {"tooted.date" : now}
            }
          )
          .then(doc => {
            callback(doc.result)
          })
          .catch(err => {
            reject(err)
          })
        }

        increment(db, function(result) {
          client.close().then( () => resolve(result) )
        })
    })
  })
}

function sendToot(announcement) {
  return new Promise(function (resolve, reject) {
    let args = {}
    args.status = announcement.message
    if (announcement.spoiler_text) {
      args.spoiler_text = announcement.spoiler_text
    }

    M.post( 'statuses', args )
    .catch(err => {
      reject(err)
    })
    .then( () => {
      resolve()
    })
    .catch(err => {
      reject(err)
    })
  })
}

function sendTweet(announcement) {
  return new Promise(function (resolve, reject) {
    T.post('statuses/update', { status: announcement.message})
    .catch(err => {
      reject(err)
    })
    .then( () => {
        resolve()
    })
    .catch(err => {
      reject(err)
    })
  })
}

function announce() {
  // get one document from rp_announcements sorted by scheduled date (oldest to newest)
  // and remove it from the announcements list
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const queue = function(db, callback) {
          const collection = db.collection('rp_announcements')
          collection.findOneAndDelete({}, {sort: {scheduled: -1}}) // sort by scheduled, descending
          .then( doc => {
            if (doc.value) {
              if (doc.value.type === 'tweet') {
                sendTweet(doc.value)
                callback()
              } else if (doc.value.type === 'toot') {
                sendToot(doc.value)
                .catch(err => {
                  reject(err)
                })
                callback()
              }
            } else {
              callback()
            }
          })
          .catch(err => {
            console.error('announce() error:\n' + err)
            reject(err)
          })
        }
        queue(db, function() {
          client.close().then( () => resolve() )
        })
    })
  })
}

function checkQueue(id){
  return new Promise(function (resolve, reject) {
    // check the article isn't already in the queue
    return MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const check = function(db, callback) {
          const collection = db.collection('rp_announcements')
          collection.findOne({
            article_id: id
          })
          .then( res => {
            audit = res ? true : false
            callback(audit)
          })
          .catch(err => {
            reject(err)
          })
        }
        check(db, function(audit) {
          client.close().then( () => resolve(audit))
        })
    })
  })
}

function queueArticleAnnouncement(blog, item) {
  return new Promise(function (resolve, reject) {
    let announcements = []
    // if it is already in the queue, skip for this time.
    checkQueue(item._id)
      .then( response => {
        if (response) {
          resolve() // if the item is in the queue already, do nothing
        } else {
          queries.getUsers({
            query: {
              blogs: blog._id
            }
          }) // first we check whether there is an owner for this blog
          .then( args => {
            let now = new Date()
            // here we need to check that tooted/tweeted date was long ago enough (or is nonexistent)
            let tweetDue = item.tweeted ? new Date(item.tweeted.date.valueOf() + (settings.twitter.hours_between_tweets * 3.6e+6)) < now : false
            let needsTweeting = !item.tweeted || (item.tweeted && tweetDue && item.tweeted.times < settings.twitter.number_of_tweets_per_article)
            let tootDue = item.tooted ? new Date(item.tooted.date.valueOf() + (settings.mastodon.hours_between_toots * 3.6e+6)) < now : false
            let needsTooting = !item.tooted || (item.tooted && tootDue && item.tooted.times < settings.mastodon.number_of_toots_per_article)
            // normalise blog club tags
            let tags = []
            for (var tag of item.tags) {
              let transforms = Object.keys(settings.tag_transforms) // get the keys (tags to transform)
              if (transforms.includes(tag)) { // check if the tag needs to be normalised
                tag = settings.tag_transforms[tag] // use the transform value instead of the original tag
              }
              tags.push(tag)
            }
            let hashtag = settings.blog_club_tag ? tags.includes(settings.blog_club_tag) ? settings.blog_club_hashtag : '' : ''
            if (settings.twitter.use_twitter && needsTweeting) {
              // the author is the blog owner's twitter account, the legacy twHandle, or the article author, in order of preference
              let author = (args.users.length > 0 && args.users[0].twitter) ? args.users[0].twitter : blog.twHandle ? blog.twHandle : item.author
              let separator = item.tweeted ? item.tweeted.times % 2 == 0 ? ' / ' : ' - ' : ' - '
              let title = (item.title.length > 150) ? item.title.substring(0, 150) + "..." : item.title
              let message = `${title} ${separator} ${author} ${item.link} ${hashtag}`
              announcements.push({
                article_id: item._id,
                scheduled: now,
                type: 'tweet',
                message: message
              }) // push tweet
              updateTweetsCount(item._id)
            }
            if (settings.mastodon.use_mastodon && needsTooting) {
              let author = (args.users.length > 0 && args.users[0].mastodon) ? args.users[0].mastodon : item.author
              let separator = item.tooted ? item.tooted.times % 2 == 0 ? ' / ' : ' - ' : ' - '
              let title = (item.title.length > 300) ? item.title.substring(0, 300) + "..." : item.title
              let message = `${title} ${separator} ${author} ${separator} ${item.link} ${hashtag}`
              let announcementSettings = {
                article_id: item._id,
                scheduled: now,
                type: 'toot',
                message: message
              }
              // Here we check whether anything in the tags or title needs a content warning
              let spoilers = settings.content_warnings
              let tagSpoilers = item.tags.filter( tag => spoilers.some( x => RegExp(`\\b${x}\\b`).test(tag) ))
              let titleSpoilers = []
              for (let s of spoilers) {
                if (RegExp(`\\b${s}\\b`).test(item.title))
                titleSpoilers.push(s)
              }
              let combinedSpoilers = tagSpoilers.concat(titleSpoilers)
              let cleanedSpoilers = combinedSpoilers.map( x => {
                for (let s of spoilers) {
                  if (RegExp(`\\b${s}\\b`).test(x))
                    return s
                  }
              })
              if (cleanedSpoilers.length > 0) {
                announcementSettings.spoiler_text = Array.from(new Set(cleanedSpoilers)).join(', ')
              }
              announcements.push(announcementSettings)
              updateTootsCount(item._id)
            }
            return announcements
          })
          .then( announcements => {
            if (announcements.length > 0) {
              return MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
                assert.strictEqual(null, err);
                const db = client.db(dbName);
                  const queue = function(db, callback) {
                    const collection = db.collection('rp_announcements')
                    collection.insertMany(announcements)
                    .then( () => {
                      callback(item.link)
                    })
                    .catch(err => reject(err) )
                  }
                  queue(db, function(link) {
                    client.close().then( () => resolve(link) )
                  })
              })
            } else {
              resolve(item.link) // here we resolve the url to go to pushToPockets
            }
          })
          .catch(err => reject(err) )
        }
      })
  })
}

function queueBlogAnnouncement(args) {
  return new Promise(function (resolve, reject) {
    return queries.getBlogs({
      query: {
        _id: ObjectId(args.blog)
      }
    })
    .then( res => {
      let announcements = []
      let now = new Date()
      let category = res.blogs[0].category ? `It's about ${res.blogs[0].category}!` : ''
      let url = res.blogs[0].url
      let twitter = args.users[0].twitter
      let mastodon = args.users[0].mastodon
      let message
      if (settings.twitter.use_twitter) {
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
      if (settings.mastodon.use_mastodon) {
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
      return MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
        assert.strictEqual(null, err);
        const db = client.db(dbName);
          const queue = function(db, callback) {
            const collection = db.collection('rp_announcements')
            // if twitter and masto are both not being used the array will be empty
            if (announcements.length > 0) {
              collection.insertMany(announcements)
              .then( () => {
                callback()
              })
              .catch(err => {
                reject(err)
              })
            } else {
              callback()
            }
          }
          queue(db, function() {
            client.close()
            resolve('queued')
          })
      })
    })
  })
}

function checkArticleAnnouncements(){
  return new Promise(function (resolve, reject) {
    maxTweets = settings.twitter.number_of_tweets_per_article
    maxToots = settings.mastodon.number_of_toots_per_article
    return MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const findDocuments = function(db, callback) {
          let posts = db.collection('rp_articles')
          let now = new Date()
          let hours = settings.announce_articles_newer_than_hours * 3.6e+6
          let cutoff = new Date(now - hours)
          posts.find({
            $and: [
              { $or: [
                  {tweeted: {$exists: false}},
                  {tooted: {$exists: false}},
                  {"tweeted.times": {$lt: maxTweets}},
                  {"tooted.times": {$lt: maxToots}}
                ]
              },
              { date: {$gt: cutoff}}
            ]
          }) // find all articles published since the cutoff date (default 48hrs) that haven't reached maximum announcements yet
          .toArray()
          .then( docs => {
            for (let doc of docs) {
            // find blog
            queries.getBlogs({
              query: { 
                _id: ObjectId(doc.blog_id) 
              }
            })
              .then( args => {
                // NOTE: if a blog has been deleted, the *articles* will still exist
                // If it is added and then deleted it's possible there will be an
                // announceable article at this point, which will throw an error
                // To avoid this we check args.blogs actually contains something
                if (args.blogs.length > 0) {
                  queueArticleAnnouncement(args.blogs[0], doc)
                  .then( () => {
                    callback()
                  } )
                }
              })
            }
            })
          .catch(err => {
            reject(err)
          })
        }
        findDocuments(db, function() {
          client.close().then( () => resolve() )
        })
    })
  })
}

module.exports = {
  announce: announce,
  checkArticleAnnouncements : checkArticleAnnouncements,
  queueArticleAnnouncement: queueArticleAnnouncement,
  queueBlogAnnouncement: queueBlogAnnouncement
}

if (env == 'test') {
  module.exports.sendToot = sendToot
  module.exports.sendTweet = sendTweet
}