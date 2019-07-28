// require app and supertest
const request = require('supertest') // test routes
const app = require('../app.js') // this causes mocha to hang
// NOTE: app will hang mocha because there doesn't seem to be any way to close the connection
// workaround for now is to run with the --exit flag but this is obviously not ideal

// TESTS
describe('Test suite for Rockpool: a web app for communities of practice', function() {

  // MIGRATE.JS
  describe('npm migrate - to migrate legacy DB from existing CommunityTweets (ausglamblogs) DB', function() {
    describe('The articles collection', function() {
      it('Should be renamed to rp_articles')
      it('Should do a bunch of other stuff...')
    })
    describe('The blogs collection', function() {
      it('Should be renamed to rp_blogs')
      it('Should do a bunch of other stuff...')
    })
    describe('The tags collection', function() {
      it('Should be renamed to rp_tags')
      it('Should do a bunch of other stuff...')
    })
    describe('The users collection', function() {
      it('Should be renamed to rp_users')
      it('Should do a bunch of other stuff...')
    })
  })

  // TODO: SETUP.JS (previously INDEXES.JS )
  describe('npm setup - to prepare DB before running Rockpool', function() {
    it('Should create database using name in settings[env].mongo_db')
    it('Should not create new database if DB already exists')
    it('Should build text indexes if they do not already exist')
  })

  // APP.JS
  describe('Rockpool, a web app for communities of practice', function() {
      before('Clear test database before running all tests', function() {
        // clear db here
        // something like db.dropDatabase
      })
      after('Close connection to app when tests completed', function() {
        // if I ever work out how to tear it down in a way that actually works...
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
    
    describe('Harvester functions', function() {
      describe('The checkfeeds() function checks each feed in the DB for new articles', function() {
        it('should eventually resolve')
        it('should not add articles that are already in the database')
        it('should add new articles if there are new articles')
        it('should skip articles with an exclude tag')
        it('should queue announcements for new articles')
        it('should not queue announcements for new articles that are older than 48 hours')
      })
    })
  })
})