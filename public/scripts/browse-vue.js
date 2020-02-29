Vue.component('message-list', {
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <div v-for="msg in messages" class="blog-list">
    <div v-bind:class="msg.class">{{ msg.text }}</div>
  </div>
</div>
  `,
  data() {
    return {
      messages: this.messages
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

Vue.component('blog-actions', {
  props: ['active', 'blog', 'user', 'legacy', 'messages'],
  template: `
  <div class="browse-actions">
  <button v-if="!active" class="browse-button actions-button" v-on:click="active = true">Actions</button>
  <button v-if="active" class="browse-button actions-button cancel-button" v-on:click="active = false">Cancel</button>
  <div v-if="active" key="blog.idString">
    <button v-if="legacy" v-on:click="claimBlog(blog)" class="browse-button claim-button action">
      Claim ownership of this blog
    </button>
    <button v-if="user && user.pocket && blog.excluded" v-on:click="includeInPocket(blog)" class="browse-button action excluded">
      Include this blog in Pocket
    </button>
    <button v-else-if="user && user.pocket" v-on:click="excludeFromPocket(blog)" class="browse-button action">
      Exclude this blog from Pocket
    </button>
  </div>
</div>
  `,
  data() {
    return {
      active: this.active
    }
  },
  methods: {
    excludeFromPocket(blog) {
      axios
      .post('/api/v1/update/user/filter-pocket', {blog: blog.idString, exclude: true})
      .then( response => {
        if (response.data.result == 'ok') { // hand on what are we getting back?
          Vue.set(blog, 'excluded', true)
          this.$emit('add-message', {class: 'flash-success', text: `${blog.url} now included excluded from Pocket feed`})
        } else {
          this.$emit('add-message', {class: 'flash-error', text: response.data.error})
        }
        this.blog = blog
        this.active = false
      })
      .catch(err => {
        this.$emit('add-message', {class: 'flash-error', text: err.message})
      })
    },
    includeInPocket(blog) {
      axios
      .post('/api/v1/update/user/filter-pocket', {blog: blog.idString, exclude: false})
      .then( response => {
        if (response.data.result == 'ok') {
          Vue.set(blog, 'excluded', false)
          this.$emit('add-message', {class: 'flash-success', text: `${blog.url} now included in Pocket feed`})
        } else {
          this.$emit('add-message', {class: 'flash-error', text: response.data.error})
        }
        this.blog = blog
        this.active = false
      })
      .catch(err => {
        this.$emit('add-message', {class: 'flash-error', text: err.message})
      })
    },
    claimBlog(blog) {
      axios
      .post('/api/v1/update/user/claim-blog', blog)
      .then( response => {
        if (response.data.status == 'ok') {
          Vue.set(blog, 'claimed', true)
        } else {
          this.$emit('add-message', {class: 'flash-error', text: response.data.error.message})
        }
        this.blog = blog
        this.active = false
      })
      .catch(err => {
        this.$emit('add-message', {class: 'flash-error', text: err.message})
      })
    }
  }
})

Vue.component('browse-list', {
  props: ['categories'],
  data () {
    return {
      messages: [],
      blogs: [],
      categories: this.categories,
      user: null,
      active: false,
      legacy: false,
      actionsAvailable: false
      
    }
  },
  mounted () {
    axios
    .get('/api/v1/browse')
    .then( res => {
      for (let blog of res.data.blogs) {
        blog.class = 'class-' + this.categories.indexOf(blog.category)
        if (res.data.user && res.data.user.pocket && res.data.user.pocket.excluded) {
          for (let excluded of res.data.user.pocket.excluded) {
            if (blog.idString === excluded) {
              blog.excluded = true
            }
          }
        }
      }
      this.blogs = res.data.blogs
      this.legacy = res.data.legacy
      this.user = res.data.user
      this.actionsAvailable = this.user && (this.legacy || this.user.pocket)
    })
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    }
  },
  template: `
    <section>
      <message-list v-bind:messages="messages"></message-list>
      <h2>Browse all blogs</h2>
      <div v-if="blogs.length">
        <ul v-for="blog in blogs" class="browse-blogs">
          <li v-bind:class="{failing:blog.failing, suspended:blog.suspended, excluded:blog.excluded}">
            <div>
              <span v-if="blog.title"><a v-bind:href="blog.url">{{ blog.title }}</a></span>
              <span v-else><a v-bind:href="blog.url">{{ blog.url }}</a></span>
              <span v-if="blog.owned" class="approved-blog"></span>
              <span v-if="blog.claimed" class="unapproved-blog"></span>
              <span v-bind:class="blog.class">{{ blog.category }}</span>
              <span v-if="blog.failing" class="failing-icon">failing</span>
              <span v-if="blog.suspended" class="suspended-icon">supended</span>
              <span v-if="blog.excluded" class="excluded-icon">excluded</span>
            </div>
            <blog-actions 
              v-if="actionsAvailable"
              @add-message="addMessage"
              v-bind:active="active" 
              v-bind:blog="blog"
              v-bind:legacy="legacy"
              v-bind:user="user">
            </blog-actions>
          </li>
          <hr />
        </ul>
      </div>
      <div v-else>
        <p>There are no blogs in the database.</p> 
      </div>
    </section>
    `
})

new Vue({
  el: '#main',
  data () {
    return {
      categories: null
    }
  },
  mounted () {
    axios
    .get('/api/v1/categories')
    .then( res => {
      this.categories = res.data.categories
    })
  }
})