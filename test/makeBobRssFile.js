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
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean eleifend et nisi sit amet tristique. Nam justo nibh, gravida quis efficitur elementum, posuere euismod lacus. Etiam semper cursus bibendum. Quisque eu auctor enim. Duis vulputate lacus non enim efficitur, at consequat risus semper. Aliquam erat volutpat. Quisque laoreet nisl nec libero cursus varius. Sed posuere ac leo a ultrices. Quisque sapien ligula, tristique non nibh id, sollicitudin laoreet turpis. Vivamus ornare lectus vel ex venenatis ultricies.

Mauris dapibus, eros non pulvinar fringilla, sapien nisl tincidunt justo, ac pharetra tellus risus ut neque. Quisque mollis lectus ipsum, at porta nisi pulvinar quis. Mauris a est ut ex convallis rutrum sed nec odio. Nam consequat diam sed dui laoreet viverra. Vestibulum non erat a sapien maximus vestibulum. Pellentesque dignissim dapibus arcu, quis faucibus nisi rhoncus ac. Pellentesque id velit ac nisi rutrum cursus. Nulla neque erat, sollicitudin ac dictum vel, gravida fringilla arcu. Proin eu feugiat augue. Etiam ut condimentum erat, vitae facilisis orci. Proin et tellus turpis.

Vestibulum dictum a ligula sed mattis. Proin sapien dolor, fermentum eu nunc nec, sagittis efficitur risus. Maecenas auctor pharetra bibendum. Sed commodo magna neque, et bibendum nulla commodo nec. In aliquam auctor erat eu commodo. Quisque pulvinar tortor et sem accumsan pharetra sit amet eget dolor. Nulla consequat urna ut bibendum efficitur. Nulla quis magna dignissim, feugiat justo non, interdum odio. Duis scelerisque dignissim est, in pulvinar tortor dignissim a. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Ut leo eros, vulputate quis tempus non, tristique id ante. Etiam quis urna dictum, ullamcorper odio et, posuere turpis. Cras finibus tempus luctus. Aliquam tempus tempus felis ac malesuada. Nam sit amet elementum lorem.

Nam ac pharetra augue. Duis gravida eu augue ut sodales. Mauris interdum varius urna, at molestie purus lobortis sed. Ut pellentesque lorem facilisis nisl finibus, aliquam vestibulum ipsum venenatis. In hac habitasse platea dictumst. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Cras auctor erat risus, ut posuere lacus feugiat at. Pellentesque eu sagittis ligula. Vestibulum ut erat volutpat, gravida turpis ac, pretium erat. Quisque elementum nulla in dui tristique, vitae maximus enim bibendum. Phasellus sit amet nibh non mauris malesuada elementum vel efficitur tortor. Sed quis massa feugiat, mollis lacus sodales, vulputate arcu. Vivamus consequat nulla ut lorem egestas interdum. Mauris tortor justo, viverra a nibh vitae, suscipit mollis nibh.

Morbi ut mi et arcu tincidunt consequat in eu mauris. Nullam suscipit magna lacinia elit rhoncus, eget faucibus ligula lacinia. Proin malesuada risus nibh, non rutrum arcu venenatis vitae. Etiam sed ligula non dolor finibus mattis at non dolor. Fusce leo tortor, rhoncus accumsan condimentum sit amet, viverra id eros. Phasellus luctus odio malesuada nunc tincidunt ullamcorper. Donec tempus ullamcorper volutpat. Praesent aliquam pharetra tempus. Duis luctus est quis justo dignissim, sagittis scelerisque dui fringilla. Aliquam eget dolor suscipit, dictum nisl quis, congue nisl. Pellentesque non magna et dui consectetur maximus. Vivamus eget quam a eros vehicula cursus. In pellentesque sit amet. 
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