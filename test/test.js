// require modules
const debug = require('debug')
const fs = require('fs')
const opmlToJSON = require('opml-to-json')
const path = require('path')
const supertest = require('supertest') // test routes

// local files
const app = require('../app.js') // require Rockpool app
const queries = require('../lib/queries.js')
const feeds = require('../lib/feeds.js')
const announcements = require('../lib/announcements.js')
// NOTE: app will hang mocha because there doesn't seem to be any way to close the connection
// workaround for now is to run with the --exit flag but this is obviously not ideal

const request = supertest(app) // for testing requests by 'logged out' users
const agent = supertest.agent(app) // when logged in as admin
const nonAdminAgent = supertest.agent(app) // when logged in, but as non-admin
const nock = require('nock') // external website mocking
const pocketApiAdd = nock('https://getpocket.com')

// nodejs inbuilt modules
const assert = require('assert')
const { exec } = require('child_process');

// for logging in without sending emails
const clipboardy = require('clipboardy')

// settings
const settings = require('../settings.json')

// Mongo
const { MongoClient, ObjectId, equals} = require('mongodb')
const url = `${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}:${settings.mongo_port}`
const dbName = settings.mongo_db

// TESTS
describe('Test suite for Rockpool: a web app for communities of practice', function() {
  before('delete test database before running all tests', function(done) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const dropDb = function(db, callback) {
          if (db) { // the db should not actually exist at this point, in which case it would throw an error
            db.dropDatabase() // if it does exist, wipe it out
            .then( () => {
              return callback()
            })
          } else {
            return callback()
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
  before('create demo legacy DB to test migration', function(done) {
    // insert a bunch of stuff into 'legacy'
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const createDb = function(db, callback) {

        let addPockets = db.collection('pockets').insertMany(
          [
            {
              "_id" : "7amrPAWKEWqNp5Yno",
              "username" : "hello@pocketuser.com",
              "accessToken" : "dcba4321-dcba-4321-dcba-4321dc"
            },
            {
              "_id" : "8ed308b712730f8f8",
              "username" : "pocketuser",
              "accessToken" : "dcba1234-edcb-8765-dcba-1234dc"
            }
          ]
        )
        let addBlogs = db.collection('blogs').insertOne({
          "_id" : "8a865f21d83eb1c39",
          "url" : "https://example.wordpress.com",
          "feed" : "https://example.wordpress.com/feed",
          "author" : "Alice Aardvark",
          "twHandle" : "@alice",
          "type" : "dogs",
          "approved" : true,
          "announced" : true,
          "failing" : false
        })
        let addArticles = db.collection('articles').insertOne({
          "_id" : "22GRY8Mmi6ads6T8q",
          "link" : "https://example.wordpress.com/2018/11/07/dogs4life",
          "author" : "Alice Aardvark",
          "blog" : "The Dog Lover",
          "blogLink" : "https://example.wordpress.com",
          "categories" : [
            "dogs",
            "life choices"
          ],
          "date" : new Date("2018-11-06T17:00:16Z"),
          "title" : "Dogs4life and other slogans",
          "tweeted" : {
            "date" : new Date("2018-11-07T05:37:37.440Z"),
            "times" : 3
          }
        })
        let addTags = db.collection('tags').insertOne({
          "_id" : "4054dcc833d51b76e", 
          "tag" : "dogs", 
          "total" : 1 
        })

        return db.collection('users').insertOne({
          "_id" : "8amrQBWKEWqNo4Xop",
          "createdAt" : new Date("2018-12-12T00:35:20.025Z"),
          "services" : {
            "password" : {
              "bcrypt" : "bcrypt_hash"
            },
            "resume" : {
              "loginTokens" : []
            }
          },
          "emails" : [
            {
              "address" : "admin@legacysite.com",
              "verified" : true
            }
          ],
          "profile" : {
            "owner" : true
          }
        })
        .then(addPockets)
        .then(addBlogs)
        .then(addArticles)
        .then(addTags)
        .then( () => {
          return callback()
        })
      }
        createDb(db, function() {
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

  before('run migrate script', function(done) {
    // run the script against 'legacy' DB we just created
    const { exec } = require('child_process')
    // NOTE: executes as if we are in the main directory - note the file path
    exec("NODE_ENV=test node ./scripts/migrator.js", function(error, stdout, stderr) {
      if (error) {
        done(error)
      } else {
        done()
      }
    })
  })

  // MIGRATE.JS
  describe('npm migrate - to migrate legacy DB from existing CommunityTweets (ausglamblogs) DB', function() {
    describe('for the articles collection', function() {
      it('should rename to rp_articles', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
          const findCollection = function(db, callback) {
            return db.collections()
            .then( collections => {
              let mapped = collections.map( x => {
                return x.s.name
              })
              let renamed = mapped.includes('rp_articles')
              callback(renamed)
            })
          }
          return findCollection(db, function(renamed) {
            client.close()
            .then( () => {
              assert.strictEqual(renamed, true)
              done()
            })
            .catch(err => {
              done(err)
            })
          })
        })
      })
      it('should migrate articles', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findCollection = function(db, callback) {
              db.collection('rp_articles')
              .find()
              .toArray()
              .then( articles => {
                callback(articles)
              })
            }
            findCollection(db, function(articles) {
              client.close()
              .then( () => {
                assert.strictEqual(articles.length, 1)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
        })
      })
    })
    describe('for the blogs collection', function() {
      it('should rename to rp_blogs', function(done) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
          const findCollection = function(db, callback) {
            return db.collections()
            .then( collections => {
              let mapped = collections.map( x => {
                return x.s.name
              })
              let renamed = mapped.includes('rp_blogs')
              callback(renamed)
            })
          }
          return findCollection(db, function(renamed) {
            client.close()
            .then( () => {
              assert.strictEqual(renamed, true)
              done()
            })
            .catch(err => {
              done(err)
            })
          })
        })
      })
      it('should migrate blogs', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findCollection = function(db, callback) {
              db.collection('rp_blogs')
              .find()
              .toArray()
              .then( blogs => {
                callback(blogs)
              })
            }
            findCollection(db, function(blogs) {
              client.close()
              .then( () => {
                assert.strictEqual(blogs.length, 1)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
        })
      })
    })
    describe('for the tags collection', function() {
      it('should rename to rp_tags', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
          const findCollection = function(db, callback) {
            return db.collections()
            .then( collections => {
              let mapped = collections.map( x => {
                return x.s.name
              })
              let renamed = mapped.includes('rp_tags')
              callback(renamed)
            })
          }
          return findCollection(db, function(renamed) {
            client.close()
            .then( () => {
              assert.strictEqual(renamed, true)
              done()
            })
            .catch(err => {
              done(err)
            })
          })
        })
      })
      it('should migrate tags', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findCollection = function(db, callback) {
              db.collection('rp_tags')
              .find()
              .toArray()
              .then( tags => {
                callback(tags)
              })
            }
            findCollection(db, function(tags) {
              client.close()
              .then( () => {
                assert.strictEqual(tags.length, 1)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
        })
      })

    })
    describe('for the users collection', function() {
      it('should rename to rp_users', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
          const findCollection = function(db, callback) {
            return db.collections()
            .then( collections => {
              let mapped = collections.map( x => {
                return x.s.name
              })
              let renamed = mapped.includes('rp_users')
              callback(renamed)
            })
          }
          return findCollection(db, function(renamed) {
            client.close()
            .then( () => {
              assert.strictEqual(renamed, true)
              done()
            })
            .catch(err => {
              done(err)
            })
          })
        })
      })
      it('should migrate users', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findCollection = function(db, callback) {
              db.collection('rp_users')
              .find()
              .toArray()
              .then( users => {
                callback(users)
              })
            }
            findCollection(db, function(users) {
              client.close()
              .then( () => {
                assert.strictEqual(users.length, 2)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
        })
      })
      it('should create users from pocket accounts with email addresses', function(done) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
          const findCollection = function(db, callback) {
            db.collection('rp_users')
            .find()
            .toArray()
            .then( users => {
              let emails = users.map( x => x.email)
              callback(emails)
            })
          }
          findCollection(db, function(users) {
            client.close()
            .then( () => {
              assert.strictEqual(users.includes('hello@pocketuser.com'), true)
              done()
            })
            .catch( err => {
              done(err)
            })
          })
        })
      })
      it('should not create users from pocket accounts without email addresses', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
          const findCollection = function(db, callback) {
            db.collection('rp_users')
            .find()
            .toArray()
            .then( users => {
              callback(users)
            })
          }
          findCollection(db, function(users) {
            client.close()
            .then( () => {
              assert.strictEqual(users.length, 2)
              let emails = users.map(x => x.email)
              assert.strictEqual(emails.includes('pocketuser'), false)
              done()
            })
            .catch( err => {
              done(err)
            })
          })
        })
      })
    })
  })

  // APP.JS
  describe('Rockpool - a web app for communities of practice', function() {
    before('delete migrated test database before running all tests', function(done) {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err);
        const db = client.db(dbName);
          const dropDb = function(db, callback) {
            if (db) { // the db should have been created to test the migrate script
              db.dropDatabase() // if it does exist, wipe it out
              .then( () => {
                callback()
              })
            } else {
              callback()
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
    // SETUP.JS
    describe('npm setup - to prepare DB before running Rockpool', function() {
      before('delete help.html', function(done){
        let helpfile = path.resolve(__dirname, '../views/help.html')
        try {
          fs.unlinkSync(helpfile)
        } catch (err) {
          // do nothing, file does not exist
        }
        done()
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
          } else {
            done()
          }
        })
      })
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
              .catch(err => {
                done(err)
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
              .catch(err => {
                done(err)
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
      it('should convert markdown files to html', function(done){
        try {
          let helpfile = path.resolve(__dirname, '../views/help.html')
          fs.accessSync(helpfile) // does the file exist?
          done()
        } catch(err) {
          done(err)
        }
      })
    })
    describe('when the database is empty', function() {
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
      it('should load the browse page', function(done){
        request
        .get('/browse')
        .expect(200, done)
      })
      it('should load the help page', function(done){
        request
        .get('/help')
        .expect(200, done)
      })
      it('should load the opml file', function(done){
        request
        .get('/opml')
        .expect('Content-Type', 'text/x-opml; charset=UTF-8')
        .expect(200, done)
      })
    })
  describe('with test data', function() {
    // insert test data
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
                pocket: {
                  username: 'alice@example.com',
                  token: '12345678-dddd-9999-1111-0a0a0a0a'
                },
                permission: 'admin'
              },
              {
                _id: ObjectId("5963dd524b6bdc605127986d"),
                email: 'bob@example.com',
                twitter: 'bob@twitter.com',
                mastodon: '@bob@rockpool.town',
                blogs: [ObjectId("5e0bbef72de11e851b1e6f55")],
                blogsForApproval: [
                  ObjectId("2a182f1d81c32da8adb56777"),
                  ObjectId("5d592f2ed6e95e2d3bd1a69b"),
                  ObjectId('5d5932f5d6e95e2d3bd1a69c')
                ]
              },
              {
                _id: ObjectId("5d60ef41d6e95e2d3bd1a69f"),
                email: 'charlie@example.com',
                twitter: 'charlie@twitter.com',
                mastodon: '@charlie@rockpool.town',
                blogs: [],
                blogsForApproval: []
              },
              {
                _id: ObjectId("5d61c1d7d6e95e2d3bd1a6a1"),
                email: 'emile@example.com',
                twitter: 'emile@twitter.com',
                mastodon: '@emile@rockpool.town',
                blogs: [],
                blogsForApproval: [],
                permission: 'admin'
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

        let now = new Date()
        let lastWeek = new Date(now - 6.048e+8)
        const insertUsers = function(db, callback) {
          db.collection('rp_blogs').insertMany(
            [
              {
                _id: ObjectId("761924060db4a4b2c3b7fcc5"),
                url: 'https://alice.blog',
                feed: 'https://alice.blog/rss',
                category: 'libraries',
                approved: true,
                announced: true
              },
              {
                _id: ObjectId("5e0bbef72de11e851b1e6f55"),
                url: 'https://bobbie.blog',
                feed: 'https://bobbie.blog/rss',
                category: 'libraries',
                approved: true,
                announced: true
              },
              {
                _id: ObjectId("e2280a977d8ccd54ce133c7f"),
                url: 'https://rockpool-blogs/alice',
                feed: 'https://rockpool-blogs/alice/feed',
                category: 'galleries',
                approved: false,
                announced: false
              },
              {
                _id: ObjectId("2a182f1d81c32da8adb56777"),
                url: 'https://bobs-blog.com',
                feed: 'https://bobs-blog.com/atom',
                category: 'archives',
                approved: false,
                announced: false,
                suspensionEndDate: lastWeek // one week ago
              },
              {
                _id: ObjectId('5d592f2ed6e95e2d3bd1a69b'),
                url: 'https://roberto.blog',
                feed: 'https://roberto.blog/feed',
                category: 'archives',
                approved: false,
                announced: false
              },
              {
                _id: ObjectId('5d5932f5d6e95e2d3bd1a69c'),
                url: 'https://legacy.blog',
                feed: 'https://legacy.blog/feed',
                category: 'digital humanities',
                twHandle: '@rockpool',
                approved: true,
                announced: true
              },
              {
                _id: ObjectId("5d60be89d6e95e2d3bd1a69d"),
                url: 'https://another.legacy.blog',
                feed: 'https://another.legacy.blog/feed',
                category: 'GLAM',
                approved: true,
                announced: true
              },
              {
                _id: ObjectId("5d61b954d6e95e2d3bd1a6a0"),
                url: 'https://a.failing.blog',
                feed: 'https://a.failing.blog/feed',
                category: 'galleries',
                approved: true,
                announced: true,
                failing: true
              },
              {
                _id: ObjectId("5d6a003cd6e95e2d3bd1a6a2"),
                url: 'https://a.suspended.blog',
                feed: 'https://a.suspended.blog/feed',
                category: 'museums',
                approved: true,
                announced: true,
                failing: false,
                suspended: true
              },
              {
                _id: ObjectId("5d6a003cd6e95e2d3bd1a6a3"),
                url: 'https://another.suspended.blog',
                feed: 'https://another.suspended.blog/feed',
                category: 'libraries',
                approved: true,
                announced: true,
                failing: true,
                suspended: true
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
      let loginLink = clipboardy.readSync()
      let len = settings.app_url.length
      let link = loginLink.slice(len)
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
      describe('/user/pocket', function() {
        it('should redirect to login if not logged in', function(done) {
          request
          .get('/user/pocket')
          .expect(302)
          .then ( res => {
            assert.equal(res.headers.location, '/letmein')
            done()
          })
          .catch( err => {
            done(err)
          })
        })
        it('should redirect to pocket', function(done) {
          agent
          .get('/user/pocket')
          .expect(302)
          .then ( res => {
            assert.equal(res.headers.location.slice(0, 21), 'https://getpocket.com')
            done()
          })
          .catch( err => {
            done(err)
          })
        })

      })
      describe('/user/pocket-redirect', function() {
        // mock 'https://getpocket.com/v3/oauth/authorize' with nock
        before('nock API route', function(){
          nock('https://getpocket.com')
          .post('/v3/oauth/authorize')
          .reply(200, {
            "access_token":"5678defg-5678-defg-5678-defg56",
            "username":"alice@example.com"
          })
        })
        it('should add pocket value to user as object with username and token values', function(done){
          agent
          .get('/user/pocket-redirect')
          .then( () => {
            // check mongoDB for values
            MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
              assert.strictEqual(null, err);
              const db = client.db(dbName);
                const findDocuments = function(db, callback) {
                  const users = db.collection('rp_users')
                  users.findOne({email: 'alice@example.com'})
                  .then( doc => {
                    assert.equal(doc.pocket.token, '5678defg-5678-defg-5678-defg56')
                    done()
                    callback()
                  })
                  .catch(err => {
                    done(err)
                  })
                }
                findDocuments(db, function() {
                  client.close()
                })
            })
          })
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
      })
    })
    describe('API routes', function() {
      describe('GET', function() {
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
          it('should return email, twitter, mastodon, pocket, admin ', function(done) {
            agent
            .get('/api/v1/user/info')
            .then( data => {
              keys = Object.keys(data.body)
              assert(keys.includes('email'))
              assert(keys.includes('twitter'))
              assert(keys.includes('mastodon'))
              assert(keys.includes('pocket'))
              assert(keys.includes('admin'))
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
        describe('/api/v1/admin/*', function() {
          describe('/api/v1/admin/blogs-for-approval', function() {
            it('should return an array of users and their claims', function(done) {
              agent
              .get('/api/v1/admin/blogs-for-approval')
              .expect(200)
              .then( res => {
                assert(Array.isArray(res.body ))
                assert(res.body.length === 2)
                res.body.forEach( x => {
                  assert(typeof x.email === 'string')
                  assert(x.claims.length > 0)
                })
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/admin/failing-blogs', function() {
            it('should return an array of failing blogs', function(done) {
              agent
              .get('/api/v1/admin/failing-blogs')
              .expect(200)
              .then( res => {
                assert(Array.isArray(res.body))
                assert(res.body.length === 2)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/admin/admins', function() {
            it('should return an array of admins', function(done) {
              agent
              .get('/api/v1/admin/admins')
              .expect(200)
              .then( res => {
                assert(Array.isArray(res.body))
                assert(res.body.length === 1)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should include all admins except the current user in the array', function(done) {
              agent
              .get('/api/v1/admin/admins')
              .expect(200)
              .then( res => {
                let users = res.body.map( user => {
                  return user.email
                })
                assert.strictEqual(users.includes('emile@example.com'), true)
                assert.strictEqual(users.includes('alice@example.com'), false)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/admin/suspended-blogs', function() {
            it('should return array of suspended blogs', function(done) {
              agent
              .get('/api/v1/admin/suspended-blogs')
              .expect(200)
              .then( res => {
                assert(Array.isArray(res.body))
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should return suspended blogs', function(done) {
              agent
              .get('/api/v1/admin/suspended-blogs')
              .expect(200)
              .then( res => {
                let ids = res.body.map( x => {
                  return x.idString
                })
                assert(ids.includes('5d6a003cd6e95e2d3bd1a6a2'))
                assert(ids.includes('5d6a003cd6e95e2d3bd1a6a3'))
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should not return blogs that are not suspended', function(done) {
              agent
              .get('/api/v1/admin/suspended-blogs')
              .expect(200)
              .then( res => {
                let ids = res.body.map( x => {
                  return x.idString
                })
                assert.strictEqual(ids.includes('e2280a977d8ccd54ce133c7f'), false)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
          })
          describe('/api/v1/admin/reported-blogs (FUTURE FEATURE)', function() {
            it('should return blog info for reported blogs')
          })
        })
      })
      describe('POST', function() {
        describe('/api/v1/update/user/*', function() {
          it('should return 401 when user not logged in', function(done) {
            request
            .post('/api/v1/update/user/info')
            .send({email: 'alice@example.com', twitter: 'alice@twitter.com', mastodon: '@new@masto.com'})
            .expect(401, done)
          })
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
          describe('/api/v1/update/user/register-blog', function() {
            // This will run fake blogs through feedfinder and therefore fail
            // so we set up mocks with nock 
            // also need to log in again
            before('log in again', function(done) {
              agent
              .post('/sendtoken')
              .type('application/x-www-form-urlencoded')
              .send({"user" : 'alice@new.email', "delivery" : "clipboard"})
              .then( () => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            before('complete log in', function(done) {
              let loginLink = clipboardy.readSync()
              let len = settings.app_url.length
              let link = loginLink.slice(len)
              agent
              .get(link)
              .then( () => {
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should return an error message if the blog is already registered', function(done) {
              // mock route - should this be in a 'before'?
              nock('https://bobs-blog.com')
              .get('/')
              .replyWithFile(200, __dirname + '/sites/bobs-blog.com.html')
              agent
              .post('/api/v1/update/user/register-blog')
              .send({url: 'https://bobs-blog.com'})
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.msg.text, 'That blog is already registered')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should add the blog to the DB with URL, title, feed, approved: false and announced:false', function(done) {
              // mock route
              nock('https://www.bob.craps.on')
              .get('/')
              .replyWithFile(200, __dirname + '/sites/www.bob.craps.on.html')
              // NOTE: this is actually Alice registering a Bob's blog as hers!
              agent
              .post('/api/v1/update/user/register-blog')
              .send({url: 'https://www.bob.craps.on', category: 'budgies'})
              .expect(200)
              .then( () => {
                // check the blogs DB
                queries.getBlogs({query: {url: 'https://www.bob.craps.on'}})
                .then( args => {
                  assert.ok(args.blogs[0])
                  assert.strictEqual(args.blogs[0].url, 'https://www.bob.craps.on')
                  assert.strictEqual(args.blogs[0].feed, 'https://www.bob.craps.on/bob.xml')
                  assert.strictEqual(args.blogs[0].title, 'Bob Craps On')
                  assert.strictEqual(args.blogs[0].approved, false)
                  assert.strictEqual(args.blogs[0].announced, false)
                  done()
                })
                .catch( err => {
                  done(err)
                })
              })
              .catch( err => {
                done(err)
              })
            })
            it("should add the blog to the user's blogsForApproval", function(done) {
              queries.getBlogs({query: {url: 'https://www.bob.craps.on'}})
              .then( args => {
                args.query = {blogsForApproval: args.blogs[0]._id}
                return args
              })
              .then(queries.getUsers)
              .then( args => {
                // NOTE: we need to use the string value to test equality on ObjectIds
                let forApprovalIds = args.users[0].blogsForApproval.map( function(id) {
                  return id.toString()
                })
                assert(forApprovalIds.includes(args.blogs[0].idString))
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/user/claim-blog', function() {
            it('should return an error message if the blog is already owned', function(done) {
              agent
              .post('/api/v1/update/user/claim-blog')
              .send({
                url: 'https://alice.blog',
                idString: '761924060db4a4b2c3b7fcc5'
              })
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.error.message, 'Error: Another user owns or has claimed https://alice.blog')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should return an error message if the blog is already claimed', function(done) {
              agent
              .post('/api/v1/update/user/claim-blog')
              .send({
                url: 'https://bobs-blog.com',
                idString: '2a182f1d81c32da8adb56777'
              })
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.error.message, 'Error: Another user owns or has claimed https://bobs-blog.com')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/user/claim-blog')
              .send({
                url: 'https://another.legacy.blog',
                idString: '5d60be89d6e95e2d3bd1a69d'
              })
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.status, 'ok')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it("should add the blog to the user's blogsForApproval", function(done) {
              queries.getUsers({query: {_id: ObjectId('9798925b467e1bf17618d095')}})
              .then( args => {
                let forApprovalIds = args.users[0].blogsForApproval.map( function(id) {
                  return id.toString()
                })
                assert(forApprovalIds.includes('5d60be89d6e95e2d3bd1a69d'))
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/user/delete-blog', function() {
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
                        ObjectId("124e07a27998d130d1d3ab0d"),
                        ObjectId("761924060db4a4b2c3b7fcc5")
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
            beforeEach('insert blogs into blogs collection', function(done) {
              // insert test blog
              MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const insertBlog = function(db, callback) {
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
                insertBlog(db, function() {
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
                let blogs = data.body.blogs.map( x => {
                  x.toString()
                })
                assert.strictEqual(blogs.includes('124e07a27998d130d1d3ab0d'), false)
                done()
              })
              .catch(err => {
                done(err)
              })
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
          })
          describe('/api/v1/update/user/edit-blog', function() {
            before('add new blog with partial data', function(done){
              // insert test blogs
              MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const insertBlog = function(db, callback) {
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
                insertBlog(db, function() {
                  client.close()
                })
              })
            })
            before('make API call', function(done){
              // mock route
              nock('https://new.alice.blog/')
              .get('/')
              .replyWithFile(200, __dirname + '/sites/new.alice.blog.html')

              // make API call
              agent
              .post('/api/v1/update/user/edit-blog')
              .send({url: 'https://new.alice.blog', category: 'puppies'})
              .then( res => {
                assert.strictEqual(res.body.msg.class, 'flash-success')
                done()
              })
              .catch(err => {
                done(err)
              })
            })
            it('should update the blog feed if changed', function(done){
              return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const findBlog = function(db, callback) {
                  db.collection('rp_blogs').findOne({
                      url: 'https://new.alice.blog',
                    })
                    .then( blog => {
                      callback(blog)
                    })
                }
                findBlog(db, function(data) {
                  client.close()
                  .then( () => {
                    assert.strictEqual(data.feed, 'https://new.alice.blog/rss')
                    done()
                  })
                  .catch(err => {
                    done(err)
                  })
                })
              })
            })
            it('should update the blog title via feed-finder', function(done){
              return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const findBlog = function(db, callback) {
                  db.collection('rp_blogs').findOne({
                      url: 'https://new.alice.blog',
                    })
                    .then( blog => {
                      callback(blog)
                    })
                }
                findBlog(db, function(data) {
                  client.close()
                  .then( () => {
                    assert.strictEqual(data.title, "Alice's awesome new blog")
                    done()
                  })
                  .catch(err => {
                    done(err)
                  })
                })
              })
            })
            it('should update the blog category if changed', function(done){
              return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err)
                const db = client.db(dbName)
                const findBlog = function(db, callback) {
                  db.collection('rp_blogs').findOne({
                      url: 'https://new.alice.blog',
                    })
                    .then( blog => {
                      callback(blog)
                    })
                }
                findBlog(db, function(data) {
                  client.close()
                  .then( () => {
                    assert.strictEqual(data.category, 'puppies')
                    done()
                  })
                  .catch(err => {
                    done(err)
                  })
                })
              })
            })
          })
          describe('/api/v1/update/user/remove-pocket', function() {
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/user/remove-pocket')
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.class, 'flash-success')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should remove pocket value from user record', function(done) {
              queries.getUsers({query: {_id: ObjectId("9798925b467e1bf17618d095")}})
              .then( args => {
                assert(args.users[0])
                assert.strictEqual(args.users[0].pocket, undefined)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/user/filter-pocket', function() {
            it('should add _id to pocket.excluded when exclude is true', function(done) {
              agent
              .post('/api/v1/update/user/filter-pocket')
              .send({
                blog: '5d5932f5d6e95e2d3bd1a69c',
                exclude: true
              })
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.result, 'ok')
                queries.getUsers({
                  query: {email: 'alice@new.email'} // remember we had to log in again so this is the 'agent' email
                }) 
                .then( args => {
                  let alice = args.users[0]
                  let included = (item) => item.equals(ObjectId('5d5932f5d6e95e2d3bd1a69c'))
                  assert(alice.pocket.excluded.some(included))
                  done()
                })
                .catch(err => {
                  done(err)
                })
              })
              .catch(err => {
                done(err)
              })
            })
            it('should remove _id from pocket.excluded when exclude is false', function(done){
              agent
              .post('/api/v1/update/user/filter-pocket')
              .send({
                blog: '5d5932f5d6e95e2d3bd1a69c',
                exclude: false
              })
              .expect(200)
              .then( res => {
                assert.strictEqual(res.body.result, 'ok')
                queries.getUsers({
                  query: {email: 'alice@new.email'} // remember we had to log in again so this is the 'agent' email
                }) 
                .then( args => {
                  let alice = args.users[0]
                  assert.strictEqual(alice.pocket.excluded.includes(ObjectId('5d5932f5d6e95e2d3bd1a69c')), false)
                  done()
                })
                .catch(err => {
                  done(err)
                })
              })
              .catch(err => {
                done(err)
              })
            })
          })
        })
        describe('/api/v1/update/admin/*', function() {
          describe('/api/v1/update/admin/approve-blog', function() {
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/admin/approve-blog')
              .send({blog: '2a182f1d81c32da8adb56777', user: 'bob@example.com'})
              .then( x => {
                assert.strictEqual(x.body.class, 'flash-success')
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should set approved to true in blog listing', function(done) {
              queries.getBlogs({query: {'_id' : ObjectId('2a182f1d81c32da8adb56777')}})
              .then( args => {
                assert.strictEqual(args.blogs[0].approved, true)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should move the blog id to "blogs" in the user record', function(done) {
              queries.getUsers({query: {'email' : 'bob@example.com'}})
              .then( args => {
                blogs = args.users[0].blogs
                let approved = blogs.some(function(id) {
                  return id.toString() === '2a182f1d81c32da8adb56777'
                })
                assert(approved)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should remove the blog id from "blogsForApproval" in the user record', function(done) {
              queries.getUsers({query: {'email' : 'bob@example.com'}})
              .then( args => {
                blogs = args.users[0].blogsForApproval
                let forApproval = blogs.some(function(id) {
                  return id.toString() === '2a182f1d81c32da8adb56777'
                })
                assert.strictEqual(forApproval, false)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should queue an announcement', function(done){
              MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
                assert.strictEqual(null, err);
                const db = client.db(dbName);
                  const findDocuments = function(db, callback) {
                    const posts = db.collection('rp_announcements')
                    posts.countDocuments()
                    .then( count => {
                      assert.strictEqual(count, 2) // one tweet and one toot
                      done()
                      callback()
                    })
                    .catch(err => {
                      done(err)
                    })
                  }
                  findDocuments(db, function() {
                    client.close()
                  })
              })
            })
          })
          describe('/api/v1/update/admin/reject-blog', function() {
              // need to test client side also
            // need to require a 'reason' for rejection
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/admin/reject-blog')
              .send({
                blog: '5d592f2ed6e95e2d3bd1a69b', 
                user: 'bob@example.com',
                url: 'https://roberto.blog',
                reason: 'I just do not like it'
              })
              .then( x => {
                assert.strictEqual(x.body.class, 'flash-success')
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should remove the blog id from "blogsForApproval"', function(done) {
              queries.getUsers({query: {'email' : 'bob@example.com'}})
              .then( args => {
                blogs = args.users[0].blogsForApproval
                let forApproval = blogs.some(function(id) {
                  return id.toString() === '5d592f2ed6e95e2d3bd1a69b'
                })
                assert.strictEqual(forApproval, false)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should delete the blog if blog.approved = false', function(done) {
              queries.getBlogs({
                query: {'_id' : ObjectId('5d592f2ed6e95e2d3bd1a69b')}
              })
              .then( args => {
                assert.equal(args.blogs.length, 0)
                done()
              })
              .catch( err => {
                done(err)
              })
            })
            it('should NOT delete the blog if blog.approved = true', function(done) {
              agent
              .post('/api/v1/update/admin/reject-blog')
              .send({
                blog: '5d5932f5d6e95e2d3bd1a69c', 
                user: 'bob@example.com',
                url: 'https://legacy.blog',
                reason: 'Does not belong to Bob'
              })
              .then( () => {
                return queries.getBlogs({
                  query: {'_id' : ObjectId('5d5932f5d6e95e2d3bd1a69c')}
                })
                .then( args => {
                  assert.ok(args.blogs[0])
                  done()
                })
              })
              .catch( err => {
                done(err)
              })
            }) // for legacy mode
          })
          describe('/api/v1/update/admin/suspend-blog', function() {
              // need to test client side also
            // need to require a 'reason' for suspension
            // and also check if there is an owner
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/admin/suspend-blog')
              .send({url: 'https://alice.blog'})
              .expect(200)
              .then( res => {
                assert(res.body.class === 'flash-success')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should set suspended to true in blog listing', function(done) {
              queries
              .getBlogs({query: {url: 'https://alice.blog'}})
              .then( args => {
                assert.strictEqual(args.blogs[0].suspended, true)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/admin/unsuspend-blog', function() {
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/admin/unsuspend-blog')
              .send({url: 'https://alice.blog'})
              .expect(200)
              .then( res => {
                assert(res.body.class === 'flash-success')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should set suspensionEndDate to a datetime in blog listing', function(done) {
              queries
              .getBlogs({query: {url: 'https://alice.blog'}})
              .then( args => {
                let type = args.blogs[0].suspensionEndDate instanceof Date
                assert.strictEqual(type, true)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should set suspended to false in blog listing', function(done) {
              queries
              .getBlogs({query: {url: 'https://alice.blog'}})
              .then( args => {
                assert.strictEqual(args.blogs[0].suspended, false)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/admin/delete-blog', function() {
            // need to test client side also
            // need to require a 'reason' for deletion if owned
            it('should return success message', function(done) {
              agent
              .post('/api/v1/update/admin/delete-blog')
              .send({blog: '761924060db4a4b2c3b7fcc5', url: 'https://alice.blog'})
              .then( res => {
                assert.strictEqual(res.body.text, 'https://alice.blog deleted')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should remove the blog from the owner blogs array if there is an owner', function(done) {
              queries.getUsers({_id: ObjectId('9798925b467e1bf17618d095')})
              .then( args => {
                let blogs = args.users[0].blogs.map( x => {
                  return x.toString()
                })
                assert.strictEqual(blogs.includes('761924060db4a4b2c3b7fcc5'), false)
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should remove the blog from the blogs collection', function(done) {
              queries.getBlogs({query: {_id: ObjectId('761924060db4a4b2c3b7fcc5')}})
              .then( args => {
                assert(args.blogs.length === 0)
                done()
              })
              .catch( e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/admin/make-admin', function() {
            it('should return error message if user does not exist', function(done) {
              agent
              .post('/api/v1/update/admin/make-admin')
              .send({user: 'dan@example.com'})
              .then( res => {
                assert.strictEqual(res.body.class, 'flash-error')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should return a success message', function(done) {
              agent
              .post('/api/v1/update/admin/make-admin')
              .send({user: 'charlie@example.com'})
              .then( res => {
                assert.strictEqual(res.body.text, 'charlie@example.com is now an administrator')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should change the user permission value to "admin"', function(done) {
              queries.getUsers({query: {'email': 'charlie@example.com'}})
              .then( res => {
                assert.strictEqual(res.users[0].permission, 'admin')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
          describe('/api/v1/update/admin/remove-admin', function() {
            // need to test client side also
            // need to require a 'reason' for removal and who did it
            // also really should do some proper logging
            it('should return error message if user does not exist', function(done) {
              agent
              .post('/api/v1/update/admin/remove-admin')
              .send({user: 'dan@example.com'})
              .then( res => {
                assert.strictEqual(res.body.class, 'flash-error')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should return a success message', function(done) {
              agent
              .post('/api/v1/update/admin/remove-admin')
              .send({user: 'charlie@example.com'})
              .then( res => {
                assert.strictEqual(res.body.text, 'charlie@example.com is no longer an administrator')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
            it('should change the user permission value to "user"', function(done) {
              queries.getUsers({query: {'email': 'charlie@example.com'}})
              .then( res => {
                assert.strictEqual(res.users[0].permission, 'user')
                done()
              })
              .catch(e => {
                done(e)
              })
            })
          })
        })
      })
    })
    describe('admin routes that should error out', function() {
      // use before with Bob as agent (nonAdminAgent)
      before('log in', function(done) {
        agent.get('/logout') // logout to clear the cookie
        .then( () => {
          nonAdminAgent
          .post('/sendtoken')
          .type('application/x-www-form-urlencoded')
          .send({"user" : "bob@example.com", "delivery" : "clipboard"})
          .then( () => {
            done()
          })
          .catch( err => {
            done(err)
          })
        })
      })
      before('complete log in', function(done) {
        let loginLink = clipboardy.readSync()
        let len = settings.app_url.length
        let link = loginLink.slice(len)
        nonAdminAgent
        .get(link)
        .then( () => {
          done()
        })
        .catch( err => {
          done(err)
        })
      })
      describe('/admin/*', function() {
        it('should return 302, then redirect to /letmein if user not logged in', function(done) {
          request
          .post('/admin')
          .expect(302)
          .then ( res => {
            assert.equal(res.headers.location, '/letmein')
            done()
          })
          .catch(err => {
            done(err)
          })
        })
        it('should return 302, then redirect to /user if user logged in but not admin', function(done) {
          nonAdminAgent
          .post('/admin')
          .expect(302)
          .then ( res => {
            assert.equal(res.headers.location, '/user')
            done()
          })
          .catch(err => {
            done(err)
          })
        })
      })
      describe('/api/v1/admin/*', function() {
        it('should return 401 if user not logged in', function(done) {
          request
          .post('/api/v1/admin/info')
          .expect(401, done)
        })
        it('should return 403 if user logged in but not admin', function(done) {
          nonAdminAgent
          .post('/api/v1/admin/info')
          .expect(403, done)
        })
      })
      describe('/api/v1/update/admin/*', function() {
        it('should return 401 if user not logged in', function(done) {
          request
          .post('/api/v1/update/admin/approve-blog')
          .expect(401, done)
        })
        it('should return 403 if user logged in but not admin', function(done) {
          nonAdminAgent
          .post('/api/v1/update/admin/approve-blog')
          .expect(403, done)
        })
      })
    })
    describe('API - browse page', function(){
      describe('/api/v1/browse', function(){
        it('should list all blogs', function(done) {
          request
          .get('/api/v1/browse')
          .expect(200)
          .then( response => {
            assert.strictEqual(response.body.blogs.length, 8) // 8 approved blogs in DB, 10 in total
            done()
          })
          .catch(err => {
            done(err)
          })
        })
        it('should include blog title if available', function(done) {
          request
          .get('/api/v1/browse')
          .expect(200)
          .then( response => {
            let titles = response.body.blogs.map( blog => blog.title)
            assert(titles.includes("Alice's awesome new blog"))
            done()
          })
          .catch(err => {
            done(err)
          })
        })
        it('should include blog URL', function(done){
          request
          .get('/api/v1/browse')
          .expect(200)
          .then( response => {
            let urls = response.body.blogs.map( blog => blog.url)
            assert(urls.every( x => x.length > 0))
            done()
          })
          .catch(err => {
            done(err)
          })
        })
        it('should include blog category', function(done){
          request
          .get('/api/v1/browse')
          .expect(200)
          .then( response => {
            let categories = response.body.blogs.map( blog => blog.category)
            assert(categories.every( x => x.length > 0))
            done()
          })
          .catch(err => {
            done(err)
          })
        })
      })
    })
    describe('checkfeeds()', function() {
      before('create Bob RSS files with appropriate dates', function(done) {
        exec('node ./test/makeBobRssFile.js', (error, stdout, stderr) => {
          if (error) {
            done(error)
          } else if (stderr) {
            done(stderr)
          } else {
            done()
          }
        }) // script to create RSS file with dates relative to now
      })
      before('create Legacy RSS files with appropriate dates', function(done) {
        exec('node ./test/makeLegacyOneRssFile.js', (error, stdout, stderr) => {
          if (error) {
            done(error)
          } else if (stderr) {
            done(stderr)
          } else {
            done()
          }
        }) // script to create RSS file with dates relative to now
      })
      before('create Legacy RSS files with appropriate dates', function(done) {
        exec('node ./test/makeLegacyTwoRssFile.js', (error, stdout, stderr) => {
          if (error) {
            done(error)
          } else if (stderr) {
            done(stderr)
          } else {
            done()
          }
        }) // script to create RSS file with dates relative to now
      })
      before('create Bobbie RSS files with appropriate dates', function(done) {
        exec('node ./test/makeBobbieRssFile.js', (error, stdout, stderr) => {
          if (error) {
            done(error)
          } else if (stderr) {
            done(stderr)
          } else {
            done()
          }
        }) // script to create RSS file with dates relative to now
      })
      before('approve bob.craps.on', function(){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const blogs = db.collection('rp_blogs')
              let now = new Date()
              let lastWeek = new Date(now - 6.048e+8)
              blogs.updateOne(
                {url: 'https://www.bob.craps.on'},
                {$set: 
                  {
                    approved: true,
                    suspensionEndDate: lastWeek
                  }
                }
                )
              .then( docs => {
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      before('set up mocks for blog feeds before testing them', function(done) {

        nock('https://a.failing.blog')
        .get('/feed')
        .reply(404)

        nock('https://legacy.blog')
        .get('/feed')
        .replyWithFile(200, __dirname + '/sites/LegacyOneRss.xml')

        nock('https://another.legacy.blog')
        .get('/feed')
        .replyWithFile(200, __dirname + '/sites/legacyTwoRss.xml')

        nock('https://www.bob.craps.on')
        .get('/bob.xml')
        .replyWithFile(200, __dirname + '/sites/bobRss.xml')

        nock('https://bobbie.blog')
        .get('/rss')
        .replyWithFile(200, __dirname + '/sites/bobbieRss.xml')

        done()
      })
      before('change failing blog to failing:false prior to test', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err)
          const db = client.db(dbName)
          const updateBlog = function(db, callback) {
            db.collection('rp_blogs').updateOne(
                {
                  url: 'https://a.failing.blog',
                },
                {
                  $set: {
                    failing: false
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
          updateBlog(db, function() {
            client.close()
          })
        })
      })
      before('add "duplicate" items to DB for guid/id matching', function(done) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err)
          const db = client.db(dbName)
          const insertArticles = function(db, callback) {
            db.collection('rp_articles').insertMany(
              [
                {
                  _id: ObjectId("5e0982862de11e851b1e6f51"),
                  link: 'https://another.legacy.blog/3',
                  guid: 'https://another.legacy.blog/3',
                  author: 'Ella',
                  blogLink: 'https://another.legacy.blog',
                  date: new Date("2019-11-06T17:00:16Z"),
                  title: 'Trumpets!!!',
                  tags: 'Jazz',
                  blogTitle: "I don't actually know much about Jazz",
                  blog_id: ObjectId("5d60be89d6e95e2d3bd1a69d"),
                  tweeted: {
                    date: new Date('2019-11-06T18:04:00Z'),
                    times: 3
                  },
                  tooted: {
                    date: new Date('2019-11-06T18:04:10Z'),
                    times: 1
                  }
                },
                {
                  _id: ObjectId("5e0982862de11e851b1e6f53"),
                  link: 'https://legacy.blog/old-url',
                  guid: 'ABCD-1234',
                  author: 'Alice',
                  blogLink: 'https://legacy.blog',
                  date: new Date("2019-10-09T17:01:17Z"),
                  title: 'Yesterday, all my problems seemed so far away',
                  tags: '',
                  blogTitle: "Legacy Blog One",
                  blog_id: ObjectId('5d5932f5d6e95e2d3bd1a69c'), 
                  tweeted: {
                    date: new Date('2019-10-09T18:04:15Z'),
                    times: 2
                  },
                  tooted: {
                    date: new Date('2019-10-09T18:14:15Z'),
                    times: 2
                  }
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
          insertArticles(db, function() {
            client.close()
          })
        })
      })
      before('set pocket token and exclude a blog for Bob', function(done) {
        return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const updateBob = function(db, callback) {
              const posts = db.collection('rp_users')
              posts.updateOne({
                email: 'bob@example.com'
              },
              {
                $set: {
                  pocket: {
                    username: 'bob@example.com',
                    token: '5678defg-5678-defg-5678-defg56',
                    exludedBlogs: [ ObjectId('5d5932f5d6e95e2d3bd1a69c') ]
                  }
                }
              })
              .then( args => {
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            return updateBob(db, function() {
              client.close()
              .then( () => {
                done()
              })
              .catch(err => {
                done(err)
              })
              
            })
        })
      })
      it('should send posts to Pocket unless blog is excluded', function(done) {
        pocketApiAdd
        .post('/v3/add')
        .times(4) // only 4 times because legacy.blog is excluded
        .reply(function(uri, requestBody) {
          let requestObj = JSON.parse(requestBody)
          // legacy.blog is excluded, as per above
          assert.notStrictEqual(requestObj.url, 'https://legacy.blog/4')
          return 200
        })

        feeds.checkFeeds()
        .then( res => {
          assert.strictEqual(res, true)
          done()
        })
        .catch( err => {
          done(err)
        })
      })
      it('should NOT duplicate (i.e. add again) posts with the same url', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.find({link: 'https://another.legacy.blog/3'}).toArray()
              .then( docs => {
                assert(docs.length == 1)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should NOT duplicate (i.e. add again) posts with the same guid', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.find({guid: 'ABCD-1234'}).toArray()
              .then( docs => {
                assert(docs.length == 1)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should add new articles if they are not in the database', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.find({guid: 'https://www.bob.craps.on/4'}).toArray()
              .then( docs => {
                assert(docs.length == 1)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should assign values for author, blog_id, blogLink, blogTitle, date, guid, link, tags, and title', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.findOne({guid: 'https://www.bob.craps.on/4'})
              .then( doc => {
                assert.ok(doc)
                assert.ok(doc.author)
                assert.ok(doc.blog_id)
                assert.ok(doc.blogLink)
                assert.ok(doc.blogTitle)
                assert.ok(doc.date)
                assert.ok(doc.guid)
                assert.ok(doc.link)
                assert.ok(doc.tags)
                assert.ok(doc.title)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should NOT add articles that have exclude tags', function(done) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.findOne({guid: 'https://another.legacy.blog/2'})
              .then( doc => {
                assert.equal(doc, null)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should NOT add articles published prior to suspensionEndDate', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.findOne({guid: 'https://www.bob.craps.on/2'})
              .then( doc => {
                assert.equal(doc, null)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      // NOTE: this (above) accounts for multiple suspensions because it progressively becomes more recent
      it('should queue announcements for articles after they are added', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.countDocuments()
              .then( doc => {
                assert.equal(doc > 0, true)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })  // NOTE: if use_twitter and use_mastodon are both set to 'false' in the test settings, this will fail
          // leave them both set to 'true' whilst testing, unless testing what happens when they are false
          // but be aware this and other tests will fail in that case because of how the testing is set up
      it('should NOT queue announcements for added articles that are older than 48 hours', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.countDocuments()
              .then( doc => {
                assert.strictEqual(doc, 12) 
                // 1 post on each of twitter and masto announcing approved blog
                // 5 posts to announce on each of twitter and mastodon
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should set failing to true if blog 404s', function(done) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_blogs')
              posts.findOne({url: 'https://a.failing.blog'})
              .then( doc => {
                assert.equal(doc.failing, true)
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
    })
    describe('queueArticleAnnouncement()', function() {
      it('should queue/not queue tweets according to use_twitter', function(done){
        // check announcements for tweets
        // use_twitter is true by default for test 
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.countDocuments({
                type: 'tweet'
              })
              .then( doc => {
                if (settings.twitter.use_twitter) {
                  assert.equal(doc > 0, true)
                } else {
                  assert.equal(doc > 0, false)
                }
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should queue/not queue toots according to use_mastodon', function(done){
        // check announcements for toots
        // use_mastodon is true by default for test 
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.countDocuments({
                type: 'toot'
              })
              .then( doc => {
                if (settings.mastodon.use_mastodon) {
                  assert.equal(doc > 0, true)
                } else {
                  assert.equal(doc > 0, false)
                }
                done()
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
            })
        })
      })
      it('should include title, author and link', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'toot'
              })
              .toArray()
              .then( docs => {
                let hasTitle = docs.some(function(doc){
                  return doc.message.includes('Lorem ipsum dolor')
                })
                let hasName = docs.some(function(doc){
                  return doc.message.includes('Dizzy')
                })
                let hasLink = docs.every(function(doc){
                  return doc.message.includes('https://')
                })
                assert.ok(hasTitle)
                assert.ok(hasName)
                assert.ok(hasLink)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('should include blog_club_hashtag if blog_club_tag is in post', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'tweet'
              })
              .toArray()
              .then( docs => {
                let hasHashTag = docs.some(function(doc){
                  return doc.message.includes('#GLAMBlogClub')
                })
                assert.ok(hasHashTag)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('should restrict tweet length to 280 chars max', function(done){
        // check announcements collection for tweets
        // check they are all shorter than 280 chars
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'tweet'
              })
              .toArray()
              .then( docs => {
                docs.every(function(doc){
                  assert.ok(doc.message.length < 280)
                })
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('should restrict toot length to 500 chars max', function(done){
        // check announcements collection for toots
        // check they are all shorter than 500 chars
        return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'toot'
              })
              .toArray()
              .then( docs => {
                docs.every(function(doc){
                  assert.ok(doc.message.length < 500)
                })
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('tweets should use owner twitter @name if listed', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'tweet'
              })
              .toArray()
              .then( docs => {
                let passes = docs.some(function(doc){
                  return doc.message.includes('bob@twitter.com')
                })
                assert.ok(passes)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('tweets should use blog twitter @name if listed in twHandle, when owner not available', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'tweet'
              })
              .toArray()
              .then( docs => {
                let passes = docs.some(function(doc){
                  return doc.message.includes('@rockpool')
                })
                assert.ok(passes)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('toots should use owner mastodon @name if listed', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_announcements')
              posts.find({
                type: 'toot'
              })
              .toArray()
              .then( docs => {
                let passes = docs.some(function(doc){
                  return doc.message.includes('@bob@rockpool.town')
                })
                assert.ok(passes)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
    })
    describe('pushToPockets()', function(){
      before('mock pocket API calls', function(){
        // mock calls here
        pocketApiAdd
        .post('/v3/add')
        .reply(200)
      })
      it('should not throw if there are no registered Pocket accounts', function() {
        assert.doesNotThrow(feeds.pushToPockets)
      })
      it('should send Pocket API call including blogpost url as string', function() {
        return feeds.pushToPockets('https://bobbie.blog/2')
        .then( () => {
          // we only set up one nock route (i.e. not persisting) and it has been used, 
          // therefore the call to Pocket was made
          assert.ok(pocketApiAdd.isDone())
        })
      })
    })

    describe('checkArticleAnnouncements', function() {
      before('run checkArticleAnnouncements', function(){
        return announcements.checkArticleAnnouncements()
      })
      describe('if tweeted.times is fewer than number_of_tweets_per_article', function(){
        it('should queue a tweet if tweeted.date is older than hours_between_announcements', function(done){
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const findDocuments = function(db, callback) {
                const posts = db.collection('rp_announcements')
                posts.find({
                  type: 'tweet'
                })
                .toArray()
                .then( docs => {
                  let passes = docs.some(function(doc){
                    return doc.message.includes('Winter is coming')
                  })
                  assert.ok(passes)
                  callback()
                })
                .catch(err => {
                  done(err)
                })
              }
              findDocuments(db, function() {
                client.close()
                done()
              })
          })
        })
          it('should NOT queue a tweet if tweeted.date is more recent than hours_between_tweets', function(done){
            MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
              assert.strictEqual(null, err);
              const db = client.db(dbName);
                const findDocuments = function(db, callback) {
                  const posts = db.collection('rp_announcements')
                  posts.find({
                    type: 'tweet'
                  })
                  .toArray()
                  .then( docs => {
                    let tooOld = docs.some(function(doc){
                      return doc.message.includes('Yesterday, all my problems seemed')
                    })
                    assert.ok(!tooOld)
                    callback()
                  })
                  .catch(err => {
                    done(err)
                  })
                }
                findDocuments(db, function() {
                  client.close()
                  done()
                })
            })
          })
        })
        describe('if tweeted times is equal to (or greater than) number_of_tweets_per_article', function(){
        it('should do nothing', function(done){
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const findDocuments = function(db, callback) {
                const posts = db.collection('rp_articles')
                posts.findOne({
                  _id: ObjectId("5e0982862de11e851b1e6f51")
                })
                .then( doc => {
                  assert.ok(doc.tweeted.times === 3)
                  callback()
                })
                .catch(err => {
                  done(err)
                })
              }
              findDocuments(db, function() {
                client.close()
                done()
              })
          })
        })
      })
      describe('if tooted.times is fewer than number_of_toots_per_article', function(){
        it('should queue a toot if tooted.date is older than hours_between_announcements', function(done){
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const findDocuments = function(db, callback) {
                const posts = db.collection('rp_announcements')
                posts.find({
                  type: 'toot'
                })
                .toArray()
                .then( docs => {
                  let passes = docs.some(function(doc){
                    return doc.message.includes("I don't actually know much about Jazz")
                  })
                  assert.ok(passes)
                  callback()
                })
                .catch(err => {
                  done(err)
                })
              }
              findDocuments(db, function() {
                client.close()
                done()
              })
          })
        })
        it('should NOT queue a toot if tooted.date is more recent than hours_between_toots', function(done){
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const findDocuments = function(db, callback) {
                const posts = db.collection('rp_announcements')
                posts.find({
                  type: 'tweet'
                })
                .toArray()
                .then( docs => {
                  let tooOld = docs.some(function(doc){
                    return doc.message.includes('Star wars is massively over-rated')
                  })
                  assert.ok(!tooOld)
                  callback()
                })
                .catch(err => {
                  done(err)
                })
              }
              findDocuments(db, function() {
                client.close()
                done()
              })
          })
        })
      })
      describe('if tooted.times is equal to (or greater than) number_of_toots_per_article', function(){
        it('should do nothing', function(done){
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const findDocuments = function(db, callback) {
                const posts = db.collection('rp_articles')
                posts.findOne({
                  _id: ObjectId("5e0982862de11e851b1e6f53")
                })
                .then( doc => {
                  assert.ok(doc.tooted.times === 2)
                  callback()
                })
                .catch(err => {
                  done(err)
                })
              }
              findDocuments(db, function() {
                client.close()
                done()
              })
            })
        })
      })
    })
    describe('announce()', function() {
      before('run announce()', function(){
        return announcements.announce()
      })
      before('check announcements', function(done){
        return MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              db.collection('rp_announcements').find()
              .toArray()
              .then( docs => {
                return callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('should send the next announcement if there are any in the queue', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              db.collection('rp_announcements').find()
              .toArray()
              .then( docs => {
                let passes = docs.some(function(doc){
                  // this should be the first message out because it was the first message in
                  return doc.message.includes('https://bobs-blog.com by bob@twitter.com has been added to Aus GLAM Blogs!')
                })
                assert.ok(passes === false)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
      it('should not send more than one announcement per cycle', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              db.collection('rp_announcements')
              .countDocuments()
              .then( total => {
                assert.ok(total === 11)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
    })
    describe('sendTweet()', function(){
      // testing only needs to check if a tweet would have been sent - we're not testing the Twitter API
      // use nock to simulate and check data sent is correct
      before('mock tweet response', function(){
        nock('https://api.twitter.com/1.1')
        .post('/statuses/update.json')
        .query({status: 'undefined'})
        .replyWithError('Status is undefined')

        nock('https://api.twitter.com/1.1')
        .post('/statuses/update.json')
        .query({status: /Today\'s Legacy One Blog Post*/})
        .reply(200)

      })
      it('should send tweet', function(){
        return new Promise(function (resolve, reject) {
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const getId = function(db, callback) {
                const collection = db.collection('rp_announcements')
                collection.findOne( {
                  message: {$regex: /Today\'s Legacy One Blog Post/}
                })
                .then( res => {
                  callback(res)
                })
                .catch(err => {
                  reject(err)
                })
              }
              getId(db, function(msg) {
                client.close()
                resolve(msg)
              })
          })
        })
        .then( msg => {
          return announcements.sendTweet(msg)
        })
      })
      it('should increment tweeted.times by 1', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.findOne({
                title: "Today's Legacy One Blog Post"
              })
              .then( doc => {
                assert.ok(doc.tweeted.times === 1)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
          })
        })
    })
    describe('sendToot()', function(){
      // testing only needs to check if a toot would have been sent - we're not testing the Mastodon API
      // use nock to simulate and check data sent is correct
      before('mock toot response', function(){
        nock('https://ausglam.space/api/v1')
        .post('/statuses')
        .query({status: 'undefined'})
        .replyWithError('Status is undefined')

        nock('https://ausglam.space/api/v1')
        .post('/statuses')
        .query({status: /Today\'s Legacy One Blog Post*/})
        .reply(200)

      })
      it('should send toot', function(){
        return new Promise(function (resolve, reject) {
          MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
            assert.strictEqual(null, err);
            const db = client.db(dbName);
              const getId = function(db, callback) {
                const collection = db.collection('rp_announcements')
                collection.findOne( {
                  message: {$regex: /Today\'s Legacy One Blog Post/}
                })
                .then( res => {
                  callback(res)
                })
                .catch(err => {
                  reject(err)
                })
              }
              getId(db, function(msg) {
                client.close()
                resolve(msg)
              })
          })
        })
        .then( msg => {
          return announcements.sendToot(msg)
        })
      })
      it('should increment tooted.times by 1', function(done){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const findDocuments = function(db, callback) {
              const posts = db.collection('rp_articles')
              posts.findOne({
                _id: ObjectId("5e0982862de11e851b1e6f51")
              })
              .then( doc => {
                assert.ok(doc.tooted.times === 1)
                callback()
              })
              .catch(err => {
                done(err)
              })
            }
            findDocuments(db, function() {
              client.close()
              done()
            })
        })
      })
    })
    describe('makeOpml()', function() {
      it('should return an xml file', function(done){
        request
        .get('/opml')
        .expect('Content-Type', 'text/x-opml; charset=UTF-8')
        .expect(200, done)
      })
      it('should list active blogs under each category', function() {
        return request.get('/opml')
        .then( res => {
          opmlToJSON(res.text, function (error, json) {
            let cats = json.children[0]
            assert.strictEqual(cats.children.length, 6)
          })
        })
      })
      it('should exclude suspended blogs', function() {
        return request.get('/opml')
        .then( res => {
          opmlToJSON(res.text, function (error, json) {
            let cats = json.children[0]
            assert.strictEqual(cats.children[1].children.length, 1)
            assert.strictEqual(cats.children[3].children, undefined)
          })
        })
      })
    })
  })
  after('All tests completed', function(done) {

    function wipeDb() {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
          assert.strictEqual(null, err);
          const db = client.db(dbName);
            const dropDb = function(db, callback) {
              db.dropDatabase()
              .then( () => {
                callback()
                
              })
              .catch(e => {
                debug.error(e)
              })
            }
            return dropDb(db, function() {
              client.close()
              .then( () => {
                resolve() // dropped
              })
            })
        })
      })

    }

    agent.get('/logout') // logout to clear the cookie
    .then(wipeDb) // drop DB
    .then( () => {
      done()
    })
    
      // close all mongo connections if I ever work out how to tear it down in a way that actually works...
      // TODO: is there an open Mongo connection in the app somewhere? (possibly previously above in 'after')
      // TODO: check whether MongoStore can/needs to be closed.
    })
  })
})