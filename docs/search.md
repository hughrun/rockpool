# Searching and browsing

There are two ways to query the article database, and one way to manually filter. Additionally, tag browsing uses two processes to normalise tags.

## Search

Users can type a word or phrase into the search box. Searching uses a MongoDB [$text](https://docs.mongodb.com/manual/reference/operator/query/text/) query on a combined [index](https://docs.mongodb.com/manual/core/index-text/) of `blog`, `categories`, and `title`.

MongoDB text queries use stemming and ignore stop words (though unfortunately there doesn't seem to be any information about precisely how this works or which words are considered to be stop words). This means most searches will expand out slightly e.g. "puppies" finds "puppy" as well. This is generally what you want, especially with the relatively small community collections `Rockpool` is designed for.

By default Mongo text queries are `OR` searches. Users may use quotation marks to perform a phrase query.

For example:

* `glam blog club` will return all articles with any of the words `glam`, `blog` or `club` in any of the article title, blog title, or tags.
* `"glam blog club"` will return all articles with the whole phrase "glam blog club" in any of the article title, blog title, or tags.

All searches are case-insensitive.

## Tag browsing

Users can browse by tag. Browse search uses a MongoDB [$regex]() query to search for tags approximating the browsed tag, using a global, case-insensitive regex like `.*multi.*word.*tag.*`. This will expand most tag searches to account for prepended hashes (`#tag`), weird punctuation (`'tag'`, `(tags]`, `multi&word`), or appended puntuation (`tags'`, `tag!`).

Note however that this is still a 'match' query rather than the 'or' query from a Search query, and that regex isn't actually magic. Tag browse cannot determine where there _might_ be a space, only where there is one - so tags with spaces will return equivalents without spaces, but not vice-versa.

For example:

* `blog june` will return anything tagged `blog june`, `blogjune`, `#BlogJune`, `blog EVERY day of June` or `bloggers love June!`
* `blogjune` will return anything tagged `blogjune`, `#blogjune`, or `blogjune is my favourite month`, but will **not** return `blog june`.

All tag browsing is case-insensitive, though Rockpool down-cases tags on ingest anyway.

## Tag substitution

Your community may (inconsistently) use one or more tags that you would like to normalise to get around the problem with spaces outlined above. You can use tag subsitution to do this - note however that every browse request will be checked against your substution list, so it is not designed to be exhaustive and will slow down browsing if you use too many. You can enter your substitution pairs in the `tags` object in `public-config.js`, with the key (lefthand value) being the tag the user clicks on and the value (righthand value) being what you want to change it to before querying the database. The substitute will then run through the regex like any other tag.

For example:
```
const tags = {
  'glamblogclub' : 'glam blog club',
  '#glamblogclub' : 'glam blog club'
}
```
This changes `glamblogclub` and `#glamblogclub` to `glam blog club` before it is run through the regex to ultimately do a search on the database for `.*glam.*blog.*club` (rather than `.*glamblogclub.*`). Note that in the case of tag substitution we also need to account for any prepended characters because the substitution is done prior to the regex operation. This may change in a future version.

## Query by month

Both text searching and tag browsing can be filtered by publication date 'this month' or 'last month'. Simply run the query, then click on the relevant link above the search box. If there is no active query, Rockpool will return all articles with a publication date in the relevant month.

---
[Home](/README.md)  
[Database structure](database.md)  
[Installation](installation.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
[Browse page](browse.md)  
[Contributing](docs/contributing.md)  