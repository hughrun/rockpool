import settings

def newpost(article, author):
  title = article['title']
  author = author # TODO: this needs to pull in the author's mastodon handle if it is on file
  url = article['url']
  separator = '-' # TODO: this needs to depend on whether the times_announced is zero, odd, or even
  hashtag = settings.hashtag_to_use_for_special_announcements
  if len(set(settings.special_tags_to_announce).intersection(article['categories'])) > 0:
    template = '{title} by {author} {separator} {url} {hashtag}'
    msg = template.format(title=title, author=author, separator=separator, url=url, hashtag=hashtag)
    print(msg)
  else:
    template = '{title} by {author} {separator} {url}'
    msg = template.format(title=title, author=author, separator=separator, url=url)
    print(msg)