import feedparser
from datetime import datetime 
import time
import pytz

# internal modules
import settings
import db
import toot
import tweet
# import pocket

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
    # get publication date - if too old it will be added to the DB but not announced
    then = datetime(*e.published_parsed[:6]) # makes a datetime from a tuple
    now = datetime.now(tz=utc) # utc stamped time now
    pubdate = pytz.utc.localize(then) # utc stamped publication datetime
    old = (now - pubdate).days > settings.max_days_age_of_articles_to_announce
    if not recorded:
      # normalise tags
      tags = [tag.term for tag in e.tags]
      categories_normalised = []
      for tag in tags:
        # strip out everything that isn't alphanumeric and lowercase it
        normalised = ''.join(char for char in tag if char.isalnum()).lower()
        categories_normalised.append(normalised)
      # is there a filter tag? if so, skip this article
      filtered = set(settings.filtered_tags).issubset(categories_normalised)
      if not filtered:
        link = publication.feed.link
        article = db.upsert(e, categories_normalised, pubdate)
        if not old:
          if settings.use_twitter:
            print('TWEETING')
            author = e.author if hasattr(e, 'author') else publication.feed.author
            tweet.newpost(article, author)
          if settings.use_mastodon:
            author = e.author if hasattr(e, 'author') else publication.feed.author
            print('TOOTING')
            toot.newpost(article, author)
          # r_pocket.send(article)