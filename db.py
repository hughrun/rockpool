# Database calls
import json
import settings

def upsert(e, normalised, author, pubdate, post_id, pub_id):
  categories = [tag.term for tag in e.tags] if hasattr(e, 'tags') else []
  # all references to 'blog' (in CommunityTweets) should be changed to 'publication' to make this app more universal
  # guid replaces blogLink but depending on what the feed provides could be a UUID string rather than a URL
  # publication_url replaces blogLink
  # publication_id is new and is the _id from the publications (blogs) collection
  # we can push the publication_id through in pool.upsert() because we'll have it from the original call to the DB that starts the loop
  # 'blog' (title) is no longer used because it can be taken from the publications collection using publication_id
  post_info = {'guid': post_id, 'title': e.title, 'author': author, 'categories': categories, 'categories_normalised': normalised, 'url': e.link, 'publication_id': pub_id, 'date': pubdate}
  # TODO: here we will actually upsert it to Mongo, but this simulates it for now
  return post_info