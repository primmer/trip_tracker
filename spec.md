# Bike Trip tracker.

## Overview

A versatile hub for tracking bike trips and bikepacking adventures. Integrates with Strava for routes, Google Photos for mapping memories, and Google Maps for interactive exploration. 

Strava already provides many of these features, but it doesn't do it in an integrated style where multiple activities can be joined together into a trip. And Strava's photo display system is pretty limited and low resolution. We are going for that 'wow' factor highlighting the imagry, not for the boring data logging of strava.

## Data

Strava will be the main data driver, the app will be able to cover a set of rides that are hashtagged in the private activity description with the same value and group them together. It will also allow indvidual ride exploration. I have tagged a ride on 2026/03/15 as #otb as an example. Also, there are two rides tagged with #hmb_jul4 that are a two day trip.

Not every photo taken on a ride should be part of the photo POIs. We will need a system that allows me to retrospectively filter which photos are part of the trip display. Google photos has duplicates. However, I don't want to create custom albums for every day in photos. Maybe we can do something more lightweight. The strava activities already have photo attached as 'media', so it's possible that we could use those as the filter. If they have similar file names, we could use the files directly from Google Photos and just use the Strava added media as a way to filter them. The strava media appear to be very downsampled. 

Consider but don't implment yet, adding videos to the media shown. There are several trips that have videos taken the same day. 

## Sourcecode and dev

Use a local JJ reposistory for now and we will evetually put it in a private github.

https://context7.com/


## Auth

The app will be designed to connect to my personal environment in a durable way. Users should not have to log in to see the data. 

This is my strava profile https://www.strava.com/athletes/167712731 i'd like it to also be able to place my photos on a map. i'll be saving fotos to google photos.

We will have secrets for the Strava and Google APIs as well as the Maps API. 

Create set up a tool where I can initialize the Strava and Google access tokens to access those services. 

Parse the route information (GPX or similar format) and store it for map visualization.

Connect to the Google Photos account. For each photo, extract its geotagged location data. 

## Behavior

I would I like the UI to be a combination of map and photo viewing, starting probably with a splash of a very dramatic photo and then moving into the route display. 

The app should display the daily mileage and elevation in feet and meters. But these numbers should not be the focus. If possible, draw an elevation over time graphic as well. 

Allow the user to toggle back and forth between photo gallery and map view. The gallery should probably be organized by date. 

Photos should be interactive markers on the trip map. Allow users to view photo thumbnails by clicking the markers.

The route display should be an overhead map that is in satellite view. I would also like to explore the potential of having a flyover option. The flyover would kind of track at a low drone flying level behind the rider as they go over hills and mountains.

Consider a custom animation engine that uses requestAnimationFrame and the Google Maps Geometry library to smoothly fly the camera along your route in 3D (adjusting heading and tilt) with play, pause, and speed controls.

Strava's activity descriptions are very generic. They're just "afternoon ride" and "evening ride". However, I would like to somehow automatically improve on these, if we can, to scan the map for significant points of interest that were passed or indicate the general area. For example, on "Mondara Mountain" -- specific mountains or ridges are very significant. Use those to create more of a descriptive, longer explanation of the day's travel. 