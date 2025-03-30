// map display
var map = L.map('map').setView([51.03, -114.066666], 10);
var marker=L.marker([0,0])
// tiles for calgary building permits
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19,
                            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            }).addTo(map);


// displaying data received from api response on the map
function displayTempMarker(msgStr){
    data=JSON.parse(msgStr)
    map.removeLayer(marker);
    marker=L.geoJSON(data, {pointToLayer: function(feature, latlng) {
        let temp=feature.properties.temperature;
        if (temp >= -40 && temp < 10) { return L.circleMarker(latlng, {radius: 8, fillColor: "blue"});}
        else if (temp >= 10 && temp < 30) { return L.circleMarker(latlng,  {radius: 8, fillColor: "green"});}
        else if (temp >= 30 && temp <= 60) {return L.circleMarker(latlng,  {radius: 8, fillColor: "red"});}
}
    })
    .bindPopup(`Current Temperature: ${temp} deg Celsius`)
    .addTo(map);

    marker.openPopup()
}


