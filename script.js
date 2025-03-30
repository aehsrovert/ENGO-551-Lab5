const hostInput = document.getElementById('host');
const portInput = document.getElementById('port');
const clientIdInput = document.getElementById('clientId');
const connectBtn = document.getElementById('connectBtn');
const connectionStatus = document.getElementById('connectionStatus');
const topicInput = document.getElementById('topic');
const messageInput = document.getElementById('message');
const publishBtn = document.getElementById('publishBtn');
const shareStatusBtn = document.getElementById('shareStatusBtn');
const messagesDiv = document.getElementById('messages');

clientIdInput.value += Math.floor(Math.random() * 1000);

let mqttClient;
let isConnected = false;
let map;
let userMarker;
let watchId;

function initMap() {
    map = L.map('map').setView([51.05, -114.07], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
            },
            error => {
                addMessage('Error getting location: ' + error.message);
            }
        );
    } else {
        addMessage('Geolocation is not supported by your browser');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    // Set default to HiveMQ which works better on mobile
    hostInput.value = "broker.hivemq.com";
    portInput.value = "8000";
});

connectBtn.addEventListener('click', () => {
    if (!isConnected) {
        const host = hostInput.value;
        const port = parseInt(portInput.value);
        const clientId = clientIdInput.value;

        hostInput.disabled = true;
        portInput.disabled = true;
        clientIdInput.disabled = true;

        connectMQTT(host, port, clientId);
    } else {
        if (mqttClient && mqttClient.isConnected()) {
            mqttClient.disconnect();
        }
        
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
        
        hostInput.disabled = false;
        portInput.disabled = false;
        clientIdInput.disabled = false;
        
        isConnected = false;
        connectBtn.textContent = 'Start Connection';
        connectionStatus.textContent = 'Status: Disconnected';
        connectionStatus.style.color = 'red';
        publishBtn.disabled = true;
        shareStatusBtn.disabled = true;
    }
});

function connectMQTT(host, port, clientId) {
    try {
        mqttClient = new Paho.MQTT.Client(host, port, clientId);
        
        mqttClient.onConnectionLost = onConnectionLost;
        mqttClient.onMessageArrived = onMessageArrived;
        
        addMessage('Connecting to MQTT broker...');
        
        const connectOptions = {
            onSuccess: onConnect,
            onFailure: onFailure,
            timeout: 30,
            keepAliveInterval: 60
        };
        
        if (port === 8883 || port === 8884 || port === 443) {
            connectOptions.useSSL = true;
        }
        
        mqttClient.connect(connectOptions);
    } catch (error) {
        addMessage('Error creating MQTT client: ' + error.message);
    }
}

function onConnect() {
    isConnected = true;
    addMessage('Connected to MQTT broker!');
    connectionStatus.textContent = 'Status: Connected';
    connectionStatus.style.color = 'green';
    connectBtn.textContent = 'End Connection';
    publishBtn.disabled = false;
    shareStatusBtn.disabled = false;
    
    if (!topicInput.value) {
        topicInput.value = 'ENGO551/your_name/my_temperature';
    }
    
    const temperatureTopic = topicInput.value;
    subscribeToTopic(temperatureTopic);
    
    startWatchingLocation();
}

function onFailure(responseObject) {
    addMessage('Failed to connect: ' + responseObject.errorMessage);
    
    hostInput.disabled = false;
    portInput.disabled = false;
    clientIdInput.disabled = false;
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        addMessage('Connection lost: ' + responseObject.errorMessage);
        connectionStatus.textContent = 'Status: Disconnected';
        connectionStatus.style.color = 'red';
        publishBtn.disabled = true;
        shareStatusBtn.disabled = true;
        
        setTimeout(() => {
            if (!mqttClient.isConnected() && isConnected) {
                addMessage('Attempting to reconnect...');
                
                const connectOptions = {
                    onSuccess: onConnect,
                    onFailure: onFailure,
                    timeout: 30,
                    keepAliveInterval: 60
                };
                
                if (parseInt(portInput.value) === 8883 || 
                    parseInt(portInput.value) === 8884 || 
                    parseInt(portInput.value) === 443) {
                    connectOptions.useSSL = true;
                }
                
                mqttClient.connect(connectOptions);
            }
        }, 5000);
    }
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;
    
    addMessage(payload);
    
    try {
        const data = JSON.parse(payload);
        if (data.type === 'Feature' && data.geometry && data.properties) {
            updateMarker(data);
        }
    } catch (error) {
        addMessage('Error parsing message: ' + error.message);
    }
}

function subscribeToTopic(topic) {
    if (mqttClient && mqttClient.isConnected()) {
        mqttClient.subscribe(topic, { qos: 0 });
        addMessage(`Subscribed to topic: ${topic}`);
    }
}

publishBtn.addEventListener('click', () => {
    const topic = topicInput.value;
    const message = messageInput.value;
    
    if (!topic || !message) {
        addMessage('Please enter both topic and message');
        return;
    }
    
    publishMessage(topic, message);
    messageInput.value = '';
});

shareStatusBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                const temperature = getRandomTemperature(-40, 60);
                
                const geojson = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    properties: {
                        temperature: temperature
                    }
                };
                
                const topic = topicInput.value;
                const geojsonStr = JSON.stringify(geojson);
                publishMessage(topic, geojsonStr);
                
                // Also update marker directly for immediate feedback
                updateMarker(geojson);
            },
            error => {
                addMessage('Error getting location: ' + error.message);
            }
        );
    } else {
        addMessage('Geolocation is not supported by your browser');
    }
});

function publishMessage(topic, message) {
    if (mqttClient && mqttClient.isConnected()) {
        const mqttMessage = new Paho.MQTT.Message(message);
        mqttMessage.destinationName = topic;
        mqttClient.send(mqttMessage);
        addMessage(`Published message to topic ${topic}: ${message}`);
    } else {
        addMessage('Not connected to MQTT broker');
    }
}

function startWatchingLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
            },
            error => {
                addMessage('Error getting initial location: ' + error.message);
            }
        );
    }
}

function updateMarker(data) {
    const latitude = data.geometry.coordinates[1];
    const longitude = data.geometry.coordinates[0];
    const temperature = data.properties.temperature;
    
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Use a simple default marker
    userMarker = L.marker([latitude, longitude]).addTo(map);
    
    // Add popup with temperature info and color
    let tempColor = "blue";
    if (temperature >= 10 && temperature < 30) {
        tempColor = "green";
    } else if (temperature >= 30) {
        tempColor = "red";
    }
    
    userMarker.bindPopup(`<b>Temperature:</b> <span style="color:${tempColor}">${temperature}°C</span>`);
    map.setView([latitude, longitude], 15);
}

function getRandomTemperature(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}