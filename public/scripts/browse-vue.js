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

Vue.component('browse-list', {
  data () {
    return {
      messages: [],
      blogs: [],
      categories: blogCategories
    }
  },
  mounted () {
    axios
    .get('/api/v1/browse')
    .then( res => {
      for (let blog of res.data) {
        blog.class = 'class-' + blogCategories.indexOf(blog.category)
      }
      this.blogs = res.data
    })
  },
  methods: {
    claimBlog(blog) {},
    togglePocket(blog) {}
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
              <span v-bind:class="blog.class">{{ blog.category }}</span>
              <span v-if="blog.failing" class="failing-icon">failing</span>
              <span v-if="blog.suspended" class="suspended-icon">supended</span>
            </div>
            <button class="browse-button claim">claim</button>
            <button class="browse-button exclude">exclude</button>
          </li>
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