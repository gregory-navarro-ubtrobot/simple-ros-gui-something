export default class RobotClientLite {

    client;
    topic;

    constructor() {

        const ROSLIB = window.ROSLIB;

        this.client = new ROSLIB.Ros({});
        this.topic = null;
        this.client.on('connection', () => {
    
          const message = 'Connected to websocket server.';
          console.log(message)
    
        });
    
        this.client.on('error', (error) => {
    
          const message = 'Error connecting to websocket server: ';
          console.log(message, error);
    
        });
    
        this.client.on('close', () => {
    
          const message = 'Connection to websocket server closed.';
          console.log(message);
       
        });
        this.client.connect("ws://localhost:9090");
    
      }

      static getInstance() {

        if (!this.instance) {
    
          this.instance = new this();
    
        }
    
        return this.instance;
    
      }

      
      setUpPublishSubscribe(callback) {
        const ROSLIB = window.ROSLIB;

        const topic = new ROSLIB.Topic({
        ros: this.client,
        name : '/cmd_vel',
        messageType : 'geometry_msgs/Twist'
        });
        this.topic = topic
        // subscribe to the topic
        topic.subscribe(function(message) {
            console.log('Received message on ' + topic.name + ': ' + message.data);
            callback({ name: topic.name, data: message.data})
        })
        console.log("set up publish subscribe")
        return topic;
      }

      publishMessage() {
        const ROSLIB = window.ROSLIB;
        var twist = new ROSLIB.Message({
            linear : {
              x : 0.1,
              y : 0.2,
              z : 0.3
            },
            angular : {
              x : -0.1,
              y : -0.2,
              z : -0.3
            }
          });
        this.topic.publish(twist);
        // console.log(this)
      }
    
}