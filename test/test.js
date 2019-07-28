// require anything required

// TESTS

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

  describe('When the database is empty', function() {
    before('Clear test database before running tests', function() {
      // clear db here
      // something like db.dropDatabase
    })
    it('should load homepage')
    it('should load subscribe page')
    it('should load login page')
    it('should load search results page')
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
