const messages = []
var uBlogs = []

var userMessages =  new Vue({
  el: '#user-messages',
  data() {
    return {
      messages: messages
    }
  },
  methods: {
    removeMessage(msg) {
      // fired when click on X to get rid of it
      // reloading the page will also remove any messages that aren't in the DB
    }
  },
  mounted () {
    // check messages in the database?
    // e.g. blog approved or rejected, blog failing, error with Pocket account, new feature?
  }
})

var userInfo =  new Vue({
  el: '#user-info',
  data() {
    return {
      user : {
        email: null,
        twitter: null,
        mastodon: null,
        pocket: false,
        admin: false
      },
      editing : false
    }
  },
  methods: {
    updateUser(event) {
      var params = {
        email : event.target.parentNode.email.value,
        twitter : event.target.parentNode.twitter.value,
        mastodon : event.target.parentNode.mastodon.value
      }
      axios.post('/api/v1/update/user/info', params)
      .then( response => {
        this.editing = false

        if (response.data.user) {
          this.user = response.data.user
        } else if (response.data.error) {
          this.messages.push(response.data.error)
        }
      })
      .catch( err => {
        // server errors should be caught in response.data.error
        // anything else is probably a 404
        console.log(err)
      })
    },
    cancelPocket() {
      axios.post('/api/v1/update/user/remove-pocket')
      .then( res => {
        messages.push(res.data.msg)
        this.user.pocket = false
      })
    }
  },
  mounted () {
    axios
    .get('/api/v1/user/info')
    .then(response => (this.user = response.data))
    .catch( err => this.user = 'error')
  }
})

var userBlogs =  new Vue({
  el: '#user-approved-blogs',
  data () {
    return {
      userIdString: null,
      blogs : [],
      editing: false
    }
  },
  mounted () {
    axios
    .get('/api/v1/user/blogs')
    .then(response => {
      this.userIdString = response.data.user
      this.blogs = response.data.blogs
      this.blogs.forEach( blog => {
        blog.editing = false
      })
    })
    .catch( err => this.blogs = 'error')
  },
  methods: {
    deleteBlog(blog) {
      var payload = {
        blog: event.target.id,
        action: 'delete'
      }
      axios.post('api/v1/update/user/delete-blog', payload)
      .then( response => {
        var msg = response.data.msg || response.data.error
        // this.editing = false
        messages.push(msg)
        blog.editing = false
        if (response.data.blogs) { // TODO: see addBlog below for a better way to do this
          this.blogs = response.data.blogs
          Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
        }
      })
    },
    checking(blog) {
      blog.editing = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
    }
  }
})

var userUnapprovedBlogs =  new Vue({
  el: '#user-unapproved-blogs',
  data () {
    return {
      uBlogs : uBlogs
    }
  },
  mounted () {
    axios
    .get('/api/v1/user/unapproved-blogs')
    .then(response => (this.uBlogs = response.data))
    .catch( err => this.uBlogs = 'error') // TODO: fix this
  }
})

var registerOrClaimBlogs =  new Vue({
  el: '#registerBlog',
  data() {
    return {
     url: null,
     category: null 
    }
  },
  methods: {
    validate(action) {
      if (!this.validateUrl(this.url)) {
        msg = {
          class: 'flash-error',
          text: 'please enter a valid url in the form http://example.com'
        }
        messages.push(msg)
      } else if (!this.category) {
        msg = {
          class: 'flash-error',
          text: 'you must select a category for your blog'
        }
        messages.push(msg)
      } else {
        if (action === 'register') {
          this.registerBlog(this.url, this.category)
        } else if (action === 'claim') {
          this.claimBlog(this.url, this.category)
        } else {
          console.error('no action specified')
        }
      }
    },
    registerBlog(url, category) {
      axios
      .post('/api/v1/update/user/register-blog', {url: url, category: category})
      .then( response => {
        var msg = response.data.msg || response.data.error // TODO: check error handling!
        messages.push(msg)
       // if we get an ok status, we just update the list, rather than sending the full data to the browser
        if (response.data.status === 'ok') {
          let index = uBlogs.length
          Vue.set(uBlogs, index, {url: url, approved: false}) // add to the end of the blogs list
        }
        // clear the form
        this.url = null
        this.category = null
      })

    },
    claimBlog(url, category) {
      console.log('claiming', url, category)
      //TODO: !
    },
    validateUrl(input) {
      var regex = /http(s)?:\/\/([a-z0-9-_~:\/?#[\]@!$&'()*+,;=]*)(\.([a-z0-9-_~:\/?#[\]@!$&'()*+,;=]+)+)+/i
      return regex.test(input)
    }
  }
})