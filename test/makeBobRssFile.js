const fs = require('fs');

let now = Date.now() // now
let date1 = new Date(now - 3.6e+6) // an hour ago
let date2 = new Date(now - 8.64e+7) // 24 hours ago
let date3 = new Date(now - 2.592e+9) // 30 days ago
let date4 = new Date(now - 2.592e+10) // 300 days ago


let today = date1.toUTCString()
let yesterday = date2.toUTCString()
let lastMonth = date3.toUTCString()
let lastYear = date4.toUTCString()

let rssfile = `
<?xml version="1.0" encoding="UTF-8" ?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
  <channel>
    <title>
    Bob Craps On
    </title>
    <description>
    A blog about crap
    </description>
    <link>https://www.bob.craps.on</link>
    <generator>Rockpool Testing</generator>
    <lastBuildDate> ${today} </lastBuildDate>
    <atom:link href="https://www.bob.craps.on/rss" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
      <item>
        <title>
        Baby it's cold outside
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://www.bob.craps.on/4
        </link>
        <guid isPermaLink="true">https://www.bob.craps.on/4</guid>
        <pubDate>${today}</pubDate>
        <description>
              <![CDATA[ Stop. Cabbage Time. ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        Winter is coming
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://www.bob.craps.on/3
        </link>
        <guid isPermaLink="true">https://www.bob.craps.on/3</guid>
        <pubDate>${yesterday}</pubDate>
        <description>
              <![CDATA[ OMG I have So. Many. Citrus. ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        Summertime sadness
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://www.bob.craps.on/2
        </link>
        <guid isPermaLink="true">https://www.bob.craps.on/2</guid>
        <pubDate>${lastMonth}</pubDate>
        <description>
              <![CDATA[ There are only so many tomatoes I can eat... ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        Spring is here!
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://www.bob.craps.on/1
        </link>
        <guid isPermaLink="true">https://www.bob.craps.on/1</guid>
        <pubDate>${lastYear}</pubDate>
        <description>
              <![CDATA[ Let's get planting! ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
  </channel>
</rss>
`
fs.writeFileSync('test/sites/bobRss.xml', rssfile)