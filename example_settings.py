"""
This file holds all of the configuration information needed to set up a particular instance of Rockpool.
Some parameters have sensible defaults, for others this is not possible.
Make sure you review all settings here before starting.
"""
# MongoDB details
mongo_host = 'localhost'
mongo_port = 27017
mongo_db_name = 'rockpool'

# Twitter
use_twitter = False
twitter_consumer_key = None
twitter_consumer_secret = None
twitter_access_token = None
twitter_access_token_secret = None

hours_between_announcing_same_article_on_twitter = 10
announce_this_many_times_on_twitter = 3

# Mastodon
use_mastodon = True
mastodon_base_url = None
mastodon_access_token = None

hours_between_announcing_same_article_on_mastodon = 18
announce_this_many_times_on_mastodon = 2

# Pocket
use_pocket = False
pocket_consumer_key = None
additional_tag_to_use_on_pocket = 'from rockpool'
include_article_tags_on_pocket = False

# Timings etc
minutes_between_checking_new_articles = 15
max_days_age_of_articles_to_announce = 7

# tags
# if set to True normalise_tags creates a new list of tags with all spaces and punctuation removed and in lowercase
# it will be used for web search/browse queries, special_tags_to_announce and filtered_tags
normalise_tags = True
special_tags_to_announce = ['rockpool']
hashtag_to_use_for_special_announcements = '#rockpool'
filtered_tags = ['notrockpool']