// require modules
var request = require('supertest') // test routes
const app = require('../app.js') // require Rockpool app
// NOTE: app will hang mocha because there doesn't seem to be any way to close the connection
// workaround for now is to run with the --exit flag but this is obviously not ideal
const agent = request.agent(app)
var request = request(app)
const assert = require('assert')
const clipboardy = require('clipboardy')

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
              callback()
            })
          }
          findCollection(db, function() {
            client.close().then( () => {
              done()
            })
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
              callback()
            })
          }
          findCollection(db, function() {
            client.close()
            .then( () => {
              done()
            })
            .catch( err => {
              done(err)
            })
          })
      })
    })
    it('should create rp_articles collection when they are indexed', function(done) {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err);
        const db = client.db(dbName);
          const findCollection = function(db, callback) {
            db.listCollections().toArray()
            .then( array => {
              const names = array.map( x => {
                return x.name
              })
              let exists = names.includes('rp_articles')
              assert.ok(exists)
              callback()
            })
          }
          findCollection(db, function() {
            client.close()
            .then( () => {
              done()
            })
            .catch( err => {
              done(err)
            })
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
              if (db) { // the db should not actually exist at this point, in which case it would throw an error
                db.dropDatabase() // if it does exist, wipe it out
              }
            }
            dropDb(db, function() {
              client.close()
              .then( () => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
        })
      })
      before('run setup script', function(done) {
        const { exec } = require('child_process')
        // NOTE: executes as if we are in the main directory - note the file path
        exec("NODE_ENV=test node ./scripts/setup.js", function(error, stdout, stderr) {
          if (error) {
            done(error)
          }
          if (stderr) {
            done(stderr)
          }
          done()
        })
      })

      describe('When the database is empty', function() {
        it('should load homepage', function(done) { 
          request
            .get('/')
            .expect(200, done)
        })
        it('should load subscribe page', function(done) {
          request
          .get('/subscribe')
          .expect(200, done)
        })
        it('should load login page', function(done) {
          request
          .get('/letmein')
          .expect(200, done)
        })
        it('should load search results page', function(done) {
          request
          .get('/search?q=test')
          .expect(200, done)
        })
      })
    describe('with test data', function() {
      // TODO: insert test data
      before('insert users', function(done) {
        // insert test users including some pocket users
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err)
          const db = client.db(dbName)
          const insertUsers = function(db, callback) {
            db.collection('rp_users').insertMany(
              [
                {
                  _id: ObjectId("9798925b467e1bf17618d095"),
                  email: 'alice@example.com',
                  twitter: 'alice@twitter.com',
                  blogs: [
                    ObjectId("761924060db4a4b2c3b7fcc5")
                  ],
                  blogsForApproval: [
                    ObjectId("e2280a977d8ccd54ce133c7f")
                  ],
                  permission: 'admin'
                },
                {
                  _id: ObjectId("5963dd524b6bdc605127986d"),
                  email: 'bob@example.com',
                  twitter: 'bob@twitter.com',
                  mastodon: '@bob@rockpool.town',
                  blogs: [],
                  blogsForApproval: [
                    ObjectId("2a182f1d81c32da8adb56777")
                  ]
                }
              ]
            )
            .then( doc => {
              done()
            })
            .catch( err => {
              done(err)
            })
          }
          insertUsers(db, function() {
            client.close()
          })
        })
      })
      before('insert blogs', function(done) {
        // insert test blogs
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err)
          const db = client.db(dbName)
          const insertUsers = function(db, callback) {
            db.collection('rp_blogs').insertMany(
              [
                {
                  _id: ObjectId("761924060db4a4b2c3b7fcc5"),
                  url: 'https://alice.blog',
                  feed: 'https://alice.blog/rss',
                  category: 'dogs',
                  approved: true,
                  announced: true
                },
                {
                  _id: ObjectId("e2280a977d8ccd54ce133c7f"),
                  url: 'https://rockpool-blogs/alice',
                  feed: 'https://rockpool-blogs/alice/feed',
                  category: 'budgies',
                  approved: false,
                  announced: false
                },
                {
                  _id: ObjectId("2a182f1d81c32da8adb56777"),
                  url: 'https://bobs-blog.com',
                  feed: 'https://bobs-blog.com/atom',
                  category: 'cats',
                  approved: false,
                  announced: false
                }
              ]
            )
            .then( doc => {
              done()
            })
            .catch( err => {
              done(err)
            })
          }
          insertUsers(db, function() {
            client.close()
          })
        })
      })
      before('insert articles', function() {
        // insert test articles
      })
      before('insert tags', function() {
        // insert test tags
      })
      before('log in', function(done) {
        agent
        .post('/sendtoken')
        .type('application/x-www-form-urlencoded')
        .send({"user" : "alice@example.com", "delivery" : "clipboard"})
        .then( (err,res) => {
          done()
        })
        .catch( err => {
          done(err)
        })
      })
      before('complete log in', function(done) {
        var loginLink = clipboardy.readSync()
        var link = loginLink.slice(19)
        agent
        .get(link)
        .then( () => {
          done()
        })
        .catch( err => {
          done(err)
        })
      })
      describe('user routes', function() {
        describe('/user', function() {
          it('should return 302 redirect when not logged in', function(done) {
            request
            .get('/user')
            .expect(302, done)
          })
          it('should render user page when logged in', function(done) {
            agent
            .get('/user')
            .expect(200, done)
          })
        })
      })
      describe('admin routes', function() {
        describe('/admin', function() {
          it('should return 302 redirect when not logged in', function(done) {
            request
            .get('/admin')
            .expect(302, done)
          })
          it('should render user page when logged in and admin', function(done) {
            agent
            .get('/admin')
            .expect(200, done)
          })
          it('should return 401 if user logged in but not admin') // TODO: need to log in with different user
        })
      })
      describe('API routes', function() {
        describe('/api/v1/user/info', function() {
          it('should return a 401 if user not logged in', function(done) {
            request
            .get('/api/v1/user/info')
            .expect(401, done)
          })
          it('should return a 200 if user is logged in', function(done) {
            agent
            .get('/api/v1/user/info')
            .expect(200, done)
          })
          it('should return an object', function(done) {
            agent
            .get('/api/v1/user/info')
            .then( data => {
              assert(typeof data.body === 'object')
              done()
            })
            .catch( err => {
              done(err)
            })
          })
          it('should contain email, twitter, and mastodon as keys for each array entry', function(done) {
            agent
            .get('/api/v1/user/info')
            .then( data => {
              keys = Object.keys(data.body)
              assert(keys.includes('email'))
              assert(keys.includes('twitter'))
              assert(keys.includes('mastodon'))
            })
            .then( x => {
              done()
            })
            .catch( err => {
              done(err)
            })
          })
        })
        describe('/api/v1/user/blogs', function() {
          it('should return a 401 if user not logged in', function(done) {
            request
            .get('/api/v1/user/blogs')
            .expect(401, done)
          })
          it('should return a 200 if user is logged in', function(done) {
            agent
            .get('/api/v1/user/blogs')
            .expect(200, done)
          })
          it('should return a 200 if user is logged in', function(done) {
            agent
            .get('/api/v1/user/blogs')
            .expect(200, done)
          })
          it('should return an object containing keys "user" and "blogs"', function(done) {
            agent
            .get('/api/v1/user/blogs')
            .then( data => {
                keys = Object.keys(data.body)
                assert(keys.includes('user'))
                assert(keys.includes('blogs'))
                done()
            })
            .catch( err => {
              done(err)
            })
          })
          describe('value of "user" in returned object', function() {
            it('should be a string', function(done) {
              agent
              .get('/api/v1/user/blogs')
              .then( data => {
                assert( typeof data.body.user === 'string')
                done()
              })
              .catch( err => {
                done(err)
              })
            })
          })
          describe('value of "blogs" in returned object', function() {
            it('should be an array', function(done) {
              agent
              .get('/api/v1/user/blogs')
              .then( data => {
                assert(Array.isArray(data.body.blogs))
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should contain at least url, feed, and category as keys for each array entry', function(done) {
              agent
              .get('/api/v1/user/blogs')
              .then( data => {
                data.body.blogs.forEach( x => {
                  keys = Object.keys(x)
                  assert(keys.includes('url'))
                  assert(keys.includes('feed'))
                  assert(keys.includes('category'))
                })
              })
              .then( x => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should return data from the test approved blog', function(done) {
              agent
              .get('/api/v1/user/blogs')
              .then( data => {
                assert(data.body.blogs[0].url === 'https://alice.blog')
              })
              .then( x => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
          })
        })
        describe('/api/v1/user/unapproved-blogs', function() {
          it('should return a 401 if user not logged in', function(done) {
            request
            .get('/api/v1/user/unapproved-blogs')
            .expect(401, done)
          })
          it('should return a 200 if user is logged in', function(done) {
            agent
            .get('/api/v1/user/unapproved-blogs')
            .expect(200, done)
          })
          it('should return an array', function(done) {
            agent
            .get('/api/v1/user/unapproved-blogs')
            .then( data => {
              assert(Array.isArray(data.body))
              done()
            })
            .catch( err => {
              done(err)
            })
          })
          it('should contain at least url, feed, and category as keys for each array entry', function(done) {
            agent
            .get('/api/v1/user/unapproved-blogs')
            .then( data => {
              data.body.forEach( x => {
                keys = Object.keys(x)
                assert(keys.includes('url'))
                assert(keys.includes('feed'))
                assert(keys.includes('category'))
              })
            })
            .then( x => {
              done()
            })
            .catch( err => {
              done(err)
            })
          })
          it('should return data from the test unapproved blog', function(done) {
            agent
            .get('/api/v1/user/unapproved-blogs')
            .then( data => {
              assert(data.body[0].url === 'https://rockpool-blogs/alice')
            })
            .then( x => {
              done()
            })
            .catch( err => {
              done(err)
            })
          })
        })
        describe('/api/v1/user/pocket-info', function() {
          it('should return a 401 if user not logged in', function(done) {
            request
            .get('/api/v1/user/pocket-info')
            .expect(401, done)
          })
          it('should return a 200 if user is logged in', function(done) {
            agent
            .get('/api/v1/user/pocket-info')
            .expect(200, done)
          })
          it('should return an object', function(done) {
            agent
            .get('/api/v1/user/pocket-info')
            .then( data => {
              assert(typeof data.body === 'object')
              done()
            })
            .catch( err => {
              done(err)
            })
          })
          it('should contain pocket_username as key', function(done) {
            agent
            .get('/api/v1/user/pocket-info')
            .then( data => {
              keys = Object.keys(data.body)
              assert(keys.includes('pocket_username'))
            })
            .then( x => {
              done()
            })
            .catch( err => {
              done(err)
            })
          })
        })
        describe('post routes', function() {
          describe('/api/v1/update/user/info', function() {
            it('should return 200 when logged in', function(done) {
              agent
              .post('/api/v1/update/user/info')
              .send({email: 'alice@example.com', twitter: 'alice@twitter.com', mastodon: '@new@masto.com'})
              .expect(200, done)
            })
            it('should return an object containing "user" and "error" keys', function(done) {
              agent
              .post('/api/v1/update/user/info') 
              .send({email: 'alice@example.com', twitter: 'alice@tweeter.com', mastodon: '@new@masto.com'})
              .then( data => {
                let keys = Object.keys(data.body)
                assert(keys.includes('user'))
                assert(keys.includes('error'))
              })
              .then( x => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should return user as an object and error as null', function(done) {
              agent
              .post('/api/v1/update/user/info')
              .send({email: 'alice@example.com', twitter: 'alice@tweeter.com', mastodon: '@new@masto.com'})
              .then( data => {
                assert(data.body.error === null)
                assert(typeof data.body.user === 'object')
              })
              .then( x => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should log out and redirect when email is updated', function(done) {
              agent
              .post('/api/v1/update/user/info')
              .send({email: 'alice@new.email', twitter: 'alice@tweeter.com', mastodon: '@new@masto.com'})
              .expect(302)
              .then ( res => {
                assert.equal( '/email-updated' , res.headers.location)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
          })
          describe('/api/v1/update/user/delete-blog', function() {
            before('log in again', function(done) {
              agent
              .post('/sendtoken')
              .type('application/x-www-form-urlencoded')
              .send({"user" : 'alice@new.email', "delivery" : "clipboard"})
              .then( (err,res) => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            before('complete log in', function(done) {
              var loginLink = clipboardy.readSync()
              var link = loginLink.slice(19)
              agent
              .get(link)
              .then( () => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            beforeEach('update user blogs', function(done) {
              // insert test users including some pocket users
              MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const insertUsers = function(db, callback) {
                  db.collection('rp_users').updateOne(
                    {
                      _id: ObjectId("9798925b467e1bf17618d095")
                    },
                    {
                      $set: {
                        blogs: [
                        ObjectId("124e07a27998d130d1d3ab0d")
                        ],
                      blogsForApproval: [
                        ObjectId("e2280a977d8ccd54ce133c7f")
                        ],
                      }
                    }
                  )
                  .then( doc => {
                    done()
                  })
                  .catch( err => {
                    done(err)
                  })
                }
                insertUsers(db, function() {
                  client.close()
                })
              })
            })
            beforeEach('insert blogs', function(done) {
              // insert test blogs
              MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const insertUsers = function(db, callback) {
                  db.collection('rp_blogs').insertOne(
                    {
                      _id: ObjectId("124e07a27998d130d1d3ab0d"),
                      url: 'https://new.alice.blog',
                      feed: 'https://new.alice.blog/rss',
                      category: 'rabbits',
                      approved: true,
                      announced: true
                    }
                  )
                  .then( doc => {
                    done()
                  })
                  .catch( err => {
                    done(err)
                  })
                }
                insertUsers(db, function() {
                  client.close()
                })
              })
            })
            it('should return 200 when logged in', function(done) {
              agent
              .post('/api/v1/update/user/delete-blog')
              .send({blog: '124e07a27998d130d1d3ab0d', action: 'delete'})
              .expect(200, done)
            })
            it('should return blogs, msg and error', function(done) {
              agent
              .post('/api/v1/update/user/delete-blog')
              .send({blog: '124e07a27998d130d1d3ab0d', action: 'delete'})
              .then( data => {
                let keys = Object.keys(data.body)
                assert(keys.includes('blogs'))
                assert(keys.includes('msg'))
                assert(keys.includes('error'))
                done()
              })
              .catch(err => {
                done(err)
              })
            })
            it('should not return an error', function(done) {
              agent
              .post('/api/v1/update/user/delete-blog')
              .send({blog: '124e07a27998d130d1d3ab0d', action: 'delete'})
              .then( data => {
                assert(data.body.error === null)
                assert(data.body.msg.type === 'success')
                done()
              })
              .catch(err => {
                done(err)
              })
            })
            it('should remove the blog from the user blogs array', function(done) {
              agent
              .post('/api/v1/update/user/delete-blog')
              .send({blog: '124e07a27998d130d1d3ab0d', action: 'delete'})
              .then( data => {
                assert(data.body.blogs.length === 0)
                done()
              })
              .catch(err => {
                done(err)
              })
            })
          })
        })
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
    after('All tests completed', function(done) {
      function wipeDb() {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const dropDb = function(db, callback) {
              db.dropDatabase()
            }
            dropDb(db, function() {
              client.close()
              return
            })
        })
      }

      agent.get('/logout') // logout to clear the cookie
      .then(wipeDb) // drop DB
      .then( () => {
        done()
      })
      

      // close all mongo connections if I ever work out how to tear it down in a way that actually works...
      // TODO: is there an open Mongo connection in the app somewhere?
      // TODO: check whether MongoStore can/needs to be closed.
    })
  })
})

// MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
//   assert.strictEqual(null, err)
//   const db = client.db(dbName)
//   const insertUsers = function(db, callback) {
//     db.collection('rp_users').insertMany(
//       // insert all these docs
//     )
//     .then( doc => {
//       // check for errors?
//       // done()
//     })
//     .catch( err => {
//       reject(err)
//     })
//   }
//   insertUsers(db, function() {
//     client.close()
//   })
// })