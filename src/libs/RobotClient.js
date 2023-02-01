const log_types = {
  FATAL: 'FATAL',
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

class listener {

  constructor(topic, messageType, log, throttleRate) {

    this.started = false;
    this.topic = topic;
    this.messageType = messageType;
    this.log = log;
    this.throttleRate = throttleRate;

  }

}

export default class RobotClient {

  client;
  debug = false;
  QRcodeListenerStarted = false;
  guiTriggerListenerStarted = false;
  screenListenerStarted = false;
  robTaskListenerStarted = false;
  cvTriggerListenerStarted = false;
  setIsRotated;

  listeners = {
    'erlangData': new listener('/iot/exercise/erlang_trigger', 'std_msgs/Int8', false),
    'estopTrigger': new listener('/base/estop', 'std_msgs/UInt8', true),
    'gpioTrigger': new listener('/nx_gpio/battery_state', 'sensor_msgs/BatteryState', true),
    'imuCalibration': new listener('/iot/exercise/calibration_status', 'std_msgs/Int8', false),
    'imuConnection': new listener('iot/exercise/connect_status', 'std_msgs/Int8', true),
    'imuData': new listener('/iot/exercise/single_trigger', 'std_msgs/Int8', false),
    'navigationPath': new listener('/nav_interface/global_path', 'nav_msgs/Path', false),
    'odomeryValue': new listener('/ctrl_interface/odomDistance', 'std_msgs/Float32', false),
    'robotPosition': new listener('/robot_pose', 'geometry_msgs/Pose', false, 250),
    'wristbandConnection': new listener('/iot/vitals_connected', 'std_msgs/Int8', true),
    'wristbandData': new listener('/iot/vitals_measured', 'geometry_msgs/Vector3', true),
  };

  constructor() {

    const ROSLIB = window.ROSLIB;

    this.client = new ROSLIB.Ros({});

    this.client.on('connection', () => {

      const message = 'Connected to websocket server.';
      RobotClient.saveLog(log_types.INFO, message);
      this.toast(message, 2.5, true);

    });

    this.client.on('error', (error) => {

      const message = 'Error connecting to websocket server: ';
      console.log(message, error);
      RobotClient.saveLog(log_types.ERROR, message + error.target.url);
      this.toast("ROSBridge connection failed", 1, true);

    });

    this.client.on('close', () => {

      const message = 'Connection to websocket server closed.';
      console.log(message);
      RobotClient.saveLog(log_types.INFO, message);
      window.setTimeout(() =>  this.client.connect("ws://localhost:9090"), 1000);

    });
    this.client.connect("ws://localhost:9090");

  }

  static getInstance(setIsRotated) {

    if (!this.instance) {

      this.instance = new this();

    }

    if ( setIsRotated ) {

      this.instance.setIsRotated = setIsRotated;

    }

    return this.instance;

  }

  static get log_types() {

    return log_types;

  }

  static async saveLog (logType, logData) {

    const response = await fetch('http://localhost/api/gui-logs/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        log_type: logType,
        log_data: logData,
      }),
    });

    const log_response = await response.json();

    if(log_response.status === 'error') {

      console.log('Error saving log: ', log_response.message);

    }

    return log_response;

  }

  static async writeJsonFile (storage, json_data) {

    const response = await fetch('http://localhost/api/local-storage/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storage: storage,
        json_data: json_data,
      }),
    });
  
    const storage_response = await response.json();

    if(storage_response.status === 'error') {

      const errorMessage = `Error in RobotClient.js writeJsonFile: Error posting data: ${response.url} with status: ${response.status} ${response.statusText}`;
      console.log(errorMessage);
      RobotClient.saveLog(RobotClient.log_types.ERROR, errorMessage);

    }

    return storage_response;
    
  }

  static async readJsonFile (storage) {

    const response = await fetch(`http://localhost/api/local-storage/?storage=${storage}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
  
      const errorMessage = `Error in RobotClient.js readJsonFile: Error fetching data: ${response.url} with status: ${response.status} ${response.statusText}`;
      console.log(errorMessage);
      RobotClient.saveLog(RobotClient.log_types.ERROR, errorMessage);
      throw new Error(`HTTP error! status: ${response.status}`); 
    
    }
  
    return await response.json();

  }

  static async deleteJsonFile (storage) {

    const response = await fetch(`http://localhost/api/local-storage/?storage=${storage}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
  
      const errorMessage = `Error in RobotClient.js deleteJsonFile: Error deleting data: ${response.url} with status: ${response.status} ${response.statusText}`;
      console.log(errorMessage);
      RobotClient.saveLog(RobotClient.log_types.ERROR, errorMessage);
      throw new Error(`HTTP error! status: ${response.status}`); 
    
    }
  
    return await response.json();

  }

  async getTopics() {

    return await new Promise((resolve, reject) => {

      this.client.getNodeDetails('/rosbridge_websocket',
                                 (...data) => resolve(data),
                                 (...data) => reject(data));

    });

  }

  async getTopicType(topic: string) {

    return await new Promise((resolve, reject) => {

      this.client.getTopicType(topic,
                               (...data) => resolve(data),
                               (...data) => reject(data));
    
    });

  }

  isSubscribed(subName: string) {

    const checkForSubscription = (pubSubServsNames) => {

      const subscriptions = pubSubServsNames[0];
      return subscriptions.includes(subName);

    };

    const callRos = async (subName, retries=50, delay=50) => {

      if (!retries) return false;

      const retry = ms => new Promise(resolve => setTimeout(resolve, ms));
      await retry(delay);

      const pubSubServsNames = await new Promise((resolve, reject) => {

        // returns array of: 
        // publications - array of published topic names
        // subscriptions - array of subscribed topic names
        // services - array of service names hosted
        this.client.getNodeDetails('/rosbridge_websocket',
                                   (...data) => resolve(data),
                                   (...data) => reject(data));

      });
      const result = checkForSubscription(pubSubServsNames);
      return result ? result : callRos(subName, retries-1);

    };

    return callRos(subName);

  }

  getROSTopic(topicName, messageType, throttleRate, latch) {

    const ROSLIB = window.ROSLIB;

    const topic = new ROSLIB.Topic({
      ros: this.client,
      name: topicName,
      messageType: messageType,
      throttle_rate: throttleRate,
      latch: latch
    });

    return topic;

  }

  publishToTopic(topicName, messageType, messageObj, latch) {

    const topic = this.getROSTopic(topicName, messageType, undefined, latch);
    const ROSLIB = window.ROSLIB;

    const rosMessage = new ROSLIB.Message( messageObj );
    topic.publish(rosMessage);
    console.log("publishing: ", rosMessage, 'to: ', topicName);

    RobotClient.saveLog(log_types.INFO, `ROS-Pub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(rosMessage)}`);

  }

  publishMessage(topicName, messageType, message, latch) {

    this.publishToTopic(topicName, messageType, { data: message }, latch);

  }

  createROSListener(topicName, messageType, callback, throttleRate) {

    const listener = this.getROSTopic(topicName, messageType, throttleRate);

    listener.subscribe( message => {

      RobotClient.saveLog(log_types.INFO, `ROS-Sub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(message.data)}`);
      callback(message);
      this.toast(message.data, .5, true, true);

    });
    console.log(`creating listener '${topicName}' of type '${messageType}' `);

    return () => listener.unsubscribe(); 

  }

  changeVolume(message) {

    this.publishMessage('/nlp_internal/volume', 'std_msgs/Int8', message, true);

  }
  setCameraMode(message) {

    this.publishMessage('/torsoCV/setCameraMode', 'std_msgs/String', message);

  }
  triggerTorsoCVAngle(message) {

    this.publishMessage('/ctrl_interface/torso_camera_command', 'std_msgs/Int8', message);

  }
  publishButtonPress(message) {

    this.publishMessage('/hri_interface/gui_intent', 'std_msgs/String', message);

  }
  offlineModeMessage(message) {

    this.publishMessage('/ctrl_interface/demo', 'std_msgs/Int8', message);

  }
  voiceMessage(message) {

    this.publishMessage('/nlp_internal/play_audio', 'std_msgs/String', message);

  }
  vitalVoiceMessage(message) {

    this.publishMessage('/nlp_internal/vital_speech', 'std_msgs/String', message);

  }

  createGenericRosListener(listenerString, dispatch, callback) {

    if (!this.listeners[listenerString].started) {

      const topicName = this.listeners[listenerString].topic;
      const messageType = this.listeners[listenerString].messageType;
      const listener = this.getROSTopic(topicName, messageType);

      listener.subscribe( message => {

        if (this.listeners[listenerString].log)
          RobotClient.saveLog(log_types.INFO, `ROS-Sub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(message)}`);
        dispatch(callback(JSON.parse(JSON.stringify(message))));

      });

      this.listeners[listenerString].started = true;

    }

  }

  //TODO make these DRY
  // we should be able to make a listener factory
  // contain the *Started booleans in a object we check

  QRCodeTriggerListener(dispatch, setQRCodeNotFound, handleQRCodeResponse) {

    if ( !this.QRcodeListenerStarted ) {

      const topicName = '/QR_interface/userID';
      const messageType = 'std_msgs/String';
      const listener = this.getROSTopic(topicName, messageType);

      listener.subscribe( message => {

        RobotClient.saveLog(log_types.INFO, `ROS-Sub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(message.data)}`);
        this.toast(message.data, .5, true, true);

        if (message.data.length > 0) {

          dispatch(handleQRCodeResponse(message.data));

        } else {

          dispatch(setQRCodeNotFound(true));

        }

      });

      this.QRcodeListenerStarted = true;

    }

  }

  guiTriggerListener(dispatch, changeCurrentComponent) {

    if ( !this.guiTriggerListenerStarted ) {

      const topicName = '/hri_interface/gui_trigger';
      const messageType = 'std_msgs/String';
      const listener = this.getROSTopic(topicName, messageType);
    
      listener.subscribe( message => {
      
        RobotClient.saveLog(log_types.INFO, `ROS-Sub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(message.data)}`);
        dispatch(changeCurrentComponent(message.data));
        this.toast(message.data, .5, true, true);

      });

      this.guiTriggerListenerStarted = true;

    }
  
  }
  /*
   * TODO implement the logic below
    Add subscriber to /top_cv/face_id which receives a std_msgs::Int8 message type
    Read yaml_settings['HRI']['check_user_ID'] from the YAML settings file.
    If true (I think value=1), then
      if if msg.user_id == self.current_user
        publish a 1 on /hri_interface/id_confirmed
    Else
      if msg.face_in == 1
        publish a 1 on /hri_interface/id_confirmed
  */

  cvTriggerListener(dispatch, changeCurrentComponent) {

    if ( !this.cvTriggerListenerStarted ) {

      const listener = this.getROSTopic('/top_cv/face_id', 'std_msgs/Int8' );
    
      listener.subscribe( message => {
      
        this.toast(message.data, .5, true, true);

      });

      this.cvTriggerListenerStarted = true;

    }
  
  }

  screenFlipListener() {

    if ( !this.screenListenerStarted ) {

      const topicName = '/ctrl_interface/trigger_to_gui';
      const messageType = 'std_msgs/Int8';
      const listener = this.getROSTopic(topicName, messageType);

      listener.subscribe( message => {

        if (message.data > 1)
          return;

        RobotClient.saveLog(log_types.INFO, `ROS-Sub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(message.data)}`);
        this.setIsRotated(!message.data);
        this.toast('screen flip:' + message.data, .5, true);

      });

      this.screenListenerStarted = true;

    }

  }

  robTaskListenerCallback(robTask, dispatch, handleRobTask, changeCurrentComponent) {

    this.toast( robTask, 1, true, true);
    dispatch(handleRobTask(robTask));
    dispatch(changeCurrentComponent('GUI_DESTINATION'));

  }

  robTaskListener(dispatch, handleRobTask, changeCurrentComponent): (void) {

    if ( !this.robTaskListenerStarted ) {

      const topicName = '/task_manager/task';
      const messageType = 'rob_interface/RobTask';
      const listener = this.getROSTopic(topicName, messageType);

      listener.subscribe( robTask => {

        RobotClient.saveLog(log_types.INFO, `ROS-Sub topic: '${topicName}' type: '${messageType}' message: ${JSON.stringify(robTask)}`);
        this.robTaskListenerCallback(robTask, dispatch, handleRobTask, changeCurrentComponent);

      });

      this.robTaskListenerStarted = true;

    }

  }

  toast(message: string, delay: number, isSmall?: boolean, stringify?: boolean): (void) {

    const delaySeconds = delay | 1;

    if(this.debug) {

      const div = document.createElement("div");
      div.id = "alert";
      const big = "position:absolute;top:5%;left:10%;background-color:white;width:500px;height:200px;font-size:60px;border: 15px solid #ddd;border-radius:200px;padding:250px 250px";
      const small = "position:absolute;bottom: 12%;left:10%;background-color:white;width:500px;height: 100px;font-size: 55px;border: 15px solid #ddd;border-radius:200px;padding: 50px 250px;text-align: center;";

      if ( isSmall ) {

        div.setAttribute("style", small);

      } else {

        div.setAttribute("style", big);

      }

      div.innerHTML = message;

      const removeDiv = () => {

        const div = document.querySelector("#alert");
        div?.parentNode?.removeChild(div);

      };

      div.onclick = removeDiv;

      setTimeout(removeDiv, delaySeconds * 1000);
      document.body.appendChild(div);

      const logMessage = stringify ? JSON.stringify(message, null, 2): message;
      console.log('toast', logMessage);

    } else {

      const logMessage = stringify ? JSON.stringify(message, null, 2): message;
      console.log('toast', logMessage);

    }

  }

}
