from datetime import datetime, timedelta
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
      recorded = mongo.articles.find_one({'link': e.link})
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
          pub_id = publication['_id']
          try:
            article = db.upsert(e, categories_normalised, author, pubdate, post_id, pub_id)
            # send article to pocket accounts
            # pocket.send(article)
          except:
            # TODO: how do we 'catch' errors or exceptions in Python?
            print('there was an error')
      # now that new posts are recorded, we can check for anything that might need to be announced
      # however this means that new articles will not be queued until the second loop
      # after publication (the first one simply adds it to the DB)
      # this could be done differently but would be messier and require a second call to the DB
      elif not old:
        # remember we already checked if it was listed, so we can use that.
        # if it has already been tweeted, we only care about it if it's been tweeted fewer than 3 times
        if settings.use_twitter:
          # here we check how many times and when last the article has been tweeted and queue a tweet if necessary            
          tweets_completed = 'tweeted' in recorded and not recorded['tweeted']['times'] < settings.announce_this_many_times_on_twitter
          hours = settings.hours_between_announcing_same_article_on_twitter
          due_date = pytz.utc.localize(recorded['tweeted']['date']) + timedelta(hours=hours)         
          if due_date > now and not tweets_completed:
            # TODO: twHandle will become 'twitter' instead of 'twHandle' after migration
            tw_author = publication['twHandle'] if 'twHandle' in publication else e.author if hasattr(e, 'author') else publication['author'] if 'author' in publication else None
            # TODO: what we actually need to do here is queue the tweet, not send it
            tweet.queue(recorded, tw_author)
        # here we should check how many times and when last the article has been tooted
        # and queue a toot if necessary          
        if settings.use_mastodon:
          # here we check how many times and when last the article has been tooted and queue a toot if necessary
          # TODO: change 'tweeted' below to 'tooted' after DB migrated- this is for testing with legacy DB            
          toots_completed = 'tweeted' in recorded and not recorded['tweeted']['times'] < settings.announce_this_many_times_on_mastodon
          hours = settings.hours_between_announcing_same_article_on_mastodon
          due_date = pytz.utc.localize(recorded['tweeted']['date']) + timedelta(hours=hours)         
          if due_date > now and not toots_completed:       
            mast_author = publication['mastodon'] if 'mastodon' in publication else e.author if hasattr(e, 'author') else publication['author'] if 'author' in publication else None
            # TODO: what we actually need to do here is queue the toot, not send it
            toot.queue(recorded, mast_author)
        if settings.use_pocket:
          pass
          # pocket.send(article)
    else:
      # if there's no publication date, it's probably a page that accidentally got added to the RSS feed.
      pass