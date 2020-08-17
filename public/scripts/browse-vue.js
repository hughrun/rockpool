Vue.component('loader-screen', {
  props: ['processing'],
  template: `
  <div v-if="processing" id="loader">
  <div class="loader-container">
    <div class="loader-text">
      <p>Processing request...</p>
    </div>
  </div>
</div>
  `
})

Vue.component('message-list', {
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <div v-for="msg in messages" class="blog-list">
  <li v-bind:class="msg.class">
    <span class="message-text">{{ msg.text }}</span>
    <span class="flash-close" v-on:click="removeMessage(msg)">
    X
    </span>
  </li>
  </div>
</div>
  `,
  data() {
    return {}
  },
  methods: {
    removeMessage(msg) {
      this.$emit('remove-message', msg)
    }
  },
  mounted () {
    // check messages in the database?
    // e.g. blog approved or rejected, blog failing, error with Pocket account, new feature?
  }
})

Vue.component('blog-actions', {
  props: ['blog', 'user', 'legacy', 'messages'],
  data() {
    return {
      active: false
    }
  },
  methods: {
    loading(bool) {
      this.$emit('loading', bool)
    },
    excludeFromPocket(blog) {
      this.loading(true)
      axios
      .post('/api/v1/update/user/filter-pocket', {blog: blog.idString, exclude: true})
      .then( response => {
        if (response.data.result == 'ok') {
          Vue.set(blog, 'excluded', true)
          this.$emit('add-message', {class: 'flash-success', text: `${blog.url} now excluded from your Pocket feed`})
        } else {
          this.$emit('add-message', {class: 'flash-error', text: response.data.error})
        }
        this.blog = blog
        this.active = false
        this.loading(false)
      })
      .catch(err => {
        this.$emit('add-message', {class: 'flash-error', text: err.message})
        this.loading(false)
      })
    },
    includeInPocket(blog) {
      this.loading(true)
      axios
      .post('/api/v1/update/user/filter-pocket', {blog: blog.idString, exclude: false})
      .then( response => {
        if (response.data.result == 'ok') {
          Vue.set(blog, 'excluded', false)
          this.$emit('add-message', {class: 'flash-success', text: `${blog.url} now included in your Pocket feed`})
        } else {
          this.$emit('add-message', {class: 'flash-error', text: response.data.error})
        }
        this.blog = blog
        this.active = false
        this.loading(false)
      })
      .catch(err => {
        this.$emit('add-message', {class: 'flash-error', text: err.message})
        this.loading(false)
      })
    },
    claimBlog(blog) {
      this.loading(true)
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
        this.loading(false)
      })
      .catch(err => {
        this.$emit('add-message', {class: 'flash-error', text: err.message})
        this.loading(false)
      })
    }
  },
  template: `
  <div class="browse-actions">
  <div v-if="!user.pocket && blog.owned"></div>
  <button v-else-if="!active" class="browse-button actions-button" v-on:click="active = true">Actions</button>
  <button v-else="active" class="browse-button actions-button cancel-button" v-on:click="active = false">Cancel</button>
  <div v-if="active" key="blog.idString">
    <button v-if="legacy && !blog.owned &&!blog.claimed" v-on:click="claimBlog(blog)" class="browse-button claim-button action">
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
})

Vue.component('blog-listing', {
  props: ['blog', 'categories', 'selection'],
  computed: {
    blogClass () {
      return 'class-' + this.categories.indexOf(this.blog.category)
    }
  },
  methods: {
    loading(bool) {
      this.$emit('loading', bool)
    },
    filterCat(event) {
      this.$emit('filter', event.target.textContent)
    },
    clearFilter() {
      this.$emit('clear-filter', event.target.textContent)
    }
  },
  template: `<div>
  <span v-if="this.blog.title" class="blog-listing-url"><a v-bind:href="this.blog.url">{{ blog.title }}</a></span>
  <span v-else class="blog-listing-url"><a v-bind:href="this.blog.url">{{ blog.url }}</a></span>
  <span v-if="this.blog.owned" class="approved-blog"></span>
  <span v-if="this.blog.claimed" class="unapproved-blog"></span>
  <span v-bind:class="blogClass" @click="filterCat($event)">{{ this.blog.category }}</span>
  <span v-if="this.blog.failing" class="failing-icon">failing</span>
  <span v-if="this.blog.suspended" class="suspended-icon">suspended</span>
  <span v-if="this.blog.excluded" class="excluded-icon">excluded</span>
  </div>
  `
})

Vue.component('browse-list', {
  props: ['categories'],
  data () {
    return {
      actionsAvailable: false,
      blogs: [],
      legacy: false,
      messages: [],
      selected: [],
      selection: null,
      user: null
    }
  },
  mounted () {
    axios
    .get('/api/v1/browse')
    .then( res => {
      for (let blog of res.data.blogs) {
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
      this.selected = res.data.blogs
      this.user = res.data.user
      this.actionsAvailable = this.user && (this.legacy || this.user.pocket)
    })
    .catch(err => {
      console.error(err)
    })
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    },
    loading(bool) {
      this.$emit('loading', bool)
    },
    removeMessage(msg) {
      // fired when click on X to get rid of it
      Vue.delete(this.messages, this.messages.indexOf(msg))
    },
    filterCat(category) {
      this.selection = category
      this.selected = this.blogs.filter( blog => blog.category === category)
    },
    clearFilter() {
      this.selection = null
      this.selected = this.blogs
    }
  },
  template: `
    <section id="browse-page">
      <message-list v-bind:messages="messages" @remove-message="removeMessage"></message-list>
      <span  v-if="selection">
        <h2>Browse {{ selection }}</h2> 
        <button id="clear-selection-button" @click="clearFilter()">Show all categories</button>
      </span>
      <h2 v-else>Browse all blogs</h2>
      <div v-if="selected.length">
        <ul v-for="blog in selected" class="browse-blogs">
          <li v-bind:class="{failing:blog.failing, suspended:blog.suspended, excluded:blog.excluded}">
            <blog-listing 
              v-bind:blog="blog"
              v-bind:categories="categories"
              v-bind:selection="selection"
              @filter="filterCat"
              @clear-filter="clearFilter"
              @loading="loading"
            ></blog-listing>
            <blog-actions 
              v-if="actionsAvailable"
              @add-message="addMessage"
              @loading="loading"
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
      categories: [],
      processing: false
    }
  },
  mounted () {
    axios
    .get('/api/v1/categories')
    .then( res => {
      this.categories = res.data.categories
    })
    .catch(err => {
      console.error(err)
    })
  },
  methods: {
    loading(bool) {
      this.processing = bool
    }
  }
})