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
  props: ['active', 'blog', 'user', 'legacy'],
  template: `
  <div class="browse-actions">
  <button v-if="!active" class="browse-button actions-button" v-on:click="active = true">Actions</button>
  <button v-if="active" class="browse-button actions-button" v-on:click="active = false">Cancel</button>
  <div v-if="active" key="blog.idString">
    <button v-if="legacy" v-on:click="claimBlog(blog)" class="browse-button claim-button action">
      Claim ownership of this blog
    </button>
    <button v-if="user && user.pocket" v-on:click="excludeFromPocket(blog)" class="browse-button pocket-button action">
      Exclude this blog from Pocket
    </button>
    {{user.pocket.excluded}}
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
      // blog is blog IdString
      axios
      .post('/api/v1/update/user/filter-pocket', {blog: blog, exclude: true})
      .then( response => {
        if (response.data.status == 'ok') {
          Vue.set(blog, 'excluded', true)
        } else {
          // TODO: do something on failure
          // a flash message?
        }
        this.blog = blog
        this.active = false
      })
      .catch(err => {
        console.log(err)
        this.addMessage({class: 'flash-error', text: err.message})
      })
    },
    includeInPocket(blog) {
      axios
      .post('/api/v1/update/user/filter-pocket', {blog: blog, exclude: false})
      .then( response => {
        if (response.data.status == 'ok') {
          Vue.set(blog, 'excluded', false)
        } else {
          // TODO: do something on failure
          // a flash message?
        }
        this.blog = blog
        this.active = false
      })
      .catch(err => {
        console.log(err)
        this.addMessage({class: 'flash-error', text: err.message})
      })
    },
    claimBlog(blog) {
      axios
      .post('/api/v1/update/user/claim-blog', blog)
      .then( response => {
        if (response.data.status == 'ok') {
          Vue.set(blog, 'claimed', true)
        } else {
          // TODO: do something on failure
          // a flash message?
        }
        this.blog = blog
        this.active = false
      })
      .catch(err => {
        console.log(err)
        this.addMessage({class: 'flash-error', text: err.message})
      })
    }
  }
})

Vue.component('browse-list', {
  data () {
    return {
      messages: [],
      blogs: [],
      user: null,
      categories: blogCategories,
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
        blog.class = 'class-' + blogCategories.indexOf(blog.category)
      }
      this.blogs = res.data.blogs
      this.legacy = res.data.legacy
      this.user = res.data.user
      this.actionsAvailable = this.user && (this.legacy || this.user.pocket)
    })
  },
  template: `
    <section>
      <message-list v-bind:messages="messages"></message-list>
      <h2>Browse all blogs</h2>
      <div v-if="blogs.length">
        <ul v-for="blog in blogs" class="browse-blogs">
          <li v-bind:class="{failing:blog.failing, suspended:blog.suspended}">
            <div>
              <span v-if="blog.title"><a v-bind:href="blog.url">{{ blog.title }}</a></span>
              <span v-else><a v-bind:href="blog.url">{{ blog.url }}</a></span>
              <span v-if="blog.owned" class="approved-blog"></span>
              <span v-if="blog.claimed" class="unapproved-blog"></span>
              <span v-bind:class="blog.class">{{ blog.category }}</span>
              <span v-if="blog.failing" class="failing-icon">failing</span>
              <span v-if="blog.suspended" class="suspended-icon">supended</span>
            </div>
            <blog-actions 
              v-if="actionsAvailable" 
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
    return {}
  }
})