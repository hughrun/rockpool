# Database calls
import json
import settings

def upsert(e, normalised, date):
  categories = [tag.term for tag in e.tags]
  # all references to 'blog' (in CommunityTweets) should be changed to 'publication' to make this app more universal
  # guid replaces blogLink but in future could be a random UUID rather than a link
  # publication_url replaces blogLink
  # TODO: publication_id is new and will be a UUID (the _id from the publications (blogs) collection)
  # we can push the publication_id through in pool.upsert() because we'll have it from the original call to the DB that starts the loop
  # 'blog' (title) is no longer used because it can be taken from the publications collection using publication_id
  post_info = {'guid': e.id, 'title': e.title, 'author': e.author, 'categories': categories, 'categories_normalised': normalised, 'url': e.link, 'publication_id': None, 'date': date}
  return post_info