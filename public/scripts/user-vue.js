Vue.component('message-list', {
  // el: '#user-messages',
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <ul v-for="msg in messages" class="blog-list">
    <li v-bind:class="msg.class">{{ msg.text }}</li>
  </ul>
</div>
  `,
  data() {
    return {
      messages: this.messages
    }
  },
  methods: {
    removeMessage(msg) {
      // TODO:
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
      user: {
        email: null,
        twitter: null,
        mastodon: null,
        pocket: false,
        admin: false
      },
      editing: false,
      messages: []
    }
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    },
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
          this.addMessage(res.data.error)
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
        this.addMessage(res.data)
        this.user.pocket = false
      })
    }
  },
  mounted () {
    axios
    .get('/api/v1/user/info')
    .then(response => {
      this.user = response.data
      if (response.data.error) {
        this.addMessage(response.data.error) // if the user is not registered yet
      }
    })
    .catch( err => this.user = 'error')
  }
})

var userBlogs =  new Vue({
  el: '#user-approved-blogs',
  data () {
    return {
      userIdString: null,
      blogs : [],
      editing: false,
      messages: []
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
      if (response.data.blogs.length == 0) {
        this.messages.push({class: 'flash-warning', text: 'You have no registered/approved blogs yet'})
      }
    })
    .catch( err => this.blogs = 'error')
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    },
    deleteBlog(blog) {
      var payload = {
        blog: event.target.id,
        action: 'delete'
      }
      axios.post('api/v1/update/user/delete-blog', payload)
      .then( response => {
        var msg = response.data.msg || response.data.error
        this.addMessage(msg)
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

Vue.component('register-or-claim-blogs', {
  props: ['url', 'category'],
  data () {
    return {
      categories: blogCategories,
      legacy: legacy
    }
  },
  template: `
  <form id="registerBlog">
    <label for="url">URL:</label>
    <input v-model="url" type="url" name="url" size="60"><br/>
    <label for="category">Category:</label>
    <select v-model="category" name="category">
    <option v-for="cat in categories" v-bind:value="cat">{{ cat }}</option>
    </select>
    <button v-on:click.prevent="validateBlog('register')">Register blog</button>
    <button v-if="legacy" v-on:click.prevent="validateBlog('claim')">Claim blog</button>
  </form>
  `,
    methods: {
      validateBlog(action) {
        this.$emit('validate-url', 
        {
          url: this.url, 
          category: this.category, 
          action: action
        })
      }
    }
  })

var userUnapprovedBlogs =  new Vue({
  el: '#user-unapproved-blogs',
  data () {
    return {
      uBlogs : [],
      category: null,
      url: null,
      messages: []
    }
  },
  mounted () {
    axios
    .get('/api/v1/user/unapproved-blogs')
    .then(response => {
      this.uBlogs = response.data
    })
    .catch( err => messages.push({class: 'flash-error', text: err}))
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    },
    validate(args) {
      if (!this.validateUrl(args.url)) { 
        msg = {
          class: 'flash-error',
          text: 'please enter a valid url in the form http://example.com'
        }
        this.addMessage(msg)
      } else if (!args.category) {
        msg = {
          class: 'flash-error',
          text: 'you must select a category for your blog'
        }
        this.addMessage(msg)
      } else {
        if (args.action === 'register') {
          this.registerBlog(args.url, args.category)
        } else if (args.action === 'claim') {
          this.claimBlog(args.url, args.category)
        } else {
          console.error('no action specified')
        }
      }
    },
    validateUrl(input) {
      var regex = /http(s)?:\/\/([a-z0-9-_~:\/?#[\]@!$&'()*+,;=]*)(\.([a-z0-9-_~:\/?#[\]@!$&'()*+,;=]+)+)+/i
      return regex.test(input)
    },
    registerBlog(url, category) {
      axios
      .post('/api/v1/update/user/register-blog', {
        url: url, 
        category: category
      })
      .then( response => {
        var msg = response.data.msg
        this.addMessage(msg)
       // if we get an ok status, we just update the list, 
       // rather than sending the full data back and forth
        if (response.data.status === 'ok') {
          Vue.set(this.uBlogs, this.uBlogs.length, {url: url, approved: false}) // add to the end of the blogs list
        }
        this.url = null
        this.category = null
      })
      .catch(err => {
        this.addMessage({class: 'flash-error', text: err.message})
      })
    },
    claimBlog(url, category) {
      axios
      .post('/api/v1/update/user/claim-blog', {
        url: url,
        category: category
      })
      .then( response => {
        this.addMessage(response.data)
        if (response.data.class === 'flash-success') {
          Vue.set(this.uBlogs, this.uBlogs.length, {url: url, approved: false}) // add to the end of the blogs list
        }
        this.url = null
        this.category = null
      })
      .catch(err => {
        this.addMessage({class: 'flash-error', text: err.message})
      })
    }
  }
})