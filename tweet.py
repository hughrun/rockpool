import settings

def newpost(article, author):
  title = article['title']
  url = article['link']

  if 'tweeted' in article:
    separator = ':' if article['tweeted']['times'] % 2 else '|'
  else:
    separator = '-'
  
  hashtag = settings.hashtag_to_use_for_special_announcements
  # the line below will work with the new DB but not the legacy one
  # use_hashtag = len(set(settings.special_tags_to_announce).intersection(article['categories_normalised'])) > 0
  # TEST: False below just for testing with legacy DB
  use_hashtag = False
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