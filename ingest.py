import feedparser
from datetime import datetime 
import time
import pytz

# internal modules
import settings
import rockpool_mongo as r_mongo
import rockpool_toot as r_toot
# import rockpool_tweet as r_tweet
# import rockpool_pocket as r_pocket

utc = pytz.utc

# this will actually be a call to the database for the 'publications' collection (formerly 'blogs')
feeds = ['https://www.hughrundle.net/rss/', 'https://newcardigan.org/rss']

# this will be a call to see if the article is already listed. In the Meteor version it's this:
# var recorded = Articles.findOne({link: item.link});
# here is should be something like:
# recorded = articles.findOne({guid: e.id});
recorded = False

# needs to be on a timer, also set from settings.py
print('*********')

for url in feeds:
  publication = feedparser.parse(url)
  for e in publication.entries:

    then = datetime(*e.published_parsed[:6]) # makes a datetime from a tuple
    now = datetime.now(tz=utc) # utc stamped time now
    pubdate = pytz.utc.localize(then) # utc stamped publication datetime
    old = (now - pubdate).days > settings.max_days_age_of_articles_to_announce

    if not recorded and not old :
      link = publication.feed.link
      article = r_mongo.upsert(e, pubdate)
      if settings.use_twitter:
        print('TWEETING')
        author = e.author if hasattr(e, 'author') else publication.feed.author
        # r_tweet.newpost(article, author)
      if settings.use_mastodon:
        author = e.author if hasattr(e, 'author') else publication.feed.author
        print('TOOTING')
        r_toot.newpost(article, author)
      # r_pocket.send(article)