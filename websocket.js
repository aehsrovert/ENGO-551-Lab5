
var mqtt;
var reconnectTimeout = 2000;
var host=null; 
var port=null;
var clientID="551_lab5";

const posOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
};
  
function posSuccess(pos) {
    let crd = pos.coords;
    let topic="engo_551/iffah_hamdan/my_temperature"
    const max=60;
    const min=-40;
    temp=Math.floor(Math.random() * (max - min + 1) + min);
    var geojsonFeature = {
        "type": "Feature",
        "properties": {
            "name": "currentUserLocation",
            "temperature": temp
        },
        "geometry": {
            "type": "Point",
            "coordinates": [crd.longitude, crd.latitude]
        }
    };

    let msg=JSON.stringify(geojsonFeature);
    mqtt.subscribe(topic)
    sendMessage(topic, msg)
    statusUpdate("shareStatus","Sent Status!","text-success")
}

function posError(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
}
 
function statusUpdate(statType,msg,colour){
    if (colour=='text-danger'){
        document.getElementById(statType).classList.remove('text-success');
    } else if (colour=='text-success'){
        document.getElementById(statType).classList.remove('text-danger');
    }

    document.getElementById(statType).classList.add(colour);
    document.getElementById(statType).innerHTML=msg;
}

function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    statusUpdate('status', "Connected", 'text-success')
    document.getElementById("connect").innerHTML="Disconnect"
    document.getElementById('connect').removeAttribute("disabled");
    document.getElementById('share').removeAttribute("hidden")
    document.getElementById('message').removeAttribute("hidden");
}

function MQTTconnect() {
    mqtt = new Paho.MQTT.Client(host,port,clientID);
    //document.write("connecting to "+ host);
    var options = {
        timeout: 3,
        onSuccess: onConnect,
        onFailure: onFailure
        }; 
    mqtt.onMessageArrived=onMessageArrived;
    mqtt.onMessageDelivered=onMessageDelivered;
    mqtt.connect(options); //connect
}

function onFailure() {
    statusUpdate('status', "Connection Attempt to Host "+host+" Failed", 'text-danger')
    setTimeout(MQTTconnect, reconnectTimeout);
}

function onConnectionLost(code, msg) {
    statusUpdate('status', `Connection Lost. Error Code: ${code}, Message: ${msg}`,'text-danger')
    document.getElementById('host').removeAttribute("disabled");
    document.getElementById('port').removeAttribute("disabled");
    document.getElementById('host').value=host;
    document.getElementById('port').value=port
    document.getElementById('host').setAttribute("placeholder", "e.g. test.mosquitto.org");
    document.getElementById('port').setAttribute("placeholder", "e.g. 8080");
    document.getElementById('message').setAttribute("hidden", "hidden");
    statusUpdate('msgStatus', "",'text-danger')
    e.target.innerHTML="Connect";
    host=null;
    port=null;
}

function onMessageArrived(msg){
    out_msg="Message received "+msg.payloadString+"<br>";
	out_msg=out_msg+"Message received Topic "+msg.destinationName;
	console.log(out_msg);
    displayTempMarker(msg.payloadString)
  
}

function onMessageDelivered(){
    statusUpdate('msgStatus', "Message Sent!",'text-success')
    document.getElementById('submitMessage').removeAttribute("disabled")
}

function sendMessage(topic, msg){
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = topic;
    message.retained=true;
    mqtt.send(message);
}

document.getElementById('connect').addEventListener('click', (e) => {
    // Do whatever you want

    if (e.target.innerHTML=="Connect"){
        if (document.getElementById('host').value != ""){
            host=document.getElementById('host').value;
        }
    
        if (document.getElementById('port').value != 0){
            port=document.getElementById('port').valueAsNumber;
        }
    
        if (document.getElementById('port').value == 0){
            statusUpdate('status', "Please enter a port",'text-danger')
        }

        if (document.getElementById('host').value == ""){
            statusUpdate('status', "Please enter a hostname",'text-danger')
        }
        
        if (host && port) {
            e.target.setAttribute("disabled", "disabled");
            document.getElementById('host').value="";
            document.getElementById('port').value="";
            document.getElementById('host').setAttribute("disabled", "disabled");
            document.getElementById('port').setAttribute("disabled", "disabled");
            document.getElementById('host').setAttribute("placeholder", host);
            document.getElementById('port').setAttribute("placeholder", port.toString());
            MQTTconnect() 
        }
    }else if (e.target.innerHTML=="Disconnect"){
        mqtt.disconnect()
        document.getElementById('host').removeAttribute("disabled");
        document.getElementById('port').removeAttribute("disabled");
        document.getElementById('host').value=host;
        document.getElementById('port').value=port
        document.getElementById('host').setAttribute("placeholder", "e.g. test.mosquitto.org");
        document.getElementById('port').setAttribute("placeholder", "e.g. 8080");
        document.getElementById('message').setAttribute("hidden", "hidden");
        statusUpdate('status', "",'text-danger')
        statusUpdate('msgStatus', "",'text-danger')
        statusUpdate('shareStatus', "",'text-danger')
        document.getElementById('topic').value="";
        document.getElementById('msg').value="";
        e.target.innerHTML="Connect";
        host=null;
        port=null;
    }
});   
 
document.getElementById('submitMessage').addEventListener('click', (e) => {
    let topic=null;
    let msg=null;

    if (document.getElementById('topic').value != ""){
        topic=document.getElementById('topic').value;
    }

    if (document.getElementById('msg').value != ""){
        msg=document.getElementById('msg').value;
    }

    if (document.getElementById('msg').value == ""){
        statusUpdate('msgStatus', "Please enter a message",'text-danger')
    }

    if (document.getElementById('topic').value == ""){
        statusUpdate('msgStatus', "Please enter a topic",'text-danger')
    }
    
    if (msg && topic) {
        e.target.setAttribute("disabled", "disabled");
        sendMessage(topic, msg)
    }

});

document.getElementById('share').addEventListener('click', (e) => {
    navigator.geolocation.getCurrentPosition(posSuccess, posError, posOptions)
});