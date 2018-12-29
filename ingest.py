from datetime import datetime 
import feedparser
from pymongo import MongoClient
import pytz
import time

# internal modules
import settings
import db
import toot
import tweet
# import pocket

# connect to database
client = MongoClient(settings.mongo_uri)
mongo = client[settings.mongo_db_name]

# get all the publications in the DB
# TODO: after DB migration this should be mongo.publications.find({})
publications = mongo.blogs.find({})

# TODO: needs to be on a timer, also set from settings.py
print('*********')

for publication in publications:
  feed = feedparser.parse(publication['feed'])
  for e in feed.entries:
    # get publication date - if too old it will be added to the DB but not announced
    if hasattr(e, 'published_parsed'):
      then = datetime(*e.published_parsed[:6]) # makes a datetime from a tuple
      now = datetime.now(tz=pytz.utc) # utc stamped time now
      pubdate = pytz.utc.localize(then) # utc stamped publication datetime
      old = (now - pubdate).days > settings.max_days_age_of_articles_to_announce

      post_id = e.id if hasattr(e, 'id') else e.link

      # check whether the article is already listed.
      # recorded = mongo.articles.find_one({'guid': post_id}) # TODO: it should be this once DB is migrated
      # recorded = mongo.articles.find_one({'link': e.link})
      recorded = False # for testing
      if not recorded:
        # normalise tags
        tags = [tag.term for tag in e.tags] if hasattr(e, 'tags') else []
        categories_normalised = []
        for tag in tags:
          # strip out everything that isn't alphanumeric and lowercase it
          normalised = ''.join(char for char in tag if char.isalnum()).lower()
          categories_normalised.append(normalised)
        # is there a filter tag? if so, skip this article
        filtered = set(settings.filtered_tags).issubset(categories_normalised)
        if not filtered:
          link = feed['feed']['link']
          author = e.author if hasattr(e, 'author') else publication['author'] if 'author' in publication else None
          article = db.upsert(e, categories_normalised, author, pubdate, post_id)
          if not old:
            if settings.use_twitter:
              # TODO: twHandle will become 'twitter' after migration
              tw_author = publication['twHandle'] if 'twHandle' in publication else e.author if hasattr(e, 'author') else publication['author'] if 'author' in publication else None
              # what we actually need to do here is queue the tweet, not send it
              tweet.newpost(article, tw_author)
            if settings.use_mastodon:
              mast_author = publication['twHandle'] if 'twHandle' in publication else e.author if hasattr(e, 'author') else publication['author'] if 'author' in publication else None
              # what we actually need to do here is queue the toot, not send it
              toot.newpost(article, mast_author)
            # pocket.send(article)
    else:
      # if there's no publication date, it's probably a page that accidentally got added to the RSS feed.
      pass