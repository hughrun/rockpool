// require modules
const supertest = require('supertest') // test routes
const app = require('../app.js') // require Rockpool app
const queries = require('../lib/queries.js')
// NOTE: app will hang mocha because there doesn't seem to be any way to close the connection
// workaround for now is to run with the --exit flag but this is obviously not ideal
const request = supertest(app) // logged out requests
const agent = supertest.agent(app) // logged in as admin
const nonAdminAgent = supertest.agent(app) // logged in as non-admin
const nock = require('nock') // external website mocking
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
        it('should load the help page')
        it('should load the opml file')
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
                  blogs: [],
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
                },
                {
                  _id: ObjectId('5d592f2ed6e95e2d3bd1a69b'),
                  url: 'https://roberto.blog',
                  feed: 'https://roberto.blog/feed',
                  category: 'sushi',
                  approved: false,
                  announced: false
                },
                {
                  _id: ObjectId('5d5932f5d6e95e2d3bd1a69c'),
                  url: 'https://legacy.blog',
                  feed: 'https://legacy.blog/feed',
                  category: 'podcasting',
                  approved: true,
                  announced: true
                },
                {
                  _id: ObjectId("5d60be89d6e95e2d3bd1a69d"),
                  url: 'https://another.legacy.blog',
                  feed: 'https://another.legacy.blog/feed',
                  category: 'jazz',
                  approved: true,
                  announced: true
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
          // TODO: mock this with nock?
          it('should add pocket value to user as object with username and token values')
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
                this.timeout(5000)
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
              // TODO:
            describe('/api/v1/admin/failing-blogs', function() {
              it('should return blog info for failing blogs')
            })
            describe('/api/v1/admin/reported-blogs', function() {
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
              it('should return an error message if the blog is already registered', function(done) {
                // mock route
                const regRoute = nock('https://bobs-blog.com')
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
              it('should add the blog to the DB with URL, feed, approved: false and announced:false', function(done) {
                // mock route
                const regRoute = nock('https://www.bob.craps.on')
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
                .send({url: 'https://alice.blog'})
                .expect(200)
                .then( res => {
                  assert.strictEqual(res.body.text, 'Something went wrong: Error: Another user owns or has claimed https://alice.blog')
                  done()
                })
                .catch(e => {
                  done(e)
                })
              })
              it('should return an error message if the blog is already claimed', function(done) {
                agent
                .post('/api/v1/update/user/claim-blog')
                .send({url: 'https://bobs-blog.com'})
                .expect(200)
                .then( res => {
                  assert.strictEqual(res.body.text, 'Something went wrong: Error: Another user owns or has claimed https://bobs-blog.com')
                  done()
                })
                .catch(e => {
                  done(e)
                })
              })
              it('should return success message', function(done) {
                agent
                .post('/api/v1/update/user/claim-blog')
                .send({url: 'https://another.legacy.blog'})
                .expect(200)
                .then( res => {
                  assert.strictEqual(res.body.text, 'Your https://another.legacy.blog claim is now awaiting admin approval')
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
            describe('/api/v1/update/user/edit-blog', function(done) {
              it('should update the blog category')
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
              it('should queue an announcement')
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
                .then( x => {
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
              it('should set suspended.start to datetime in blog listing')
              it('should return updated data for admin screen')
            })
            describe('/api/v1/update/admin/unsuspend-blog', function() {
              it('should set suspended.end to datetime in blog listing') 
              // TODO: what about multiple suspensions?
              // maybe it should be an array of objects with start and end times?
              it('should return updated data for admin screen')
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
          var loginLink = clipboardy.readSync()
          var link = loginLink.slice(19)
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
      describe('checkfeeds()', function() {
        it('should run every X minutes in line with settings[env].minutes_between_checking_feeds')
        it('should eventually resolve')
        it('should not duplicate blogs with the same URL or GUID')
        it('should add new articles if there are new (i.e. not in the DB) articles')
        it('should skip articles with exclude tags')
        it('should skip articles published between suspend.start and suspend.end')
        it('should queue announcements for added articles')
        it('should not queue announcements for added articles that are older than 48 hours')
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
        it('should not send more than one announcement per cycle')
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
      describe('makeOPML()', function() {
        it('should return an xml file')
        it('should list active blogs under each category')
        it('should exclude suspended blogs')
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