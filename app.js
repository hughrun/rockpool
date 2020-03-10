/*  ######################################
    ###         require modules        ###
    ######################################
*/

// dev
const debug = require('debug') // debug for development
const clipboardy = require('clipboardy') // write to and from clipboard (for development)

// settings
const settings = require('./settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// express
const path = require('path') // nodejs native package
const express = require('express') // express
const app = express(); // create local instance of express
const engines = require('consolidate') // use consolidate with whiskers template engine
// Mongo
const { MongoClient, ObjectId } = require('mongodb') // Mongo
const mongoUrl = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db
// WAIT FOR DATABASE TO CONNECT
// This is important for running in Docker
// Otherwise the app starts trying to connect to Mongo before it's ready
const awaitDb = new Promise( function (resolve, reject) {
  function checkMongo() {
    debug.log('Waiting for DB...')
    return MongoClient.connect(mongoUrl, { useNewUrlParser: true}, function(err, client) {
      if (err) {
        debug.log(err)
        setTimeout(checkMongo, 5000)
      }
      else {
        debug.log('ready..')
        client.close()
        resolve()
      }
    })
  }
  setTimeout(checkMongo, 5000)
})

awaitDb.then( function() {
  debug.log("running..")

  // require locals
  const db = require('./lib/queries.js') // local database queries module
  const { updateUserContacts, updateUserBlogs, updateUserPocketFilters, unsubscribeFromPocket, updateUserPermission } = require('./lib/users.js') // local database updates module
  const { approveBlog, deleteBlog, editBlog, registerBlog, suspendBlog } = require('./lib/blogs.js') // local database updates module
  const { authorisePocket, finalisePocketAuthentication, makeOpml, sendEmail } = require('./lib/utilities.js') // local pocket functions
  const feeds = require('./lib/feeds.js')
  const announcements = require('./lib/announcements.js') // local database blogs module

  // managing users
  const session = require('express-session') // sessions so people can log in
  const passwordless = require('passwordless') // passwordless for ...passwordless logins
  const TokenStore = require('passwordless-mongostore-bcryptjs') // for creating and storing passwordless tokens
  const MongoStore = require('connect-mongo')(session); // session storage

  // set up session params
  const sessionOptions = {
    resave: false,
    saveUninitialized: true,
    store: new MongoStore( { url: mongoUrl }), 
    secret: settings.session_secret,
    cookie: {
      maxAge: 6048e5 // expire cookies after a week
    }
  }

  // dealing with form data
  const bodyParser = require('body-parser') // bodyparser for form data
  const { body, validationResult } = require('express-validator/check') // validate

  // other stuff
  const flash = require('express-flash') // flash messages
  const feedfinder = require('@hughrun/feedfinder') // get feeds from site URLs
  const fs = require('fs') // node file system

  /*  ######################################
      ### initiate and configure modules ###
      ######################################
  */

  // MongoDB TokenStore for passwordless login tokens
  const pathToMongoDb = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/passwordless-token?authSource=${settings.mongo_db}` // mongo collection for tokens
  passwordless.init(new TokenStore(pathToMongoDb, { useNewUrlParser: true})) // initiate store

  // Set up an email delivery service for passwordless logins
  passwordless.addDelivery('email',
    function(tokenToSend, uidToSend, recipient, callback, req) {
      var message =  {
        text: 'Hello!\nAccess your account here: ' + settings.app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend),
        to: recipient,
        subject: 'Log in to ' + settings.app_name,
        attachment: [
          {data: `<html><p>Somebody is trying to log in to ${settings.app_name} with this email address. If it was you, please <a href="${settings.app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)}">log in</a> now.</p><p>If it wasn't you, simply delete this email.</p></html>`, alternative: true}
        ]
      }
      sendEmail(message)
      .then( err => {
        callback(err)
      })
  })

  // passwordless for dev (bypass email and send the token to the clipboard instead)
  passwordless.addDelivery('clipboard',
    function(tokenToSend, uidToSend, recipient, callback, req) {
      var address = settings.app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)
      clipboardy.writeSync(address)
      if (env === 'development') {
        debug.log("Login link copied to clipboard")
      }
      callback(null, recipient)
    })

  /*  ######################################
      ###     app settings and routing   ###
      ######################################
  */

  // template views
  app.set('views', path.join(__dirname, 'views'))
  app.engine('html', engines.whiskers)
  app.set('view engine', 'html')

  // routing middleware
  app.use(bodyParser.urlencoded({ extended: false })) // use bodyParser with form data
  app.use(bodyParser.json()) // use bodyParser with JSON
  app.use(session(sessionOptions)) // use sessions
  app.use(passwordless.sessionSupport()) // makes session persistent
  app.use(passwordless.acceptToken({ successRedirect: '/user'})) // checks token and redirects
  app.use(express.static(__dirname + '/public')) // serve static files from 'public' directory
  app.use(flash()) // use flash messages for non-vue messages. This may be replaced in future but works for now

  // locals (variables for all routes)
  app.locals.pageTitle = settings.app_name
  app.locals.appName = settings.app_name
  app.locals.appTagline = settings.app_tagline
  app.locals.appDescription = settings.app_description
  app.locals.orgName = settings.org_name
  app.locals.orgUrl = settings.org_url
  app.locals.blogClub = settings.blog_club_name
  app.locals.blogClubUrl = settings.blog_club_url
  app.locals.blogCategories = settings.blog_categories
  app.locals.legacy = settings.legacy_db
  app.locals.showCredits = settings.show_credits

  /*  ######################################
      ###              routes            ###
      ######################################
  */

  /*  
      ###############
        PUBLIC ROUTES
      ###############
  */

  // home
  app.get('/', (req, res) =>
    Promise.all([db.getArticles(), db.getTopTags])
    .then( function(vals) {
      newVals = vals.reduce( function(result, item, index) {
        let key = Object.keys(item)[0];
        result[key] = item[key]
        return result
      }, {})
      res.render('index', {
        partials: {
          articleList: __dirname+'/views/partials/articleList.html',
          foot: __dirname+'/views/partials/foot.html',
          footer: __dirname+'/views/partials/footer.html',
          head: __dirname+'/views/partials/head.html',
          header: __dirname+'/views/partials/header.html',
          search: __dirname+'/views/partials/search.html',
          searchNav: __dirname+'/views/partials/searchNav.html',
          toptags: __dirname+'/views/partials/toptags.html'
        },
        articles: newVals.articles,
        tags: newVals.tags,
        user: req.session.passwordless
      })
    })
    .catch(err => debug.log(err))
  )

  // search
  app.get('/search/', (req, res) => db.getArticles(req.query.tag, req.query.page, req.query.q, req.query.month)
    .then( docs => res.render('tag', {
        partials: {
          articleList: __dirname+'/views/partials/articleList.html',
          search: __dirname+'/views/partials/search.html',
          head: __dirname+'/views/partials/head.html',
          foot: __dirname+'/views/partials/foot.html',
          header: __dirname+'/views/partials/header.html',
          footer: __dirname+'/views/partials/footer.html',
          searchNav: __dirname+'/views/partials/searchNav.html',
        },
        articles: docs.articles,
        searchterm: req.query.tag ? req.query.tag : req.query.q,
        tag: req.query.tag,
        searchTermEncoded: req.query.tag ? 'tag=' + encodeURIComponent(req.query.tag) : req.query.q ? 'q=' + encodeURIComponent(req.query.q) : '',
        next: req.query.page ? Number(req.query.page) + 1 : 1,
        prev: Number(req.query.page) - 1,
        prevExists: Number(req.query.page) != NaN ? Number(req.query.page) : false,
        month: req.query.month,
        monthName: docs.monthName,
        hasNext: docs.hasNext,
        hasPrev: docs.hasPrev,
        user: req.session.passwordless
      })
    )
    .catch(err => debug.log(err))
  )

  // subscribe
  app.get('/subscribe', function (req, res) {
    res.render('subscribe', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      },
      user: req.session.passwordless,
      errors: req.flash('error')
    })
  })

  // help
  app.get('/help', function(req, res) {
    res.render('help', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      },
      user: req.session.passwordless,
      errors: req.flash('error')
    })
  })

  app.get('/opml', function(req, res) {
    makeOpml()
    .then( file => {
      let filepath = path.join(__dirname, 'public/files/feeds.opml')
      fs.writeFileSync(filepath, file)
        let options = {
          root: path.join(__dirname, 'public/files'),
          dotfiles: 'deny',
          headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
          }
        }
        res.download('/feeds.opml', 'feeds.opml', options)
    })
  })

  /*  
      ###############
        LOGIN ROUTES
      ###############
  */

  /* GET login screen. */
  app.get('/letmein', function(req, res) {
    if (req.session.passwordless) {
      res.redirect('/user')
    } else {
      res.render('login', {
        partials: {
          head: __dirname+'/views/partials/head.html',
          header: __dirname+'/views/partials/header.html',
          foot: __dirname+'/views/partials/foot.html',
          footer: __dirname+'/views/partials/footer.html'
        },
        user: req.session.passwordless,
        delivery: settings.deliver_tokens_by // allows bypassing email when in development
      })
    }
  })

  /* POST login email address */
  app.post('/sendtoken',
    passwordless.requestToken(
      function(user, delivery, callback, req) {
        body('user').isEmail().normalizeEmail() // check it's email and downcases everything
        if (validationResult(req).isEmpty()) {
          return callback(null, user)
        } else {
          debug.log('ERROR: %O', validationResult(req)) // log errors
          return res.status(422) // return error status
          // NOTE: given the field is an 'email' field, the only way to get to this error
          // is if someone is using a really old browser and enters something that is not an email address
        }
      },
      { failureRedirect: '/logged-out' }
    ),
    function(req, res) {
      // success!
      res.redirect('/token-sent')
  })

  // info screen after login token sent
  app.get('/token-sent', function(req, res) {
    res.render( 'checkEmail', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
      },
      user: req.session.passwordless
    })
  })

  /*  
      ###############
        USER ROUTES
      ###############
  */

  // restrict all user paths to logged in users
  app.all('/user*',
    passwordless.restricted({ failureRedirect: '/letmein' }),
    (req, res, next) =>
      next()
  )

  // user dashboard
  // all logic should be in the vue API calls
  app.get('/user',
    function (req, res) { 
      res.render('user', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      },
      user: req.user
    })
  })

  // pocket routes

  app.get('/user/pocket', 
    (req, res) => {
      var args = {}
      args.user = req.user 
      db.getUserDetails(args)
      .then(authorisePocket)
      .then( args => {
        req.session.pocketCode = args.code
        res.redirect(`https://getpocket.com/auth/authorize?request_token=${args.code}&redirect_uri=${settings.app_url}/user/pocket-redirect`)
      })
      .catch( err => {
        debug.log(err)
        req.flash('error', `Something went wrong trying to authenticate with Pocket: ${err}`)
        res.redirect('/subscribe')
      })
  })

  app.get('/user/pocket-redirect', 
    (req, res) => {
      // user has now authorised us to authenticate to pocket and get an access token
      const args = {}
      args.code = req.session.pocketCode
      args.key = settings.pocket_consumer_key
      args.user = req.user
      finalisePocketAuthentication(args)
        .then( () => {
          req.flash('success', 'Pocket account registered')
          res.redirect('/user')
        })
        .catch(e => {
          req.flash('error', e)
          res.redirect('/subscribe')
        })
    })

  /*  
      ###############
        ADMIN ROUTES
      ###############
  */

  // restrict all admin paths
  app.all('/admin*',
    passwordless.restricted({ failureRedirect: '/letmein' }),
    function (req, res, next) {
      var args = {}
      args.user = req.user 
      db.getUserDetails(args)
      .then( doc => {
        if (doc.user.permission && doc.user.permission === "admin") {
          next()
        } else {
          req.flash('error', 'You are not allowed to view admin pages because you are not an administrator')
          res.status(403)
          res.redirect('/user')
        }
      })
      .catch(err => {
        debug.log(`Error accessing admin page: ${err}`)
        req.flash('error', 'Something went wrong')
        res.redirect('/user')
      })
    })

  // admin home page
  app.get('/admin', function (req, res) {
    res.render('admin', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      },
      user: req.user
    })
  })

  // browse page
  app.get('/browse', function (req, res) {
      res.render('browse', {
        partials: {
          head: __dirname+'/views/partials/head.html',
          header: __dirname+'/views/partials/header.html',
          foot: __dirname+'/views/partials/foot.html',
          footer: __dirname+'/views/partials/footer.html'
        },
        user: req.user
      })
    })

  /*  
      #######################
      LOGOUT AND ERROR ROUTES
      #######################
  */

  // logout
  app.get('/logout',
    passwordless.logout(),
    function(req, res) {
      res.redirect('/')
  })

  // show token expired screen if token already used or too old
  app.get('/tokens', function(req, res) {
    res.render('expired', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      },
      user: req.session.passwordless
    })
  })

  // email-updated to log out users who change their email address
  app.get('/email-updated',
    passwordless.logout(), // force logout
    function(req, res) {
      res.render('emailUpdated', {
        partials: {
          head: __dirname+'/views/partials/head.html',
          header: __dirname+'/views/partials/header.html',
          foot: __dirname+'/views/partials/foot.html',
          footer: __dirname+'/views/partials/footer.html'
        }
      })
    })

  /*  
      #######################
            API ROUTES
      #######################
  */

  app.get('/api/v1/browse', function (req, res, next) {
    db.getBlogs({query: {
      approved: true
    }})
    .then( data => {
      if (req.user) {
        data.query = {email: req.user}
        db.getUsers(data)
        .then( response => {
          if (response.users[0] && response.users[0].blogs) {
            for (let blog of data.blogs) {
              let match = response.users[0].blogs.some( x => {
                return blog._id.equals(x)
              })
              if (match) {
                blog.owned = true
              }
            }
          }
          for (let blog of data.blogs) {
            if (response.users[0].blogsForApproval) {
              let match = response.users[0].blogsForApproval.some( x => {
                return blog._id.equals(x)
              })
              if (match) {
                blog.claimed = true
              }
            }
          }
          res.json({
              blogs: data.blogs,
              legacy: settings.legacy_db,
              user: response.users[0]
            })
        })
      } else {
        res.json({
          blogs: data.blogs,
          legacy: settings.legacy_db,
          user: null
        })
      }
    })
  })

  app.get('/api/v1/categories', function (req, res, next) {
    res.json({categories: settings.blog_categories})
  })

  app.get('/api/v1/legacy', function (req, res, next) {
    res.json({legacy: settings.legacy_db})
  })

  // must have logged in user for all other api routes 
  app.all('/api/v1/*', 
  passwordless.restricted(),
  (req, res, next) => {
    next()
  })

  /*  ########
        GET
      ########
  */

  app.get('/api/v1/user/info', function(req, res) {
    db.getUsers({query: {"email" : req.user}})
    .then(
      doc => {
        var data = {}
        if (doc.users.length > 0) {
          data.user = doc.users[0]._id
          data.email = doc.users[0].email
          data.twitter = doc.users[0].twitter || null
          data.mastodon = doc.users[0].mastodon || null
          data.pocket = doc.users[0].pocket || false
          data.admin = doc.users[0].permission === 'admin'
        } else {
          data.email = req.user // send back the user email so they don't have to re-type it
          data.error = {class: 'flash-warning', text: "You don't have an account yet! Click 'edit' to create your user profile."}
        }
        res.json(data)
    })
    .catch( err => {
      debug.log(err)
    })
  })

  app.get('/api/v1/user/blogs', function(req, res) {
    db.getUsers({query: {"email" : req.user}})
    .then( // now get the approved blogs
      doc => {
        if (doc.users.length > 0 && doc.users[0].blogs) {
          doc.query = {"_id": {$in: doc.users[0].blogs}}
        } else {
          doc.query = {"_id": null}
        }
        return doc
      })
    .then(db.getBlogs)
    .then( data => {
      let user = data.users.length > 0 ? data.users[0].idString : null
      res.json({user: user, blogs: data.blogs})
    })
    .catch( err => {
      debug.log(err)
    })
  })

  app.get('/api/v1/user/unapproved-blogs', function(req, res) {
    db.getUsers({query: {"email" : req.user}})
    .then( // now get the unapproved blogs
      doc => {
        if (doc.users.length > 0) {
          doc.query = {
            "_id": {$in: doc.users[0].blogsForApproval},
          }
        } else {
          doc.query = {"_id": null}
        }
        return doc
      })
    .then(db.getBlogs)
    .then( data => {
      res.json(data.blogs)
    })
    .catch( err => {
      debug.log(err)
    })
  })

  /*  #############
        USER POST
      #############
  */

  // UPDATE/user routes

  // NOTE: all routes **MUST** use req.user to identify user to update
  // DO NOT make routes taking logged in user id or current email from req.body

  // update user contact info
  app.post('/api/v1/update/user/info', function(req,res) {
    var args = req.body
    args.user = req.user
    db.checkEmailIsUnique(args)
    .then(updateUserContacts)
    .then(args => {
      if (args.user.email != req.user) {
        res.redirect('/email-updated') // force logout if email has changed
      } else {
        args.msg = {}
        args.msg.class = 'flash-success'
        args.msg.text = 'Your details have been updated'
        res.send(
          {
            msg: args.msg,
            user: args.user, // NOTE: this is *only* the data that was sent! i.e. it's "args"
            error: null
          }
        )
      }
    })
    .catch(err => {
      debug.log('ERROR', err)
      res.send(
        {
          user: null, 
          msg: {
            class: 'flash-error',
            message: err.message
          }
        }
      )
    })
  })

  // register blog
  app.post( '/api/v1/update/user/register-blog', 
  function(req, res, next) {
    feedfinder.getFeed(req.body.url)
    .then( ff => {
      const args = req.body
      args.user = req.user
      args.title = ff.title
      args.feed = ff.feed // add the feed to the form data object
      args.action = "register" // this is used in updateUserBlogs
      args.url = args.url.replace(/\/*$/, "") // get rid of trailing slashes
      // we match on the FEED rather than the URL (below)
      // because if there is a redirect, the URL might not match even though it's the same blog
      args.query = {feed: args.feed}
      return args
    })
    .then(db.getBlogs) // check the blog isn't already registered
    .then(
      args => { 
      if (args.blogs.length < 1) {
        registerBlog(args) // create new blog document
        .then(updateUserBlogs) // add blog _id to user's blogsForApproval array
        .then( args => {
          message = {
            text: `User ${req.user} has registered ${args.url} with ${settings.app_name}.\n\nLog in at ${settings.app_url}/letmein to accept or reject the registration.`,
            to: 'admins',
            subject: `New blog registered for ${settings.app_name}`,
          }
          sendEmail(message) // send email to admins
          res.send({status: 'ok', msg: {class: 'flash-success', text: 'blog registered!'}})
        })
        .catch( e => {
          res.send({status: 'error', msg: {class: 'flash-error', text: `Something went wrong registering your blog: ${e}`} })
        })
      } else {
        res.send({status: 'error', msg: {class: 'flash-error', text: `That blog is already registered`} })
      }
    })
    .catch(err => {
      res.send({status: 'error', msg: {class: 'flash-error', text: `Something went wrong registering your blog: ${err}`} })
    })
  })

  // claim blog
  app.post('/api/v1/update/user/claim-blog', function(req, res, next) {
    const args = req.body
    args.query = { "_id" : ObjectId(args.idString)}
    args.action = "register"
    args.user = req.user
    db.getBlogs(args)
      // then check users for any claiming this blog
      .then( args => {
        if (args.blogs.length < 1) {
          throw new Error("Blog does not exist: check the URL or try registering") // if there are no results the blog doesn't exist
        } else {
          args.blog = args.blogs[0].idString
          args.query = {
            $or: [
              {"blogs" : args.blogs[0]._id},
              {"blogsForApproval" : args.blogs[0]._id} 
            ]
          }
          return args
        }
      })
      .then(db.getUsers)
      .then( args => {
        if (args.users.length < 1) {
          return args
        } else {
          throw new Error(`Another user owns or has claimed ${args.url}`)
        } 
      })
      .then(updateUserBlogs)
      .then( args => {
        message = {
          text: `User ${req.user} has claimed ${args.url} on ${settings.app_name}.\n\nLog in at ${settings.app_url}/letmein to accept or reject the registration.`,
          to: 'admins',
          subject: `New blog claimed on ${settings.app_name}`,
        }
        sendEmail(message) // send email to admins
        res.send({status: 'ok'})
    }).catch( err => {
      res.send({ error: { message: `${err}` } })
    })
  })

  // delete blog
  app.post('/api/v1/update/user/delete-blog', function(req, res, next) {
    const args = req.body
    args.user = req.user // for updateUserBlogs & getUserDetails
    updateUserBlogs(args)
    .then(deleteBlog)
    .then( args => {
      args.query = {"email" : args.user }
      return args
    })
    .then(db.getUsers)
    .then( args => {
      args.query = {"_id": {$in: args.users[0].blogs}}
      return args
    })
    .then(db.getBlogs)
    .then( args => {
      res.send(
        {
          blogs: args.blogs, 
          msg: {
            type: 'success',
            class:'flash-success',
            text: 'Blog deleted'
          }, 
          error: null
        }
      )
    })
    .catch( e => {
      debug.log('**ERROR DELETING BLOG**')
      debug.log(e)
        res.send({
          blogs: null,
          msg: {
            class:'flash-error',
            text: `Error deleting blog: ${e.message}`
          }
        })
    })
  })

  // edit blog category or update title andnd/or feed
  app.post('/api/v1/update/user/edit-blog', 
    (req, res, next) => {
      feedfinder.getFeed(req.body.url)
      .then( ff => {
        const args = req.body // url and category
        args.user = req.user
        args.title = ff.title
        args.feed = ff.feed
        return args
      })
      .then(editBlog)
      .then( () => {
        res.json({
          msg: {class: 'flash-success', text: 'blog updated'}
        })
      })
      .catch(e => {
        debug.log(e)
        res.json({
          error: {class: 'flash-error', text: 'error updating blog'}
        })
      })
    })

  // exclude or include (un-exclude) a blog from pocket
  app.post('/api/v1/update/user/filter-pocket', 
    (req, res, next) => {
      let args = req.body // blog (idString) and exclude (true/false)
      args.user = req.user
      updateUserPocketFilters(args)
      .then( () => {
        res.send({
          result: 'ok'
        })
      })
      .catch(err => {
        debug.log('error updating exclusion list', err)
        res.send({
          error: err.message
        })
      })
    })

  // unsubscribe from Pocket
  app.post('/api/v1/update/user/remove-pocket', 
    (req, res, next) => {
      unsubscribeFromPocket(req.user)
      .then( () => {
        res.send({
            class: 'flash-success',
            text: 'Pocket account unsubscribed. You should also "remove access" for this app at https://getpocket.com/connected_applications'
        })
      })
      .catch(err => {
        debug.log('error removing pocket account', err)
        res.send({
          msg: {
            class: 'flash-error',
            text: err.message
          }
        })
      })
    })

  // protect admin routes
  app.all('/api/v1/admin*',
    function (req, res, next) {
      var args = {}
      args.user = req.user 
      db.getUserDetails(args)
      .then( doc => {
        if (doc.user.permission && doc.user.permission === "admin") {
          next()
        } else {
          req.flash('error', 'You are not allowed to view admin pages because you are not an administrator')
          res.sendStatus(403)
        }
      })
      .catch(err => {
        debug.log(`Error accessing admin page: ${err}`)
        req.flash('error', 'Something went wrong')
        res.sendStatus(500)
      })
    })

    app.all('/api/v1/update/admin*',
    function (req, res, next) {
      var args = {}
      args.user = req.user
      db.getUserDetails(args)
      .then( doc => {
        if (doc.user.permission && doc.user.permission === "admin") {
          next()
        } else {
          req.flash('error', 'You are not allowed to view admin pages because you are not an administrator')
          res.sendStatus(403)
        }
      })
      .catch(err => {
        debug.log(`Error for ${req.user} when attempting to access admin page: ${err}`)
        res.sendStatus(500)
      })
    })

    // req.user for admin routes should be the owner, not the admin user
    // in this case we trust the user input because we have already checked 
    // server side that they are a logged-in admin (see above: app.all('/api/v1/update/admin*')

  /*  #############
        ADMIN GET
      #############
  */

  app.get('/api/v1/admin/blogs-for-approval', function(req, res) {
    let query = {$where: "this.blogsForApproval && this.blogsForApproval.length > 0"}
    db.getUsers({query: query})
    .then( args => {
      // find the claimed blogs from the users
      // mapping the array returns a Promise for each item in the array
      // so we need to return Promise.all() to get a result
      var mapped = args.users.map( user => {
        return db.getBlogs({query: {_id: {$in: user.blogsForApproval}}}).then( res => {
          user.claims = res.blogs
          return user
        })
      })
      return Promise.all(mapped).then(users => {
        let vals = users.map( user => {
          return {
            email: user.email,
            twitter: user.twitter,
            mastodon: user.mastodon,
            claims: user.claims
          }
        })
        res.json(vals)
      })
    })
    .catch(e => {
      debug(e)
      res.json({error: e})
    })
  })

  app.get('/api/v1/admin/failing-blogs', function(req, res) {
    const args = req.body
    args.query = {failing: true}
    db.getBlogs(args)
    .then( args => {
      let data = args.blogs.map( blog => {
        return {
          url: blog.url,
          feed: blog.feed,
          idString: blog.idString
        }
      })
      res.json(data)
    })
    .catch(e => {
      debug(e)
      res.json({error: e})
    })
  })

  app.get('/api/v1/admin/admins', function(req, res) {
    const args = { query: { permission: 'admin' } }
    db.getUsers(args)
    .then( args => {
      // remove this user from admins
      // this prevents the user from accidentally removing themself as an admin
      function removeThisUser(user) {
        return user.email !== req.user
      }
      
      args.users = args.users.filter(removeThisUser)

      const admins = args.users.map( user => {
        return {
          email: user.email // only return the email addresses
        }
      })
      res.json(admins)
    })
    .catch(e => {
      res.json({error: e})
    })
  })

  app.get('/api/v1/admin/suspended-blogs', function(req, res) {
    const args = req.body
    args.query = {suspended: true}
    db.getBlogs(args)
    .then( args => {
      let data = args.blogs.map( blog => {
        return {
          url: blog.url,
          feed: blog.feed,
          idString: blog.idString
        }
      })
      res.json(data)
    })
    .catch(e => {
      debug(e)
      res.json({error: e})
    })
  })

  app.get('/api/v1/admin/reported-blogs', function(req, res) {
    // TODO: for future version - report a dodgy blog to admins
    res.sendStatus(404)
  })

  /*  #############
        ADMIN POST
      #############
  */

  app.post('/api/v1/update/admin/approve-blog', function(req, res, next) {
    const args = req.body 
    // user will be the owner email
    // url is blog url
    // blog is blog _id as a string
    args.action= 'approve'
    args.query = {'email' : args.user} // query for getUsers later
    db.getUsers(args) 
    .then(approveBlog) // set to approved: true
    .then(updateUserBlogs) // move from blogsForApproval to blogs
    .then( args => {
      message = {
        text: `Your blog has been approved on ${settings.app_name}.\n\nTime to get publishing!`,
        to: args.user,
        subject: `Your blog ${args.url} has been approved on ${settings.app_name}`,
      }
      sendEmail(message)
      return args
    })
    .then( args => {
      announcements.queueBlogAnnouncement(args)
      res.send({class: 'flash-success', text: `blog approved`})
    })
    .catch( e => {
      debug.log(`error approving ${req.body.blog}`, e)
      res.send({class: 'flash-error', text: `error approving blog ${req.body.blog}`})
    })
  })

  app.post('/api/v1/update/admin/reject-blog', function(req, res) {
    // reject as admin
    const args = req.body 
    // user is owner's email 
    // blog is blog _id as string
    // reason is the reason provided as a string
    // url is blog url
    args.action = 'reject'
    updateUserBlogs(args)
      .then( args => {
        args.query = {"_id" : ObjectId(args.blog)}
        return args
      })
      .then(db.getBlogs)
      .then( args => {
        if (args.blogs[0] && args.blogs[0].approved) {
          // if approved is true then the blog is a legacy one and this is a 'claim'
          // rather than a new registration, so we do NOT want to delete it!
          return args
        } else { 
          return deleteBlog(args) // delete blog and *then* return args
        }
      })
      .then( args => {
        message = {
          text: `Your blog registration for ${args.url} has been rejected from ${settings.app_name}.\n\nReason:\n\n${args.reason}`,
          to: args.user,
          subject: `Your blog has been rejected on ${settings.app_name}`,
        }
        sendEmail(message)
        res.send({class: 'flash-success', text: `${args.url} rejected`})
      })
      .catch( error => {
        debug.log('error rejecting blog', error)
        res.send({class: 'flash-error', text: `Something went wrong rejecting ${req.body.url}`})
      })
  })

  app.post('/api/v1/update/admin/suspend-blog', function(req, res) {
    // suspend
    const args = req.body // url should be blog url
    // assign suspended to true
    args.suspend = true
    args.query = {url: args.url} // query for getBlogs
    suspendBlog(args)
    .then( args => {
      db.getBlogs(args)
      .then( args => {
        args.query = {blogs: args.blogs[0]._id}
        return args
      })
      .then(db.getUsers)
      .then( args => {
        if (args.users.length > 0) {
          message = {
            text: `Your blog ${args.url} has been suspended from ${settings.app_name}.\n\nReason:\n\n${args.reason}`,
            to: args.users[0].email,
            subject: `Your blog has been suspended from ${settings.app_name}`,
          }
          sendEmail(message)
        }
        // return json regardless
        res.json({class: 'flash-success', text: 'blog suspended'})
      })
    })
    .catch(e => {
      if (e.code === 'ERR_ASSERTION') {
        res.json({class: 'flash-error', text: 'Blog is not in the database'})
      } else {
        res.json({class: 'flash-error', text: 'Error suspending blog'})
      }
    })
  })

  app.post('/api/v1/update/admin/unsuspend-blog', function(req, res) {
    // unsuspend
    const args = req.body // url should be blog url
    args.suspend = false
    args.query = {url: args.url} // query for getBlogs
    suspendBlog(args)
    .then( args => {
      db.getBlogs(args)
      .then( args => {
        args.query = {blogs: args.blogs[0]._id}
        return args
      })
      .then(db.getUsers)
      .then( args => {
        if (args.users.length > 0) {
          message = {
            text: `Your blog ${args.url} is no longer suspended from ${settings.app_name}.\n\nPosts from now on will be included as usual.`,
            to: args.users[0].email,
            subject: `Your blog is no longer suspended from ${settings.app_name}`,
          }
          sendEmail(message)
        }
        // return json regardless
        res.json({class: 'flash-success', text: 'blog unsuspended'})
      })
      .catch(e => {
        debug.log(e)
        res.json({class: 'flash-error', text: 'Error unsuspending blog'})
      })
    })
  })

  app.post('/api/v1/update/admin/delete-blog', function(req, res) {
    // there is no reason for owner email to be displayed
    // so we should find it here
    // args.blog is the idString of the blog
    // args.url is the blog url
    body().exists({checkNull: true}) // make sure there's a value so we don't delete everything
    if (validationResult(req).isEmpty()) {
      const args = req.body
      args.action = "delete"
      args.query = {'blogs' : ObjectId(args.blog)}
      db.getUsers(args) // get the user with this blog in their 'blogs' array
        .then( args => {
          if (args.users[0]) { // if this is a legacy DB there may be no users with this blog listed
            args.user = args.users[0].email // for deleteBlog and sendEmail
            return updateUserBlogs(args) // remove the blog _id from the owner's 'blogs' array
              .then( args => { 
                return args
              })
          } else {
            return args // for legacy DB entry with no blog owner simply skip this step
          }
        })
        .then(deleteBlog) // now we actually delete the document from the blogs collection
        .then( args => { // if there was an owner, send email
          const message = {
            text: `User ${req.user} has deleted ${args.url} from ${settings.app_name}.`,
            to: args.user,
            subject: `Your blog listing has been removed from ${settings.app_name}`,
          }
          sendEmail(message) // send email to admins
          res.send({class: 'flash-success', text: `${args.url} deleted`})
        }).catch(err => {
          debug.log('error deleting blog', err)
          res.send({class: 'flash-error', text: `Error deleting ${args.url}: ${err.message}`})
        })
    } else {
      let valArray = validationResult(req).array()
      debug.log('error deleting blog', valArray)
      res.send({class: 'flash-error', text: `Cannot delete blog without id string`})
    }
  })

  app.post('/api/v1/update/admin/make-admin', function(req, res) {
    const args = req.body // args.user is the email of the user who we want to make an admin
    args.permission = 'admin'
    updateUserPermission(args)
    .then( () => {
      message = {
        text: `${req.user} has made you an administrator on ${settings.app_name}.\n\nLog in at ${settings.app_url}/letmein to use this new power, (but only for good).`,
        to: args.user,
        subject: `You are now an admin on ${settings.app_name}`,
      }
      sendEmail(message) // send email to user
      res.send({class: 'flash-success', text: `${args.user} is now an administrator`})
    })
    .catch( err => {
      res.send({class: 'flash-error', text: `Something went wrong: ${err.message}`})
    })
  })

  app.post('/api/v1/update/admin/remove-admin', function(req,res) {
    const args = req.body // args.user is the email of the user who we want to remove as admin
    args.permission = 'user'
    updateUserPermission(args)
    .then( () => {
      message = {
        text: `${req.user} has removed you as administrator on ${settings.app_name}.`,
        to: args.user,
        subject: `You are no longer an admin on ${settings.app_name}`,
      }
      sendEmail(message) // send email to user
      res.send({class: 'flash-success', text: `${args.user} is no longer an administrator`})
    })
    .catch( err => {
      res.send({class: 'flash-error', text: `Something went wrong: ${err.message}`})
    })
  })

  // 404 errors: this should always be the last route
  app.use(function (req, res, next) {
    res.status(404).render("404")
  })

  if (process.env.NODE_ENV !== "test") {
  // Trigger the app to periodically check RSS feeds and send announcements
  let checkFeedsTime = settings.minutes_between_checking_feeds * 60000; // time between checking feeds
  let announceTime = settings.minutes_between_announcements * 60000; // time between announcements
  let checkAnnouncementsTime =  settings.minutes_between_checking_announcements * 60000; // time between queuing announcements

  const checkFeedsTrigger = setInterval(feeds.checkFeeds, checkFeedsTime);
  const checkAnnouncementsTrigger = setInterval(announcements.checkArticleAnnouncements, checkAnnouncementsTime);
  const announceTrigger = setInterval(announcements.announce, announceTime);
  }

  // listen on server
  app.listen(3000, function() {
    if (env !== 'test') {
      console.log('    *****************************************************************************')
      console.log('     👂  Rockpool is listening on port 3000')
      console.log(`     👟  You are running in ${process.env.NODE_ENV.toUpperCase()} mode`)
      console.log(`     🗃  Connected to database at ${settings.mongo_url}`)
      console.log('    *****************************************************************************')
    }
  })

  // export app for testing
  if (env == 'test') {
    module.exports = app;
  }
})
