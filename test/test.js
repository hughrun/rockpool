// require modules
const request = require('supertest') // test routes
const app = require('../app.js') // require Rockpool app
// NOTE: app will hang mocha because there doesn't seem to be any way to close the connection
// workaround for now is to run with the --exit flag but this is obviously not ideal
const assert = require('assert')

// settings
const settings = require('../settings.json')

// Mongo
const { MongoClient, ObjectId} = require('mongodb')
const url = `${settings.test.mongo_user}:${settings.test.mongo_password}@${settings.test.mongo_url}:${settings.test.mongo_port}`
const dbName = settings.test.mongo_db

// TESTS
describe('Test suite for Rockpool: a web app for communities of practice', function() {

  before('create demo legacy DB to test migration', function() {
    // insert a bunch of stuff into 'legacy'
  })

  before('run migrate script', function() {
    // run the script against 'legacy' DB
  })

  // MIGRATE.JS
  describe('npm migrate - to migrate legacy DB from existing CommunityTweets (ausglamblogs) DB', function() {
    describe('for the articles collection', function() {
      it('should rename to rp_articles')
      it('should migrate articles')
    })
    describe('for the blogs collection', function() {
      it('should rename to rp_blogs')
      it('should migrate blogs')
    })
    describe('for the tags collection', function() {
      it('should rename to rp_tags')
      it('should migrate tags')

    })
    describe('for the users collection', function() {
      it('should rename to rp_users')
      it('should migrate users')
      it('should create users from pocket accounts with email addresses')
      it('should not create users from pocket accounts without email addresses')
    })
  })

  // SETUP.JS
  describe('npm setup - to prepare DB before running Rockpool', function() {
    it('should build index on tags field in rp_articles', function(done) {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err);
        const db = client.db(dbName);
          const findCollection = function(db, callback) {
            db.indexInformation('rp_articles').then( info => {
              // info is an object where values are arrays of arrays
              let values = Object.values(info)
              let reduction = (a, v) => a.concat(v)
              let array = values.reduceRight(reduction).reduceRight(reduction)
              assert.ok(array.includes('tags'))
              done()
            })
          }
          findCollection(db, function() {
            client.close()
          })
      })
    })
    it('should build text index in rp_articles', function(done) {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err);
        const db = client.db(dbName);
          const findCollection = function(db, callback) {
            db.indexInformation('rp_articles').then( info => {
              // info is an object where values are arrays of arrays
              let values = Object.values(info)
              let reduction = (a, v) => a.concat(v)
              // reduce two levels of arrays
              let array = values.reduceRight(reduction).reduceRight(reduction)
              assert.ok(array.includes('text'))
              done()
            })
          }
          findCollection(db, function() {
            client.close()
          })
      })
    })
    it('should create rp_articles collection when they are indexed', function(done) {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err);
        const db = client.db(dbName);
          const findCollection = function(db, callback) {
            db.listCollections().toArray().then( array => {
              const names = array.map( x => {
                return x.name
              })
              let exists = names.includes('rp_articles')
              assert.ok(exists)
              done()
            })
          }
          findCollection(db, function() {
            client.close()
          })
      })
    })
  })

  // APP.JS
  describe('Rockpool - a web app for communities of practice', function() {
      before('delete test database before running all tests', function() {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const dropDb = function(db, callback) {
              db.dropDatabase()
            }
            dropDb(db, function() {
              client.close()
              done()
            })
        })
      })
      before('run setup script', function(done) {
        const { exec } = require('child_process')
        // NOTE: executes as if we are in the main directory - note the file path
        exec("NODE_ENV=test node ./scripts/setup.js", function(error, stdout, stderr) {
          if (error) {
            console.error(error)
          }
          if (stderr) {
            console.error(stderr)
          }
          done()
        })
      })

      describe('When the database is empty', function() {
        it('should load homepage', function(done) { 
          request(app)
            .get('/')
            .expect(200, done)
        })
        it('should load subscribe page', function(done) {
          request(app)
          .get('/subscribe')
          .expect(200, done)
        })
        it('should load login page', function(done) {
          request(app)
          .get('/letmein')
          .expect(200, done)
        })
        it('should load search results page', function(done) {
          request(app)
          .get('/search?q=test')
          .expect(200, done)
        })
      })
    describe('with test data', function() {
      before('insert users', function() {
        // insert test users including some pocket users
      })
      before('insert blogs', function() {
        // insert test blogs
      })
      before('insert articles', function() {
        // insert test articles
      })
      before('insert tags', function() {
        // insert test tags
      })
      describe('registerBlog()', function() {
        it('should add the blog to the DB with URL, feed, approved: false and announced:false')
        it('should add the blog to the user blogsForApproval array')
      })
      describe('approveBlog()', function() {
        it('should set approved to true')
        it('should move the blog id from blogsForApproval to blogs in the user record')
        it('should queue an announcement')
      })
      describe('checkfeeds()', function() {
        it('should run every X minutes in line with settings[env].minutes_between_checking_feeds')
        it('should eventually resolve')
        it('should not duplicate blogs with the same URL or GUID')
        it('should add new articles if there are new (i.e. not in the DB) articles')
        it('should skip articles with exclude tags')
        it('should queue announcements for new articles')
        it('should not queue announcements for new articles that are older than 48 hours')
      })
      describe('queueAnnouncement()', function() {
        it('should queue tweets if settings[env].useTwitter is true')
        it('should not queue tweets if settings[env].useTwitter is false')
        it('should queue toots if settings[env].useMastodon is true')
        it('should not queue toots if settings[env].useMastodon is false')   
      })
      describe('checkAnnouncementsQueue()', function() {
        it('should run every X minutes in line with settings[env].minutes_between_announcements')
        it('should send the next announcement if there are any in the queue')
      })
      describe('sendTweet()', function() {
        // NOTE: testing only need to check if a tweet would have been sent - we're not testing the Twitter API
        it('should restrict tweet length to 280 chars max')
        it('should include title, author and link')
        it('should use owner twitter @name if listed')
        it('should use blog twitter @name if listed, when owner not available and using legacy DB')
      })
      describe('sendToot()', function() {
        // NOTE: testing only need to check if a tweet would have been sent - we're not testing the Mastodon API
        it('should restrict toot length to 500 chars max')
        it('should include title, author and link')
        it('should use owner mastodon @name if listed')
      })
    })
    })
    
  
  after('All tests completed', function() {
    // drop test database
    // close all mongo connections if I ever work out how to tear it down in a way that actually works...
    // TODO: is there an open Mongo connection in the app somewhere?
    // TODO: check whether MongoStore can/needs to be closed.
  })
})