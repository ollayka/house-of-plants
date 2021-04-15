editMap(getUserLatLng());

function editMap(userLocation) {
  const mapEdit = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: userLocation,
    zoom: 9,
  });

  var marker = new mapboxgl.Marker({
    draggable: true,
  })
    .setLngLat(userLocation)
    .addTo(mapEdit);

  function onDragEnd() {
    var lngLat = marker.getLngLat();
    document.getElementById("latitude").value = lngLat.lat;
    document.getElementById("longitude").value = lngLat.lng;
  }

  marker.on("dragend", onDragEnd);
}

function getUserLatLng() {
  userLat = document.getElementById("latitude").value;
  userLng = document.getElementById("longitude").value;
  let userLocation = [userLng, userLat];
  console.log(userLocation);
  return userLocation;
}
