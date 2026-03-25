1. we need to select some of my photos for the static assets of the site.
2. The background appears to be blue instead of a dark gray. 
3. enhance tiles button. what does it do? and it throws an error for me.
4. Sync with Strava also throws an error.
5. The trip tiles background images should probably be the map representation of the journey. I think these are available from Strava. I think there is a version of them that is small enough to fit in the UI. I've included a screen shot of a typical strava activity in the feed which has a map, and some media. in feed_item.png
6. I kind of see the buttons like sync with Strava as being administrative tools, and normal viewers of the site won't need to do this. I will do it occasionally to make sure that the site is updated from Strava. 
7. Let's put a little bit of organization on the tiles. Maybe splitting them by week or month will be helpful. 
8. I still think the map view is not ideal. It should probably be square. I don't like the fact that it is the entire viewport of the browser. 
9. On the map, there is a street view and a little map move icon, but there are no zoom in/zoom out controls. 
10. The error that we saw before, when I first started testing, is still there, which is that the map starts fully zoomed out with no route plotted. 
11. Add photos button doesn't work even after the back end is started and it throws an alert dialog instead of alerting within the browser content. 

12. Selecting the map style and then zooming unsets the map style, so, for example, choosing satellite versus terrain. 
13. The trip data UI is blocked at the bottom. This is something that a simple screenshot should've caught.
14. I hit the sink with Strava button and it just spun and spun, and I had no idea when it was going to end or if it was hung up. I'm not sure what we can do there for progress bar, but let's consider that an advanced feature.
15. After I completed the Strava sink, I expected the new three day trip in August to be displayed, and it still is not. So it's pretty clear to me that Strava is not currently syncing.
16. In general, I'm just not too happy with the overall look and feel. It looks very generic and bubbly and rounded, and I would just prefer a much cleaner look which is less like a software app and more portfolio-ish. Every AI generated site on the Internet today has the same grid of rounded corner squares on it.