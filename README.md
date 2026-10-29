# DrainWatch

I made this project to explore how a simple website could help people report blocked drainage and make drainage problems easier to track in their communities.

The project currently focuses on Las Piñas City, Philippines, where flooding and waterway management remain important concerns. My goal is to make reporting drainage problems more organized by bringing photos, locations, and report statuses together in one place.

## What's DrainWatch?

DrainWatch is a web-based drainage reporting system concept. The idea is pretty simple: instead of having reports scattered everywhere, residents could submit information about blocked drains through one platform.

The website is designed to organize drainage reports geographically and make it easier to view reported locations and track their status. Some features may still be under development or simulated in the current prototype.

## Features

- Interactive map for viewing drainage-related locations.
- Location-based reporting to identify where a drainage problem is happening.
- Photo evidence to help document reported problems.
- Report tracking with statuses such as Submitted, Under Review, Being Addressed, and Resolved.
- QR-code or direct-link access to make the reporting page easier to reach.

Note: The availability of these features depends on the current implementation. Sample or simulated reports should not be mistaken for actual reports submitted by residents.

## Built With

- HTML
- CSS
- JavaScript
- OpenStreetMap for map data and geographic visualization
- Leaflet, if used in the current implementation, for displaying interactive maps

## Running the Project

1. Clone or download this repository.
2. Open the project folder in your code editor.
3. Open `index.html` in your browser, or use a local development server if the project requires one.
4. Explore the website and its available features.

If the project requires additional dependencies or configuration, check the relevant source files for setup instructions.

## Customizing the Map

You don't have to keep the geographic focus on Las Piñas if you want to experiment with this project in your own community. You can change the map's initial location and, if the project includes a custom boundary, update that too.

Here's how to get started:

1. Open the project in your code editor.
2. Find the JavaScript file responsible for initializing the map. Depending on the project structure, it might be named `map.js`, `script.js`, or something similar.
3. Search for `L.map`, `setView`, `fitBounds`, `tileLayer`, or `OpenStreetMap` to help locate the map configuration if the project uses Leaflet.
4. Change the initial coordinates and zoom level to focus on your preferred city or region.
5. If the map displays a highlighted city boundary, look for the coordinates or GeoJSON file used to draw it. Update that data to match your desired area.
6. Save your changes and reload the website to see the result.

Changing the initial map location won't automatically change a highlighted city boundary. The boundary may be stored separately as coordinates or GeoJSON, so you'll need to update that data too.

You can explore these resources when working with geographic data:

- [OpenStreetMap](https://www.openstreetmap.org/)
- [Overpass Turbo](https://overpass-turbo.eu/)
- [Leaflet](https://leafletjs.com/)

Make sure to follow the relevant attribution and licensing requirements when using map data or other third-party resources.

If you're adapting DrainWatch for another city, remember to update location-specific labels, sample reports, descriptions, and other references to Las Piñas as well.

## Current Limitations

DrainWatch is a prototype, so it may not yet have all the features needed for a production-ready reporting system.

- Sample or simulated reports are not actual reports from residents.
- A displayed report status doesn't guarantee that a local authority has received or resolved the issue.
- Map information and geographic boundaries should be checked for accuracy.
- The website is intended to complement existing reporting channels, not replace official services or guarantee flood prevention.

## Future Plans

Here are a few things I'd like to explore as I continue developing the project:

- Connecting reports to a persistent database.
- Allowing authorized users to manage and update reports.
- Improving mobile responsiveness and accessibility.
- Exploring ways to integrate with appropriate local reporting channels.
- Supporting additional geographic areas.

## Sources and Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for map data.
- [Leaflet](https://leafletjs.com/) for interactive maps, if used by this project.

I'll add other references, data sources, and acknowledgments as the project develops.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
