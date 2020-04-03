/* Import base styling */
import '../base.scss'

/* Import this components styling */
import './mission.scss'

import 'bootstrap/js/dist/collapse'

/* Import FontAwesome icons */
import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons/faMapMarkerAlt'
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons/faTimesCircle'

library.add(faMapMarkerAlt, faBars, faPlus, faTimesCircle)
dom.watch()

const L = require('leaflet')

const elMap = document.getElementById('map')
const mapOptions = JSON.parse(elMap.dataset.options)
const missions = mapOptions.missions || []

const map = L.map(elMap).setView([0, 0], 13)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map)

const markerIcon = L.divIcon({
  className: 'map-marker-icon',
  // iconSize: L.point(24, 24),
  html: '<i class="fas fa-map-marker-alt"></i>'
})

// Missions grouped by theme
const themeMissions = {}
const bounds = L.latLngBounds()
for (const mission of missions) {
  const marker = L.marker([mission.latitude, mission.longitude], {
    icon: markerIcon
  })
  bounds.extend(marker.getLatLng())

  const showUrl = mapOptions.show_url_template.replace('%id%', mission.id)
  // @TODO: Design
  marker.bindPopup(`<p class="mb-0 h4">${mission.title}</p><p class="text-primary"><i class="fas fa-map-marker-alt mr-1"></i>${mission.location}</p><p>${mission.description}</p><a href="${showUrl}" class="btn btn-primary btn-sm btn-block">Show mission</a>`)

  let layerGroup = themeMissions[mission.theme.title]
  if (!layerGroup) {
    layerGroup = L.layerGroup()
    layerGroup.addTo(map)
    themeMissions[mission.theme.title] = layerGroup
  }
  marker.addTo(layerGroup)
}

map.fitBounds(bounds)

// @TODO: Add a header to the theme missions selector.
L.control.layers(null, themeMissions, {
  collapsed: false
}).addTo(map)
