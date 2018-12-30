"""
This file holds all of the configuration information needed to set up a particular instance of Rockpool.
Some parameters have sensible defaults, for others this is not possible.
Make sure you review all settings here before starting.
"""

# TODO: document what every setting is for and its effect

mongo_host = ''
mongo_port = ''
mongo_db_name = ''
mongo_user = ''
mongo_password = ''
mongo_auth_mechanism = 'SCRAM-SHA-1' # note as of Python 3.7 we should use SCRAM-SHA-256
mongo_uri = 'mongodb://{}:{}@{}:{}/?authSource={}&authMechanism=SCRAM-SHA-1'.format(mongo_user, mongo_password, mongo_host, mongo_port, mongo_db_name)

# Twitter
use_twitter = False
twitter_consumer_key = 'YOUR_CONSUMER_KEY_HERE'
twitter_consumer_secret = 'YOUR_CONSUMER_SECRET_HERE'
twitter_access_token = 'YOUR_ACCESS_TOKEN_HERE'
twitter_access_token_secret = 'YOUR_ACCESS_TOKEN_SECRET_HERE'

hours_between_announcing_same_article_on_twitter = 10
announce_this_many_times_on_twitter = 3

# Mastodon
use_mastodon = True
mastodon_base_url = 'https://ausglam.space'
mastodon_access_token = 'YOUR_ACCESS_TOKEN_HERE'

hours_between_announcing_same_article_on_mastodon = 18
announce_this_many_times_on_mastodon = 2

# Pocket
use_pocket = False
pocket_consumer_key = 'YOUR_CONSUMER_KEY_HERE'
additional_tag_to_use_on_pocket = 'rockpool'
include_article_tags_on_pocket = False # TODO: make this a user-assigned option instead, as well as inclusion of 'special' tags (see below)

# Timings etc
minutes_between_checking_new_articles = 60 # this takes a while because it has to fetch each feed - you really don't want to do it more frequently than every 15 minutes
minutes_between_checking_articles_to_announce = 5 # the larger the number of publications and the more frequently authors post articles, the smaller this number should be.
max_days_age_of_articles_to_announce = 7

# tags
special_tags_to_announce = ['rockpoolblogclub', 'blogclub'] # use normalised (lowercase alphanum only)
hashtag_to_use_for_special_announcements = '#RockpoolBlogClub' # this is the hashtag that will be posted if the blog post has any of the tags in special_tags_to_announce
# TODO: can hashtag_to_use_for_special_announcements be optionally included in Pocket?
filtered_tags = ['notrockpool'] # use normalised (lowercase alphanum only)