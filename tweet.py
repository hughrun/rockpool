import settings

def newpost(article, author):
  title = article['title']
  url = article['url']
  separator = '-' # TODO: this needs to depend on whether the times_announced is zero, odd, or even
  hashtag = settings.hashtag_to_use_for_special_announcements
  use_hashtag = len(set(settings.special_tags_to_announce).intersection(article['categories_normalised'])) > 0
  if use_hashtag:
    template = '{title} {separator} {author} {separator} {url} {hashtag}'
    msg = template.format(title=title, author=author, separator=separator, url=url, hashtag=hashtag)
    print('TWEETING')
    print(msg)
  else:
    template = '{title} {separator} {author} {separator} {url}'
    msg = template.format(title=title, author=author, separator=separator, url=url)
    print('TWEETING')
    print(msg)