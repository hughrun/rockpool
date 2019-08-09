const messages = [
  {type: 'news', class: 'flash-warning', text: 'hello this is a message'}
]

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
        mastodon: null
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
        // TODO: do something sensible with the error - can we load a message?
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
      blogs : null,
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
        this.editing = false
        messages.push(msg)
        blog.editing = false
        if (response.data.blogs) {
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
      uBlogs : null,
    }
  },
  mounted () {
    axios
      .get('/api/v1/user/unapproved-blogs')
      .then(response => (this.uBlogs = response.data))
      .catch( err => this.ublogs = 'error')
  }
})