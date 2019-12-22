// require modules
const feedparser = require('feedparser-promised')

// dev
const debug = require('debug'), name = 'Rockpool' // debug for development

// settings
const settings = require('../settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// mongo
const queries = require('./queries.js') // local database queries module

// feedparser
// Twit
// Mastodon

function excluded(tag) {
  return settings.excluded_tags.includes(tag)
}

function sendToot() {

}

function sendTweet() {

}

function checkAnnouncementsQueue() {

}

function queueAnnouncement(item) {
  // TESTING:
  console.log(item.title)
}

function addArticle(item) {
  // TESTING:
  console.log('adding article - ' + item.title)
}

const checkFeeds = function() {

  return new Promise(function (resolve, reject) {

    queries.getBlogs({
      query: {
        approved: true,
        suspended: {$ne: true}
      }
    }) // get all feeds that are approved and aren't suspended
    .then( res => {
      for (let blog of res.blogs) {

        feedparser
        .parse({uri: blog.feed, timeout: 10000}) // include a timeout, otherwise it can hang forever
        .then( items => {

          items.forEach( function(item) {
              /* TODO:
                check whether is in the DB already - if it isn't, notInDB is false, else is true
              */
             let notInDb = true;
            
            // check it is within the cutoff period for recency
            let now = new Date()
            let cutoff = new Date(now - 1.728e+8)
            
            let notExcluded = !item.categories.some(excluded) // no exclude tags
            
            // TODO: if (suspensionEndDate)

            //TESTING: 
            suspensionEndDate = cutoff

            let notSuspended = item.pubdate > suspensionEndDate // not published prior to suspension date, if there is one
  
            if (notInDb && notExcluded && notSuspended) {
              addArticle(item) // ingest into DB
              .then( item => {
                if (item.pubdate > cutoff) {
                  // queueAnnouncement(item) // do queue announcement if more recent than 48 hours
                  // .then( x => {
                    resolve(true)
                  //})
                }
              })
            } else {
              resolve(true)
            }
          })
        })
        .catch(e => {
          reject(e.message)
        })
      }
    })
    .catch(e => {
      // TODO: here we need to update the blog so it is set to 'failing'
      reject(e)
    })
  })
}

module.exports = {
  checkFeeds: checkFeeds
}