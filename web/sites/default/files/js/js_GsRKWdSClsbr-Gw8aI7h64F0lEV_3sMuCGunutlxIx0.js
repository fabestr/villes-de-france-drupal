/**
 * @file
 * Fit locations.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.geolocation = Drupal.geolocation || {};
  Drupal.geolocation.mapCenter = Drupal.geolocation.mapCenter || {};

  /**
   * @param {GeolocationMapInterface} map
   * @param {GeolocationCenterOption} centerOption
   * @param {Boolean} centerOption.settings.reset_zoom
   */
  Drupal.geolocation.mapCenter.fit_bounds = function (map, centerOption) {
    map.fitMapToMarkers();

    if (centerOption.settings.reset_zoom) {
      map.setZoom(undefined, true);
    }

    return false;
  }

})(jQuery, Drupal);
;
/**
 * @file
 * Javascript for leaflet integration.
 */

(function ($, Drupal) {
  'use strict';

  /**
   * GeolocationLeafletMap element.
   *
   * @constructor
   * @augments {GeolocationMapBase}
   * @implements {GeolocationMapInterface}
   * @inheritDoc
   *
   * @prop {Object} settings.leaflet_settings - Leaflet specific settings.
   */
  function GeolocationLeafletMap(mapSettings) {
    if (typeof L === 'undefined') {
      console.error('Leaflet library not loaded. Bailing out.'); // eslint-disable-line no-console.
      return;
    }

    this.type = 'leaflet';

    Drupal.geolocation.GeolocationMapBase.call(this, mapSettings);

    /**
     *
     * @type {MapOptions}
     */
    var defaultLeafletSettings = {
      zoom: 10
    };

    // Add any missing settings.
    this.settings.leaflet_settings = $.extend(defaultLeafletSettings, this.settings.leaflet_settings);

    // Set the container size.
    this.container.css({
      height: this.settings.leaflet_settings.height,
      width: this.settings.leaflet_settings.width
    });

    /** @type {Map} */
    var leafletMap = L.map(this.container.get(0), {
      center: [this.lat, this.lng],
      zoom: this.settings.leaflet_settings.zoom,
      zoomControl: false
    });

    var markerLayer = L.layerGroup().addTo(leafletMap);

    // Set the tile layer.
    var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap);

    this.leafletMap = leafletMap;
    this.markerLayer = markerLayer;
    this.tileLayer = tileLayer;

    this.addPopulatedCallback(function (map) {
      var singleClick;
      map.leafletMap.on('click', /** @param {LeafletMouseEvent} e */ function (e) {
        singleClick = setTimeout(function () {
          map.clickCallback({lat: e.latlng.lat, lng: e.latlng.lng});
        }, 500);
      });

      map.leafletMap.on('dblclick', /** @param {LeafletMouseEvent} e */ function (e) {
        clearTimeout(singleClick);
        map.doubleClickCallback({lat: e.latlng.lat, lng: e.latlng.lng});
      });

      map.leafletMap.on('contextmenu', /** @param {LeafletMouseEvent} e */ function (e) {
        map.contextClickCallback({lat: e.latlng.lat, lng: e.latlng.lng});
      });
    });

    this.initializedCallback();
    this.populatedCallback();
  }
  GeolocationLeafletMap.prototype = Object.create(Drupal.geolocation.GeolocationMapBase.prototype);
  GeolocationLeafletMap.prototype.constructor = GeolocationLeafletMap;
  GeolocationLeafletMap.prototype.setZoom = function (zoom, defer) {
    if (typeof zoom === 'undefined') {
      zoom = this.settings.leaflet_settings.zoom;
    }
    zoom = parseInt(zoom);
    this.leafletMap.setZoom(zoom);
  };
  GeolocationLeafletMap.prototype.setCenterByCoordinates = function (coordinates, accuracy, identifier) {
    Drupal.geolocation.GeolocationMapBase.prototype.setCenterByCoordinates.call(this, coordinates, accuracy, identifier);

    if (typeof accuracy === 'undefined') {
      this.leafletMap.panTo(coordinates);
      return;
    }

    var circle = this.addAccuracyIndicatorCircle(coordinates, accuracy);

    this.leafletMap.fitBounds(circle.getBounds());

    setInterval(fadeCityCircles, 300);

    function fadeCityCircles() {
      var fillOpacity = circle.options.fillOpacity;
      fillOpacity -= 0.03;

      var opacity = circle.options.opacity;
      opacity -= 0.06;

      if (
          opacity > 0
          && fillOpacity > 0
      ) {
        circle.setStyle({
          fillOpacity: fillOpacity,
          stroke: opacity
        });
      }
      else {
        circle.remove()
      }
    }
  };
  GeolocationLeafletMap.prototype.addAccuracyIndicatorCircle = function (location, accuracy) {
    return L.circle(location, accuracy, {
      interactive: false,
      color: '#4285F4',
      opacity: 0.3,
      fillColor: '#4285F4',
      fillOpacity: 0.15
    }).addTo(this.leafletMap);
  };
  GeolocationLeafletMap.prototype.setMapMarker = function (markerSettings) {
    if (typeof markerSettings.setMarker !== 'undefined') {
      if (markerSettings.setMarker === false) {
        return;
      }
    }

    if (typeof markerSettings.icon === 'string') {
      markerSettings.icon = L.icon({
        iconUrl: markerSettings.icon
      });
    }

    /** @type {Marker} */
    var currentMarker = L.marker([parseFloat(markerSettings.position.lat), parseFloat(markerSettings.position.lng)], markerSettings).addTo(this.markerLayer);

    currentMarker.locationWrapper = markerSettings.locationWrapper;

    if (typeof markerSettings.label === 'string') {
      currentMarker.bindTooltip(markerSettings.label, {
        permanent: true,
        direction: 'top'
      });
    }

    Drupal.geolocation.GeolocationMapBase.prototype.setMapMarker.call(this, currentMarker);

    return currentMarker;
  };
  GeolocationLeafletMap.prototype.removeMapMarker = function (marker) {
    Drupal.geolocation.GeolocationMapBase.prototype.removeMapMarker.call(this, marker);
    this.markerLayer.removeLayer(marker);
  };
  GeolocationLeafletMap.prototype.getMarkerBoundaries = function (locations) {

    locations = locations || this.mapMarkers;
    if (locations.length === 0) {
      return;
    }

    var group = new L.featureGroup(locations);

    return group.getBounds();
  };
  GeolocationLeafletMap.prototype.getCenter = function () {
    var center = this.leafletMap.getCenter();
    return {lat: center.lat, lng: center.lng};
  };
  GeolocationLeafletMap.prototype.normalizeBoundaries = function (boundaries) {
    if (boundaries instanceof L.LatLngBounds) {
      return {
        north: boundaries.getNorth(),
        east: boundaries.getEast(),
        south: boundaries.getSouth(),
        west: boundaries.getWest()
      };
    }

    return false;
  };
  GeolocationLeafletMap.prototype.denormalizeBoundaries = function (boundaries) {
    if (typeof boundaries === 'undefined') {
      return false;
    }

    if (boundaries instanceof L.LatLngBounds) {
      return boundaries;
    }

    if (Drupal.geolocation.GeolocationMapBase.prototype.boundariesNormalized.call(this, boundaries)) {
      return L.latLngBounds([
        [boundaries.south, boundaries.west],
        [boundaries.north, boundaries.east]
      ]);
    }
    else {
      boundaries = Drupal.geolocation.GeolocationMapBase.prototype.normalizeBoundaries.call(this, boundaries);
      if (boundaries) {
        return L.latLngBounds([
          [boundaries.south, boundaries.west],
          [boundaries.north, boundaries.east]
        ]);
      }
    }

    return false;
  };
  GeolocationLeafletMap.prototype.fitBoundaries = function (boundaries, identifier) {
    boundaries = this.denormalizeBoundaries(boundaries);
    if (!boundaries) {
      return;
    }

    if (!this.leafletMap.getBounds().equals(boundaries)) {
      this.leafletMap.fitBounds(boundaries);
      Drupal.geolocation.GeolocationMapBase.prototype.fitBoundaries.call(this, boundaries, identifier);
    }
  };
  GeolocationLeafletMap.prototype.addControl = function (element) {
    this.leafletMap.controls = this.leafletMap.controls || [];
    var controlElement = new(L.Control.extend({
      options: {
        position: typeof element.dataset.controlPosition === 'undefined' ? 'topleft' : element.dataset.controlPosition
      },
      onAdd: function (map) {
        element.style.display = 'block';
        L.DomEvent.disableClickPropagation(element);
        return element;
      }
    }));
    controlElement.addTo(this.leafletMap);
    this.leafletMap.controls.push(controlElement);
  };
  GeolocationLeafletMap.prototype.removeControls = function () {
    this.leafletMap.controls = this.leafletMap.controls || [];
    var that = this;
    $.each(this.leafletMap.controls, function (index, control) {
      that.leafletMap.removeControl(control);
    });
  };

  Drupal.geolocation.GeolocationLeafletMap = GeolocationLeafletMap;
  Drupal.geolocation.addMapProvider('leaflet', 'GeolocationLeafletMap');

})(jQuery, Drupal);
;
/**
 * @file
 * Common Map Leaflet.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Dynamic map handling aka "AirBnB mode".
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches common map style functionality to relevant elements.
   */
  Drupal.behaviors.geolocationCommonMapLeaflet = {
    /**
     * @param {GeolocationSettings} drupalSettings.geolocation
     */
    attach: function (context, drupalSettings) {
      $.each(
        drupalSettings.geolocation.commonMap,

        /**
         * @param {String} mapId - ID of current map
         * @param {CommonMapSettings} commonMapSettings - settings for current map
         */
        function (mapId, commonMapSettings) {
          if (
            typeof commonMapSettings.dynamic_map !== 'undefined'
            && commonMapSettings.dynamic_map.enable
          ) {
            var map = Drupal.geolocation.getMapById(mapId);

            if (!map) {
              return;
            }

            if (map.container.hasClass('geolocation-common-map-leaflet-processed')) {
              return;
            }
            map.container.addClass('geolocation-common-map-leaflet-processed');

            /**
             * Update the view depending on dynamic map settings and capability.
             *
             * One of several states might occur now. Possible state depends on whether:
             * - view using AJAX is enabled
             * - map view is the containing (page) view or an attachment
             * - the exposed form is present and contains the boundary filter
             * - map settings are consistent
             *
             * Given these factors, map boundary changes can be handled in one of three ways:
             * - trigger the views AJAX "RefreshView" command
             * - trigger the exposed form causing a regular POST reload
             * - fully reload the website
             *
             * These possibilities are ordered by UX preference.
             */
            if (
              map.container.length
              && map.type === 'leaflet'
            ) {
              map.addPopulatedCallback(function (map) {
                var geolocationMapIdleTimer;
                map.leafletMap.on('moveend zoomend', /** @param {LeafletMouseEvent} e */function (e) {
                  clearTimeout(geolocationMapIdleTimer);

                  geolocationMapIdleTimer = setTimeout(
                    function () {
                      var ajaxSettings = Drupal.geolocation.commonMap.dynamicMapViewsAjaxSettings(commonMapSettings);

                      // Add bounds.
                      var currentBounds = map.leafletMap.getBounds();
                      var bound_parameters = {};
                      bound_parameters[commonMapSettings['dynamic_map']['parameter_identifier'] + '[lat_north_east]'] = currentBounds.getNorthEast().lat;
                      bound_parameters[commonMapSettings['dynamic_map']['parameter_identifier'] + '[lng_north_east]'] = currentBounds.getNorthEast().lng;
                      bound_parameters[commonMapSettings['dynamic_map']['parameter_identifier'] + '[lat_south_west]'] = currentBounds.getSouthWest().lat;
                      bound_parameters[commonMapSettings['dynamic_map']['parameter_identifier'] + '[lng_south_west]'] = currentBounds.getSouthWest().lng;

                      ajaxSettings.submit = $.extend(
                        ajaxSettings.submit,
                        bound_parameters
                      );

                      Drupal.ajax(ajaxSettings).execute();
                    },
                    commonMapSettings.dynamic_map.views_refresh_delay
                  );
                });
              });
            }
          }
        });
    },
    detach: function (context, drupalSettings) {}
  };

})(jQuery, Drupal);
;
